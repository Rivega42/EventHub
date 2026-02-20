import dotenv from 'dotenv';
dotenv.config();

import bot from './bot';
import { startApi } from './api/server';
import config from './config';

async function main(): Promise<void> {
  console.log('🚀 Starting EventHub Bot...');

  // Start API server
  await startApi();

  // Start bot
  if (config.telegram.mode === 'webhook') {
    console.log('Starting bot in webhook mode...');
    // TODO: Implement webhook mode
    await bot.api.setWebhook(config.telegram.webhookUrl, {
      secret_token: config.telegram.webhookSecret,
    });
  } else {
    console.log('Starting bot in polling mode...');
    await bot.start();
  }

  console.log('✅ EventHub Bot is running');
}

main().catch((err) => {
  console.error('❌ Failed to start:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await bot.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await bot.stop();
  process.exit(0);
});
