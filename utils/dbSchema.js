/* eslint-env node */
import db from '../config/databases.js';

export const getDatabaseSchema = async (dbName = 'iga') => {
  try {
    const realDbName = db.databases[dbName]?.database || dbName;

    console.log(`\n📊 ===== СТРУКТУРА БАЗЫ ДАННЫХ: ${realDbName} (ключ: ${dbName}) =====\n`);

    const tables = await db.query(dbName, 'SHOW TABLES');
    const tableNames = tables.map((row) => Object.values(row)[0]);

    console.log(`📋 Найдено таблиц: ${tableNames.length}\n`);

    const schema = {
      database: realDbName,
      databaseKey: dbName,
      tables: {},
    };

    for (const tableName of tableNames) {
      console.log(`\n🔍 Таблица: ${tableName}`);
      console.log('─'.repeat(50));

      const columns = await db.query(dbName, `SHOW COLUMNS FROM ${tableName}`);
      const indexes = await db.query(dbName, `SHOW INDEXES FROM ${tableName}`);
      const createTable = await db.query(dbName, `SHOW CREATE TABLE ${tableName}`);

      const tableInfo = {
        name: tableName,
        columns: columns.map((col) => ({
          field: col.Field,
          type: col.Type,
          null: col.Null,
          key: col.Key,
          default: col.Default,
          extra: col.Extra,
        })),
        indexes: indexes.map((idx) => ({
          keyName: idx.Key_name,
          columnName: idx.Column_name,
          nonUnique: idx.Non_unique,
          seqInIndex: idx.Seq_in_index,
        })),
        createStatement: createTable[0]?.['Create Table'] || null,
      };

      schema.tables[tableName] = tableInfo;

      console.log('Колонки:');
      columns.forEach((col) => {
        const keyInfo = col.Key ? ` [${col.Key}]` : '';
        const nullInfo = col.Null === 'YES' ? ' NULL' : ' NOT NULL';
        console.log(`  - ${col.Field}: ${col.Type}${nullInfo}${keyInfo}`);
        if (col.Default !== null) {
          console.log(`    Default: ${col.Default}`);
        }
      });

      if (indexes.length > 0) {
        console.log('\nИндексы:');
        const uniqueIndexes = {};
        indexes.forEach((idx) => {
          if (!uniqueIndexes[idx.Key_name]) {
            uniqueIndexes[idx.Key_name] = [];
          }
          uniqueIndexes[idx.Key_name].push(idx.Column_name);
        });
        Object.keys(uniqueIndexes).forEach((keyName) => {
          const isUnique = indexes.find((idx) => idx.Key_name === keyName)?.Non_unique === 0;
          console.log(`  - ${keyName} (${isUnique ? 'UNIQUE' : 'INDEX'}): ${uniqueIndexes[keyName].join(', ')}`);
        });
      }

      try {
        const foreignKeys = await db.query(
          dbName,
          `
          SELECT
            CONSTRAINT_NAME,
            COLUMN_NAME,
            REFERENCED_TABLE_NAME,
            REFERENCED_COLUMN_NAME
          FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
          WHERE TABLE_SCHEMA = ?
            AND TABLE_NAME = ?
            AND REFERENCED_TABLE_NAME IS NOT NULL
          `,
          [dbName, tableName]
        );

        if (foreignKeys.length > 0) {
          console.log('\nВнешние ключи (Foreign Keys):');
          foreignKeys.forEach((fk) => {
            console.log(`  - ${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
          });
        }
      } catch {
        // Ignore errors
      }
    }

    return schema;
  } catch (error) {
    console.error('❌ Error getting database schema:', error.message);
    throw error;
  }
};

export const getTableInfo = async (dbName, tableName) => {
  try {
    const columns = await db.query(dbName, `SHOW COLUMNS FROM ${tableName}`);
    const sampleData = await db.query(dbName, `SELECT * FROM ${tableName} LIMIT 5`);

    return {
      tableName,
      columns: columns.map((col) => ({
        field: col.Field,
        type: col.Type,
        null: col.Null,
        key: col.Key,
        default: col.Default,
      })),
      sampleData: sampleData,
    };
  } catch (error) {
    console.error(`❌ Error getting table info for ${tableName}:`, error.message);
    throw error;
  }
};

export const findTableRelations = async (dbName) => {
  try {
    const tables = await db.query(dbName, 'SHOW TABLES');
    const tableNames = tables.map((row) => Object.values(row)[0]);

    const relations = [];

    for (let i = 0; i < tableNames.length; i++) {
      for (let j = i + 1; j < tableNames.length; j++) {
        const table1 = tableNames[i];
        const table2 = tableNames[j];

        const cols1 = await db.query(dbName, `SHOW COLUMNS FROM ${table1}`);
        const cols2 = await db.query(dbName, `SHOW COLUMNS FROM ${table2}`);

        const fields1 = cols1.map((c) => c.Field.toLowerCase());
        const fields2 = cols2.map((c) => c.Field.toLowerCase());

        const commonFields = fields1.filter((f) => fields2.includes(f));

        if (commonFields.length > 0) {
          relations.push({
            table1,
            table2,
            commonFields,
          });
        }
      }
    }

    relations.forEach((rel) => {
      console.log(`${rel.table1} <-> ${rel.table2}`);
      console.log(`  Common fields: ${rel.commonFields.join(', ')}\n`);
    });

    return relations;
  } catch (error) {
    console.error('❌ Error finding table relations:', error.message);
    throw error;
  }
};
