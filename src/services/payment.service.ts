import pool from '../db/pool';

export interface Payment {
  id: number;
  registration_id: number;
  card_id: number | null;
  amount: number;
  currency: string;
  status: string;
  screenshot_file_id: string | null;
  confirmed_by: number | null;
  confirmed_at: Date | null;
  rejection_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreatePaymentData {
  registration_id: number;
  card_id: number;
  amount: number;
  currency?: string;
}

class PaymentService {
  async findById(id: number): Promise<Payment | null> {
    const { rows } = await pool.query<Payment>(
      'SELECT * FROM payments WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  }

  async findByRegistration(registrationId: number): Promise<Payment | null> {
    const { rows } = await pool.query<Payment>(
      'SELECT * FROM payments WHERE registration_id = $1 ORDER BY created_at DESC LIMIT 1',
      [registrationId]
    );
    return rows[0] || null;
  }

  async findPendingByEvent(eventId: number): Promise<any[]> {
    const { rows } = await pool.query(
      `SELECT 
        p.*,
        r.user_id, r.ticket_type_id,
        u.first_name, u.last_name, u.telegram_username,
        tt.name as ticket_type_name,
        pc.card_number
       FROM payments p
       JOIN registrations r ON p.registration_id = r.id
       JOIN users u ON r.user_id = u.id
       JOIN ticket_types tt ON r.ticket_type_id = tt.id
       LEFT JOIN payment_cards pc ON p.card_id = pc.id
       WHERE r.event_id = $1 AND p.status = 'screenshot_sent'
       ORDER BY p.created_at ASC`,
      [eventId]
    );
    return rows;
  }

  async create(data: CreatePaymentData): Promise<Payment> {
    const { rows } = await pool.query<Payment>(
      `INSERT INTO payments (registration_id, card_id, amount, currency)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.registration_id, data.card_id, data.amount, data.currency || 'RUB']
    );
    return rows[0];
  }

  async updateScreenshot(id: number, fileId: string): Promise<Payment> {
    const { rows } = await pool.query<Payment>(
      `UPDATE payments 
       SET screenshot_file_id = $1, status = 'screenshot_sent', updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [fileId, id]
    );
    return rows[0];
  }

  async confirm(
    id: number,
    confirmedBy: number,
    sendTicketCallback?: (registrationId: number) => Promise<void>
  ): Promise<Payment> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update payment
      const { rows } = await client.query<Payment>(
        `UPDATE payments 
         SET status = 'confirmed', confirmed_by = $1, confirmed_at = NOW(), updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [confirmedBy, id]
      );

      const payment = rows[0];

      // Update registration status
      await client.query(
        `UPDATE registrations 
         SET status = 'confirmed', updated_at = NOW()
         WHERE id = $1`,
        [payment.registration_id]
      );

      await client.query('COMMIT');

      // Send QR ticket to user (if callback provided)
      if (sendTicketCallback) {
        try {
          await sendTicketCallback(payment.registration_id);
        } catch (err) {
          console.error('Failed to send ticket:', err);
          // Don't fail the confirmation if ticket sending fails
        }
      }

      return payment;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async reject(id: number, reason: string): Promise<Payment> {
    const { rows } = await pool.query<Payment>(
      `UPDATE payments 
       SET status = 'rejected', rejection_reason = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [reason, id]
    );
    return rows[0];
  }

  async getCardStats(eventId: number): Promise<any[]> {
    const { rows } = await pool.query(
      `SELECT 
        pc.id, pc.card_number, pc.card_holder,
        COUNT(p.id)::int as payment_count,
        COALESCE(SUM(p.amount), 0) as total_amount
       FROM payment_cards pc
       LEFT JOIN payments p ON pc.id = p.card_id AND p.status = 'confirmed'
       WHERE pc.event_id = $1
       GROUP BY pc.id
       ORDER BY pc.sort_order`,
      [eventId]
    );
    return rows;
  }
}

export default new PaymentService();
