import pool from '../db/pool';
import crypto from 'crypto';

class EventPinService {
  /**
   * Generate a new PIN for event check-in
   */
  async generatePin(eventId: number): Promise<string> {
    const pin = this.generateRandomPin();
    const pinHash = this.hashPin(pin);

    await pool.query(
      `UPDATE events 
       SET settings = jsonb_set(
         COALESCE(settings, '{}'),
         '{checkin_pin_hash}',
         to_jsonb($1::text)
       )
       WHERE id = $2`,
      [pinHash, eventId]
    );

    return pin;
  }

  /**
   * Verify PIN for event check-in
   */
  async verifyPin(eventId: number, pin: string): Promise<boolean> {
    const { rows } = await pool.query(
      `SELECT settings->>'checkin_pin_hash' as pin_hash FROM events WHERE id = $1`,
      [eventId]
    );

    if (!rows[0]?.pin_hash) {
      return false; // No PIN set
    }

    const expectedHash = rows[0].pin_hash;
    const providedHash = this.hashPin(pin);

    return expectedHash === providedHash;
  }

  /**
   * Check if event has PIN enabled
   */
  async hasPin(eventId: number): Promise<boolean> {
    const { rows } = await pool.query(
      `SELECT settings->>'checkin_pin_hash' as pin_hash FROM events WHERE id = $1`,
      [eventId]
    );

    return !!rows[0]?.pin_hash;
  }

  /**
   * Remove PIN from event
   */
  async removePin(eventId: number): Promise<void> {
    await pool.query(
      `UPDATE events 
       SET settings = settings - 'checkin_pin_hash'
       WHERE id = $1`,
      [eventId]
    );
  }

  private generateRandomPin(): string {
    // Generate 6-digit PIN
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private hashPin(pin: string): string {
    return crypto.createHash('sha256').update(pin).digest('hex');
  }
}

export default new EventPinService();
