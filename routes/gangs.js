/* eslint-env node */
import express from 'express';
import db from '../config/databases.js';

const router = express.Router();

// Get all gangs - infamous_server, gangs
router.get('/', async (req, res) => {
  try {
    const { limit = 50, offset = 0, search } = req.query;

    let query = 'SELECT * FROM gangs';
    let countQuery = 'SELECT COUNT(*) as total FROM gangs';
    const params = [];
    const countParams = [];

    if (search) {
      const searchCondition = ' WHERE name LIKE ?';
      query += searchCondition;
      countQuery += searchCondition;
      const searchPattern = `%${search}%`;
      params.push(searchPattern);
      countParams.push(searchPattern);
    }

    let orderByColumn = 'id';
    try {
      const columns = await db.query('server', 'SHOW COLUMNS FROM gangs');
      const possibleColumns = ['id', 'elo', 'prestige', 'level', 'power', 'credits', 'members'];
      const foundColumn = columns.find((col) => possibleColumns.includes(col.Field.toLowerCase()));
      orderByColumn = foundColumn?.Field || columns[0]?.Field || 'id';
    } catch {
      // Use default value
    }

    query += ` ORDER BY ${orderByColumn} DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    console.log('🔍 Gangs query:', query);
    console.log('🔍 Gangs params:', params);

    const [gangs, countResult] = await Promise.all([
      db.query('server', query, params),
      db.query('server', countQuery, countParams),
    ]);

    const total = countResult[0]?.total || 0;

    if (gangs && gangs.length > 0) {
      console.log('📊 First gang result keys:', Object.keys(gangs[0]));
      console.log('📊 First gang:', gangs[0]);
    }

    res.json({
      data: gangs,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('❌ Gangs API Error:', error.message);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

// Get gang by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const gangs = await db.query('server', 'SELECT * FROM gangs WHERE id = ?', [id]);
    res.json(gangs[0] || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
