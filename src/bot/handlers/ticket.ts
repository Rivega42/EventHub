import { BotContext } from '../context';
import { InlineKeyboard, InputFile } from 'grammy';
import registrationService from '../../services/registration.service';
import qrService from '../../services/qr.service';

export async function handleMyTicket(ctx: BotContext): Promise<void> {
  if (!ctx.userId) {
    await ctx.reply('❌ Ошибка авторизации');
    return;
  }

  const eventId = ctx.session.currentEventId;
  if (!eventId) {
    await ctx.reply('❌ Выберите мероприятие сначала');
    return;
  }

  const registration = await registrationService.findByEventAndUser(eventId, ctx.userId);

  if (!registration) {
    await ctx.reply('❌ Вы не зарегистрированы на это мероприятие');
    return;
  }

  if (registration.status !== 'confirmed' && registration.status !== 'checked_in') {
    let message = '⏳ Ваша регистрация в обработке\n\n';

    if (registration.status === 'pending') {
      message += 'Статус: Ожидает выбора типа билета';
    } else if (registration.status === 'awaiting_payment') {
      message += 'Статус: Ожидает оплаты';
    } else if (registration.status === 'payment_review') {
      message += 'Статус: Оплата на проверке у организатора';
    }

    await ctx.reply(message);
    return;
  }

  // Get registration details
  const regDetails = await registrationService.getWithDetails(registration.id);

  // Generate QR code
  const qrBuffer = await qrService.generateQrImage(registration.qr_token);

  const caption =
    `🎫 Ваш билет\n\n` +
    `📌 ${regDetails.event_title}\n` +
    `🎫 ${regDetails.ticket_type_name}\n` +
    `👤 ${regDetails.first_name} ${regDetails.last_name}\n\n` +
    `${registration.status === 'checked_in' ? '✅ Вы уже отметились на мероприятии' : 'Покажите этот QR-код на входе'}`;

  await ctx.replyWithPhoto(new InputFile(qrBuffer, 'ticket.png'), {
    caption,
  });
}

export async function handleTicketCallback(ctx: BotContext): Promise<void> {
  try {
    const data = ctx.callbackQuery?.data;
    if (!data) return;

    const parts = data.split(':');
    const action = parts[0];
    const ticketTypeId = parts.length > 1 ? parseInt(parts[1], 10) : undefined;

    if (action === 'select_ticket' && ticketTypeId) {
      await handleTicketSelection(ctx, ticketTypeId);
    }

    await ctx.answerCallbackQuery();
  } catch (err) {
    console.error('Error in handleTicketCallback:', err);
    await ctx.answerCallbackQuery({ text: '❌ Ошибка' });
  }
}

async function handleTicketSelection(ctx: BotContext, ticketTypeId: number): Promise<void> {
  try {
    // This will be handled by registration conversation
    // Store selected ticket in session
    ctx.session.registrationStep = `ticket_selected:${ticketTypeId}`;

    const keyboard = new InlineKeyboard().text('✅ Подтвердить выбор', 'confirm_ticket');

    await ctx.editMessageText('Подтвердите выбор билета:', {
      reply_markup: keyboard,
    });
  } catch (err) {
    console.error('Error in handleTicketSelection:', err);
    await ctx.reply('❌ Ошибка при выборе билета');
  }
}
