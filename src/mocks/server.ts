import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * 设置MSW服务器用于Node.js环境（测试）
 * 提供API模拟功能
 */
export const server = setupServer(...handlers);
