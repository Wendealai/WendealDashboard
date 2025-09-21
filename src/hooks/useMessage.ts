/**
 * 使用Ant Design Message的自定义Hook
 * 解决静态函数无法消费动态主题上下文的问题
 */

import { message as staticMessage } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';

// 全局message实例引用
let globalMessageInstance: MessageInstance | null = null;

/**
 * 设置全局message实例
 * 由App组件调用以提供正确的上下文
 */
export const setGlobalMessageInstance = (instance: MessageInstance) => {
  globalMessageInstance = instance;
};

/**
 * 使用Ant Design Message的Hook
 * 确保总是返回有效的message实例
 * @returns Message实例
 */
export const useMessage = (): MessageInstance => {
  // 优先使用全局message实例（从App上下文获取），如果没有则使用静态实例
  const message = globalMessageInstance || staticMessage;

  // 调试日志
  console.log('useMessage: Returning message instance:', {
    hasGlobalInstance: !!globalMessageInstance,
    hasSuccess: typeof message?.success === 'function',
    hasError: typeof message?.error === 'function',
    messageType: typeof message,
  });

  // 如果message实例没有必要的方法，创建一个包装器
  if (
    !message ||
    typeof message.success !== 'function' ||
    typeof message.error !== 'function'
  ) {
    console.warn(
      'useMessage: Message instance is invalid, creating fallback wrapper'
    );
    return {
      success: (content: any) => staticMessage.success(content),
      error: (content: any) => staticMessage.error(content),
      info: (content: any) => staticMessage.info(content),
      warning: (content: any) => staticMessage.warning(content),
      loading: (content: any) => staticMessage.loading(content),
      open: (config: any) => staticMessage.open(config),
      destroy: () => staticMessage.destroy(),
      useMessage: () => staticMessage,
    } as MessageInstance;
  }

  return message;
};

/**
 * 获取安全的message实例
 * 用于非React组件（如服务文件）
 */
export const getSafeMessage = (): MessageInstance => {
  return globalMessageInstance || staticMessage;
};

export default useMessage;
