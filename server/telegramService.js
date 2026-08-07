import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { 
  CreateMultipartUploadCommand, 
  UploadPartCommand, 
  CompleteMultipartUploadCommand, 
  AbortMultipartUploadCommand 
} from '@aws-sdk/client-s3';
import { s3Client, checkR2Status } from './r2Service.js';
import dotenv from 'dotenv';

dotenv.config();

let clients = [];
let isInitialized = false;
let currentClientIndex = 0;

export async function initTelegram() {
  if (isInitialized) return clients[0] || null;

  const apiId = parseInt(process.env.TELEGRAM_API_ID, 10);
  const apiHash = process.env.TELEGRAM_API_HASH;
  
  // Extract sessions pool
  let sessions = [];
  if (process.env.TELEGRAM_SESSIONS) {
    sessions = process.env.TELEGRAM_SESSIONS.split(',').map(s => s.trim()).filter(Boolean);
  } else if (process.env.TELEGRAM_SESSION) {
    sessions = [process.env.TELEGRAM_SESSION.trim()];
  }

  if (!apiId || !apiHash || sessions.length === 0) {
    console.log('[Telegram Service] Configuration missing in .env. Telegram features disabled.');
    return null;
  }

  console.log(`[Telegram Service] Initializing pool of ${sessions.length} Telegram accounts...`);
  clients = [];

  for (let i = 0; i < sessions.length; i++) {
    try {
      const stringSession = new StringSession(sessions[i]);
      const clientInstance = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
      });
      await clientInstance.connect();
      clients.push(clientInstance);
      console.log(`[Telegram Service] Client ${i + 1}/${sessions.length} connected successfully.`);
    } catch (err) {
      console.error(`[Telegram Service] Client ${i + 1}/${sessions.length} failed to connect:`, err.message);
    }
  }

  if (clients.length > 0) {
    isInitialized = true;
    console.log(`[Telegram Service] Connected clients in pool: ${clients.length}`);
    return clients[0];
  } else {
    console.error('[Telegram Service] All session tokens in the pool failed to connect.');
    return null;
  }
}

/**
 * Pipes a Telegram document to Cloudflare R2 in-memory using Multipart Upload
 * @param {string|number} channelId Telegram Private Channel ID or chat ID
 * @param {string|number} messageId Telegram Message ID containing the document
 * @param {string} movieId Unique database identifier for caching
 * @param {function} onProgress Progress callback yielding (downloadedBytes, totalBytes)
 */
export async function pipeTelegramToR2(channelId, messageId, movieId, onProgress) {
  if (!isInitialized) {
    await initTelegram();
  }
  if (clients.length === 0) {
    throw new Error('Telegram client pool is empty or not initialized.');
  }
  if (!checkR2Status()) {
    throw new Error('R2 storage is not configured.');
  }

  // Load balancing: pick a client from the pool in a round-robin cycle
  const client = clients[currentClientIndex];
  const clientNum = currentClientIndex + 1;
  const originalIndex = currentClientIndex;
  currentClientIndex = (currentClientIndex + 1) % clients.length;

  console.log(`[Telegram Stream] Using Client ${clientNum}/${clients.length} to stream movie ID ${movieId}...`);

  // 1. Fetch message metadata from Telegram
  const parsedChannelId = typeof channelId === 'string' && !channelId.startsWith('-100') ? `-100${channelId}` : channelId;
  
  let messages = [];
  try {
    messages = await client.getMessages(parsedChannelId, { ids: [parseInt(messageId, 10)] });
  } catch (err) {
    console.error(`[Telegram Stream] Client ${clientNum} failed to fetch message metadata:`, err.message);
    if (clients.length > 1) {
      console.warn('[Telegram Stream] Retrying with the next client in the session pool...');
      return pipeTelegramToR2(channelId, messageId, movieId, onProgress);
    }
    throw err;
  }

  if (!messages || messages.length === 0 || !messages[0].media) {
    throw new Error('Movie file message not found in Telegram channel.');
  }

  const message = messages[0];
  const media = message.media;

  let fileName = 'movie.mp4';
  let fileSize = 0;
  if (media.document) {
    fileSize = media.document.size;
    const docAttr = media.document.attributes.find(attr => attr.className === 'DocumentAttributeFilename');
    if (docAttr) {
      fileName = docAttr.fileName;
    }
  } else {
    throw new Error('Media message does not contain a document file.');
  }

  // 2. Initialize S3 Multipart Upload on R2
  const key = `movie-${movieId}.mp4`;

  const createMultipartCommand = new CreateMultipartUploadCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    Key: key,
    ContentType: 'video/mp4',
  });

  const { UploadId } = await s3Client.send(createMultipartCommand);
  console.log(`[Telegram Stream] Started multipart upload with Key: ${key}, UploadId: ${UploadId}`);

  const uploadedParts = [];
  let partNumber = 1;
  let accumulatedBuffer = [];
  let accumulatedLength = 0;
  let totalDownloaded = 0;

  const minPartSize = 5 * 1024 * 1024; // 5MB minimum S3 part size

  try {
    // 3. Download and Pipe chunks
    for await (const chunk of client.iterDownload({
      file: media,
      requestSize: 1024 * 1024, // 1MB chunks to reduce network overhead
      workers: 16, // Maximum stable parallel workers (16x speed)
    })) {
      accumulatedBuffer.push(chunk);
      accumulatedLength += chunk.length;
      totalDownloaded += chunk.length;

      // Report progress
      if (onProgress) {
        onProgress(totalDownloaded, fileSize);
      }

      // Once we accumulate >= 5MB, upload this part
      if (accumulatedLength >= minPartSize) {
        const partBuffer = Buffer.concat(accumulatedBuffer);
        
        const uploadPartCommand = new UploadPartCommand({
          Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
          Key: key,
          UploadId,
          PartNumber: partNumber,
          Body: partBuffer,
        });

        const { ETag } = await s3Client.send(uploadPartCommand);
        uploadedParts.push({ PartNumber: partNumber, ETag });

        partNumber++;
        accumulatedBuffer = [];
        accumulatedLength = 0;
      }
    }

    // 4. Upload any remaining buffer as the last part
    if (accumulatedLength > 0) {
      const partBuffer = Buffer.concat(accumulatedBuffer);
      const uploadPartCommand = new UploadPartCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        Key: key,
        UploadId,
        PartNumber: partNumber,
        Body: partBuffer,
      });

      const { ETag } = await s3Client.send(uploadPartCommand);
      uploadedParts.push({ PartNumber: partNumber, ETag });
    }

    // 5. Complete Multipart Upload
    const completeMultipartCommand = new CompleteMultipartUploadCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: key,
      UploadId,
      MultipartUpload: { Parts: uploadedParts },
    });

    await s3Client.send(completeMultipartCommand);
    console.log(`[Telegram Stream] Completed streaming transfer successfully to R2!`);

    // Construct public streaming URL
    let publicUrl = '';
    if (process.env.CLOUDFLARE_R2_PUBLIC_URL) {
      const baseUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL.replace(/\/$/, '');
      publicUrl = `${baseUrl}/${key}`;
    } else {
      publicUrl = `https://${process.env.CLOUDFLARE_R2_BUCKET_NAME}.${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.dev/${key}`;
    }

    return { publicUrl, key };

  } catch (error) {
    console.error(`[Telegram Stream] Error during streaming transfer with Client ${clientNum}:`, error.message);
    
    // Abort S3 Multipart Upload to clean up partial chunks
    try {
      const abortCommand = new AbortMultipartUploadCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        Key: key,
        UploadId,
      });
      await s3Client.send(abortCommand);
      console.log(`[Telegram Stream] Aborted multipart upload successfully for key: ${key}`);
    } catch (abortError) {
      console.error('[Telegram Stream] Failed to abort multipart upload:', abortError.message);
    }

    // Fallback: try downloading again with next available client in pool
    if (clients.length > 1) {
      console.warn('[Telegram Stream] Retrying transfer with the next client in the session pool...');
      return pipeTelegramToR2(channelId, messageId, movieId, onProgress);
    }

    throw error;
  }
}
