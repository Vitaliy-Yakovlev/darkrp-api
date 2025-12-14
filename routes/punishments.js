/* eslint-env node */
import express from 'express';
import db from '../config/databases.js';

const router = express.Router();

// Get all punishments - infamous_iga, player_punishments
router.get('/', async (req, res) => {
  try {
    const { limit = 50, offset = 0, search } = req.query;

    let query = `
      SELECT
        pp.*,
        p.SteamName as player_name,
        a.SteamName as admin_name
      FROM player_punishments pp
      LEFT JOIN player p ON pp.SteamID = p.SteamID
      LEFT JOIN player a ON pp.A_SteamID = a.SteamID
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM player_punishments';
    const params = [];
    const countParams = [];

    if (search) {
      const searchCondition =
        ' WHERE pp.SteamID LIKE ? OR pp.A_SteamID LIKE ? OR pp.Reason LIKE ? OR pp.Punishment LIKE ? OR p.SteamName LIKE ? OR a.SteamName LIKE ?';
      query += searchCondition;
      countQuery += ' WHERE SteamID LIKE ? OR A_SteamID LIKE ? OR Reason LIKE ? OR Punishment LIKE ?';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
      countParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    query += ' ORDER BY pp.Time DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    console.log('🔍 Punishments query:', query);
    console.log('🔍 Punishments params:', params);

    let punishments, countResult;
    try {
      [punishments, countResult] = await Promise.all([
        db.query('iga', query, params),
        db.query('iga', countQuery, countParams),
      ]);
    } catch (queryError) {
      console.error('❌ JOIN query failed:', queryError.message);
      console.log('⚠️ Trying simple query without JOIN...');

      query = 'SELECT * FROM player_punishments';
      countQuery = 'SELECT COUNT(*) as total FROM player_punishments';
      const simpleParams = [];
      const simpleCountParams = [];

      if (search) {
        const searchCondition = ' WHERE SteamID LIKE ? OR A_SteamID LIKE ? OR Reason LIKE ? OR Punishment LIKE ?';
        query += searchCondition;
        countQuery += searchCondition;
        const searchPattern = `%${search}%`;
        simpleParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
        simpleCountParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }

      query += ' ORDER BY Time DESC LIMIT ? OFFSET ?';
      simpleParams.push(parseInt(limit), parseInt(offset));

      [punishments, countResult] = await Promise.all([
        db.query('iga', query, simpleParams),
        db.query('iga', countQuery, simpleCountParams),
      ]);

      const punishmentsWithNames = await Promise.all(
        punishments.map(async (punishment) => {
          const punishmentWithNames = { ...punishment };

          if (punishment.SteamID && punishment.SteamID !== 'CONSOLE') {
            try {
              const playerResult = await db.query('iga', 'SELECT SteamName FROM player WHERE SteamID = ? LIMIT 1', [
                punishment.SteamID,
              ]);
              if (playerResult && playerResult.length > 0) {
                punishmentWithNames.player_name = playerResult[0].SteamName;
              }
            } catch (err) {
              console.warn(`Could not fetch player name for ${punishment.SteamID}:`, err.message);
            }
          }

          if (punishment.A_SteamID && punishment.A_SteamID !== 'CONSOLE') {
            try {
              const adminResult = await db.query('iga', 'SELECT SteamName FROM player WHERE SteamID = ? LIMIT 1', [
                punishment.A_SteamID,
              ]);
              if (adminResult && adminResult.length > 0) {
                punishmentWithNames.admin_name = adminResult[0].SteamName;
              }
            } catch (err) {
              console.warn(`Could not fetch admin name for ${punishment.A_SteamID}:`, err.message);
            }
          }

          return punishmentWithNames;
        })
      );

      punishments = punishmentsWithNames;
    }

    const total = countResult[0]?.total || 0;

    if (punishments && punishments.length > 0) {
      console.log('📊 First punishment result keys:', Object.keys(punishments[0]));
      console.log('📊 SteamID:', punishments[0].SteamID);
      console.log('📊 A_SteamID:', punishments[0].A_SteamID);
      console.log('📊 player_name:', punishments[0].player_name);
      console.log('📊 admin_name:', punishments[0].admin_name);
    }

    res.json({
      data: punishments,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('❌ Punishments API Error:', error.message);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

// Get punishment by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const punishments = await db.query('iga', 'SELECT * FROM player_punishments WHERE id = ?', [id]);
    res.json(punishments[0] || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get punishments by SteamID
router.get('/steamid/:steamId', async (req, res) => {
  try {
    const { steamId } = req.params;
    const punishments = await db.query('iga', 'SELECT * FROM player_punishments WHERE steamid = ? ORDER BY Time DESC', [
      steamId,
    ]);
    res.json(punishments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
