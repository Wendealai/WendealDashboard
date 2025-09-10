import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorkflowValidationService } from '../../services/workflow/WorkflowValidationService';
import type { WorkflowSettings } from '../../types/workflow';

/**
 * 工作流验证服务单元测试
 * 测试URL验证、工作流名称验证等核心功能
 */
describe('WorkflowValidationService', () => {
  let validationService: WorkflowValidationService;

  beforeEach(() => {
    validationService = new WorkflowValidationService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('URL Validation', () => {
    describe('Valid URLs', () => {
      it('should validate standard HTTP URLs', () => {
        const validUrls = [
          'http://example.com',
          'https://example.com',
          'http://localhost:3000',
          'https://api.example.com/webhook',
          'http://192.168.1.1:8080/api',
          'https://subdomain.example.com/path?query=value',
          'http://example.com:80/path#fragment',
        ];

        validUrls.forEach(url => {
          const result = validationService.validateUrl(url);
          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        });
      });

      it('should validate URLs with special characters', () => {
        const validUrls = [
          'https://example.com/path-with-dashes',
          'https://example.com/path_with_underscores',
          'https://example.com/path?param=value&other=123',
          'https://example.com/path#section-1',
        ];

        validUrls.forEach(url => {
          const result = validationService.validateUrl(url);
          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        });
      });

      it('should validate localhost URLs', () => {
        const localhostUrls = [
          'http://localhost',
          'http://localhost:3000',
          'https://localhost:8443',
          'http://127.0.0.1:5000',
        ];

        localhostUrls.forEach(url => {
          const result = validationService.validateUrl(url);
          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        });
      });
    });

    describe('Invalid URLs', () => {
      it('should reject empty or null URLs', () => {
        const invalidUrls = ['', ' ', null, undefined];

        invalidUrls.forEach(url => {
          const result = validationService.validateUrl(url as string);
          expect(result.isValid).toBe(false);
          expect(result.errors).toContain('URL is required');
        });
      });

      it('should reject URLs without protocol', () => {
        const invalidUrls = [
          'example.com',
          'www.example.com',
          'localhost:3000',
          'api.example.com/webhook',
        ];

        invalidUrls.forEach(url => {
          const result = validationService.validateUrl(url);
          expect(result.isValid).toBe(false);
          expect(result.errors).toContain(
            'URL must start with http:// or https://'
          );
        });
      });

      it('should reject URLs with invalid protocols', () => {
        const invalidUrls = [
          'ftp://example.com',
          'file://example.com',
          'mailto:test@example.com',
          'javascript:alert(1)',
        ];

        invalidUrls.forEach(url => {
          const result = validationService.validateUrl(url);
          expect(result.isValid).toBe(false);
          expect(result.errors).toContain(
            'URL must start with http:// or https://'
          );
        });
      });

      it('should reject malformed URLs', () => {
        const invalidUrls = [
          'http://',
          'https://',
          'http://.',
          'http://..',
          'http://../',
          'http://?',
          'http://#',
          'http:// example.com',
          'http://example .com',
        ];

        invalidUrls.forEach(url => {
          const result = validationService.validateUrl(url);
          expect(result.isValid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
        });
      });

      it('should reject URLs that are too long', () => {
        const longUrl = 'https://example.com/' + 'a'.repeat(2000);
        const result = validationService.validateUrl(longUrl);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'URL is too long (maximum 2048 characters)'
        );
      });

      it('should reject URLs with invalid characters', () => {
        const invalidUrls = [
          'https://example.com/path with spaces',
          'https://example.com/path<script>',
          'https://example.com/path"quotes"',
          'https://example.com/path{braces}',
        ];

        invalidUrls.forEach(url => {
          const result = validationService.validateUrl(url);
          expect(result.isValid).toBe(false);
          expect(result.errors).toContain('URL contains invalid characters');
        });
      });
    });

    describe('Edge Cases', () => {
      it('should handle URLs with international domain names', () => {
        const internationalUrls = [
          'https://例え.テスト',
          'https://xn--r8jz45g.xn--zckzah', // Punycode equivalent
        ];

        internationalUrls.forEach(url => {
          const result = validationService.validateUrl(url);
          // Should either be valid or have specific internationalization error
          expect(typeof result.isValid).toBe('boolean');
        });
      });

      it('should handle URLs with very long query strings', () => {
        const longQuery = 'param=' + 'a'.repeat(1000);
        const url = `https://example.com/path?${longQuery}`;
        const result = validationService.validateUrl(url);

        if (url.length > 2048) {
          expect(result.isValid).toBe(false);
          expect(result.errors).toContain(
            'URL is too long (maximum 2048 characters)'
          );
        } else {
          expect(result.isValid).toBe(true);
        }
      });
    });
  });

  describe('Workflow Name Validation', () => {
    describe('Valid Names', () => {
      it('should validate standard workflow names', () => {
        const validNames = [
          'My Workflow',
          'Data Processing Pipeline',
          'User Registration Flow',
          'API Integration',
          'Workflow-123',
          'Test_Workflow_v2',
        ];

        validNames.forEach(name => {
          const result = validationService.validateWorkflowName(name);
          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        });
      });

      it('should validate names with numbers and special characters', () => {
        const validNames = [
          'Workflow 1',
          'Test-Workflow',
          'My_Workflow',
          'Workflow (v2)',
          'API Integration - Phase 1',
        ];

        validNames.forEach(name => {
          const result = validationService.validateWorkflowName(name);
          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        });
      });

      it('should validate names at boundary lengths', () => {
        const minLengthName = 'ab'; // 2 characters
        const maxLengthName = 'a'.repeat(100); // 100 characters

        const minResult = validationService.validateWorkflowName(minLengthName);
        expect(minResult.isValid).toBe(true);

        const maxResult = validationService.validateWorkflowName(maxLengthName);
        expect(maxResult.isValid).toBe(true);
      });
    });

    describe('Invalid Names', () => {
      it('should reject empty or null names', () => {
        const invalidNames = ['', ' ', '  ', null, undefined];

        invalidNames.forEach(name => {
          const result = validationService.validateWorkflowName(name as string);
          expect(result.isValid).toBe(false);
          expect(result.errors).toContain('Workflow name is required');
        });
      });

      it('should reject names that are too short', () => {
        const shortName = 'a'; // 1 character
        const result = validationService.validateWorkflowName(shortName);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Workflow name must be at least 2 characters long'
        );
      });

      it('should reject names that are too long', () => {
        const longName = 'a'.repeat(101); // 101 characters
        const result = validationService.validateWorkflowName(longName);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Workflow name must be no more than 100 characters long'
        );
      });

      it('should reject names with invalid characters', () => {
        const invalidNames = [
          'Workflow<script>',
          'Workflow"quotes"',
          'Workflow{braces}',
          'Workflow[brackets]',
          'Workflow\\backslash',
          'Workflow/slash',
        ];

        invalidNames.forEach(name => {
          const result = validationService.validateWorkflowName(name);
          expect(result.isValid).toBe(false);
          expect(result.errors).toContain(
            'Workflow name contains invalid characters'
          );
        });
      });

      it('should reject names that start or end with whitespace', () => {
        const invalidNames = [
          ' Workflow',
          'Workflow ',
          ' Workflow ',
          '\tWorkflow',
          'Workflow\n',
        ];

        invalidNames.forEach(name => {
          const result = validationService.validateWorkflowName(name);
          expect(result.isValid).toBe(false);
          expect(result.errors).toContain(
            'Workflow name cannot start or end with whitespace'
          );
        });
      });

      it('should reject reserved names', () => {
        const reservedNames = [
          'system',
          'admin',
          'root',
          'default',
          'null',
          'undefined',
        ];

        reservedNames.forEach(name => {
          const result = validationService.validateWorkflowName(name);
          expect(result.isValid).toBe(false);
          expect(result.errors).toContain('Workflow name is reserved');
        });
      });
    });

    describe('Edge Cases', () => {
      it('should handle names with unicode characters', () => {
        const unicodeNames = [
          'Workflow 测试',
          'Workflow émoji 🚀',
          'Workflow Ñoño',
          'Workflow العربية',
        ];

        unicodeNames.forEach(name => {
          const result = validationService.validateWorkflowName(name);
          // Should handle unicode gracefully
          expect(typeof result.isValid).toBe('boolean');
        });
      });

      it('should handle names with multiple consecutive spaces', () => {
        const nameWithSpaces = 'My    Workflow    Name';
        const result = validationService.validateWorkflowName(nameWithSpaces);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Workflow name cannot contain multiple consecutive spaces'
        );
      });
    });
  });

  describe('Complete Workflow Settings Validation', () => {
    const validWorkflowSettings: WorkflowSettings = {
      name: 'Test Workflow',
      webhookUrl: 'https://api.example.com/webhook',
      enabled: true,
      retryAttempts: 3,
      timeout: 30000,
    };

    it('should validate complete valid workflow settings', () => {
      const result = validationService.validateWorkflowSettings(
        validWorkflowSettings
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate settings with optional fields', () => {
      const minimalSettings: WorkflowSettings = {
        name: 'Minimal Workflow',
        webhookUrl: 'https://api.example.com/webhook',
        enabled: false,
      };

      const result =
        validationService.validateWorkflowSettings(minimalSettings);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject settings with invalid name and URL', () => {
      const invalidSettings: WorkflowSettings = {
        name: '', // Invalid: empty
        webhookUrl: 'invalid-url', // Invalid: no protocol
        enabled: true,
      };

      const result =
        validationService.validateWorkflowSettings(invalidSettings);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain('Workflow name is required');
      expect(result.errors).toContain(
        'URL must start with http:// or https://'
      );
    });

    it('should validate retry attempts range', () => {
      const settingsWithInvalidRetry: WorkflowSettings = {
        ...validWorkflowSettings,
        retryAttempts: -1, // Invalid: negative
      };

      const result = validationService.validateWorkflowSettings(
        settingsWithInvalidRetry
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Retry attempts must be between 0 and 10'
      );
    });

    it('should validate timeout range', () => {
      const settingsWithInvalidTimeout: WorkflowSettings = {
        ...validWorkflowSettings,
        timeout: 0, // Invalid: too low
      };

      const result = validationService.validateWorkflowSettings(
        settingsWithInvalidTimeout
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Timeout must be between 1000ms and 300000ms'
      );
    });

    it('should handle null or undefined settings', () => {
      const nullResult = validationService.validateWorkflowSettings(
        null as any
      );
      expect(nullResult.isValid).toBe(false);
      expect(nullResult.errors).toContain('Workflow settings are required');

      const undefinedResult = validationService.validateWorkflowSettings(
        undefined as any
      );
      expect(undefinedResult.isValid).toBe(false);
      expect(undefinedResult.errors).toContain(
        'Workflow settings are required'
      );
    });
  });

  describe('Performance Tests', () => {
    it('should validate URLs quickly', () => {
      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        validationService.validateUrl('https://example.com/test');
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete 1000 validations in less than 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should validate workflow names quickly', () => {
      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        validationService.validateWorkflowName('Test Workflow');
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete 1000 validations in less than 50ms
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Error Message Quality', () => {
    it('should provide clear error messages for URL validation', () => {
      const result = validationService.validateUrl('invalid-url');
      expect(result.errors).toContain(
        'URL must start with http:// or https://'
      );
      expect(result.errors.every(error => typeof error === 'string')).toBe(
        true
      );
      expect(result.errors.every(error => error.length > 0)).toBe(true);
    });

    it('should provide clear error messages for name validation', () => {
      const result = validationService.validateWorkflowName('');
      expect(result.errors).toContain('Workflow name is required');
      expect(result.errors.every(error => typeof error === 'string')).toBe(
        true
      );
      expect(result.errors.every(error => error.length > 0)).toBe(true);
    });

    it('should not duplicate error messages', () => {
      const result = validationService.validateWorkflowSettings({
        name: '',
        webhookUrl: '',
        enabled: true,
      });

      const uniqueErrors = [...new Set(result.errors)];
      expect(result.errors.length).toBe(uniqueErrors.length);
    });
  });
});
