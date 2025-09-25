import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  workflowSettingsService,
  getWorkflowSettings,
  saveWorkflowSettings,
  resetWorkflowSettings,
} from '../services/workflowSettingsService';
import { validateWorkflowSettings } from '../services/workflowValidationService';
import type { WorkflowSettings } from '../types/workflow';

export interface UseWorkflowSettingsOptions {
  /** Auto-load settings on mount */
  autoLoad?: boolean;
  /** Auto-save on changes */
  autoSave?: boolean;
  /** Debounce delay for auto-save (ms) */
  autoSaveDelay?: number;
  /** Show success messages */
  showSuccessMessages?: boolean;
  /** Show error messages */
  showErrorMessages?: boolean;
  /** Message API instance for notifications */
  messageApi?: {
    success: (content: string) => void;
    error: (content: string) => void;
  };
}

export interface UseWorkflowSettingsReturn {
  /** Current settings */
  settings: WorkflowSettings | null;
  /** Loading state */
  loading: boolean;
  /** Saving state */
  saving: boolean;
  /** Error message */
  error: string | null;
  /** Success message */
  success: string | null;
  /** Whether settings have been modified */
  isDirty: boolean;
  /** Whether settings are valid */
  isValid: boolean;
  /** Validation errors */
  validationErrors: Record<string, string>;
  /** Load settings */
  loadSettings: () => Promise<void>;
  /** Save settings */
  saveSettings: (newSettings: WorkflowSettings) => Promise<boolean>;
  /** Update specific setting */
  updateSetting: <K extends keyof WorkflowSettings>(
    key: K,
    value: WorkflowSettings[K]
  ) => Promise<void>;
  /** Reset settings to defaults */
  resetSettings: () => Promise<void>;
  /** Clear error and success messages */
  clearMessages: () => void;
  /** Validate current settings */
  validateSettings: () => Promise<boolean>;
  /** Export settings */
  exportSettings: () => Promise<string>;
  /** Import settings */
  importSettings: (data: string) => Promise<boolean>;
}

/**
 * Custom hook for managing workflow settings
 * Provides centralized state management with loading states and error handling
 */
export const useWorkflowSettings = ({
  autoLoad = true,
  autoSave = false,
  autoSaveDelay = 1000,
  showSuccessMessages = true,
  showErrorMessages = true,
  messageApi,
}: UseWorkflowSettingsOptions = {}): UseWorkflowSettingsReturn => {
  // State management
  const [settings, setSettings] = useState<WorkflowSettings | null>(null);
  const [originalSettings, setOriginalSettings] =
    useState<WorkflowSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(
    null
  );

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  /**
   * Show success message
   */
  const showSuccess = useCallback(
    (msg: string) => {
      setSuccess(msg);
      if (showSuccessMessages && messageApi) {
        messageApi.success(msg);
      }
      // Auto-clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    },
    [showSuccessMessages, messageApi]
  );

  /**
   * Show error message
   */
  const showError = useCallback(
    (msg: string) => {
      setError(msg);
      if (showErrorMessages && messageApi) {
        messageApi.error(msg);
      }
    },
    [showErrorMessages, messageApi]
  );

  /**
   * Load settings from service
   */
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      clearMessages();

      const response = await getWorkflowSettings('default-workflow');
      if (response.success && response.data) {
        setSettings(response.data);
        setOriginalSettings({ ...response.data });
      } else {
        throw new Error(response.error || 'Failed to load settings');
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to load settings';
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [clearMessages, showError]);

  /**
   * Save settings to service
   */
  const saveSettings = useCallback(
    async (newSettings: WorkflowSettings): Promise<boolean> => {
      try {
        setSaving(true);
        clearMessages();

        // Validate settings before saving
        const validation = await validateWorkflowSettings(newSettings);
        if (!validation.isValid) {
          const errorMsg = validation.errors.map(e => e.message).join(', ');
          showError(`Validation failed: ${errorMsg}`);
          return false;
        }

        const response = await saveWorkflowSettings(
          'default-workflow',
          newSettings
        );
        if (response.success && response.data) {
          setSettings(response.data);
          setOriginalSettings({ ...response.data });
          showSuccess('Settings saved successfully');
          return true;
        } else {
          throw new Error(response.error || 'Failed to save settings');
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to save settings';
        showError(errorMsg);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [clearMessages, showError, showSuccess]
  );

  /**
   * Update specific setting with auto-save support
   */
  const updateSetting = useCallback(
    async <K extends keyof WorkflowSettings>(
      key: K,
      value: WorkflowSettings[K]
    ) => {
      if (!settings) return;

      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);

      if (autoSave) {
        // Clear existing timer
        if (autoSaveTimer) {
          clearTimeout(autoSaveTimer);
        }

        // Set new timer for auto-save
        const timer = setTimeout(async () => {
          await saveSettings(newSettings);
        }, autoSaveDelay);

        setAutoSaveTimer(timer);
      }
    },
    [settings, autoSave, autoSaveTimer, autoSaveDelay, saveSettings]
  );

  /**
   * Reset settings to defaults
   */
  const resetSettings = useCallback(async () => {
    try {
      setSaving(true);
      clearMessages();

      const resetResponse = await resetWorkflowSettings('default-workflow');
      if (resetResponse.success && resetResponse.data) {
        setSettings(resetResponse.data);
        setOriginalSettings({ ...resetResponse.data });
        showSuccess('Settings reset to defaults');
      } else {
        throw new Error(resetResponse.error || 'Failed to reset settings');
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to reset settings';
      showError(errorMsg);
    } finally {
      setSaving(false);
    }
  }, [clearMessages, showError, showSuccess]);

  /**
   * Validate current settings
   */
  const validateSettings = useCallback(async (): Promise<boolean> => {
    if (!settings) return false;

    try {
      const validation = await validateWorkflowSettings(settings);
      if (!validation.isValid && showErrorMessages) {
        const errorMsg = validation.errors.map(e => e.message).join(', ');
        showError(`Validation failed: ${errorMsg}`);
      }
      return validation.isValid;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Validation error';
      showError(errorMsg);
      return false;
    }
  }, [settings, showErrorMessages, showError]);

  /**
   * Export settings as JSON string
   */
  const exportSettings = useCallback(async (): Promise<string> => {
    if (!settings) return '{}';

    try {
      return await workflowSettingsService.exportSettings();
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to export settings';
      showError(errorMsg);
      return '{}';
    }
  }, [settings, showError]);

  /**
   * Import settings from JSON string
   */
  const importSettings = useCallback(
    async (data: string): Promise<boolean> => {
      try {
        setSaving(true);
        clearMessages();

        const response = await workflowSettingsService.importSettings(data);
        if (response.success && response.data) {
          setSettings(response.data);
          setOriginalSettings({ ...response.data });
          showSuccess('Settings imported successfully');
          return true;
        } else {
          throw new Error(response.error || 'Failed to import settings');
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to import settings';
        showError(errorMsg);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [clearMessages, showError, showSuccess]
  );

  // Computed values
  const isDirty = useMemo(() => {
    if (!settings || !originalSettings) return false;
    return JSON.stringify(settings) !== JSON.stringify(originalSettings);
  }, [settings, originalSettings]);

  const validationResult = useMemo(() => {
    if (!settings) {
      return { isValid: false, errors: {} };
    }

    const validation = validateWorkflowSettings(settings);
    const errors: Record<string, string> = {};

    // Convert validation errors to object format
    validation.errors.forEach((error, index) => {
      if (error.message.includes('webhook')) {
        errors.webhookUrl = error.message;
      } else if (
        error.message.includes('workflow') ||
        error.message.includes('name')
      ) {
        errors.workflowName = error.message;
      } else {
        errors[`error_${index}`] = error.message;
      }
    });

    return {
      isValid: validation.isValid,
      errors,
    };
  }, [settings]);

  // Auto-load settings on mount
  useEffect(() => {
    if (autoLoad) {
      loadSettings();
    }
  }, [autoLoad, loadSettings]);

  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [autoSaveTimer]);

  return {
    settings,
    loading,
    saving,
    error,
    success,
    isDirty,
    isValid: validationResult.isValid,
    validationErrors: validationResult.errors,
    loadSettings,
    saveSettings,
    updateSetting,
    resetSettings,
    clearMessages,
    validateSettings,
    exportSettings,
    importSettings,
  };
};

export default useWorkflowSettings;
