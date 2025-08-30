// Export utility functions
// Example:
// export { formatDate } from './dateUtils';
// export { validateEmail } from './validation';
// export { apiClient } from './api';

// 认证相关工具函数
export {
  tokenUtils,
  userUtils,
  sessionUtils,
  passwordUtils,
  permissionUtils,
  cryptoUtils,
  validationUtils,
} from './auth';
export { default as authUtils } from './auth';

// 延迟函数
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// 格式化数字
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('zh-CN').format(num);
};

// 格式化货币
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
  }).format(amount);
};
