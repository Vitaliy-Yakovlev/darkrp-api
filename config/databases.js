/* eslint-env node */
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const databases = {
  tokens: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'infamous_token',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  },
  iga: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'infamous_iga',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  },
  server: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'infamous_server',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  },
  darkrp: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'infamous_darkrp',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000,
  },
};

const pools = {};
const connectionStatus = {};

Object.keys(databases).forEach((key) => {
  pools[key] = mysql.createPool(databases[key]);

  pools[key]
    .getConnection()
    .then((connection) => {
      console.log(`✅ Database "${databases[key].database}" connected successfully`);
      connectionStatus[key] = 'connected';
      connection.release();
    })
    .catch((error) => {
      console.error(`❌ Database "${databases[key].database}" connection error:`, error.message);
      connectionStatus[key] = 'error';
      console.warn(`⚠️  API endpoints for "${key}" database will not work until connection is fixed`);
    });
});

const query = async (dbName, sql, params) => {
  if (!pools[dbName]) {
    throw new Error(`Database pool "${dbName}" not found`);
  }

  try {
    const [results] = await pools[dbName].execute(sql, params);
    return results;
  } catch (error) {
    console.error(`Database query error (${dbName}):`, error);
    throw error;
  }
};

export default {
  query,
  pools,
  databases,
  connectionStatus,
};
