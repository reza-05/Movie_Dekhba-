import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import readline from 'readline';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  const apiId = parseInt(process.env.TELEGRAM_API_ID, 10);
  const apiHash = process.env.TELEGRAM_API_HASH;
  const sessionString = process.env.TELEGRAM_SESSION;

  if (!apiId || !apiHash || !sessionString) {
    console.error('Error: Telegram configuration missing in server/.env file.');
    rl.close();
    return;
  }

  console.log('Connecting to Telegram client...');
  const stringSession = new StringSession(sessionString);
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.connect();
  console.log('Successfully connected to Telegram!');

  // Ask for channel ID
  console.log('\n--- Telegram Channel Info ---');
  console.log('To get your private channel ID:');
  console.log('1. Go to your private channel in Telegram.');
  console.log('2. Copy the post link of any message.');
  console.log('3. The link looks like https://t.me/c/1234567890/481');
  console.log('4. In this case, your channel ID is -1001234567890 (add -100 prefix to the middle number).\n');

  const channelInput = await askQuestion('Enter your Telegram Channel ID (e.g. -1002166453120): ');
  const filePath = '/Users/md.shifatreza/Downloads/2311.mp4';

  console.log(`\nStarting upload of ${filePath} to channel ${channelInput}...`);
  console.log('Using sequential chunks to guarantee stable transfer...');

  try {
    const result = await client.sendFile(channelInput, {
      file: filePath,
      workers: 1,
      supportsStreaming: true,
      progressCallback: (progress) => {
        const percent = (progress * 100).toFixed(1);
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(`Upload Progress: ${percent}%`);
      }
    });

    console.log('\n\n--- UPLOAD SUCCESSFUL ---');
    console.log('Copy these values and update your server/moviesCatalog.json:');
    console.log(`telegramChannelId: "${channelInput}"`);
    console.log(`telegramMessageId: "${result.id}"`);
    console.log('------------------------');

  } catch (error) {
    console.error('\nUpload failed:', error);
  }

  rl.close();
  await client.disconnect();
}

main().catch(console.error);
