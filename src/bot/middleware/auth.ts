import { BotContext } from '../context';
import { NextFunction } from 'grammy';
import userService from '../../services/user.service';

export async function authMiddleware(ctx: BotContext, next: NextFunction): Promise<void> {
  if (!ctx.from) {
    return;
  }

  ctx.telegramId = ctx.from.id;

  // Get or create user
  const user = await userService.getOrCreate({
    telegram_id: ctx.from.id,
    telegram_username: ctx.from.username,
    first_name: ctx.from.first_name,
    last_name: ctx.from.last_name,
  });

  ctx.userId = user.id;

  await next();
}
