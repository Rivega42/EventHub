import { BotContext } from '../context';
import { InlineKeyboard } from 'grammy';
import eventService from '../../services/event.service';

export default async function startHandler(ctx: BotContext): Promise<void> {
  const payload = ctx.match; // Deep link parameter

  // If deep link with event slug
  if (payload && typeof payload === 'string') {
    const event = await eventService.findBySlug(payload);
    if (event) {
      ctx.session.currentEventId = event.id;
      ctx.session.currentEventSlug = event.slug;

      const keyboard = new InlineKeyboard()
        .text('📝 Зарегистрироваться', `reg:${event.id}`)
        .row()
        .text('📋 Программа', `schedule:${event.id}`)
        .text('🎫 Мой билет', `myticket:${event.id}`);

      await ctx.reply(
        `🎉 ${event.title}\n\n` +
          `${event.description || ''}\n\n` +
          `📍 ${event.venue || 'Место уточняется'}\n` +
          `📅 ${event.starts_at.toLocaleString('ru-RU')}`,
        { reply_markup: keyboard }
      );
      return;
    }
  }

  // Show list of published events
  const events = await eventService.findPublished();

  if (events.length === 0) {
    await ctx.reply(
      '👋 Добро пожаловать в EventHub!\n\n' +
        'На данный момент нет доступных мероприятий.\n' +
        'Следите за обновлениями!'
    );
    return;
  }

  const keyboard = new InlineKeyboard();
  events.slice(0, 10).forEach((event) => {
    keyboard.text(event.title, `event:${event.id}`).row();
  });

  await ctx.reply(
    '👋 Добро пожаловать в EventHub!\n\n' +
      'Выберите мероприятие:',
    { reply_markup: keyboard }
  );
}
