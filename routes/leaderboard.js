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
    const { limit = 50, offset = 0, search } = req.query;

    // Определяем колонку для времени игры
    let timeColumn = null;
    try {
      const columns = await db.query('iga', 'SHOW COLUMNS FROM player');
      const possibleTimeColumns = ['TimePlayed', 'timeplayed', 'playtime', 'PlayTime', 'time_played'];
      for (const col of possibleTimeColumns) {
        const found = columns.find((c) => c.Field === col);
        if (found) {
          timeColumn = found.Field;
          break;
        }
      }
      // Если не нашли, ищем первую числовую колонку
      if (!timeColumn) {
        const numericColumn = columns.find((col) => {
          const type = col.Type.toLowerCase();
          return type.includes('int') || type.includes('bigint');
        });
        timeColumn = numericColumn?.Field || 'TimePlayed';
      }
    } catch (err) {
      console.warn('Could not get table structure:', err.message);
      timeColumn = 'TimePlayed';
    }

    let query = 'SELECT SteamID, SteamName, TimePlayed, FirstJoined FROM player';
    let countQuery = 'SELECT COUNT(*) as total FROM player';
    const params = [];
    const countParams = [];

    if (search) {
      const searchCondition = ' WHERE SteamID LIKE ? OR SteamName LIKE ?';
      query += searchCondition;
      countQuery += searchCondition;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
      countParams.push(searchPattern, searchPattern);
    }

    query += ` ORDER BY ${timeColumn || 'TimePlayed'} DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    console.log('🔍 Playtime query:', query);
    console.log('🔍 Playtime params:', params);

    const [leaderboard, countResult] = await Promise.all([
      db.query('iga', query, params),
      db.query('iga', countQuery, countParams),
    ]);

    const total = countResult[0]?.total || 0;

    res.json({
      data: leaderboard,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('Playtime leaderboard error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
