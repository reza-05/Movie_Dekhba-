import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import { checkR2Status, generateUploadUrl, deleteR2Object, checkR2ObjectExists } from '../r2Service.js';
import { pipeTelegramToR2 } from '../telegramService.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const catalogPath = path.resolve(__dirname, '../moviesCatalog.json');

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 15, // Limit each IP to 15 upload URL requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Upload url generation quota exceeded. You can only request 15 uploads per hour.' }
});

router.get('/r2-config', (req, res) => {
  res.json({ configured: checkR2Status() });
});

router.get('/r2-upload-url', uploadLimiter, async (req, res) => {
  const { fileName, fileType } = req.query;
  if (!fileName || !fileType) {
    return res.status(400).json({ error: 'fileName and fileType query params are required.' });
  }

  try {
    const urls = await generateUploadUrl(fileName, fileType);
    
    // Automatically delete the object from R2 after 4 hours to recycle storage space
    setTimeout(async () => {
      try {
        console.log(`[R2 Service] Auto-cleanup timer triggered for key: ${urls.key}`);
        await deleteR2Object(urls.key);
      } catch (err) {
        console.error(`[R2 Service] Auto-cleanup failed for key ${urls.key}:`, err.message);
      }
    }, 4 * 60 * 60 * 1000); // 4 hours
    
    res.json(urls);
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    res.status(500).json({ error: 'Failed to generate presigned upload URL.' });
  }
});

// Load Movie Endpoint (Initiate Telegram to R2 Piping)
router.post('/load-movie', async (req, res) => {
  const { roomCode, movieId, episodeNumber } = req.body;
  if (!roomCode || !movieId) {
    return res.status(400).json({ error: 'roomCode and movieId are required.' });
  }

  const io = req.app.get('io');
  const rooms = req.app.get('rooms');

  try {
    const catalogData = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    const movie = catalogData.find(m => m.id === movieId);
    
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found in catalog.' });
    }

    // Determine target title, Telegram message ID, and R2 key
    let targetTitle = movie.title;
    let targetMessageId = movie.telegramMessageId;
    let key = `movie-${movieId}.mp4`;

    if (episodeNumber !== undefined && episodeNumber !== null) {
      const epNum = parseInt(episodeNumber, 10);
      const episode = movie.episodes?.find(e => e.episodeNumber === epNum);
      if (!episode) {
        return res.status(404).json({ error: 'Episode not found in catalog for this show.' });
      }
      targetTitle = `${movie.title} - Episode ${epNum}`;
      targetMessageId = episode.telegramMessageId;
      key = `movie-${movieId}-ep-${epNum}.mp4`;
    }

    // Inform all room members that movie load has started
    io.to(roomCode).emit('movie-loading-start', { title: targetTitle });

    // Respond immediately to host so the browser request doesn't hang
    res.json({ message: 'Movie download and piping initiated successfully.', title: targetTitle });

    // Execute piping job asynchronously
    const cachedExists = await checkR2ObjectExists(key);

    if (cachedExists) {
      console.log(`[Piping Job] Cached object found in R2: ${key}. Skipping download and using cache.`);
      
      // Generate a secure temporary presigned download URL
      const { generatePresignedDownloadUrl } = await import('../r2Service.js');
      const streamingUrl = await generatePresignedDownloadUrl(key);

      const room = rooms.get(roomCode);
      if (room) {
        room.magnetURI = '';
        room.fileName = targetTitle;
        room.fileSize = 0;
        room.youtubeUrl = '';
        room.cloudUrlKey = key;
        room.cloudUrl = streamingUrl;
      }

      // Broadcast stream completion directly to the room
      io.to(roomCode).emit('movie-loaded', {
        videoSrc: streamingUrl,
        title: targetTitle
      });
      return;
    }

    // Enforce R2 storage limits before initiating file piping to stay under 10GB free tier
    try {
      const { enforceR2StorageLimit } = await import('../lruCache.js');
      await enforceR2StorageLimit(); 
    } catch (e) {
      console.error('[LRU Cache Enforcer Error]:', e);
    }

    console.log(`[Piping Job] Starting piping for room ${roomCode}, key: ${key}, title: ${targetTitle}`);
    
    const { key: uploadedKey } = await pipeTelegramToR2(
      movie.telegramChannelId,
      targetMessageId,
      movieId + (episodeNumber !== undefined && episodeNumber !== null ? `-ep-${episodeNumber}` : ''),
      (downloaded, total) => {
        const percent = total > 0 ? Math.round((downloaded / total) * 100) : 0;
        // Emit real-time progress update to the room
        io.to(roomCode).emit('movie-loading-progress', {
          percent,
          downloadedBytes: downloaded,
          totalBytes: total,
          title: targetTitle
        });
      }
    );

    // Auto cleanup after 4 hours
    setTimeout(async () => {
      try {
        console.log(`[R2 Service] Auto-cleanup timer triggered for key: ${uploadedKey}`);
        await deleteR2Object(uploadedKey);
      } catch (err) {
        console.error(`[R2 Service] Auto-cleanup failed for key ${uploadedKey}:`, err.message);
      }
    }, 4 * 60 * 60 * 1000); // 4 hours

    // Generate a secure temporary presigned download URL
    const { generatePresignedDownloadUrl } = await import('../r2Service.js');
    const streamingUrl = await generatePresignedDownloadUrl(uploadedKey);

    const room = rooms.get(roomCode);
    if (room) {
      room.magnetURI = '';
      room.fileName = targetTitle;
      room.fileSize = 0;
      room.youtubeUrl = '';
      room.cloudUrlKey = uploadedKey;
      room.cloudUrl = streamingUrl;
    }

    // Broadcast stream completion to all room members
    io.to(roomCode).emit('movie-loaded', {
      videoSrc: streamingUrl,
      title: targetTitle
    });

    console.log(`[Piping Job] Completed. Stream URL: ${streamingUrl}`);

  } catch (error) {
    console.error('[Load Movie Error]:', error);
    io.to(roomCode).emit('movie-loading-error', {
      error: 'Failed to transfer movie from Telegram storage to streaming bucket.',
      title: movieId
    });
  }
});

export default router;
