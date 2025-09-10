/**
 * 使用Ant Design Message的自定义Hook
 * 解决静态函数无法消费动态主题上下文的问题
 */

import { message as staticMessage } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';

/**
 * 使用Ant Design Message的Hook
 * 包装静态message API以避免上下文警告
 * @returns Message实例
 */
export const useMessage = (): MessageInstance => {
  return staticMessage;
};

export default useMessage;