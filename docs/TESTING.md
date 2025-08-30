# 测试指南

本文档详细介绍了 Wendeal Dashboard 项目的测试策略、最佳实践和使用指南。

## 📋 目录

- [测试策略](#测试策略)
- [测试环境配置](#测试环境配置)
- [单元测试](#单元测试)
- [集成测试](#集成测试)
- [测试最佳实践](#测试最佳实践)
- [常见问题](#常见问题)

## 🎯 测试策略

### 测试金字塔

我们遵循测试金字塔原则：

```
    /\     E2E Tests (少量)
   /  \
  /____\   Integration Tests (适量)
 /______\  Unit Tests (大量)
```

- **单元测试 (70%)**: 测试单个组件和函数
- **集成测试 (25%)**: 测试组件间交互和状态管理
- **端到端测试 (5%)**: 测试完整用户流程

### 覆盖率目标

- **整体覆盖率**: ≥ 70%
- **函数覆盖率**: ≥ 70%
- **分支覆盖率**: ≥ 70%
- **行覆盖率**: ≥ 70%

## ⚙️ 测试环境配置

### 技术栈

- **测试框架**: Jest
- **React 测试**: React Testing Library
- **模拟库**: Jest Mock Functions
- **测试环境**: jsdom

### 配置文件

#### jest.config.js

```javascript
export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

#### setupTests.ts

```typescript
import '@testing-library/jest-dom';

// 全局测试配置
global.matchMedia =
  global.matchMedia ||
  function (query) {
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    };
  };
```

## 🧪 单元测试

### 组件测试

#### 基本组件测试模板

```typescript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Button from '../Button';

// 自定义渲染函数
const customRender = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ConfigProvider locale={zhCN}>
        {ui}
      </ConfigProvider>
    </BrowserRouter>
  );
};

describe('Button Component', () => {
  test('renders button with text', () => {
    customRender(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  test('handles click events', () => {
    const handleClick = jest.fn();
    customRender(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('applies custom className', () => {
    customRender(<Button className="custom-btn">Button</Button>);
    expect(screen.getByRole('button')).toHaveClass('custom-btn');
  });
});
```

### 页面组件测试

```typescript
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Home from '../Home';
import userSlice from '../../store/slices/userSlice';

const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      user: userSlice
    },
    preloadedState: initialState
  });
};

const renderWithProviders = (component: React.ReactElement, store = createMockStore()) => {
  return render(
    <Provider store={store}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  );
};

describe('Home Page', () => {
  test('renders welcome message', () => {
    renderWithProviders(<Home />);
    expect(screen.getByText(/欢迎/i)).toBeInTheDocument();
  });
});
```

### 工具函数测试

```typescript
import { formatDate, validateEmail } from '../utils';

describe('Utility Functions', () => {
  describe('formatDate', () => {
    test('formats date correctly', () => {
      const date = new Date('2023-12-25');
      expect(formatDate(date)).toBe('2023-12-25');
    });

    test('handles invalid date', () => {
      expect(formatDate(null)).toBe('');
    });
  });

  describe('validateEmail', () => {
    test('validates correct email', () => {
      expect(validateEmail('test@example.com')).toBe(true);
    });

    test('rejects invalid email', () => {
      expect(validateEmail('invalid-email')).toBe(false);
    });
  });
});
```

## 🔗 集成测试

### Redux 状态管理测试

```typescript
import { configureStore } from '@reduxjs/toolkit';
import userSlice, { loginUser, logoutUser } from '../store/slices/userSlice';

describe('User Slice Integration', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        user: userSlice,
      },
    });
  });

  test('handles user login flow', async () => {
    const userData = { id: 1, username: 'testuser' };

    await store.dispatch(loginUser(userData));

    const state = store.getState();
    expect(state.user.currentUser).toEqual(userData);
    expect(state.user.isAuthenticated).toBe(true);
  });

  test('handles user logout flow', async () => {
    // 先登录
    await store.dispatch(loginUser({ id: 1, username: 'testuser' }));

    // 再登出
    await store.dispatch(logoutUser());

    const state = store.getState();
    expect(state.user.currentUser).toBeNull();
    expect(state.user.isAuthenticated).toBe(false);
  });
});
```

### 用户交互测试

```typescript
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';
import { createMockStore } from '../utils/testUtils';

describe('User Interaction Integration', () => {
  test('user can navigate between pages', async () => {
    const user = userEvent.setup();
    const store = createMockStore();

    render(
      <Provider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Provider>
    );

    // 点击导航链接
    await user.click(screen.getByRole('link', { name: /仪表板/i }));

    // 验证页面跳转
    await waitFor(() => {
      expect(screen.getByText(/仪表板/i)).toBeInTheDocument();
    });
  });
});
```

## 📝 测试最佳实践

### 1. 测试命名规范

```typescript
// ✅ 好的测试名称
test('should display error message when login fails');
test('renders user profile with correct information');
test('updates cart total when item quantity changes');

// ❌ 不好的测试名称
test('test login');
test('component works');
test('it should work');
```

### 2. 测试结构 (AAA 模式)

```typescript
test('should calculate total price correctly', () => {
  // Arrange - 准备测试数据
  const items = [
    { price: 10, quantity: 2 },
    { price: 15, quantity: 1 },
  ];

  // Act - 执行被测试的操作
  const total = calculateTotal(items);

  // Assert - 验证结果
  expect(total).toBe(35);
});
```

### 3. Mock 使用原则

```typescript
// ✅ Mock 外部依赖
jest.mock('../services/apiService', () => ({
  fetchUserData: jest.fn().mockResolvedValue({ id: 1, name: 'Test User' }),
}));

// ✅ Mock 复杂的第三方库
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// ❌ 避免过度 Mock
// 不要 Mock 被测试的组件本身
```

### 4. 异步测试

```typescript
// ✅ 使用 waitFor 等待异步操作
test('displays loading state then data', async () => {
  render(<DataComponent />);

  // 验证加载状态
  expect(screen.getByText(/loading/i)).toBeInTheDocument();

  // 等待数据加载完成
  await waitFor(() => {
    expect(screen.getByText(/data loaded/i)).toBeInTheDocument();
  });
});

// ✅ 使用 findBy 查询异步元素
test('shows success message after form submission', async () => {
  render(<ContactForm />);

  fireEvent.click(screen.getByRole('button', { name: /submit/i }));

  const successMessage = await screen.findByText(/message sent/i);
  expect(successMessage).toBeInTheDocument();
});
```

### 5. 测试数据管理

```typescript
// ✅ 使用工厂函数创建测试数据
const createMockUser = (overrides = {}) => ({
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  ...overrides,
});

// ✅ 使用 beforeEach 重置状态
describe('UserComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
});
```

## 🚀 运行测试

### 基本命令

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage

# 运行特定文件
npx jest Button.test.tsx

# 运行特定测试套件
npx jest --testNamePattern="Button Component"
```

### 调试测试

```bash
# 详细输出
npm test -- --verbose

# 只运行失败的测试
npm test -- --onlyFailures

# 更新快照
npm test -- --updateSnapshot
```

## ❓ 常见问题

### Q: 如何测试 Ant Design 组件？

A: 使用 `data-testid` 或角色查询：

```typescript
// 在组件中添加 data-testid
<Button data-testid="submit-button">提交</Button>

// 在测试中查询
const submitButton = screen.getByTestId('submit-button');
```

### Q: 如何测试路由跳转？

A: 使用 `MemoryRouter` 进行测试：

```typescript
import { MemoryRouter } from 'react-router-dom';

render(
  <MemoryRouter initialEntries={['/dashboard']}>
    <App />
  </MemoryRouter>
);
```

### Q: 如何测试 Redux 异步 action？

A: 使用 `redux-mock-store` 或真实的 store：

```typescript
import { waitFor } from '@testing-library/react';

test('handles async action', async () => {
  const store = createMockStore();

  store.dispatch(fetchUserData());

  await waitFor(() => {
    expect(store.getState().user.loading).toBe(false);
  });
});
```

### Q: 测试覆盖率不够怎么办？

A:

1. 检查未覆盖的代码分支
2. 添加边界条件测试
3. 测试错误处理逻辑
4. 确保所有组件 props 都有测试

## 📚 参考资源

- [React Testing Library 文档](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest 官方文档](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Ant Design 测试指南](https://ant.design/docs/react/getting-started#Test)
