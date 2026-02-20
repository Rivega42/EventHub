import { BotContext } from '../context';
import jsQR from 'jsqr';
import sharp from 'sharp';
import qrService from '../../services/qr.service';
import registrationService from '../../services/registration.service';
import checkinService from '../../services/checkin.service';
import pool from '../../db/pool';

export default async function scannerHandler(ctx: BotContext): Promise<void> {
  if (!ctx.userId) {
    await ctx.reply('❌ Ошибка авторизации');
    return;
  }

  // Check if user is volunteer/organizer
  const hasAccess = await checkScannerAccess(ctx.userId);
  if (!hasAccess) {
    await ctx.reply('❌ У вас нет доступа к сканеру.\n\nОбратитесь к организатору мероприятия.');
    return;
  }

  // Get active events for this volunteer
  const events = await getVolunteerEvents(ctx.userId);

  if (events.length === 0) {
    await ctx.reply('❌ У вас нет активных мероприятий.\n\nОбратитесь к организатору.');
    return;
  }

  // If multiple events, ask to select
  if (events.length > 1) {
    const keyboard = new (await import('grammy')).InlineKeyboard();
    events.forEach((event: any) => {
      keyboard.text(event.title, `scan_event:${event.id}`).row();
    });

    await ctx.reply('Выберите мероприятие для сканирования:', {
      reply_markup: keyboard,
    });
    return;
  }

  // Single event - proceed with PIN check
  await startPinCheck(ctx, events[0].id);
}

export async function startPinCheck(ctx: BotContext, eventId: number): Promise<void> {
  const eventPinService = (await import('../../services/event-pin.service')).default;
  const hasPin = await eventPinService.hasPin(eventId);

  if (!hasPin) {
    // No PIN required, start scanning
    ctx.session.currentEventId = eventId;
    ctx.session.registrationStep = 'scanning';
    await ctx.reply(
      '📷 QR-сканер активирован\n\n' +
        'Отправьте фото QR-кода билета.\n\n' +
        'Для выхода используйте /cancel'
    );
    return;
  }

  // Ask for PIN
  ctx.session.currentEventId = eventId;
  ctx.session.registrationStep = 'awaiting_pin';
  await ctx.reply('🔑 Введите PIN для начала сканирования:');
}

async function checkScannerAccess(userId: number): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM event_roles 
     WHERE user_id = $1 AND role IN ('organizer', 'volunteer')
     LIMIT 1`,
    [userId]
  );
  return rows.length > 0;
}

async function getVolunteerEvents(userId: number): Promise<any[]> {
  const { rows } = await pool.query(
    `SELECT DISTINCT e.* FROM events e
     JOIN event_roles er ON e.id = er.event_id
     WHERE er.user_id = $1 
     AND er.role IN ('organizer', 'volunteer')
     AND e.status IN ('published', 'ongoing')
     ORDER BY e.starts_at DESC`,
    [userId]
  );
  return rows;
}

export async function handlePinInput(ctx: BotContext): Promise<void> {
  if (ctx.session.registrationStep !== 'awaiting_pin' || !ctx.message?.text) return;

  const eventId = ctx.session.currentEventId;
  if (!eventId) return;

  const pin = ctx.message.text.trim();
  const eventPinService = (await import('../../services/event-pin.service')).default;

  const isValid = await eventPinService.verifyPin(eventId, pin);

  if (!isValid) {
    await ctx.reply('❌ Неверный PIN. Попробуйте ещё раз или используйте /cancel');
    return;
  }

  // PIN correct, activate scanner
  ctx.session.registrationStep = 'scanning';
  await ctx.reply(
    '✅ PIN принят!\n\n' +
      '📷 QR-сканер активирован\n\n' +
      'Отправьте фото QR-кода билета.\n\n' +
      'Для выхода используйте /cancel'
  );
}

export async function handleScanPhoto(ctx: BotContext): Promise<void> {
  if (!ctx.message?.photo) return;

  // Only process if in scanning mode
  if (ctx.session.registrationStep !== 'scanning') return;

  const photo = ctx.message.photo[ctx.message.photo.length - 1]; // Largest resolution
  const file = await ctx.api.getFile(photo.file_id);
  const filePath = file.file_path;

  if (!filePath) {
    await ctx.reply('❌ Не удалось получить файл');
    return;
  }

  try {
    // Download file
    const url = `https://api.telegram.org/file/bot${ctx.api.token}/${filePath}`;
    const response = await fetch(url);
    const buffer = Buffer.from(await response.arrayBuffer());

    // Convert to raw pixel data
    const { data, info } = await sharp(buffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Decode QR code
    const qr = jsQR(new Uint8ClampedArray(data), info.width, info.height);

    if (!qr) {
      await ctx.reply('❌ QR-код не распознан\n\nПопробуйте сделать фото чётче или ближе к коду.');
      return;
    }

    // Verify QR payload
    const result = qrService.verifyPayload(qr.data);
    if (!result.valid || !result.qrToken) {
      await ctx.reply('❌ НЕДЕЙСТВИТЕЛЬНЫЙ БИЛЕТ\n\nQR-код не прошёл верификацию.');
      return;
    }

    // Find registration
    const reg = await registrationService.findByQrToken(result.qrToken);
    if (!reg) {
      await ctx.reply('❌ БИЛЕТ НЕ НАЙДЕН\n\nРегистрация не найдена в системе.');
      return;
    }

    // Check if registration is confirmed
    if (reg.status !== 'confirmed' && reg.status !== 'checked_in') {
      await ctx.reply(
        `⚠️ БИЛЕТ НЕ ПОДТВЕРЖДЁН\n\n` +
          `Статус: ${reg.status}\n` +
          `Этот билет не был подтверждён организатором.`
      );
      return;
    }

    // Get registration details
    const regDetails = await registrationService.getWithDetails(reg.id);

    // Check if already checked in
    const existingCheckin = await checkinService.findByRegistration(reg.id);
    if (existingCheckin) {
      const time = existingCheckin.scanned_at.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      });
      await ctx.reply(
        `⚠️ ПОВТОРНЫЙ ВХОД\n\n` +
          `👤 ${regDetails.first_name} ${regDetails.last_name}\n` +
          `🎫 ${regDetails.ticket_type_name}\n` +
          `⏰ Уже прошёл в ${time}`
      );
      return;
    }

    // Create check-in
    await checkinService.create(reg.id, ctx.userId!);

    // Success
    await ctx.reply(
      `✅ ПРОПУСТИТЬ\n\n` +
        `👤 ${regDetails.first_name} ${regDetails.last_name}\n` +
        `🎫 ${regDetails.ticket_type_name}\n` +
        `🏢 ${regDetails.company || 'Не указано'}\n\n` +
        `Добро пожаловать на ${regDetails.event_title}!`
    );
  } catch (error) {
    console.error('Scanner error:', error);
    await ctx.reply('❌ Ошибка при обработке QR-кода. Попробуйте ещё раз.');
  }
}
