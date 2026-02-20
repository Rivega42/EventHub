import { BotContext } from '../context';
import { BotError } from 'grammy';

export async function errorHandler(err: BotError<BotContext>): Promise<void> {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  console.error(err.error);

  try {
    await ctx.reply(
      '❌ Произошла ошибка. Пожалуйста, попробуйте позже или обратитесь к администратору.'
    );
  } catch (e) {
    console.error('Failed to send error message to user:', e);
  }
}
