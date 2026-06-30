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
import adminRoutes from './routes/admin.routes.js';
import { streamMedia } from './controllers/media.controller.js';
import { setupSockets } from './sockets/index.js';
import { ensureCategoryAudioClips } from './services/categoryAudioSeed.service.js';
import { ensureVideoCatalog, countReelsVideos } from './services/ensureVideoCatalog.service.js';
import { videos, isFallbackMode } from './store/fallback.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_VERSION = '6.1.0';

async function main() {
  const app = express();
  app.set('trust proxy', 1);
  const server = http.createServer(app);

  // Lightweight health — no DB query (Render health check must be instant)
  app.get('/health', async (_req, res) => {
    let videoCount: number | null = null;
    try {
      videoCount = await countReelsVideos();
    } catch {
      videoCount = null;
    }
    res.json({
      status: 'ok',
      version: APP_VERSION,
      mongo: isFallbackMode() ? 'fallback' : 'managed',
      fallback: isFallbackMode(),
      videoCount,
      timestamp: new Date().toISOString(),
    });
  });

  app.use(cors(corsOptions));
  app.use(express.json({ limit: '1mb' }));

  app.use(
    rateLimit({
      windowMs: 60_000,
      max: 120,
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => req.path.startsWith('/api/media/'),
    }),
  );

  app.get('/api/media/:id', streamMedia);

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/feed', feedRoutes);
  app.use('/api/videos', videoRoutes);
  app.use('/api/search', searchRoutes);
  app.use('/api/admin', adminRoutes);

  if (config.isProduction) {
    const frontendDist = path.join(__dirname, '../../frontend/dist');
    app.use(
      express.static(frontendDist, {
        maxAge: '1d',
        setHeaders(res, filePath) {
          if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          }
        },
      }),
    );
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
        if (err) next(err);
      });
    });
  } else {
    app.use((_req, res) => {
      res.status(404).json({ error: 'Not found' });
    });
  }

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

  await new Promise<void>((resolve) => {
    server.listen(config.port, '0.0.0.0', () => {
      console.log(`Backend listening on 0.0.0.0:${config.port} v${APP_VERSION}`);
      resolve();
    });
  });

  void connectDatabase().then(async () => {
    console.log('Database ready');
    await ensureCategoryAudioClips().catch((err) =>
      console.warn('[audio-seed] ensure failed:', err),
    );
    await ensureVideoCatalog(2000).catch((err) =>
      console.warn('[catalog] ensure failed:', err),
    );
  });
  void connectRedis().catch(() => console.warn('Redis unavailable — running without cache'));

  console.log('App routes ready');
}

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
