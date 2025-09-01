import type {
  WorkflowSettings,
  WorkflowSettingsResponse,
  UpdateWorkflowSettingsRequest,
  ValidationResult,
} from '../types/workflow';
import { workflowValidationService } from './workflowValidationService';
import { delay } from '../utils';

// 本地存储键名
const WORKFLOW_SETTINGS_KEY = 'wendeal_workflow_settings';
const WORKFLOW_SETTINGS_VERSION_KEY = 'wendeal_workflow_settings_version';

// 当前设置版本
const CURRENT_VERSION = '1.0.0';

// 默认工作流设置
const DEFAULT_SETTINGS: WorkflowSettings = {
  name: '默认工作流',
  webhookUrl: '',
  enabled: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * 工作流设置服务类
 * 管理工作流配置数据的持久化和操作
 */
export class WorkflowSettingsService {
  private settings: WorkflowSettings | null = null;
  private isInitialized = false;

  /**
   * 初始化服务
   * 从本地存储加载设置
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.loadFromStorage();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize workflow settings service:', error);
      // 使用默认设置
      this.settings = { ...DEFAULT_SETTINGS };
      this.isInitialized = true;
    }
  }

  /**
   * 获取当前工作流设置
   * @returns Promise<WorkflowSettingsResponse>
   */
  async getSettings(): Promise<WorkflowSettingsResponse> {
    try {
      await this.ensureInitialized();

      // 模拟API延迟
      await delay(200 + Math.random() * 300);

      if (!this.settings) {
        return {
          success: false,
          error: '工作流设置未找到',
          errorCode: 'SETTINGS_NOT_FOUND',
        };
      }

      return {
        success: true,
        data: { ...this.settings },
      };
    } catch (error) {
      console.error('Failed to get workflow settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取设置失败',
        errorCode: 'GET_SETTINGS_FAILED',
      };
    }
  }

  /**
   * 保存工作流设置
   * @param settings 要保存的设置
   * @returns Promise<WorkflowSettingsResponse>
   */
  async saveSettings(
    settings: Partial<WorkflowSettings>
  ): Promise<WorkflowSettingsResponse> {
    try {
      await this.ensureInitialized();

      // 验证设置
      const validation = await this.validateSettings(settings);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.map(e => e.message).join(', '),
          errorCode: 'VALIDATION_FAILED',
        };
      }

      // 模拟API延迟
      await delay(500 + Math.random() * 500);

      // 更新设置
      const now = new Date().toISOString();
      const updatedSettings: WorkflowSettings = {
        ...this.settings,
        ...settings,
        updatedAt: now,
        // 如果是新创建的设置，设置创建时间
        createdAt: this.settings?.createdAt || now,
      };

      // 保存到内存和本地存储
      this.settings = updatedSettings;
      await this.saveToStorage();

      return {
        success: true,
        data: { ...updatedSettings },
      };
    } catch (error) {
      console.error('Failed to save workflow settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '保存设置失败',
        errorCode: 'SAVE_SETTINGS_FAILED',
      };
    }
  }

  /**
   * 更新工作流设置
   * @param updates 要更新的字段
   * @returns Promise<WorkflowSettingsResponse>
   */
  async updateSettings(
    updates: UpdateWorkflowSettingsRequest
  ): Promise<WorkflowSettingsResponse> {
    try {
      await this.ensureInitialized();

      if (!this.settings) {
        return {
          success: false,
          error: '工作流设置未找到',
          errorCode: 'SETTINGS_NOT_FOUND',
        };
      }

      // 合并更新
      const updatedSettings = {
        ...this.settings,
        ...updates,
      };

      return await this.saveSettings(updatedSettings);
    } catch (error) {
      console.error('Failed to update workflow settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新设置失败',
        errorCode: 'UPDATE_SETTINGS_FAILED',
      };
    }
  }

  /**
   * 验证工作流设置
   * @param settings 要验证的设置
   * @returns Promise<ValidationResult>
   */
  async validateSettings(
    settings: Partial<WorkflowSettings>
  ): Promise<ValidationResult> {
    try {
      // 基本验证
      const basicValidation =
        workflowValidationService.validateWorkflowSettings(settings);

      if (!basicValidation.isValid) {
        return basicValidation;
      }

      // 如果有webhook URL，进行连通性验证
      if (settings.webhookUrl && settings.webhookUrl.trim()) {
        const connectivityValidation =
          await workflowValidationService.validateWebhookConnectivity(
            settings.webhookUrl.trim()
          );

        // 合并验证结果
        return {
          isValid: connectivityValidation.isValid,
          errors: [...basicValidation.errors, ...connectivityValidation.errors],
          warnings: [
            ...(basicValidation.warnings || []),
            ...(connectivityValidation.warnings || []),
          ].filter(w => w), // 过滤掉undefined
        };
      }

      return basicValidation;
    } catch (error) {
      console.error('Failed to validate workflow settings:', error);
      return {
        isValid: false,
        errors: [
          {
            field: 'general',
            message: '验证过程中发生错误',
            code: 'VALIDATION_ERROR',
          },
        ],
      };
    }
  }

  /**
   * 重置工作流设置为默认值
   * @returns Promise<WorkflowSettingsResponse>
   */
  async resetSettings(): Promise<WorkflowSettingsResponse> {
    try {
      const defaultSettings = {
        ...DEFAULT_SETTINGS,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return await this.saveSettings(defaultSettings);
    } catch (error) {
      console.error('Failed to reset workflow settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '重置设置失败',
        errorCode: 'RESET_SETTINGS_FAILED',
      };
    }
  }

  /**
   * 导出工作流设置
   * @returns Promise<string> JSON字符串
   */
  async exportSettings(): Promise<string> {
    await this.ensureInitialized();

    const exportData = {
      version: CURRENT_VERSION,
      exportedAt: new Date().toISOString(),
      settings: this.settings,
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * 导入工作流设置
   * @param jsonData JSON字符串
   * @returns Promise<WorkflowSettingsResponse>
   */
  async importSettings(jsonData: string): Promise<WorkflowSettingsResponse> {
    try {
      const importData = JSON.parse(jsonData);

      if (!importData.settings) {
        return {
          success: false,
          error: '导入数据格式无效',
          errorCode: 'INVALID_IMPORT_FORMAT',
        };
      }

      return await this.saveSettings(importData.settings);
    } catch (error) {
      console.error('Failed to import workflow settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '导入设置失败',
        errorCode: 'IMPORT_SETTINGS_FAILED',
      };
    }
  }

  /**
   * 确保服务已初始化
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * 从本地存储加载设置
   */
  private async loadFromStorage(): Promise<void> {
    try {
      const storedSettings = localStorage.getItem(WORKFLOW_SETTINGS_KEY);
      const storedVersion = localStorage.getItem(WORKFLOW_SETTINGS_VERSION_KEY);

      if (!storedSettings) {
        // 首次使用，创建默认设置
        this.settings = { ...DEFAULT_SETTINGS };
        await this.saveToStorage();
        return;
      }

      const parsedSettings = JSON.parse(storedSettings);

      // 检查版本兼容性
      if (storedVersion !== CURRENT_VERSION) {
        console.warn('Settings version mismatch, migrating to current version');
        // 这里可以添加版本迁移逻辑
        this.settings = { ...DEFAULT_SETTINGS, ...parsedSettings };
        await this.saveToStorage();
      } else {
        this.settings = parsedSettings;
      }
    } catch (error) {
      console.error('Failed to load settings from storage:', error);
      // 加载失败时使用默认设置
      this.settings = { ...DEFAULT_SETTINGS };
      await this.saveToStorage();
    }
  }

  /**
   * 保存设置到本地存储
   */
  private async saveToStorage(): Promise<void> {
    try {
      if (this.settings) {
        localStorage.setItem(
          WORKFLOW_SETTINGS_KEY,
          JSON.stringify(this.settings)
        );
        localStorage.setItem(WORKFLOW_SETTINGS_VERSION_KEY, CURRENT_VERSION);
      }
    } catch (error) {
      console.error('Failed to save settings to storage:', error);
      throw new Error('保存设置到本地存储失败');
    }
  }

  /**
   * 清除所有设置数据
   */
  async clearAllData(): Promise<void> {
    try {
      localStorage.removeItem(WORKFLOW_SETTINGS_KEY);
      localStorage.removeItem(WORKFLOW_SETTINGS_VERSION_KEY);
      this.settings = null;
      this.isInitialized = false;
    } catch (error) {
      console.error('Failed to clear settings data:', error);
      throw new Error('清除设置数据失败');
    }
  }
}

// 创建默认实例
export const workflowSettingsService = new WorkflowSettingsService();

// 导出便捷函数
export const getWorkflowSettings =
  async (): Promise<WorkflowSettingsResponse> => {
    return workflowSettingsService.getSettings();
  };

export const saveWorkflowSettings = async (
  settings: Partial<WorkflowSettings>
): Promise<WorkflowSettingsResponse> => {
  return workflowSettingsService.saveSettings(settings);
};

export const updateWorkflowSettings = async (
  updates: UpdateWorkflowSettingsRequest
): Promise<WorkflowSettingsResponse> => {
  return workflowSettingsService.updateSettings(updates);
};

export const validateWorkflowSettings = async (
  settings: Partial<WorkflowSettings>
): Promise<ValidationResult> => {
  return workflowSettingsService.validateSettings(settings);
};

export const resetWorkflowSettings =
  async (): Promise<WorkflowSettingsResponse> => {
    return workflowSettingsService.resetSettings();
  };
