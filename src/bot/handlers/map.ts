import { BotContext } from '../context';
import { InlineKeyboard, InputFile } from 'grammy';
import eventService from '../../services/event.service';
import sessionService from '../../services/session.service';
import fs from 'fs';
import path from 'path';

export default async function mapHandler(ctx: BotContext): Promise<void> {
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
          keyboard.text(event.title, `map:select:${event.id}`).row();
        });
        
        await ctx.reply('📍 Выберите мероприятие:', { reply_markup: keyboard });
        return;
      }
    }

    await showMap(ctx, ctx.session.currentEventId);
  } catch (err) {
    console.error('Error in mapHandler:', err);
    await ctx.reply('❌ Ошибка при загрузке карты');
  }
}

export async function handleMapCallback(ctx: BotContext): Promise<void> {
  try {
    if (!ctx.callbackQuery?.data) return;
    
    const parts = ctx.callbackQuery.data.split(':');
    const action = parts[1];

    if (action === 'select') {
      const eventId = parseInt(parts[2], 10);
      await showMap(ctx, eventId);
    } else if (action === 'locations') {
      const eventId = parseInt(parts[2], 10);
      await showLocations(ctx, eventId);
    }

    await ctx.answerCallbackQuery();
  } catch (err) {
    console.error('Error in handleMapCallback:', err);
    await ctx.answerCallbackQuery({ text: '❌ Ошибка' });
  }
}

async function showMap(ctx: BotContext, eventId: number): Promise<void> {
  try {
    const event = await eventService.findById(eventId);
    if (!event) {
      await ctx.reply('❌ Мероприятие не найдено');
      return;
    }

    const venueMapUrl = event.venue_map_url || 
                       (event.settings as any)?.venue_map_url;

    if (!venueMapUrl) {
      await ctx.reply(
        `📍 <b>${event.title}</b>\n\n` +
        (event.venue ? `📍 ${event.venue}\n\n` : '') +
        `Схема площадки пока не загружена.`,
        { parse_mode: 'HTML' }
      );
      return;
    }

    const keyboard = new InlineKeyboard()
      .text('📋 Список локаций', `map:locations:${eventId}`);

    // Check if it's a local file or URL
    if (venueMapUrl.startsWith('http://') || venueMapUrl.startsWith('https://')) {
      // Send as URL
      await ctx.replyWithPhoto(venueMapUrl, {
        caption: `📍 <b>Схема площадки</b>\n\n<b>${event.title}</b>`,
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    } else {
      // Send as local file
      const filePath = path.isAbsolute(venueMapUrl) 
        ? venueMapUrl 
        : path.join(process.cwd(), venueMapUrl);

      if (!fs.existsSync(filePath)) {
        await ctx.reply('❌ Файл схемы не найден');
        return;
      }

      await ctx.replyWithPhoto(new InputFile(filePath), {
        caption: `📍 <b>Схема площадки</b>\n\n<b>${event.title}</b>`,
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    }
  } catch (err) {
    console.error('Error showing map:', err);
    await ctx.reply('❌ Ошибка при загрузке схемы площадки');
  }
}

async function showLocations(ctx: BotContext, eventId: number): Promise<void> {
  try {
    const event = await eventService.findById(eventId);
    if (!event) {
      await ctx.reply('❌ Мероприятие не найдено');
      return;
    }

    const sessions = await sessionService.findByEventId(eventId);
    
    // Group sessions by location
    const locationMap = new Map<string, any[]>();
    
    sessions.forEach(session => {
      const location = session.location || 'Не указано';
      if (!locationMap.has(location)) {
        locationMap.set(location, []);
      }
      locationMap.get(location)!.push(session);
    });

    let message = `📍 <b>Локации и залы</b>\n\n<b>${event.title}</b>\n\n`;

    if (locationMap.size === 0) {
      message += 'Локации пока не добавлены';
    } else {
      for (const [location, locationSessions] of locationMap.entries()) {
        message += `📌 <b>${location}</b>\n`;
        message += `   ${locationSessions.length} доклад(ов)\n\n`;
      }

      // Add directions from event settings if available
      const directions = (event.settings as any)?.venue_directions;
      if (directions && typeof directions === 'object') {
        message += `<b>Как пройти:</b>\n`;
        for (const [loc, dir] of Object.entries(directions)) {
          if (typeof dir === 'string') {
            message += `\n📍 ${loc}:\n${dir}\n`;
          }
        }
      }
    }

    await ctx.reply(message, { parse_mode: 'HTML' });
  } catch (err) {
    console.error('Error showing locations:', err);
    await ctx.reply('❌ Ошибка при загрузке локаций');
  }
}
