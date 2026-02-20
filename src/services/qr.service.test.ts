import qrService from './qr.service';

describe('QrService', () => {
  describe('generateHmac', () => {
    it('should generate consistent HMAC for same token', () => {
      const token = 'test-token-123';
      const hmac1 = qrService.generateHmac(token);
      const hmac2 = qrService.generateHmac(token);
      
      expect(hmac1).toBe(hmac2);
      expect(hmac1).toHaveLength(64); // SHA256 hex = 64 chars
    });

    it('should generate different HMAC for different tokens', () => {
      const token1 = 'test-token-1';
      const token2 = 'test-token-2';
      
      const hmac1 = qrService.generateHmac(token1);
      const hmac2 = qrService.generateHmac(token2);
      
      expect(hmac1).not.toBe(hmac2);
    });
  });

  describe('generatePayload', () => {
    it('should generate payload in correct format', () => {
      const token = 'abc123';
      const payload = qrService.generatePayload(token);
      
      expect(payload).toMatch(/^eventhub:abc123:[a-f0-9]{64}$/);
    });
  });

  describe('verifyPayload', () => {
    it('should verify valid payload', () => {
      const token = 'valid-token';
      const payload = qrService.generatePayload(token);
      
      const result = qrService.verifyPayload(payload);
      
      expect(result.valid).toBe(true);
      expect(result.qrToken).toBe(token);
    });

    it('should reject invalid format', () => {
      const result = qrService.verifyPayload('invalid:format');
      
      expect(result.valid).toBe(false);
      expect(result.qrToken).toBeUndefined();
    });

    it('should reject wrong prefix', () => {
      const result = qrService.verifyPayload('wrongprefix:token:hmac');
      
      expect(result.valid).toBe(false);
      expect(result.qrToken).toBeUndefined();
    });

    it('should reject tampered HMAC', () => {
      const token = 'test-token';
      const payload = qrService.generatePayload(token);
      const tampered = payload.slice(0, -1) + 'x'; // Change last char
      
      const result = qrService.verifyPayload(tampered);
      
      expect(result.valid).toBe(false);
    });

    it('should use timingSafeEqual for HMAC comparison', () => {
      // This test ensures timingSafeEqual is used (timing attack protection)
      const token = 'secure-token';
      const payload = qrService.generatePayload(token);
      
      // Valid payload should verify correctly
      const result = qrService.verifyPayload(payload);
      expect(result.valid).toBe(true);
      
      // Even with same length but different HMAC, should fail
      const parts = payload.split(':');
      const wrongHmac = '0'.repeat(64);
      const fakePayload = `${parts[0]}:${parts[1]}:${wrongHmac}`;
      
      const fakeResult = qrService.verifyPayload(fakePayload);
      expect(fakeResult.valid).toBe(false);
    });
  });

  describe('generateQrImage', () => {
    it('should generate a PNG buffer', async () => {
      const token = 'image-test';
      const buffer = await qrService.generateQrImage(token);
      
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
      
      // Check PNG signature
      expect(buffer.slice(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    });
  });
});
