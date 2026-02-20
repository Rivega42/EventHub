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
import { handleFeedbackCallback, handleFeedbackCommentMessage } from './handlers/feedback';
import surveyHandler, { handleSurveyCallback, handleSurveyImprovementMessage } from './handlers/survey';
import mapHandler, { handleMapCallback } from './handlers/map';

// Services
import schedulerService from '../services/scheduler.service';

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
bot.command('survey', surveyHandler);
bot.command('map', mapHandler);
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
  ctx.session.pendingFeedback = undefined;
  ctx.session.surveyState = undefined;
  ctx.session.awaitingImprovement = false;
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
      '/survey - Итоговый опрос\n' +
      '/map - Схема площадки\n' +
      '/help - Справка'
  );
});

// Callback query handlers
bot.callbackQuery(/^reg:/, async (ctx) => {
  try {
    const eventId = parseInt(ctx.callbackQuery.data.split(':')[1], 10);
    ctx.session.currentEventId = eventId;
    await ctx.conversation.enter('registrationConversation');
  } catch (err) {
    console.error('Registration callback error:', err);
    await ctx.answerCallbackQuery('❌ Произошла ошибка').catch(() => {});
  }
});

bot.callbackQuery(/^admin:/, async (ctx) => {
  try {
    const { handleAdminCallback } = await import('./handlers/admin');
    await handleAdminCallback(ctx);
  } catch (err) {
    console.error('Admin callback error:', err);
    await ctx.answerCallbackQuery('❌ Произошла ошибка').catch(() => {});
  }
});

bot.callbackQuery(/^schedule:/, async (ctx) => {
  try {
    await handleScheduleCallback(ctx);
  } catch (err) {
    console.error('Schedule callback error:', err);
    await ctx.answerCallbackQuery('❌ Произошла ошибка').catch(() => {});
  }
});

bot.callbackQuery(/^dashboard:/, async (ctx) => {
  try {
    await handleDashboardCallback(ctx);
  } catch (err) {
    console.error('Dashboard callback error:', err);
    await ctx.answerCallbackQuery('❌ Произошла ошибка').catch(() => {});
  }
});

bot.callbackQuery(/^broadcast:/, async (ctx) => {
  try {
    await handleBroadcastCallback(ctx);
  } catch (err) {
    console.error('Broadcast callback error:', err);
    await ctx.answerCallbackQuery('❌ Произошла ошибка').catch(() => {});
  }
});

bot.callbackQuery(/^export:/, async (ctx) => {
  try {
    await handleExportCallback(ctx);
  } catch (err) {
    console.error('Export callback error:', err);
    await ctx.answerCallbackQuery('❌ Произошла ошибка').catch(() => {});
  }
});

bot.callbackQuery(/^role:/, async (ctx) => {
  try {
    await handleRoleCallback(ctx);
  } catch (err) {
    console.error('Role callback error:', err);
    await ctx.answerCallbackQuery('❌ Произошла ошибка').catch(() => {});
  }
});

bot.callbackQuery(/^feedback:/, async (ctx) => {
  try {
    await handleFeedbackCallback(ctx);
  } catch (err) {
    console.error('Feedback callback error:', err);
    await ctx.answerCallbackQuery('❌ Произошла ошибка').catch(() => {});
  }
});

bot.callbackQuery(/^survey:/, async (ctx) => {
  try {
    await handleSurveyCallback(ctx);
  } catch (err) {
    console.error('Survey callback error:', err);
    await ctx.answerCallbackQuery('❌ Произошла ошибка').catch(() => {});
  }
});

bot.callbackQuery(/^map:/, async (ctx) => {
  try {
    await handleMapCallback(ctx);
  } catch (err) {
    console.error('Map callback error:', err);
    await ctx.answerCallbackQuery('❌ Произошла ошибка').catch(() => {});
  }
});

bot.callbackQuery(/^event:/, async (ctx) => {
  try {
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
  } catch (err) {
    console.error('Event callback error:', err);
    await ctx.answerCallbackQuery('❌ Произошла ошибка').catch(() => {});
  }
});

bot.callbackQuery(/^myticket:/, async (ctx) => {
  try {
    const eventId = parseInt(ctx.callbackQuery.data.split(':')[1], 10);
    ctx.session.currentEventId = eventId;
    await handleMyTicket(ctx);
    await ctx.answerCallbackQuery();
  } catch (err) {
    console.error('MyTicket callback error:', err);
    await ctx.answerCallbackQuery('❌ Произошла ошибка').catch(() => {});
  }
});

bot.callbackQuery(/^select_ticket:/, async (ctx) => {
  try {
    await handleTicketCallback(ctx);
  } catch (err) {
    console.error('Select ticket callback error:', err);
    await ctx.answerCallbackQuery('❌ Произошла ошибка').catch(() => {});
  }
});

bot.callbackQuery(/^confirm_ticket$/, async (ctx) => {
  try {
    await handleTicketCallback(ctx);
  } catch (err) {
    console.error('Confirm ticket callback error:', err);
    await ctx.answerCallbackQuery('❌ Произошла ошибка').catch(() => {});
  }
});

bot.callbackQuery(/^scan_event:/, async (ctx) => {
  try {
    const eventId = parseInt(ctx.callbackQuery.data.split(':')[1], 10);
    const { startPinCheck } = await import('./handlers/scanner');
    // @ts-ignore
    await startPinCheck(ctx, eventId);
    await ctx.answerCallbackQuery();
  } catch (err) {
    console.error('Scan event callback error:', err);
    await ctx.answerCallbackQuery('❌ Произошла ошибка').catch(() => {});
  }
});

// Handle photos in scanning mode
bot.on('message:photo', handleScanPhoto);

// Handle text messages (PIN input, broadcast messages, etc.)
bot.on('message:text', async (ctx) => {
  // Try different handlers in order
  
  // 1. Survey improvement
  if (ctx.session.awaitingImprovement) {
    await handleSurveyImprovementMessage(ctx);
    return;
  }
  
  // 2. Feedback comment (when pendingFeedback exists and callback is 'add_comment')
  if (ctx.session.pendingFeedback) {
    await handleFeedbackCommentMessage(ctx);
    return;
  }
  
  // 3. Broadcast message
  const handled = await handleBroadcastMessage(ctx);
  if (!handled) {
    // 4. Fall back to PIN input handler
    await handlePinInput(ctx);
  }
});

// Error handler (must be after all handlers)
bot.catch(errorHandler);

// Initialize scheduler service
schedulerService.initialize(bot);

export default bot;
