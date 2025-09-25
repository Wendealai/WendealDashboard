/**
 * Export Diagnostic Configuration
 * 导出诊断系统配置
 */

import type { DiagnosticConfig } from '@/types/exportDiagnostic';
import { IssueSeverity } from '@/types/exportDiagnostic';

/**
 * 默认诊断配置
 */
export const DEFAULT_DIAGNOSTIC_CONFIG: DiagnosticConfig = {
  // 文件模式配置
  filePatterns: ['**/*.{ts,tsx,js,jsx}', '**/*.d.ts'],

  // 忽略模式配置
  ignorePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/*.test.{ts,tsx,js,jsx}',
    '**/*.spec.{ts,tsx,js,jsx}',
    '**/*.d.ts',
    '**/coverage/**',
    '**/.next/**',
    '**/.nuxt/**',
    '**/.vuepress/**',
    '**/.cache/**',
    '**/.temp/**',
    '**/.tmp/**',
  ],

  // 扫描配置
  maxDepth: 10,
  timeout: 30000,
  concurrency: 4,
  includeTypes: true,
  includeTests: false,

  // 缓存配置
  enableCache: true,
  cacheExpiry: 5 * 60 * 1000, // 5分钟

  // 诊断规则配置
  severityThreshold: IssueSeverity.INFO,

  // TypeScript配置
  typescriptConfig: {
    strict: false,
    checkTypeExports: true,
    target: 'ES2020',
    moduleResolution: 'node',
    jsx: 'react',
  },

  // ESLint配置
  eslintConfig: {
    enabled: true,
    configFile: '.eslintrc.js',
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },

  // 输出配置
  output: {
    format: 'json',
    file: 'export-diagnostic-report.json',
    verbose: false,
    includeSuggestions: true,
    includeCodeSnippets: true,
  },

  // 性能配置
  performance: {
    enableProfiling: false,
    maxMemoryUsage: 512 * 1024 * 1024, // 512MB
    timeoutPerFile: 5000, // 5秒
  },
};

/**
 * 开发环境配置
 */
export const DEVELOPMENT_CONFIG: Partial<DiagnosticConfig> = {
  enableCache: false,
  output: {
    format: 'console',
    verbose: true,
    includeSuggestions: true,
    includeCodeSnippets: true,
  },
  performance: {
    enableProfiling: true,
    timeoutPerFile: 10000,
  },
};

/**
 * 生产环境配置
 */
export const PRODUCTION_CONFIG: Partial<DiagnosticConfig> = {
  enableCache: true,
  cacheExpiry: 30 * 60 * 1000, // 30分钟
  output: {
    format: 'json',
    file: 'export-diagnostic-report.json',
    verbose: false,
    includeSuggestions: false,
    includeCodeSnippets: false,
  },
  performance: {
    enableProfiling: false,
    maxMemoryUsage: 1024 * 1024 * 1024, // 1GB
    timeoutPerFile: 3000,
  },
};

/**
 * CI/CD环境配置
 */
export const CI_CONFIG: Partial<DiagnosticConfig> = {
  enableCache: false,
  output: {
    format: 'junit',
    file: 'export-diagnostic-results.xml',
    verbose: false,
    includeSuggestions: true,
    includeCodeSnippets: false,
  },
  performance: {
    enableProfiling: false,
    timeoutPerFile: 2000,
  },
};

/**
 * 配置合并工具
 */
export function mergeConfigs(
  base: DiagnosticConfig,
  overrides: Partial<DiagnosticConfig>
): DiagnosticConfig {
  return {
    ...base,
    ...overrides,
    // 深度合并嵌套对象
    typescriptConfig: {
      strict: base.typescriptConfig?.strict ?? false,
      checkTypeExports: base.typescriptConfig?.checkTypeExports ?? true,
      target: base.typescriptConfig?.target ?? 'ES2020',
      moduleResolution: base.typescriptConfig?.moduleResolution ?? 'node',
      jsx: base.typescriptConfig?.jsx ?? 'react',
      ...overrides.typescriptConfig,
    },
    eslintConfig: {
      enabled: base.eslintConfig?.enabled ?? true,
      configFile: base.eslintConfig?.configFile ?? '.eslintrc.js',
      extensions: base.eslintConfig?.extensions ?? [
        '.ts',
        '.tsx',
        '.js',
        '.jsx',
      ],
      ...overrides.eslintConfig,
    },
    output: {
      format: base.output?.format ?? 'json',
      file: base.output?.file ?? 'export-diagnostic-report.json',
      verbose: base.output?.verbose ?? false,
      includeSuggestions: base.output?.includeSuggestions ?? true,
      includeCodeSnippets: base.output?.includeCodeSnippets ?? true,
      ...overrides.output,
    },
    performance: {
      enableProfiling: base.performance?.enableProfiling ?? false,
      maxMemoryUsage: base.performance?.maxMemoryUsage ?? 512 * 1024 * 1024,
      timeoutPerFile: base.performance?.timeoutPerFile ?? 5000,
      ...overrides.performance,
    },
  };
}

/**
 * 根据环境获取配置
 */
export function getConfigForEnvironment(
  environment: 'development' | 'production' | 'ci' | 'test' = 'development'
): DiagnosticConfig {
  const baseConfig = DEFAULT_DIAGNOSTIC_CONFIG;

  switch (environment) {
    case 'development':
      return mergeConfigs(baseConfig, DEVELOPMENT_CONFIG);
    case 'production':
      return mergeConfigs(baseConfig, PRODUCTION_CONFIG);
    case 'ci':
      return mergeConfigs(baseConfig, CI_CONFIG);
    case 'test':
      return mergeConfigs(baseConfig, {
        enableCache: false,
        output: {
          format: 'json',
          verbose: false,
          includeSuggestions: true,
          includeCodeSnippets: true,
        },
      });
    default:
      return baseConfig;
  }
}

/**
 * 从文件加载配置
 */
export async function loadConfigFromFile(
  configPath?: string
): Promise<DiagnosticConfig> {
  const defaultPath = './export-diagnostic.config.js';

  try {
    const path = configPath || defaultPath;
    // 动态导入配置文件
    const configModule = await import(path);
    const userConfig = configModule.default || configModule;

    return mergeConfigs(DEFAULT_DIAGNOSTIC_CONFIG, userConfig);
  } catch (error) {
    console.warn(`无法加载配置文件 ${configPath || defaultPath}:`, error);
    return DEFAULT_DIAGNOSTIC_CONFIG;
  }
}

/**
 * 验证配置有效性
 */
export function validateConfig(config: DiagnosticConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 验证文件模式
  if (!config.filePatterns || config.filePatterns.length === 0) {
    errors.push('必须至少指定一个文件模式');
  }

  // 验证最大深度
  if ((config.maxDepth ?? 10) < 1) {
    errors.push('maxDepth 必须大于0');
  }

  // 验证超时时间
  if ((config.timeout ?? 30000) < 1000) {
    errors.push('timeout 必须至少1000ms');
  }

  // 验证并发数
  if ((config.concurrency ?? 4) < 1) {
    errors.push('concurrency 必须至少为1');
  }

  // 验证缓存过期时间
  if (config.cacheExpiry < 0) {
    errors.push('cacheExpiry 不能为负数');
  }

  // 验证性能配置
  if (
    config.performance?.maxMemoryUsage &&
    config.performance.maxMemoryUsage < 64 * 1024 * 1024
  ) {
    errors.push('maxMemoryUsage 必须至少64MB');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 配置序列化
 */
export function serializeConfig(config: DiagnosticConfig): string {
  return JSON.stringify(config, null, 2);
}

/**
 * 配置反序列化
 */
export function deserializeConfig(json: string): DiagnosticConfig {
  try {
    const parsed = JSON.parse(json);
    return mergeConfigs(DEFAULT_DIAGNOSTIC_CONFIG, parsed);
  } catch (error) {
    throw new Error(`配置反序列化失败: ${error}`);
  }
}

/**
 * 获取配置摘要
 */
export function getConfigSummary(config: DiagnosticConfig): {
  filePatterns: number;
  ignorePatterns: number;
  cacheEnabled: boolean;
  typescriptEnabled: boolean;
  eslintEnabled: boolean;
  outputFormat: string;
} {
  return {
    filePatterns: config.filePatterns.length,
    ignorePatterns: config.ignorePatterns.length,
    cacheEnabled: config.enableCache,
    typescriptEnabled: !!config.typescriptConfig,
    eslintEnabled: config.eslintConfig?.enabled || false,
    outputFormat: config.output?.format || 'json',
  };
}

/**
 * 获取当前配置
 */
export function getCurrentConfig(): DiagnosticConfig {
  return DEFAULT_DIAGNOSTIC_CONFIG;
}

/**
 * 更新当前配置
 */
export function updateCurrentConfig(updates: Partial<DiagnosticConfig>): void {
  // In a real implementation, this would persist the config
  // For now, just update the default config
  Object.assign(DEFAULT_DIAGNOSTIC_CONFIG, updates);
}
