import fs from 'fs';
import path from 'path';
import express from 'express';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import { logger } from './logger';
import { errorHandler } from './middleware/error-handler';
import accountsRoutes from './routes/accounts.routes';
import journalEntriesRoutes from './routes/journal-entries.routes';
import reportsRoutes from './routes/reports.routes';
import exportRoutes from './routes/export.routes';
import * as ingestController from './controllers/ingest.controller';

const specPath = path.join(__dirname, '..', 'openapi.yaml');
const spec = YAML.parse(fs.readFileSync(specPath, 'utf8'));

const app = express();

app.use(express.json());
app.use(pinoHttp({ logger }));

// OpenAPI docs — served from static openapi.yaml (source of truth)
app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
app.get('/openapi.json', (_req, res) => res.json(spec));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/accounts', accountsRoutes);
app.use('/api/journal-entries', journalEntriesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/export', exportRoutes);
app.post('/api/ingest', ingestController.ingest);

// Error handler
app.use(errorHandler);

export default app;
