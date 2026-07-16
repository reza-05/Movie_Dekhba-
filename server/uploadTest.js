import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { CustomFile } from 'telegram/client/uploads.js';
import readline from 'readline';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

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

  const channelInput = await askQuestion('Enter your Telegram Channel ID (e.g. -1002166453120): ');
  const filePath = '/Users/md.shifatreza/Downloads/2311.mp4';

  if (!fs.existsSync(filePath)) {
    console.error(`\nError: File not found at path: ${filePath}`);
    console.error('Please make sure you have the file "2311.mp4" inside your Downloads folder.');
    rl.close();
    await client.disconnect();
    return;
  }

  const stats = fs.statSync(filePath);
  const fileName = path.basename(filePath);
  const customFile = new CustomFile(fileName, stats.size, filePath);

  console.log(`\nFile details: ${fileName} (${(stats.size / (1024 * 1024)).toFixed(1)} MB)`);
  console.log(`Starting upload to channel ${channelInput} using stable CustomFile handler...`);

  try {
    const uploadedFile = await client.uploadFile({
      file: customFile,
      workers: 1,
      progressCallback: (progress) => {
        const percent = (progress * 100).toFixed(1);
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(`Upload Progress: ${percent}%`);
      }
    });

    console.log('\n\nUpload complete! Publishing video file to your channel...');
    const result = await client.sendMessage(channelInput, {
      message: 'Movie Dekhba Direct Stream Upload',
      media: uploadedFile
    });

    console.log('\n--- UPLOAD SUCCESSFUL ---');
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
