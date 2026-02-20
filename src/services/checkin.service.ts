import pool from '../db/pool';

export interface CheckIn {
  id: number;
  registration_id: number;
  scanned_by: number;
  scanned_at: Date;
  location: string | null;
}

class CheckinService {
  async findByRegistration(registrationId: number): Promise<CheckIn | null> {
    const { rows } = await pool.query<CheckIn>(
      'SELECT * FROM check_ins WHERE registration_id = $1 ORDER BY scanned_at DESC LIMIT 1',
      [registrationId]
    );
    return rows[0] || null;
  }

  async findByEvent(eventId: number): Promise<CheckIn[]> {
    const { rows } = await pool.query<CheckIn>(
      `SELECT ci.* FROM check_ins ci
       JOIN registrations r ON ci.registration_id = r.id
       WHERE r.event_id = $1
       ORDER BY ci.scanned_at DESC`,
      [eventId]
    );
    return rows;
  }

  async create(
    registrationId: number,
    scannedBy: number,
    location?: string
  ): Promise<CheckIn> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create check-in
      const { rows } = await client.query<CheckIn>(
        `INSERT INTO check_ins (registration_id, scanned_by, location)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [registrationId, scannedBy, location || null]
      );

      // Update registration status
      await client.query(
        `UPDATE registrations 
         SET status = 'checked_in', updated_at = NOW()
         WHERE id = $1`,
        [registrationId]
      );

      await client.query('COMMIT');
      return rows[0];
    } catch (err: any) {
      await client.query('ROLLBACK');
      
      // Handle race condition: duplicate check-in attempt
      if (err.code === '23505' && err.constraint === 'unique_registration_checkin') {
        // Return existing check-in instead of throwing
        const existing = await this.findByRegistration(registrationId);
        if (existing) {
          return existing;
        }
      }
      
      throw err;
    } finally {
      client.release();
    }
  }

  async getStats(eventId: number): Promise<{
    total: number;
    checkedIn: number;
    percentage: number;
  }> {
    const { rows } = await pool.query<{
      total: string;
      checked_in: string;
    }>(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'checked_in') as checked_in
       FROM registrations
       WHERE event_id = $1`,
      [eventId]
    );

    const total = parseInt(rows[0].total, 10);
    const checkedIn = parseInt(rows[0].checked_in, 10);

    return {
      total,
      checkedIn,
      percentage: total > 0 ? Math.round((checkedIn / total) * 100) : 0,
    };
  }
}

export default new CheckinService();
