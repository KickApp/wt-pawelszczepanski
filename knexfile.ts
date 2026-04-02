import 'dotenv/config';
import type { Knex } from 'knex';

const config: Knex.Config = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'accounting',
    user: process.env.DB_USER || 'app',
    password: process.env.DB_PASSWORD || 'devpassword',
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
