import pool from '../db/pool';

export interface SessionFeedback {
  id: number;
  user_id: number;
  session_id: number;
  rating: number;
  comment: string | null;
  created_at: Date;
}

export interface FeedbackStats {
  sessionId: number;
  averageRating: number;
  totalCount: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

class FeedbackService {
  async createOrUpdate(
    userId: number,
    sessionId: number,
    rating: number,
    comment?: string
  ): Promise<SessionFeedback> {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const { rows } = await pool.query<SessionFeedback>(
      `INSERT INTO session_feedback (user_id, session_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, session_id) 
       DO UPDATE SET 
         rating = EXCLUDED.rating,
         comment = EXCLUDED.comment,
         created_at = NOW()
       RETURNING *`,
      [userId, sessionId, rating, comment || null]
    );

    return rows[0];
  }

  async findBySessionAndUser(
    sessionId: number,
    userId: number
  ): Promise<SessionFeedback | null> {
    const { rows } = await pool.query<SessionFeedback>(
      'SELECT * FROM session_feedback WHERE session_id = $1 AND user_id = $2',
      [sessionId, userId]
    );
    return rows[0] || null;
  }

  async getSessionStats(sessionId: number): Promise<FeedbackStats> {
    const { rows } = await pool.query<{
      avg_rating: string;
      total_count: string;
      rating_1: string;
      rating_2: string;
      rating_3: string;
      rating_4: string;
      rating_5: string;
    }>(
      `SELECT 
        COALESCE(AVG(rating), 0) as avg_rating,
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE rating = 1) as rating_1,
        COUNT(*) FILTER (WHERE rating = 2) as rating_2,
        COUNT(*) FILTER (WHERE rating = 3) as rating_3,
        COUNT(*) FILTER (WHERE rating = 4) as rating_4,
        COUNT(*) FILTER (WHERE rating = 5) as rating_5
       FROM session_feedback
       WHERE session_id = $1`,
      [sessionId]
    );

    const row = rows[0];
    const totalCount = parseInt(row.total_count, 10);
    const averageRating = totalCount > 0 ? parseFloat(row.avg_rating) : 0;

    return {
      sessionId,
      averageRating: Math.round(averageRating * 10) / 10,
      totalCount,
      ratingDistribution: {
        1: parseInt(row.rating_1, 10),
        2: parseInt(row.rating_2, 10),
        3: parseInt(row.rating_3, 10),
        4: parseInt(row.rating_4, 10),
        5: parseInt(row.rating_5, 10),
      },
    };
  }

  async getEventStats(eventId: number): Promise<Map<number, FeedbackStats>> {
    const { rows: sessions } = await pool.query<{ id: number }>(
      'SELECT id FROM sessions WHERE event_id = $1',
      [eventId]
    );

    const statsMap = new Map<number, FeedbackStats>();

    for (const session of sessions) {
      const stats = await this.getSessionStats(session.id);
      statsMap.set(session.id, stats);
    }

    return statsMap;
  }

  async getAllFeedbackForSession(sessionId: number): Promise<SessionFeedback[]> {
    const { rows } = await pool.query<SessionFeedback>(
      `SELECT * FROM session_feedback 
       WHERE session_id = $1
       ORDER BY created_at DESC`,
      [sessionId]
    );
    return rows;
  }
}

export default new FeedbackService();
