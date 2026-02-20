import dotenv from 'dotenv';

dotenv.config();

export const config = {
  telegram: {
    botToken: process.env.BOT_TOKEN || '',
    mode: (process.env.BOT_MODE as 'polling' | 'webhook') || 'polling',
    webhookUrl: process.env.WEBHOOK_URL || '',
    webhookSecret: process.env.WEBHOOK_SECRET || '',
  },
  database: {
    url: process.env.DATABASE_URL || '',
  },
  qr: {
    secret: process.env.QR_SECRET || 'change-me-in-production',
  },
  api: {
    port: parseInt(process.env.API_PORT || '3000', 10),
    secret: process.env.API_SECRET || 'change-me-in-production',
  },
  superadmin: {
    telegramIds: (process.env.SUPERADMIN_TELEGRAM_IDS || '')
      .split(',')
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id)),
  },
} as const;

export default config;
