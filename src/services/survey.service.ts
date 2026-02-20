import pool from '../db/pool';

export interface EventSurvey {
  id: number;
  event_id: number;
  user_id: number;
  overall_rating: number;
  best_session_id: number | null;
  improvement: string | null;
  would_recommend: boolean;
  created_at: Date;
}

export interface SurveyStats {
  eventId: number;
  totalResponses: number;
  averageRating: number;
  recommendPercentage: number;
  topSessions: Array<{
    sessionId: number;
    title: string;
    votes: number;
  }>;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

class SurveyService {
  async create(
    eventId: number,
    userId: number,
    overallRating: number,
    bestSessionId: number | null,
    improvement: string | null,
    wouldRecommend: boolean
  ): Promise<EventSurvey> {
    if (overallRating < 1 || overallRating > 5) {
      throw new Error('Overall rating must be between 1 and 5');
    }

    const { rows } = await pool.query<EventSurvey>(
      `INSERT INTO event_surveys 
       (event_id, user_id, overall_rating, best_session_id, improvement, would_recommend)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (event_id, user_id)
       DO UPDATE SET
         overall_rating = EXCLUDED.overall_rating,
         best_session_id = EXCLUDED.best_session_id,
         improvement = EXCLUDED.improvement,
         would_recommend = EXCLUDED.would_recommend,
         created_at = NOW()
       RETURNING *`,
      [eventId, userId, overallRating, bestSessionId, improvement, wouldRecommend]
    );

    return rows[0];
  }

  async findByEventAndUser(eventId: number, userId: number): Promise<EventSurvey | null> {
    const { rows } = await pool.query<EventSurvey>(
      'SELECT * FROM event_surveys WHERE event_id = $1 AND user_id = $2',
      [eventId, userId]
    );
    return rows[0] || null;
  }

  async getEventStats(eventId: number): Promise<SurveyStats> {
    const { rows } = await pool.query<{
      total_responses: string;
      avg_rating: string;
      recommend_count: string;
      rating_1: string;
      rating_2: string;
      rating_3: string;
      rating_4: string;
      rating_5: string;
    }>(
      `SELECT 
        COUNT(*) as total_responses,
        COALESCE(AVG(overall_rating), 0) as avg_rating,
        COUNT(*) FILTER (WHERE would_recommend = true) as recommend_count,
        COUNT(*) FILTER (WHERE overall_rating = 1) as rating_1,
        COUNT(*) FILTER (WHERE overall_rating = 2) as rating_2,
        COUNT(*) FILTER (WHERE overall_rating = 3) as rating_3,
        COUNT(*) FILTER (WHERE overall_rating = 4) as rating_4,
        COUNT(*) FILTER (WHERE overall_rating = 5) as rating_5
       FROM event_surveys
       WHERE event_id = $1`,
      [eventId]
    );

    const row = rows[0];
    const totalResponses = parseInt(row.total_responses, 10);
    const recommendCount = parseInt(row.recommend_count, 10);

    // Get top sessions
    const { rows: topSessionRows } = await pool.query<{
      session_id: number;
      title: string;
      votes: string;
    }>(
      `SELECT 
        s.id as session_id,
        s.title,
        COUNT(*) as votes
       FROM event_surveys es
       JOIN sessions s ON es.best_session_id = s.id
       WHERE es.event_id = $1 AND es.best_session_id IS NOT NULL
       GROUP BY s.id, s.title
       ORDER BY votes DESC
       LIMIT 5`,
      [eventId]
    );

    return {
      eventId,
      totalResponses,
      averageRating: totalResponses > 0 
        ? Math.round(parseFloat(row.avg_rating) * 10) / 10 
        : 0,
      recommendPercentage: totalResponses > 0 
        ? Math.round((recommendCount / totalResponses) * 100) 
        : 0,
      topSessions: topSessionRows.map(r => ({
        sessionId: r.session_id,
        title: r.title,
        votes: parseInt(r.votes, 10),
      })),
      ratingDistribution: {
        1: parseInt(row.rating_1, 10),
        2: parseInt(row.rating_2, 10),
        3: parseInt(row.rating_3, 10),
        4: parseInt(row.rating_4, 10),
        5: parseInt(row.rating_5, 10),
      },
    };
  }

  async getAllSurveysForEvent(eventId: number): Promise<EventSurvey[]> {
    const { rows } = await pool.query<EventSurvey>(
      `SELECT * FROM event_surveys 
       WHERE event_id = $1
       ORDER BY created_at DESC`,
      [eventId]
    );
    return rows;
  }
}

export default new SurveyService();
