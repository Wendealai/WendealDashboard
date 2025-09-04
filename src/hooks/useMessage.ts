import { App } from 'antd';

/**
 * 自定义hook，用于获取Ant Design的message实例
 * 解决message静态函数无法消费动态主题上下文的警告
 * @returns message实例，包含success、error、warning、info、loading等方法
 */
export const useMessage = () => {
  const { message } = App.useApp();
  return message;
};

export default useMessage;
