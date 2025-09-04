import type {
  WorkflowSettings,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  WorkflowSettingsConfig,
} from '../types/workflow';

/**
 * 默认工作流设置配置
 */
const DEFAULT_CONFIG: WorkflowSettingsConfig = {
  maxNameLength: 50,
  minNameLength: 2,
  allowedProtocols: ['http', 'https'],
  allowLocalhost: true,
  validationTimeout: 5000,
};

/**
 * 工作流验证服务类
 * 提供工作流设置的验证功能
 */
export class WorkflowValidationService {
  private config: WorkflowSettingsConfig;

  constructor(config?: Partial<WorkflowSettingsConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 验证工作流设置
   * @param settings 工作流设置对象
   * @returns 验证结果
   */
  validateWorkflowSettings(
    settings: Partial<WorkflowSettings>
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 验证工作流名称
    const nameValidation = this.validateWorkflowName(settings.name);
    if (nameValidation.errors.length > 0) {
      errors.push(...nameValidation.errors);
    }
    if (nameValidation.warnings && nameValidation.warnings.length > 0) {
      warnings.push(...nameValidation.warnings);
    }

    // 验证Webhook URL
    const urlValidation = this.validateWebhookUrl(settings.webhookUrl);
    if (urlValidation.errors.length > 0) {
      errors.push(...urlValidation.errors);
    }
    if (urlValidation.warnings && urlValidation.warnings.length > 0) {
      warnings.push(...urlValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * 验证工作流名称
   * @param name 工作流名称
   * @returns 验证结果
   */
  validateWorkflowName(name?: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 检查是否为空
    if (!name || name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: '工作流名称不能为空',
        code: 'REQUIRED',
      });
      return { isValid: false, errors, warnings };
    }

    const trimmedName = name.trim();

    // 检查长度
    if (trimmedName.length < this.config.minNameLength) {
      errors.push({
        field: 'name',
        message: `工作流名称长度不能少于${this.config.minNameLength}个字符`,
        code: 'MIN_LENGTH',
      });
    }

    if (trimmedName.length > this.config.maxNameLength) {
      errors.push({
        field: 'name',
        message: `工作流名称长度不能超过${this.config.maxNameLength}个字符`,
        code: 'MAX_LENGTH',
      });
    }

    // 检查特殊字符
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(trimmedName)) {
      errors.push({
        field: 'name',
        message: '工作流名称不能包含特殊字符 < > : " / \\ | ? *',
        code: 'INVALID_CHARACTERS',
      });
    }

    // 检查是否以空格开头或结尾
    if (name !== trimmedName) {
      warnings.push({
        field: 'name',
        message: '工作流名称前后的空格将被自动移除',
        code: 'TRIM_WHITESPACE',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * 验证Webhook URL
   * @param url Webhook URL
   * @returns 验证结果
   */
  validateWebhookUrl(url?: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 检查是否为空
    if (!url || url.trim().length === 0) {
      errors.push({
        field: 'webhookUrl',
        message: 'Webhook地址不能为空',
        code: 'REQUIRED',
      });
      return { isValid: false, errors, warnings };
    }

    const trimmedUrl = url.trim();

    // 基本URL格式验证
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(trimmedUrl);
    } catch (error) {
      errors.push({
        field: 'webhookUrl',
        message: 'Webhook地址格式无效',
        code: 'INVALID_URL',
      });
      return { isValid: false, errors, warnings };
    }

    // 检查协议
    if (
      !this.config.allowedProtocols.includes(parsedUrl.protocol.slice(0, -1))
    ) {
      errors.push({
        field: 'webhookUrl',
        message: `不支持的协议，仅支持: ${this.config.allowedProtocols.join(', ')}`,
        code: 'INVALID_PROTOCOL',
      });
    }

    // 检查主机名
    if (!parsedUrl.hostname) {
      errors.push({
        field: 'webhookUrl',
        message: 'Webhook地址必须包含有效的主机名',
        code: 'INVALID_HOSTNAME',
      });
    }

    // 检查本地主机
    const isLocalhost = this.isLocalhostUrl(parsedUrl);
    if (isLocalhost && !this.config.allowLocalhost) {
      errors.push({
        field: 'webhookUrl',
        message: '不允许使用本地主机地址',
        code: 'LOCALHOST_NOT_ALLOWED',
      });
    } else if (isLocalhost) {
      warnings.push({
        field: 'webhookUrl',
        message: '使用本地主机地址可能在生产环境中无法访问',
        code: 'LOCALHOST_WARNING',
      });
    }

    // 检查端口
    if (parsedUrl.port) {
      const port = parseInt(parsedUrl.port, 10);
      if (port < 1 || port > 65535) {
        errors.push({
          field: 'webhookUrl',
          message: '端口号必须在1-65535范围内',
          code: 'INVALID_PORT',
        });
      }
    }

    // 检查路径
    if (!parsedUrl.pathname || parsedUrl.pathname === '/') {
      warnings.push({
        field: 'webhookUrl',
        message: 'Recommend specifying a specific path for Webhook',
        code: 'MISSING_PATH',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * 检查URL是否为本地主机
   * @param url 解析后的URL对象
   * @returns 是否为本地主机
   */
  private isLocalhostUrl(url: URL): boolean {
    const hostname = url.hostname.toLowerCase();
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.endsWith('.local') ||
      /^192\.168\./.test(hostname) ||
      /^10\./.test(hostname) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    );
  }

  /**
   * 异步验证Webhook URL连通性
   * @param url Webhook URL
   * @returns Promise<ValidationResult>
   */
  async validateWebhookConnectivity(url: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 首先进行基本URL验证
    const basicValidation = this.validateWebhookUrl(url);
    if (!basicValidation.isValid) {
      return basicValidation;
    }

    try {
      // 创建AbortController用于超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.validationTimeout
      );

      // 发送HEAD请求检查连通性
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'WendealDashboard-Webhook-Validator/1.0',
        },
      });

      clearTimeout(timeoutId);

      // 检查响应状态
      if (!response.ok) {
        if (response.status >= 400 && response.status < 500) {
          warnings.push({
            field: 'webhookUrl',
            message: `服务器返回客户端错误状态码: ${response.status}`,
            code: 'CLIENT_ERROR',
          });
        } else if (response.status >= 500) {
          warnings.push({
            field: 'webhookUrl',
            message: `服务器返回服务器错误状态码: ${response.status}`,
            code: 'SERVER_ERROR',
          });
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          warnings.push({
            field: 'webhookUrl',
            message: `连接超时（${this.config.validationTimeout}ms）`,
            code: 'TIMEOUT',
          });
        } else {
          warnings.push({
            field: 'webhookUrl',
            message: `连接失败: ${error.message}`,
            code: 'CONNECTION_FAILED',
          });
        }
      } else {
        warnings.push({
          field: 'webhookUrl',
          message: '连接验证失败',
          code: 'UNKNOWN_ERROR',
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * 更新验证配置
   * @param config 新的配置
   */
  updateConfig(config: Partial<WorkflowSettingsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取当前配置
   * @returns 当前配置
   */
  getConfig(): WorkflowSettingsConfig {
    return { ...this.config };
  }
}

// 创建默认实例
export const workflowValidationService = new WorkflowValidationService();

// 导出便捷函数
export const validateWorkflowSettings = (
  settings: Partial<WorkflowSettings>
): ValidationResult => {
  return workflowValidationService.validateWorkflowSettings(settings);
};

export const validateWorkflowName = (name?: string): ValidationResult => {
  return workflowValidationService.validateWorkflowName(name);
};

export const validateWebhookUrl = (url?: string): ValidationResult => {
  return workflowValidationService.validateWebhookUrl(url);
};

export const validateWebhookConnectivity = async (
  url: string
): Promise<ValidationResult> => {
  return workflowValidationService.validateWebhookConnectivity(url);
};
