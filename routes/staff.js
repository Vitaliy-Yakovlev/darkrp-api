/* eslint-env node */
import express from 'express';
import db from '../config/databases.js';

const router = express.Router();

// Get all staff - infamous_iga, od_times
router.get('/', async (req, res) => {
  try {
    const { limit = 50, offset = 0, search } = req.query;

    let query = `
      SELECT
        ot.*,
        p.SteamName as player_name,
        p.Rank as rank,
        p.TimePlayed as time_played,
        p.FirstJoined as first_joined
      FROM od_times ot
      LEFT JOIN player p ON ot.SteamID = p.SteamID
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM od_times';
    const params = [];
    const countParams = [];

    if (search) {
      const searchCondition = ' WHERE ot.SteamID LIKE ? OR p.SteamName LIKE ?';
      query += searchCondition;
      countQuery += ' WHERE SteamID LIKE ?';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
      countParams.push(searchPattern);
    }

    query += ' ORDER BY ot.Minutes DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    console.log('🔍 Staff query:', query);
    console.log('🔍 Staff params:', params);

    let staff, countResult;
    try {
      [staff, countResult] = await Promise.all([
        db.query('iga', query, params),
        db.query('iga', countQuery, countParams),
      ]);
    } catch (queryError) {
      console.error('❌ JOIN query failed:', queryError.message);
      console.log('⚠️ Trying simple query without JOIN...');

      // Fallback на простой запрос без JOIN
      query = 'SELECT * FROM od_times';
      countQuery = 'SELECT COUNT(*) as total FROM od_times';
      const simpleParams = [];
      const simpleCountParams = [];

      if (search) {
        const searchCondition = ' WHERE SteamID LIKE ?';
        query += searchCondition;
        countQuery += searchCondition;
        const searchPattern = `%${search}%`;
        simpleParams.push(searchPattern);
        simpleCountParams.push(searchPattern);
      }

      query += ' ORDER BY Minutes DESC LIMIT ? OFFSET ?';
      simpleParams.push(parseInt(limit), parseInt(offset));

      [staff, countResult] = await Promise.all([
        db.query('iga', query, simpleParams),
        db.query('iga', countQuery, simpleCountParams),
      ]);

      const staffWithNames = await Promise.all(
        staff.map(async (staffMember) => {
          const staffWithName = { ...staffMember };

          if (staffMember.SteamID && staffMember.SteamID !== 'CONSOLE') {
            try {
              const playerResult = await db.query('iga', 'SELECT SteamName FROM player WHERE SteamID = ? LIMIT 1', [
                staffMember.SteamID,
              ]);
              if (playerResult && playerResult.length > 0) {
                staffWithName.player_name = playerResult[0].SteamName;
              }
            } catch (err) {
              console.warn(`Could not fetch player name for ${staffMember.SteamID}:`, err.message);
            }
          }

          return staffWithName;
        })
      );

      staff = staffWithNames;
    }

    const total = countResult[0]?.total || 0;

    if (staff && staff.length > 0) {
      console.log('📊 First staff result keys:', Object.keys(staff[0]));
      console.log('📊 SteamID:', staff[0].SteamID);
      console.log('📊 player_name:', staff[0].player_name);
      console.log('📊 Minutes:', staff[0].Minutes);
    }

    res.json({
      data: staff,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('❌ Staff API Error:', error.message);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

// Get staff by SteamID
router.get('/steamid/:steamId', async (req, res) => {
  try {
    const { steamId } = req.params;
    const staff = await db.query('iga', 'SELECT * FROM od_times WHERE SteamID = ?', [steamId]);
    res.json(staff[0] || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
