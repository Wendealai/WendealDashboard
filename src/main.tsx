import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './locales';

// 在开发环境中启动MSW
async function startApp() {
  if (import.meta.env.DEV) {
    const { worker } = await import('./mocks');
    await worker.start({
      onUnhandledRequest: 'bypass',
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
      quiet: false, // 显示启动信息
    });
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

startApp();
