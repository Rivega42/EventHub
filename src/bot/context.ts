import { Context } from 'grammy';
import { ConversationFlavor } from '@grammyjs/conversations';

export interface SessionData {
  currentEventId?: number;
  currentEventSlug?: string;
  registrationStep?: string;
  paymentId?: number;
}

export interface BotContext extends Context, ConversationFlavor {
  session: SessionData;
  userId?: number;
  telegramId: number;
}
