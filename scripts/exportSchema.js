/* eslint-env node */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { findTableRelations, getDatabaseSchema } from '../utils/dbSchema.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function exportSchema() {
  try {
    console.log('🚀 Начало экспорта схемы базы данных...\n');

    const dbConfig = {
      iga: 'infamous_iga',
      tokens: 'Infamous_token',
      server: 'infamous_server',
      darkrp: 'infamous_darkrp',
    };

    const allSchemas = {};

    for (const [key, dbName] of Object.entries(dbConfig)) {
      try {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📊 База данных: ${dbName} (ключ: ${key})`);
        console.log('='.repeat(60));

        const schema = await getDatabaseSchema(key);
        const relations = await findTableRelations(key);

        allSchemas[dbName] = {
          schema,
          relations,
        };
      } catch (error) {
        console.error(`❌ Ошибка для базы ${dbName}:`, error.message);
        allSchemas[dbName] = { error: error.message };
      }
    }

    const outputPath = path.join(__dirname, '../../database-schema.json');
    fs.writeFileSync(outputPath, JSON.stringify(allSchemas, null, 2), 'utf8');

    console.log(`\n✅ Схема сохранена в: ${outputPath}`);
    console.log('\n📋 Скопируйте содержимое этого файла и отправьте мне для анализа.\n');
  } catch (error) {
    console.error('❌ Ошибка экспорта:', error.message);
    process.exit(1);
  }
}

exportSchema();
