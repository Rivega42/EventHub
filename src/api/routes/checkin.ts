import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import qrService from '../../services/qr.service';
import registrationService from '../../services/registration.service';
import checkinService from '../../services/checkin.service';

interface ScanBody {
  code: string;
  scannedBy: number;
  location?: string;
}

interface StatsParams {
  eventId: string;
}

export default async function checkinRoute(fastify: FastifyInstance): Promise<void> {
  // POST /api/v1/checkin/scan
  fastify.post<{ Body: ScanBody }>('/scan', async (request, reply) => {
    const { code, scannedBy, location } = request.body;

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
      return {
        success: false,
        error: {
          code: 'ALREADY_CHECKED_IN',
          message: 'Already checked in',
          data: existingCheckin,
        },
      };
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
  fastify.get<{ Params: StatsParams }>('/stats/:eventId', async (request, reply) => {
    const eventId = parseInt(request.params.eventId, 10);
    const stats = await checkinService.getStats(eventId);
    return { success: true, data: stats };
  });
}
