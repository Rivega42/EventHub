import { BotContext } from '../context';
import { InlineKeyboard } from 'grammy';
import broadcastService, { BroadcastFilter } from '../../services/broadcast.service';
import eventService from '../../services/event.service';
import pool from '../../db/pool';

interface BroadcastSession {
  eventId: number;
  filter: BroadcastFilter;
  message?: string;
  recipientCount?: number;
}

// Temporary storage for broadcast sessions (in production, use Redis or DB)
const broadcastSessions = new Map<number, BroadcastSession>();

export default async function broadcastHandler(ctx: BotContext): Promise<void> {
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
          keyboard.text(event.title, `broadcast:select:${event.id}`).row();
        }
      }

      await ctx.reply('📢 Выберите мероприятие для рассылки:', { reply_markup: keyboard });
      return;
    }

    await startBroadcast(ctx, roles[0].event_id);
  } catch (err) {
    console.error('Error in broadcastHandler:', err);
    await ctx.reply('❌ Ошибка при создании рассылки');
  }
}

async function startBroadcast(ctx: BotContext, eventId: number): Promise<void> {
  if (!ctx.userId) return;

  // Initialize broadcast session
  broadcastSessions.set(ctx.userId, {
    eventId,
    filter: { eventId, status: 'all' },
  });

  await showFilterSelection(ctx, eventId);
}

async function showFilterSelection(ctx: BotContext, eventId: number): Promise<void> {
  const event = await eventService.findById(eventId);
  if (!event) {
    await ctx.reply('❌ Мероприятие не найдено');
    return;
  }

  // Get ticket types
  const { rows: ticketTypes } = await pool.query(
    `SELECT id, name FROM ticket_types WHERE event_id = $1 ORDER BY price ASC`,
    [eventId]
  );

  const keyboard = new InlineKeyboard()
    .text('📨 Всем участникам', `broadcast:filter:${eventId}:all`).row()
    .text('✅ Оплатившим', `broadcast:filter:${eventId}:confirmed`).row()
    .text('🚶 Отметившимся', `broadcast:filter:${eventId}:checked_in`).row();

  if (ticketTypes.length > 0) {
    keyboard.text('🎫 По типу билета', `broadcast:filter:${eventId}:ticket`).row();
  }

  keyboard.text('« Отмена', 'admin:back');

  const message = `📢 <b>Рассылка: ${event.title}</b>\n\nВыберите целевую аудиторию:`;

  if (ctx.callbackQuery) {
    await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: keyboard });
  } else {
    await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard });
  }
}

async function showTicketTypeSelection(ctx: BotContext, eventId: number): Promise<void> {
  const { rows: ticketTypes } = await pool.query(
    `SELECT id, name, COUNT(r.id) as registrations
     FROM ticket_types tt
     LEFT JOIN registrations r ON tt.id = r.ticket_type_id AND r.event_id = tt.event_id
     WHERE tt.event_id = $1
     GROUP BY tt.id, tt.name
     ORDER BY tt.price ASC`,
    [eventId]
  );

  const keyboard = new InlineKeyboard();
  
  ticketTypes.forEach(tt => {
    keyboard.text(`${tt.name} (${tt.registrations} чел.)`, `broadcast:ticket:${eventId}:${tt.id}`).row();
  });

  keyboard.text('« Назад', `broadcast:select:${eventId}`);

  await ctx.editMessageText('🎫 Выберите тип билета:', { reply_markup: keyboard });
}

async function requestBroadcastMessage(ctx: BotContext): Promise<void> {
  if (!ctx.userId) return;

  const session = broadcastSessions.get(ctx.userId);
  if (!session) {
    await ctx.reply('❌ Сессия рассылки не найдена. Начните заново: /broadcast');
    return;
  }

  const count = await broadcastService.getRecipientCount(session.filter);
  session.recipientCount = count;
  broadcastSessions.set(ctx.userId, session);

  await ctx.reply(
    `📝 Введите текст сообщения для рассылки.\n\n` +
    `Получателей: <b>${count}</b>\n\n` +
    `Поддерживается HTML-форматирование (<b>жирный</b>, <i>курсив</i>, <code>код</code>).\n\n` +
    `Отправьте /cancel для отмены.`,
    { parse_mode: 'HTML' }
  );
}

async function confirmBroadcast(ctx: BotContext, message: string): Promise<void> {
  if (!ctx.userId) return;

  const session = broadcastSessions.get(ctx.userId);
  if (!session) {
    await ctx.reply('❌ Сессия рассылки не найдена');
    return;
  }

  session.message = message;
  broadcastSessions.set(ctx.userId, session);

  const keyboard = new InlineKeyboard()
    .text('✅ Отправить', `broadcast:confirm:${session.eventId}`)
    .text('❌ Отмена', 'broadcast:cancel');

  await ctx.reply(
    `📢 <b>Подтверждение рассылки</b>\n\n` +
    `Получателей: <b>${session.recipientCount}</b>\n\n` +
    `<b>Сообщение:</b>\n${message}\n\n` +
    `Отправить?`,
    { parse_mode: 'HTML', reply_markup: keyboard }
  );
}

async function executeBroadcast(ctx: BotContext): Promise<void> {
  if (!ctx.userId) return;

  const session = broadcastSessions.get(ctx.userId);
  if (!session || !session.message) {
    await ctx.answerCallbackQuery({ text: '❌ Ошибка: сообщение не найдено' });
    return;
  }

  await ctx.editMessageText('📤 Начинаю рассылку...');
  await ctx.answerCallbackQuery();

  let lastUpdate = Date.now();
  const stats = await broadcastService.send(
    ctx.api,
    session.filter,
    session.message,
    async (sent, total) => {
      // Update progress every 2 seconds
      if (Date.now() - lastUpdate > 2000) {
        const percent = Math.round((sent / total) * 100);
        await ctx.editMessageText(
          `📤 Рассылка...\n\n` +
          `Отправлено: ${sent} / ${total} (${percent}%)\n` +
          createProgressBar(percent)
        ).catch(() => {});
        lastUpdate = Date.now();
      }
    }
  );

  // Clean up session
  broadcastSessions.delete(ctx.userId);

  let resultMessage = `✅ <b>Рассылка завершена!</b>\n\n`;
  resultMessage += `📨 Отправлено: ${stats.sent}\n`;
  
  if (stats.failed > 0) {
    resultMessage += `❌ Ошибок: ${stats.failed}\n\n`;
    
    if (stats.errors.length > 0) {
      resultMessage += `<b>Первые ошибки:</b>\n`;
      stats.errors.slice(0, 5).forEach(err => {
        resultMessage += `• ${err}\n`;
      });
    }
  }

  await ctx.editMessageText(resultMessage, { parse_mode: 'HTML' });
}

export async function handleBroadcastCallback(ctx: BotContext): Promise<void> {
  try {
    const data = ctx.callbackQuery?.data;
    if (!data) return;

    const parts = data.split(':');
    const action = parts[1];

    if (action === 'select') {
      const eventId = parseInt(parts[2], 10);
      await startBroadcast(ctx, eventId);
    } else if (action === 'filter') {
      const eventId = parseInt(parts[2], 10);
      const filterType = parts[3];

      if (!ctx.userId) return;

      const session = broadcastSessions.get(ctx.userId) || { eventId, filter: { eventId } };
      
      if (filterType === 'all') {
        session.filter = { eventId, status: 'all' };
      } else if (filterType === 'confirmed') {
        session.filter = { eventId, status: 'confirmed' };
      } else if (filterType === 'checked_in') {
        session.filter = { eventId, status: 'checked_in' };
      } else if (filterType === 'ticket') {
        await showTicketTypeSelection(ctx, eventId);
        await ctx.answerCallbackQuery();
        return;
      }

      broadcastSessions.set(ctx.userId, session);
      await requestBroadcastMessage(ctx);
    } else if (action === 'ticket') {
      const eventId = parseInt(parts[2], 10);
      const ticketTypeId = parseInt(parts[3], 10);

      if (!ctx.userId) return;

      const session = broadcastSessions.get(ctx.userId) || { eventId, filter: { eventId } };
      session.filter = { eventId, ticketTypeId };
      broadcastSessions.set(ctx.userId, session);

      await requestBroadcastMessage(ctx);
    } else if (action === 'confirm') {
      await executeBroadcast(ctx);
      return; // Don't answer callback query here, executeBroadcast handles it
    } else if (action === 'cancel') {
      if (ctx.userId) {
        broadcastSessions.delete(ctx.userId);
      }
      await ctx.editMessageText('❌ Рассылка отменена');
    }

    await ctx.answerCallbackQuery();
  } catch (err) {
    console.error('Error in handleBroadcastCallback:', err);
    await ctx.answerCallbackQuery({ text: '❌ Ошибка' });
  }
}

export async function handleBroadcastMessage(ctx: BotContext): Promise<boolean> {
  if (!ctx.userId || !ctx.message?.text) return false;

  const session = broadcastSessions.get(ctx.userId);
  if (!session || session.message) return false;

  // Check if this is a broadcast message input
  if (ctx.message.text === '/cancel') {
    broadcastSessions.delete(ctx.userId);
    await ctx.reply('❌ Рассылка отменена');
    return true;
  }

  await confirmBroadcast(ctx, ctx.message.text);
  return true;
}

function createProgressBar(percent: number, length: number = 10): string {
  const filled = Math.round((percent / 100) * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty) + ` ${percent}%`;
}
