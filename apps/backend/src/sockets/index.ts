import type { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import type { JwtPayload } from '../types/index.js';
import { setVideoSocket } from '../controllers/video.controller.js';

function authenticateSocket(socket: Socket): JwtPayload | null {
  const token = socket.handshake.auth.token as string | undefined;
  if (!token) return null;
  try {
    return jwt.verify(token, config.jwtSecret) as JwtPayload;
  } catch {
    return null;
  }
}

export function setupSockets(io: Server): void {
  setVideoSocket(io);

  io.use((socket, next) => {
    const user = authenticateSocket(socket);
    if (!user) {
      next(new Error('Unauthorized'));
      return;
    }
    socket.data.user = user;
    next();
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as JwtPayload;

    socket.on('join_feed', (data: { userId?: string; categories?: string[] }) => {
      const room = `feed:${data.userId ?? user.userId}`;
      void socket.join(room);
    });

    socket.on('leave_feed', (data: { userId?: string }) => {
      const room = `feed:${data.userId ?? user.userId}`;
      void socket.leave(room);
    });

    socket.on('disconnect', () => {
      // cleanup handled by socket.io
    });
  });
}

export function emitNewVideo(
  io: Server,
  userId: string,
  video: Record<string, unknown>,
): void {
  io.to(`feed:${userId}`).emit('new_video', video);
}
