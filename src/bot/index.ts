import { Bot, session } from 'grammy';
import { conversations, createConversation } from '@grammyjs/conversations';
import { BotContext } from './context';
import config from '../config';

// Handlers
import startHandler from './handlers/start';
import adminHandler from './handlers/admin';

// Conversations
import { registrationConversation } from './conversations/registration';

// Middleware
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error';

const bot = new Bot<BotContext>(config.telegram.botToken);

// Session
bot.use(
  session({
    initial: () => ({
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
bot.command('help', (ctx) => {
  ctx.reply(
    '🤖 EventHub Bot\n\n' +
      '/start - Главное меню\n' +
      '/admin - Админ-панель\n' +
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

// Error handler (must be after all handlers)
bot.catch(errorHandler);

export default bot;
