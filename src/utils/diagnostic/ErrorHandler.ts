/**
 * Error Handler Component
 * 错误处理器组件
 */

import type { ExportIssue, DiagnosticConfig } from '@/types/exportDiagnostic';
import { ExportIssueType, IssueSeverity } from '@/types/exportDiagnostic';

/**
 * 错误类型枚举
 */
export enum ErrorType {
  /** 文件系统错误 */
  FILE_SYSTEM_ERROR = 'file_system_error',
  /** 解析错误 */
  PARSING_ERROR = 'parsing_error',
  /** 配置错误 */
  CONFIGURATION_ERROR = 'configuration_error',
  /** 网络错误 */
  NETWORK_ERROR = 'network_error',
  /** 超时错误 */
  TIMEOUT_ERROR = 'timeout_error',
  /** 内存错误 */
  MEMORY_ERROR = 'memory_error',
  /** 未知错误 */
  UNKNOWN_ERROR = 'unknown_error',
}

/**
 * 日志级别枚举
 */
export enum LogLevel {
  /** 调试 */
  DEBUG = 'debug',
  /** 信息 */
  INFO = 'info',
  /** 警告 */
  WARN = 'warn',
  /** 错误 */
  ERROR = 'error',
  /** 致命错误 */
  FATAL = 'fatal',
}

/**
 * 日志条目接口
 */
export interface LogEntry {
  /** 时间戳 */
  timestamp: Date;
  /** 日志级别 */
  level: LogLevel;
  /** 消息 */
  message: string;
  /** 错误对象 */
  error?: Error;
  /** 上下文信息 */
  context?: Record<string, any>;
  /** 堆栈跟踪 */
  stack?: string;
}

/**
 * 错误处理选项
 */
export interface ErrorHandlerOptions {
  /** 是否启用日志记录 */
  enableLogging?: boolean;
  /** 日志文件路径 */
  logFile?: string;
  /** 最大日志条目数 */
  maxLogEntries?: number;
  /** 是否启用错误恢复 */
  enableRecovery?: boolean;
  /** 错误重试次数 */
  maxRetries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
}

/**
 * 错误处理器类
 */
export class ErrorHandler {
  private options: ErrorHandlerOptions;
  private logs: LogEntry[] = [];
  private errorCounts: Map<ErrorType, number> = new Map();

  constructor(options: ErrorHandlerOptions = {}) {
    this.options = {
      enableLogging: true,
      maxLogEntries: 1000,
      enableRecovery: true,
      maxRetries: 3,
      retryDelay: 1000,
      ...options,
    };
  }

  /**
   * 处理错误
   */
  async handleError(
    error: Error | unknown,
    context?: {
      operation?: string;
      filePath?: string;
      component?: string;
      additionalInfo?: Record<string, any>;
    }
  ): Promise<{
    handled: boolean;
    recoverable: boolean;
    suggestion?: string;
  }> {
    const errorInfo = this.normalizeError(error);
    const errorType = this.classifyError(errorInfo);

    // 记录错误
    this.logError(errorInfo, context);

    // 更新错误计数
    this.errorCounts.set(errorType, (this.errorCounts.get(errorType) || 0) + 1);

    // 确定是否可恢复
    const recoverable = this.isRecoverable(errorType, errorInfo);

    // 生成建议
    const suggestion = this.generateSuggestion(errorType, errorInfo, context);

    return {
      handled: true,
      recoverable,
      suggestion,
    };
  }

  /**
   * 处理异步操作的重试
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    context?: {
      operationName?: string;
      maxRetries?: number;
      retryDelay?: number;
    }
  ): Promise<T> {
    const maxRetries = context?.maxRetries ?? this.options.maxRetries ?? 3;
    const retryDelay = context?.retryDelay ?? this.options.retryDelay ?? 1000;

    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          this.log(
            LogLevel.WARN,
            `操作失败，重试 ${attempt + 1}/${maxRetries}`,
            {
              operation: context?.operationName,
              error: lastError.message,
              attempt: attempt + 1,
            }
          );

          // 等待重试延迟
          await this.delay(retryDelay * Math.pow(2, attempt)); // 指数退避
        }
      }
    }

    // 所有重试都失败
    throw lastError!;
  }

  /**
   * 处理超时操作
   */
  async withTimeout<T>(
    operation: Promise<T>,
    timeoutMs: number,
    context?: {
      operationName?: string;
    }
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            `操作超时: ${context?.operationName || 'unknown'} (${timeoutMs}ms)`
          )
        );
      }, timeoutMs);
    });

    try {
      return await Promise.race([operation, timeoutPromise]);
    } catch (error) {
      await this.handleError(error, {
        operation: context?.operationName,
        additionalInfo: { timeoutMs },
      });
      throw error;
    }
  }

  /**
   * 创建错误边界包装器
   */
  createErrorBoundary<T extends (...args: any[]) => any>(
    fn: T,
    context?: {
      operationName?: string;
      component?: string;
    }
  ): T {
    return ((...args: Parameters<T>) => {
      try {
        const result = fn(...args);

        // 处理异步函数
        if (result && typeof result.catch === 'function') {
          return result.catch((error: Error) => {
            this.handleError(error, {
              operation: context?.operationName,
              component: context?.component,
              additionalInfo: { args },
            });
            throw error;
          });
        }

        return result;
      } catch (error) {
        this.handleError(error, {
          operation: context?.operationName,
          component: context?.component,
          additionalInfo: { args },
        });
        throw error;
      }
    }) as T;
  }

  /**
   * 记录日志
   */
  log(level: LogLevel, message: string, context?: Record<string, any>): void {
    if (!this.options.enableLogging) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context,
    };

    this.logs.push(entry);

    // 限制日志条目数量
    if (this.logs.length > (this.options.maxLogEntries || 1000)) {
      this.logs = this.logs.slice(-500); // 保留最新的500条
    }

    // 控制台输出
    this.outputToConsole(entry);
  }

  /**
   * 记录错误
   */
  private logError(
    error: { message: string; stack?: string; name: string },
    context?: {
      operation?: string;
      filePath?: string;
      component?: string;
      additionalInfo?: Record<string, any>;
    }
  ): void {
    this.log(LogLevel.ERROR, error.message, {
      error: {
        name: error.name,
        stack: error.stack,
      },
      ...context,
    });
  }

  /**
   * 获取日志
   */
  getLogs(filter?: {
    level?: LogLevel;
    since?: Date;
    component?: string;
  }): LogEntry[] {
    let filteredLogs = this.logs;

    if (filter?.level) {
      filteredLogs = filteredLogs.filter(log => log.level === filter.level);
    }

    if (filter?.since) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.since!);
    }

    if (filter?.component) {
      filteredLogs = filteredLogs.filter(
        log => log.context?.component === filter.component
      );
    }

    return filteredLogs;
  }

  /**
   * 获取错误统计
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByType: Record<ErrorType, number>;
    recentErrors: LogEntry[];
  } {
    const totalErrors = Array.from(this.errorCounts.values()).reduce(
      (sum, count) => sum + count,
      0
    );

    const errorsByType: Record<ErrorType, number> = {} as any;
    for (const [type, count] of this.errorCounts.entries()) {
      errorsByType[type] = count;
    }

    const recentErrors = this.getLogs({
      level: LogLevel.ERROR,
      since: new Date(Date.now() - 24 * 60 * 60 * 1000), // 最近24小时
    });

    return {
      totalErrors,
      errorsByType,
      recentErrors,
    };
  }

  /**
   * 清除日志
   */
  clearLogs(): void {
    this.logs = [];
    this.errorCounts.clear();
  }

  /**
   * 导出日志
   */
  exportLogs(): {
    logs: LogEntry[];
    stats: ReturnType<typeof this.getErrorStats>;
  } {
    return {
      logs: [...this.logs],
      stats: this.getErrorStats(),
    };
  }

  /**
   * 规范化错误
   */
  private normalizeError(error: Error | unknown): {
    message: string;
    stack?: string;
    name: string;
  } {
    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    }

    if (typeof error === 'string') {
      return {
        message: error,
        name: 'StringError',
      };
    }

    return {
      message: String(error),
      name: 'UnknownError',
    };
  }

  /**
   * 分类错误
   */
  private classifyError(error: {
    message: string;
    stack?: string;
    name: string;
  }): ErrorType {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    if (message.includes('enoent') || message.includes('file not found')) {
      return ErrorType.FILE_SYSTEM_ERROR;
    }

    if (message.includes('parse') || message.includes('syntax')) {
      return ErrorType.PARSING_ERROR;
    }

    if (message.includes('config') || message.includes('configuration')) {
      return ErrorType.CONFIGURATION_ERROR;
    }

    if (message.includes('network') || message.includes('fetch')) {
      return ErrorType.NETWORK_ERROR;
    }

    if (message.includes('timeout')) {
      return ErrorType.TIMEOUT_ERROR;
    }

    if (message.includes('memory') || message.includes('heap')) {
      return ErrorType.MEMORY_ERROR;
    }

    return ErrorType.UNKNOWN_ERROR;
  }

  /**
   * 判断错误是否可恢复
   */
  private isRecoverable(
    errorType: ErrorType,
    error: { message: string }
  ): boolean {
    switch (errorType) {
      case ErrorType.FILE_SYSTEM_ERROR:
        return error.message.includes('temporarily unavailable');
      case ErrorType.NETWORK_ERROR:
        return true; // 网络错误通常可重试
      case ErrorType.TIMEOUT_ERROR:
        return true; // 超时错误可重试
      case ErrorType.PARSING_ERROR:
        return false; // 解析错误通常不可恢复
      case ErrorType.CONFIGURATION_ERROR:
        return false; // 配置错误需要手动修复
      case ErrorType.MEMORY_ERROR:
        return false; // 内存错误通常不可恢复
      default:
        return false;
    }
  }

  /**
   * 生成错误处理建议
   */
  private generateSuggestion(
    errorType: ErrorType,
    error: { message: string },
    context?: { operation?: string; filePath?: string }
  ): string {
    switch (errorType) {
      case ErrorType.FILE_SYSTEM_ERROR:
        return context?.filePath
          ? `检查文件是否存在: ${context.filePath}`
          : '检查文件系统权限和路径';

      case ErrorType.PARSING_ERROR:
        return context?.filePath
          ? `检查文件语法: ${context.filePath}`
          : '检查代码语法错误';

      case ErrorType.CONFIGURATION_ERROR:
        return '检查配置文件格式和参数';

      case ErrorType.NETWORK_ERROR:
        return '检查网络连接和API端点';

      case ErrorType.TIMEOUT_ERROR:
        return '增加超时时间或检查系统负载';

      case ErrorType.MEMORY_ERROR:
        return '减少并发数量或增加内存限制';

      default:
        return '查看详细错误信息和日志';
    }
  }

  /**
   * 输出到控制台
   */
  private outputToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const message = entry.message;

    let output = `[${timestamp}] ${level} ${message}`;

    if (entry.context) {
      output += ` ${JSON.stringify(entry.context)}`;
    }

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(output);
        break;
      case LogLevel.INFO:
        console.info(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(output);
        if (entry.error?.stack) {
          console.error(entry.error.stack);
        }
        break;
    }
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 默认错误处理器实例
 */
export const errorHandler = new ErrorHandler({
  enableLogging: true,
  maxLogEntries: 1000,
  enableRecovery: true,
  maxRetries: 3,
  retryDelay: 1000,
});

/**
 * 便捷的错误处理装饰器
 */
export function withErrorHandling<T extends (...args: any[]) => any>(
  fn: T,
  context?: {
    operationName?: string;
    component?: string;
  }
): T {
  return errorHandler.createErrorBoundary(fn, context);
}

/**
 * 便捷的重试装饰器
 */
export function withRetry<T extends (...args: any[]) => any>(
  fn: T,
  options?: {
    maxRetries?: number;
    retryDelay?: number;
    operationName?: string;
  }
): T {
  return ((...args: Parameters<T>) => {
    return errorHandler.withRetry(() => fn(...args), {
      operationName: options?.operationName,
      maxRetries: options?.maxRetries,
      retryDelay: options?.retryDelay,
    });
  }) as T;
}

/**
 * 便捷的超时装饰器
 */
export function withTimeout<T extends (...args: any[]) => any>(
  fn: T,
  timeoutMs: number,
  operationName?: string
): T {
  return ((...args: Parameters<T>) => {
    return errorHandler.withTimeout(fn(...args), timeoutMs, { operationName });
  }) as T;
}
