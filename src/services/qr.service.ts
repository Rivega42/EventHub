import crypto from 'crypto';
import { timingSafeEqual } from 'crypto';
import QRCode from 'qrcode';
import config from '../config';

class QrService {
  private secret: string;

  constructor() {
    this.secret = config.qr.secret;
  }

  generateHmac(qrToken: string): string {
    return crypto
      .createHmac('sha256', this.secret)
      .update(qrToken)
      .digest('hex');
  }

  generatePayload(qrToken: string): string {
    const hmac = this.generateHmac(qrToken);
    return `eventhub:${qrToken}:${hmac}`;
  }

  async generateQrImage(qrToken: string): Promise<Buffer> {
    const payload = this.generatePayload(qrToken);
    return QRCode.toBuffer(payload, {
      errorCorrectionLevel: 'M',
      width: 400,
      margin: 2,
      type: 'png',
    });
  }

  verifyPayload(raw: string): { valid: boolean; qrToken?: string } {
    const parts = raw.split(':');
    if (parts.length !== 3 || parts[0] !== 'eventhub') {
      return { valid: false };
    }

    const [, qrToken, providedHmac] = parts;
    const expectedHmac = this.generateHmac(qrToken);

    const a = Buffer.from(providedHmac, 'hex');
    const b = Buffer.from(expectedHmac, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { valid: false };
    }

    return { valid: true, qrToken };
  }
}

export default new QrService();
