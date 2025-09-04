import { useState, useCallback } from 'react';

export interface ErrorInfo {
  /** 错误标题 */
  title?: string;
  /** 错误消息 */
  message: string;
  /** 错误详情 */
  details?: string;
}

export interface UseErrorModalReturn {
  /** 是否显示错误模态框 */
  isVisible: boolean;
  /** 当前错误信息 */
  errorInfo: ErrorInfo | null;
  /** 显示错误模态框 */
  showError: (error: ErrorInfo | string) => void;
  /** 隐藏错误模态框 */
  hideError: () => void;
  /** 清除错误信息 */
  clearError: () => void;
}

/**
 * 错误模态框管理Hook
 * 提供持久化错误显示功能，替代自动消失的message.error
 */
export const useErrorModal = (): UseErrorModalReturn => {
  const [isVisible, setIsVisible] = useState(false);
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);

  /**
   * 显示错误模态框
   * @param error 错误信息，可以是字符串或ErrorInfo对象
   */
  const showError = useCallback((error: ErrorInfo | string) => {
    if (typeof error === 'string') {
      setErrorInfo({
        message: error,
      });
    } else {
      setErrorInfo(error);
    }
    setIsVisible(true);
  }, []);

  /**
   * 隐藏错误模态框
   */
  const hideError = useCallback(() => {
    setIsVisible(false);
  }, []);

  /**
   * 清除错误信息并隐藏模态框
   */
  const clearError = useCallback(() => {
    setIsVisible(false);
    setErrorInfo(null);
  }, []);

  return {
    isVisible,
    errorInfo,
    showError,
    hideError,
    clearError,
  };
};

export default useErrorModal;
