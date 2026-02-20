import { BotContext } from '../context';
import { InlineKeyboard } from 'grammy';
import eventService from '../../services/event.service';
import paymentService from '../../services/payment.service';
import pool from '../../db/pool';

export default async function adminHandler(ctx: BotContext): Promise<void> {
  if (!ctx.userId) {
    await ctx.reply('❌ Ошибка авторизации');
    return;
  }

  // Check if user has organizations
  const { rows: orgs } = await pool.query(
    `SELECT o.* FROM organizations o
     JOIN org_members om ON o.id = om.org_id
     WHERE om.user_id = $1`,
    [ctx.userId]
  );

  if (orgs.length === 0) {
    await ctx.reply(
      '❌ У вас нет прав администратора.\n\n' +
        'Для создания мероприятий обратитесь в поддержку.'
    );
    return;
  }

  const orgId = orgs[0].id;
  const events = await eventService.findByOrgId(orgId);

  if (events.length === 0) {
    const keyboard = new InlineKeyboard().text('+ Создать мероприятие', 'admin:create_event');
    await ctx.reply('📊 Админ-панель\n\nУ вас пока нет мероприятий.', {
      reply_markup: keyboard,
    });
    return;
  }

  const keyboard = new InlineKeyboard();
  events.forEach((event) => {
    keyboard.text(event.title, `admin:event:${event.id}`).row();
  });
  keyboard.text('+ Создать новое', 'admin:create_event');

  await ctx.reply('📊 Админ-панель\n\nВыберите мероприятие:', {
    reply_markup: keyboard,
  });
}

// Callback handlers for admin actions
export async function handleAdminCallback(ctx: BotContext): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data) return;

  const parts = data.split(':');
  const action = parts[1];

  if (action === 'event' && parts[2]) {
    const eventId = parseInt(parts[2], 10);
    await showEventDashboard(ctx, eventId);
  } else if (action === 'payments' && parts[2]) {
    const eventId = parseInt(parts[2], 10);
    await showPaymentQueue(ctx, eventId);
  } else if (action === 'confirm_pay' && parts[2]) {
    const paymentId = parseInt(parts[2], 10);
    await confirmPayment(ctx, paymentId);
  } else if (action === 'reject_pay' && parts[2]) {
    const paymentId = parseInt(parts[2], 10);
    await rejectPayment(ctx, paymentId);
  }

  await ctx.answerCallbackQuery();
}

async function showEventDashboard(ctx: BotContext, eventId: number): Promise<void> {
  const event = await eventService.findById(eventId);
  if (!event) {
    await ctx.reply('❌ Мероприятие не найдено');
    return;
  }

  const stats = await eventService.getStats(eventId);
  const cardStats = await paymentService.getCardStats(eventId);

  let message = `📊 ${event.title}\n\n`;
  message += `🎫 Регистраций: ${stats.total}\n`;
  message += `✅ Подтверждено: ${stats.confirmed}\n`;
  message += `🚶 Пришло: ${stats.checkedIn}\n\n`;

  if (cardStats.length > 0) {
    message += `💰 Деньги:\n`;
    cardStats.forEach((card) => {
      message += `  └ Карта *${card.card_number.slice(-4)}: ${card.total_amount} ₽ (${card.payment_count} оплат)\n`;
    });
  }

  const keyboard = new InlineKeyboard()
    .text('🎫 Билеты и оплаты', `admin:payments:${eventId}`)
    .row()
    .text('📋 Программа', `admin:schedule:${eventId}`)
    .text('💳 Карты оплаты', `admin:cards:${eventId}`)
    .row()
    .text('👥 Участники', `admin:registrations:${eventId}`)
    .text('📢 Рассылка', `admin:broadcast:${eventId}`)
    .row()
    .text('« Назад', 'admin:back');

  await ctx.editMessageText(message, { reply_markup: keyboard });
}

async function showPaymentQueue(ctx: BotContext, eventId: number): Promise<void> {
  const pending = await paymentService.findPendingByEvent(eventId);

  if (pending.length === 0) {
    await ctx.editMessageText('✅ Нет ожидающих подтверждения оплат', {
      reply_markup: new InlineKeyboard().text('« Назад', `admin:event:${eventId}`),
    });
    return;
  }

  const payment = pending[0];
  const keyboard = new InlineKeyboard()
    .text('✅ Подтвердить', `admin:confirm_pay:${payment.id}`)
    .text('❌ Отклонить', `admin:reject_pay:${payment.id}`)
    .row()
    .text(`Следующий (${pending.length - 1})`, `admin:payments:${eventId}`)
    .row()
    .text('« Назад', `admin:event:${eventId}`);

  await ctx.editMessageText(
    `💳 Ожидает подтверждения:\n\n` +
      `👤 ${payment.first_name} ${payment.last_name}\n` +
      `🎫 ${payment.ticket_type_name}\n` +
      `💰 ${payment.amount} ₽\n` +
      `💳 Карта *${payment.card_number?.slice(-4) || '????'}\n\n` +
      `Скриншот прикреплен ниже.`,
    { reply_markup: keyboard }
  );

  if (payment.screenshot_file_id) {
    await ctx.replyWithPhoto(payment.screenshot_file_id);
  }
}

async function confirmPayment(ctx: BotContext, paymentId: number): Promise<void> {
  if (!ctx.userId) return;

  await paymentService.confirm(paymentId, ctx.userId);
  await ctx.answerCallbackQuery({ text: '✅ Оплата подтверждена!' });

  // Notify user
  const payment = await paymentService.findById(paymentId);
  if (payment) {
    const { rows } = await pool.query(
      'SELECT u.telegram_id FROM users u JOIN registrations r ON u.id = r.user_id WHERE r.id = $1',
      [payment.registration_id]
    );
    if (rows[0]) {
      await ctx.api.sendMessage(
        rows[0].telegram_id,
        '🎉 Ваша оплата подтверждена! Билет готов.'
      );
    }
  }

  // Reload payment queue
  const { rows: eventRows } = await pool.query(
    'SELECT r.event_id FROM registrations r JOIN payments p ON r.id = p.registration_id WHERE p.id = $1',
    [paymentId]
  );
  if (eventRows[0]) {
    await showPaymentQueue(ctx, eventRows[0].event_id);
  }
}

async function rejectPayment(ctx: BotContext, paymentId: number): Promise<void> {
  await paymentService.reject(paymentId, 'Отклонено администратором');
  await ctx.answerCallbackQuery({ text: '❌ Оплата отклонена' });

  // Notify user
  const payment = await paymentService.findById(paymentId);
  if (payment) {
    const { rows } = await pool.query(
      'SELECT u.telegram_id FROM users u JOIN registrations r ON u.id = r.user_id WHERE r.id = $1',
      [payment.registration_id]
    );
    if (rows[0]) {
      await ctx.api.sendMessage(
        rows[0].telegram_id,
        '❌ Оплата отклонена. Попробуйте ещё раз или обратитесь в поддержку.'
      );
    }
  }

  // Reload payment queue
  const { rows: eventRows } = await pool.query(
    'SELECT r.event_id FROM registrations r JOIN payments p ON r.id = p.registration_id WHERE p.id = $1',
    [paymentId]
  );
  if (eventRows[0]) {
    await showPaymentQueue(ctx, eventRows[0].event_id);
  }
}
