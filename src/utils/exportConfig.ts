/**
 * Export consistency system configuration manager
 * Provides configuration loading, validation and default configuration generation functionality
 */

// Browser-compatible path utilities
const isNode =
  typeof process !== 'undefined' && process.versions && process.versions.node;

/**
 * Get path resolve function (Node.js only)
 */
const getPathResolve = async (): Promise<
  ((path: string) => string) | undefined
> => {
  if (!isNode) return undefined;
  try {
    const path = await import('path');
    return path.resolve;
  } catch (error) {
    console.warn('Path module not available');
    return undefined;
  }
};

/**
 * Get file exists check function (Node.js only)
 */
const getExistsSync = async (): Promise<
  ((path: string) => boolean) | undefined
> => {
  if (!isNode) return undefined;
  try {
    const fs = await import('fs');
    return fs.existsSync;
  } catch (error) {
    console.warn('FS module not available');
    return undefined;
  }
};

/**
 * Browser-compatible path join
 */
const joinPath = (...parts: string[]): string => {
  return parts.join('/').replace(/\/+/g, '/').replace(/\/$/, '') || '/';
};
import type {
  ExportConfig,
  ExportRule,
  ExportScanOptions,
  ValidationResult,
  IssueSeverity,
} from '../types/export';

/**
 * Default scan options
 */
const DEFAULT_SCAN_OPTIONS: ExportScanOptions = {
  include: ['**/*.ts', '**/*.tsx'],
  exclude: [
    'node_modules/**',
    'dist/**',
    'build/**',
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/*.spec.ts',
    '**/*.spec.tsx',
    '**/*.d.ts',
  ],
  recursive: true,
  maxDepth: 10,
  followSymlinks: false,
};

/**
 * Default export rules
 */
const DEFAULT_EXPORT_RULES: ExportRule[] = [
  {
    name: 'no-missing-exports',
    description: 'Check missing exports',
    enabled: true,
    severity: 'error',
    options: {
      checkInterfaces: true,
      checkTypes: true,
      checkComponents: true,
    },
  },
  {
    name: 'consistent-naming',
    description: 'Check naming consistency',
    enabled: true,
    severity: 'warning',
    options: {
      enforceConventions: true,
      allowAbbreviations: false,
    },
  },
  {
    name: 'no-circular-dependencies',
    description: 'Check circular dependencies',
    enabled: true,
    severity: 'error',
    options: {
      maxDepth: 5,
    },
  },
  {
    name: 'no-unused-exports',
    description: 'Check unused exports',
    enabled: true,
    severity: 'warning',
    options: {
      ignoreDefaultExports: false,
    },
  },
  {
    name: 'import-export-match',
    description: 'Check import export matching',
    enabled: true,
    severity: 'error',
    options: {
      strictTypeChecking: true,
    },
  },
  {
    name: 'no-duplicate-exports',
    description: 'Check duplicate exports',
    enabled: true,
    severity: 'error',
    options: {},
  },
  {
    name: 'type-export-consistency',
    description: 'Check type export consistency',
    enabled: true,
    severity: 'warning',
    options: {
      preferTypeOnlyImports: true,
    },
  },
];

/**
 * Default naming conventions
 */
const DEFAULT_NAMING_CONVENTIONS = {
  interfaces: '^I[A-Z][a-zA-Z0-9]*$|^[A-Z][a-zA-Z0-9]*$',
  types: '^[A-Z][a-zA-Z0-9]*$',
  components: '^[A-Z][a-zA-Z0-9]*$',
  functions: '^[a-z][a-zA-Z0-9]*$',
};

/**
 * Generate default configuration
 * @param rootPath Project root path
 * @returns Default configuration object
 */
export function createDefaultConfig(rootPath: string): ExportConfig {
  // Use browser-compatible path resolution
  const resolvedPath = isNode ? rootPath : rootPath.replace(/\\/g, '/');

  return {
    rootPath: resolvedPath,
    scanOptions: { ...DEFAULT_SCAN_OPTIONS },
    rules: DEFAULT_EXPORT_RULES.map(rule => ({ ...rule })),
    namingConventions: { ...DEFAULT_NAMING_CONVENTIONS },
    autoFix: {
      enabled: false,
      createBackup: true,
      maxRiskLevel: 'low',
    },
    reporting: {
      format: 'console',
      verbose: false,
    },
  };
}

/**
 * Validate configuration object
 * @param config Configuration object
 * @returns Validation result
 */
export function validateConfig(config: ExportConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate root path
  if (!config.rootPath) {
    errors.push('rootPath is required');
  } else if (isNode) {
    // Only check file existence in Node.js environment
    try {
      const fs = require('fs');
      if (!fs.existsSync(config.rootPath)) {
        errors.push(`rootPath does not exist: ${config.rootPath}`);
      }
    } catch (error) {
      // Skip file system check in browser environment
      console.warn('File system check skipped in browser environment');
    }
  }

  // Validate scan options
  if (!config.scanOptions) {
    errors.push('scanOptions is required');
  } else {
    if (
      !Array.isArray(config.scanOptions.include) ||
      config.scanOptions.include.length === 0
    ) {
      errors.push('scanOptions.include must be a non-empty array');
    }

    if (!Array.isArray(config.scanOptions.exclude)) {
      errors.push('scanOptions.exclude must be an array');
    }

    if (typeof config.scanOptions.recursive !== 'boolean') {
      errors.push('scanOptions.recursive must be a boolean');
    }

    if (
      config.scanOptions.maxDepth !== undefined &&
      (typeof config.scanOptions.maxDepth !== 'number' ||
        config.scanOptions.maxDepth < 1)
    ) {
      errors.push('scanOptions.maxDepth must be a number greater than 0');
    }
  }

  // Validate rules
  if (!Array.isArray(config.rules)) {
    errors.push('rules must be an array');
  } else {
    config.rules.forEach((rule, index) => {
      if (!rule.name) {
        errors.push(`Rule ${index} is missing name property`);
      }

      if (!rule.description) {
        warnings.push(
          `Rule ${rule.name || index} is missing description property`
        );
      }

      if (typeof rule.enabled !== 'boolean') {
        errors.push(
          `Rule ${rule.name || index} enabled property must be a boolean`
        );
      }

      if (!['error', 'warning', 'info'].includes(rule.severity)) {
        errors.push(
          `Rule ${rule.name || index} severity must be 'error', 'warning' or 'info'`
        );
      }
    });
  }

  // Validate naming conventions
  if (!config.namingConventions) {
    errors.push('namingConventions is required');
  } else {
    const conventions = ['interfaces', 'types', 'components', 'functions'];
    conventions.forEach(convention => {
      const pattern =
        config.namingConventions[
          convention as keyof typeof config.namingConventions
        ];
      if (!pattern) {
        warnings.push(`Missing naming convention for ${convention}`);
      } else {
        try {
          new RegExp(pattern);
        } catch (error) {
          errors.push(
            `Invalid regex pattern for ${convention} naming convention: ${pattern}`
          );
        }
      }
    });
  }

  // Validate auto-fix options
  if (!config.autoFix) {
    errors.push('autoFix is required');
  } else {
    if (typeof config.autoFix.enabled !== 'boolean') {
      errors.push('autoFix.enabled must be a boolean');
    }

    if (typeof config.autoFix.createBackup !== 'boolean') {
      errors.push('autoFix.createBackup must be a boolean');
    }

    if (!['low', 'medium', 'high'].includes(config.autoFix.maxRiskLevel)) {
      errors.push('autoFix.maxRiskLevel must be "low", "medium" or "high"');
    }
  }

  // Validate reporting options
  if (!config.reporting) {
    errors.push('reporting is required');
  } else {
    if (
      !['console', 'json', 'html', 'markdown'].includes(config.reporting.format)
    ) {
      errors.push(
        'reporting.format must be "console", "json", "html" or "markdown"'
      );
    }

    if (typeof config.reporting.verbose !== 'boolean') {
      errors.push('reporting.verbose must be a boolean');
    }

    if (
      config.reporting.outputPath &&
      typeof config.reporting.outputPath !== 'string'
    ) {
      errors.push('reporting.outputPath must be a string');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get enabled rules
 * @param config Configuration object
 * @returns Array of enabled rules
 */
export function getEnabledRules(config: ExportConfig): ExportRule[] {
  return config.rules.filter(rule => rule.enabled);
}

/**
 * Get rules by severity
 * @param config Configuration object
 * @param severity Severity level
 * @returns Array of rules with specified severity
 */
export function getRulesBySeverity(
  config: ExportConfig,
  severity: IssueSeverity
): ExportRule[] {
  return config.rules.filter(
    rule => rule.enabled && rule.severity === severity
  );
}

/**
 * Get rule configuration
 * @param config Configuration object
 * @param ruleName Rule name
 * @returns Rule configuration or undefined
 */
export function getRuleConfig(
  config: ExportConfig,
  ruleName: string
): ExportRule | undefined {
  return config.rules.find(rule => rule.name === ruleName);
}

/**
 * Check if rule is enabled
 * @param config Configuration object
 * @param ruleName Rule name
 * @returns Whether the rule is enabled
 */
export function isRuleEnabled(config: ExportConfig, ruleName: string): boolean {
  const rule = getRuleConfig(config, ruleName);
  return rule ? rule.enabled : false;
}

/**
 * Save configuration to file
 * @param config Configuration object
 * @param configPath Configuration file path
 * @returns Whether save was successful
 */
export function saveConfigToFile(
  config: ExportConfig,
  configPath: string
): boolean {
  // File system operations are not supported in browser environment
  console.warn(
    'Configuration file saving is not supported in browser environment'
  );
  console.log('Configuration would be saved to:', configPath);
  console.log('Configuration content:', JSON.stringify(config, null, 2));
  return false;
}

/**
 * Configuration manager class
 */
export class ExportConfigManager {
  private config: ExportConfig;
  private configPath?: string;

  constructor(projectPath: string, configPath?: string) {
    if (configPath) {
      this.configPath = configPath;
      // const loadedConfig = loadConfigFromFile(configPath);
      this.config = createDefaultConfig(projectPath);
    } else {
      this.config = createDefaultConfig(projectPath);
      this.configPath = '';
    }
  }

  /**
   * Get configuration
   */
  getConfig(): ExportConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ExportConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
      scanOptions: {
        ...this.config.scanOptions,
        ...updates.scanOptions,
      },
      namingConventions: {
        ...this.config.namingConventions,
        ...updates.namingConventions,
      },
      autoFix: {
        ...this.config.autoFix,
        ...updates.autoFix,
      },
      reporting: {
        ...this.config.reporting,
        ...updates.reporting,
      },
    };
  }

  /**
   * Validate current configuration
   */
  validate(): ValidationResult {
    return validateConfig(this.config);
  }

  /**
   * Save configuration
   */
  save(configPath?: string): boolean {
    const targetPath = configPath || this.configPath;
    if (!targetPath) {
      throw new Error('No configuration file path specified');
    }

    return saveConfigToFile(this.config, targetPath);
  }

  /**
   * Reload configuration
   */
  reload(): void {
    if (this.configPath) {
      // const loadedConfig = loadConfigFromFile(this.configPath);
      // Configuration reloading is disabled for browser compatibility
      console.warn(
        'Configuration reloading is not supported in browser environment'
      );
    }
  }

  /**
   * Get enabled rules
   */
  getEnabledRules(): ExportRule[] {
    return getEnabledRules(this.config);
  }

  /**
   * Check if rule is enabled
   */
  isRuleEnabled(ruleName: string): boolean {
    return isRuleEnabled(this.config, ruleName);
  }

  /**
   * Get rule configuration
   */
  getRuleConfig(ruleName: string): ExportRule | undefined {
    return getRuleConfig(this.config, ruleName);
  }
}

// Export default instance creation function
export function createConfigManager(
  projectPath: string,
  configPath?: string
): ExportConfigManager {
  return new ExportConfigManager(projectPath, configPath);
}
