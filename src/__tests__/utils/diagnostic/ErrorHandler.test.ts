/**
 * Error Handler Unit Tests
 * 错误处理器单元测试
 */

import {
  ErrorHandler,
  ErrorType,
  LogLevel,
  withErrorHandling,
  withRetry,
  withTimeout,
} from '../../../utils/diagnostic/ErrorHandler';

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    errorHandler = new ErrorHandler({
      enableLogging: true,
      maxLogEntries: 100,
    });
  });

  describe('错误处理', () => {
    it('应该正确处理Error对象', async () => {
      const error = new Error('测试错误');
      const result = await errorHandler.handleError(error, {
        operation: 'test_operation',
        filePath: '/test/file.ts',
      });

      expect(result.handled).toBe(true);
      expect(result.recoverable).toBe(false);
      expect(result.suggestion).toBeDefined();
    });

    it('应该正确处理字符串错误', async () => {
      const error = '字符串错误';
      const result = await errorHandler.handleError(error);

      expect(result.handled).toBe(true);
      expect(result.recoverable).toBe(false);
    });

    it('应该正确处理未知错误', async () => {
      const error = { custom: 'error' };
      const result = await errorHandler.handleError(error);

      expect(result.handled).toBe(true);
      expect(result.recoverable).toBe(false);
    });
  });

  describe('错误分类', () => {
    it('应该正确分类文件系统错误', async () => {
      const error = new Error('ENOENT: file not found');
      await errorHandler.handleError(error);

      const stats = errorHandler.getErrorStats();
      expect(stats.errorsByType[ErrorType.FILE_SYSTEM_ERROR]).toBe(1);
    });

    it('应该正确分类网络错误', async () => {
      const error = new Error('Network request failed');
      await errorHandler.handleError(error);

      const stats = errorHandler.getErrorStats();
      expect(stats.errorsByType[ErrorType.NETWORK_ERROR]).toBe(1);
    });

    it('应该正确分类超时错误', async () => {
      const error = new Error('Operation timeout');
      await errorHandler.handleError(error);

      const stats = errorHandler.getErrorStats();
      expect(stats.errorsByType[ErrorType.TIMEOUT_ERROR]).toBe(1);
    });
  });

  describe('日志记录', () => {
    it('应该记录不同级别的日志', () => {
      errorHandler.log(LogLevel.INFO, '信息日志');
      errorHandler.log(LogLevel.WARN, '警告日志');
      errorHandler.log(LogLevel.ERROR, '错误日志');

      const logs = errorHandler.getLogs();
      expect(logs.length).toBe(3);
      expect(logs[0].level).toBe(LogLevel.INFO);
      expect(logs[1].level).toBe(LogLevel.WARN);
      expect(logs[2].level).toBe(LogLevel.ERROR);
    });

    it('应该按级别过滤日志', () => {
      errorHandler.log(LogLevel.INFO, '信息日志');
      errorHandler.log(LogLevel.ERROR, '错误日志');

      const errorLogs = errorHandler.getLogs({ level: LogLevel.ERROR });
      expect(errorLogs.length).toBe(1);
      expect(errorLogs[0].level).toBe(LogLevel.ERROR);
    });

    it('应该按时间过滤日志', () => {
      const pastTime = new Date(Date.now() - 1000);
      errorHandler.log(LogLevel.INFO, '旧日志');

      const recentLogs = errorHandler.getLogs({ since: pastTime });
      expect(recentLogs.length).toBe(1);
    });
  });

  describe('重试机制', () => {
    it('应该成功重试操作', async () => {
      let attempts = 0;
      const operation = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 2) {
          throw new Error('临时失败');
        }
        return 'success';
      });

      const result = await errorHandler.withRetry(operation, {
        operationName: 'test_retry',
        maxRetries: 2,
      });

      expect(result).toBe('success');
      expect(attempts).toBe(2);
    });

    it('应该在达到最大重试次数后失败', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('永久失败'));

      await expect(
        errorHandler.withRetry(operation, {
          operationName: 'test_retry',
          maxRetries: 2,
        })
      ).rejects.toThrow('永久失败');

      expect(operation).toHaveBeenCalledTimes(3); // 初始 + 2次重试
    });
  });

  describe('超时处理', () => {
    it('应该在超时前完成操作', async () => {
      const operation = new Promise(resolve =>
        setTimeout(() => resolve('success'), 50)
      );

      const result = await errorHandler.withTimeout(operation, 100, {
        operationName: 'test_timeout',
      });

      expect(result).toBe('success');
    });

    it('应该在超时后抛出错误', async () => {
      const operation = new Promise(resolve =>
        setTimeout(() => resolve('success'), 200)
      );

      await expect(
        errorHandler.withTimeout(operation, 50, {
          operationName: 'test_timeout',
        })
      ).rejects.toThrow('操作超时');
    });
  });

  describe('错误边界', () => {
    it('应该包装同步函数', () => {
      const originalFn = jest.fn().mockImplementation(() => {
        throw new Error('同步错误');
      });

      const wrappedFn = errorHandler.createErrorBoundary(originalFn, {
        operationName: 'sync_test',
      });

      expect(() => wrappedFn()).toThrow('同步错误');
    });

    it('应该包装异步函数', async () => {
      const originalFn = jest.fn().mockRejectedValue(new Error('异步错误'));

      const wrappedFn = errorHandler.createErrorBoundary(originalFn, {
        operationName: 'async_test',
      });

      await expect(wrappedFn()).rejects.toThrow('异步错误');
    });
  });

  describe('统计信息', () => {
    it('应该提供错误统计', async () => {
      await errorHandler.handleError(new Error('测试错误1'));
      await errorHandler.handleError(new Error('测试错误2'));

      const stats = errorHandler.getErrorStats();
      expect(stats.totalErrors).toBe(2);
      expect(stats.recentErrors.length).toBe(2);
    });

    it('应该清除日志', () => {
      errorHandler.log(LogLevel.INFO, '测试日志');
      expect(errorHandler.getLogs().length).toBe(1);

      errorHandler.clearLogs();
      expect(errorHandler.getLogs().length).toBe(0);
    });
  });

  describe('导出功能', () => {
    it('应该导出日志和统计', () => {
      errorHandler.log(LogLevel.INFO, '测试日志');

      const exported = errorHandler.exportLogs();
      expect(exported.logs.length).toBe(1);
      expect(exported.stats).toBeDefined();
    });
  });
});

describe('错误处理装饰器', () => {
  describe('withErrorHandling', () => {
    it('应该包装函数并处理错误', () => {
      const originalFn = jest.fn().mockImplementation(() => {
        throw new Error('装饰器错误');
      });

      const decoratedFn = withErrorHandling(originalFn, {
        operationName: 'decorated_test',
      });

      expect(() => decoratedFn()).toThrow('装饰器错误');
    });
  });

  describe('withRetry', () => {
    it('应该为函数添加重试功能', async () => {
      let attempts = 0;
      const originalFn = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 2) {
          throw new Error('需要重试');
        }
        return 'success';
      });

      const decoratedFn = withRetry(originalFn, {
        maxRetries: 2,
        operationName: 'retry_decorated',
      });

      const result = await decoratedFn();
      expect(result).toBe('success');
      expect(attempts).toBe(2);
    });
  });

  describe('withTimeout', () => {
    it('应该为函数添加超时功能', async () => {
      const originalFn = jest.fn().mockImplementation(() => {
        return new Promise(resolve => setTimeout(() => resolve('success'), 50));
      });

      const decoratedFn = withTimeout(originalFn, 100, 'timeout_decorated');

      const result = await decoratedFn();
      expect(result).toBe('success');
    });
  });
});
