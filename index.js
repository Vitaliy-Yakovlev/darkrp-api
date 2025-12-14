/* eslint-env node */
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import db from './config/databases.js';

// Import routes
import bansRoutes from './routes/bans.js';
import earnersRoutes from './routes/earners.js';
import gangsRoutes from './routes/gangs.js';
import leaderboardRoutes from './routes/leaderboard.js';
import punishmentsRoutes from './routes/punishments.js';
import staffRoutes from './routes/staff.js';
import storeRoutes from './routes/store.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
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
app.use('/api/store', storeRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/bans', bansRoutes);
app.use('/api/punishments', punishmentsRoutes);
app.use('/api/gangs', gangsRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/earners', earnersRoutes);

// Start server
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server is running on ${HOST}:${PORT}`);
  console.log(`📊 API endpoints available at http://${HOST}:${PORT}/api`);
});
