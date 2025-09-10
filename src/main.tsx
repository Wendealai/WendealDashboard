import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './locales';

// 在开发环境中启动MSW (暂时禁用以解决CORS问题)
if (import.meta.env.DEV) {
  console.log('MSW已临时禁用以解决webhook CORS问题');
  // import('./mocks').then(({ worker }) => {
  //   worker.start({
  //     onUnhandledRequest: (request) => {
  //       // 明确放过Notion API和外部API请求
  //       if (request.url.hostname === 'api.notion.com' ||
  //           request.url.hostname === 'n8n.wendealai.com' ||
  //           request.url.hostname !== 'localhost') {
  //         return;
  //       }
  //       // 对于其他未处理的请求，记录警告
  //       console.warn('MSW: Unhandled request:', request.method, request.url);
  //     },
  //     serviceWorker: {
  //       url: '/mockServiceWorker.js',
  //     },
  //     quiet: false, // 显示启动信息
  //   });
  // });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
