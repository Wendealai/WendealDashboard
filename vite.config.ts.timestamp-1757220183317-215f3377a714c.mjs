// vite.config.ts
import { defineConfig } from "file:///C:/Webapp/WendealDashboard/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Webapp/WendealDashboard/node_modules/@vitejs/plugin-react/dist/index.mjs";
import path from "path";
import { visualizer } from "file:///C:/Webapp/WendealDashboard/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
var __vite_injected_original_dirname = "C:\\Webapp\\WendealDashboard";
var vite_config_default = defineConfig({
  plugins: [
    react({
      // React优化配置
      // 暂时移除Babel插件配置以解决解析错误
    }),
    // 代码分割通过rollupOptions.output.manualChunks实现
    // Bundle分析插件（仅在分析模式下启用）
    ...process.env.ANALYZE ? [visualizer({
      filename: "dist/stats.html",
      open: true,
      gzipSize: true,
      brotliSize: true
    })] : []
  ],
  define: {
    "process.env": {},
    // 生产环境优化
    __DEV__: process.env.NODE_ENV !== "production"
  },
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  server: {
    port: 5173,
    open: true,
    host: true,
    // 允许外部访问
    // 开发服务器优化
    hmr: {
      overlay: false
      // 禁用错误覆盖层
    },
    // API代理配置 - 代理到n8n服务器
    proxy: {
      "/api": {
        target: "https://n8n.wendealai.com",
        changeOrigin: true,
        secure: true,
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, _res) => {
            console.log("proxy error", err);
          });
          proxy.on("proxyReq", (_proxyReq, req, _res) => {
            console.log("[DEV] Proxying request:", req.method, req.url);
          });
        }
      },
      // Webhook代理配置 - 解决CORS问题
      "/webhook": {
        target: "https://n8n.wendealai.com",
        changeOrigin: true,
        secure: true,
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, _res) => {
            console.log("webhook proxy error", err);
          });
          proxy.on("proxyReq", (_proxyReq, req, _res) => {
            console.log("Sending Request to the Target:", req.method, req.url);
          });
          proxy.on("proxyRes", (proxyRes, req, _res) => {
            console.log("Received Response from the Target:", proxyRes.statusCode, req.url);
          });
        }
      },
      // Airtable API代理配置 - 解决CORS问题
      "/airtable": {
        target: "https://api.airtable.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path2) => path2.replace(/^\/airtable/, ""),
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, _res) => {
            console.log("airtable proxy error", err);
          });
          proxy.on("proxyReq", (_proxyReq, req, _res) => {
            console.log("Airtable Request:", req.method, req.url);
          });
          proxy.on("proxyRes", (proxyRes, req, _res) => {
            console.log("Airtable Response:", proxyRes.statusCode, req.url);
          });
        }
      }
    }
  },
  build: {
    // 构建优化
    target: "es2015",
    minify: "esbuild",
    // 使用esbuild进行压缩，更快更稳定
    // 代码分割
    rollupOptions: {
      output: {
        // 更细粒度的代码分割
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            if (id.includes("react") || id.includes("react-dom")) {
              return "react-vendor";
            }
            if (id.includes("antd")) {
              return "antd-vendor";
            }
            if (id.includes("@reduxjs/toolkit") || id.includes("react-redux")) {
              return "redux-vendor";
            }
            if (id.includes("react-router")) {
              return "router-vendor";
            }
            if (id.includes("dayjs") || id.includes("moment")) {
              return "date-vendor";
            }
            if (id.includes("echarts") || id.includes("chart")) {
              return "chart-vendor";
            }
            if (id.includes("axios") || id.includes("msw")) {
              return "http-vendor";
            }
            return "vendor";
          }
          if (id.includes("/pages/")) {
            const pageName = id.split("/pages/")[1].split("/")[0];
            return `page-${pageName}`;
          }
          if (id.includes("/components/") && !id.includes("/components/common/")) {
            return "components";
          }
        },
        // 文件命名优化
        chunkFileNames: () => {
          return `js/[name]-[hash].js`;
        },
        entryFileNames: "js/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || "unknown";
          const info = name.split(".");
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
        }
      }
    },
    // 构建输出优化
    chunkSizeWarningLimit: 1e3,
    sourcemap: false,
    // 生产环境不生成sourcemap
    // 压缩优化
    cssCodeSplit: true,
    assetsInlineLimit: 4096
    // 小于4kb的资源内联
  },
  // 预构建优化
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@ant-design/icons",
      "antd",
      "@reduxjs/toolkit",
      "react-redux",
      "dayjs",
      "axios"
    ],
    exclude: ["msw"]
    // MSW不需要预构建
  },
  // CSS优化
  css: {
    devSourcemap: true,
    // CSS代码分割
    modules: {
      localsConvention: "camelCase"
    },
    // PostCSS优化
    postcss: {
      plugins: [
        // 可以添加autoprefixer等插件
      ]
    }
  },
  // 性能优化
  esbuild: {
    // 生产环境移除console和debugger
    drop: process.env.NODE_ENV === "production" ? ["console", "debugger"] : []
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxXZWJhcHBcXFxcV2VuZGVhbERhc2hib2FyZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcV2ViYXBwXFxcXFdlbmRlYWxEYXNoYm9hcmRcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1dlYmFwcC9XZW5kZWFsRGFzaGJvYXJkL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnXG5pbXBvcnQgeyB2aXN1YWxpemVyIH0gZnJvbSAncm9sbHVwLXBsdWdpbi12aXN1YWxpemVyJ1xuXG4vLyBodHRwczovL3ZpdGUuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCh7XG4gICAgICAvLyBSZWFjdFx1NEYxOFx1NTMxNlx1OTE0RFx1N0Y2RVxuICAgICAgLy8gXHU2NjgyXHU2NUY2XHU3OUZCXHU5NjY0QmFiZWxcdTYzRDJcdTRFRjZcdTkxNERcdTdGNkVcdTRFRTVcdTg5RTNcdTUxQjNcdTg5RTNcdTY3OTBcdTk1MTlcdThCRUZcbiAgICB9KSxcbiAgICAvLyBcdTRFRTNcdTc4MDFcdTUyMDZcdTUyNzJcdTkwMUFcdThGQzdyb2xsdXBPcHRpb25zLm91dHB1dC5tYW51YWxDaHVua3NcdTVCOUVcdTczQjBcbiAgICAvLyBCdW5kbGVcdTUyMDZcdTY3OTBcdTYzRDJcdTRFRjZcdUZGMDhcdTRFQzVcdTU3MjhcdTUyMDZcdTY3OTBcdTZBMjFcdTVGMEZcdTRFMEJcdTU0MkZcdTc1MjhcdUZGMDlcbiAgICAuLi4ocHJvY2Vzcy5lbnYuQU5BTFlaRSA/IFt2aXN1YWxpemVyKHtcbiAgICAgIGZpbGVuYW1lOiAnZGlzdC9zdGF0cy5odG1sJyxcbiAgICAgIG9wZW46IHRydWUsXG4gICAgICBnemlwU2l6ZTogdHJ1ZSxcbiAgICAgIGJyb3RsaVNpemU6IHRydWUsXG4gICAgfSkgYXMgYW55XSA6IFtdKVxuICBdLFxuICBkZWZpbmU6IHtcbiAgICAncHJvY2Vzcy5lbnYnOiB7fSxcbiAgICAvLyBcdTc1MUZcdTRFQTdcdTczQUZcdTU4ODNcdTRGMThcdTUzMTZcbiAgICBfX0RFVl9fOiBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nLFxuICB9LFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgICdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjJyksXG4gICAgfSxcbiAgfSxcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogNTE3MyxcbiAgICBvcGVuOiB0cnVlLFxuICAgIGhvc3Q6IHRydWUsIC8vIFx1NTE0MVx1OEJCOFx1NTkxNlx1OTBFOFx1OEJCRlx1OTVFRVxuICAgIC8vIFx1NUYwMFx1NTNEMVx1NjcwRFx1NTJBMVx1NTY2OFx1NEYxOFx1NTMxNlxuICAgIGhtcjoge1xuICAgICAgb3ZlcmxheTogZmFsc2UsIC8vIFx1Nzk4MVx1NzUyOFx1OTUxOVx1OEJFRlx1ODk4Nlx1NzZENlx1NUM0MlxuICAgIH0sXG4gICAgLy8gQVBJXHU0RUUzXHU3NDA2XHU5MTREXHU3RjZFIC0gXHU0RUUzXHU3NDA2XHU1MjMwbjhuXHU2NzBEXHU1MkExXHU1NjY4XG4gICAgcHJveHk6IHtcbiAgICAgICcvYXBpJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwczovL244bi53ZW5kZWFsYWkuY29tJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICBzZWN1cmU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyZTogKHByb3h5LCBfb3B0aW9ucykgPT4ge1xuICAgICAgICAgIHByb3h5Lm9uKCdlcnJvcicsIChlcnIsIF9yZXEsIF9yZXMpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwcm94eSBlcnJvcicsIGVycik7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcHJveHkub24oJ3Byb3h5UmVxJywgKF9wcm94eVJlcSwgcmVxLCBfcmVzKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnW0RFVl0gUHJveHlpbmcgcmVxdWVzdDonLCByZXEubWV0aG9kLCByZXEudXJsKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICAvLyBXZWJob29rXHU0RUUzXHU3NDA2XHU5MTREXHU3RjZFIC0gXHU4OUUzXHU1MUIzQ09SU1x1OTVFRVx1OTg5OFxuICAgICAgJy93ZWJob29rJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwczovL244bi53ZW5kZWFsYWkuY29tJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICBzZWN1cmU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyZTogKHByb3h5LCBfb3B0aW9ucykgPT4ge1xuICAgICAgICAgIHByb3h5Lm9uKCdlcnJvcicsIChlcnIsIF9yZXEsIF9yZXMpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCd3ZWJob29rIHByb3h5IGVycm9yJywgZXJyKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBwcm94eS5vbigncHJveHlSZXEnLCAoX3Byb3h5UmVxLCByZXEsIF9yZXMpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTZW5kaW5nIFJlcXVlc3QgdG8gdGhlIFRhcmdldDonLCByZXEubWV0aG9kLCByZXEudXJsKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBwcm94eS5vbigncHJveHlSZXMnLCAocHJveHlSZXMsIHJlcSwgX3JlcykgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1JlY2VpdmVkIFJlc3BvbnNlIGZyb20gdGhlIFRhcmdldDonLCBwcm94eVJlcy5zdGF0dXNDb2RlLCByZXEudXJsKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICAvLyBBaXJ0YWJsZSBBUElcdTRFRTNcdTc0MDZcdTkxNERcdTdGNkUgLSBcdTg5RTNcdTUxQjNDT1JTXHU5NUVFXHU5ODk4XG4gICAgICAnL2FpcnRhYmxlJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwczovL2FwaS5haXJ0YWJsZS5jb20nLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIHNlY3VyZTogdHJ1ZSxcbiAgICAgICAgcmV3cml0ZTogKHBhdGgpID0+IHBhdGgucmVwbGFjZSgvXlxcL2FpcnRhYmxlLywgJycpLFxuICAgICAgICBjb25maWd1cmU6IChwcm94eSwgX29wdGlvbnMpID0+IHtcbiAgICAgICAgICBwcm94eS5vbignZXJyb3InLCAoZXJyLCBfcmVxLCBfcmVzKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnYWlydGFibGUgcHJveHkgZXJyb3InLCBlcnIpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHByb3h5Lm9uKCdwcm94eVJlcScsIChfcHJveHlSZXEsIHJlcSwgX3JlcykgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ0FpcnRhYmxlIFJlcXVlc3Q6JywgcmVxLm1ldGhvZCwgcmVxLnVybCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcHJveHkub24oJ3Byb3h5UmVzJywgKHByb3h5UmVzLCByZXEsIF9yZXMpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdBaXJ0YWJsZSBSZXNwb25zZTonLCBwcm94eVJlcy5zdGF0dXNDb2RlLCByZXEudXJsKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcblxuICBidWlsZDoge1xuICAgIC8vIFx1Njc4NFx1NUVGQVx1NEYxOFx1NTMxNlxuICAgIHRhcmdldDogJ2VzMjAxNScsXG4gICAgbWluaWZ5OiAnZXNidWlsZCcsIC8vIFx1NEY3Rlx1NzUyOGVzYnVpbGRcdThGREJcdTg4NENcdTUzOEJcdTdGMjlcdUZGMENcdTY2RjRcdTVGRUJcdTY2RjRcdTdBMzNcdTVCOUFcbiAgICAvLyBcdTRFRTNcdTc4MDFcdTUyMDZcdTUyNzJcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgLy8gXHU2NkY0XHU3RUM2XHU3QzkyXHU1RUE2XHU3Njg0XHU0RUUzXHU3ODAxXHU1MjA2XHU1MjcyXG4gICAgICAgIG1hbnVhbENodW5rczogKGlkKSA9PiB7XG4gICAgICAgICAgLy8gXHU3QjJDXHU0RTA5XHU2NUI5XHU1RTkzXHU1MjA2XHU1MjcyXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMnKSkge1xuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdyZWFjdCcpIHx8IGlkLmluY2x1ZGVzKCdyZWFjdC1kb20nKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ3JlYWN0LXZlbmRvcic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ2FudGQnKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ2FudGQtdmVuZG9yJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnQHJlZHV4anMvdG9vbGtpdCcpIHx8IGlkLmluY2x1ZGVzKCdyZWFjdC1yZWR1eCcpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAncmVkdXgtdmVuZG9yJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygncmVhY3Qtcm91dGVyJykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICdyb3V0ZXItdmVuZG9yJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnZGF5anMnKSB8fCBpZC5pbmNsdWRlcygnbW9tZW50JykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICdkYXRlLXZlbmRvcic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ2VjaGFydHMnKSB8fCBpZC5pbmNsdWRlcygnY2hhcnQnKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ2NoYXJ0LXZlbmRvcic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ2F4aW9zJykgfHwgaWQuaW5jbHVkZXMoJ21zdycpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnaHR0cC12ZW5kb3InO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3InO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBcdTk4NzVcdTk3NjJcdTdFQTdcdTUyMkJcdTUyMDZcdTUyNzJcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJy9wYWdlcy8nKSkge1xuICAgICAgICAgICAgY29uc3QgcGFnZU5hbWUgPSBpZC5zcGxpdCgnL3BhZ2VzLycpWzFdLnNwbGl0KCcvJylbMF07XG4gICAgICAgICAgICByZXR1cm4gYHBhZ2UtJHtwYWdlTmFtZX1gO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBcdTdFQzRcdTRFRjZcdTdFQTdcdTUyMkJcdTUyMDZcdTUyNzJcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJy9jb21wb25lbnRzLycpICYmICFpZC5pbmNsdWRlcygnL2NvbXBvbmVudHMvY29tbW9uLycpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2NvbXBvbmVudHMnO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgLy8gXHU2NTg3XHU0RUY2XHU1NDdEXHU1NDBEXHU0RjE4XHU1MzE2XG4gICAgICAgIGNodW5rRmlsZU5hbWVzOiAoKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIGBqcy9bbmFtZV0tW2hhc2hdLmpzYDtcbiAgICAgICAgfSxcbiAgICAgICAgZW50cnlGaWxlTmFtZXM6ICdqcy9bbmFtZV0tW2hhc2hdLmpzJyxcbiAgICAgICAgYXNzZXRGaWxlTmFtZXM6IChhc3NldEluZm8pID0+IHtcbiAgICAgICAgICBjb25zdCBuYW1lID0gYXNzZXRJbmZvLm5hbWUgfHwgJ3Vua25vd24nO1xuICAgICAgICAgIGNvbnN0IGluZm8gPSBuYW1lLnNwbGl0KCcuJyk7XG4gICAgICAgICAgY29uc3QgZXh0ID0gaW5mb1tpbmZvLmxlbmd0aCAtIDFdO1xuICAgICAgICAgIGlmICgvXFwuKGNzcykkLy50ZXN0KG5hbWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gYGNzcy9bbmFtZV0tW2hhc2hdLiR7ZXh0fWA7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgvXFwuKHBuZ3xqcGU/Z3xnaWZ8c3ZnfHdlYnB8aWNvKSQvLnRlc3QobmFtZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBgaW1hZ2VzL1tuYW1lXS1baGFzaF0uJHtleHR9YDtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKC9cXC4od29mZjI/fGVvdHx0dGZ8b3RmKSQvLnRlc3QobmFtZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBgZm9udHMvW25hbWVdLVtoYXNoXS4ke2V4dH1gO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gYGFzc2V0cy9bbmFtZV0tW2hhc2hdLiR7ZXh0fWA7XG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gICAgLy8gXHU2Nzg0XHU1RUZBXHU4RjkzXHU1MUZBXHU0RjE4XHU1MzE2XG4gICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiAxMDAwLFxuICAgIHNvdXJjZW1hcDogZmFsc2UsIC8vIFx1NzUxRlx1NEVBN1x1NzNBRlx1NTg4M1x1NEUwRFx1NzUxRlx1NjIxMHNvdXJjZW1hcFxuICAgIC8vIFx1NTM4Qlx1N0YyOVx1NEYxOFx1NTMxNlxuICAgIGNzc0NvZGVTcGxpdDogdHJ1ZSxcbiAgICBhc3NldHNJbmxpbmVMaW1pdDogNDA5NiwgLy8gXHU1QzBGXHU0RThFNGtiXHU3Njg0XHU4RDQ0XHU2RTkwXHU1MTg1XHU4MDU0XG4gIH0sXG4gIC8vIFx1OTg4NFx1Njc4NFx1NUVGQVx1NEYxOFx1NTMxNlxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBpbmNsdWRlOiBbXG4gICAgICAncmVhY3QnLFxuICAgICAgJ3JlYWN0LWRvbScsXG4gICAgICAncmVhY3Qtcm91dGVyLWRvbScsXG4gICAgICAnQGFudC1kZXNpZ24vaWNvbnMnLFxuICAgICAgJ2FudGQnLFxuICAgICAgJ0ByZWR1eGpzL3Rvb2xraXQnLFxuICAgICAgJ3JlYWN0LXJlZHV4JyxcbiAgICAgICdkYXlqcycsXG4gICAgICAnYXhpb3MnLFxuICAgIF0sXG4gICAgZXhjbHVkZTogWydtc3cnXSwgLy8gTVNXXHU0RTBEXHU5NzAwXHU4OTgxXHU5ODg0XHU2Nzg0XHU1RUZBXG4gIH0sXG4gIC8vIENTU1x1NEYxOFx1NTMxNlxuICBjc3M6IHtcbiAgICBkZXZTb3VyY2VtYXA6IHRydWUsXG4gICAgLy8gQ1NTXHU0RUUzXHU3ODAxXHU1MjA2XHU1MjcyXG4gICAgbW9kdWxlczoge1xuICAgICAgbG9jYWxzQ29udmVudGlvbjogJ2NhbWVsQ2FzZScsXG4gICAgfSxcbiAgICAvLyBQb3N0Q1NTXHU0RjE4XHU1MzE2XG4gICAgcG9zdGNzczoge1xuICAgICAgcGx1Z2luczogW1xuICAgICAgICAvLyBcdTUzRUZcdTRFRTVcdTZERkJcdTUyQTBhdXRvcHJlZml4ZXJcdTdCNDlcdTYzRDJcdTRFRjZcbiAgICAgIF0sXG4gICAgfSxcbiAgfSxcbiAgLy8gXHU2MDI3XHU4MEZEXHU0RjE4XHU1MzE2XG4gIGVzYnVpbGQ6IHtcbiAgICAvLyBcdTc1MUZcdTRFQTdcdTczQUZcdTU4ODNcdTc5RkJcdTk2NjRjb25zb2xlXHU1NDhDZGVidWdnZXJcbiAgICBkcm9wOiBwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gJ3Byb2R1Y3Rpb24nID8gWydjb25zb2xl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
