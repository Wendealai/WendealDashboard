import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // React优化配置
      // 暂时移除Babel插件配置以解决解析错误
    }),
    // 代码分割通过rollupOptions.output.manualChunks实现
    // Bundle分析插件（仅在分析模式下启用）
    ...(process.env.ANALYZE ? [visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }) as any] : [])
  ],
  define: {
    'process.env': {},
    // 生产环境优化
    __DEV__: process.env.NODE_ENV !== 'production',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true,
    host: true, // 允许外部访问
    // 开发服务器优化
    hmr: {
      overlay: false, // 禁用错误覆盖层
    },
    // API代理配置 - 代理到n8n服务器
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
      // Webhook代理配置 - 解决CORS问题
      '/webhook': {
        target: 'https://n8n.wendealai.com',
        changeOrigin: true,
        secure: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('webhook proxy error', err);
          });
          proxy.on('proxyReq', (_proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      },
      // Airtable API代理配置 - 解决CORS问题
      '/airtable': {
        target: 'https://api.airtable.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/airtable/, ''),
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
    },
  },

  build: {
    // 构建优化
    target: 'es2015',
    minify: 'esbuild', // 使用esbuild进行压缩，更快更稳定
    // 代码分割
    rollupOptions: {
      output: {
        // 更细粒度的代码分割
        manualChunks: (id) => {
          // 第三方库分割
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('antd')) {
              return 'antd-vendor';
            }
            if (id.includes('@reduxjs/toolkit') || id.includes('react-redux')) {
              return 'redux-vendor';
            }
            if (id.includes('react-router')) {
              return 'router-vendor';
            }
            if (id.includes('dayjs') || id.includes('moment')) {
              return 'date-vendor';
            }
            if (id.includes('echarts') || id.includes('chart')) {
              return 'chart-vendor';
            }
            if (id.includes('axios') || id.includes('msw')) {
              return 'http-vendor';
            }
            return 'vendor';
          }
          // 页面级别分割
          if (id.includes('/pages/')) {
            const pageName = id.split('/pages/')[1].split('/')[0];
            return `page-${pageName}`;
          }
          // 组件级别分割
          if (id.includes('/components/') && !id.includes('/components/common/')) {
            return 'components';
          }
        },
        // 文件命名优化
        chunkFileNames: () => {
          return `js/[name]-[hash].js`;
        },
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
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
    // 构建输出优化
    chunkSizeWarningLimit: 1000,
    sourcemap: false, // 生产环境不生成sourcemap
    // 压缩优化
    cssCodeSplit: true,
    assetsInlineLimit: 4096, // 小于4kb的资源内联
  },
  // 预构建优化
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
    exclude: ['msw'], // MSW不需要预构建
  },
  // CSS优化
  css: {
    devSourcemap: true,
    // CSS代码分割
    modules: {
      localsConvention: 'camelCase',
    },
    // PostCSS优化
    postcss: {
      plugins: [
        // 可以添加autoprefixer等插件
      ],
    },
  },
  // 性能优化
  esbuild: {
    // 生产环境移除console和debugger
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
})
