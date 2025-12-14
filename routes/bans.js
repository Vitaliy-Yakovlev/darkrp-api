/* eslint-env node */
import express from 'express';
import db from '../config/databases.js';

const router = express.Router();

// Get all bans - infamous_iga, player_bans
router.get('/', async (req, res) => {
  try {
    const { limit = 50, offset = 0, search } = req.query;

    let columns;
    let orderByColumn = null;

    try {
      columns = await db.query('iga', 'SHOW COLUMNS FROM player_bans');
      const possibleColumns = ['bid', 'ban_id', 'id', 'timestamp', 'date', 'time', 'created_at'];
      const foundColumn = columns.find((col) => possibleColumns.includes(col.Field.toLowerCase()));
      orderByColumn = foundColumn?.Field || columns[0]?.Field;
    } catch {
      // ORDER BY Time DESC
    }

    let query = `
      SELECT
        pb.*,
        p.SteamName as player_name,
        a.SteamName as admin_name
      FROM player_bans pb
      LEFT JOIN player p ON pb.SteamID = p.SteamID
      LEFT JOIN player a ON pb.A_SteamID = a.SteamID
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM player_bans';
    const params = [];
    const countParams = [];

    if (search) {
      const searchCondition =
        ' WHERE pb.SteamID LIKE ? OR pb.A_SteamID LIKE ? OR pb.Reason LIKE ? OR p.SteamName LIKE ? OR a.SteamName LIKE ?';
      query += searchCondition;
      countQuery += ' WHERE SteamID LIKE ? OR A_SteamID LIKE ? OR Reason LIKE ?';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
      countParams.push(searchPattern, searchPattern, searchPattern);
    }

    if (orderByColumn) {
      query += ` ORDER BY pb.${orderByColumn} DESC LIMIT ? OFFSET ?`;
    } else {
      query += ' ORDER BY pb.Time DESC LIMIT ? OFFSET ?';
    }
    params.push(parseInt(limit), parseInt(offset));

    console.log('🔍 Bans query:', query);
    console.log('🔍 Bans params:', params);

    let bans, countResult;
    try {
      [bans, countResult] = await Promise.all([
        db.query('iga', query, params),
        db.query('iga', countQuery, countParams),
      ]);
    } catch (queryError) {
      console.error('❌ JOIN query failed:', queryError.message);
      console.log('⚠️ Trying simple query without JOIN...');

      query = 'SELECT * FROM player_bans';
      countQuery = 'SELECT COUNT(*) as total FROM player_bans';
      const simpleParams = [];
      const simpleCountParams = [];

      if (search) {
        const searchCondition = ' WHERE SteamID LIKE ? OR A_SteamID LIKE ? OR Reason LIKE ?';
        query += searchCondition;
        countQuery += searchCondition;
        const searchPattern = `%${search}%`;
        simpleParams.push(searchPattern, searchPattern, searchPattern);
        simpleCountParams.push(searchPattern, searchPattern, searchPattern);
      }

      if (orderByColumn) {
        query += ` ORDER BY ${orderByColumn} DESC LIMIT ? OFFSET ?`;
      } else {
        query += ' ORDER BY Time DESC LIMIT ? OFFSET ?';
      }
      simpleParams.push(parseInt(limit), parseInt(offset));

      [bans, countResult] = await Promise.all([
        db.query('iga', query, simpleParams),
        db.query('iga', countQuery, simpleCountParams),
      ]);

      const bansWithNames = await Promise.all(
        bans.map(async (ban) => {
          const banWithNames = { ...ban };

          if (ban.SteamID && ban.SteamID !== 'CONSOLE') {
            try {
              const playerResult = await db.query('iga', 'SELECT SteamName FROM player WHERE SteamID = ? LIMIT 1', [
                ban.SteamID,
              ]);
              if (playerResult && playerResult.length > 0) {
                banWithNames.player_name = playerResult[0].SteamName;
              }
            } catch (err) {
              console.warn(`Could not fetch player name for ${ban.SteamID}:`, err.message);
            }
          }

          if (ban.A_SteamID && ban.A_SteamID !== 'CONSOLE') {
            try {
              const adminResult = await db.query('iga', 'SELECT SteamName FROM player WHERE SteamID = ? LIMIT 1', [
                ban.A_SteamID,
              ]);
              if (adminResult && adminResult.length > 0) {
                banWithNames.admin_name = adminResult[0].SteamName;
              }
            } catch (err) {
              console.warn(`Could not fetch admin name for ${ban.A_SteamID}:`, err.message);
            }
          }

          return banWithNames;
        })
      );

      bans = bansWithNames;
    }

    const total = countResult[0]?.total || 0;

    if (bans && bans.length > 0) {
      console.log('📊 First ban result keys:', Object.keys(bans[0]));
      console.log('📊 SteamID:', bans[0].SteamID);
      console.log('📊 A_SteamID:', bans[0].A_SteamID);
      console.log('📊 player_name:', bans[0].player_name);
      console.log('📊 admin_name:', bans[0].admin_name);
    }

    res.json({
      data: bans,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('❌ Bans API Error:', error.message);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

// Get ban by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let bans;
    try {
      bans = await db.query('iga', 'SELECT * FROM player_bans WHERE bid = ?', [id]);
    } catch {
      try {
        bans = await db.query('iga', 'SELECT * FROM player_bans WHERE ban_id = ?', [id]);
      } catch {
        bans = await db.query('iga', 'SELECT * FROM player_bans WHERE id = ?', [id]);
      }
    }
    res.json(bans[0] || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get bans by SteamID
router.get('/steamid/:steamId', async (req, res) => {
  try {
    const { steamId } = req.params;
    let query = 'SELECT * FROM player_bans WHERE steamid = ?';
    try {
      query += ' ORDER BY bid DESC';
    } catch {
      try {
        query += ' ORDER BY ban_id DESC';
      } catch {
        query += ' ORDER BY timestamp DESC';
      }
    }
    const bans = await db.query('iga', query, [steamId]);
    res.json(bans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
