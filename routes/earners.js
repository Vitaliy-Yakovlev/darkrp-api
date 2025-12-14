/* eslint-env node */
import express from 'express';
import db from '../config/databases.js';

const router = express.Router();

// Get all earners - infamous_darkrp, darkrp_player
router.get('/', async (req, res) => {
  try {
    if (db.connectionStatus?.darkrp !== 'connected') {
      return res.status(503).json({
        error: 'Database "infamous_darkrp" is not available. Please check connection and permissions.',
        details: db.connectionStatus?.darkrp || 'Connection status unknown',
      });
    }

    const { limit = 50, offset = 0, search } = req.query;

    let moneyColumn = null;
    let nameColumn = null;
    let steamIdColumn = null;

    try {
      const columns = await db.query('darkrp', 'SHOW COLUMNS FROM darkrp_player');

      const possibleMoneyColumns = ['money', 'total_money', 'earned', 'wallet', 'cash', 'total'];
      for (const col of possibleMoneyColumns) {
        const found = columns.find((c) => c.Field.toLowerCase() === col);
        if (found) {
          moneyColumn = found.Field;
          break;
        }
      }

      const possibleNameColumns = ['name', 'playername', 'nickname', 'username'];
      for (const col of possibleNameColumns) {
        const found = columns.find((c) => c.Field.toLowerCase() === col);
        if (found) {
          nameColumn = found.Field;
          break;
        }
      }

      const possibleSteamIdColumns = ['steamid', 'steam_id', 'steamid64'];
      for (const col of possibleSteamIdColumns) {
        const found = columns.find((c) => c.Field.toLowerCase() === col);
        if (found) {
          steamIdColumn = found.Field;
          break;
        }
      }

      console.log('📊 Found columns:', { moneyColumn, nameColumn, steamIdColumn });
      console.log(
        '📊 All columns:',
        columns.map((c) => c.Field)
      );
    } catch (err) {
      console.warn('⚠️ Could not get table structure:', err.message);
    }

    if (!moneyColumn) {
      try {
        const columns = await db.query('darkrp', 'SHOW COLUMNS FROM darkrp_player');
        const numericColumn = columns.find((col) => {
          const type = col.Type.toLowerCase();
          return type.includes('int') || type.includes('decimal') || type.includes('float');
        });
        moneyColumn = numericColumn?.Field || columns[0]?.Field || 'id';
        console.warn(`⚠️ Using fallback column for money: ${moneyColumn}`);
      } catch {
        moneyColumn = 'id';
      }
    }

    let query = 'SELECT * FROM darkrp_player';
    let countQuery = 'SELECT COUNT(*) as total FROM darkrp_player';
    const params = [];
    const countParams = [];

    if (search) {
      const searchConditions = [];
      if (steamIdColumn) {
        searchConditions.push(`${steamIdColumn} LIKE ?`);
        params.push(`%${search}%`);
        countParams.push(`%${search}%`);
      }
      if (nameColumn) {
        searchConditions.push(`${nameColumn} LIKE ?`);
        params.push(`%${search}%`);
        countParams.push(`%${search}%`);
      }

      if (searchConditions.length > 0) {
        const searchCondition = ` WHERE ${searchConditions.join(' OR ')}`;
        query += searchCondition;
        countQuery += searchCondition;
      }
    }

    query += ` ORDER BY ${moneyColumn} DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    console.log('🔍 Earners query:', query);
    console.log('🔍 Earners params:', params);

    const [earners, countResult] = await Promise.all([
      db.query('darkrp', query, params),
      db.query('darkrp', countQuery, countParams),
    ]);

    const total = countResult[0]?.total || 0;

    if (earners && earners.length > 0) {
      console.log('📊 First earner result keys:', Object.keys(earners[0]));
      console.log('📊 First earner data:', JSON.stringify(earners[0], null, 2));
    }

    res.json({
      data: earners,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('❌ Earners API Error:', error.message);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

// Get earner by SteamID
router.get('/steamid/:steamId', async (req, res) => {
  try {
    if (db.connectionStatus?.darkrp !== 'connected') {
      return res.status(503).json({
        error: 'Database "infamous_darkrp" is not available. Please check connection and permissions.',
        details: db.connectionStatus?.darkrp || 'Connection status unknown',
      });
    }

    const { steamId } = req.params;
    const earner = await db.query('darkrp', 'SELECT * FROM darkrp_player WHERE SteamID = ?', [steamId]);
    res.json(earner[0] || null);
  } catch (error) {
    console.error('❌ Get earner by SteamID error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
