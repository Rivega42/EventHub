import { FastifyReply, FastifyRequest } from 'fastify';
import config from '../../config';

export const apiKeyAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  const key = request.headers['x-api-key'];
  if (!key || key !== config.api.key) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
};
