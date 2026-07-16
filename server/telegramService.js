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

let client = null;
let isInitialized = false;

export async function initTelegram() {
  if (isInitialized) return client;

  const apiId = parseInt(process.env.TELEGRAM_API_ID, 10);
  const apiHash = process.env.TELEGRAM_API_HASH;
  const sessionString = process.env.TELEGRAM_SESSION;

  if (!apiId || !apiHash || !sessionString) {
    console.log('[Telegram Service] Configuration missing in .env. Telegram features disabled.');
    return null;
  }

  try {
    const stringSession = new StringSession(sessionString);
    client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
    });

    await client.connect();
    isInitialized = true;
    console.log('[Telegram Service] Connected to Telegram MTProto successfully.');
    return client;
  } catch (error) {
    console.error('[Telegram Service] Failed to initialize Telegram client:', error);
    return null;
  }
}

/**
 * Pipes a Telegram document to Cloudflare R2 in-memory using Multipart Upload
 * @param {string|number} channelId Telegram Private Channel ID or chat ID
 * @param {string|number} messageId Telegram Message ID containing the document
 * @param {function} onProgress Progress callback yielding (downloadedBytes, totalBytes)
 */
export async function pipeTelegramToR2(channelId, messageId, onProgress) {
  if (!isInitialized) {
    await initTelegram();
  }
  if (!client) {
    throw new Error('Telegram client is not initialized.');
  }
  if (!checkR2Status()) {
    throw new Error('R2 storage is not configured.');
  }

  // 1. Fetch message metadata from Telegram
  const parsedChannelId = typeof channelId === 'string' && !channelId.startsWith('-100') ? `-100${channelId}` : channelId;
  
  console.log(`[Telegram Stream] Fetching message ${messageId} from channel ${parsedChannelId}...`);
  const messages = await client.getMessages(parsedChannelId, { ids: [parseInt(messageId, 10)] });
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
  const uniqueId = Math.random().toString(36).substring(2, 11);
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const key = `${uniqueId}-${sanitizedName}`;

  const createMultipartCommand = new CreateMultipartUploadCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    Key: key,
    ContentType: 'video/mp4',
  });

  const { UploadId } = await s3Client.send(createMultipartCommand);
  console.log(`[Telegram Stream] Started multipart upload to R2 with Key: ${key}, UploadId: ${UploadId}`);

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
        
        console.log(`[Telegram Stream] Uploading Part ${partNumber} (${partBuffer.length} bytes) to R2...`);
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
      console.log(`[Telegram Stream] Uploading Final Part ${partNumber} (${partBuffer.length} bytes) to R2...`);
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
    console.error('[Telegram Stream] Error during streaming transfer, aborting multipart upload:', error);
    try {
      const abortCommand = new AbortMultipartUploadCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        Key: key,
        UploadId,
      });
      await s3Client.send(abortCommand);
      console.log(`[Telegram Stream] Aborted multipart upload successfully for key: ${key}`);
    } catch (abortError) {
      console.error('[Telegram Stream] Failed to abort multipart upload:', abortError);
    }
    throw error;
  }
}
