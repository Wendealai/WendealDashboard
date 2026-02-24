import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();

const requiredSqlFiles = [
  'docs/supabase/dispatch-core.sql',
  'docs/supabase/dispatch-finance.sql',
  'docs/supabase/dispatch-finance-audit.sql',
  'docs/supabase/dispatch-job-query-indexes.sql',
  'docs/supabase/sparkery-telemetry-events.sql',
];

const fail = message => {
  console.error(`[migration-safety-check] ${message}`);
  process.exit(1);
};

const readFileSafe = relativePath => {
  const absolutePath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`Missing required migration file: ${relativePath}`);
  }

  const content = fs.readFileSync(absolutePath, 'utf8');
  if (!content.trim()) {
    fail(`Migration file is empty: ${relativePath}`);
  }
  return content;
};

requiredSqlFiles.forEach(filePath => {
  readFileSafe(filePath);
});

const financeSql = readFileSafe('docs/supabase/dispatch-finance.sql');
if (!financeSql.includes('sync_dispatch_job_receivable_total')) {
  fail(
    'dispatch-finance.sql must include receivable total trigger function for finance consistency'
  );
}

const telemetrySql = readFileSafe('docs/supabase/sparkery-telemetry-events.sql');
if (!telemetrySql.includes('sparkery_telemetry_events')) {
  fail('sparkery-telemetry-events.sql must create sparkery_telemetry_events table');
}

console.log(
  `[migration-safety-check] OK (${requiredSqlFiles.length} migration files validated)`
);
