import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TARGET_DIRS = ['src', 'apps/sparkery/src'];
const CODE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.css',
  '.scss',
  '.sass',
]);

const colorPattern = /#(?:[0-9a-fA-F]{3,8})\b|rgba?\(/g;
const importantPattern = /!important/g;

const args = process.argv.slice(2);
const maxColor = Number(args[args.indexOf('--max-color') + 1]);
const maxImportant = Number(args[args.indexOf('--max-important') + 1]);
const maxInlineHex = Number(args[args.indexOf('--max-inline-hex') + 1]);
const jsonMode = args.includes('--json');

const isFiniteNumber = value => Number.isFinite(value) && value >= 0;

const walkFiles = dir => {
  const result = [];
  if (!fs.existsSync(dir)) {
    return result;
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') {
        continue;
      }
      result.push(...walkFiles(fullPath));
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    if (!CODE_EXTENSIONS.has(path.extname(entry.name))) {
      continue;
    }
    result.push(fullPath);
  }
  return result;
};

const report = {
  scannedAt: new Date().toISOString(),
  root: ROOT,
  totals: {
    files: 0,
    colorMatches: 0,
    importantMatches: 0,
    inlineHexLines: 0,
  },
  files: [],
};

for (const dir of TARGET_DIRS) {
  const absDir = path.join(ROOT, dir);
  const files = walkFiles(absDir);
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split(/\r?\n/);
    let colorMatches = 0;
    let importantMatches = 0;
    let inlineHexLines = 0;

    for (const line of lines) {
      const colorFound = line.match(colorPattern);
      const importantFound = line.match(importantPattern);
      if (colorFound) {
        colorMatches += colorFound.length;
      }
      if (importantFound) {
        importantMatches += importantFound.length;
      }
      if (line.includes('style={{') && /#(?:[0-9a-fA-F]{3,8})\b/.test(line)) {
        inlineHexLines += 1;
      }
    }

    if (colorMatches === 0 && importantMatches === 0 && inlineHexLines === 0) {
      continue;
    }

    const relativePath = path.relative(ROOT, file).replace(/\\/g, '/');
    report.files.push({
      path: relativePath,
      colorMatches,
      importantMatches,
      inlineHexLines,
    });
    report.totals.files += 1;
    report.totals.colorMatches += colorMatches;
    report.totals.importantMatches += importantMatches;
    report.totals.inlineHexLines += inlineHexLines;
  }
}

report.files.sort((a, b) => {
  const scoreA =
    a.colorMatches * 5 + a.importantMatches * 3 + a.inlineHexLines * 8;
  const scoreB =
    b.colorMatches * 5 + b.importantMatches * 3 + b.inlineHexLines * 8;
  return scoreB - scoreA;
});

if (jsonMode) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('[dark-mode-audit] Summary');
  console.log(`- Scanned files with hits: ${report.totals.files}`);
  console.log(`- Hardcoded color matches: ${report.totals.colorMatches}`);
  console.log(`- !important matches: ${report.totals.importantMatches}`);
  console.log(`- Inline style hex lines: ${report.totals.inlineHexLines}`);
  console.log('');
  console.log('[dark-mode-audit] Top offenders');
  for (const item of report.files.slice(0, 20)) {
    console.log(
      `${item.path} | colors=${item.colorMatches} important=${item.importantMatches} inlineHex=${item.inlineHexLines}`
    );
  }
}

const failedThresholds = [];
if (isFiniteNumber(maxColor) && report.totals.colorMatches > maxColor) {
  failedThresholds.push(
    `colorMatches ${report.totals.colorMatches} > maxColor ${maxColor}`
  );
}
if (
  isFiniteNumber(maxImportant) &&
  report.totals.importantMatches > maxImportant
) {
  failedThresholds.push(
    `importantMatches ${report.totals.importantMatches} > maxImportant ${maxImportant}`
  );
}
if (
  isFiniteNumber(maxInlineHex) &&
  report.totals.inlineHexLines > maxInlineHex
) {
  failedThresholds.push(
    `inlineHexLines ${report.totals.inlineHexLines} > maxInlineHex ${maxInlineHex}`
  );
}

if (failedThresholds.length > 0) {
  console.error('[dark-mode-audit] Threshold check failed:');
  for (const reason of failedThresholds) {
    console.error(`- ${reason}`);
  }
  process.exit(1);
}
