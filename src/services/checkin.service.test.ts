import checkinService from './checkin.service';
import pool from '../db/pool';

// Mock the pool
jest.mock('../db/pool', () => ({
  query: jest.fn(),
  connect: jest.fn(),
}));

describe('CheckinService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findByRegistration', () => {
    it('should return check-in if exists', async () => {
      const mockCheckIn = {
        id: 1,
        registration_id: 100,
        scanned_by: 5,
        scanned_at: new Date(),
        location: 'Main Hall',
      };

      (pool.query as jest.Mock).mockResolvedValue({
        rows: [mockCheckIn],
      });

      const result = await checkinService.findByRegistration(100);

      expect(result).toEqual(mockCheckIn);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM check_ins'),
        [100]
      );
    });

    it('should return null if no check-in exists', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await checkinService.findByRegistration(999);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create check-in and update registration status', async () => {
      const mockCheckIn = {
        id: 1,
        registration_id: 100,
        scanned_by: 5,
        scanned_at: new Date(),
        location: 'Entrance',
      };

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ command: 'BEGIN' }) // BEGIN
          .mockResolvedValueOnce({ rows: [mockCheckIn] }) // INSERT check-in
          .mockResolvedValueOnce({ command: 'UPDATE' }) // UPDATE registration
          .mockResolvedValueOnce({ command: 'COMMIT' }), // COMMIT
        release: jest.fn(),
      };

      (pool.connect as jest.Mock).mockResolvedValue(mockClient);

      const result = await checkinService.create(100, 5, 'Entrance');

      expect(result).toEqual(mockCheckIn);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle duplicate check-in gracefully', async () => {
      const existingCheckIn = {
        id: 1,
        registration_id: 100,
        scanned_by: 5,
        scanned_at: new Date(),
        location: 'Entrance',
      };

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ command: 'BEGIN' })
          .mockRejectedValueOnce({
            code: '23505',
            constraint: 'unique_registration_checkin',
          }),
        release: jest.fn(),
      };

      (pool.connect as jest.Mock).mockResolvedValue(mockClient);
      
      // Mock findByRegistration to return existing check-in
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [existingCheckIn],
      });

      const result = await checkinService.create(100, 5);

      expect(result).toEqual(existingCheckIn);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback on other errors', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ command: 'BEGIN' })
          .mockRejectedValueOnce(new Error('Database error')),
        release: jest.fn(),
      };

      (pool.connect as jest.Mock).mockResolvedValue(mockClient);

      await expect(checkinService.create(100, 5)).rejects.toThrow('Database error');
      
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should calculate check-in statistics correctly', async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [{
          total: '100',
          checked_in: '75',
        }],
      });

      const stats = await checkinService.getStats(1);

      expect(stats).toEqual({
        total: 100,
        checkedIn: 75,
        percentage: 75,
      });
    });

    it('should handle zero registrations', async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [{
          total: '0',
          checked_in: '0',
        }],
      });

      const stats = await checkinService.getStats(1);

      expect(stats).toEqual({
        total: 0,
        checkedIn: 0,
        percentage: 0,
      });
    });

    it('should round percentage correctly', async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [{
          total: '3',
          checked_in: '1',
        }],
      });

      const stats = await checkinService.getStats(1);

      expect(stats.percentage).toBe(33); // 1/3 = 0.333... -> 33%
    });
  });
});
