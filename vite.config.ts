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

const allowedHosts = Array.from(
  new Set(
    [
      'oa.wendealai.com',
      ...(process.env.VITE_ALLOWED_HOSTS || '').split(','),
    ]
      .map(host => host.trim())
      .filter(Boolean)
  )
);

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // React婵炴潙鍚嬮敋閻庡灚鐓￠弻濠傤吋閸モ晜鐎?
      // 闂佸搫妫楅崐鐟邦渻閸屾粎鐭撳┑鐘崇閻濈優abel闂佸湱绮敮濠傗枎閵忋倖鐓€鐎广儱娲ㄩ弸鍌毭归悩顔煎姤鐞氭瑩鏌涢幇顒傛瀮鐞氭瑩鏌＄€ｎ偄濮嶉柡浣革功閹?
    }),
    // 婵炲濯寸徊鍧楁偉濠婂牆绀嗛柛鈩冾殔椤ュ繘姊洪锝勪孩缂佽鍏恛llupOptions.output.manualChunks闁诲骸婀遍崑鐔肩嵁?
    // Bundle闂佸憡甯掑Λ娆撴倵娴犲绠甸柟鍝勭У椤愪粙鏌ㄥ☉妯煎缂侇喖閰ｅ畷鐑藉Ω閵夈儳鈧鏌＄€ｎ偄濮堥懚鈺冣偓娈垮枛缁诲绮崨鏉戣Е妞ゆ牗绮嶉弳蹇涙煥?
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
    // 闂佹眹鍨婚崰宥嗩殽閸ヮ剚鍋濇い鏍ㄥ嚬閺嗘柨霉閸忔祹顏嗏偓?
    __DEV__: process.env.NODE_ENV !== 'production',
    __WENDEAL_BUILD_META__: JSON.stringify(buildMeta),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5173,
    open: false,
    host: '0.0.0.0',
    allowedHosts, // 闂佺绻嬪ù鍥敊韫囨柨绶為柡宥庡幖閸斻儵鎮规担鍛婂仴婵?
    // 閻庢鍠掗崑鎾绘煕濞嗘劕鐏︽繝鈧崶顒€绀夐柍銉ㄦ珪閻濄倕霉閸忔祹顏嗏偓?
    hmr: {
      overlay: false, // 缂備礁鍊烽懗鍫曞极閵堝鐓ユ繛鍡樺俯閸ゆ牠鎮烽弴鐐搭棤婵炴彃锕︽禒?
    },
    // CSP婵犮垼鍩栭幐鎶藉磿閹绢喗鐓€鐎广儱娲ㄩ弸?- 閻庢鍠掗崑鎾绘煕濞嗘劕鐏╂鐐叉閺呭爼宕橀顖楁櫊濮婁粙濡堕崟顏嗛瀺闂備緡鍓欓悘婵嬪储椤ワ箥oudflare cookie闂傚倸瀚崝鏇㈠春?
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
    // API婵炲濯寸徊鍧楀箖婵犲洦鐓€鐎广儱娲ㄩ弸?- 婵炲濯寸徊鍧楀箖婵犲洤绀嗛柣銊㈠亾8n闂佸搫鐗嗙粔瀛樻叏閻旂厧闂?
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
      // Webhook婵炲濯寸徊鍧楀箖婵犲洦鐓€鐎广儱娲ㄩ弸?- 闁荤喐鐟辩徊浠嬪窗閸栨摦RS闂傚倸鍋嗛崳锝夈€?
      '/webhook': {
        target: 'https://n8n.wendealai.com',
        changeOrigin: true,
        secure: true,
        // 婵犮垼娉涚€氼噣骞冩總娣IONS婵☆偅婢樼€氼參藟閸涱垱瀚氶梺鍨儑濠€?
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

            // 婵犮垼娉涚€氼噣骞冩總娣IONS婵☆偅婢樼€氼參藟閸涱垱瀚氶梺鍨儑濠€?
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
            // 缂佺虎鍙庨崰鏇犳崲濮濈晩ltipart/form-data闁荤姴娲弨閬嶆儑閺夋娼伴柨婵嗘礌閳ь剚蓱濞碱亪顢楅埀顒冦亹?
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
            // 濠电儑缍€椤曆勬叏濠点帯RS婵犮垼鍩栭幐鎶藉磿閹绢喖绀嗛柣妤€鐗嗛。鏌ユ煛閸繍妲搁柟濂告敱閹?
            proxyRes.headers['Access-Control-Allow-Origin'] = '*';
            proxyRes.headers['Access-Control-Allow-Methods'] =
              'GET, POST, PUT, DELETE, OPTIONS';
            proxyRes.headers['Access-Control-Allow-Headers'] =
              'Content-Type, Authorization, X-Requested-With, User-Agent';
          });
        },
      },
      // Airtable API婵炲濯寸徊鍧楀箖婵犲洦鐓€鐎广儱娲ㄩ弸?- 闁荤喐鐟辩徊浠嬪窗閸栨摦RS闂傚倸鍋嗛崳锝夈€?
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
      // Notion API婵炲濯寸徊鍧楀箖婵犲洦鐓€鐎广儱娲ㄩ弸?- 闂佸吋鍎抽崲鑼躲亹閸㈡tion闂佽桨鑳舵晶妤€鐣垫担瑙勫劅闁规儳鐡ㄥ▓鍫曟煙?
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
            // 濠电儑缍€椤曆勬叏濠电tion API闂佸湱顣介崑鎾绘⒒閸ワ絽浜鹃梺姹囧妼閸╁崘aders
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
    host: '0.0.0.0',
    allowedHosts, // 闂佺绻戞繛濠囧极椤撱垺鏅慨姗嗗墮鐢帡鎮规担渚劸妞わ箑顭烽弻鍫ュΩ椤垵鏅遍梻?
    port: 5173, // 婵炴垶鎸搁柦濉穘tainer Port闂佸憡鐗曠紞濠囧储?
    strictPort: true, // 閻庢鍠栭幖顐﹀春濡や焦濯撮悹鎭掑妽閺嗗繘鏌熺粙鎸庢悙闁伙絽澧界划鈺咁敍濮橆剛绋?
  },

  build: {
    // 闂佸搫顑呯€氼剛绱撻幘鏉戭嚤婵☆垰鎼?
    target: 'es2015',
    minify: 'esbuild', // 婵炶揪缍€濞夋洟寮ˇ濯燽uild闁哄鏅滅粙鏍€侀幋锕€鍌ㄩ悗锝庡墰缁辨岸鏌ㄥ☉妯绘拱婵炶尪鍎荤粻娑㈩敃閿濆棛鍑界紓浣割儏閸熷潡鎮?
    // 婵炲濯寸徊鍧楁偉濠婂牆绀嗛柛鈩冾殔椤?
    rollupOptions: {
      // 闂婎偄娲ㄩ弲顐﹀汲?"use client" 闂佸湱顭堝ú锝夊箮閵堝鍎嶉柛鏇ㄥ櫘閸斿懘鏌?
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
        // Stable library-group chunking: reduce monolithic vendor blast radius.
        manualChunks: id => {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          const toChunkSafe = (value: string): string =>
            value.replace(/^@/, '').replace(/[\/\\@]/g, '-');

          const packageNameFromId = (): string | undefined => {
            const marker = 'node_modules/';
            const index = id.lastIndexOf(marker);
            if (index < 0) return undefined;
            const rest = id.slice(index + marker.length);
            const segments = rest.split(/[\/\\]/).filter(Boolean);
            if (segments.length === 0) return undefined;
            if (segments[0]?.startsWith('@') && segments[1]) {
              return `${segments[0]}/${segments[1]}`;
            }
            return segments[0];
          };

          const isAny = (patterns: string[]): boolean =>
            patterns.some(pattern => id.includes(pattern));

          if (
            isAny([
              '/react/',
              '/react-dom/',
              '/scheduler/',
              '/react-router/',
              '/react-router-dom/',
            ])
          ) {
            return 'react-vendor';
          }

          if (isAny(['/@ant-design/icons/'])) {
            return 'antd-icons-vendor';
          }

          if (isAny(['/@rc-component/', '/rc-'])) {
            return 'antd-rc-vendor';
          }

          if (
            isAny([
              '/antd/',
              '/antd-style/',
            ])
          ) {
            const antdComponentMatch = id.match(/\/antd\/(?:es|lib)\/([^/\\]+)/);
            const componentName = antdComponentMatch?.[1];
            if (componentName) {
              return `antd-${toChunkSafe(componentName)}-vendor`;
            }
            return 'antd-core-vendor';
          }

          if (isAny(['/@ant-design/charts/'])) {
            return 'ant-design-charts-vendor';
          }

          if (isAny(['/@antv/'])) {
            return 'antv-vendor';
          }

          if (isAny(['/d3-'])) {
            return 'd3-vendor';
          }

          if (
            isAny([
              '/@reduxjs/toolkit/',
              '/react-redux/',
              '/redux/',
              '/reselect/',
              '/immer/',
            ])
          ) {
            return 'state-vendor';
          }

          if (
            isAny([
              '/i18next/',
              '/react-i18next/',
              '/i18next-browser-languagedetector/',
            ])
          ) {
            return 'i18n-vendor';
          }

          if (isAny(['/html2pdf.js/', '/jspdf/', '/jspdf-autotable/'])) {
            return 'pdf-vendor';
          }

          if (isAny(['/xlsx/'])) {
            return 'xlsx-vendor';
          }

          if (
            isAny([
              '/react-markdown/',
              '/remark-',
              '/rehype-',
              '/unified/',
              '/micromark/',
              '/mdast-util-',
              '/hast-util-',
              '/vfile/',
              '/trough/',
            ])
          ) {
            return 'markdown-vendor';
          }

          if (
            isAny([
              '/@tanstack/react-query/',
              '/axios/',
              '/dayjs/',
              '/clsx/',
              '/class-variance-authority/',
              '/tailwind-merge/',
              '/minimatch/',
            ])
          ) {
            return 'utility-vendor';
          }

          if (
            isAny([
              '/airtable/',
              '/socket.io-client/',
              '/deep-chat-react/',
              '/@novu/js/',
              '/@novu/react/',
              '/iframe-resizer/',
            ])
          ) {
            return 'integration-vendor';
          }

          const packageName = packageNameFromId();
          if (packageName) {
            return `vendor-${toChunkSafe(packageName)}`;
          }
          return 'vendor-misc';
        },
        // 闂佸搫鍊稿ú锝呪枎閵忋倕宸濋柦妯侯槹閸婂啿霉閸忔祹顏嗏偓?
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
    // 闂佸搫顑呯€氼剛绱撻幘瀛樼秶闁规儳鍟垮В澶娒归崗娴庮亞鈧?
    chunkSizeWarningLimit: 1000,
    sourcemap: false, // 闂佹眹鍨婚崰宥嗩殽閸ヮ剚鍋濇い鏍ㄥ嚬閺嗘柨鈽夐幘宕囆ら柡浣规崌楠炲骞侀悥濯cemap
    // 闂佸憡锚椤戝洨绱撴径瀣嚤婵☆垰鎼?
    cssCodeSplit: true,
    assetsInlineLimit: 4096, // 闁诲繐绻愮换瀣姳?kb闂佹眹鍔岀€氼垳绮婇鈶╂敠闁归偊鍓欓弫鍫曟煠?
  },
  // 婵☆偅婢樼€氼參鎮楅姘煎殘閺夌偞澹嗛崰姗€鏌?
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
    exclude: ['msw'], // MSW婵炴垶鎸哥粔鐟般€掗崜浣瑰暫濞撴埃鍋撴い锝傛櫊瀵悂宕熼銈囧
  },
  // CSS婵炴潙鍚嬮敋閻?
  css: {
    devSourcemap: true,
    // CSS婵炲濯寸徊鍧楁偉濠婂牆绀嗛柛鈩冾殔椤?
    modules: {
      localsConvention: 'camelCase',
    },
    // PostCSS婵炴潙鍚嬮敋閻?
    postcss: {
      plugins: [
        // 闂佸憡鐟崹顖涚閹烘嚞搴ｆ嫚閹绘帩娼盿utoprefixer缂備焦绋戦ˇ鎷屻亹閸愨晝顩?
      ],
    },
  },
  // 闂佽鍎搁崱妤€骞嬫繛鏉戝悑閿氶悗?
  esbuild: {
    // 闂佹眹鍨婚崰宥嗩殽閸ヮ剚鍋濇い鏍ㄥ嚬閺嗘梻绱掓径濠庣吋婵炲懎绌痮nsole闂佸憡绮岄悾鐮産ugger
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
});
