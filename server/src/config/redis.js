const { createClient } = require('redis');

const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  password: process.env.REDIS_PASSWORD || undefined,
});

redisClient.on('error', (err) => console.error('Redis error:', err));

const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error('Redis connection error:', err.message);
  }
};

module.exports = { redisClient, connectRedis };
