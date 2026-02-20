import ExcelJS from 'exceljs';
import pool from '../db/pool';
import path from 'path';
import fs from 'fs';

/**
 * Sanitize string to prevent Excel formula injection
 * @param value Input value
 * @returns Sanitized value safe for Excel
 */
function sanitizeForExcel(value: any): any {
  if (typeof value !== 'string') return value;
  
  // Prefix dangerous chars with single quote to prevent formula execution
  if (/^[=+\-@\t\r]/.test(value)) {
    return "'" + value;
  }
  
  return value;
}

class ExportService {
  async generateExcel(eventId: number): Promise<string> {
    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Participants
    await this.createParticipantsSheet(workbook, eventId);

    // Sheet 2: Payments
    await this.createPaymentsSheet(workbook, eventId);

    // Sheet 3: Check-ins
    await this.createCheckInsSheet(workbook, eventId);

    // Sheet 4: Sessions
    await this.createSessionsSheet(workbook, eventId);

    // Sheet 5: Session Feedback
    await this.createFeedbackSheet(workbook, eventId);

    // Sheet 6: Event Surveys
    await this.createSurveysSheet(workbook, eventId);

    // Save file
    const filename = `export_${eventId}_${Date.now()}.xlsx`;
    const filepath = path.join('/tmp', filename);
    await workbook.xlsx.writeFile(filepath);

    return filepath;
  }

  private async createParticipantsSheet(workbook: ExcelJS.Workbook, eventId: number): Promise<void> {
    const sheet = workbook.addWorksheet('Участники');

    // Headers
    sheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Имя', key: 'first_name', width: 20 },
      { header: 'Фамилия', key: 'last_name', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Телефон', key: 'phone', width: 20 },
      { header: 'Тип билета', key: 'ticket_type', width: 20 },
      { header: 'Статус', key: 'status', width: 15 },
      { header: 'Дата регистрации', key: 'created_at', width: 20 },
    ];

    // Data
    const { rows } = await pool.query(
      `SELECT r.id, u.first_name, u.last_name, r.email, r.phone,
              tt.name as ticket_type, r.status, r.created_at
       FROM registrations r
       JOIN users u ON r.user_id = u.id
       JOIN ticket_types tt ON r.ticket_type_id = tt.id
       WHERE r.event_id = $1
       ORDER BY r.created_at DESC`,
      [eventId]
    );

    rows.forEach(row => {
      sheet.addRow({
        id: row.id,
        first_name: sanitizeForExcel(row.first_name),
        last_name: sanitizeForExcel(row.last_name),
        email: sanitizeForExcel(row.email),
        phone: sanitizeForExcel(row.phone),
        ticket_type: sanitizeForExcel(row.ticket_type),
        status: sanitizeForExcel(row.status),
        created_at: row.created_at,
      });
    });

    // Style header
    sheet.getRow(1).font = { bold: true };
  }

  private async createPaymentsSheet(workbook: ExcelJS.Workbook, eventId: number): Promise<void> {
    const sheet = workbook.addWorksheet('Оплаты');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Участник', key: 'participant', width: 30 },
      { header: 'Сумма', key: 'amount', width: 15 },
      { header: 'Статус', key: 'status', width: 15 },
      { header: 'Номер карты', key: 'card_number', width: 20 },
      { header: 'Дата создания', key: 'created_at', width: 20 },
      { header: 'Дата подтверждения', key: 'confirmed_at', width: 20 },
    ];

    const { rows } = await pool.query(
      `SELECT p.id, u.first_name || ' ' || u.last_name as participant,
              p.amount, p.status, pc.card_number, p.created_at, p.confirmed_at
       FROM payments p
       JOIN registrations r ON p.registration_id = r.id
       JOIN users u ON r.user_id = u.id
       LEFT JOIN payment_cards pc ON p.card_id = pc.id
       WHERE r.event_id = $1
       ORDER BY p.created_at DESC`,
      [eventId]
    );

    rows.forEach(row => {
      sheet.addRow({
        id: row.id,
        participant: sanitizeForExcel(row.participant),
        amount: row.amount,
        status: sanitizeForExcel(row.status),
        card_number: sanitizeForExcel(row.card_number ? `*${row.card_number.slice(-4)}` : ''),
        created_at: row.created_at,
        confirmed_at: row.confirmed_at,
      });
    });

    sheet.getRow(1).font = { bold: true };
  }

  private async createCheckInsSheet(workbook: ExcelJS.Workbook, eventId: number): Promise<void> {
    const sheet = workbook.addWorksheet('Check-ins');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Участник', key: 'participant', width: 30 },
      { header: 'Дата check-in', key: 'checked_in_at', width: 20 },
      { header: 'Отметил', key: 'checked_by', width: 30 },
    ];

    const { rows } = await pool.query(
      `SELECT ci.id, u.first_name || ' ' || u.last_name as participant,
              ci.checked_in_at, u2.first_name || ' ' || u2.last_name as checked_by
       FROM check_ins ci
       JOIN registrations r ON ci.registration_id = r.id
       JOIN users u ON r.user_id = u.id
       LEFT JOIN users u2 ON ci.checked_by_user_id = u2.id
       WHERE r.event_id = $1
       ORDER BY ci.checked_in_at DESC`,
      [eventId]
    );

    rows.forEach(row => {
      sheet.addRow({
        id: row.id,
        participant: sanitizeForExcel(row.participant),
        checked_in_at: row.checked_in_at,
        checked_by: sanitizeForExcel(row.checked_by),
      });
    });

    sheet.getRow(1).font = { bold: true };
  }

  private async createSessionsSheet(workbook: ExcelJS.Workbook, eventId: number): Promise<void> {
    const sheet = workbook.addWorksheet('Доклады');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Название', key: 'title', width: 40 },
      { header: 'Спикер', key: 'speaker_name', width: 30 },
      { header: 'Локация', key: 'location', width: 20 },
      { header: 'Начало', key: 'starts_at', width: 20 },
      { header: 'Конец', key: 'ends_at', width: 20 },
      { header: 'Трек', key: 'track', width: 15 },
      { header: 'Избранное (кол-во)', key: 'bookmark_count', width: 20 },
    ];

    const { rows } = await pool.query(
      `SELECT s.id, s.title, s.speaker_name, s.location, s.starts_at, s.ends_at, s.track,
              (SELECT COUNT(*) FROM session_bookmarks WHERE session_id = s.id) as bookmark_count
       FROM sessions s
       WHERE s.event_id = $1
       ORDER BY s.starts_at ASC`,
      [eventId]
    );

    rows.forEach(row => {
      sheet.addRow({
        id: row.id,
        title: sanitizeForExcel(row.title),
        speaker_name: sanitizeForExcel(row.speaker_name),
        location: sanitizeForExcel(row.location),
        starts_at: row.starts_at,
        ends_at: row.ends_at,
        track: sanitizeForExcel(row.track),
        bookmark_count: row.bookmark_count,
      });
    });

    sheet.getRow(1).font = { bold: true };
  }

  private async createFeedbackSheet(workbook: ExcelJS.Workbook, eventId: number): Promise<void> {
    const sheet = workbook.addWorksheet('Фидбек по докладам');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Доклад', key: 'session_title', width: 40 },
      { header: 'Спикер', key: 'speaker_name', width: 30 },
      { header: 'Участник', key: 'participant', width: 30 },
      { header: 'Рейтинг', key: 'rating', width: 10 },
      { header: 'Комментарий', key: 'comment', width: 50 },
      { header: 'Дата', key: 'created_at', width: 20 },
    ];

    const { rows } = await pool.query(
      `SELECT sf.id, s.title as session_title, s.speaker_name,
              u.first_name || ' ' || u.last_name as participant,
              sf.rating, sf.comment, sf.created_at
       FROM session_feedback sf
       JOIN sessions s ON sf.session_id = s.id
       JOIN users u ON sf.user_id = u.id
       WHERE s.event_id = $1
       ORDER BY sf.created_at DESC`,
      [eventId]
    );

    rows.forEach(row => {
      sheet.addRow({
        id: row.id,
        session_title: sanitizeForExcel(row.session_title),
        speaker_name: sanitizeForExcel(row.speaker_name),
        participant: sanitizeForExcel(row.participant),
        rating: row.rating,
        comment: sanitizeForExcel(row.comment),
        created_at: row.created_at,
      });
    });

    sheet.getRow(1).font = { bold: true };
  }

  private async createSurveysSheet(workbook: ExcelJS.Workbook, eventId: number): Promise<void> {
    const sheet = workbook.addWorksheet('Опросы участников');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Участник', key: 'participant', width: 30 },
      { header: 'Общая оценка', key: 'overall_rating', width: 15 },
      { header: 'Лучший доклад', key: 'best_session', width: 40 },
      { header: 'Что улучшить', key: 'improvement', width: 50 },
      { header: 'Порекомендует', key: 'would_recommend', width: 15 },
      { header: 'Дата', key: 'created_at', width: 20 },
    ];

    const { rows } = await pool.query(
      `SELECT es.id,
              u.first_name || ' ' || u.last_name as participant,
              es.overall_rating,
              s.title as best_session,
              es.improvement,
              es.would_recommend,
              es.created_at
       FROM event_surveys es
       JOIN users u ON es.user_id = u.id
       LEFT JOIN sessions s ON es.best_session_id = s.id
       WHERE es.event_id = $1
       ORDER BY es.created_at DESC`,
      [eventId]
    );

    rows.forEach(row => {
      sheet.addRow({
        id: row.id,
        participant: sanitizeForExcel(row.participant),
        overall_rating: row.overall_rating,
        best_session: sanitizeForExcel(row.best_session),
        improvement: sanitizeForExcel(row.improvement),
        would_recommend: row.would_recommend ? 'Да' : 'Нет',
        created_at: row.created_at,
      });
    });

    sheet.getRow(1).font = { bold: true };
  }

  async cleanup(filepath: string): Promise<void> {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  }
}

export default new ExportService();
