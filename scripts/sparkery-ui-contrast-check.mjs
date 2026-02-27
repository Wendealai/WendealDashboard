import fs from 'node:fs';
import path from 'node:path';

const cssPath = path.resolve('apps/sparkery/src/styles/saas-shell.css');
const css = fs.readFileSync(cssPath, 'utf8');

const rootBlockMatch = css.match(/:root\s*\{([\s\S]*?)\}/);
if (!rootBlockMatch) {
  console.error('Unable to locate :root token block in saas-shell.css');
  process.exit(1);
}
const rootBlock = rootBlockMatch[1];

const variableRegex = /(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g;
const variables = new Map();
let match = variableRegex.exec(rootBlock);
while (match) {
  variables.set(match[1], match[2]);
  match = variableRegex.exec(rootBlock);
}

const expandHex = hex => {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    return clean
      .split('')
      .map(value => value + value)
      .join('');
  }
  if (clean.length === 6) {
    return clean;
  }
  if (clean.length === 8) {
    return clean.slice(0, 6);
  }
  throw new Error(`Unsupported hex format: ${hex}`);
};

const luminance = hex => {
  const expanded = expandHex(hex);
  const channels = [0, 2, 4].map(offset => {
    const byte = Number.parseInt(expanded.slice(offset, offset + 2), 16) / 255;
    return byte <= 0.03928 ? byte / 12.92 : ((byte + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};

const contrastRatio = (foregroundHex, backgroundHex) => {
  const light = Math.max(luminance(foregroundHex), luminance(backgroundHex));
  const dark = Math.min(luminance(foregroundHex), luminance(backgroundHex));
  return (light + 0.05) / (dark + 0.05);
};

const mustRead = variableName => {
  const value = variables.get(variableName);
  if (!value) {
    throw new Error(`Missing CSS variable: ${variableName}`);
  }
  return value;
};

const checks = [
  {
    name: 'Warning text on card',
    foreground: '--sparkery-saas-warning',
    background: '--sparkery-saas-card',
    minRatio: 4.5,
  },
  {
    name: 'Danger text on card',
    foreground: '--sparkery-saas-danger',
    background: '--sparkery-saas-card',
    minRatio: 4.5,
  },
  {
    name: 'Warning status on card',
    foreground: '--sparkery-saas-status-warning',
    background: '--sparkery-saas-card',
    minRatio: 4.5,
  },
  {
    name: 'Danger status on card',
    foreground: '--sparkery-saas-status-danger',
    background: '--sparkery-saas-card',
    minRatio: 4.5,
  },
  {
    name: 'Muted text on card',
    foreground: '--sparkery-saas-muted',
    background: '--sparkery-saas-card',
    minRatio: 4.5,
  },
];

const failures = checks
  .map(check => {
    const foreground = mustRead(check.foreground);
    const background = mustRead(check.background);
    const ratio = contrastRatio(foreground, background);
    return {
      ...check,
      foreground,
      background,
      ratio,
      pass: ratio >= check.minRatio,
    };
  })
  .filter(result => !result.pass);

if (failures.length > 0) {
  console.error('Sparkery UI contrast checks failed:');
  failures.forEach(result => {
    console.error(
      `- ${result.name}: ${result.foreground} on ${result.background} ratio=${result.ratio.toFixed(
        2
      )} (required >= ${result.minRatio})`
    );
  });
  process.exit(1);
}

console.log('Sparkery UI contrast checks passed.');
