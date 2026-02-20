import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import pool from '../../db/pool';

export default async function healthRoute(fastify: FastifyInstance): Promise<void> {
  fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await pool.query('SELECT 1');
      return { status: 'ok', timestamp: new Date().toISOString() };
    } catch (err) {
      reply.code(503);
      return { status: 'error', message: 'Database connection failed' };
    }
  });
}
