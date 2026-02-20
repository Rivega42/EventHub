import { BotContext } from '../context';
import { InlineKeyboard, InputFile } from 'grammy';
import exportService from '../../services/export.service';
import eventService from '../../services/event.service';
import pool from '../../db/pool';

export default async function exportHandler(ctx: BotContext): Promise<void> {
  try {
    if (!ctx.userId) {
      await ctx.reply('❌ Ошибка авторизации');
      return;
    }

    // Check if user is organizer
    const { rows: roles } = await pool.query(
      `SELECT DISTINCT event_id FROM event_roles WHERE user_id = $1 AND role = 'organizer'`,
      [ctx.userId]
    );

    if (roles.length === 0) {
      await ctx.reply('❌ У вас нет прав организатора');
      return;
    }

    // If user has multiple events, show selector
    if (roles.length > 1) {
      const keyboard = new InlineKeyboard();
      
      for (const role of roles) {
        const event = await eventService.findById(role.event_id);
        if (event) {
          keyboard.text(event.title, `export:select:${event.id}`).row();
        }
      }

      await ctx.reply('📊 Выберите мероприятие для экспорта:', { reply_markup: keyboard });
      return;
    }

    await generateExport(ctx, roles[0].event_id);
  } catch (err) {
    console.error('Error in exportHandler:', err);
    await ctx.reply('❌ Ошибка при экспорте данных');
  }
}

async function generateExport(ctx: BotContext, eventId: number): Promise<void> {
  try {
    const event = await eventService.findById(eventId);
    if (!event) {
      await ctx.reply('❌ Мероприятие не найдено');
      return;
    }

    await ctx.reply('📊 Генерирую Excel-файл...');

    const filepath = await exportService.generateExcel(eventId);

    await ctx.replyWithDocument(new InputFile(filepath), {
      caption: `📊 Экспорт данных: ${event.title}\n\nЛисты: Участники, Оплаты, Check-ins, Доклады`,
    });

    // Cleanup temp file
    await exportService.cleanup(filepath);
  } catch (err) {
    console.error('Error in generateExport:', err);
    await ctx.reply('❌ Ошибка при генерации файла');
  }
}

export async function handleExportCallback(ctx: BotContext): Promise<void> {
  try {
    const data = ctx.callbackQuery?.data;
    if (!data) return;

    const parts = data.split(':');
    const action = parts[1];
    const eventId = parseInt(parts[2], 10);

    if (action === 'select') {
      // Check authorization
      if (!ctx.userId) {
        await ctx.answerCallbackQuery('⛔ Ошибка авторизации');
        return;
      }
      
      const { rows: userRoles } = await pool.query(
        'SELECT role FROM event_roles WHERE user_id = $1 AND event_id = $2',
        [ctx.userId, eventId]
      );
      
      if (!userRoles.some(r => r.role === 'organizer')) {
        await ctx.answerCallbackQuery('⛔ Нет доступа');
        return;
      }
      
      await generateExport(ctx, eventId);
    }

    await ctx.answerCallbackQuery();
  } catch (err) {
    console.error('Error in handleExportCallback:', err);
    await ctx.answerCallbackQuery({ text: '❌ Ошибка' });
  }
}
