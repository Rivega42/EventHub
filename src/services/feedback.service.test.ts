import feedbackService from './feedback.service';
import pool from '../db/pool';

jest.mock('../db/pool', () => ({
  query: jest.fn(),
}));

describe('FeedbackService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrUpdate', () => {
    it('should create feedback with valid rating', async () => {
      const mockFeedback = {
        id: 1,
        user_id: 10,
        session_id: 20,
        rating: 5,
        comment: 'Great talk!',
        created_at: new Date(),
      };

      (pool.query as jest.Mock).mockResolvedValue({
        rows: [mockFeedback],
      });

      const result = await feedbackService.createOrUpdate(10, 20, 5, 'Great talk!');

      expect(result).toEqual(mockFeedback);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO session_feedback'),
        [10, 20, 5, 'Great talk!']
      );
    });

    it('should reject rating below 1', async () => {
      await expect(
        feedbackService.createOrUpdate(10, 20, 0)
      ).rejects.toThrow('Rating must be between 1 and 5');
    });

    it('should reject rating above 5', async () => {
      await expect(
        feedbackService.createOrUpdate(10, 20, 6)
      ).rejects.toThrow('Rating must be between 1 and 5');
    });

    it('should update existing feedback on conflict', async () => {
      const updatedFeedback = {
        id: 1,
        user_id: 10,
        session_id: 20,
        rating: 4,
        comment: 'Updated comment',
        created_at: new Date(),
      };

      (pool.query as jest.Mock).mockResolvedValue({
        rows: [updatedFeedback],
      });

      const result = await feedbackService.createOrUpdate(10, 20, 4, 'Updated comment');

      expect(result.rating).toBe(4);
      expect(result.comment).toBe('Updated comment');
    });

    it('should handle feedback without comment', async () => {
      const mockFeedback = {
        id: 1,
        user_id: 10,
        session_id: 20,
        rating: 3,
        comment: null,
        created_at: new Date(),
      };

      (pool.query as jest.Mock).mockResolvedValue({
        rows: [mockFeedback],
      });

      const result = await feedbackService.createOrUpdate(10, 20, 3);

      expect(result.comment).toBeNull();
      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        [10, 20, 3, null]
      );
    });
  });

  describe('getSessionStats', () => {
    it('should calculate average rating correctly', async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [{
          avg_rating: '4.5',
          total_count: '10',
          rating_1: '0',
          rating_2: '1',
          rating_3: '2',
          rating_4: '3',
          rating_5: '4',
        }],
      });

      const stats = await feedbackService.getSessionStats(20);

      expect(stats.sessionId).toBe(20);
      expect(stats.averageRating).toBe(4.5);
      expect(stats.totalCount).toBe(10);
      expect(stats.ratingDistribution).toEqual({
        1: 0,
        2: 1,
        3: 2,
        4: 3,
        5: 4,
      });
    });

    it('should handle session with no feedback', async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [{
          avg_rating: null,
          total_count: '0',
          rating_1: '0',
          rating_2: '0',
          rating_3: '0',
          rating_4: '0',
          rating_5: '0',
        }],
      });

      const stats = await feedbackService.getSessionStats(99);

      expect(stats.averageRating).toBe(0);
      expect(stats.totalCount).toBe(0);
    });

    it('should round average rating to 1 decimal place', async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [{
          avg_rating: '3.456789',
          total_count: '100',
          rating_1: '10',
          rating_2: '20',
          rating_3: '30',
          rating_4: '25',
          rating_5: '15',
        }],
      });

      const stats = await feedbackService.getSessionStats(20);

      expect(stats.averageRating).toBe(3.5); // Rounded from 3.456789
    });
  });

  describe('findBySessionAndUser', () => {
    it('should find existing feedback', async () => {
      const mockFeedback = {
        id: 1,
        user_id: 10,
        session_id: 20,
        rating: 5,
        comment: 'Amazing!',
        created_at: new Date(),
      };

      (pool.query as jest.Mock).mockResolvedValue({
        rows: [mockFeedback],
      });

      const result = await feedbackService.findBySessionAndUser(20, 10);

      expect(result).toEqual(mockFeedback);
    });

    it('should return null if not found', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await feedbackService.findBySessionAndUser(20, 10);

      expect(result).toBeNull();
    });
  });

  describe('getAllFeedbackForSession', () => {
    it('should return all feedback ordered by created_at DESC', async () => {
      const mockFeedbacks = [
        { id: 2, rating: 5, created_at: new Date('2024-01-02') },
        { id: 1, rating: 4, created_at: new Date('2024-01-01') },
      ];

      (pool.query as jest.Mock).mockResolvedValue({
        rows: mockFeedbacks,
      });

      const result = await feedbackService.getAllFeedbackForSession(20);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(2); // Most recent first
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        [20]
      );
    });
  });
});
