import 'dotenv/config';
import type { Knex } from 'knex';

const dbSsl = process.env.DB_SSL === 'true';

const config: Knex.Config = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'accounting',
    user: process.env.DB_USER || 'app',
    password: process.env.DB_PASSWORD || 'devpassword',
    ssl: dbSsl ? { rejectUnauthorized: false } : false,
  },
  migrations: {
    directory: './src/db/migrations',
    extension: 'ts',
  },
  pool: {
    min: 2,
    max: 10,
  },
};

export default config;
