# Wendeal Dashboard - 统一测试策略和规范

## 概述

### 目的
建立统一的测试策略，确保代码质量、提高开发效率、降低生产环境风险。

### 适用范围
- 所有前端代码（React 组件、Hooks、工具函数）
- 服务层代码（API 服务、业务逻辑）
- 工具函数和辅助类
- 集成测试和端到端测试

### 测试原则
1. **测试驱动开发 (TDD)** - 先写测试，再写代码
2. **行为驱动测试** - 测试行为而非实现细节
3. **测试即文档** - 测试用例作为代码使用说明
4. **持续集成** - 每次提交都运行测试

## 测试分类

### 1. 单元测试 (Unit Tests)
**目标**: 验证单个函数、组件或类的正确性
**范围**: 纯函数、工具类、自定义 Hooks、单个组件
**工具**: Jest + React Testing Library

#### 测试标准
- **覆盖率目标**: 每个文件 ≥ 80%
- **断言数量**: 每个测试函数 1-3 个断言
- **测试命名**: `should [expected behavior] when [condition]`

#### 示例
```typescript
describe('formatCurrency', () => {
  it('should format number as currency with default locale', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('should handle negative numbers', () => {
    expect(formatCurrency(-500)).toBe('-$500.00');
  });

  it('should use custom locale when provided', () => {
    expect(formatCurrency(1234.56, 'zh-CN')).toBe('¥1,234.56');
  });
});
```

### 2. 集成测试 (Integration Tests)
**目标**: 验证组件间、模块间的交互
**范围**: 组件组合、API 调用、状态管理
**工具**: Jest + React Testing Library + MSW

#### 测试标准
- **覆盖主要用户流程**
- **模拟外部依赖** (API、第三方服务)
- **验证副作用** (状态更新、事件触发)

#### 示例
```typescript
describe('InvoiceOCR Integration', () => {
  it('should complete full upload and processing flow', async () => {
    render(<InvoiceOCRPage />);

    // 模拟用户操作
    const file = createMockFile('invoice.pdf');
    const uploadInput = screen.getByTestId('file-upload');

    await userEvent.upload(uploadInput, file);

    // 验证结果
    await waitFor(() => {
      expect(screen.getByText('Processing completed')).toBeInTheDocument();
    });
  });
});
```

### 3. 端到端测试 (E2E Tests)
**目标**: 验证完整用户体验
**范围**: 关键用户旅程、复杂交互流程
**工具**: Playwright 或 Cypress

#### 测试标准
- **覆盖核心功能**: 登录、数据上传、报表生成
- **跨浏览器测试**: Chrome、Firefox、Safari
- **响应式测试**: 桌面、平板、手机

### 4. 性能测试 (Performance Tests)
**目标**: 确保应用性能达标
**范围**: 加载时间、内存使用、渲染性能
**工具**: Lighthouse、Web Vitals

## 测试文件组织

### 目录结构
```
src/
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx
│   │   └── __tests__/
│   │       └── Button.integration.test.tsx
│   └── __tests__/
│       └── components.test.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useAuth.test.ts
│   └── __tests__/
│       └── useAuth.integration.test.ts
├── services/
│   ├── api.ts
│   ├── api.test.ts
│   └── __tests__/
│       ├── api.integration.test.ts
│       └── api.e2e.test.ts
├── utils/
│   ├── formatters.ts
│   ├── formatters.test.ts
│   └── __tests__/
│       └── formatters.performance.test.ts
└── __tests__/
    ├── setup/
    │   ├── test-utils.tsx
    │   ├── mocks/
    │   └── constants.ts
    ├── integration/
    ├── e2e/
    └── performance/
```

### 文件命名规范
- **单元测试**: `[ComponentName].test.tsx`
- **集成测试**: `[ComponentName].integration.test.tsx`
- **E2E测试**: `[FeatureName].e2e.test.ts`
- **性能测试**: `[ComponentName].performance.test.ts`
- **工具文件**: `test-utils.tsx`, `mocks/`

## 测试工具和配置

### Jest 配置
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup/test-utils.tsx'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.{ts,tsx}',
    '<rootDir>/src/**/*.test.{ts,tsx}',
  ],
};
```

### 测试工具类
```typescript
// src/__tests__/setup/test-utils.tsx
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';
import rootReducer from '../../store';

// Mock implementations
export const mockUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
};

export const mockWorkflow = {
  id: 'workflow-1',
  name: 'Test Workflow',
  status: 'active',
};

// Store factory
export const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: rootReducer,
    preloadedState: initialState,
  });
};

// Custom render function
export const renderWithProviders = (
  ui: ReactElement,
  options: RenderOptions & { initialState?: any } = {}
) => {
  const { initialState, ...renderOptions } = options;

  const store = createTestStore(initialState);

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Provider store={store}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </Provider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Custom assertions
export const assertions = {
  shouldBeVisible: (element: HTMLElement) => {
    expect(element).toBeVisible();
    return element;
  },

  shouldHaveTextContent: (element: HTMLElement, text: string) => {
    expect(element).toHaveTextContent(text);
    return element;
  },

  shouldBeDisabled: (element: HTMLElement) => {
    expect(element).toBeDisabled();
    return element;
  },
};

// Mock file creator
export const createMockFile = (
  name: string,
  size: number = 1024,
  type: string = 'application/pdf'
): File => {
  const file = new File(['mock content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

// Async utilities
export const waitForLoadingToFinish = async () => {
  await waitFor(() => {
    expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
  });
};

export const waitForError = async (errorMessage?: string) => {
  await waitFor(() => {
    const errorElement = screen.getByRole('alert');
    if (errorMessage) {
      expect(errorElement).toHaveTextContent(errorMessage);
    }
    expect(errorElement).toBeInTheDocument();
  });
};
```

## 测试编写规范

### 1. 测试结构
```typescript
describe('ComponentName', () => {
  describe('when [condition]', () => {
    it('should [expected behavior]', async () => {
      // Arrange
      const mockData = createMockData();
      render(<Component data={mockData} />);

      // Act
      await userEvent.click(screen.getByRole('button'));

      // Assert
      expect(screen.getByText('Expected result')).toBeInTheDocument();
    });
  });
});
```

### 2. Mock 策略
```typescript
// API Mock
jest.mock('../../services/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

// Custom Hook Mock
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

// Context Mock
const mockContextValue = { theme: 'light', toggleTheme: jest.fn() };
jest.mock('../../contexts/ThemeContext', () => ({
  ThemeContext: React.createContext(mockContextValue),
}));
```

### 3. 测试数据管理
```typescript
// Test data factory
export const createMockInvoice = (overrides = {}) => ({
  id: 'invoice-1',
  number: 'INV-001',
  amount: 1000,
  date: '2024-01-01',
  status: 'pending',
  ...overrides,
});

// Test scenarios
export const testScenarios = {
  validInvoice: createMockInvoice(),
  invalidInvoice: createMockInvoice({ amount: -100 }),
  largeInvoice: createMockInvoice({ amount: 1000000 }),
  overdueInvoice: createMockInvoice({
    date: '2023-01-01',
    status: 'overdue'
  }),
};
```

## 测试运行和报告

### 运行测试
```bash
# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 运行E2E测试
npm run test:e2e

# 生成覆盖率报告
npm run test:coverage

# 监听模式
npm run test:watch

# 运行特定测试文件
npm test -- Button.test.tsx

# 运行特定测试用例
npm test -- -t "should handle error states"
```

### CI/CD 集成
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

## 测试质量保证

### 代码审查清单
- [ ] 测试文件与源文件在同一目录
- [ ] 测试命名清晰描述测试内容
- [ ] 使用 describe/it 正确组织测试结构
- [ ] 每个测试只验证一个行为
- [ ] 使用有意义的断言消息
- [ ] Mock 外部依赖，不测试第三方代码
- [ ] 测试边界条件和错误情况
- [ ] 清理测试副作用 (cleanup)

### 覆盖率要求
- **语句覆盖率**: ≥ 80%
- **分支覆盖率**: ≥ 75%
- **函数覆盖率**: ≥ 85%
- **行覆盖率**: ≥ 80%

### 性能基准
- **单元测试执行时间**: < 5分钟
- **集成测试执行时间**: < 10分钟
- **E2E测试执行时间**: < 15分钟
- **测试文件大小**: < 500KB/文件

## 常见问题和解决方案

### 1. Async 测试
```typescript
// ❌ 错误的异步测试
it('should load data', () => {
  const { result } = renderHook(() => useData());
  expect(result.current.loading).toBe(true); // 立即断言，可能失败
});

// ✅ 正确的异步测试
it('should load data', async () => {
  const { result } = renderHook(() => useData());

  expect(result.current.loading).toBe(true);

  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });

  expect(result.current.data).toBeDefined();
});
```

### 2. Mock 清理
```typescript
// ❌ Mock 泄漏
describe('Component', () => {
  it('test 1', () => {
    api.get.mockResolvedValue({ data: 'test1' });
    // ...
  });

  it('test 2', () => {
    // api.get 仍然返回 test1 的值
    // ...
  });
});

// ✅ 正确的 Mock 清理
describe('Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('test 1', () => {
    api.get.mockResolvedValue({ data: 'test1' });
    // ...
  });

  it('test 2', () => {
    api.get.mockResolvedValue({ data: 'test2' });
    // ...
  });
});
```

### 3. 组件测试
```typescript
// ❌ 测试实现细节
it('should call useState with correct initial value', () => {
  render(<Counter />);
  // 直接测试内部 state，脆弱
});

// ✅ 测试行为
it('should increment counter when button is clicked', async () => {
  render(<Counter />);
  const button = screen.getByRole('button', { name: /increment/i });
  const display = screen.getByTestId('counter-display');

  await userEvent.click(button);

  expect(display).toHaveTextContent('1');
});
```

## 工具和资源

### 推荐工具
- **Jest**: JavaScript 测试框架
- **React Testing Library**: React 组件测试
- **MSW**: API Mock 工具
- **Testing Library User Event**: 用户交互模拟
- **Jest DOM**: DOM 断言扩展

### 学习资源
- [Jest 官方文档](https://jestjs.io/docs/getting-started)
- [React Testing Library 文档](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing JavaScript](https://testingjavascript.com/)
- [Kent C. Dodds 博客](https://kentcdodds.com/blog/)

## 维护和更新

### 定期审查
- **每月**: 审查测试覆盖率报告
- **每季度**: 更新测试策略文档
- **每半年**: 升级测试工具和依赖

### 测试重构
- 删除不再需要的测试
- 更新过时的测试用例
- 重构重复的测试代码
- 优化慢速测试

---

*文档版本: 1.0*
*最后更新: 2024年9月7日*
*维护责任: 测试团队*
