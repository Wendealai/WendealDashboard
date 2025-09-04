// Export utility functions
// Example:
// export { formatDate } from './dateUtils';
// export { validateEmail } from './validation';
// export { apiClient } from './api';

// 认证相关工具函数
export {
  tokenUtils,
  userUtils,
  sessionUtils,
  passwordUtils,
  permissionUtils,
  cryptoUtils,
  validationUtils,
} from './auth';
export { default as authUtils } from './auth';

// 延迟函数
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// 格式化数字
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('zh-CN').format(num);
};

// 格式化货币
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
  }).format(amount);
};

// 导出一致性配置管理
export {
  createDefaultConfig,
  validateConfig,
  getEnabledRules,
  getRulesBySeverity,
  getRuleConfig,
  isRuleEnabled,
  saveConfigToFile,
  ExportConfigManager,
  createConfigManager,
} from './exportConfig';

// 文件扫描工具 - Removed fileScanner module
// export {
//   FileScanner,
//   createFileScanner,
//   scanSingleFile,
//   quickScanDirectory,
//   isTypeScriptFile,
//   getRelativePath,
//   normalizePath,
// } from './fileScanner'; // Removed - fileScanner deleted

// 导出检测工具
export {
  ExportDetector,
  createExportDetector,
  analyzeFileExports,
  analyzeMultipleFiles,
  parseExportStatement,
  validateExportNaming,
  getExportDependencies,
  findExportConflicts,
} from './exportDetector';

// 一致性分析工具
export {
  ConsistencyAnalyzer,
  createConsistencyAnalyzer,
  analyzeProjectConsistency,
  validateExportConsistency,
} from './consistencyAnalyzer';

// 自动修复工具
export {
  AutoFixer,
  createAutoFixer,
  quickFixFile,
  fixProject,
  type FixOperation,
  type FixResult,
  type BatchFixResult,
  type AutoFixOptions,
} from './autoFixer';

// 报告生成工具
export {
  ReportGenerator,
  createReportGenerator,
  generateConsoleReport,
  generateAndSaveReport,
  generateMultiFormatReports,
  type ReportFormat,
  type ReportOptions,
  type ReportStatistics,
  type GeneratedReport,
} from './reportGenerator';
