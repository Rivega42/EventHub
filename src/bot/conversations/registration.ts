import { Conversation } from '@grammyjs/conversations';
import { BotContext } from '../context';
import { InlineKeyboard } from 'grammy';
import registrationService from '../../services/registration.service';
import paymentService from '../../services/payment.service';
import cardRotationService from '../../services/card-rotation.service';
import userService from '../../services/user.service';
import notificationService from '../../services/notification.service';
import ticketService from '../../services/ticket.service';
import pool from '../../db/pool';

export async function registrationConversation(
  conversation: Conversation<BotContext>,
  ctx: BotContext
): Promise<void> {
  const eventId = ctx.session.currentEventId;
  if (!eventId || !ctx.userId) {
    await ctx.reply('❌ Ошибка: мероприятие не выбрано');
    return;
  }

  // Check if already registered
  const existing = await registrationService.findByEventAndUser(eventId, ctx.userId);
  if (existing) {
    await ctx.reply('✅ Вы уже зарегистрированы на это мероприятие!');
    return;
  }

  // Step 1: Full name
  await ctx.reply('Как вас зовут? (Имя Фамилия)');
  const nameCtx = await conversation.waitFor('message:text');
  const fullName = nameCtx.message.text.trim();
  const [firstName, ...lastNameParts] = fullName.split(' ');
  const lastName = lastNameParts.join(' ');

  // Step 2: Email
  await ctx.reply('📧 Ваш email?');
  const emailCtx = await conversation.waitFor('message:text');
  const email = emailCtx.message.text.trim();

  // Step 3: Phone
  await ctx.reply('📱 Телефон?', {
    reply_markup: {
      keyboard: [[{ text: '📱 Поделиться контактом', request_contact: true }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });
  const phoneCtx = await conversation.waitFor(['message:contact', 'message:text']);
  const phone =
    phoneCtx.message.contact?.phone_number || phoneCtx.message.text?.trim() || '';

  // Step 4: Company (optional)
  const skipKeyboard = new InlineKeyboard().text('Пропустить', 'skip_company');
  await ctx.reply('🏢 Компания / Должность (или нажмите Пропустить)', {
    reply_markup: skipKeyboard,
  });
  const companyCtx = await conversation.waitFor(['message:text', 'callback_query:data']);
  const company =
    companyCtx.callbackQuery?.data === 'skip_company'
      ? null
      : companyCtx.message?.text?.trim() || null;

  // Update user info
  await userService.update(ctx.userId, {
    first_name: firstName,
    last_name: lastName,
    email,
    phone,
    company: company || undefined,
  });

  // Step 5: Select ticket type
  const { rows: ticketTypes } = await pool.query(
    `SELECT * FROM ticket_types 
     WHERE event_id = $1 AND is_active = TRUE
     ORDER BY sort_order, price`,
    [eventId]
  );

  if (ticketTypes.length === 0) {
    await ctx.reply('❌ Нет доступных типов билетов');
    return;
  }

  const ticketKeyboard = new InlineKeyboard();
  ticketTypes.forEach((tt: any) => {
    const label =
      tt.price > 0 ? `${tt.name} — ${tt.price} ₽` : `${tt.name} — Бесплатно`;
    ticketKeyboard.text(label, `ticket:${eventId}:${tt.id}`).row();
  });

  await ctx.reply('Выберите тип билета:', { reply_markup: ticketKeyboard });

  const ticketCtx = await conversation.waitFor('callback_query:data');
  const ticketData = ticketCtx.callbackQuery.data;
  const ticketTypeId = parseInt(ticketData.split(':')[2], 10);

  const selectedTicket = ticketTypes.find((tt: any) => tt.id === ticketTypeId);
  if (!selectedTicket) {
    await ctx.reply('❌ Некорректный билет');
    return;
  }

  // Create registration
  const registration = await registrationService.create({
    event_id: eventId,
    user_id: ctx.userId,
    ticket_type_id: ticketTypeId,
    reg_data: { fullName, email, phone, company },
  });

  // Notify organizers about new registration
  await conversation.external(async () => {
    await notificationService.notifyNewRegistration(ctx.api, eventId, registration.id);
  });

  // If free ticket, send QR immediately
  if (selectedTicket.price === 0) {
    await registrationService.updateStatus(registration.id, 'confirmed');
    await conversation.external(async () => {
      await ticketService.sendFreeTicket(ctx.api, registration.id);
    });
    await ctx.reply('✅ Вы зарегистрированы! Билет отправлен выше.');
    return;
  }

  // If paid ticket, show payment instructions
  const card = await cardRotationService.getNextCard(eventId, selectedTicket.price);
  const payment = await paymentService.create({
    registration_id: registration.id,
    card_id: card.id,
    amount: selectedTicket.price,
  });

  let paymentMsg = `💳 Переведите ${selectedTicket.price} ₽ по реквизитам:\n\n`;
  paymentMsg += `Карта: ${card.card_number}\n`;
  if (card.card_holder) paymentMsg += `Получатель: ${card.card_holder}\n`;
  if (card.bank_name) paymentMsg += `Банк: ${card.bank_name}\n`;
  if (card.phone_number) paymentMsg += `Или по СБП: ${card.phone_number}\n`;
  paymentMsg += `\nПосле перевода отправьте скриншот ⬇️`;

  await ctx.reply(paymentMsg);

  // Wait for screenshot
  const screenshotCtx = await conversation.waitFor('message:photo');
  const photo = screenshotCtx.message.photo?.pop();
  if (photo) {
    await paymentService.updateScreenshot(payment.id, photo.file_id);

    // Notify organizers about payment screenshot
    await conversation.external(async () => {
      await notificationService.notifyPaymentScreenshot(ctx.api, eventId, payment.id);
    });

    await ctx.reply(
      '✅ Скриншот получен! Ожидайте подтверждения (обычно 1-2 часа).\n\n' +
        'Вы получите уведомление, когда оплата будет подтверждена.'
    );
  }
}
