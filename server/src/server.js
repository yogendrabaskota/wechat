require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { connectDB } = require('./config/db');
const { connectRedis } = require('./config/redis');
const { setupSocket } = require('./socket/socket');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  },
});

app.set('io', io);
setupSocket(io);

const { cleanupTrashedPosts } = require('./controllers/post.controller');

const TRASH_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

const start = async () => {
  await connectDB();
  await connectRedis();
  await cleanupTrashedPosts().catch((err) => console.error('[posts] Initial trash cleanup failed:', err));
  setInterval(() => {
    cleanupTrashedPosts().catch((err) => console.error('[posts] Trash cleanup failed:', err));
  }, TRASH_CLEANUP_INTERVAL_MS);
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

start().catch((err) => {
  console.error('Startup error:', err);
  process.exit(1);
});
