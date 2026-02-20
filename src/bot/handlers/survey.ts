import { BotContext } from '../context';
import { InlineKeyboard } from 'grammy';
import surveyService from '../../services/survey.service';
import eventService from '../../services/event.service';
import sessionService from '../../services/session.service';
import registrationService from '../../services/registration.service';

export default async function surveyHandler(ctx: BotContext): Promise<void> {
  try {
    if (!ctx.userId) {
      await ctx.reply('❌ Ошибка авторизации');
      return;
    }

    // Get user's events
    const registrations = await registrationService.findByUserId(ctx.userId);
    
    if (registrations.length === 0) {
      await ctx.reply('❌ Вы не зарегистрированы ни на одно мероприятие');
      return;
    }

    const events = await Promise.all(
      registrations.map((r: any) => eventService.findById(r.event_id))
    );

    const validEvents = events.filter((e: any) => e !== null) as any[];

    if (validEvents.length === 0) {
      await ctx.reply('❌ Нет доступных мероприятий для опроса');
      return;
    }

    if (validEvents.length === 1) {
      await startSurvey(ctx, validEvents[0].id);
    } else {
      const keyboard = new InlineKeyboard();
      validEvents.forEach(event => {
        keyboard.text(event.title, `survey:select:${event.id}`).row();
      });
      
      await ctx.reply(
        '📋 <b>Итоговый опрос</b>\n\nВыберите мероприятие:',
        { parse_mode: 'HTML', reply_markup: keyboard }
      );
    }
  } catch (err) {
    console.error('Error in surveyHandler:', err);
    await ctx.reply('❌ Ошибка при загрузке опроса');
  }
}

export async function handleSurveyCallback(ctx: BotContext): Promise<void> {
  try {
    if (!ctx.callbackQuery?.data) return;
    
    const parts = ctx.callbackQuery.data.split(':');
    const action = parts[1];

    if (action === 'select') {
      const eventId = parseInt(parts[2], 10);
      await startSurvey(ctx, eventId);
    } else if (action === 'rating') {
      const eventId = parseInt(parts[2], 10);
      const rating = parseInt(parts[3], 10);
      await handleOverallRating(ctx, eventId, rating);
    } else if (action === 'best_session') {
      const eventId = parseInt(parts[2], 10);
      const sessionId = parts[3] === 'none' ? null : parseInt(parts[3], 10);
      await handleBestSession(ctx, eventId, sessionId);
    } else if (action === 'recommend') {
      const eventId = parseInt(parts[2], 10);
      const recommend = parts[3] === 'yes';
      await handleRecommendation(ctx, eventId, recommend);
    } else if (action === 'skip_improvement') {
      const eventId = parseInt(parts[2], 10);
      await finalizeAndAskRecommendation(ctx, eventId, null);
    } else if (action === 'results') {
      const eventId = parseInt(parts[2], 10);
      await showSurveyResults(ctx, eventId);
    }

    await ctx.answerCallbackQuery();
  } catch (err) {
    console.error('Error in handleSurveyCallback:', err);
    await ctx.answerCallbackQuery({ text: '❌ Ошибка' });
  }
}

async function startSurvey(ctx: BotContext, eventId: number): Promise<void> {
  const event = await eventService.findById(eventId);
  if (!event) {
    await ctx.reply('❌ Мероприятие не найдено');
    return;
  }

  // Check if already submitted
  const existing = await surveyService.findByEventAndUser(eventId, ctx.userId!);
  if (existing) {
    await ctx.reply(
      '✅ Вы уже прошли этот опрос!\n\n' +
      'Хотите изменить ответы? Просто начните опрос заново.'
    );
  }

  // Initialize survey state
  ctx.session.surveyState = { eventId };

  const keyboard = new InlineKeyboard();
  for (let i = 5; i >= 1; i--) {
    keyboard.text(`${i} ${'⭐️'.repeat(i)}`, `survey:rating:${eventId}:${i}`).row();
  }

  await ctx.reply(
    `📋 <b>Итоговый опрос</b>\n\n` +
    `<b>${event.title}</b>\n\n` +
    `<b>Вопрос 1/4:</b> Как бы вы оценили мероприятие в целом?`,
    { parse_mode: 'HTML', reply_markup: keyboard }
  );
}

async function handleOverallRating(
  ctx: BotContext,
  eventId: number,
  rating: number
): Promise<void> {
  if (!ctx.session.surveyState) {
    ctx.session.surveyState = { eventId };
  }
  
  ctx.session.surveyState.overallRating = rating;

  // Ask for best session
  const sessions = await sessionService.findByEventId(eventId);
  
  if (sessions.length === 0) {
    // Skip to improvement question
    await askImprovement(ctx, eventId);
    return;
  }

  const keyboard = new InlineKeyboard();
  sessions.slice(0, 10).forEach(session => {
    const title = session.title.length > 50 
      ? session.title.substring(0, 47) + '...' 
      : session.title;
    keyboard.text(title, `survey:best_session:${eventId}:${session.id}`).row();
  });
  keyboard.text('❌ Не хочу выбирать', `survey:best_session:${eventId}:none`);

  await ctx.editMessageText(
    `✅ Оценка: ${'⭐️'.repeat(rating)}\n\n` +
    `<b>Вопрос 2/4:</b> Какой доклад вам понравился больше всего?`,
    { parse_mode: 'HTML', reply_markup: keyboard }
  );
}

async function handleBestSession(
  ctx: BotContext,
  eventId: number,
  sessionId: number | null
): Promise<void> {
  if (!ctx.session.surveyState) {
    await ctx.reply('❌ Ошибка: состояние опроса не найдено');
    return;
  }

  ctx.session.surveyState.bestSessionId = sessionId;

  await askImprovement(ctx, eventId);
}

async function askImprovement(ctx: BotContext, eventId: number): Promise<void> {
  const keyboard = new InlineKeyboard()
    .text('➡️ Пропустить', `survey:skip_improvement:${eventId}`);

  await ctx.editMessageText(
    `<b>Вопрос 3/4:</b> Что можно улучшить в следующий раз?\n\n` +
    `Напишите ваши пожелания или нажмите "Пропустить"`,
    { parse_mode: 'HTML', reply_markup: keyboard }
  );

  // Set flag to expect improvement message
  ctx.session.awaitingImprovement = true;
}

export async function handleSurveyImprovementMessage(ctx: BotContext): Promise<void> {
  if (!ctx.userId || !ctx.session.awaitingImprovement || !ctx.message?.text) {
    return;
  }

  const improvement = ctx.message.text;
  const eventId = ctx.session.surveyState?.eventId;

  if (!eventId) {
    await ctx.reply('❌ Ошибка: мероприятие не найдено');
    return;
  }

  await finalizeAndAskRecommendation(ctx, eventId, improvement);
  
  ctx.session.awaitingImprovement = false;
}

async function finalizeAndAskRecommendation(
  ctx: BotContext,
  eventId: number,
  improvement: string | null
): Promise<void> {
  if (!ctx.session.surveyState) {
    await ctx.reply('❌ Ошибка: состояние опроса не найдено');
    return;
  }

  ctx.session.surveyState.improvement = improvement;

  const keyboard = new InlineKeyboard()
    .text('✅ Да, порекомендую', `survey:recommend:${eventId}:yes`)
    .row()
    .text('❌ Нет, не буду', `survey:recommend:${eventId}:no`);

  await ctx.reply(
    `<b>Вопрос 4/4:</b> Порекомендуете ли вы это мероприятие коллегам?`,
    { parse_mode: 'HTML', reply_markup: keyboard }
  );
}

async function handleRecommendation(
  ctx: BotContext,
  eventId: number,
  recommend: boolean
): Promise<void> {
  if (!ctx.userId || !ctx.session.surveyState) {
    await ctx.reply('❌ Ошибка: состояние опроса не найдено');
    return;
  }

  const { overallRating, bestSessionId, improvement } = ctx.session.surveyState;

  if (!overallRating) {
    await ctx.reply('❌ Ошибка: отсутствует общая оценка');
    return;
  }

  try {
    await surveyService.create(
      eventId,
      ctx.userId,
      overallRating,
      bestSessionId || null,
      improvement || null,
      recommend
    );

    await ctx.editMessageText(
      `✅ <b>Спасибо за участие в опросе!</b>\n\n` +
      `Ваши ответы помогут нам сделать следующие мероприятия ещё лучше.`,
      { parse_mode: 'HTML' }
    );

    // Clear survey state
    delete ctx.session.surveyState;
    delete ctx.session.awaitingImprovement;
  } catch (err) {
    console.error('Error saving survey:', err);
    await ctx.reply('❌ Ошибка при сохранении опроса');
  }
}

async function showSurveyResults(ctx: BotContext, eventId: number): Promise<void> {
  try {
    const event = await eventService.findById(eventId);
    const stats = await surveyService.getEventStats(eventId);

    if (!event) {
      await ctx.reply('❌ Мероприятие не найдено');
      return;
    }

    let message = `📊 <b>Результаты опроса</b>\n\n`;
    message += `<b>${event.title}</b>\n\n`;

    if (stats.totalResponses === 0) {
      message += `Пока нет ответов`;
    } else {
      message += `📝 Всего ответов: ${stats.totalResponses}\n\n`;
      message += `⭐️ Средняя оценка: <b>${stats.averageRating.toFixed(1)}</b> / 5.0\n`;
      message += `👍 Порекомендуют: <b>${stats.recommendPercentage}%</b>\n\n`;

      if (stats.topSessions.length > 0) {
        message += `<b>Лучшие доклады:</b>\n`;
        stats.topSessions.forEach((session, idx) => {
          message += `${idx + 1}. ${session.title} (${session.votes} голосов)\n`;
        });
      }
    }

    await ctx.reply(message, { parse_mode: 'HTML' });
  } catch (err) {
    console.error('Error showing survey results:', err);
    await ctx.reply('❌ Ошибка при загрузке результатов');
  }
}
