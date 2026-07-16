import { initTelegram, pipeTelegramToR2 } from './telegramService.js';
import dotenv from 'dotenv';

dotenv.config();

async function test() {
  console.log('--- STARTING TELEGRAM TO R2 PIPING TEST ---');
  
  try {
    console.log('Initializing Telegram client...');
    const client = await initTelegram();
    if (!client) {
      console.error('Failed to initialize Telegram client. Check your .env file.');
      return;
    }
    console.log('Telegram client connected successfully!');

    const channelId = '-1004329714585';
    const messageId = '3';

    console.log(`Starting test piping for Channel: ${channelId}, Message: ${messageId}...`);
    
    const result = await pipeTelegramToR2(channelId, messageId, (downloaded, total) => {
      const percent = total > 0 ? ((downloaded / total) * 100).toFixed(1) : '0';
      console.log(`Piping progress: ${percent}% (${downloaded} of ${total} bytes)`);
    });

    console.log('\n--- PIPING SUCCESSFUL ---');
    console.log('Public URL:', result.publicUrl);
    console.log('R2 Key:', result.key);

  } catch (error) {
    console.error('\nPiping failed with error:', error);
  }
}

test().then(() => process.exit(0));
