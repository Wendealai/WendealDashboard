import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const LEGACY_CHUNK_MARKERS = ['vendor-misc', 'antv-core-vendor'];

const fail = message => {
  console.error(`[verify:artifact] ${message}`);
  process.exit(1);
};

const parseArgs = argv => {
  const args = { dist: 'dist' };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--dist') {
      args.dist = argv[i + 1] || args.dist;
      i += 1;
    }
  }
  return args;
};

const extractMeta = (html, name) => {
  const pattern = new RegExp(
    `<meta\\s+name=["']${name}["']\\s+content=["']([^"']*)["']`,
    'i'
  );
  return html.match(pattern)?.[1]?.trim() || '';
};

const collectJavaScriptAssets = html => {
  const matches = [];
  const regex = /(?:src|href)=["']([^"']+\.js(?:\?[^"']*)?)["']/gi;
  let match = regex.exec(html);
  while (match) {
    matches.push(match[1]);
    match = regex.exec(html);
  }
  return Array.from(new Set(matches));
};

const normalizeAssetPath = assetPath =>
  assetPath.split('?')[0].split('#')[0].replace(/^\//, '');

const args = parseArgs(process.argv.slice(2));
const distDir = path.resolve(process.cwd(), args.dist);
const indexPath = path.join(distDir, 'index.html');

if (!existsSync(indexPath)) {
  fail(`Missing build output: ${path.relative(process.cwd(), indexPath)}`);
}

const html = readFileSync(indexPath, 'utf8');

for (const marker of LEGACY_CHUNK_MARKERS) {
  if (html.includes(marker)) {
    fail(`Unexpected legacy chunk marker in dist/index.html: "${marker}"`);
  }
}

const buildVersion = extractMeta(html, 'wendeal-build-version');
const buildCommit = extractMeta(html, 'wendeal-build-commit');
const buildTime = extractMeta(html, 'wendeal-build-time');

if (!buildVersion || buildVersion.includes('%VITE_')) {
  fail('Missing or unresolved build version meta tag');
}
if (!buildCommit || buildCommit.includes('%VITE_')) {
  fail('Missing or unresolved build commit meta tag');
}
if (!buildTime || buildTime.includes('%VITE_')) {
  fail('Missing or unresolved build time meta tag');
}

const jsAssets = collectJavaScriptAssets(html);
if (jsAssets.length === 0) {
  fail('No JavaScript assets were found in dist/index.html');
}

for (const asset of jsAssets) {
  if (/^https?:\/\//i.test(asset)) {
    continue;
  }
  const assetPath = path.resolve(distDir, normalizeAssetPath(asset));
  if (!existsSync(assetPath)) {
    fail(
      `Referenced JavaScript asset is missing: ${path.relative(process.cwd(), assetPath)}`
    );
  }
}

console.log(
  `[verify:artifact] OK version=${buildVersion} commit=${buildCommit} jsAssets=${jsAssets.length}`
);
