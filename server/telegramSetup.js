import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('--- Telegram Client Setup ---');
  console.log('You can get your API ID and API Hash from https://my.telegram.org\n');
  
  const apiIdStr = await askQuestion('Enter your Telegram API ID: ');
  const apiHash = await askQuestion('Enter your Telegram API Hash: ');
  const phoneNumber = await askQuestion('Enter your Telegram Phone Number (with country code, e.g. +88017...): ');

  const apiId = parseInt(apiIdStr, 10);
  const stringSession = new StringSession('');
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => phoneNumber,
    password: async () => await askQuestion('Enter your 2FA Password (if enabled, otherwise press Enter): '),
    phoneCode: async () => await askQuestion('Enter the code sent to your Telegram app: '),
    onError: (err) => console.log('Login error:', err),
  });

  console.log('\n--- LOGIN SUCCESSFUL ---');
  console.log('Copy the following Session String and paste it in your server .env as TELEGRAM_SESSION:\n');
  const sessionString = client.session.save();
  console.log(sessionString);
  console.log('\n------------------------');
  
  rl.close();
  await client.disconnect();
}

main().catch(console.error);
