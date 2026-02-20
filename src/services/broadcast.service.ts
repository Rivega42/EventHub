import pool from '../db/pool';
import { Api } from 'grammy';

export interface BroadcastFilter {
  eventId: number;
  status?: 'all' | 'confirmed' | 'checked_in';
  ticketTypeId?: number;
}

export interface BroadcastStats {
  sent: number;
  failed: number;
  errors: string[];
}

const RATE_LIMIT_PER_SECOND = 30;
const DELAY_MS = 1000 / RATE_LIMIT_PER_SECOND;

class BroadcastService {
  async getRecipients(filter: BroadcastFilter): Promise<Array<{ telegram_id: string; first_name: string; last_name: string }>> {
    let query = `
      SELECT DISTINCT u.telegram_id, u.first_name, u.last_name
      FROM users u
      JOIN registrations r ON u.id = r.user_id
      WHERE r.event_id = $1
    `;

    const params: any[] = [filter.eventId];
    let paramIdx = 2;

    if (filter.status === 'confirmed') {
      query += ` AND r.status = 'confirmed'`;
    } else if (filter.status === 'checked_in') {
      query += ` AND r.status = 'checked_in'`;
    }

    if (filter.ticketTypeId) {
      query += ` AND r.ticket_type_id = $${paramIdx}`;
      params.push(filter.ticketTypeId);
      paramIdx++;
    }

    query += ` ORDER BY u.first_name, u.last_name`;

    const { rows } = await pool.query(query, params);
    return rows;
  }

  async send(
    api: Api,
    filter: BroadcastFilter,
    message: string,
    onProgress?: (sent: number, total: number) => void
  ): Promise<BroadcastStats> {
    const recipients = await this.getRecipients(filter);
    const stats: BroadcastStats = {
      sent: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      
      try {
        await api.sendMessage(recipient.telegram_id, message, { parse_mode: 'HTML' });
        stats.sent++;
        
        if (onProgress) {
          onProgress(stats.sent, recipients.length);
        }

        // Rate limiting
        if (i < recipients.length - 1) {
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
      } catch (err: any) {
        stats.failed++;
        const errorMsg = `Failed to send to ${recipient.first_name} ${recipient.last_name}: ${err.message}`;
        stats.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    return stats;
  }

  async getRecipientCount(filter: BroadcastFilter): Promise<number> {
    const recipients = await this.getRecipients(filter);
    return recipients.length;
  }
}

export default new BroadcastService();
