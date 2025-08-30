# Wendeal Dashboard

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
