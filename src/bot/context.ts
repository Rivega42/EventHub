import { Context, SessionFlavor } from 'grammy';
import { ConversationFlavor } from '@grammyjs/conversations';

export interface SessionData {
  currentEventId?: number;
  currentEventSlug?: string;
  registrationStep?: string;
  paymentId?: number;
}

export type BotContext = Context & SessionFlavor<SessionData> & ConversationFlavor & {
  userId?: number;
  telegramId: number;
};
