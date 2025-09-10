import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// 设置MSW worker
export const worker = setupWorker(...handlers);

// 移除自动启动，由main.tsx控制启动时机
