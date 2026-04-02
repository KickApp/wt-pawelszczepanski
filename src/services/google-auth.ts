import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { config } from '../config';

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
];

function loadCredentials(): Record<string, unknown> {
  if (config.googleSaKeyJson) {
    return JSON.parse(config.googleSaKeyJson);
  }

  if (config.googleSaKeyPath) {
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

export function getDriveClient() {
  return google.drive({ version: 'v3', auth: getGoogleAuth() });
}
