import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const artifactDir = path.join(cwd, 'artifacts');
const artifactPath = path.join(artifactDir, 'invoice-ocr-perf-baseline.json');

const nowIso = new Date().toISOString();

const generateSyntheticFiles = count =>
  Array.from({ length: count }, (_, index) => ({
    name: `invoice-${index + 1}.pdf`,
    size: 140_000 + index * 17,
    type: 'application/pdf',
    lastModified: 1_700_000_000_000 + index * 3_000,
  }));

const chunkFiles = (items, size) => {
  const chunkSize = Math.max(1, size);
  const chunks = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
};

const hashString = source => {
  let hash = 5381;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 33) ^ source.charCodeAt(index);
  }
  return Math.abs(hash >>> 0).toString(16);
};

const runSingleBenchmark = ({ fileCount, chunkSize, iterations }) => {
  const files = generateSyntheticFiles(fileCount);
  const startedAt = performance.now();
  let digestAccumulator = 0;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const chunks = chunkFiles(files, chunkSize);
    for (const chunk of chunks) {
      const fingerprint = chunk
        .map(file => `${file.name}:${file.size}:${file.lastModified}`)
        .join('|');
      digestAccumulator += Number.parseInt(hashString(fingerprint), 16) || 0;
    }
  }

  const elapsedMs = Number((performance.now() - startedAt).toFixed(3));
  return {
    fileCount,
    chunkSize,
    iterations,
    elapsedMs,
    digestAccumulator,
    chunkCount: chunkFiles(files, chunkSize).length,
  };
};

const scenarios = [
  { fileCount: 20, chunkSize: 10, iterations: 80 },
  { fileCount: 50, chunkSize: 10, iterations: 80 },
  { fileCount: 50, chunkSize: 5, iterations: 80 },
];

const results = scenarios.map(runSingleBenchmark);
const elapsed = results.map(item => item.elapsedMs).sort((a, b) => a - b);
const percentile = ratio => {
  const index = Math.min(
    elapsed.length - 1,
    Math.max(0, Math.floor((elapsed.length - 1) * ratio))
  );
  return elapsed[index] || 0;
};

const output = {
  generatedAt: nowIso,
  nodeVersion: process.version,
  machine: process.platform,
  metrics: {
    p50ElapsedMs: percentile(0.5),
    p95ElapsedMs: percentile(0.95),
    maxElapsedMs: elapsed[elapsed.length - 1] || 0,
  },
  scenarios: results,
};

fs.mkdirSync(artifactDir, { recursive: true });
fs.writeFileSync(artifactPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

console.log('[invoice-ocr perf baseline] generated:', artifactPath);
console.log(
  '[invoice-ocr perf baseline] p50/p95:',
  output.metrics.p50ElapsedMs,
  output.metrics.p95ElapsedMs
);
