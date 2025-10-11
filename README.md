# 🚀 Wendeal Dashboard

## 版本与发布

- 版本策略：遵循语义化版本（SemVer），采用 `MAJOR.MINOR.PATCH`
- 提交规范：遵循 Conventional Commits（如 `feat(docmost): ...`）
- 升级命令：`npm version <patch|minor|major> -m "release: v%s – <概要>"`
- 推送步骤：`git push origin master && git push origin --tags`
- 标签与发布：使用 GitHub Releases，对应标签如 `v0.1.0`
- 变更日志：详见 `CHANGELOG.md`

本次发布（v0.1.0）概要：

- 将 Docmost iframe 切换到 `https://docmost.wendealai.com.au`
- 更新全局 CSP 与客户端安全头，允许 `.com.au` 域名嵌入与表单提交
- 扩展 iframe sandbox，允许顶层导航与存储访问的用户激活

注意事项：建议通过同站域（如 `dashboard.wendealai.com` 与 `docmost.wendealai.com.au`）部署，避免第三方 Cookie 被阻止导致登录会话无法建立；确保服务端 CSP 已应用最新域名策略。

> 一个现代化的企业级React应用，支持信息仪表板、发票OCR、Reddit内容聚合和商业机会发现等功能。

## 📋 快速开始

### 🎯 一键启动（推荐）

#### 方法1：完整启动脚本

双击运行项目根目录的 `start-project.bat` 文件

**自动执行：**

- ✅ 环境检查（Node.js、npm）
- ✅ 依赖安装
- ✅ 端口检查
- ✅ 启动开发服务器

#### 方法2：桌面快捷方式

运行 `create-desktop-shortcut.bat` 创建桌面快捷方式，然后双击桌面图标启动

#### 方法3：快速启动

双击运行 `quick-start.bat` 文件（适用于依赖已安装的情况）

### 🔧 手动启动

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 🌐 访问地址

- **本地**: http://localhost:5173/
- **网络**: http://192.168.31.222:5173/

## 📁 项目结构

一个基于 React + TypeScript + Vite 构建的现代化管理仪表板应用。

## 🚀 特性

- ⚡️ **快速开发**: 基于 Vite 的快速热重载
- 🎯 **TypeScript**: 完整的类型安全支持
- 🎨 **Ant Design**: 企业级 UI 设计语言
- 📱 **响应式设计**: 支持多种设备尺寸
- 🔄 **状态管理**: 使用 Redux Toolkit 进行状态管理
- 🧪 **测试覆盖**: 完整的单元测试和集成测试
- 🌙 **主题切换**: 支持明暗主题切换
- 🔐 **路由保护**: 基于权限的路由访问控制
- 📄 **Invoice OCR**: 智能发票识别和数据提取功能

## 📦 技术栈

- **前端框架**: React 18
- **开发语言**: TypeScript
- **构建工具**: Vite
- **UI 组件库**: Ant Design
- **状态管理**: Redux Toolkit
- **路由管理**: React Router
- **测试框架**: Jest + React Testing Library
- **代码规范**: ESLint + Prettier

## 🛠️ 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 7.0.0 或 yarn >= 1.22.0

### 安装依赖

```bash
npm install
# 或
yarn install
```

### 启动开发服务器

```bash
npm run dev
# 或
yarn dev
```

应用将在 http://localhost:5173 启动

### 🔍 核心功能

#### Invoice OCR 发票识别

智能发票处理功能，支持多种格式文件的上传和自动数据提取：

- **多格式支持**: PDF、JPG、JPEG、PNG、TIFF文件格式
- **智能识别**: 自动提取发票号码、金额、供应商信息等关键数据
- **批量处理**: 支持同时处理多个发票文件
- **实时进度**: 提供处理进度跟踪和状态反馈
- **数据导出**: 支持导出到Google Sheets进行数据分析
- **错误处理**: 完善的错误处理和重试机制

详细使用说明请参考：[Invoice OCR 文档](docs/INVOICE_OCR.md)

### 构建生产版本

```bash
npm run build
# 或
yarn build
```

### 运行测试

```bash
# 运行所有测试
npm test
# 或
yarn test

# 运行测试并生成覆盖率报告
npm run test:coverage
# 或
yarn test:coverage
```

### 代码检查

```bash
# ESLint 检查
npm run lint
# 或
yarn lint

# 自动修复 ESLint 问题
npm run lint:fix
# 或
yarn lint:fix
```

## 📁 项目结构

```
src/
├── components/          # 可复用组件
│   ├── common/         # 通用组件
│   │   ├── Button/     # 按钮组件
│   │   ├── Modal/      # 模态框组件
│   │   └── __tests__/  # 组件测试
│   └── Layout/         # 布局组件
├── pages/              # 页面组件
│   ├── Home/          # 首页
│   ├── Dashboard/     # 仪表板
│   └── __tests__/     # 页面测试
├── store/              # Redux 状态管理
│   ├── slices/        # Redux 切片
│   └── index.ts       # Store 配置
├── services/           # API 服务
├── router/             # 路由配置
├── styles/             # 样式文件
├── utils/              # 工具函数
├── __tests__/          # 集成测试
└── types/              # TypeScript 类型定义
```

## 🧪 测试

项目包含完整的测试覆盖：

- **单元测试**: 组件和工具函数的单元测试
- **集成测试**: 用户交互和状态管理的集成测试
- **测试覆盖率**: 目标覆盖率 70%+

### 测试命令

```bash
# 运行所有测试
npm test

# 监听模式运行测试
npm run test:watch

# 生成测试覆盖率报告
npm run test:coverage

# 运行特定测试文件
npx jest src/components/common/__tests__/Button.test.tsx
```

## 🎨 主题和样式

- 支持明暗主题切换
- 使用 Ant Design 设计系统
- 响应式布局设计
- CSS-in-JS 样式方案

## 📱 功能模块

### 仪表板

- 数据统计展示
- 图表可视化
- 实时数据更新

### 用户管理

- 用户认证
- 权限控制
- 个人资料管理

### 系统设置

- 主题切换
- 语言设置
- 系统配置

## 🔧 开发指南

### 代码规范

- 使用 TypeScript 进行类型检查
- 遵循 ESLint 代码规范
- 使用 Prettier 进行代码格式化
- 组件使用函数式组件 + Hooks

### 导出/导入最佳实践

#### 模块导出规范

**推荐的导出方式：**

```typescript
// ✅ 推荐：命名导出
export const MyComponent: React.FC = () => {
  return <div>My Component</div>;
};

export const utils = {
  formatDate,
  validateEmail,
};

// ✅ 推荐：接口和类型导出
export interface UserData {
  id: string;
  name: string;
  email: string;
}

export type UserRole = 'admin' | 'user' | 'guest';
```

**避免的导出方式：**

```typescript
// ❌ 避免：混合默认导出和命名导出
export default MyComponent;
export const utils = { ... }; // 容易造成导入混乱

// ❌ 避免：导出未命名的函数
export default function() { ... }

// ❌ 避免：重复导出
export { MyComponent };
export { MyComponent as Component }; // 重复导出
```

#### 导入规范

```typescript
// ✅ 推荐：明确的命名导入
import { MyComponent, UserData } from './components/MyComponent';
import { formatDate, validateEmail } from './utils';

// ✅ 推荐：类型导入
import type { UserRole } from './types';

// ✅ 推荐：别名导入（避免命名冲突）
import { Button as AntButton } from 'antd';
import { Button as CustomButton } from './components/Button';
```

#### 索引文件（index.ts）规范

```typescript
// ✅ 推荐：清晰的重新导出
export { MyComponent } from './MyComponent';
export { AnotherComponent } from './AnotherComponent';
export type { UserData, UserRole } from './types';

// ✅ 推荐：分组导出
// 组件导出
export { Button } from './Button';
export { Modal } from './Modal';
export { Form } from './Form';

// 工具函数导出
export { formatDate, validateEmail } from './utils';

// 类型导出
export type { ComponentProps, FormData } from './types';
```

### 常见导出错误及解决方案

#### 1. 循环依赖错误

**错误示例：**

```typescript
// fileA.ts
import { functionB } from './fileB';
export const functionA = () => functionB();

// fileB.ts
import { functionA } from './fileA'; // 循环依赖
export const functionB = () => functionA();
```

**解决方案：**

```typescript
// 创建共享模块 shared.ts
export const sharedFunction = () => { ... };

// fileA.ts
import { sharedFunction } from './shared';
export const functionA = () => sharedFunction();

// fileB.ts
import { sharedFunction } from './shared';
export const functionB = () => sharedFunction();
```

#### 2. 类型导入错误

**错误示例：**

```typescript
// ❌ 运行时导入类型
import { UserData } from './types'; // 如果 UserData 只是类型
const user: UserData = { ... };
```

**解决方案：**

```typescript
// ✅ 使用 type 关键字
import type { UserData } from './types';
const user: UserData = { ... };
```

#### 3. 默认导出不一致

**错误示例：**

```typescript
// component.ts
const MyComponent = () => <div>Hello</div>;
export default MyComponent;

// index.ts
export { default as MyComponent } from './component'; // 不一致的导出
```

**解决方案：**

```typescript
// component.ts
export const MyComponent = () => <div>Hello</div>;

// index.ts
export { MyComponent } from './component'; // 一致的命名导出
```

#### 4. 未导出的依赖

**错误示例：**

```typescript
// utils.ts
const helperFunction = () => { ... }; // 未导出
export const mainFunction = () => helperFunction();

// 其他文件尝试使用
import { helperFunction } from './utils'; // 错误：未导出
```

**解决方案：**

```typescript
// utils.ts
export const helperFunction = () => { ... }; // 导出需要的函数
export const mainFunction = () => helperFunction();
```

#### 5. 路径解析错误

**错误示例：**

```typescript
// ❌ 相对路径错误
import { Component } from '../../../components/Component';
```

**解决方案：**

```typescript
// ✅ 使用路径别名（在 vite.config.ts 中配置）
import { Component } from '@/components/Component';

// vite.config.ts
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### 导出一致性检查工具

项目包含自动化的导出一致性检查工具，位于 `src/utils/` 目录：

- **exportDetector.ts**: 检测文件中的导出声明
- **consistencyAnalyzer.ts**: 分析项目导出一致性
- **autoFixer.ts**: 自动修复常见导出问题
- **reportGenerator.ts**: 生成导出分析报告

**使用方法：**

```typescript
import { analyzeProjectConsistency } from '@/utils/consistencyAnalyzer';
import { generateConsoleReport } from '@/utils/reportGenerator';

// 分析项目导出一致性
const issues = await analyzeProjectConsistency('./src');

// 生成报告
generateConsoleReport(issues);
```

### 提交规范

```bash
# 功能开发
git commit -m "feat: 添加用户管理功能"

# 问题修复
git commit -m "fix: 修复登录状态异常"

# 文档更新
git commit -m "docs: 更新 README 文档"

# 测试相关
git commit -m "test: 添加组件单元测试"
```

## 🚀 部署

### 构建优化

- 代码分割和懒加载
- 静态资源压缩
- Tree Shaking 优化
- 缓存策略配置

### 部署环境

- 开发环境: `npm run dev`
- 测试环境: `npm run build:test`
- 生产环境: `npm run build`

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request
