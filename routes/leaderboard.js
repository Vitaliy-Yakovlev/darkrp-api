/* eslint-env node */
import express from 'express';
import db from '../config/databases.js';

const router = express.Router();

// Token Leaderboard - infamous_darkrp, darkrp_player
router.get('/tokens', async (req, res) => {
  try {
    const { limit = 50, offset = 0, search } = req.query;

    let columns = [];
    try {
      columns = await db.query('darkrp', 'SHOW COLUMNS FROM darkrp_player');
      console.log('📊 Available columns:', columns.map((c) => c.Field));
    } catch (err) {
      console.warn('Could not get table structure:', err.message);
    }

    const tokensColumn = columns.find((col) =>
      ['wallet', 'tokens', 'token', 'roasts_tokens', 'roast_tokens', 'money'].includes(col.Field.toLowerCase())
    )?.Field || 'wallet';

    const idColumn = columns.find((col) =>
      ['uid', 'id', 'steamid', 'steam_id', 'steamid64'].includes(col.Field.toLowerCase())
    )?.Field || 'uid';

    const nameColumn = columns.find((col) =>
      ['rpname', 'name', 'playername', 'nickname', 'username', 'steamname'].includes(col.Field.toLowerCase())
    )?.Field || 'rpname';

    let query = `SELECT * FROM darkrp_player`;
    let countQuery = 'SELECT COUNT(*) as total FROM darkrp_player';
    const params = [];
    const countParams = [];

    if (search) {
      const searchConditions = [];
      if (idColumn) {
        searchConditions.push(`${idColumn} LIKE ?`);
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

    query += ` ORDER BY ${tokensColumn} DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    console.log('🔍 Tokens query:', query);
    console.log('🔍 Tokens params:', params);
    console.log('🔍 Using columns:', { tokensColumn, idColumn, nameColumn });

    const [leaderboard, countResult] = await Promise.all([
      db.query('darkrp', query, params),
      db.query('darkrp', countQuery, countParams),
    ]);

    const total = countResult[0]?.total || 0;

    console.log('📊 First result:', leaderboard[0]);

    res.json({
      data: leaderboard,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('Tokens leaderboard error:', error.message);
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
    const { limit = 50, offset = 0, search } = req.query;

    // Определяем структуру таблицы
    let columns = [];
    try {
      columns = await db.query('darkrp', 'SHOW COLUMNS FROM event_winners');
    } catch (err) {
      console.warn('Could not get table structure:', err.message);
    }

    // Ищем колонки для SteamID и имени игрока
    const steamIdColumn = columns.find((col) =>
      ['steamid', 'steam_id', 'steamid64'].includes(col.Field.toLowerCase())
    )?.Field || 'steamid';

    const nameColumn = columns.find((col) =>
      ['name', 'playername', 'nickname', 'username', 'steamname'].includes(col.Field.toLowerCase())
    )?.Field || 'name';

    // Определяем колонку для сортировки (prize для побед)
    const winsColumn = columns.find((col) =>
      ['prize', 'wins', 'win_count', 'total_wins'].includes(col.Field.toLowerCase())
    )?.Field || 'prize';

    // Формируем SELECT запрос - выбираем все доступные поля
    let query = `SELECT * FROM event_winners`;
    let countQuery = 'SELECT COUNT(*) as total FROM event_winners';
    const params = [];
    const countParams = [];

    // Добавляем поиск
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

    // Добавляем сортировку и пагинацию
    const orderByColumn = winsColumn || 'prize';
    query += ` ORDER BY ${orderByColumn} DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    console.log('🔍 Events query:', query);
    console.log('🔍 Events params:', params);

    const [leaderboard, countResult] = await Promise.all([
      db.query('darkrp', query, params),
      db.query('darkrp', countQuery, countParams),
    ]);

    const total = countResult[0]?.total || 0;

    res.json({
      data: leaderboard,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('Events leaderboard error:', error.message);
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
