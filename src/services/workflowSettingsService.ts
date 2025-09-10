import type {
  WorkflowSettings,
  WorkflowSettingsResponse,
  UpdateWorkflowSettingsRequest,
  ValidationResult,
} from '../types/workflow';
import { workflowValidationService } from './workflowValidationService';
import { delay } from '../utils';

// Local storage key names
const WORKFLOW_SETTINGS_KEY = 'wendeal_workflow_settings';
const WORKFLOW_SETTINGS_VERSION_KEY = 'wendeal_workflow_settings_version';

// Current settings version
const CURRENT_VERSION = '1.0.0';

// Default workflow settings factory
const getDefaultSettings = (
  workflowId: string,
  workflowName?: string
): WorkflowSettings => {
  // 为Reddit工作流提供默认的webhook URL
  const defaultWebhookUrl =
    workflowId === 'reddit-workflow'
      ? 'https://n8n.wendealai.com/webhook/reddithot'
      : ''; // 其他工作流仍需要用户配置

  return {
    name: workflowName || `${workflowId} Workflow`,
    webhookUrl: defaultWebhookUrl,
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

/**
 * Workflow Settings Service Class
 * Manages workflow configuration data persistence and operations
 * Now supports multiple workflows with independent settings
 */
export class WorkflowSettingsService {
  private settingsMap: Map<string, WorkflowSettings> = new Map();
  private isInitialized = false;

  /**
   * Initialize service
   * Load settings from local storage
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
      // Initialize with empty map
      this.settingsMap.clear();
      this.isInitialized = true;
    }
  }

  /**
   * Get workflow settings for a specific workflow
   * @param workflowId - The ID of the workflow
   * @param workflowName - Optional name for default settings
   * @returns Current settings or default settings for the workflow
   */
  async getSettings(
    workflowId: string,
    workflowName?: string
  ): Promise<WorkflowSettingsResponse> {
    try {
      await this.ensureInitialized();

      // Simulate API delay
      await delay(200 + Math.random() * 300);

      let settings = this.settingsMap.get(workflowId);
      if (!settings) {
        // Create default settings for this workflow
        settings = getDefaultSettings(workflowId, workflowName);
        this.settingsMap.set(workflowId, settings);
        await this.saveToStorage();
      }

      return {
        success: true,
        data: { ...settings },
      };
    } catch (error) {
      console.error('Failed to get workflow settings:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to get settings',
        errorCode: 'GET_SETTINGS_FAILED',
      };
    }
  }

  /**
   * Save workflow settings for a specific workflow
   * @param workflowId - The ID of the workflow
   * @param settings - Settings to save
   * @param workflowName - Optional name for default settings
   * @returns Promise<WorkflowSettingsResponse>
   */
  async saveSettings(
    workflowId: string,
    settings: Partial<WorkflowSettings>,
    workflowName?: string
  ): Promise<WorkflowSettingsResponse> {
    try {
      await this.ensureInitialized();

      // Validate settings
      const validation = await this.validateSettings(settings);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.map(e => e.message).join(', '),
          errorCode: 'VALIDATION_FAILED',
        };
      }

      // Simulate API delay
      await delay(500 + Math.random() * 500);

      // Get existing settings or create default
      const currentSettings =
        this.settingsMap.get(workflowId) ||
        getDefaultSettings(workflowId, workflowName);

      // Update settings
      const now = new Date().toISOString();
      const updatedSettings: WorkflowSettings = {
        ...currentSettings,
        ...settings,
        updatedAt: now,
        // Set creation time if this is a new setting
        createdAt: currentSettings?.createdAt || now,
      };

      // Save to memory and local storage
      this.settingsMap.set(workflowId, updatedSettings);
      await this.saveToStorage();

      return {
        success: true,
        data: { ...updatedSettings },
      };
    } catch (error) {
      console.error('Failed to save workflow settings:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to save settings',
        errorCode: 'SAVE_SETTINGS_FAILED',
      };
    }
  }

  /**
   * Update workflow settings
   * @param updates Fields to update
   * @returns Promise<WorkflowSettingsResponse>
   */
  async updateSettings(
    workflowId: string,
    updates: UpdateWorkflowSettingsRequest
  ): Promise<WorkflowSettingsResponse> {
    try {
      await this.ensureInitialized();

      const currentSettings = this.settingsMap.get(workflowId);
      if (!currentSettings) {
        return {
          success: false,
          error: 'Workflow settings not found',
          errorCode: 'SETTINGS_NOT_FOUND',
        };
      }

      // Merge updates
      const updatedSettings = {
        ...currentSettings,
        ...updates,
      };

      return await this.saveSettings(workflowId, updatedSettings);
    } catch (error) {
      console.error('Failed to update workflow settings:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to update settings',
        errorCode: 'UPDATE_SETTINGS_FAILED',
      };
    }
  }

  /**
   * Validate workflow settings
   * @param settings Settings to validate
   * @returns Promise<ValidationResult>
   */
  async validateSettings(
    settings: Partial<WorkflowSettings>
  ): Promise<ValidationResult> {
    try {
      // Basic validation
      const basicValidation =
        workflowValidationService.validateWorkflowSettings(settings);

      if (!basicValidation.isValid) {
        return basicValidation;
      }

      // If webhook URL exists, perform connectivity validation
      if (settings.webhookUrl && settings.webhookUrl.trim()) {
        const connectivityValidation =
          await workflowValidationService.validateWebhookConnectivity(
            settings.webhookUrl.trim()
          );

        // Merge validation results
        return {
          isValid: connectivityValidation.isValid,
          errors: [...basicValidation.errors, ...connectivityValidation.errors],
          warnings: [
            ...(basicValidation.warnings || []),
            ...(connectivityValidation.warnings || []),
          ].filter(w => w), // Filter out undefined
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
            message: 'Error occurred during validation',
            code: 'VALIDATION_ERROR',
          },
        ],
      };
    }
  }

  /**
   * Reset workflow settings to default for a specific workflow
   * @param workflowId - The ID of the workflow
   * @param workflowName - Optional name for default settings
   * @returns Promise<WorkflowSettingsResponse>
   */
  async resetSettings(
    workflowId: string,
    workflowName?: string
  ): Promise<WorkflowSettingsResponse> {
    try {
      await this.ensureInitialized();

      // Simulate API delay
      await delay(300 + Math.random() * 200);

      // Reset to default settings
      const defaultSettings = {
        ...getDefaultSettings(workflowId, workflowName),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.settingsMap.set(workflowId, defaultSettings);
      await this.saveToStorage();

      return {
        success: true,
        data: { ...defaultSettings },
      };
    } catch (error) {
      console.error('Failed to reset workflow settings:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to reset settings',
        errorCode: 'RESET_SETTINGS_FAILED',
      };
    }
  }

  /**
   * Export workflow settings
   * @returns Promise<string> JSON string
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
   * Import workflow settings
   * @param jsonData JSON string
   * @returns Promise<WorkflowSettingsResponse>
   */
  async importSettings(jsonData: string): Promise<WorkflowSettingsResponse> {
    try {
      const importData = JSON.parse(jsonData);

      if (!importData.settings) {
        return {
          success: false,
          error: 'Invalid import data format',
          errorCode: 'INVALID_IMPORT_FORMAT',
        };
      }

      return await this.saveSettings(importData.settings);
    } catch (error) {
      console.error('Failed to import workflow settings:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to import settings',
        errorCode: 'IMPORT_SETTINGS_FAILED',
      };
    }
  }

  /**
   * Ensure service is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Load settings from local storage
   */
  private async loadFromStorage(): Promise<void> {
    try {
      const storedSettings = localStorage.getItem(WORKFLOW_SETTINGS_KEY);
      const storedVersion = localStorage.getItem(WORKFLOW_SETTINGS_VERSION_KEY);

      if (!storedSettings) {
        // No stored settings, initialize empty map
        this.settingsMap.clear();
        await this.saveToStorage();
        return;
      }

      // Check version compatibility
      if (storedVersion !== CURRENT_VERSION) {
        console.warn('Settings version mismatch, migrating to current version');
        this.settingsMap.clear();
        await this.saveToStorage();
        return;
      }

      // Parse and validate stored settings
      const parsedData = JSON.parse(storedSettings);

      // Handle both old single-workflow format and new multi-workflow format
      if (parsedData && typeof parsedData === 'object') {
        if (Array.isArray(parsedData)) {
          // New multi-workflow format stored as array of [key, value] pairs
          this.settingsMap = new Map(parsedData);
        } else if (parsedData.name && typeof parsedData.enabled === 'boolean') {
          // Old single-workflow format - migrate to new format
          console.log(
            'Migrating old single-workflow settings to new multi-workflow format'
          );
          this.settingsMap.set(
            'default-workflow',
            parsedData as WorkflowSettings
          );
        } else {
          // Invalid format
          console.warn('Invalid stored settings format. Using empty map.');
          this.settingsMap.clear();
        }
      } else {
        this.settingsMap.clear();
      }
    } catch (error) {
      console.error('Failed to load settings from storage:', error);
      this.settingsMap.clear();
      await this.saveToStorage();
    }
  }

  /**
   * Save settings to local storage
   */
  private async saveToStorage(): Promise<void> {
    try {
      // Convert Map to array for JSON serialization
      const settingsArray = Array.from(this.settingsMap.entries());
      localStorage.setItem(
        WORKFLOW_SETTINGS_KEY,
        JSON.stringify(settingsArray)
      );
      localStorage.setItem(WORKFLOW_SETTINGS_VERSION_KEY, CURRENT_VERSION);
    } catch (error) {
      console.error('Failed to save settings to storage:', error);
      throw new Error('Failed to save settings to local storage');
    }
  }

  /**
   * Clear all settings data
   */
  async clearAllData(): Promise<void> {
    try {
      localStorage.removeItem(WORKFLOW_SETTINGS_KEY);
      localStorage.removeItem(WORKFLOW_SETTINGS_VERSION_KEY);
      this.settingsMap.clear();
      this.isInitialized = false;
    } catch (error) {
      console.error('Failed to clear settings data:', error);
      throw new Error('Failed to clear settings data');
    }
  }
}

// Create default instance
export const workflowSettingsService = new WorkflowSettingsService();

// Export convenience functions
export const getWorkflowSettings = async (
  workflowId: string,
  workflowName?: string
): Promise<WorkflowSettingsResponse> => {
  return workflowSettingsService.getSettings(workflowId, workflowName);
};

export const saveWorkflowSettings = async (
  workflowId: string,
  settings: Partial<WorkflowSettings>,
  workflowName?: string
): Promise<WorkflowSettingsResponse> => {
  return workflowSettingsService.saveSettings(
    workflowId,
    settings,
    workflowName
  );
};

export const updateWorkflowSettings = async (
  workflowId: string,
  updates: UpdateWorkflowSettingsRequest
): Promise<WorkflowSettingsResponse> => {
  return workflowSettingsService.updateSettings(workflowId, updates);
};

export const validateWorkflowSettings = async (
  settings: Partial<WorkflowSettings>
): Promise<ValidationResult> => {
  return workflowSettingsService.validateSettings(settings);
};

export const resetWorkflowSettings = async (
  workflowId: string,
  workflowName?: string
): Promise<WorkflowSettingsResponse> => {
  return workflowSettingsService.resetSettings(workflowId, workflowName);
};
