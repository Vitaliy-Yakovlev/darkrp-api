/* eslint-env node */
import express from 'express';
import db from '../config/databases.js';

const router = express.Router();

// Get user tokens
router.get('/tokens/:steamId', async (req, res) => {
  try {
    if (db.connectionStatus?.tokens !== 'connected') {
      return res.status(503).json({
        error: 'Database "Infamous_token" is not available. Please check connection and permissions.',
      });
    }

    const { steamId } = req.params;
    const tokens = await db.query('tokens', 'SELECT * FROM roasts_tokens WHERE steamid = ?', [steamId]);
    res.json(tokens[0] || { tokens: 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get transactions
router.get('/transactions/:steamId', async (req, res) => {
  try {
    if (db.connectionStatus?.tokens !== 'connected') {
      return res.status(503).json({
        error: 'Database "Infamous_token" is not available. Please check connection and permissions.',
      });
    }

    const { steamId } = req.params;
    const { limit = 10, offset = 0 } = req.query;
    const transactions = await db.query(
      'tokens',
      'SELECT * FROM roasts_transactions WHERE steamid = ? ORDER BY id DESC LIMIT ? OFFSET ?',
      [steamId, parseInt(limit), parseInt(offset)]
    );
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create transaction
router.post('/transactions', async (req, res) => {
  try {
    if (db.connectionStatus?.tokens !== 'connected') {
      return res.status(503).json({
        error: 'Database "Infamous_token" is not available. Please check connection and permissions.',
      });
    }

    const { steamId, amount, type, description } = req.body;
    const result = await db.query(
      'tokens',
      'INSERT INTO roasts_transactions (steamid, amount, type, description, created_at) VALUES (?, ?, ?, ?, NOW())',
      [steamId, amount, type, description]
    );
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
