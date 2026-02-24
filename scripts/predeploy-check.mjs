import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const REQUIRED_PREDEPLOY_ENVS = (
  process.env.REQUIRED_PREDEPLOY_ENVS ||
  'VITE_SUPABASE_URL,VITE_SUPABASE_ANON_KEY'
)
  .split(',')
  .map(item => item.trim())
  .filter(Boolean);

const MAX_DIST_SIZE_MB = Number(process.env.MAX_DIST_SIZE_MB || '25');
const MAX_JS_CHUNK_SIZE_MB = Number(process.env.MAX_JS_CHUNK_SIZE_MB || '8');
const DIST_DIR = path.resolve(process.cwd(), 'dist');

const npmExecPath = process.env.npm_execpath;

function loadEnvFromFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function run(command, args, shell = false) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell,
    env: process.env,
  });

  if (result.error) {
    console.error(`Failed to run command: ${command} ${args.join(' ')}`);
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runNpm(args) {
  if (npmExecPath) {
    run(process.execPath, [npmExecPath, ...args]);
    return;
  }
  run('npm', args, process.platform === 'win32');
}

function collectFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath));
      continue;
    }
    files.push(fullPath);
  }

  return files;
}

function formatMb(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2);
}

function assertRequiredEnvVars() {
  const missing = REQUIRED_PREDEPLOY_ENVS.filter(name => !process.env[name]);

  if (missing.length > 0) {
    console.error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
    process.exit(1);
  }
}

function assertDistSize() {
  if (!existsSync(DIST_DIR)) {
    console.error(`Build output directory not found: ${DIST_DIR}`);
    process.exit(1);
  }

  const allFiles = collectFiles(DIST_DIR);
  const totalBytes = allFiles.reduce((acc, filePath) => {
    return acc + statSync(filePath).size;
  }, 0);

  const maxDistBytes = MAX_DIST_SIZE_MB * 1024 * 1024;
  if (totalBytes > maxDistBytes) {
    console.error(
      `dist size ${formatMb(totalBytes)} MB exceeds ${MAX_DIST_SIZE_MB} MB limit`
    );
    process.exit(1);
  }

  const jsFiles = allFiles.filter(filePath => filePath.endsWith('.js'));
  const maxChunkBytes = MAX_JS_CHUNK_SIZE_MB * 1024 * 1024;

  const oversizedChunks = jsFiles
    .map(filePath => ({
      filePath,
      size: statSync(filePath).size,
    }))
    .filter(chunk => chunk.size > maxChunkBytes);

  if (oversizedChunks.length > 0) {
    console.error(
      `Found JS chunks larger than ${MAX_JS_CHUNK_SIZE_MB} MB: ${oversizedChunks
        .map(
          chunk =>
            `${path.relative(process.cwd(), chunk.filePath)} (${formatMb(chunk.size)} MB)`
        )
        .join(', ')}`
    );
    process.exit(1);
  }

  console.log(
    `dist size check passed: total ${formatMb(totalBytes)} MB, max JS chunk ${MAX_JS_CHUNK_SIZE_MB} MB`
  );
}

console.log('Checking required environment variables...');
loadEnvFromFile(path.resolve(process.cwd(), '.env'));
loadEnvFromFile(path.resolve(process.cwd(), '.env.local'));
assertRequiredEnvVars();

console.log('Running typecheck...');
runNpm(['run', 'typecheck']);

console.log('Running production build...');
runNpm(['run', 'build']);

console.log('Checking dist size thresholds...');
assertDistSize();

console.log('Predeploy checks passed.');
