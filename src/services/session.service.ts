import pool from '../db/pool';

export interface Session {
  id: number;
  event_id: number;
  title: string;
  description: string | null;
  speaker_name: string | null;
  speaker_bio: string | null;
  location: string | null;
  starts_at: Date;
  ends_at: Date;
  track: string | null;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface SessionWithBookmark extends Session {
  is_bookmarked?: boolean;
  bookmark_count?: number;
}

export interface CreateSessionData {
  event_id: number;
  title: string;
  description?: string;
  speaker_name?: string;
  speaker_bio?: string;
  location?: string;
  starts_at: Date;
  ends_at: Date;
  track?: string;
  sort_order?: number;
}

class SessionService {
  async findById(id: number): Promise<Session | null> {
    const { rows } = await pool.query<Session>(
      'SELECT * FROM sessions WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  }

  async findByEventId(eventId: number, userId?: number): Promise<SessionWithBookmark[]> {
    let query = `
      SELECT s.*,
        ${userId ? `EXISTS(SELECT 1 FROM session_bookmarks WHERE user_id = $2 AND session_id = s.id) as is_bookmarked,` : ''}
        (SELECT COUNT(*) FROM session_bookmarks WHERE session_id = s.id) as bookmark_count
      FROM sessions s
      WHERE s.event_id = $1
      ORDER BY s.starts_at ASC, s.sort_order ASC
    `;

    const params = userId ? [eventId, userId] : [eventId];
    const { rows } = await pool.query<SessionWithBookmark>(query, params);
    
    return rows.map(row => ({
      ...row,
      bookmark_count: parseInt(String(row.bookmark_count || 0), 10)
    }));
  }

  async findByTrack(eventId: number, track: string, userId?: number): Promise<SessionWithBookmark[]> {
    let query = `
      SELECT s.*,
        ${userId ? `EXISTS(SELECT 1 FROM session_bookmarks WHERE user_id = $3 AND session_id = s.id) as is_bookmarked,` : ''}
        (SELECT COUNT(*) FROM session_bookmarks WHERE session_id = s.id) as bookmark_count
      FROM sessions s
      WHERE s.event_id = $1 AND s.track = $2
      ORDER BY s.starts_at ASC, s.sort_order ASC
    `;

    const params = userId ? [eventId, track, userId] : [eventId, track];
    const { rows } = await pool.query<SessionWithBookmark>(query, params);
    
    return rows.map(row => ({
      ...row,
      bookmark_count: parseInt(String(row.bookmark_count || 0), 10)
    }));
  }

  async getBookmarkedSessions(userId: number, eventId: number): Promise<SessionWithBookmark[]> {
    const { rows } = await pool.query<SessionWithBookmark>(
      `SELECT s.*, true as is_bookmarked,
        (SELECT COUNT(*) FROM session_bookmarks WHERE session_id = s.id) as bookmark_count
       FROM sessions s
       JOIN session_bookmarks sb ON s.id = sb.session_id
       WHERE sb.user_id = $1 AND s.event_id = $2
       ORDER BY s.starts_at ASC`,
      [userId, eventId]
    );
    
    return rows.map(row => ({
      ...row,
      bookmark_count: parseInt(String(row.bookmark_count || 0), 10)
    }));
  }

  async getTracks(eventId: number): Promise<string[]> {
    const { rows } = await pool.query<{ track: string }>(
      `SELECT DISTINCT track FROM sessions WHERE event_id = $1 AND track IS NOT NULL ORDER BY track`,
      [eventId]
    );
    return rows.map(r => r.track);
  }

  async create(data: CreateSessionData): Promise<Session> {
    const { rows } = await pool.query<Session>(
      `INSERT INTO sessions (event_id, title, description, speaker_name, speaker_bio, location, starts_at, ends_at, track, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        data.event_id,
        data.title,
        data.description || null,
        data.speaker_name || null,
        data.speaker_bio || null,
        data.location || null,
        data.starts_at,
        data.ends_at,
        data.track || null,
        data.sort_order || 0,
      ]
    );
    return rows[0];
  }

  async update(id: number, data: Partial<CreateSessionData>): Promise<Session> {
    const allowedFields = [
      'title', 'description', 'speaker_name', 'speaker_bio',
      'location', 'starts_at', 'ends_at', 'track', 'sort_order'
    ];

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && allowedFields.includes(key)) {
        fields.push(`${key} = $${idx}`);
        values.push(value);
        idx++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const { rows } = await pool.query<Session>(
      `UPDATE sessions SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return rows[0];
  }

  async delete(id: number): Promise<void> {
    await pool.query('DELETE FROM sessions WHERE id = $1', [id]);
  }

  async toggleBookmark(userId: number, sessionId: number): Promise<boolean> {
    // Atomic toggle using CTE to prevent race condition
    const { rows } = await pool.query(
      `WITH deleted AS (
        DELETE FROM session_bookmarks 
        WHERE user_id = $1 AND session_id = $2 
        RETURNING *
      )
      INSERT INTO session_bookmarks (user_id, session_id)
      SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM deleted)
      RETURNING *`,
      [userId, sessionId]
    );

    // true = added (rowCount > 0), false = removed (rowCount = 0)
    return rows.length > 0;
  }

  async getTopSessions(eventId: number, limit: number = 5): Promise<Array<SessionWithBookmark>> {
    const { rows } = await pool.query<SessionWithBookmark>(
      `SELECT s.*,
        (SELECT COUNT(*) FROM session_bookmarks WHERE session_id = s.id) as bookmark_count
       FROM sessions s
       WHERE s.event_id = $1
       ORDER BY bookmark_count DESC, s.starts_at ASC
       LIMIT $2`,
      [eventId, limit]
    );
    
    return rows.map(row => ({
      ...row,
      bookmark_count: parseInt(String(row.bookmark_count || 0), 10)
    }));
  }
}

export default new SessionService();
