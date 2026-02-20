import Fastify from 'fastify';
import config from '../config';
import healthRoute from './routes/health';
import checkinRoute from './routes/checkin';

const fastify = Fastify({
  logger: true,
});

// Routes
fastify.register(healthRoute);
fastify.register(checkinRoute, { prefix: '/api/v1/checkin' });

export async function startApi(): Promise<void> {
  try {
    await fastify.listen({ port: config.api.port, host: '0.0.0.0' });
    console.log(`API server running on port ${config.api.port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

export default fastify;
