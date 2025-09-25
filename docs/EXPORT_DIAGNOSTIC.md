# 导出错误诊断系统文档

## 概述

导出错误诊断系统是一个强大的工具，用于分析TypeScript/JavaScript项目中的导出声明问题。它可以检测未使用的导出、缺失的导入、循环依赖等问题，并提供智能的修复建议。

## 主要功能

### 🔍 问题检测

- **未使用导出检测**: 识别项目中未被使用的导出声明
- **缺失导入检测**: 发现代码中引用但未导入的导出
- **循环依赖检测**: 识别模块间的循环依赖关系
- **类型导出验证**: 检查TypeScript类型导出的正确性

### 🛠️ 智能修复

- **自动修复建议**: 提供具体的代码修改方案
- **置信度评估**: 为每个建议提供可靠性评分
- **多方案选择**: 提供多种修复选项
- **影响分析**: 显示修复对其他文件的影响

### 📊 深度分析

- **依赖图构建**: 可视化模块间的依赖关系
- **使用率统计**: 提供导出使用率的详细统计
- **性能监控**: 监控扫描性能和资源使用
- **历史追踪**: 记录诊断结果的变化趋势

## 安装和使用

### 命令行工具

#### 全局安装

```bash
npm install -g export-diagnostic
```

#### 本地安装

```bash
npm install --save-dev export-diagnostic
```

#### 基本使用

```bash
# 扫描当前目录
export-diagnostic scan

# 扫描指定目录
export-diagnostic scan ./src

# 生成HTML报告
export-diagnostic scan --format html --output report.html

# 显示详细输出
export-diagnostic scan --verbose

# 自动修复问题
export-diagnostic scan --fix
```

### 编程式使用

```typescript
import { DiagnosticService } from 'export-diagnostic';

const service = new DiagnosticService({
  filePatterns: ['**/*.{ts,tsx}'],
  ignorePatterns: ['**/node_modules/**'],
  enableCache: true,
});

const report = await service.diagnose({
  rootDir: './src',
  recursive: true,
  onProgress: progress => {
    console.log(`处理进度: ${progress.processedFiles}/${progress.totalFiles}`);
  },
});

console.log(`发现 ${report.issuesFound} 个问题`);
```

## 配置选项

### 扫描配置

```typescript
interface DiagnosticConfig {
  // 文件模式
  filePatterns: string[];

  // 忽略模式
  ignorePatterns: string[];

  // 扫描深度
  maxDepth?: number;

  // 超时时间
  timeout?: number;

  // 并发数
  concurrency?: number;

  // 缓存设置
  enableCache: boolean;
  cacheExpiry: number;

  // 严重程度阈值
  severityThreshold: 'error' | 'warning' | 'info' | 'hint';

  // TypeScript配置
  typescriptConfig?: {
    strict: boolean;
    checkTypeExports: boolean;
    target: string;
  };

  // ESLint配置
  eslintConfig?: {
    enabled: boolean;
    configFile?: string;
  };

  // 输出配置
  output?: {
    format: 'json' | 'text' | 'html' | 'console';
    file?: string;
    verbose?: boolean;
  };
}
```

### 环境配置

#### 开发环境

```javascript
// export-diagnostic.config.js
module.exports = {
  enableCache: false,
  output: {
    format: 'console',
    verbose: true,
  },
  typescriptConfig: {
    strict: false,
  },
};
```

#### 生产环境

```javascript
module.exports = {
  enableCache: true,
  cacheExpiry: 30 * 60 * 1000, // 30分钟
  output: {
    format: 'json',
    file: 'diagnostic-report.json',
  },
  concurrency: 4,
};
```

## 输出格式

### JSON格式

```json
{
  "id": "scan-2024-01-01",
  "scanTime": "2024-01-01T00:00:00.000Z",
  "duration": 1500,
  "filesScanned": 25,
  "issuesFound": 5,
  "issues": [
    {
      "id": "unused-export-1",
      "type": "unused_export",
      "severity": "warning",
      "description": "未使用的导出: calculateTotal",
      "location": {
        "filePath": "src/utils/math.ts",
        "line": 15,
        "column": 1,
        "codeSnippet": "export function calculateTotal(items: number[]): number {"
      },
      "suggestions": [
        {
          "id": "remove-unused-export",
          "title": "移除未使用的导出",
          "description": "删除未使用的calculateTotal函数",
          "fixType": "auto_fix",
          "confidence": 0.95,
          "affectedFiles": ["src/utils/math.ts"]
        }
      ]
    }
  ],
  "summary": {
    "totalExports": 45,
    "usedExports": 40,
    "unusedExports": 5,
    "exportUsageRate": 0.89
  }
}
```

### HTML格式

生成包含交互式图表的HTML报告，包含：

- 问题概览仪表板
- 按类型和严重程度分组的问题列表
- 依赖关系图
- 性能统计图表

### 文本格式

简洁的文本报告，适合命令行查看和日志记录。

## 问题类型

### 未使用导出 (unused_export)

**描述**: 检测到项目中声明但从未使用的导出。

**示例**:

```typescript
// utils.ts
export function unusedFunction() {
  // 未使用
  return 'never called';
}

export const USED_CONSTANT = 'used'; // 已使用
```

**修复建议**:

- 移除未使用的导出
- 检查是否是重构后的遗留代码
- 考虑是否需要保留以备将来使用

### 缺失导入 (missing_export)

**描述**: 代码中导入了但目标模块中不存在的导出。

**示例**:

```typescript
// main.ts
import { nonExistentFunction } from './utils'; // utils.ts中不存在此导出
```

**修复建议**:

- 检查导入名称是否正确
- 确认目标模块是否正确
- 检查是否需要添加导出声明

### 循环依赖 (circular_dependency)

**描述**: 检测到模块间的循环依赖关系。

**示例**:

```
A.ts -> B.ts -> C.ts -> A.ts
```

**修复建议**:

- 重构代码结构打破循环
- 提取共同依赖到单独模块
- 使用依赖注入模式

### 类型导出问题 (type_export_issue)

**描述**: TypeScript类型导出的相关问题。

**示例**:

```typescript
// 错误：类型导出未使用
export type UnusedType = string;

// 正确：接口导出
export interface User {
  id: number;
  name: string;
}
```

## 性能优化

### 缓存机制

- **文件变更检测**: 只重新分析修改过的文件
- **增量扫描**: 支持断点续传和增量更新
- **智能缓存失效**: 基于文件修改时间和依赖关系

### 并发处理

- **多线程扫描**: 利用多核CPU提高扫描速度
- **批处理优化**: 分批处理大量文件避免内存溢出
- **资源限制**: 控制并发数量和内存使用

### 内存管理

- **流式处理**: 对大文件使用流式处理
- **垃圾回收优化**: 及时清理临时数据
- **内存监控**: 实时监控内存使用情况

## 集成指南

### CI/CD集成

#### GitHub Actions

```yaml
name: Export Diagnostic
on: [push, pull_request]

jobs:
  diagnostic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npx export-diagnostic scan --format json --output diagnostic.json
      - uses: actions/upload-artifact@v2
        with:
          name: diagnostic-report
          path: diagnostic.json
```

#### Jenkins Pipeline

```groovy
pipeline {
    agent any
    stages {
        stage('Diagnostic') {
            steps {
                sh 'npm install'
                sh 'npx export-diagnostic scan --format junit --output diagnostic.xml'
                junit 'diagnostic.xml'
            }
        }
    }
}
```

### IDE集成

#### VS Code扩展

```json
{
  "contributes": {
    "commands": [
      {
        "command": "export-diagnostic.scan",
        "title": "运行导出诊断"
      }
    ],
    "menus": {
      "explorer/context": [
        {
          "command": "export-diagnostic.scan",
          "when": "explorerResourceIsFolder"
        }
      ]
    }
  }
}
```

## 最佳实践

### 项目配置

1. **根据项目规模调整配置**:
   - 小项目: 启用详细输出和自动修复
   - 大项目: 启用缓存和并发处理

2. **设置合适的忽略模式**:

   ```javascript
   ignorePatterns: [
     '**/node_modules/**',
     '**/dist/**',
     '**/*.test.*',
     '**/*.spec.*',
     '**/coverage/**',
   ];
   ```

3. **配置定期扫描**:
   - 在CI/CD中集成定期扫描
   - 设置问题阈值，超过则构建失败

### 代码质量

1. **定期清理未使用导出**:
   - 每周运行一次完整扫描
   - 移除确认未使用的导出

2. **监控依赖关系**:
   - 定期检查循环依赖
   - 维护清晰的模块结构

3. **类型安全**:
   - 启用TypeScript严格模式
   - 定期检查类型导出问题

## 故障排除

### 常见问题

#### 扫描速度慢

**原因**: 文件太多或并发设置不当
**解决**:

- 增加并发数: `--concurrency 8`
- 启用缓存: `--enable-cache`
- 限制扫描深度: `--max-depth 3`

#### 内存不足

**原因**: 大项目文件太多
**解决**:

- 减少并发数: `--concurrency 2`
- 增加内存限制
- 分批扫描子目录

#### 误报问题

**原因**: 动态导入或条件导出
**解决**:

- 使用`// export-diagnostic-ignore`注释
- 调整配置忽略特定模式
- 检查TypeScript配置

#### 缓存问题

**原因**: 缓存文件损坏或版本不匹配
**解决**:

- 清除缓存: `export-diagnostic cache --clear`
- 检查缓存目录权限
- 重新运行扫描

### 调试模式

启用详细日志:

```bash
export-diagnostic scan --verbose --log-level debug
```

查看性能统计:

```bash
export-diagnostic health
```

## API参考

### DiagnosticService

#### 方法

- `diagnose(options: ScanOptions): Promise<DiagnosticReport>`
- `getHistory(): Promise<DiagnosticReport[]>`
- `getConfig(): Promise<DiagnosticConfig>`
- `updateConfig(config: Partial<DiagnosticConfig>): Promise<void>`
- `clearCache(): Promise<void>`

#### 事件

- `onScanStarted`: 扫描开始
- `onScanProgress`: 扫描进度
- `onScanCompleted`: 扫描完成
- `onScanError`: 扫描错误

### 命令行选项

```
Usage: export-diagnostic [options] [command]

Options:
  -h, --help           显示帮助信息
  -v, --version        显示版本信息

Commands:
  scan [options] [dir]  扫描项目
  config [options]      配置管理
  cache [options]       缓存管理
  health                健康检查
  history [options]     历史记录
```

## 贡献指南

### 开发环境设置

```bash
git clone https://github.com/your-org/export-diagnostic.git
cd export-diagnostic
npm install
npm run build
npm test
```

### 代码规范

- 使用TypeScript编写
- 遵循ESLint配置
- 编写完整的单元测试
- 更新相关文档

### 提交规范

```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建过程或工具配置
```

## 许可证

MIT License - 详见LICENSE文件

## 支持

- 📖 [文档](https://export-diagnostic.dev)
- 🐛 [问题报告](https://github.com/your-org/export-diagnostic/issues)
- 💬 [讨论](https://github.com/your-org/export-diagnostic/discussions)
- 📧 [邮件支持](mailto:support@export-diagnostic.dev)
