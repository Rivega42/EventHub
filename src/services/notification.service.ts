import { Api } from 'grammy';
import pool from '../db/pool';

class NotificationService {
  private lastNotificationTime: Map<number, number> = new Map();
  private readonly RATE_LIMIT_MS = 1000; // 1 second between notifications per organizer
  /**
   * Notify organizers about new registration
   */
  async notifyNewRegistration(api: Api, eventId: number, registrationId: number): Promise<void> {
    const organizers = await this.getEventOrganizers(eventId);
    const regDetails = await this.getRegistrationDetails(registrationId);

    if (!regDetails) return;

    const message =
      `🆕 Новая регистрация!\n\n` +
      `📌 ${regDetails.event_title}\n` +
      `👤 ${regDetails.first_name} ${regDetails.last_name}\n` +
      `🎫 ${regDetails.ticket_type_name} (${regDetails.price} ₽)\n` +
      `📧 ${regDetails.email}\n` +
      `📱 ${regDetails.phone}\n` +
      `🏢 ${regDetails.company || 'Не указано'}`;

    await this.sendToOrganizers(api, organizers, message);
  }

  /**
   * Notify organizers about payment screenshot
   */
  async notifyPaymentScreenshot(
    api: Api,
    eventId: number,
    paymentId: number
  ): Promise<void> {
    const organizers = await this.getEventOrganizers(eventId);
    const paymentDetails = await this.getPaymentDetails(paymentId);

    if (!paymentDetails) return;

    const message =
      `💳 Новая оплата ожидает подтверждения\n\n` +
      `📌 ${paymentDetails.event_title}\n` +
      `👤 ${paymentDetails.first_name} ${paymentDetails.last_name}\n` +
      `🎫 ${paymentDetails.ticket_type_name}\n` +
      `💰 ${paymentDetails.amount} ₽\n\n` +
      `Используйте /admin для подтверждения`;

    await this.sendToOrganizers(api, organizers, message);
  }

  /**
   * Notify organizers about confirmed payment
   */
  async notifyPaymentConfirmed(api: Api, eventId: number, paymentId: number): Promise<void> {
    const organizers = await this.getEventOrganizers(eventId);
    const paymentDetails = await this.getPaymentDetails(paymentId);

    if (!paymentDetails) return;

    const message =
      `✅ Оплата подтверждена\n\n` +
      `👤 ${paymentDetails.first_name} ${paymentDetails.last_name}\n` +
      `🎫 ${paymentDetails.ticket_type_name}\n` +
      `💰 ${paymentDetails.amount} ₽`;

    await this.sendToOrganizers(api, organizers, message);
  }

  /**
   * Send event summary to organizers
   */
  async sendEventSummary(api: Api, eventId: number): Promise<void> {
    const organizers = await this.getEventOrganizers(eventId);
    const stats = await this.getEventStats(eventId);

    if (!stats) return;

    const message =
      `📊 Сводка по мероприятию\n\n` +
      `📌 ${stats.event_title}\n\n` +
      `🎫 Всего регистраций: ${stats.total_registrations}\n` +
      `💰 Оплачено: ${stats.paid_count} (${stats.total_revenue} ₽)\n` +
      `⏳ Ожидают подтверждения: ${stats.pending_payments}\n` +
      `✅ Подтверждено: ${stats.confirmed_count}\n` +
      `🚶 Пришло на событие: ${stats.checked_in}`;

    await this.sendToOrganizers(api, organizers, message);
  }

  private async getEventOrganizers(eventId: number): Promise<number[]> {
    const { rows } = await pool.query<{ telegram_id: number }>(
      `SELECT DISTINCT u.telegram_id 
       FROM users u
       JOIN event_roles er ON u.id = er.user_id
       WHERE er.event_id = $1 AND er.role = 'organizer'`,
      [eventId]
    );
    return rows.map((r) => r.telegram_id);
  }

  private async getRegistrationDetails(registrationId: number): Promise<any> {
    const { rows } = await pool.query(
      `SELECT 
        r.*,
        u.first_name, u.last_name, u.email, u.phone, u.company,
        tt.name as ticket_type_name, tt.price,
        e.title as event_title
       FROM registrations r
       JOIN users u ON r.user_id = u.id
       JOIN ticket_types tt ON r.ticket_type_id = tt.id
       JOIN events e ON r.event_id = e.id
       WHERE r.id = $1`,
      [registrationId]
    );
    return rows[0] || null;
  }

  private async getPaymentDetails(paymentId: number): Promise<any> {
    const { rows } = await pool.query(
      `SELECT 
        p.*,
        r.id as registration_id,
        u.first_name, u.last_name,
        tt.name as ticket_type_name,
        e.id as event_id, e.title as event_title
       FROM payments p
       JOIN registrations r ON p.registration_id = r.id
       JOIN users u ON r.user_id = u.id
       JOIN ticket_types tt ON r.ticket_type_id = tt.id
       JOIN events e ON r.event_id = e.id
       WHERE p.id = $1`,
      [paymentId]
    );
    return rows[0] || null;
  }

  private async getEventStats(eventId: number): Promise<any> {
    const { rows } = await pool.query(
      `SELECT 
        e.title as event_title,
        COUNT(r.id)::int as total_registrations,
        COUNT(r.id) FILTER (WHERE r.status = 'confirmed')::int as confirmed_count,
        COUNT(r.id) FILTER (WHERE r.status = 'checked_in')::int as checked_in,
        COUNT(p.id) FILTER (WHERE p.status = 'confirmed')::int as paid_count,
        COUNT(p.id) FILTER (WHERE p.status = 'screenshot_sent')::int as pending_payments,
        COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'confirmed'), 0) as total_revenue
       FROM events e
       LEFT JOIN registrations r ON e.id = r.event_id
       LEFT JOIN payments p ON r.id = p.registration_id
       WHERE e.id = $1
       GROUP BY e.id, e.title`,
      [eventId]
    );
    return rows[0] || null;
  }

  private async sendToOrganizers(api: Api, telegramIds: number[], message: string): Promise<void> {
    for (const telegramId of telegramIds) {
      try {
        // Rate limiting: wait if needed
        const lastTime = this.lastNotificationTime.get(telegramId) || 0;
        const now = Date.now();
        const timeSinceLastNotification = now - lastTime;
        
        if (timeSinceLastNotification < this.RATE_LIMIT_MS) {
          const waitTime = this.RATE_LIMIT_MS - timeSinceLastNotification;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        await api.sendMessage(telegramId, message);
        this.lastNotificationTime.set(telegramId, Date.now());
      } catch (err) {
        console.error(`Failed to send notification to ${telegramId}:`, err);
      }
    }
  }
}

export default new NotificationService();
