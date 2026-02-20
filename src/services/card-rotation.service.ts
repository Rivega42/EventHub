import pool from '../db/pool';

export interface PaymentCard {
  id: number;
  event_id: number;
  card_number: string;
  card_holder: string | null;
  bank_name: string | null;
  phone_number: string | null;
  is_active: boolean;
  daily_limit: number | null;
  total_received: number;
  sort_order: number;
  created_at: Date;
}

class CardRotationService {
  async getNextCard(eventId: number, amount: number): Promise<PaymentCard> {
    // 1. Get active cards for event
    const { rows: cards } = await pool.query<PaymentCard>(
      `SELECT * FROM payment_cards
       WHERE event_id = $1 AND is_active = TRUE
       ORDER BY sort_order`,
      [eventId]
    );

    if (cards.length === 0) {
      throw new Error('No active payment cards for this event');
    }

    // 2. Calculate today's total for each card
    const today = new Date().toISOString().split('T')[0];
    const cardsWithToday = await Promise.all(
      cards.map(async (card) => {
        const { rows } = await pool.query<{ sum: string }>(
          `SELECT COALESCE(SUM(amount), 0) as sum FROM payments
           WHERE card_id = $1 AND status = 'confirmed'
           AND created_at::date = $2::date`,
          [card.id, today]
        );
        return {
          ...card,
          todayTotal: parseFloat(rows[0].sum),
        };
      })
    );

    // 3. Filter by daily limit
    const available = cardsWithToday.filter(
      (c) => !c.daily_limit || c.todayTotal + amount <= c.daily_limit
    );

    if (available.length === 0) {
      throw new Error('All cards have reached their daily limit');
    }

    // 4. Select card with minimum today total (balancing)
    available.sort((a, b) => a.todayTotal - b.todayTotal);
    return available[0];
  }

  async findById(id: number): Promise<PaymentCard | null> {
    const { rows } = await pool.query<PaymentCard>(
      'SELECT * FROM payment_cards WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  }

  async findByEvent(eventId: number): Promise<PaymentCard[]> {
    const { rows } = await pool.query<PaymentCard>(
      `SELECT * FROM payment_cards
       WHERE event_id = $1
       ORDER BY sort_order`,
      [eventId]
    );
    return rows;
  }

  async create(data: {
    event_id: number;
    card_number: string;
    card_holder?: string;
    bank_name?: string;
    phone_number?: string;
    daily_limit?: number;
    sort_order?: number;
  }): Promise<PaymentCard> {
    const { rows } = await pool.query<PaymentCard>(
      `INSERT INTO payment_cards 
       (event_id, card_number, card_holder, bank_name, phone_number, daily_limit, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.event_id,
        data.card_number,
        data.card_holder || null,
        data.bank_name || null,
        data.phone_number || null,
        data.daily_limit || null,
        data.sort_order || 0,
      ]
    );
    return rows[0];
  }

  async updateStatus(id: number, isActive: boolean): Promise<PaymentCard> {
    const { rows } = await pool.query<PaymentCard>(
      'UPDATE payment_cards SET is_active = $1 WHERE id = $2 RETURNING *',
      [isActive, id]
    );
    return rows[0];
  }
}

export default new CardRotationService();
