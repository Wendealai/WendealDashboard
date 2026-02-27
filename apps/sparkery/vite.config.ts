import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'path';

const basePath = (process.env.VITE_SPARKERY_BASE_PATH || '/').trim();
const normalizedBase = basePath === '/' ? '/' : `${basePath.replace(/\/+$/, '')}/`;
const buildMeta = {
  version: process.env.VITE_APP_VERSION || 'dev',
  commit: process.env.VITE_APP_COMMIT || 'dev',
  buildTime: process.env.VITE_APP_BUILD_TIME || new Date().toISOString(),
};
const localEnvDir = __dirname;
const monorepoEnvDir = path.resolve(__dirname, '../..');
const hasLocalEnvFiles =
  fs.existsSync(path.join(localEnvDir, '.env')) ||
  fs.existsSync(path.join(localEnvDir, '.env.local'));
const envDir = hasLocalEnvFiles ? localEnvDir : monorepoEnvDir;

export default defineConfig({
  root: __dirname,
  envDir,
  base: normalizedBase,
  plugins: [react()],
  define: {
    'process.env': {
      NODE_ENV: process.env.NODE_ENV || 'development',
    },
    __WENDEAL_BUILD_META__: JSON.stringify(buildMeta),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    host: '0.0.0.0',
    port: 5174,
  },
  preview: {
    host: '0.0.0.0',
    port: 5174,
  },
});
