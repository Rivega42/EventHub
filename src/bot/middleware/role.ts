import { BotContext } from '../context';
import pool from '../../db/pool';

/**
 * Check if user has specific role for event
 * @param ctx Bot context
 * @param eventId Event ID
 * @param role Required role (organizer, volunteer, speaker)
 * @returns true if user has role, false otherwise
 */
export async function requireRole(
  ctx: BotContext,
  eventId: number,
  role: 'organizer' | 'volunteer' | 'speaker'
): Promise<boolean> {
  if (!ctx.userId) {
    await ctx.answerCallbackQuery('⛔ Ошибка авторизации');
    return false;
  }

  const { rows } = await pool.query(
    'SELECT role FROM event_roles WHERE user_id = $1 AND event_id = $2',
    [ctx.userId, eventId]
  );

  if (!rows.some(r => r.role === role)) {
    await ctx.answerCallbackQuery('⛔ Нет доступа');
    return false;
  }

  return true;
}

/**
 * Check if user is organizer for any event
 * @param ctx Bot context
 * @param userId User ID
 * @returns List of event IDs where user is organizer
 */
export async function getOrganizerEvents(userId: number): Promise<number[]> {
  const { rows } = await pool.query(
    'SELECT DISTINCT event_id FROM event_roles WHERE user_id = $1 AND role = $2',
    [userId, 'organizer']
  );
  return rows.map(r => r.event_id);
}
