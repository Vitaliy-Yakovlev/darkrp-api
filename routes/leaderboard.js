/* eslint-env node */
import express from 'express';
import db from '../config/databases.js';

const router = express.Router();

// Token Leaderboard - Infamous_token, roasts_tokens
router.get('/tokens', async (req, res) => {
  try {
    if (db.connectionStatus?.tokens !== 'connected') {
      return res.status(503).json({
        error: 'Database "Infamous_token" is not available. Please check connection and permissions.',
      });
    }

    const { limit = 100, offset = 0 } = req.query;
    const [leaderboard, countResult] = await Promise.all([
      db.query('tokens', 'SELECT * FROM roasts_tokens ORDER BY tokens DESC LIMIT ? OFFSET ?', [
        parseInt(limit),
        parseInt(offset),
      ]),
      db.query('tokens', 'SELECT COUNT(*) as total FROM roasts_tokens'),
    ]);

    const total = countResult[0]?.total || 0;

    res.json({
      data: leaderboard,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Money Leaderboard - infamous_darkrp, darkrp_player
router.get('/money', async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const [leaderboard, countResult] = await Promise.all([
      db.query('darkrp', 'SELECT * FROM darkrp_player ORDER BY money DESC LIMIT ? OFFSET ?', [
        parseInt(limit),
        parseInt(offset),
      ]),
      db.query('darkrp', 'SELECT COUNT(*) as total FROM darkrp_player'),
    ]);

    const total = countResult[0]?.total || 0;

    res.json({
      data: leaderboard,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Event Leaderboard - infamous_darkrp, event_winners
router.get('/events', async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    let orderByColumn = 'id';
    try {
      const columns = await db.query('darkrp', 'SHOW COLUMNS FROM event_winners');
      const possibleColumns = ['id', 'event_id', 'timestamp', 'date', 'created_at'];
      const foundColumn = columns.find((col) => possibleColumns.includes(col.Field.toLowerCase()));
      orderByColumn = foundColumn?.Field || columns[0]?.Field || 'id';
    } catch {
      // Use default value
    }

    const [leaderboard, countResult] = await Promise.all([
      db.query('darkrp', `SELECT * FROM event_winners ORDER BY ${orderByColumn} DESC LIMIT ? OFFSET ?`, [
        parseInt(limit),
        parseInt(offset),
      ]),
      db.query('darkrp', 'SELECT COUNT(*) as total FROM event_winners'),
    ]);

    const total = countResult[0]?.total || 0;

    res.json({
      data: leaderboard,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Playtime Leaderboard - infamous_iga, player
router.get('/playtime', async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const [leaderboard, countResult] = await Promise.all([
      db.query('iga', 'SELECT * FROM player ORDER BY playtime DESC LIMIT ? OFFSET ?', [
        parseInt(limit),
        parseInt(offset),
      ]),
      db.query('iga', 'SELECT COUNT(*) as total FROM player'),
    ]);

    const total = countResult[0]?.total || 0;

    res.json({
      data: leaderboard,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
