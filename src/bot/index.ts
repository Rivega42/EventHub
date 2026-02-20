import { Bot, session } from 'grammy';
import { conversations, createConversation } from '@grammyjs/conversations';
import { BotContext, SessionData } from './context';
import config from '../config';

// Handlers
import startHandler from './handlers/start';
import adminHandler from './handlers/admin';
import scannerHandler, { handleScanPhoto, handlePinInput } from './handlers/scanner';
import { handleMyTicket, handleTicketCallback } from './handlers/ticket';
import scheduleHandler, { handleScheduleCallback } from './handlers/schedule';
import dashboardHandler, { handleDashboardCallback } from './handlers/dashboard';
import broadcastHandler, { handleBroadcastCallback, handleBroadcastMessage } from './handlers/broadcast';
import exportHandler, { handleExportCallback } from './handlers/export';
import roleHandler, { handleRoleCallback, handleRoleCommand } from './handlers/role';

// Conversations
import { registrationConversation } from './conversations/registration';

// Middleware
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error';

const bot = new Bot<BotContext>(config.telegram.botToken);

// Session
bot.use(
  session({
    initial: (): SessionData => ({
      currentEventId: undefined,
      currentEventSlug: undefined,
      registrationStep: undefined,
      paymentId: undefined,
    }),
  })
);

// Conversations plugin
bot.use(conversations());

// Auth middleware
bot.use(authMiddleware);

// Register conversations
bot.use(createConversation(registrationConversation));

// Commands
bot.command('start', startHandler);
bot.command('admin', adminHandler);
bot.command('scan', scannerHandler);
bot.command('schedule', scheduleHandler);
bot.command('dashboard', dashboardHandler);
bot.command('broadcast', broadcastHandler);
bot.command('export', exportHandler);
bot.command('role', async (ctx) => {
  // Check if it's a role command with params (e.g., /role add @user role)
  if (ctx.message?.text && ctx.message.text.split(' ').length > 2) {
    await handleRoleCommand(ctx);
  } else {
    await roleHandler(ctx);
  }
});
bot.command('cancel', async (ctx) => {
  ctx.session.registrationStep = undefined;
  await ctx.reply('❌ Операция отменена');
});
bot.command('help', (ctx) => {
  ctx.reply(
    '🤖 EventHub Bot\n\n' +
      '/start - Главное меню\n' +
      '/admin - Админ-панель\n' +
      '/schedule - Программа мероприятия\n' +
      '/dashboard - Дашборд организатора\n' +
      '/broadcast - Рассылка участникам\n' +
      '/export - Экспорт данных\n' +
      '/role - Управление ролями\n' +
      '/scan - QR-сканер (для волонтёров)\n' +
      '/help - Справка'
  );
});

// Callback query handlers
bot.callbackQuery(/^reg:/, async (ctx) => {
  const eventId = parseInt(ctx.callbackQuery.data.split(':')[1], 10);
  ctx.session.currentEventId = eventId;
  await ctx.conversation.enter('registrationConversation');
});

bot.callbackQuery(/^admin:/, async (ctx) => {
  const { handleAdminCallback } = await import('./handlers/admin');
  await handleAdminCallback(ctx);
});

bot.callbackQuery(/^schedule:/, handleScheduleCallback);
bot.callbackQuery(/^dashboard:/, handleDashboardCallback);
bot.callbackQuery(/^broadcast:/, handleBroadcastCallback);
bot.callbackQuery(/^export:/, handleExportCallback);
bot.callbackQuery(/^role:/, handleRoleCallback);

bot.callbackQuery(/^event:/, async (ctx) => {
  const eventId = parseInt(ctx.callbackQuery.data.split(':')[1], 10);
  const event = await import('../services/event.service').then((m) =>
    m.default.findById(eventId)
  );
  if (event) {
    ctx.session.currentEventId = event.id;
    ctx.session.currentEventSlug = event.slug;

    const { InlineKeyboard } = await import('grammy');
    const keyboard = new InlineKeyboard()
      .text('📝 Зарегистрироваться', `reg:${event.id}`)
      .row()
      .text('📋 Программа', `schedule:${event.id}`)
      .text('🎫 Мой билет', `myticket:${event.id}`);

    await ctx.editMessageText(
      `🎉 ${event.title}\n\n` +
        `${event.description || ''}\n\n` +
        `📍 ${event.venue || 'Место уточняется'}\n` +
        `📅 ${event.starts_at.toLocaleString('ru-RU')}`,
      { reply_markup: keyboard }
    );
  }
  await ctx.answerCallbackQuery();
});

bot.callbackQuery(/^myticket:/, async (ctx) => {
  const eventId = parseInt(ctx.callbackQuery.data.split(':')[1], 10);
  ctx.session.currentEventId = eventId;
  await handleMyTicket(ctx);
  await ctx.answerCallbackQuery();
});

bot.callbackQuery(/^select_ticket:/, handleTicketCallback);
bot.callbackQuery(/^confirm_ticket$/, handleTicketCallback);

bot.callbackQuery(/^scan_event:/, async (ctx) => {
  const eventId = parseInt(ctx.callbackQuery.data.split(':')[1], 10);
  const { startPinCheck } = await import('./handlers/scanner');
  // @ts-ignore
  await startPinCheck(ctx, eventId);
  await ctx.answerCallbackQuery();
});

// Handle photos in scanning mode
bot.on('message:photo', handleScanPhoto);

// Handle text messages (PIN input, broadcast messages, etc.)
bot.on('message:text', async (ctx) => {
  // Try broadcast message handler first
  const handled = await handleBroadcastMessage(ctx);
  if (!handled) {
    // Fall back to PIN input handler
    await handlePinInput(ctx);
  }
});

// Error handler (must be after all handlers)
bot.catch(errorHandler);

export default bot;
