import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (token: string): Socket => {
  if (socket?.connected) return socket;
  const url = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
  socket = io(url, {
    auth: { token },
    withCredentials: true,
  });
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
