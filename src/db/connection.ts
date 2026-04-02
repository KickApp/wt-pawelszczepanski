import knex from 'knex';
import { config } from '../config';

export const db = knex({
  client: 'pg',
  connection: {
    host: config.db.host,
    port: config.db.port,
    database: config.db.name,
    user: config.db.user,
    password: config.db.password,
    ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
  },
  pool: { min: 2, max: 10 },
});
