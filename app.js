/* eslint-env node */
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import db from './config/databases.js';

// Import routes
import authRoutes from './routes/auth.js';
import bansRoutes from './routes/bans.js';
import earnersRoutes from './routes/earners.js';
import gangsRoutes from './routes/gangs.js';
import leaderboardRoutes from './routes/leaderboard.js';
import paypalRoutes from './routes/paypal.js';
import punishmentsRoutes from './routes/punishments.js';
import staffRoutes from './routes/staff.js';
import storeRoutes from './routes/store.js';

dotenv.config();

const app = express();

// Normalize path: если запрос приходит без префикса `/api`, добавим его
app.use((req, res, next) => {
  try {
    if (!req.path.startsWith('/api')) {
      req.url = `/api${req.url}`;
    }
  } catch (e) {}
  next();
});

// CORS: явно выставляем заголовки и обрабатываем preflight
app.use((req, res, next) => {
  const origin = process.env.CORS_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const status = {};

  try {
    await db.query('tokens', 'SELECT 1');
    status.tokens = 'connected';
  } catch (error) {
    status.tokens = `error: ${error.message}`;
  }

  try {
    await db.query('iga', 'SELECT 1');
    status.iga = 'connected';
  } catch (error) {
    status.iga = `error: ${error.message}`;
  }

  try {
    await db.query('server', 'SELECT 1');
    status.server = 'connected';
  } catch (error) {
    status.server = `error: ${error.message}`;
  }

  try {
    await db.query('darkrp', 'SELECT 1');
    status.darkrp = 'connected';
  } catch (error) {
    status.darkrp = `error: ${error.message}`;
  }

  res.json({ status: 'ok', databases: status });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/paypal', paypalRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/bans', bansRoutes);
app.use('/api/punishments', punishmentsRoutes);
app.use('/api/gangs', gangsRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/earners', earnersRoutes);

export default app;
