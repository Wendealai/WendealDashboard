import { execSync } from 'node:child_process';

const args = process.argv.slice(2);

const parseArgValue = (flag, fallback = '') => {
  const index = args.findIndex(arg => arg === flag);
  if (index === -1) {
    return fallback;
  }
  const value = args[index + 1];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
};

const targetRef = parseArgValue('--target', 'HEAD~1');
const branchPrefix = parseArgValue('--branch-prefix', 'rollback');
const skipChecks = args.includes('--skip-checks');
const dryRun = args.includes('--dry-run');

const run = command => {
  console.log(`$ ${command}`);
  return execSync(command, {
    stdio: 'pipe',
    encoding: 'utf8',
  }).trim();
};

const runPassthrough = command => {
  console.log(`$ ${command}`);
  execSync(command, {
    stdio: 'inherit',
  });
};

const branchName = `${branchPrefix}/${new Date()
  .toISOString()
  .replace(/[-:]/g, '')
  .replace(/\..+/, '')
  .replace('T', '-')}`;

try {
  run('git rev-parse --is-inside-work-tree');
  run(`git rev-parse --verify ${targetRef}`);
} catch (error) {
  console.error(
    `[release-rollback] Invalid git context or target ref (${targetRef}): ${error}`
  );
  process.exit(1);
}

if (!skipChecks) {
  runPassthrough('node scripts/migration-safety-check.mjs');
}

if (dryRun) {
  console.log('[release-rollback] Dry run mode, no branch or commit was created.');
  console.log(
    `[release-rollback] Would restore working tree from ${targetRef} into branch ${branchName}`
  );
  process.exit(0);
}

try {
  runPassthrough(`git checkout -b ${branchName}`);
  runPassthrough(`git checkout ${targetRef} -- .`);
  runPassthrough('git add -A');

  const hasChanges = run('git status --short');
  if (!hasChanges) {
    console.log('[release-rollback] No changes detected after checkout target.');
    process.exit(0);
  }

  runPassthrough(
    `git commit -m "chore(rollback): restore repository state from ${targetRef}"`
  );

  console.log('[release-rollback] Rollback commit created successfully.');
  console.log(
    `[release-rollback] Next: git push origin ${branchName} && open PR to master`
  );
} catch (error) {
  console.error(`[release-rollback] Failed: ${error}`);
  process.exit(1);
}
