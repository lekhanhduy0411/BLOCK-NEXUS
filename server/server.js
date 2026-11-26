import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

import authRoutes from './routes/auth.js';
import scoreRoutes from './routes/scores.js';
import shopRoutes from './routes/shop.js';
import rewardRoutes from './routes/rewards.js';
import adminRoutes from './routes/admin.js';
import gameRoutes from './routes/game.js';
import questRoutes from './routes/quests.js';
import challengeRoutes from './routes/challenges.js';
import { getHoChiMinhWeekInfo, initWeeklyResetCron } from './jobs/weeklyReset.js';

const app = express();
const PORT = Number(process.env.PORT) || 5000;

const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.length === 0 ||
        allowedOrigins.includes(origin) ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
        origin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '100kb' }));

// Health check & Render wake-up endpoint (zero DB queries)
app.get('/api/health', (_req, res) => {
  const { weekKey, nextResetAt } = getHoChiMinhWeekInfo();
  return res.status(200).json({
    ok: true,
    ts: Date.now(),
    status: 'ok',
    service: 'block-nexus-api',
    apiVersion: '2026-campaign-v1',
    dbConnected: mongoose.connection.readyState === 1,
    weekKey,
    nextResetAt: nextResetAt.toISOString(),
    timestamp: new Date().toISOString(),
  });
});

// Middleware to ensure DB is connected on data routes
app.use('/api', (req, res, next) => {
  if (req.path === '/health' || req.path === '/shop/catalog') {
    return next();
  }
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: 'Database is currently connecting or unavailable. Please retry in a moment.',
    });
  }
  return next();
});

app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/quests', questRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/admin', adminRoutes);

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[API Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error.',
  });
});

async function startServer() {
  const mongoUri = process.env.MONGODB_URI;

  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 10000,
      });
      console.log('[MongoDB] Connected successfully.');
      initWeeklyResetCron();
    } catch (err) {
      console.error('[MongoDB] Initial connection error:', err.message);
    }
  } else {
    console.warn(
      '[MongoDB] MONGODB_URI is not set. Set MONGODB_URI in server/.env to enable persistence.'
    );
  }

  app.listen(PORT, () => {
    console.log(`[Block Nexus API] Listening on http://localhost:${PORT}`);
  });
}

startServer();
