const LEGACY_CHUNK_MARKERS = ['vendor-misc', 'antv-core-vendor'];

const fail = message => {
  console.error(`[verify:deploy] ${message}`);
  process.exit(1);
};

const parseArgs = argv => {
  const args = {
    url: '',
    expectCommit: '',
    timeoutMs: 15000,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--url') {
      args.url = argv[i + 1] || '';
      i += 1;
      continue;
    }
    if (token === '--expect-commit') {
      args.expectCommit = argv[i + 1] || '';
      i += 1;
      continue;
    }
    if (token === '--timeout-ms') {
      const parsed = Number(argv[i + 1]);
      if (Number.isFinite(parsed) && parsed > 0) {
        args.timeoutMs = parsed;
      }
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

const isNoCacheHeader = cacheControl =>
  /no-store|no-cache|max-age=0/i.test(cacheControl || '');

const normalizeCommit = commit => commit.trim().toLowerCase();

const isCommitMatch = (actualCommit, expectedCommit) => {
  if (!actualCommit || !expectedCommit) {
    return false;
  }
  const actual = normalizeCommit(actualCommit);
  const expected = normalizeCommit(expectedCommit);
  return actual.startsWith(expected) || expected.startsWith(actual);
};

const fetchWithTimeout = async (url, timeoutMs) => {
  return fetch(url, {
    headers: {
      'cache-control': 'no-cache',
      pragma: 'no-cache',
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
};

const assertJavaScriptAsset = async (assetUrl, timeoutMs) => {
  const response = await fetchWithTimeout(assetUrl, timeoutMs);
  if (!response.ok) {
    fail(`JavaScript asset request failed (${response.status}): ${assetUrl}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (/text\/html/i.test(contentType)) {
    fail(
      `JavaScript asset resolved to HTML fallback: ${assetUrl} (content-type: ${contentType})`
    );
  }
};

const args = parseArgs(process.argv.slice(2));
if (!args.url) {
  fail('Missing required argument: --url <https://your-domain/>');
}

const baseUrl = new URL(args.url);
if (!baseUrl.pathname) {
  baseUrl.pathname = '/';
}

const indexResponse = await fetchWithTimeout(baseUrl, args.timeoutMs);
if (!indexResponse.ok) {
  fail(`Index request failed (${indexResponse.status}): ${baseUrl.toString()}`);
}

const indexCacheControl = indexResponse.headers.get('cache-control') || '';
if (!isNoCacheHeader(indexCacheControl)) {
  fail(
    `Expected no-cache policy for index.html, got cache-control="${indexCacheControl || '(missing)'}"`
  );
}

const html = await indexResponse.text();
for (const marker of LEGACY_CHUNK_MARKERS) {
  if (html.includes(marker)) {
    fail(`Legacy chunk marker still present in deployed index: "${marker}"`);
  }
}

const buildVersion = extractMeta(html, 'wendeal-build-version');
const buildCommit = extractMeta(html, 'wendeal-build-commit');
const buildTime = extractMeta(html, 'wendeal-build-time');

if (!buildVersion || !buildCommit || !buildTime) {
  fail('Missing build meta tags in deployed index.html');
}

if (args.expectCommit && !isCommitMatch(buildCommit, args.expectCommit)) {
  fail(`Commit mismatch: expected "${args.expectCommit}", got "${buildCommit}"`);
}

const runtimeConfigUrl = new URL('/runtime-config.js', baseUrl);
const runtimeConfigResponse = await fetchWithTimeout(runtimeConfigUrl, args.timeoutMs);
const runtimeCacheControl = runtimeConfigResponse.headers.get('cache-control') || '';
if (!isNoCacheHeader(runtimeCacheControl)) {
  fail(
    `Expected no-cache policy for runtime-config.js, got cache-control="${runtimeCacheControl || '(missing)'}"`
  );
}

const serviceWorkerUrl = new URL('/sw.js', baseUrl);
const swResponse = await fetchWithTimeout(serviceWorkerUrl, args.timeoutMs);
const swCacheControl = swResponse.headers.get('cache-control') || '';
if (!isNoCacheHeader(swCacheControl)) {
  fail(
    `Expected no-cache policy for sw.js, got cache-control="${swCacheControl || '(missing)'}"`
  );
}

const jsAssets = collectJavaScriptAssets(html).map(asset => new URL(asset, baseUrl));
if (jsAssets.length === 0) {
  fail('No JavaScript assets found in deployed index.html');
}

for (const assetUrl of jsAssets) {
  await assertJavaScriptAsset(assetUrl, args.timeoutMs);
}

console.log(
  `[verify:deploy] OK version=${buildVersion} commit=${buildCommit} buildTime=${buildTime} jsAssets=${jsAssets.length}`
);
