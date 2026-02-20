import pool from '../db/pool';
import qrService from './qr.service';

export interface Registration {
  id: number;
  event_id: number;
  user_id: number;
  ticket_type_id: number;
  status: string;
  qr_token: string;
  qr_hmac: string | null;
  reg_data: any;
  created_at: Date;
  updated_at: Date;
}

export interface CreateRegistrationData {
  event_id: number;
  user_id: number;
  ticket_type_id: number;
  reg_data?: any;
}

class RegistrationService {
  async findById(id: number): Promise<Registration | null> {
    const { rows } = await pool.query<Registration>(
      'SELECT * FROM registrations WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  }

  async findByEventAndUser(eventId: number, userId: number): Promise<Registration | null> {
    const { rows } = await pool.query<Registration>(
      'SELECT * FROM registrations WHERE event_id = $1 AND user_id = $2',
      [eventId, userId]
    );
    return rows[0] || null;
  }

  async findByUserId(userId: number): Promise<Registration[]> {
    const { rows } = await pool.query<Registration>(
      'SELECT * FROM registrations WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return rows;
  }

  async findByQrToken(qrToken: string): Promise<Registration | null> {
    const { rows } = await pool.query<Registration>(
      'SELECT * FROM registrations WHERE qr_token = $1',
      [qrToken]
    );
    return rows[0] || null;
  }

  async findByEvent(eventId: number, filters?: {
    status?: string;
    ticketTypeId?: number;
  }): Promise<Registration[]> {
    let query = 'SELECT * FROM registrations WHERE event_id = $1';
    const params: any[] = [eventId];
    let paramIdx = 2;

    if (filters?.status) {
      query += ` AND status = $${paramIdx}`;
      params.push(filters.status);
      paramIdx++;
    }

    if (filters?.ticketTypeId) {
      query += ` AND ticket_type_id = $${paramIdx}`;
      params.push(filters.ticketTypeId);
      paramIdx++;
    }

    query += ' ORDER BY created_at DESC';

    const { rows } = await pool.query<Registration>(query, params);
    return rows;
  }

  async create(data: CreateRegistrationData): Promise<Registration> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check ticket availability with lock
      const { rows: ticketTypeRows } = await client.query(
        'SELECT quantity, sold_count FROM ticket_types WHERE id = $1 FOR UPDATE',
        [data.ticket_type_id]
      );

      if (!ticketTypeRows.length) {
        throw new Error('Ticket type not found');
      }

      const ticketType = ticketTypeRows[0];
      if (ticketType.quantity && ticketType.sold_count >= ticketType.quantity) {
        throw new Error('Tickets sold out');
      }

      // Create registration
      const { rows } = await client.query<Registration>(
        `INSERT INTO registrations (event_id, user_id, ticket_type_id, reg_data)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [data.event_id, data.user_id, data.ticket_type_id, data.reg_data || {}]
      );

      const registration = rows[0];

      // Generate HMAC for QR token
      const hmac = qrService.generateHmac(registration.qr_token);
      await client.query(
        'UPDATE registrations SET qr_hmac = $1 WHERE id = $2',
        [hmac, registration.id]
      );

      // Increment sold_count
      await client.query(
        'UPDATE ticket_types SET sold_count = sold_count + 1 WHERE id = $1',
        [data.ticket_type_id]
      );

      await client.query('COMMIT');

      registration.qr_hmac = hmac;
      return registration;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async updateStatus(id: number, status: string): Promise<Registration> {
    const { rows } = await pool.query<Registration>(
      'UPDATE registrations SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );
    return rows[0];
  }

  async getWithDetails(id: number): Promise<any> {
    const { rows } = await pool.query(
      `SELECT 
        r.*,
        u.first_name, u.last_name, u.email, u.phone, u.company, u.telegram_username,
        tt.name as ticket_type_name, tt.price,
        e.title as event_title, e.slug as event_slug
       FROM registrations r
       JOIN users u ON r.user_id = u.id
       JOIN ticket_types tt ON r.ticket_type_id = tt.id
       JOIN events e ON r.event_id = e.id
       WHERE r.id = $1`,
      [id]
    );
    return rows[0] || null;
  }
}

export default new RegistrationService();
