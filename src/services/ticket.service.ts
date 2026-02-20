import { Api, InputFile } from 'grammy';
import qrService from './qr.service';
import registrationService from './registration.service';

class TicketService {
  async sendTicket(api: Api, registrationId: number): Promise<void> {
    const reg = await registrationService.getWithDetails(registrationId);
    if (!reg) {
      throw new Error('Registration not found');
    }

    // Generate QR code image
    const qrBuffer = await qrService.generateQrImage(reg.qr_token);

    // Prepare caption
    const caption =
      `🎉 Ваш билет подтверждён!\n\n` +
      `📌 ${reg.event_title}\n` +
      `🎫 ${reg.ticket_type_name}\n` +
      `💰 ${reg.price} ₽\n\n` +
      `Покажите этот QR-код на входе`;

    // Send QR ticket as photo
    const userTelegramId = await this.getUserTelegramId(reg.user_id);
    if (!userTelegramId) {
      throw new Error('User telegram_id not found');
    }

    await api.sendPhoto(userTelegramId, new InputFile(qrBuffer, 'ticket.png'), {
      caption,
    });
  }

  private async getUserTelegramId(userId: number): Promise<number | null> {
    const pool = (await import('../db/pool')).default;
    const { rows } = await pool.query('SELECT telegram_id FROM users WHERE id = $1', [
      userId,
    ]);
    return rows[0]?.telegram_id || null;
  }

  async sendFreeTicket(api: Api, registrationId: number): Promise<void> {
    // For free tickets, send immediately after registration
    await this.sendTicket(api, registrationId);
  }
}

export default new TicketService();
