import * as cron from 'node-cron';
import pool from '../db/pool';
import { Bot } from 'grammy';
import { BotContext } from '../bot/context';

interface ReminderConfig {
  type: 'session' | 'event';
  offsetMinutes: number;
  offsetLabel: string; // '15min', '1hour', '24hours'
}

const REMINDER_CONFIGS: ReminderConfig[] = [
  { type: 'session', offsetMinutes: 15, offsetLabel: '15min' },
  { type: 'event', offsetMinutes: 60, offsetLabel: '1hour' },
  { type: 'event', offsetMinutes: 1440, offsetLabel: '24hours' },
];

class SchedulerService {
  private bot: Bot<BotContext> | null = null;
  private cronJob: cron.ScheduledTask | null = null;

  initialize(bot: Bot<BotContext>): void {
    this.bot = bot;
    
    // Run every minute
    this.cronJob = cron.schedule('* * * * *', async () => {
      await this.checkAndSendReminders();
    });

    console.log('Scheduler service initialized');
  }

  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('Scheduler service stopped');
    }
  }

  private async checkAndSendReminders(): Promise<void> {
    if (!this.bot) {
      console.warn('Scheduler: Bot not initialized');
      return;
    }

    try {
      for (const config of REMINDER_CONFIGS) {
        if (config.type === 'session') {
          await this.checkSessionReminders(config);
        } else if (config.type === 'event') {
          await this.checkEventReminders(config);
        }
      }
    } catch (error) {
      console.error('Scheduler error:', error);
    }
  }

  private async checkSessionReminders(config: ReminderConfig): Promise<void> {
    const targetTime = new Date();
    targetTime.setMinutes(targetTime.getMinutes() + config.offsetMinutes);

    // Find bookmarked sessions starting within the time window (±2 minutes)
    const { rows } = await pool.query<{
      user_id: number;
      telegram_id: string;
      session_id: number;
      session_title: string;
      starts_at: Date;
      location: string | null;
    }>(
      `SELECT DISTINCT
        u.id as user_id,
        u.telegram_id,
        s.id as session_id,
        s.title as session_title,
        s.starts_at,
        s.location
       FROM session_bookmarks sb
       JOIN users u ON sb.user_id = u.id
       JOIN sessions s ON sb.session_id = s.id
       WHERE s.starts_at BETWEEN $1 AND $2
       AND NOT EXISTS (
         SELECT 1 FROM sent_notifications sn
         WHERE sn.user_id = u.id
         AND sn.notification_type = 'session_reminder'
         AND sn.entity_id = s.id
         AND sn.time_offset = $3
       )`,
      [
        new Date(targetTime.getTime() - 2 * 60 * 1000),
        new Date(targetTime.getTime() + 2 * 60 * 1000),
        config.offsetLabel,
      ]
    );

    for (const row of rows) {
      await this.sendSessionReminder(row, config.offsetLabel);
    }
  }

  private async checkEventReminders(config: ReminderConfig): Promise<void> {
    const targetTime = new Date();
    targetTime.setMinutes(targetTime.getMinutes() + config.offsetMinutes);

    // Find users registered for events starting within the time window
    const { rows } = await pool.query<{
      user_id: number;
      telegram_id: string;
      event_id: number;
      event_title: string;
      starts_at: Date;
      venue: string | null;
    }>(
      `SELECT DISTINCT
        u.id as user_id,
        u.telegram_id,
        e.id as event_id,
        e.title as event_title,
        e.starts_at,
        e.venue
       FROM registrations r
       JOIN users u ON r.user_id = u.id
       JOIN events e ON r.event_id = e.id
       WHERE e.starts_at BETWEEN $1 AND $2
       AND r.status IN ('pending', 'confirmed', 'checked_in')
       AND NOT EXISTS (
         SELECT 1 FROM sent_notifications sn
         WHERE sn.user_id = u.id
         AND sn.notification_type = 'event_reminder'
         AND sn.entity_id = e.id
         AND sn.time_offset = $3
       )`,
      [
        new Date(targetTime.getTime() - 2 * 60 * 1000),
        new Date(targetTime.getTime() + 2 * 60 * 1000),
        config.offsetLabel,
      ]
    );

    for (const row of rows) {
      await this.sendEventReminder(row, config.offsetLabel);
    }
  }

  private async sendSessionReminder(
    data: {
      user_id: number;
      telegram_id: string;
      session_id: number;
      session_title: string;
      starts_at: Date;
      location: string | null;
    },
    timeOffset: string
  ): Promise<void> {
    if (!this.bot) return;

    try {
      const minutesLabel = timeOffset === '15min' ? '15 минут' : timeOffset;
      const locationText = data.location ? `\n📍 ${data.location}` : '';

      await this.bot.api.sendMessage(
        data.telegram_id,
        `⏰ <b>Напоминание!</b>\n\n` +
        `Через ${minutesLabel} начинается:\n` +
        `<b>${data.session_title}</b>${locationText}\n\n` +
        `🕒 ${data.starts_at.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`,
        { parse_mode: 'HTML' }
      );

      // Mark as sent
      await pool.query(
        `INSERT INTO sent_notifications (user_id, notification_type, entity_id, time_offset)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, notification_type, entity_id, time_offset) DO NOTHING`,
        [data.user_id, 'session_reminder', data.session_id, timeOffset]
      );
    } catch (error) {
      console.error(`Failed to send session reminder to ${data.telegram_id}:`, error);
    }
  }

  private async sendEventReminder(
    data: {
      user_id: number;
      telegram_id: string;
      event_id: number;
      event_title: string;
      starts_at: Date;
      venue: string | null;
    },
    timeOffset: string
  ): Promise<void> {
    if (!this.bot) return;

    try {
      const timeLabel = 
        timeOffset === '1hour' ? '1 час' :
        timeOffset === '24hours' ? '24 часа' :
        timeOffset;

      const venueText = data.venue ? `\n📍 ${data.venue}` : '';

      await this.bot.api.sendMessage(
        data.telegram_id,
        `⏰ <b>Напоминание!</b>\n\n` +
        `Через ${timeLabel} начинается событие:\n` +
        `<b>${data.event_title}</b>${venueText}\n\n` +
        `🕒 ${data.starts_at.toLocaleString('ru-RU', { 
          day: '2-digit', 
          month: '2-digit', 
          hour: '2-digit', 
          minute: '2-digit' 
        })}`,
        { parse_mode: 'HTML' }
      );

      // Mark as sent
      await pool.query(
        `INSERT INTO sent_notifications (user_id, notification_type, entity_id, time_offset)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, notification_type, entity_id, time_offset) DO NOTHING`,
        [data.user_id, 'event_reminder', data.event_id, timeOffset]
      );
    } catch (error) {
      console.error(`Failed to send event reminder to ${data.telegram_id}:`, error);
    }
  }
}

export default new SchedulerService();
