import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();

const parseEnvFile = content => {
  const result = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const equalIndex = line.indexOf('=');
    if (equalIndex <= 0) {
      continue;
    }
    const key = line.slice(0, equalIndex).trim();
    const value = line.slice(equalIndex + 1).trim();
    result[key] = value;
  }
  return result;
};

const isValidHttpUrl = value => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const toPositiveInt = value => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.round(parsed);
};

const envPath = path.join(cwd, '.env');
const exampleEnvPath = path.join(cwd, '.env.example');

const envSourcePath = fs.existsSync(envPath) ? envPath : exampleEnvPath;
if (!fs.existsSync(envSourcePath)) {
  console.error('[invoice-ocr preflight] Missing .env and .env.example');
  process.exit(1);
}

const envVars = parseEnvFile(fs.readFileSync(envSourcePath, 'utf8'));
const errors = [];
const warnings = [];

const webhookUrl = envVars.VITE_INVOICE_OCR_WEBHOOK_URL;
const workflowId = envVars.VITE_INVOICE_OCR_WORKFLOW_ID;
const pollInterval = envVars.VITE_INVOICE_OCR_POLL_INTERVAL_MS;
const pollTimeout = envVars.VITE_INVOICE_OCR_POLL_TIMEOUT_MS;
const uploadChunkSize = envVars.VITE_INVOICE_OCR_UPLOAD_CHUNK_SIZE;
const webhookSignatureSecret =
  envVars.VITE_INVOICE_OCR_WEBHOOK_SIGNATURE_SECRET;
const webhookSignatureStrict =
  envVars.VITE_INVOICE_OCR_WEBHOOK_SIGNATURE_STRICT;
const queueConcurrency = envVars.VITE_INVOICE_OCR_QUEUE_CONCURRENCY;
const queueLeaseTimeoutMs = envVars.VITE_INVOICE_OCR_QUEUE_LEASE_TIMEOUT_MS;
const alertQuietWindowMinutes =
  envVars.VITE_INVOICE_OCR_ALERT_QUIET_WINDOW_MINUTES;
const diagnosticsArchiveIntervalMs =
  envVars.VITE_INVOICE_OCR_DIAGNOSTICS_ARCHIVE_INTERVAL_MS;
const manualCorrectionRoles =
  envVars.VITE_INVOICE_OCR_MANUAL_CORRECTION_ROLES;
const telemetryEndpoint = envVars.VITE_INVOICE_OCR_TELEMETRY_ENDPOINT;
const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!webhookUrl) {
  warnings.push(
    'VITE_INVOICE_OCR_WEBHOOK_URL is not set. App will fallback to built-in default.'
  );
} else if (!isValidHttpUrl(webhookUrl)) {
  errors.push('VITE_INVOICE_OCR_WEBHOOK_URL is invalid.');
}

if (!workflowId) {
  warnings.push(
    'VITE_INVOICE_OCR_WORKFLOW_ID is not set. App will fallback to default-workflow.'
  );
}

if (pollInterval) {
  const normalized = toPositiveInt(pollInterval);
  if (!normalized) {
    errors.push('VITE_INVOICE_OCR_POLL_INTERVAL_MS must be a positive integer.');
  }
}

if (pollTimeout) {
  const normalized = toPositiveInt(pollTimeout);
  if (!normalized) {
    errors.push('VITE_INVOICE_OCR_POLL_TIMEOUT_MS must be a positive integer.');
  }
}

if (pollInterval && pollTimeout) {
  const intervalMs = toPositiveInt(pollInterval);
  const timeoutMs = toPositiveInt(pollTimeout);
  if (intervalMs && timeoutMs && timeoutMs <= intervalMs) {
    errors.push(
      'VITE_INVOICE_OCR_POLL_TIMEOUT_MS must be greater than VITE_INVOICE_OCR_POLL_INTERVAL_MS.'
    );
  }
}

if (uploadChunkSize) {
  const normalized = toPositiveInt(uploadChunkSize);
  if (!normalized) {
    errors.push(
      'VITE_INVOICE_OCR_UPLOAD_CHUNK_SIZE must be a positive integer.'
    );
  } else if (normalized > 50) {
    errors.push('VITE_INVOICE_OCR_UPLOAD_CHUNK_SIZE must be <= 50.');
  }
}

if (webhookSignatureStrict === 'true' && !webhookSignatureSecret) {
  errors.push(
    'VITE_INVOICE_OCR_WEBHOOK_SIGNATURE_SECRET is required when strict signature verification is enabled.'
  );
}

if (queueConcurrency) {
  const normalized = toPositiveInt(queueConcurrency);
  if (!normalized) {
    errors.push('VITE_INVOICE_OCR_QUEUE_CONCURRENCY must be a positive integer.');
  } else if (normalized > 20) {
    errors.push('VITE_INVOICE_OCR_QUEUE_CONCURRENCY must be <= 20.');
  }
}

if (queueLeaseTimeoutMs) {
  const normalized = toPositiveInt(queueLeaseTimeoutMs);
  if (!normalized) {
    errors.push(
      'VITE_INVOICE_OCR_QUEUE_LEASE_TIMEOUT_MS must be a positive integer.'
    );
  } else if (normalized < 30000) {
    errors.push('VITE_INVOICE_OCR_QUEUE_LEASE_TIMEOUT_MS must be >= 30000.');
  }
}

if (alertQuietWindowMinutes) {
  const normalized = toPositiveInt(alertQuietWindowMinutes);
  if (!normalized) {
    errors.push(
      'VITE_INVOICE_OCR_ALERT_QUIET_WINDOW_MINUTES must be a positive integer.'
    );
  } else if (normalized > 1440) {
    errors.push(
      'VITE_INVOICE_OCR_ALERT_QUIET_WINDOW_MINUTES must be <= 1440.'
    );
  }
}

if (diagnosticsArchiveIntervalMs) {
  const normalized = toPositiveInt(diagnosticsArchiveIntervalMs);
  if (!normalized) {
    errors.push(
      'VITE_INVOICE_OCR_DIAGNOSTICS_ARCHIVE_INTERVAL_MS must be a positive integer.'
    );
  } else if (normalized < 60000) {
    errors.push(
      'VITE_INVOICE_OCR_DIAGNOSTICS_ARCHIVE_INTERVAL_MS must be >= 60000.'
    );
  }
}

if (manualCorrectionRoles) {
  const normalized = manualCorrectionRoles
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
  if (normalized.length === 0) {
    errors.push('VITE_INVOICE_OCR_MANUAL_CORRECTION_ROLES must not be empty.');
  }
}

if (telemetryEndpoint && !isValidHttpUrl(telemetryEndpoint)) {
  errors.push('VITE_INVOICE_OCR_TELEMETRY_ENDPOINT must be a valid HTTP/HTTPS URL.');
}

if (!supabaseUrl || !supabaseAnonKey) {
  warnings.push(
    'Supabase env vars are incomplete. OCR flow can run, but cross-module sync may be degraded.'
  );
}

const runtimeConfigPath = path.join(cwd, 'public', 'runtime-config.js');
if (!fs.existsSync(runtimeConfigPath)) {
  warnings.push('public/runtime-config.js is missing.');
}

console.log('[invoice-ocr preflight] Source:', envSourcePath);
console.log(
  '[invoice-ocr preflight] webhook:',
  webhookUrl ? 'configured' : 'fallback default'
);
console.log(
  '[invoice-ocr preflight] workflow:',
  workflowId ? workflowId : 'fallback default-workflow'
);

for (const warning of warnings) {
  console.warn('[invoice-ocr preflight][warning]', warning);
}

for (const error of errors) {
  console.error('[invoice-ocr preflight][error]', error);
}

if (errors.length > 0) {
  process.exit(1);
}

console.log('[invoice-ocr preflight] Passed.');
