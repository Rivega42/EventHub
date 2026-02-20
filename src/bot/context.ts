import { Context, SessionFlavor } from 'grammy';
import { ConversationFlavor } from '@grammyjs/conversations';

export interface SessionData {
  currentEventId?: number;
  currentEventSlug?: string;
  registrationStep?: string;
  paymentId?: number;
  pendingFeedback?: {
    sessionId: number;
    rating: number;
  };
  surveyState?: {
    eventId: number;
    overallRating?: number;
    bestSessionId?: number | null;
    improvement?: string | null;
  };
  awaitingImprovement?: boolean;
}

export type BotContext = Context & SessionFlavor<SessionData> & ConversationFlavor & {
  userId?: number;
  telegramId: number;
};
