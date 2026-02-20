import { BotContext } from '../context';
import { InlineKeyboard } from 'grammy';
import eventService from '../../services/event.service';
import sessionService from '../../services/session.service';
import pool from '../../db/pool';

export default async function dashboardHandler(ctx: BotContext): Promise<void> {
  try {
    if (!ctx.userId) {
      await ctx.reply('❌ Ошибка авторизации');
      return;
    }

    // Check if user is organizer
    const { rows: roles } = await pool.query(
      `SELECT DISTINCT event_id FROM event_roles WHERE user_id = $1 AND role = 'organizer'`,
      [ctx.userId]
    );

    if (roles.length === 0) {
      await ctx.reply('❌ У вас нет прав организатора');
      return;
    }

    // If user has multiple events, show selector
    if (roles.length > 1) {
      const keyboard = new InlineKeyboard();
      
      for (const role of roles) {
        const event = await eventService.findById(role.event_id);
        if (event) {
          keyboard.text(event.title, `dashboard:show:${event.id}`).row();
        }
      }

      await ctx.reply('📊 Выберите мероприятие:', { reply_markup: keyboard });
      return;
    }

    await showDashboard(ctx, roles[0].event_id);
  } catch (err) {
    console.error('Error in dashboardHandler:', err);
    await ctx.reply('❌ Ошибка при загрузке дашборда');
  }
}

export async function showDashboard(ctx: BotContext, eventId: number): Promise<void> {
  try {
    const event = await eventService.findById(eventId);
    if (!event) {
      await ctx.reply('❌ Мероприятие не найдено');
      return;
    }

    // Get registration stats
    const { rows: regStats } = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
        COUNT(*) FILTER (WHERE status = 'checked_in') as checked_in
       FROM registrations
       WHERE event_id = $1`,
      [eventId]
    );

    const stats = {
      total: parseInt(regStats[0].total, 10),
      pending: parseInt(regStats[0].pending, 10),
      confirmed: parseInt(regStats[0].confirmed, 10),
      checked_in: parseInt(regStats[0].checked_in, 10),
    };

    // Get payment stats
    const { rows: payStats } = await pool.query(
      `SELECT 
        COUNT(*) as total_payments,
        COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_payments,
        COALESCE(SUM(amount) FILTER (WHERE status = 'confirmed'), 0) as total_revenue,
        COALESCE(SUM(amount), 0) as expected_revenue,
        COALESCE(AVG(amount) FILTER (WHERE status = 'confirmed'), 0) as avg_check
       FROM payments p
       JOIN registrations r ON p.registration_id = r.id
       WHERE r.event_id = $1`,
      [eventId]
    );

    const paymentStats = {
      total: parseInt(payStats[0].total_payments, 10),
      confirmed: parseInt(payStats[0].confirmed_payments, 10),
      revenue: parseFloat(payStats[0].total_revenue),
      expected: parseFloat(payStats[0].expected_revenue),
      avgCheck: parseFloat(payStats[0].avg_check),
    };

    // Get ticket type breakdown
    const { rows: ticketTypes } = await pool.query(
      `SELECT tt.name, COUNT(*) as count
       FROM registrations r
       JOIN ticket_types tt ON r.ticket_type_id = tt.id
       WHERE r.event_id = $1
       GROUP BY tt.name
       ORDER BY count DESC`,
      [eventId]
    );

    // Get top sessions
    const topSessions = await sessionService.getTopSessions(eventId, 5);

    // Build message
    let message = `📊 <b>${event.title}</b>\n`;
    message += `<b>Дашборд организатора</b>\n\n`;

    // Registrations
    message += `<b>📝 Регистрации:</b>\n`;
    message += `├ Всего: ${stats.total}\n`;
    message += `├ Ожидают оплаты: ${stats.pending}\n`;
    message += `├ Подтверждено: ${stats.confirmed}\n`;
    message += `└ Отметилось: ${stats.checked_in}\n\n`;

    // Check-in progress
    if (stats.confirmed > 0) {
      const checkinPercent = Math.round((stats.checked_in / stats.confirmed) * 100);
      message += `<b>✅ Check-in:</b> ${checkinPercent}%\n`;
      message += createProgressBar(checkinPercent) + '\n\n';
    }

    // Payment conversion
    if (stats.total > 0) {
      const conversionPercent = Math.round((paymentStats.confirmed / stats.total) * 100);
      message += `<b>💰 Конверсия оплат:</b> ${conversionPercent}%\n`;
      message += createProgressBar(conversionPercent) + '\n\n';
    }

    // Financial stats
    message += `<b>💵 Финансы:</b>\n`;
    message += `├ Ожидаемый доход: ${Math.round(paymentStats.expected)} ₽\n`;
    message += `├ Подтверждённые оплаты: ${Math.round(paymentStats.revenue)} ₽\n`;
    message += `└ Средний чек: ${Math.round(paymentStats.avgCheck)} ₽\n\n`;

    // Ticket types
    if (ticketTypes.length > 0) {
      message += `<b>🎫 Типы билетов:</b>\n`;
      ticketTypes.forEach(tt => {
        message += `├ ${tt.name}: ${tt.count}\n`;
      });
      message += '\n';
    }

    // Top sessions
    if (topSessions.length > 0) {
      message += `<b>⭐️ Топ-5 популярных докладов:</b>\n`;
      topSessions.slice(0, 5).forEach((session, idx) => {
        const icon = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '  ';
        message += `${icon} ${session.title} (${session.bookmark_count} ⭐️)\n`;
      });
      message += '\n';
    }

    const keyboard = new InlineKeyboard()
      .text('🔄 Обновить', `dashboard:show:${eventId}`)
      .text('« Назад', 'admin:back');

    if (ctx.callbackQuery) {
      await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: keyboard });
    } else {
      await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard });
    }
  } catch (err) {
    console.error('Error in showDashboard:', err);
    await ctx.reply('❌ Ошибка при загрузке дашборда');
  }
}

export async function handleDashboardCallback(ctx: BotContext): Promise<void> {
  try {
    const data = ctx.callbackQuery?.data;
    if (!data) return;

    const parts = data.split(':');
    const action = parts[1];
    const eventId = parseInt(parts[2], 10);

    if (action === 'show') {
      // Check authorization
      if (!ctx.userId) {
        await ctx.answerCallbackQuery('⛔ Ошибка авторизации');
        return;
      }
      
      const { rows: userRoles } = await pool.query(
        'SELECT role FROM event_roles WHERE user_id = $1 AND event_id = $2',
        [ctx.userId, eventId]
      );
      
      if (!userRoles.some(r => r.role === 'organizer')) {
        await ctx.answerCallbackQuery('⛔ Нет доступа');
        return;
      }
      
      await showDashboard(ctx, eventId);
    }

    await ctx.answerCallbackQuery();
  } catch (err) {
    console.error('Error in handleDashboardCallback:', err);
    await ctx.answerCallbackQuery({ text: '❌ Ошибка' });
  }
}

function createProgressBar(percent: number, length: number = 10): string {
  const filled = Math.round((percent / 100) * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty) + ` ${percent}%`;
}
