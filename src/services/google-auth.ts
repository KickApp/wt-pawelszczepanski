import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { config } from '../config';
import { logger } from '../logger';

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
];

function loadCredentials(): Record<string, unknown> {
  if (config.googleSaKeyJson) {
    logger.debug('Loading Google credentials from GOOGLE_SA_KEY_JSON env var');
    return JSON.parse(config.googleSaKeyJson);
  }

  if (config.googleSaKeyPath) {
    logger.debug({ path: config.googleSaKeyPath }, 'Loading Google credentials from file');
    const raw = readFileSync(config.googleSaKeyPath, 'utf-8');
    return JSON.parse(raw);
  }

  throw new Error(
    'Google credentials not configured. Set GOOGLE_SA_KEY_PATH or GOOGLE_SA_KEY_JSON.',
  );
}

let authInstance: InstanceType<typeof google.auth.GoogleAuth> | null = null;

export function getGoogleAuth() {
  if (!authInstance) {
    const credentials = loadCredentials();
    logger.info(
      { clientEmail: credentials.client_email, projectId: credentials.project_id },
      'Initializing Google Auth',
    );
    authInstance = new google.auth.GoogleAuth({
      credentials: credentials as any,
      scopes: SCOPES,
    });
  }
  return authInstance;
}

export function getSheetsClient() {
  return google.sheets({ version: 'v4', auth: getGoogleAuth() });
}


