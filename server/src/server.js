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

const start = async () => {
  await connectDB();
  await connectRedis();
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

start().catch((err) => {
  console.error('Startup error:', err);
  process.exit(1);
});
