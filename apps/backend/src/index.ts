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
import { videos, isFallbackMode } from './store/fallback.js';
import { Video } from './models/Video.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const app = express();
  app.set('trust proxy', 1);
  const server = http.createServer(app);

  app.get('/health', async (_req, res) => {
    let videoCount = videos.length;
    let db = config.useMemoryDb ? 'memory' : 'mongodb';

    if (isFallbackMode()) {
      db = 'fallback';
    } else if (Video.db.readyState === 1) {
      try {
        videoCount = await Video.countDocuments();
      } catch {
        /* ignore */
      }
    } else {
      db = 'connecting';
    }

    res.json({
      status: 'ok',
      version: '4.0.1',
      db,
      videos: videoCount,
      admin: true,
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
      console.log(`Backend listening on 0.0.0.0:${config.port}`);
      resolve();
    });
  });

  void connectDatabase().then(() => console.log('Database ready'));
  try {
    await connectRedis();
  } catch {
    console.warn('Redis unavailable — running without cache');
  }

  console.log('App routes ready');
}

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
