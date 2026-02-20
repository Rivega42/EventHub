import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import qrService from '../../services/qr.service';
import registrationService from '../../services/registration.service';
import checkinService from '../../services/checkin.service';
import { apiKeyAuth } from '../middleware/auth';

const ScanBodySchema = z.object({
  code: z.string(),
  scannedBy: z.number().int().positive(),
  location: z.string().optional(),
});

const StatsParamsSchema = z.object({
  eventId: z.string().regex(/^\d+$/),
});

export default async function checkinRoute(fastify: FastifyInstance): Promise<void> {
  // POST /api/v1/checkin/scan
  fastify.post('/scan', { preHandler: apiKeyAuth }, async (request, reply) => {
    const validatedBody = ScanBodySchema.safeParse(request.body);
    if (!validatedBody.success) {
      return reply.code(400).send({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Invalid request body', details: validatedBody.error },
      });
    }

    const { code, scannedBy, location } = validatedBody.data;

    // Verify QR code
    const verification = qrService.verifyPayload(code);
    if (!verification.valid || !verification.qrToken) {
      return reply.code(400).send({
        success: false,
        error: { code: 'INVALID_QR', message: 'QR code is invalid' },
      });
    }

    // Find registration
    const registration = await registrationService.findByQrToken(verification.qrToken);
    if (!registration) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Ticket not found' },
      });
    }

    // Check if already checked in
    const existingCheckin = await checkinService.findByRegistration(registration.id);
    if (existingCheckin) {
      return reply.code(409).send({
        success: false,
        error: {
          code: 'ALREADY_CHECKED_IN',
          message: 'Already checked in',
          data: existingCheckin,
        },
      });
    }

    // Create check-in
    const checkin = await checkinService.create(registration.id, scannedBy, location);

    // Get registration details
    const details = await registrationService.getWithDetails(registration.id);

    return {
      success: true,
      data: {
        checkin,
        registration: details,
      },
    };
  });

  // GET /api/v1/checkin/stats/:eventId
  fastify.get('/stats/:eventId', { preHandler: apiKeyAuth }, async (request, reply) => {
    const validatedParams = StatsParamsSchema.safeParse(request.params);
    if (!validatedParams.success) {
      return reply.code(400).send({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Invalid event ID', details: validatedParams.error },
      });
    }

    const eventId = parseInt(validatedParams.data.eventId, 10);
    const stats = await checkinService.getStats(eventId);
    return { success: true, data: stats };
  });
}
