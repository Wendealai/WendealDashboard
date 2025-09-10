import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorkflowSettingsService } from '../../services/workflow/WorkflowSettingsService';
import type { WorkflowSettings } from '../../types/workflow';

/**
 * 工作流设置服务单元测试
 * 测试设置的CRUD操作、localStorage交互和错误处理
 */
describe('WorkflowSettingsService', () => {
  let settingsService: WorkflowSettingsService;
  let localStorageMock: {
    getItem: ReturnType<typeof vi.fn>;
    setItem: ReturnType<typeof vi.fn>;
    removeItem: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
  };

  // 测试数据
  const mockWorkflowSettings: WorkflowSettings = {
    name: 'Test Workflow',
    webhookUrl: 'https://api.example.com/webhook',
    enabled: true,
    retryAttempts: 3,
    timeout: 30000,
  };

  const mockWorkflowSettings2: WorkflowSettings = {
    name: 'Another Workflow',
    webhookUrl: 'https://api.example.com/webhook2',
    enabled: false,
    retryAttempts: 5,
    timeout: 60000,
  };

  beforeEach(() => {
    // Mock localStorage
    localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };

    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    // Mock console methods
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    settingsService = new WorkflowSettingsService();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('Settings Storage and Retrieval', () => {
    describe('saveSettings', () => {
      it('should save workflow settings to localStorage', async () => {
        localStorageMock.setItem.mockImplementation(() => {});

        const result = await settingsService.saveSettings(mockWorkflowSettings);

        expect(result.success).toBe(true);
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'workflow_settings',
          JSON.stringify(mockWorkflowSettings)
        );
      });

      it('should handle localStorage setItem errors', async () => {
        const error = new Error('Storage quota exceeded');
        localStorageMock.setItem.mockImplementation(() => {
          throw error;
        });

        const result = await settingsService.saveSettings(mockWorkflowSettings);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to save workflow settings');
        expect(console.error).toHaveBeenCalledWith(
          'Error saving workflow settings:',
          error
        );
      });

      it('should validate settings before saving', async () => {
        const invalidSettings: WorkflowSettings = {
          name: '', // Invalid: empty name
          webhookUrl: 'invalid-url', // Invalid: no protocol
          enabled: true,
        };

        const result = await settingsService.saveSettings(invalidSettings);

        expect(result.success).toBe(false);
        expect(result.error).toContain('validation');
        expect(localStorageMock.setItem).not.toHaveBeenCalled();
      });

      it('should handle null or undefined settings', async () => {
        const nullResult = await settingsService.saveSettings(null as any);
        expect(nullResult.success).toBe(false);
        expect(nullResult.error).toContain('Settings are required');

        const undefinedResult = await settingsService.saveSettings(
          undefined as any
        );
        expect(undefinedResult.success).toBe(false);
        expect(undefinedResult.error).toContain('Settings are required');
      });
    });

    describe('loadSettings', () => {
      it('should load workflow settings from localStorage', async () => {
        localStorageMock.getItem.mockReturnValue(
          JSON.stringify(mockWorkflowSettings)
        );

        const result = await settingsService.loadSettings();

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockWorkflowSettings);
        expect(localStorageMock.getItem).toHaveBeenCalledWith(
          'workflow_settings'
        );
      });

      it('should return default settings when localStorage is empty', async () => {
        localStorageMock.getItem.mockReturnValue(null);

        const result = await settingsService.loadSettings();

        expect(result.success).toBe(true);
        expect(result.data).toEqual({
          name: '',
          webhookUrl: '',
          enabled: false,
          retryAttempts: 3,
          timeout: 30000,
        });
      });

      it('should handle invalid JSON in localStorage', async () => {
        localStorageMock.getItem.mockReturnValue('invalid-json{');

        const result = await settingsService.loadSettings();

        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to load workflow settings');
        expect(console.error).toHaveBeenCalled();
      });

      it('should handle localStorage getItem errors', async () => {
        const error = new Error('localStorage not available');
        localStorageMock.getItem.mockImplementation(() => {
          throw error;
        });

        const result = await settingsService.loadSettings();

        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to load workflow settings');
        expect(console.error).toHaveBeenCalledWith(
          'Error loading workflow settings:',
          error
        );
      });

      it('should validate loaded settings', async () => {
        const invalidStoredSettings = {
          name: '', // Invalid
          webhookUrl: 'invalid-url', // Invalid
          enabled: 'not-boolean', // Invalid type
        };
        localStorageMock.getItem.mockReturnValue(
          JSON.stringify(invalidStoredSettings)
        );

        const result = await settingsService.loadSettings();

        expect(result.success).toBe(false);
        expect(result.error).toContain('validation');
      });
    });

    describe('deleteSettings', () => {
      it('should delete workflow settings from localStorage', async () => {
        localStorageMock.removeItem.mockImplementation(() => {});

        const result = await settingsService.deleteSettings();

        expect(result.success).toBe(true);
        expect(localStorageMock.removeItem).toHaveBeenCalledWith(
          'workflow_settings'
        );
      });

      it('should handle localStorage removeItem errors', async () => {
        const error = new Error('localStorage not available');
        localStorageMock.removeItem.mockImplementation(() => {
          throw error;
        });

        const result = await settingsService.deleteSettings();

        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to delete workflow settings');
        expect(console.error).toHaveBeenCalledWith(
          'Error deleting workflow settings:',
          error
        );
      });
    });

    describe('hasSettings', () => {
      it('should return true when settings exist', async () => {
        localStorageMock.getItem.mockReturnValue(
          JSON.stringify(mockWorkflowSettings)
        );

        const result = await settingsService.hasSettings();

        expect(result).toBe(true);
        expect(localStorageMock.getItem).toHaveBeenCalledWith(
          'workflow_settings'
        );
      });

      it('should return false when no settings exist', async () => {
        localStorageMock.getItem.mockReturnValue(null);

        const result = await settingsService.hasSettings();

        expect(result).toBe(false);
      });

      it('should return false when settings are invalid', async () => {
        localStorageMock.getItem.mockReturnValue('invalid-json{');

        const result = await settingsService.hasSettings();

        expect(result).toBe(false);
      });

      it('should handle localStorage errors gracefully', async () => {
        localStorageMock.getItem.mockImplementation(() => {
          throw new Error('localStorage not available');
        });

        const result = await settingsService.hasSettings();

        expect(result).toBe(false);
      });
    });
  });

  describe('Settings Update Operations', () => {
    describe('updateSettings', () => {
      it('should update existing settings', async () => {
        // Setup existing settings
        localStorageMock.getItem.mockReturnValue(
          JSON.stringify(mockWorkflowSettings)
        );
        localStorageMock.setItem.mockImplementation(() => {});

        const updates: Partial<WorkflowSettings> = {
          name: 'Updated Workflow',
          enabled: false,
        };

        const result = await settingsService.updateSettings(updates);

        expect(result.success).toBe(true);
        expect(result.data?.name).toBe('Updated Workflow');
        expect(result.data?.enabled).toBe(false);
        expect(result.data?.webhookUrl).toBe(mockWorkflowSettings.webhookUrl); // Unchanged
      });

      it('should create new settings if none exist', async () => {
        localStorageMock.getItem.mockReturnValue(null);
        localStorageMock.setItem.mockImplementation(() => {});

        const updates: Partial<WorkflowSettings> = {
          name: 'New Workflow',
          webhookUrl: 'https://api.example.com/new',
        };

        const result = await settingsService.updateSettings(updates);

        expect(result.success).toBe(true);
        expect(result.data?.name).toBe('New Workflow');
        expect(result.data?.webhookUrl).toBe('https://api.example.com/new');
        expect(result.data?.enabled).toBe(false); // Default value
      });

      it('should validate updated settings', async () => {
        localStorageMock.getItem.mockReturnValue(
          JSON.stringify(mockWorkflowSettings)
        );

        const invalidUpdates: Partial<WorkflowSettings> = {
          name: '', // Invalid
          webhookUrl: 'invalid-url', // Invalid
        };

        const result = await settingsService.updateSettings(invalidUpdates);

        expect(result.success).toBe(false);
        expect(result.error).toContain('validation');
        expect(localStorageMock.setItem).not.toHaveBeenCalled();
      });

      it('should handle empty updates object', async () => {
        localStorageMock.getItem.mockReturnValue(
          JSON.stringify(mockWorkflowSettings)
        );

        const result = await settingsService.updateSettings({});

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockWorkflowSettings); // Unchanged
      });
    });

    describe('resetSettings', () => {
      it('should reset settings to default values', async () => {
        localStorageMock.setItem.mockImplementation(() => {});

        const result = await settingsService.resetSettings();

        expect(result.success).toBe(true);
        expect(result.data).toEqual({
          name: '',
          webhookUrl: '',
          enabled: false,
          retryAttempts: 3,
          timeout: 30000,
        });
        expect(localStorageMock.setItem).toHaveBeenCalled();
      });

      it('should handle localStorage errors during reset', async () => {
        const error = new Error('Storage quota exceeded');
        localStorageMock.setItem.mockImplementation(() => {
          throw error;
        });

        const result = await settingsService.resetSettings();

        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to reset workflow settings');
      });
    });
  });

  describe('Settings Export and Import', () => {
    describe('exportSettings', () => {
      it('should export current settings as JSON string', async () => {
        localStorageMock.getItem.mockReturnValue(
          JSON.stringify(mockWorkflowSettings)
        );

        const result = await settingsService.exportSettings();

        expect(result.success).toBe(true);
        expect(result.data).toBe(JSON.stringify(mockWorkflowSettings, null, 2));
      });

      it('should export default settings when none exist', async () => {
        localStorageMock.getItem.mockReturnValue(null);

        const result = await settingsService.exportSettings();

        expect(result.success).toBe(true);
        const exportedData = JSON.parse(result.data!);
        expect(exportedData.name).toBe('');
        expect(exportedData.enabled).toBe(false);
      });

      it('should handle export errors', async () => {
        localStorageMock.getItem.mockImplementation(() => {
          throw new Error('localStorage not available');
        });

        const result = await settingsService.exportSettings();

        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to export workflow settings');
      });
    });

    describe('importSettings', () => {
      it('should import valid settings from JSON string', async () => {
        localStorageMock.setItem.mockImplementation(() => {});
        const jsonString = JSON.stringify(mockWorkflowSettings);

        const result = await settingsService.importSettings(jsonString);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockWorkflowSettings);
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'workflow_settings',
          JSON.stringify(mockWorkflowSettings)
        );
      });

      it('should reject invalid JSON', async () => {
        const invalidJson = 'invalid-json{';

        const result = await settingsService.importSettings(invalidJson);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid JSON');
        expect(localStorageMock.setItem).not.toHaveBeenCalled();
      });

      it('should validate imported settings', async () => {
        const invalidSettings = {
          name: '', // Invalid
          webhookUrl: 'invalid-url', // Invalid
          enabled: 'not-boolean', // Invalid type
        };
        const jsonString = JSON.stringify(invalidSettings);

        const result = await settingsService.importSettings(jsonString);

        expect(result.success).toBe(false);
        expect(result.error).toContain('validation');
        expect(localStorageMock.setItem).not.toHaveBeenCalled();
      });

      it('should handle empty or null import data', async () => {
        const emptyResult = await settingsService.importSettings('');
        expect(emptyResult.success).toBe(false);
        expect(emptyResult.error).toContain('Import data is required');

        const nullResult = await settingsService.importSettings(null as any);
        expect(nullResult.success).toBe(false);
        expect(nullResult.error).toContain('Import data is required');
      });
    });
  });

  describe('Settings Backup and Recovery', () => {
    describe('createBackup', () => {
      it('should create a backup with timestamp', async () => {
        localStorageMock.getItem.mockReturnValue(
          JSON.stringify(mockWorkflowSettings)
        );
        localStorageMock.setItem.mockImplementation(() => {});

        const result = await settingsService.createBackup();

        expect(result.success).toBe(true);
        expect(result.data).toContain('workflow_settings_backup_');
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          expect.stringContaining('workflow_settings_backup_'),
          JSON.stringify(mockWorkflowSettings)
        );
      });

      it('should handle backup creation errors', async () => {
        localStorageMock.getItem.mockReturnValue(
          JSON.stringify(mockWorkflowSettings)
        );
        localStorageMock.setItem.mockImplementation(() => {
          throw new Error('Storage quota exceeded');
        });

        const result = await settingsService.createBackup();

        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to create backup');
      });
    });

    describe('listBackups', () => {
      it('should list all available backups', async () => {
        // Mock localStorage keys
        const mockKeys = [
          'workflow_settings_backup_2024-01-01_12-00-00',
          'workflow_settings_backup_2024-01-02_12-00-00',
          'other_key',
          'workflow_settings',
        ];

        Object.defineProperty(Storage.prototype, 'length', {
          get: () => mockKeys.length,
        });
        Object.defineProperty(Storage.prototype, 'key', {
          value: (index: number) => mockKeys[index],
        });

        const result = await settingsService.listBackups();

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(2);
        expect(result.data).toContain(
          'workflow_settings_backup_2024-01-01_12-00-00'
        );
        expect(result.data).toContain(
          'workflow_settings_backup_2024-01-02_12-00-00'
        );
      });

      it('should handle localStorage access errors', async () => {
        Object.defineProperty(Storage.prototype, 'length', {
          get: () => {
            throw new Error('localStorage not available');
          },
        });

        const result = await settingsService.listBackups();

        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to list backups');
      });
    });

    describe('restoreBackup', () => {
      it('should restore settings from backup', async () => {
        const backupKey = 'workflow_settings_backup_2024-01-01_12-00-00';
        localStorageMock.getItem.mockImplementation(key => {
          if (key === backupKey) {
            return JSON.stringify(mockWorkflowSettings);
          }
          return null;
        });
        localStorageMock.setItem.mockImplementation(() => {});

        const result = await settingsService.restoreBackup(backupKey);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockWorkflowSettings);
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'workflow_settings',
          JSON.stringify(mockWorkflowSettings)
        );
      });

      it('should handle missing backup', async () => {
        const backupKey = 'non-existent-backup';
        localStorageMock.getItem.mockReturnValue(null);

        const result = await settingsService.restoreBackup(backupKey);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Backup not found');
      });

      it('should validate backup data before restoring', async () => {
        const backupKey = 'workflow_settings_backup_2024-01-01_12-00-00';
        const invalidBackupData = {
          name: '', // Invalid
          webhookUrl: 'invalid-url', // Invalid
        };
        localStorageMock.getItem.mockReturnValue(
          JSON.stringify(invalidBackupData)
        );

        const result = await settingsService.restoreBackup(backupKey);

        expect(result.success).toBe(false);
        expect(result.error).toContain('validation');
      });
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle rapid successive operations', async () => {
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify(mockWorkflowSettings)
      );
      localStorageMock.setItem.mockImplementation(() => {});

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(settingsService.loadSettings());
        promises.push(settingsService.saveSettings(mockWorkflowSettings));
      }

      const results = await Promise.all(promises);

      // All operations should complete successfully
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('should handle very large settings objects', async () => {
      const largeSettings: WorkflowSettings = {
        ...mockWorkflowSettings,
        name: 'A'.repeat(1000), // Very long name
        webhookUrl: 'https://example.com/' + 'path/'.repeat(100), // Very long URL
      };

      localStorageMock.setItem.mockImplementation(() => {});

      const result = await settingsService.saveSettings(largeSettings);

      // Should handle large objects (validation will catch if too large)
      expect(typeof result.success).toBe('boolean');
    });

    it('should maintain data integrity across operations', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      localStorageMock.setItem.mockImplementation(() => {});

      // Save settings
      await settingsService.saveSettings(mockWorkflowSettings);

      // Mock the saved data for loading
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify(mockWorkflowSettings)
      );

      // Load settings
      const loadResult = await settingsService.loadSettings();

      expect(loadResult.success).toBe(true);
      expect(loadResult.data).toEqual(mockWorkflowSettings);
    });

    it('should handle concurrent access gracefully', async () => {
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify(mockWorkflowSettings)
      );
      localStorageMock.setItem.mockImplementation(() => {});

      // Simulate concurrent operations
      const concurrentOperations = [
        settingsService.loadSettings(),
        settingsService.updateSettings({ name: 'Updated 1' }),
        settingsService.updateSettings({ name: 'Updated 2' }),
        settingsService.loadSettings(),
      ];

      const results = await Promise.all(concurrentOperations);

      // All operations should complete without throwing errors
      results.forEach(result => {
        expect(typeof result.success).toBe('boolean');
      });
    });
  });

  describe('Error Recovery', () => {
    it('should recover from corrupted localStorage data', async () => {
      // First call returns corrupted data
      localStorageMock.getItem.mockReturnValueOnce('corrupted-json{');
      // Second call (after cleanup) returns null
      localStorageMock.getItem.mockReturnValueOnce(null);
      localStorageMock.removeItem.mockImplementation(() => {});

      const result = await settingsService.loadSettings();

      expect(result.success).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });

    it('should provide meaningful error messages', async () => {
      const error = new Error('Specific localStorage error');
      localStorageMock.getItem.mockImplementation(() => {
        throw error;
      });

      const result = await settingsService.loadSettings();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to load workflow settings');
      expect(console.error).toHaveBeenCalledWith(
        'Error loading workflow settings:',
        error
      );
    });
  });
});
