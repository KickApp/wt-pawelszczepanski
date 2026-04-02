import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'accounting',
    user: process.env.DB_USER || 'app',
    password: process.env.DB_PASSWORD || 'devpassword',
    ssl: process.env.DB_SSL === 'true',
  },
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  googleSaKeyPath: process.env.GOOGLE_SA_KEY_PATH,
  googleSaKeyJson: process.env.GOOGLE_SA_KEY_JSON,
};
