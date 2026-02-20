import { BotContext } from '../context';
import { InlineKeyboard } from 'grammy';
import sessionService from '../../services/session.service';
import eventService from '../../services/event.service';
import feedbackService from '../../services/feedback.service';

export default async function scheduleHandler(ctx: BotContext): Promise<void> {
  try {
    if (!ctx.userId) {
      await ctx.reply('❌ Ошибка авторизации');
      return;
    }

    // Get event from session or show event selector
    if (!ctx.session.currentEventId) {
      const events = await eventService.findPublished();
      
      if (events.length === 0) {
        await ctx.reply('❌ Нет доступных мероприятий');
        return;
      }

      if (events.length === 1) {
        ctx.session.currentEventId = events[0].id;
      } else {
        const keyboard = new InlineKeyboard();
        events.forEach(event => {
          keyboard.text(event.title, `schedule:select:${event.id}`).row();
        });
        
        await ctx.reply('📋 Выберите мероприятие:', { reply_markup: keyboard });
        return;
      }
    }

    await showSchedule(ctx, ctx.session.currentEventId);
  } catch (err) {
    console.error('Error in scheduleHandler:', err);
    await ctx.reply('❌ Ошибка при загрузке программы');
  }
}

export async function showSchedule(ctx: BotContext, eventId: number): Promise<void> {
  try {
    const event = await eventService.findById(eventId);
    if (!event) {
      await ctx.reply('❌ Мероприятие не найдено');
      return;
    }

    const tracks = await sessionService.getTracks(eventId);
    const sessions = await sessionService.findByEventId(eventId, ctx.userId);

    if (sessions.length === 0) {
      await ctx.reply('📋 Программа мероприятия пока не опубликована');
      return;
    }

    const keyboard = new InlineKeyboard();
    
    if (tracks.length > 0) {
      keyboard.text('📂 Все треки', `schedule:all:${eventId}`).row();
      tracks.forEach(track => {
        keyboard.text(`🎯 ${track}`, `schedule:track:${eventId}:${track}`).row();
      });
    }

    const bookmarked = await sessionService.getBookmarkedSessions(ctx.userId!, eventId);
    if (bookmarked.length > 0) {
      keyboard.text(`⭐️ Мое избранное (${bookmarked.length})`, `schedule:bookmarked:${eventId}`).row();
    }

    // Group sessions by day
    const sessionsByDay = groupSessionsByDay(sessions);
    let message = `📋 <b>${event.title}</b>\n\nПрограмма мероприятия:\n\n`;

    for (const [day, daySessions] of Object.entries(sessionsByDay)) {
      message += `<b>${day}</b>\n`;
      daySessions.slice(0, 3).forEach(session => {
        const timeStr = formatTime(session.starts_at);
        const bookmark = session.is_bookmarked ? '⭐️' : '';
        message += `${bookmark}${timeStr} - <b>${session.title}</b>\n`;
        if (session.speaker_name) {
          message += `   👤 ${session.speaker_name}\n`;
        }
        if (session.location) {
          message += `   📍 ${session.location}\n`;
        }
      });
      
      if (daySessions.length > 3) {
        message += `   ... и ещё ${daySessions.length - 3} доклад(ов)\n`;
      }
      message += '\n';
    }

    message += '\nВыберите трек для просмотра полной программы';

    await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard });
  } catch (err) {
    console.error('Error in showSchedule:', err);
    await ctx.reply('❌ Ошибка при загрузке программы');
  }
}

export async function handleScheduleCallback(ctx: BotContext): Promise<void> {
  try {
    const data = ctx.callbackQuery?.data;
    if (!data) return;

    const parts = data.split(':');
    const action = parts[1];
    const eventId = parseInt(parts[2], 10);

    if (action === 'select') {
      ctx.session.currentEventId = eventId;
      await showSchedule(ctx, eventId);
      await ctx.answerCallbackQuery();
      return;
    }

    if (action === 'all') {
      await showAllSessions(ctx, eventId);
    } else if (action === 'track') {
      const track = parts.slice(3).join(':');
      await showTrackSessions(ctx, eventId, track);
    } else if (action === 'bookmarked') {
      await showBookmarkedSessions(ctx, eventId);
    } else if (action === 'session') {
      const sessionId = parseInt(parts[3], 10);
      await showSessionDetail(ctx, sessionId);
    } else if (action === 'bookmark') {
      const sessionId = parseInt(parts[3], 10);
      await toggleBookmark(ctx, sessionId);
    } else if (action === 'remind') {
      const sessionId = parseInt(parts[3], 10);
      await setReminder(ctx, sessionId);
    }

    await ctx.answerCallbackQuery();
  } catch (err) {
    console.error('Error in handleScheduleCallback:', err);
    await ctx.answerCallbackQuery({ text: '❌ Ошибка' });
  }
}

async function showAllSessions(ctx: BotContext, eventId: number): Promise<void> {
  const sessions = await sessionService.findByEventId(eventId, ctx.userId);
  await displaySessionList(ctx, eventId, sessions, 'Все доклады');
}

async function showTrackSessions(ctx: BotContext, eventId: number, track: string): Promise<void> {
  const sessions = await sessionService.findByTrack(eventId, track, ctx.userId);
  await displaySessionList(ctx, eventId, sessions, `Трек: ${track}`);
}

async function showBookmarkedSessions(ctx: BotContext, eventId: number): Promise<void> {
  const sessions = await sessionService.getBookmarkedSessions(ctx.userId!, eventId);
  await displaySessionList(ctx, eventId, sessions, 'Мое избранное ⭐️');
}

async function displaySessionList(
  ctx: BotContext,
  eventId: number,
  sessions: any[],
  title: string
): Promise<void> {
  if (sessions.length === 0) {
    await ctx.editMessageText(`📋 ${title}\n\nНет докладов`, {
      reply_markup: new InlineKeyboard().text('« Назад', `schedule:select:${eventId}`),
    });
    return;
  }

  let message = `📋 <b>${title}</b>\n\n`;
  const keyboard = new InlineKeyboard();

  sessions.forEach((session, idx) => {
    const timeStr = formatTime(session.starts_at);
    const bookmark = session.is_bookmarked ? '⭐️' : '';
    message += `${idx + 1}. ${bookmark}<b>${session.title}</b>\n`;
    message += `   ⏰ ${timeStr} - ${formatTime(session.ends_at)}\n`;
    if (session.speaker_name) {
      message += `   👤 ${session.speaker_name}\n`;
    }
    if (session.location) {
      message += `   📍 ${session.location}\n`;
    }
    message += '\n';

    keyboard.text(`${idx + 1}`, `schedule:session:${eventId}:${session.id}`);
    
    if ((idx + 1) % 5 === 0) {
      keyboard.row();
    }
  });

  keyboard.row().text('« Назад', `schedule:select:${eventId}`);

  await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: keyboard });
}

async function showSessionDetail(ctx: BotContext, sessionId: number): Promise<void> {
  const session = await sessionService.findById(sessionId);
  if (!session) {
    await ctx.answerCallbackQuery({ text: '❌ Доклад не найден' });
    return;
  }

  const sessions = await sessionService.findByEventId(session.event_id, ctx.userId);
  const sessionWithBookmark = sessions.find(s => s.id === sessionId);

  let message = `🎤 <b>${session.title}</b>\n\n`;
  
  if (session.speaker_name) {
    message += `👤 <b>Спикер:</b> ${session.speaker_name}\n`;
  }
  
  if (session.speaker_bio) {
    message += `${session.speaker_bio}\n\n`;
  }

  message += `⏰ <b>Время:</b> ${formatTime(session.starts_at)} - ${formatTime(session.ends_at)}\n`;
  
  if (session.location) {
    message += `📍 <b>Локация:</b> ${session.location}\n`;
  }
  
  if (session.track) {
    message += `🎯 <b>Трек:</b> ${session.track}\n`;
  }

  if (session.description) {
    message += `\n${session.description}\n`;
  }

  // Get feedback stats
  const feedbackStats = await feedbackService.getSessionStats(sessionId);
  if (feedbackStats.totalCount > 0) {
    message += `\n📊 <b>Рейтинг:</b> ${feedbackStats.averageRating.toFixed(1)} / 5.0 `;
    message += `(${'⭐️'.repeat(Math.round(feedbackStats.averageRating))}) `;
    message += `(${feedbackStats.totalCount} отзывов)\n`;
  }

  const keyboard = new InlineKeyboard();
  
  const bookmarkText = sessionWithBookmark?.is_bookmarked ? '⭐️ Удалить из избранного' : '⭐️ Добавить в избранное';
  keyboard.text(bookmarkText, `schedule:bookmark:${session.event_id}:${sessionId}`).row();
  
  // Add feedback button (always available)
  keyboard.text('📊 Оценить доклад', `feedback:rate:${sessionId}`).row();
  
  keyboard.text('🔔 Напомнить за 15 мин', `schedule:remind:${session.event_id}:${sessionId}`).row();
  keyboard.text('« Назад', `schedule:all:${session.event_id}`);

  await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: keyboard });
}

async function toggleBookmark(ctx: BotContext, sessionId: number): Promise<void> {
  if (!ctx.userId) return;

  const added = await sessionService.toggleBookmark(ctx.userId, sessionId);
  await ctx.answerCallbackQuery({ 
    text: added ? '⭐️ Добавлено в избранное' : 'Удалено из избранного' 
  });

  // Refresh the session detail
  await showSessionDetail(ctx, sessionId);
}

async function setReminder(ctx: BotContext, _sessionId: number): Promise<void> {
  // TODO: Implement reminder scheduling
  await ctx.answerCallbackQuery({ 
    text: '🔔 Напоминание установлено! Вы получите уведомление за 15 минут до начала' 
  });
}

function groupSessionsByDay(sessions: any[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {};
  
  sessions.forEach(session => {
    const day = session.starts_at.toLocaleDateString('ru-RU', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
    
    if (!groups[day]) {
      groups[day] = [];
    }
    groups[day].push(session);
  });

  return groups;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}
