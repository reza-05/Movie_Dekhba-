import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const catalogPath = path.resolve(__dirname, '../moviesCatalog.json');

// Get Movies Catalog
router.get('/movies-catalog', (req, res) => {
  try {
    const data = fs.readFileSync(catalogPath, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading movies catalog:', error);
    res.status(500).json({ error: 'Failed to read movies catalog.' });
  }
});

// Sync Telegram Catalog Endpoint
router.post('/sync-telegram', async (req, res) => {
  try {
    const { initTelegram } = await import('../telegramService.js');
    const client = await initTelegram();
    if (!client) {
      return res.status(500).json({ error: 'Telegram client not initialized.' });
    }

    const channelId = '-1004329714585';
    console.log(`[Sync Catalog] Fetching recent messages from Telegram channel ${channelId}...`);

    // Fetch last 100 messages
    const messages = await client.getMessages(channelId, { limit: 100 });
    if (!messages || messages.length === 0) {
      return res.json({ message: 'No messages found in the channel.', count: 0 });
    }

    let catalog = [];
    try {
      catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    } catch (e) {
      catalog = [];
    }

    // Default existing catalog items without category to 'movies'
    catalog = catalog.map(item => ({
      ...item,
      category: item.category || 'movies'
    }));

    let addedCount = 0;
    
    for (const msg of messages) {
      // Ensure the message contains a document media (the video file)
      if (!msg.media || !msg.media.document) continue;

      const text = msg.message || '';
      const lowercaseText = text.toLowerCase();
      
      // We only sync messages that are explicitly tagged with our hashtags
      let category = '';
      if (lowercaseText.includes('#movie')) {
        category = 'movies';
      } else if (lowercaseText.includes('#anime')) {
        category = 'anime';
      } else if (lowercaseText.includes('#series')) {
        category = 'series';
      }

      if (!category) continue; // Skip messages without our tags

      const messageIdStr = String(msg.id);
      
      // Check if this Telegram message is already synced in the catalog (either as a movie or as an episode)
      const exists = catalog.some(item => {
        const rootMatch = item.telegramChannelId === channelId && item.telegramMessageId === messageIdStr;
        const episodeMatch = item.episodes && item.episodes.some(ep => ep.telegramMessageId === messageIdStr);
        return rootMatch || episodeMatch;
      });
      if (exists) continue;

      // Parse metadata from caption lines
      const lines = text.split('\n');
      let title = '';
      let genre = '';
      let rating = '8.0';
      let poster = '';
      let description = '';
      let showId = '';
      let episodeNumVal = '';
      let seasonVal = '';

      for (const line of lines) {
        const lowerLine = line.toLowerCase().trim();
        if (lowerLine.startsWith('title:')) {
          title = line.substring(6).trim();
        } else if (lowerLine.startsWith('genre:')) {
          genre = line.substring(6).trim();
        } else if (lowerLine.startsWith('rating:')) {
          rating = line.substring(7).trim();
        } else if (lowerLine.startsWith('poster:')) {
          poster = line.substring(7).trim();
        } else if (lowerLine.startsWith('show_id:')) {
          showId = line.substring(8).trim();
        } else if (lowerLine.startsWith('episode:')) {
          episodeNumVal = line.substring(8).trim();
        } else if (lowerLine.startsWith('season:')) {
          seasonVal = line.substring(7).trim();
        }
      }

      // Robust multi-line description parser
      const descIndex = text.toLowerCase().indexOf('description:');
      if (descIndex !== -1) {
        const afterDesc = text.substring(descIndex + 12);
        const descLines = afterDesc.split('\n');
        const cleanDescLines = [];
        for (const dl of descLines) {
          const ldl = dl.toLowerCase().trim();
          // Skip other metadata tags and hashtags
          if (ldl.startsWith('show_id:') || ldl.startsWith('episode:') || ldl.startsWith('season:') || ldl.startsWith('title:') || ldl.startsWith('genre:') || ldl.startsWith('rating:') || ldl.startsWith('poster:')) {
            continue;
          }
          if (ldl.includes('#movie') || ldl.includes('#anime') || ldl.includes('#series')) {
            continue;
          }
          cleanDescLines.push(dl);
        }
        description = cleanDescLines.join('\n').trim();
      }

      // Fallback title from filename
      if (!title) {
        const docAttr = msg.media.document.attributes.find(attr => attr.className === 'DocumentAttributeFilename');
        title = docAttr ? docAttr.fileName.replace(/\.[^/.]+$/, "") : `Video ${msg.id}`;
      }

      if (!poster) {
        poster = '/posters/zero_day.jpg'; // default nice fallback poster
      }

      // Handle Episode sync
      if (episodeNumVal && showId) {
        const epNumber = parseInt(episodeNumVal, 10);
        // Find parent show in catalog
        const parentShow = catalog.find(item => item.id === showId);
        if (parentShow) {
          if (!parentShow.episodes) {
            parentShow.episodes = [];
          }
          // Verify episode doesn't already exist in parent
          const epExists = parentShow.episodes.some(e => e.episodeNumber === epNumber);
          if (!epExists) {
            const epData = {
              episodeNumber: epNumber,
              telegramMessageId: messageIdStr,
              title: title
            };
            if (seasonVal) {
              epData.season = parseInt(seasonVal, 10);
            }
            parentShow.episodes.push(epData);
            // Sort episodes ascending
            parentShow.episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
            addedCount++;
          }
        } else {
          console.warn(`[Sync Catalog] Warning: Parent show '${showId}' not found for episode ${epNumber}. Skipping.`);
        }
      } else {
        // Handle Main Show card or standalone Movie sync
        const id = showId || `tg-${msg.id}`;
        
        // Double check if id already exists in catalog to prevent duplicate shows
        const showExists = catalog.some(item => item.id === id);
        if (!showExists) {
          catalog.push({
            id,
            title,
            genre: genre || 'General',
            rating,
            poster,
            description: description || 'No description provided.',
            telegramChannelId: channelId,
            telegramMessageId: messageIdStr,
            category,
            episodes: []
          });
          addedCount++;
        }
      }
    }

    if (addedCount > 0) {
      fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf8');
      console.log(`[Sync Catalog] Successfully added ${addedCount} new items from Telegram channel!`);
    } else {
      console.log('[Sync Catalog] Catalog is already up-to-date.');
    }

    res.json({ message: `Successfully synced. Added ${addedCount} new items.`, addedCount, catalog });

  } catch (error) {
    console.error('[Sync Catalog Error]:', error);
    res.status(500).json({ error: 'Failed to sync catalog from Telegram.' });
  }
});

export default router;
