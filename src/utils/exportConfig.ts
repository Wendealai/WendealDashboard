/**
 * 导出一致性系统配置管理器
 * 提供配置加载、验证和默认配置生成功能
 */

// import { resolve } from 'path'; // Removed for browser compatibility
import type {
  ExportConfig,
  ExportRule,
  ScanOptions,
  ValidationResult,
  IssueSeverity,
} from '../types/export';

/**
 * 默认扫描选项
 */
const DEFAULT_SCAN_OPTIONS: ScanOptions = {
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
 * 默认导出规则
 */
const DEFAULT_EXPORT_RULES: ExportRule[] = [
  {
    name: 'no-missing-exports',
    description: '检查缺失的导出',
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
    description: '检查命名一致性',
    enabled: true,
    severity: 'warning',
    options: {
      enforceConventions: true,
      allowAbbreviations: false,
    },
  },
  {
    name: 'no-circular-dependencies',
    description: '检查循环依赖',
    enabled: true,
    severity: 'error',
    options: {
      maxDepth: 5,
    },
  },
  {
    name: 'no-unused-exports',
    description: '检查未使用的导出',
    enabled: true,
    severity: 'warning',
    options: {
      ignoreDefaultExports: false,
    },
  },
  {
    name: 'import-export-match',
    description: '检查导入导出匹配',
    enabled: true,
    severity: 'error',
    options: {
      strictTypeChecking: true,
    },
  },
  {
    name: 'no-duplicate-exports',
    description: '检查重复导出',
    enabled: true,
    severity: 'error',
    options: {},
  },
  {
    name: 'type-export-consistency',
    description: '检查类型导出一致性',
    enabled: true,
    severity: 'warning',
    options: {
      preferTypeOnlyImports: true,
    },
  },
];

/**
 * 默认命名约定
 */
const DEFAULT_NAMING_CONVENTIONS = {
  interfaces: '^I[A-Z][a-zA-Z0-9]*$|^[A-Z][a-zA-Z0-9]*$',
  types: '^[A-Z][a-zA-Z0-9]*$',
  components: '^[A-Z][a-zA-Z0-9]*$',
  functions: '^[a-z][a-zA-Z0-9]*$',
};

/**
 * 生成默认配置
 * @param rootPath 项目根路径
 * @returns 默认配置对象
 */
export function createDefaultConfig(rootPath: string): ExportConfig {
  return {
    rootPath: resolve(rootPath),
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
 * 合并用户配置与默认配置
 * @param userConfig 用户配置
 * @param configPath 配置文件路径
 * @returns 合并后的配置
 */
function mergeWithDefaults(
  userConfig: Partial<ExportConfig>,
  configPath: string
): ExportConfig {
  const defaultConfig = createDefaultConfig(resolve(configPath, '..'));

  return {
    ...defaultConfig,
    ...userConfig,
    rootPath: userConfig.rootPath
      ? resolve(userConfig.rootPath)
      : defaultConfig.rootPath,
    scanOptions: {
      ...defaultConfig.scanOptions,
      ...userConfig.scanOptions,
    },
    rules: userConfig.rules || defaultConfig.rules,
    namingConventions: {
      ...defaultConfig.namingConventions,
      ...userConfig.namingConventions,
    },
    autoFix: {
      ...defaultConfig.autoFix,
      ...userConfig.autoFix,
    },
    reporting: {
      ...defaultConfig.reporting,
      ...userConfig.reporting,
    },
  };
}

/**
 * 验证配置对象
 * @param config 配置对象
 * @returns 验证结果
 */
export function validateConfig(config: ExportConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 验证根路径
  if (!config.rootPath) {
    errors.push('rootPath 是必需的');
  } else if (!existsSync(config.rootPath)) {
    errors.push(`rootPath 不存在: ${config.rootPath}`);
  }

  // 验证扫描选项
  if (!config.scanOptions) {
    errors.push('scanOptions 是必需的');
  } else {
    if (
      !Array.isArray(config.scanOptions.include) ||
      config.scanOptions.include.length === 0
    ) {
      errors.push('scanOptions.include 必须是非空数组');
    }

    if (!Array.isArray(config.scanOptions.exclude)) {
      errors.push('scanOptions.exclude 必须是数组');
    }

    if (typeof config.scanOptions.recursive !== 'boolean') {
      errors.push('scanOptions.recursive 必须是布尔值');
    }

    if (
      config.scanOptions.maxDepth !== undefined &&
      (typeof config.scanOptions.maxDepth !== 'number' ||
        config.scanOptions.maxDepth < 1)
    ) {
      errors.push('scanOptions.maxDepth 必须是大于0的数字');
    }
  }

  // 验证规则
  if (!Array.isArray(config.rules)) {
    errors.push('rules 必须是数组');
  } else {
    config.rules.forEach((rule, index) => {
      if (!rule.name) {
        errors.push(`规则 ${index} 缺少 name 属性`);
      }

      if (!rule.description) {
        warnings.push(`规则 ${rule.name || index} 缺少 description 属性`);
      }

      if (typeof rule.enabled !== 'boolean') {
        errors.push(`规则 ${rule.name || index} 的 enabled 属性必须是布尔值`);
      }

      if (!['error', 'warning', 'info'].includes(rule.severity)) {
        errors.push(
          `规则 ${rule.name || index} 的 severity 必须是 'error', 'warning' 或 'info'`
        );
      }
    });
  }

  // 验证命名约定
  if (!config.namingConventions) {
    errors.push('namingConventions 是必需的');
  } else {
    const conventions = ['interfaces', 'types', 'components', 'functions'];
    conventions.forEach(convention => {
      const pattern =
        config.namingConventions[
          convention as keyof typeof config.namingConventions
        ];
      if (!pattern) {
        warnings.push(`缺少 ${convention} 的命名约定`);
      } else {
        try {
          new RegExp(pattern);
        } catch (error) {
          errors.push(`${convention} 的命名约定正则表达式无效: ${pattern}`);
        }
      }
    });
  }

  // 验证自动修复选项
  if (!config.autoFix) {
    errors.push('autoFix 是必需的');
  } else {
    if (typeof config.autoFix.enabled !== 'boolean') {
      errors.push('autoFix.enabled 必须是布尔值');
    }

    if (typeof config.autoFix.createBackup !== 'boolean') {
      errors.push('autoFix.createBackup 必须是布尔值');
    }

    if (!['low', 'medium', 'high'].includes(config.autoFix.maxRiskLevel)) {
      errors.push('autoFix.maxRiskLevel 必须是 "low", "medium" 或 "high"');
    }
  }

  // 验证报告选项
  if (!config.reporting) {
    errors.push('reporting 是必需的');
  } else {
    if (
      !['console', 'json', 'html', 'markdown'].includes(config.reporting.format)
    ) {
      errors.push(
        'reporting.format 必须是 "console", "json", "html" 或 "markdown"'
      );
    }

    if (typeof config.reporting.verbose !== 'boolean') {
      errors.push('reporting.verbose 必须是布尔值');
    }

    if (
      config.reporting.outputPath &&
      typeof config.reporting.outputPath !== 'string'
    ) {
      errors.push('reporting.outputPath 必须是字符串');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 获取启用的规则
 * @param config 配置对象
 * @returns 启用的规则数组
 */
export function getEnabledRules(config: ExportConfig): ExportRule[] {
  return config.rules.filter(rule => rule.enabled);
}

/**
 * 根据严重程度获取规则
 * @param config 配置对象
 * @param severity 严重程度
 * @returns 指定严重程度的规则数组
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
 * 获取规则配置
 * @param config 配置对象
 * @param ruleName 规则名称
 * @returns 规则配置或undefined
 */
export function getRuleConfig(
  config: ExportConfig,
  ruleName: string
): ExportRule | undefined {
  return config.rules.find(rule => rule.name === ruleName);
}

/**
 * 检查规则是否启用
 * @param config 配置对象
 * @param ruleName 规则名称
 * @returns 是否启用
 */
export function isRuleEnabled(config: ExportConfig, ruleName: string): boolean {
  const rule = getRuleConfig(config, ruleName);
  return rule ? rule.enabled : false;
}

/**
 * 保存配置到文件
 * @param config 配置对象
 * @param configPath 配置文件路径
 * @returns 是否保存成功
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
 * 配置管理器类
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
   * 获取配置
   */
  getConfig(): ExportConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
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
   * 验证当前配置
   */
  validate(): ValidationResult {
    return validateConfig(this.config);
  }

  /**
   * 保存配置
   */
  save(configPath?: string): boolean {
    const targetPath = configPath || this.configPath;
    if (!targetPath) {
      throw new Error('没有指定配置文件路径');
    }

    return saveConfigToFile(this.config, targetPath);
  }

  /**
   * 重新加载配置
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
   * 获取启用的规则
   */
  getEnabledRules(): ExportRule[] {
    return getEnabledRules(this.config);
  }

  /**
   * 检查规则是否启用
   */
  isRuleEnabled(ruleName: string): boolean {
    return isRuleEnabled(this.config, ruleName);
  }

  /**
   * 获取规则配置
   */
  getRuleConfig(ruleName: string): ExportRule | undefined {
    return getRuleConfig(this.config, ruleName);
  }
}

// 导出默认实例创建函数
export function createConfigManager(
  projectPath: string,
  configPath?: string
): ExportConfigManager {
  return new ExportConfigManager(projectPath, configPath);
}
