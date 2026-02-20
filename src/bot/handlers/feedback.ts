import { BotContext } from '../context';
import { InlineKeyboard } from 'grammy';
import feedbackService from '../../services/feedback.service';
import sessionService from '../../services/session.service';

export async function handleFeedbackCallback(ctx: BotContext): Promise<void> {
  try {
    if (!ctx.callbackQuery?.data) return;
    
    const parts = ctx.callbackQuery.data.split(':');
    const action = parts[1];

    if (action === 'rate') {
      const sessionId = parseInt(parts[2], 10);
      await showRatingButtons(ctx, sessionId);
    } else if (action === 'rating') {
      const sessionId = parseInt(parts[2], 10);
      const rating = parseInt(parts[3], 10);
      await handleRatingSubmit(ctx, sessionId, rating);
    } else if (action === 'add_comment') {
      await ctx.editMessageText(
        '💬 Напишите ваш комментарий к докладу:',
        { parse_mode: 'HTML' }
      );
      // Feedback will be handled by handleFeedbackCommentMessage
    } else if (action === 'skip_comment') {
      const sessionId = parseInt(parts[2], 10);
      await finalizeFeedback(ctx, sessionId, null);
    } else if (action === 'view') {
      const sessionId = parseInt(parts[2], 10);
      await showSessionFeedback(ctx, sessionId);
    } else if (action === 'dismiss') {
      await ctx.deleteMessage();
    }

    await ctx.answerCallbackQuery();
  } catch (err) {
    console.error('Error in handleFeedbackCallback:', err);
    await ctx.answerCallbackQuery({ text: '❌ Ошибка' });
  }
}

async function showRatingButtons(ctx: BotContext, sessionId: number): Promise<void> {
  const session = await sessionService.findById(sessionId);
  if (!session) {
    await ctx.reply('❌ Доклад не найден');
    return;
  }

  const keyboard = new InlineKeyboard();
  for (let i = 5; i >= 1; i--) {
    const stars = '⭐️'.repeat(i);
    keyboard.text(stars, `feedback:rating:${sessionId}:${i}`).row();
  }

  await ctx.reply(
    `📊 <b>Оцените доклад</b>\n\n` +
    `<b>${session.title}</b>\n` +
    (session.speaker_name ? `👤 ${session.speaker_name}\n\n` : '\n') +
    `Как бы вы оценили этот доклад?`,
    { parse_mode: 'HTML', reply_markup: keyboard }
  );
}

async function handleRatingSubmit(
  ctx: BotContext,
  sessionId: number,
  rating: number
): Promise<void> {
  if (!ctx.userId) {
    await ctx.reply('❌ Ошибка авторизации');
    return;
  }

  // Store rating temporarily in session
  ctx.session.pendingFeedback = { sessionId, rating };

  const keyboard = new InlineKeyboard()
    .text('💬 Добавить комментарий', `feedback:add_comment:${sessionId}`)
    .text('➡️ Пропустить', `feedback:skip_comment:${sessionId}`);

  await ctx.editMessageText(
    `✅ Спасибо за оценку: ${'⭐️'.repeat(rating)}\n\n` +
    `Хотите добавить комментарий?`,
    { reply_markup: keyboard }
  );
}

export async function handleFeedbackCommentMessage(ctx: BotContext): Promise<void> {
  if (!ctx.userId || !ctx.session.pendingFeedback || !ctx.message?.text) {
    return;
  }

  const { sessionId, rating } = ctx.session.pendingFeedback;
  const comment = ctx.message.text;

  await finalizeFeedback(ctx, sessionId, comment, rating);
  
  // Clear pending feedback
  delete ctx.session.pendingFeedback;
}

async function finalizeFeedback(
  ctx: BotContext,
  sessionId: number,
  comment: string | null,
  rating?: number
): Promise<void> {
  if (!ctx.userId) {
    await ctx.reply('❌ Ошибка авторизации');
    return;
  }

  // Get rating from pending or parameter
  const finalRating = rating || ctx.session.pendingFeedback?.rating;
  if (!finalRating) {
    await ctx.reply('❌ Ошибка: рейтинг не найден');
    return;
  }

  try {
    await feedbackService.createOrUpdate(
      ctx.userId,
      sessionId,
      finalRating,
      comment || undefined
    );

    const session = await sessionService.findById(sessionId);
    const stats = await feedbackService.getSessionStats(sessionId);

    await ctx.reply(
      `✅ <b>Ваш отзыв сохранён!</b>\n\n` +
      `${session?.title}\n` +
      `Ваша оценка: ${'⭐️'.repeat(finalRating)}\n\n` +
      `📊 Средний рейтинг: ${stats.averageRating.toFixed(1)} (${stats.totalCount} отзывов)`,
      { parse_mode: 'HTML' }
    );

    // Clear pending feedback
    delete ctx.session.pendingFeedback;
  } catch (err) {
    console.error('Error saving feedback:', err);
    await ctx.reply('❌ Ошибка при сохранении отзыва');
  }
}

async function showSessionFeedback(ctx: BotContext, sessionId: number): Promise<void> {
  try {
    const session = await sessionService.findById(sessionId);
    const stats = await feedbackService.getSessionStats(sessionId);

    if (!session) {
      await ctx.reply('❌ Доклад не найден');
      return;
    }

    let message = `📊 <b>Отзывы о докладе</b>\n\n`;
    message += `<b>${session.title}</b>\n`;
    if (session.speaker_name) {
      message += `👤 ${session.speaker_name}\n`;
    }
    message += `\n`;

    if (stats.totalCount === 0) {
      message += `Пока нет отзывов`;
    } else {
      message += `⭐️ <b>${stats.averageRating.toFixed(1)}</b> / 5.0\n`;
      message += `📝 Всего отзывов: ${stats.totalCount}\n\n`;
      message += `Распределение оценок:\n`;
      for (let i = 5; i >= 1; i--) {
        const count = stats.ratingDistribution[i as keyof typeof stats.ratingDistribution];
        const bar = '█'.repeat(Math.round((count / stats.totalCount) * 10));
        message += `${'⭐️'.repeat(i)} ${bar} ${count}\n`;
      }
    }

    await ctx.reply(message, { parse_mode: 'HTML' });
  } catch (err) {
    console.error('Error showing feedback:', err);
    await ctx.reply('❌ Ошибка при загрузке отзывов');
  }
}

// Helper to prompt feedback after session ends
export async function promptSessionFeedback(
  ctx: BotContext,
  sessionId: number
): Promise<void> {
  const session = await sessionService.findById(sessionId);
  if (!session) return;

  const keyboard = new InlineKeyboard()
    .text('⭐️ Оценить доклад', `feedback:rate:${sessionId}`)
    .row()
    .text('❌ Не сейчас', 'feedback:dismiss');

  await ctx.reply(
    `📊 Доклад завершился!\n\n` +
    `<b>${session.title}</b>\n` +
    (session.speaker_name ? `👤 ${session.speaker_name}\n\n` : '\n') +
    `Поделитесь вашим мнением!`,
    { parse_mode: 'HTML', reply_markup: keyboard }
  );
}
