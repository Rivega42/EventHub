import pool from '../db/pool';

export interface User {
  id: number;
  telegram_id: number;
  telegram_username: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
  role: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserData {
  telegram_id: number;
  telegram_username?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  company?: string;
}

class UserService {
  async findByTelegramId(telegramId: number): Promise<User | null> {
    const { rows } = await pool.query<User>(
      'SELECT * FROM users WHERE telegram_id = $1',
      [telegramId]
    );
    return rows[0] || null;
  }

  async findById(id: number): Promise<User | null> {
    const { rows } = await pool.query<User>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  }

  async create(data: CreateUserData): Promise<User> {
    const { rows } = await pool.query<User>(
      `INSERT INTO users (telegram_id, telegram_username, first_name, last_name, phone, email, company)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.telegram_id,
        data.telegram_username || null,
        data.first_name || null,
        data.last_name || null,
        data.phone || null,
        data.email || null,
        data.company || null,
      ]
    );
    return rows[0];
  }

  async update(id: number, data: Partial<CreateUserData>): Promise<User> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${idx}`);
        values.push(value);
        idx++;
      }
    });

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const { rows } = await pool.query<User>(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return rows[0];
  }

  async getOrCreate(data: CreateUserData): Promise<User> {
    const existing = await this.findByTelegramId(data.telegram_id);
    if (existing) {
      return existing;
    }
    return this.create(data);
  }
}

export default new UserService();
