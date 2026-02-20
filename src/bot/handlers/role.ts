import { BotContext } from '../context';
import { InlineKeyboard } from 'grammy';
import eventService from '../../services/event.service';
import pool from '../../db/pool';

export default async function roleHandler(ctx: BotContext): Promise<void> {
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
          keyboard.text(event.title, `role:select:${event.id}`).row();
        }
      }

      await ctx.reply('👥 Выберите мероприятие для управления ролями:', { reply_markup: keyboard });
      return;
    }

    await showRoleManagement(ctx, roles[0].event_id);
  } catch (err) {
    console.error('Error in roleHandler:', err);
    await ctx.reply('❌ Ошибка при управлении ролями');
  }
}

async function showRoleManagement(ctx: BotContext, eventId: number): Promise<void> {
  try {
    const event = await eventService.findById(eventId);
    if (!event) {
      await ctx.reply('❌ Мероприятие не найдено');
      return;
    }

    // Get current roles
    const { rows: roleList } = await pool.query(
      `SELECT er.id, er.role, u.first_name, u.last_name, u.telegram_id, u.username
       FROM event_roles er
       JOIN users u ON er.user_id = u.id
       WHERE er.event_id = $1
       ORDER BY er.role, u.first_name`,
      [eventId]
    );

    let message = `👥 <b>${event.title}</b>\n<b>Управление ролями</b>\n\n`;

    // Group by role
    const roleGroups: Record<string, any[]> = {
      organizer: [],
      volunteer: [],
      speaker: [],
    };

    roleList.forEach(r => {
      if (roleGroups[r.role]) {
        roleGroups[r.role].push(r);
      }
    });

    const roleLabels: Record<string, string> = {
      organizer: '👑 Организаторы',
      volunteer: '🎯 Волонтёры',
      speaker: '🎤 Спикеры',
    };

    Object.entries(roleGroups).forEach(([role, users]) => {
      message += `<b>${roleLabels[role]}:</b>\n`;
      
      if (users.length === 0) {
        message += `  Нет пользователей\n`;
      } else {
        users.forEach(u => {
          const username = u.username ? `@${u.username}` : `ID:${u.telegram_id}`;
          message += `  • ${u.first_name} ${u.last_name} (${username})\n`;
        });
      }
      message += '\n';
    });

    message += `\nИспользуйте /role add @username role для добавления роли\n`;
    message += `Пример: /role add @username volunteer\n\n`;
    message += `Доступные роли: organizer, volunteer, speaker`;

    const keyboard = new InlineKeyboard()
      .text('🔄 Обновить', `role:select:${eventId}`)
      .text('« Назад', 'admin:back');

    if (ctx.callbackQuery) {
      await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: keyboard });
    } else {
      await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard });
    }
  } catch (err) {
    console.error('Error in showRoleManagement:', err);
    await ctx.reply('❌ Ошибка при загрузке списка ролей');
  }
}

export async function handleRoleCallback(ctx: BotContext): Promise<void> {
  try {
    const data = ctx.callbackQuery?.data;
    if (!data) return;

    const parts = data.split(':');
    const action = parts[1];
    const eventId = parseInt(parts[2], 10);

    if (action === 'select') {
      await showRoleManagement(ctx, eventId);
    }

    await ctx.answerCallbackQuery();
  } catch (err) {
    console.error('Error in handleRoleCallback:', err);
    await ctx.answerCallbackQuery({ text: '❌ Ошибка' });
  }
}

export async function handleRoleCommand(ctx: BotContext): Promise<void> {
  try {
    if (!ctx.userId || !ctx.message?.text) return;

    const parts = ctx.message.text.split(' ').filter(p => p.length > 0);
    
    // /role add @username role
    if (parts.length < 4 || parts[1] !== 'add') {
      await ctx.reply(
        '❌ Неверный формат команды\n\n' +
        'Использование: /role add @username role\n' +
        'Пример: /role add @username volunteer\n\n' +
        'Доступные роли: organizer, volunteer, speaker'
      );
      return;
    }

    const usernameOrId = parts[2];
    const role = parts[3];

    // Validate role
    if (!['organizer', 'volunteer', 'speaker'].includes(role)) {
      await ctx.reply('❌ Неверная роль. Доступные: organizer, volunteer, speaker');
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

    // For now, use first event
    const eventId = roles[0].event_id;

    // Find target user
    let targetUserId: number | null = null;

    if (usernameOrId.startsWith('@')) {
      const username = usernameOrId.slice(1);
      const { rows: userRows } = await pool.query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );
      
      if (userRows.length === 0) {
        await ctx.reply(`❌ Пользователь ${usernameOrId} не найден`);
        return;
      }
      
      targetUserId = userRows[0].id;
    } else {
      // Try as telegram_id
      const telegramId = usernameOrId.replace(/[^0-9]/g, '');
      const { rows: userRows } = await pool.query(
        'SELECT id FROM users WHERE telegram_id = $1',
        [telegramId]
      );
      
      if (userRows.length === 0) {
        await ctx.reply(`❌ Пользователь с ID ${telegramId} не найден`);
        return;
      }
      
      targetUserId = userRows[0].id;
    }

    // Add role
    await pool.query(
      `INSERT INTO event_roles (event_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (event_id, user_id, role) DO NOTHING`,
      [eventId, targetUserId, role]
    );

    await ctx.reply(
      `✅ Роль <b>${role}</b> назначена пользователю ${usernameOrId}`,
      { parse_mode: 'HTML' }
    );

    // Notify target user
    const { rows: targetUser } = await pool.query(
      'SELECT telegram_id FROM users WHERE id = $1',
      [targetUserId]
    );

    if (targetUser.length > 0) {
      const event = await eventService.findById(eventId);
      const roleLabels: Record<string, string> = {
        organizer: 'Организатор',
        volunteer: 'Волонтёр',
        speaker: 'Спикер',
      };

      await ctx.api.sendMessage(
        targetUser[0].telegram_id,
        `🎉 Вам назначена роль <b>${roleLabels[role]}</b> на мероприятии "${event?.title}"\n\n` +
        (role === 'volunteer' ? 'Теперь вам доступна команда /scan для check-in участников' : '') +
        (role === 'speaker' ? 'Теперь вы можете просматривать список записавшихся на ваш доклад' : ''),
        { parse_mode: 'HTML' }
      );
    }
  } catch (err) {
    console.error('Error in handleRoleCommand:', err);
    await ctx.reply('❌ Ошибка при назначении роли');
  }
}
