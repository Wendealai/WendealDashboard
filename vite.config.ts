import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { execSync } from 'node:child_process';
import { visualizer } from 'rollup-plugin-visualizer';

const readBuildValue = (command: string): string | undefined => {
  try {
    return execSync(command, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return undefined;
  }
};

const gitCommit =
  process.env.VITE_APP_COMMIT ||
  process.env.GITHUB_SHA?.slice(0, 12) ||
  readBuildValue('git rev-parse --short=12 HEAD') ||
  'unknown';

const buildTime = process.env.VITE_APP_BUILD_TIME || new Date().toISOString();
const appVersion = process.env.VITE_APP_VERSION || gitCommit;

process.env.VITE_APP_VERSION = appVersion;
process.env.VITE_APP_COMMIT = gitCommit;
process.env.VITE_APP_BUILD_TIME = buildTime;

const buildMeta = {
  version: appVersion,
  commit: gitCommit,
  buildTime,
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // React浼樺寲閰嶇疆
      // 鏆傛椂绉婚櫎Babel鎻掍欢閰嶇疆浠ヨВ鍐宠В鏋愰敊璇?
    }),
    // 浠ｇ爜鍒嗗壊閫氳繃rollupOptions.output.manualChunks瀹炵幇
    // Bundle鍒嗘瀽鎻掍欢锛堜粎鍦ㄥ垎鏋愭ā寮忎笅鍚敤锛?
    ...(process.env.ANALYZE
      ? [
          visualizer({
            filename: 'dist/stats.html',
            open: true,
            gzipSize: true,
            brotliSize: true,
          }) as any,
        ]
      : []),
  ],
  define: {
    'process.env': {},
    // 鐢熶骇鐜浼樺寲
    __DEV__: process.env.NODE_ENV !== 'production',
    __WENDEAL_BUILD_META__: JSON.stringify(buildMeta),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: false,
    host: '0.0.0.0', // 鍏佽澶栭儴璁块棶
    // 寮€鍙戞湇鍔″櫒浼樺寲
    hmr: {
      overlay: false, // 绂佺敤閿欒瑕嗙洊灞?
    },
    // CSP澶撮儴閰嶇疆 - 寮€鍙戠幆澧冪Щ闄や互閬垮厤Cloudflare cookie闄愬埗
    // headers: {
    //   'Content-Security-Policy': [
    //     "default-src 'self' https:",
    //     "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.airtable.com https://*.stripe.com https://m.stripe.network https://js.stripe.com https://*.stripe.network https://airtable.com https://*.notion.so https://*.notion.site https://q.stripe.com https: data:",
    //     "style-src 'self' 'unsafe-inline' https://*.airtable.com https://fonts.googleapis.com https://airtable.com https://*.notion.so https://*.notion.site https: data:",
    //     "img-src 'self' data: https: blob: https://*.airtable.com https://*.stripe.com https://*.notion.so https://*.notion.site",
    //     "font-src 'self' https://fonts.gstatic.com https://*.airtable.com https://airtable.com https://*.notion.so https://*.notion.site https:",
    //     "connect-src 'self' https://*.airtable.com https://*.stripe.com https://m.stripe.network https://js.stripe.com https://api.airtable.com wss://*.airtable.com https://airtable.com https://*.notion.so https://q.stripe.com https://*.notion.site wss://*.notion.site https://wendealau.notion.site https://n8n.wendealai.com https://*.n8n.wendealai.com https:",
    //     "frame-src 'self' https://airtable.com https://*.airtable.com https://*.stripe.com https://m.stripe.network https://js.stripe.com https://*.notion.so https://*.notion.site https://crm.wendealai.com",
    //     "object-src 'none'",
    //     "base-uri 'self'",
    //     "form-action 'self' https:",
    //     "upgrade-insecure-requests"
    //   ].join('; '),
    // },
    // API浠ｇ悊閰嶇疆 - 浠ｇ悊鍒皀8n鏈嶅姟鍣?
    proxy: {
      '/api': {
        target: 'https://n8n.wendealai.com',
        changeOrigin: true,
        secure: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (_proxyReq, req, _res) => {
            console.log('[DEV] Proxying request:', req.method, req.url);
          });
        },
      },
      // Webhook浠ｇ悊閰嶇疆 - 瑙ｅ喅CORS闂
      '/webhook': {
        target: 'https://n8n.wendealai.com',
        changeOrigin: true,
        secure: true,
        // 澶勭悊OPTIONS棰勬璇锋眰
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('webhook proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log(
              'Sending Webhook Request to the Target:',
              req.method,
              req.url
            );

            // 澶勭悊OPTIONS棰勬璇锋眰
            if (req.method === 'OPTIONS') {
              console.log('Handling OPTIONS preflight request for webhook');
              res.writeHead(200, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods':
                  'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers':
                  'Content-Type, Authorization, X-Requested-With, User-Agent',
                'Access-Control-Max-Age': '86400',
              });
              res.end();
              return;
            }

            console.log('Request Headers:', proxyReq.getHeaders());
            // 纭繚multipart/form-data璇锋眰姝ｇ‘杞彂
            if (req.headers['content-type']) {
              proxyReq.setHeader('Content-Type', req.headers['content-type']);
            }
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log(
              'Received Webhook Response from the Target:',
              proxyRes.statusCode,
              req.url
            );
            // 娣诲姞CORS澶撮儴鍒版墍鏈夊搷搴?
            proxyRes.headers['Access-Control-Allow-Origin'] = '*';
            proxyRes.headers['Access-Control-Allow-Methods'] =
              'GET, POST, PUT, DELETE, OPTIONS';
            proxyRes.headers['Access-Control-Allow-Headers'] =
              'Content-Type, Authorization, X-Requested-With, User-Agent';
          });
        },
      },
      // Airtable API浠ｇ悊閰嶇疆 - 瑙ｅ喅CORS闂
      '/airtable': {
        target: 'https://api.airtable.com',
        changeOrigin: true,
        secure: true,
        rewrite: path => path.replace(/^\/airtable/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('airtable proxy error', err);
          });
          proxy.on('proxyReq', (_proxyReq, req, _res) => {
            console.log('Airtable Request:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Airtable Response:', proxyRes.statusCode, req.url);
          });
        },
      },
      // Notion API浠ｇ悊閰嶇疆 - 鑾峰彇Notion鏁版嵁搴撴暟鎹?
      '/webhook/notion-fetch': {
        target: 'https://api.notion.com',
        changeOrigin: true,
        secure: true,
        rewrite: path =>
          '/v1/databases/' +
          path.replace('/webhook/notion-fetch/', '') +
          '/query',
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('notion proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, _req, _res) => {
            // 娣诲姞Notion API鎵€闇€鐨刪eaders
            proxyReq.setHeader(
              'Authorization',
              `Bearer ${process.env.NOTION_API_KEY || 'YOUR_NOTION_API_TOKEN'}`
            );
            proxyReq.setHeader('Notion-Version', '2022-06-28');
            proxyReq.setHeader('Content-Type', 'application/json');
            console.log('Notion API Request:', _req.method, _req.url);
          });
          proxy.on('proxyRes', (proxyRes, _req, _res) => {
            console.log('Notion API Response:', proxyRes.statusCode, _req.url);
          });
        },
      },
    },
  },
  preview: {
    open: false,
    host: '0.0.0.0', // 鍏抽敭锛氬厑璁稿閮ㄨ闂?
    port: 5173, // 涓嶤ontainer Port鍖归厤
    strictPort: true, // 寮哄埗浣跨敤鎸囧畾绔彛
  },

  build: {
    // 鏋勫缓浼樺寲
    target: 'es2015',
    minify: 'esbuild', // 浣跨敤esbuild杩涜鍘嬬缉锛屾洿蹇洿绋冲畾
    // 浠ｇ爜鍒嗗壊
    rollupOptions: {
      // 蹇界暐 "use client" 鎸囦护鐨勮鍛?
      onwarn(warning, warn) {
        if (
          warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
          warning.message.includes('use client')
        ) {
          return;
        }
        warn(warning);
      },
      output: {
        // Stable-first chunking: only split third-party deps to avoid init-order regressions
        manualChunks: id => {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        // 鏂囦欢鍛藉悕浼樺寲
        chunkFileNames: () => {
          return `js/[name]-[hash].js`;
        },
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: assetInfo => {
          const name = assetInfo.name || 'unknown';
          const info = name.split('.');
          const ext = info[info.length - 1];
          if (/\.(css)$/.test(name)) {
            return `css/[name]-[hash].${ext}`;
          }
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(name)) {
            return `images/[name]-[hash].${ext}`;
          }
          if (/\.(woff2?|eot|ttf|otf)$/.test(name)) {
            return `fonts/[name]-[hash].${ext}`;
          }
          return `assets/[name]-[hash].${ext}`;
        },
      },
    },
    // 鏋勫缓杈撳嚭浼樺寲
    chunkSizeWarningLimit: 1000,
    sourcemap: false, // 鐢熶骇鐜涓嶇敓鎴恠ourcemap
    // 鍘嬬缉浼樺寲
    cssCodeSplit: true,
    assetsInlineLimit: 4096, // 灏忎簬4kb鐨勮祫婧愬唴鑱?
  },
  // 棰勬瀯寤轰紭鍖?
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@ant-design/icons',
      'antd',
      '@reduxjs/toolkit',
      'react-redux',
      'dayjs',
      'axios',
    ],
    exclude: ['msw'], // MSW涓嶉渶瑕侀鏋勫缓
  },
  // CSS浼樺寲
  css: {
    devSourcemap: true,
    // CSS浠ｇ爜鍒嗗壊
    modules: {
      localsConvention: 'camelCase',
    },
    // PostCSS浼樺寲
    postcss: {
      plugins: [
        // 鍙互娣诲姞autoprefixer绛夋彃浠?
      ],
    },
  },
  // 鎬ц兘浼樺寲
  esbuild: {
    // 鐢熶骇鐜绉婚櫎console鍜宒ebugger
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
});
