import pool from '../db/pool';

export interface Event {
  id: number;
  org_id: number;
  slug: string;
  title: string;
  description: string | null;
  venue: string | null;
  venue_map_url: string | null;
  city: string | null;
  starts_at: Date;
  ends_at: Date | null;
  timezone: string;
  status: string;
  max_attendees: number | null;
  settings: any;
  created_at: Date;
  updated_at: Date;
}

export interface CreateEventData {
  org_id: number;
  slug: string;
  title: string;
  description?: string;
  venue?: string;
  city?: string;
  starts_at: Date;
  ends_at?: Date;
  max_attendees?: number;
}

class EventService {
  async findBySlug(slug: string): Promise<Event | null> {
    const { rows } = await pool.query<Event>(
      'SELECT * FROM events WHERE slug = $1',
      [slug]
    );
    return rows[0] || null;
  }

  async findById(id: number): Promise<Event | null> {
    const { rows } = await pool.query<Event>(
      'SELECT * FROM events WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  }

  async findByOrgId(orgId: number): Promise<Event[]> {
    const { rows } = await pool.query<Event>(
      'SELECT * FROM events WHERE org_id = $1 ORDER BY starts_at DESC',
      [orgId]
    );
    return rows;
  }

  async findPublished(): Promise<Event[]> {
    const { rows } = await pool.query<Event>(
      `SELECT * FROM events 
       WHERE status = 'published' 
       ORDER BY starts_at ASC`
    );
    return rows;
  }

  async create(data: CreateEventData): Promise<Event> {
    const { rows } = await pool.query<Event>(
      `INSERT INTO events (org_id, slug, title, description, venue, city, starts_at, ends_at, max_attendees)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.org_id,
        data.slug,
        data.title,
        data.description || null,
        data.venue || null,
        data.city || null,
        data.starts_at,
        data.ends_at || null,
        data.max_attendees || null,
      ]
    );
    return rows[0];
  }

  async update(id: number, data: Partial<CreateEventData>): Promise<Event> {
    const allowedFields = [
      'slug', 'title', 'description', 'venue', 'venue_map_url',
      'city', 'starts_at', 'ends_at', 'timezone', 'max_attendees', 'settings'
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

    const { rows } = await pool.query<Event>(
      `UPDATE events SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return rows[0];
  }

  async updateStatus(id: number, status: string): Promise<Event> {
    const { rows } = await pool.query<Event>(
      `UPDATE events SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );
    return rows[0];
  }

  async getStats(eventId: number): Promise<{
    total: number;
    confirmed: number;
    checkedIn: number;
  }> {
    const { rows } = await pool.query<{ total: string; confirmed: string; checkedIn: string }>(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
        COUNT(*) FILTER (WHERE status = 'checked_in') as checkedIn
       FROM registrations
       WHERE event_id = $1`,
      [eventId]
    );
    return {
      total: parseInt(rows[0].total, 10),
      confirmed: parseInt(rows[0].confirmed, 10),
      checkedIn: parseInt(rows[0].checkedIn, 10),
    };
  }
}

export default new EventService();
