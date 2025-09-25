# Export Error Diagnosis System

## 概述

导出错误诊断系统是一个全面的工具，用于分析和诊断TypeScript/JavaScript项目中的导出相关问题。该系统能够自动扫描代码库，识别各种导出问题，并提供智能的修复建议。

## 主要功能

### 🔍 代码扫描和分析

- **多格式支持**: 支持TypeScript (.ts/.tsx) 和 JavaScript (.js/.jsx) 文件
- **智能过滤**: 自动排除node_modules、测试文件和构建产物
- **并发处理**: 支持高性能的并发文件处理
- **缓存机制**: 智能缓存以提升重复扫描性能

### 🐛 问题检测

- **未使用导出**: 识别未被引用的导出声明
- **重复导出**: 检测同名导出冲突
- **默认导出冲突**: 识别文件内的多个默认导出
- **命名不一致**: 检查驼峰命名约定
- **类型导出问题**: 验证TypeScript类型导出的正确性
- **循环依赖**: 检测模块间的循环引用

### 🔧 智能修复建议

- **自动修复**: 提供可直接应用的代码修改
- **手动修复指导**: 为复杂问题提供详细修复步骤
- **置信度评分**: 评估修复建议的可靠性
- **影响分析**: 显示修复操作影响的文件范围

### 🛠️ 集成工具

- **ESLint集成**: 与ESLint深度集成，扩展导出相关规则
- **TypeScript编译器**: 利用TypeScript AST进行深度代码分析
- **缓存管理**: 高效的缓存系统，支持内存和磁盘存储

## 架构设计

### 核心组件

#### 1. FileScanner (文件扫描器)

```typescript
class FileScanner {
  scanDirectory(dirPath: string, options: ScanOptions): Promise<ExportInfo[]>;
  scanFile(filePath: string): Promise<ExportInfo[]>;
}
```

- 负责扫描项目文件和解析导出声明
- 支持多种扫描选项和过滤条件
- 提供进度回调和错误处理

#### 2. ExportAnalyzer (导出分析器)

```typescript
class ExportAnalyzer {
  analyzeExports(allExports: ExportInfo[]): ExportIssue[];
}
```

- 分析导出声明的一致性和完整性
- 检测各种导出相关问题
- 生成修复建议

#### 3. FixSuggester (修复建议器)

```typescript
class FixSuggester {
  suggestFixes(issues: ExportIssue[]): Promise<FixSuggestion[]>;
  validateFixes(fixes: FixSuggestion[]): Promise<ValidationResult[]>;
}
```

- 为检测到的问题生成修复建议
- 验证修复的有效性
- 提供多种修复策略

#### 4. DiagnosticEngine (诊断引擎)

```typescript
class DiagnosticEngine {
  diagnose(options: ScanOptions): Promise<DiagnosticReport>;
}
```

- 协调整个诊断流程
- 整合各个组件的功能
- 生成完整的诊断报告

### 集成组件

#### 5. ESLintIntegration (ESLint集成)

```typescript
class ESLintIntegration {
  analyzeFile(filePath: string): Promise<ESLintResult>;
  fixFile(filePath: string): Promise<boolean>;
}
```

- 与ESLint工具集成
- 扩展导出相关的linting规则
- 支持自动修复

#### 6. TypeScriptIntegration (TypeScript集成)

```typescript
class TypeScriptIntegration {
  analyzeFile(filePath: string): Promise<TypeScriptAnalysisResult>;
}
```

- 利用TypeScript编译器API
- 提供深度代码分析
- 支持类型检查和符号解析

#### 7. CacheManager (缓存管理器)

```typescript
class CacheManager {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, data: T): Promise<void>;
}
```

- 管理扫描结果缓存
- 支持内存和磁盘缓存
- 提供缓存过期和清理功能

## 使用方法

### 命令行工具

```bash
# 基本诊断
npx export-diagnosis diagnose /path/to/project

# 指定配置文件
npx export-diagnosis diagnose --config ./export-diagnosis.config.js /path/to/project

# 生成HTML报告
npx export-diagnosis diagnose --format html --output report.html /path/to/project

# 自动修复问题
npx export-diagnosis fix /path/to/project

# 显示帮助
npx export-diagnosis --help
```

### 编程接口

```typescript
import { DiagnosticEngine, exportAnalyzer } from '@wendeal/export-diagnosis';

// 创建诊断引擎
const engine = new DiagnosticEngine({
  filePatterns: ['**/*.{ts,tsx}'],
  ignorePatterns: ['**/node_modules/**'],
  enableCache: true,
});

// 执行诊断
const report = await engine.diagnose({
  rootDir: '/path/to/project',
  recursive: true,
  concurrency: 4,
});

console.log(`发现 ${report.issues.length} 个问题`);
console.log(`修复建议: ${report.suggestions.length} 个`);
```

### 配置选项

```javascript
// export-diagnosis.config.js
module.exports = {
  // 文件模式
  filePatterns: ['**/*.{ts,tsx,js,jsx}'],

  // 忽略模式
  ignorePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/*.test.{ts,tsx,js,jsx}',
    '**/*.spec.{ts,tsx,js,jsx}',
    '**/*.d.ts',
  ],

  // 扫描深度
  maxDepth: 10,

  // 超时时间
  timeout: 30000,

  // 缓存设置
  enableCache: true,
  cacheExpiry: 5 * 60 * 1000, // 5分钟

  // 严重程度阈值
  severityThreshold: 'info',

  // TypeScript配置
  typescriptConfig: {
    strict: false,
    checkTypeExports: true,
    target: 'ES2020',
  },

  // ESLint配置
  eslintConfig: {
    enabled: true,
    configFile: '.eslintrc.js',
  },

  // 输出配置
  output: {
    format: 'json',
    file: 'export-diagnosis-report.json',
    verbose: false,
  },
};
```

## 问题类型

### 1. 未使用导出 (UNUSED_EXPORT)

**描述**: 导出声明存在但未被任何文件引用
**严重程度**: 警告
**修复建议**:

- 移除未使用的导出
- 检查是否需要保留以备将来使用

### 2. 缺失导出 (MISSING_EXPORT)

**描述**: 代码中引用了不存在的导出
**严重程度**: 错误
**修复建议**:

- 添加缺失的导出声明
- 检查导入路径是否正确

### 3. 导出不一致 (EXPORT_INCONSISTENCY)

**描述**: 导出声明存在命名或类型冲突
**严重程度**: 警告
**修复建议**:

- 重命名冲突的导出
- 统一导出类型

### 4. 循环依赖 (CIRCULAR_DEPENDENCY)

**描述**: 模块间存在循环引用
**严重程度**: 错误
**修复建议**:

- 重构模块结构
- 使用依赖注入模式

### 5. 类型导出问题 (TYPE_EXPORT_ISSUE)

**描述**: TypeScript类型导出不符合最佳实践
**严重程度**: 警告
**修复建议**:

- 使用命名导出替代默认导出
- 确保类型定义的一致性

### 6. 默认导出冲突 (DEFAULT_EXPORT_CONFLICT)

**描述**: 文件中存在多个默认导出
**严重程度**: 错误
**修复建议**:

- 保留一个默认导出
- 将其他导出改为命名导出

## 输出格式

### JSON格式

```json
{
  "summary": {
    "totalFiles": 150,
    "scannedFiles": 145,
    "totalExports": 1200,
    "issuesFound": 25,
    "autoFixable": 15
  },
  "issues": [
    {
      "id": "unused-export-src-utils-ts",
      "type": "UNUSED_EXPORT",
      "severity": "WARNING",
      "description": "导出 'helperFunction' 未被使用",
      "location": {
        "filePath": "src/utils.ts",
        "line": 15,
        "column": 0,
        "codeSnippet": "export const helperFunction = () => {};"
      },
      "suggestions": [
        {
          "id": "remove-unused-export",
          "title": "移除未使用的导出",
          "description": "删除未使用的导出声明以减少代码体积",
          "fixType": "AUTO_FIX",
          "confidence": 0.9,
          "codeSnippet": "",
          "affectedFiles": ["src/utils.ts"]
        }
      ]
    }
  ],
  "suggestions": [...],
  "performance": {
    "scanTime": 1250,
    "analysisTime": 350,
    "totalTime": 1600
  }
}
```

### HTML格式

生成交互式的HTML报告，包含：

- 问题概览和统计图表
- 按文件分组的问题列表
- 修复建议详情
- 代码片段高亮显示
- 导出关系图

### 文本格式

简洁的文本输出，适合命令行查看：

```
Export Error Diagnosis Report
============================

Summary:
- Total files: 150
- Scanned files: 145
- Total exports: 1,200
- Issues found: 25
- Auto-fixable: 15

Issues by severity:
- ERROR: 5
- WARNING: 20

Top issues:
1. src/utils.ts:15 - Unused export 'helperFunction'
2. src/components/Button.tsx:22 - Missing export 'ButtonProps'
...
```

## 性能优化

### 缓存策略

- **文件级缓存**: 基于文件修改时间缓存解析结果
- **内存缓存**: LRU策略管理内存使用
- **增量扫描**: 只重新扫描修改过的文件

### 并发处理

- **工作池**: 限制并发文件处理数量
- **分块处理**: 将大批量文件分成小块处理
- **资源限制**: 自动调整并发度以适应系统资源

### 内存管理

- **流式处理**: 对大文件使用流式解析
- **垃圾回收**: 主动清理临时数据结构
- **限制检查**: 防止内存使用过度

## 扩展和定制

### 自定义规则

```typescript
import { ExportIssueType, IssueSeverity } from '@wendeal/export-diagnosis';

class CustomExportRule {
  check(exportInfo: ExportInfo, allExports: ExportInfo[]): ExportIssue | null {
    // 自定义检查逻辑
    if (exportInfo.name.startsWith('_')) {
      return {
        id: `private-export-${exportInfo.name}`,
        type: ExportIssueType.EXPORT_INCONSISTENCY,
        severity: IssueSeverity.INFO,
        description: `私有导出 '${exportInfo.name}' 应该使用不同的命名约定`,
        location: exportInfo.location,
        suggestions: [...],
        detectedAt: new Date(),
      };
    }
    return null;
  }
}
```

### 插件系统

```typescript
interface ExportDiagnosisPlugin {
  name: string;
  version: string;

  // 扫描阶段钩子
  onScanStart?(options: ScanOptions): void;
  onFileScanned?(filePath: string, exports: ExportInfo[]): void;
  onScanComplete?(allExports: ExportInfo[]): void;

  // 分析阶段钩子
  onAnalysisStart?(exports: ExportInfo[]): void;
  onIssueFound?(issue: ExportIssue): void;
  onAnalysisComplete?(issues: ExportIssue[]): void;

  // 修复阶段钩子
  onFixStart?(fixes: FixSuggestion[]): void;
  onFixApplied?(fix: FixSuggestion, success: boolean): void;
  onFixComplete?(results: ValidationResult[]): void;
}
```

## 故障排除

### 常见问题

#### 1. 扫描速度慢

**原因**: 大型项目文件过多
**解决**:

- 增加忽略模式
- 调整并发数量
- 启用缓存

#### 2. 内存不足

**原因**: 处理大型代码库
**解决**:

- 减少并发数量
- 增加内存限制
- 使用流式处理

#### 3. 误报问题

**原因**: 动态导入或条件导出
**解决**:

- 调整规则配置
- 添加忽略注释
- 使用自定义规则

#### 4. 缓存问题

**原因**: 缓存文件损坏或过期
**解决**:

- 清除缓存目录
- 重新运行诊断
- 检查缓存配置

### 调试模式

启用详细日志：

```bash
DEBUG=export-diagnosis:* npx export-diagnosis diagnose /path/to/project
```

查看缓存状态：

```bash
npx export-diagnosis cache info
```

验证配置：

```bash
npx export-diagnosis config validate
```

## 贡献指南

### 开发环境设置

```bash
# 克隆仓库
git clone https://github.com/wendeal/export-diagnosis.git
cd export-diagnosis

# 安装依赖
npm install

# 运行测试
npm test

# 构建项目
npm run build
```

### 代码规范

- 使用TypeScript编写所有代码
- 遵循ESLint配置的代码风格
- 为所有公共API编写测试
- 保持向后兼容性

### 提交规范

- 使用约定式提交格式
- 为重大更改更新文档
- 确保所有测试通过

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 支持

- 📖 [文档](https://export-diagnosis.wendeal.dev)
- 🐛 [问题跟踪](https://github.com/wendeal/export-diagnosis/issues)
- 💬 [讨论区](https://github.com/wendeal/export-diagnosis/discussions)
- 📧 [邮件支持](mailto:support@wendeal.dev)
