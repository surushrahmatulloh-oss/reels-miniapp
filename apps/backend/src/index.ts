import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { connectDatabase } from './db.js';
import { connectRedis } from './redis.js';
import { corsOptions, isSocketOriginAllowed } from './cors.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import feedRoutes from './routes/feed.routes.js';
import videoRoutes from './routes/video.routes.js';
import searchRoutes from './routes/search.routes.js';
import { setupSockets } from './sockets/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  await connectDatabase();

  try {
    await connectRedis();
  } catch {
    console.warn('Redis unavailable — running without cache');
  }

  const app = express();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (isSocketOriginAllowed(origin)) callback(null, true);
        else callback(new Error('Socket CORS blocked'));
      },
      methods: ['GET', 'POST'],
    },
  });

  setupSockets(io);

  app.use(cors(corsOptions));
  app.use(express.json({ limit: '1mb' }));

  app.use(
    rateLimit({
      windowMs: 60_000,
      max: 120,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/feed', feedRoutes);
  app.use('/api/videos', videoRoutes);
  app.use('/api/search', searchRoutes);

  if (config.isProduction) {
    const frontendDist = path.join(__dirname, '../../frontend/dist');
    app.use(express.static(frontendDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
        if (err) next(err);
      });
    });
  } else {
    app.use((_req, res) => {
      res.status(404).json({ error: 'Not found' });
    });
  }

  server.listen(config.port, () => {
    console.log(`Backend running on http://localhost:${config.port}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
