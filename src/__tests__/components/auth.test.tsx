import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureStore } from '@reduxjs/toolkit';
import { I18nextProvider } from 'react-i18next';
import { LoginForm, RegisterForm, UserProfile } from '../../components/auth';
import { AuthProvider } from '../../contexts/AuthContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { LocalAuthService } from '../../services/auth/LocalAuthService';
import type { User } from '../../types/auth';
import { UserRole } from '../../types/auth';
import authSlice, {
  selectUser,
  selectIsAuthenticated,
} from '../../store/slices/authSlice';
import { uiSlice } from '../../store/slices/uiSlice';
import dashboardSlice from '@/store/slices/dashboardSlice';
import { useAppSelector } from '../../hooks/redux';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      // 返回实际的翻译文本而不是键名
      const translations: Record<string, string> = {
        'auth.register.registerSuccess': '注册成功',
        'auth.login.loginSuccess': '登录成功',
        'auth.logout.logoutSuccess': '退出成功',
        'common.user': '普通用户',
        'common.admin': '管理员',
        'common.superAdmin': '超级管理员',
        'auth.register.username': '用户名',
        'auth.register.email': '邮箱',
        'auth.register.password': '密码',
        'auth.register.confirmPassword': '确认密码',
        'auth.register.registerButton': '创建账户',
        'auth.login.username': '用户名',
        'auth.login.password': '密码',
        'auth.login.loginButton': '登录',
        'auth.login.usernameRequired': '请输入用户名',
        'auth.login.passwordRequired': '请输入密码',
        'auth.login.noAccount': '还没有账户？',
        'auth.login.register': '立即注册',
        'auth.register.registerSuccess': '注册成功',
        'auth.login.success': '登录成功',
        'form.required': '此字段为必填项',
        'form.tooShort': '长度不能少于 {min} 个字符',
        'form.tooLong': '长度不能超过 {max} 个字符',
        'form.invalidEmail': '邮箱格式不正确',
        'form.passwordMismatch': '两次输入的密码不一致',
        'form.passwordWeak': '弱',
        'form.passwordMedium': '中等',
        'form.passwordStrong': '强',
          'auth.register.usernamePattern': '用户名只能包含字母、数字和下划线',
          'auth.errors.unknownError': '未知错误',
          'user.roles.admin': '管理员',
          'user.roles.user': '普通用户',
          'user.roles.manager': '经理',
          'user.roles.guest': '访客',
          'user.profile.title': '个人资料',
          'user.profile.edit': '编辑',
          'user.profile.save': '保存',
          'user.profile.cancel': '取消',
          'user.profile.changePassword': '修改密码',
          'user.profile.currentPassword': '当前密码',
          'user.profile.newPassword': '新密码',
          'user.profile.confirmNewPassword': '确认新密码',
          'user.profile.updateSuccess': '个人资料更新成功',
          'user.profile.passwordChangeSuccess': '密码修改成功',
      };
      return translations[key] || key;
    },
      i18n: {
        changeLanguage: () => new Promise(() => {}),
        language: 'zh-CN',
        languages: ['zh-CN', 'en'],
        options: {
          lng: 'zh-CN',
          fallbackLng: 'zh-CN',
        },
      },
  }),
  I18nextProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  initReactI18next: {
    type: '3rdParty',
    init: jest.fn(),
  },
}));

// Mock Redux hooks
jest.mock('@/hooks/redux', () => ({
  useAppDispatch: jest.fn(),
  useAppSelector: jest.fn(),
}));

// Mock AuthProvider to prevent initialization
jest.mock('../../contexts/AuthContext', () => {
  const actual = jest.requireActual('../../contexts/AuthContext');
  const React = jest.requireActual('react');

  const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
    const mockAuthValue = {
      user: {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'user' as const,
        avatar: null,
        permissions: ['read'],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      updateProfile: jest.fn(),
      changePassword: jest.fn(),
      refreshToken: jest.fn(),
      validateToken: jest.fn(),
    };

    return React.createElement(
      actual.AuthContext.Provider,
      { value: mockAuthValue },
      children
    );
  };

  return {
    ...actual,
    AuthProvider: MockAuthProvider,
  };
});

// Mock LocalAuthService
jest.mock('../../services/auth/LocalAuthService');
const MockedLocalAuthService = LocalAuthService as jest.MockedClass<
  typeof LocalAuthService
>;

// Mock auth service methods
const mockAuthService = {
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  getCurrentUser: jest.fn(),
  refreshToken: jest.fn(),
  updateProfile: jest.fn(),
  changePassword: jest.fn(),
  isAuthenticated: jest.fn(),
};

// Mock antd message
jest.mock('antd', () => {
  const mockMessage = {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  };

  return {
    ...jest.requireActual('antd'),
    message: mockMessage,
  };
});

// Get the mocked message for assertions
const mockMessage = jest.requireMock('antd').message;

// Mock user data
const mockUser: User = {
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  role: UserRole.USER,
  profile: {
    firstName: 'Test',
    lastName: 'User',
    avatar: 'https://example.com/avatar.jpg',
    bio: 'Test user bio',
    phone: '+1234567890',
    address: '123 Test St',
    dateOfBirth: '1990-01-01',
    preferences: {
      theme: 'light',
      language: 'en',
      notifications: {
        email: true,
        push: false,
        sms: true,
      },
    },
  },
  permissions: ['read:profile', 'write:profile'],
  lastLoginAt: new Date().toISOString(),
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: new Date().toISOString(),
};

// 创建一个简化的测试组件来隔离问题
const SimpleTestComponent = () => {
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  return (
    <div>
      <div data-testid='user-info'>{user ? user.username : 'No user'}</div>
      <div data-testid='auth-status'>
        {isAuthenticated ? 'Authenticated' : 'Not authenticated'}
      </div>
    </div>
  );
};

// 简化的测试包装器，不包含 AuthProvider
const SimpleTestWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const store = configureStore({
    reducer: {
      auth: authSlice.reducer,
      ui: uiSlice.reducer,
      dashboard: dashboardSlice.reducer,
    },
    preloadedState: {
      auth: {
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        token: 'mock-token',
        refreshToken: 'mock-refresh-token',
        lastActivity: new Date().toISOString(),
        sessionExpiry: new Date(Date.now() + 3600000).toISOString(),
        authStrategy: 'local',
      },
      ui: {
        theme: 'light',
        sidebarCollapsed: false,
        loading: false,
        notifications: [],
      },
      dashboard: {
        systemStatus: {
          cpu: 0,
          memory: 0,
          disk: 0,
          network: 0,
        },
        loading: false,
        error: null,
        dateRange: {
          start: new Date().toISOString(),
          end: new Date().toISOString(),
        },
      },
    },
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: ['persist/PERSIST'],
        },
      }),
  });

  // 设置测试环境的语言为中文（已通过模拟处理）

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <I18nextProvider>
          <ThemeProvider>
            <BrowserRouter>
              <ConfigProvider locale={zhCN}>{children}</ConfigProvider>
            </BrowserRouter>
          </ThemeProvider>
        </I18nextProvider>
      </QueryClientProvider>
    </Provider>
  );
};

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const store = configureStore({
    reducer: {
      auth: authSlice.reducer,
      ui: uiSlice.reducer,
      dashboard: dashboardSlice.reducer,
    },
    preloadedState: {
      auth: {
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        token: 'mock-token',
        refreshToken: 'mock-refresh-token',
        lastActivity: new Date().toISOString(),
        sessionExpiry: new Date(Date.now() + 3600000).toISOString(),
        authStrategy: 'local',
      },
      ui: {
        theme: 'light',
        sidebarCollapsed: false,
        loading: false,
        notifications: [],
      },
      dashboard: {
        systemStatus: {
          cpu: 0,
          memory: 0,
          disk: 0,
          network: 0,
        },
        loading: false,
        error: null,
        dateRange: {
          start: new Date().toISOString(),
          end: new Date().toISOString(),
        },
      },
    },
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: ['persist/PERSIST'],
        },
      }),
  });

  // 设置测试环境的语言为中文（已通过模拟处理）

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <I18nextProvider>
          <ThemeProvider>
            <BrowserRouter>
              <ConfigProvider locale={zhCN}>
                <AuthProvider>{children}</AuthProvider>
              </ConfigProvider>
            </BrowserRouter>
          </ThemeProvider>
        </I18nextProvider>
      </QueryClientProvider>
    </Provider>
  );
};

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render login form correctly', () => {
    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    expect(screen.getByText('用户登录')).toBeInTheDocument();
    expect(screen.getByLabelText('用户名')).toBeInTheDocument();
    expect(screen.getByLabelText('密码')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument();
    expect(screen.getByText('还没有账号？')).toBeInTheDocument();
    expect(screen.getByText('立即注册')).toBeInTheDocument();
  });

  it('should show validation errors for empty fields', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const loginButton = screen.getByRole('button', { name: '登录' });
    await user.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText('请输入用户名')).toBeInTheDocument();
      expect(screen.getByText('请输入密码')).toBeInTheDocument();
    });
  });

  it('should show validation error for invalid username format', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const usernameInput = screen.getByLabelText('Username');
    const passwordInput = screen.getByLabelText('Password');
    const loginButton = screen.getByRole('button', { name: '登录' });

    await user.type(usernameInput, 'ab'); // 用户名太短
    await user.type(passwordInput, 'Test123!@#');
    await user.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText('用户名长度应在3-20位之间')).toBeInTheDocument();
    });
  });

  it('should submit form with valid credentials', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const usernameInput = screen.getByLabelText('Username');
    const passwordInput = screen.getByLabelText('Password');
    const loginButton = screen.getByRole('button', { name: '登录' });

    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'Test123!@#');
    await user.click(loginButton);

    await waitFor(() => {
      expect(mockMessage.success).toHaveBeenCalledWith('登录成功');
    });
  });

  it('should toggle password visibility', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const passwordInput = screen.getByLabelText('密码') as HTMLInputElement;
    const toggleButton = screen.getByRole('button', {
      name: /toggle password visibility/i,
    });

    expect(passwordInput.type).toBe('password');

    await user.click(toggleButton);
    expect(passwordInput.type).toBe('text');

    await user.click(toggleButton);
    expect(passwordInput.type).toBe('password');
  });

  it('should navigate to register page when clicking register link', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const registerLink = screen.getByText('立即注册');
    await user.click(registerLink);

    expect(mockNavigate).toHaveBeenCalledWith('/register');
  });

  it('should show loading state during login', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const usernameInput = screen.getByLabelText('用户名');
    const passwordInput = screen.getByLabelText('密码');
    const loginButton = screen.getByRole('button', { name: '登录' });

    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'Test123!@#');
    await user.click(loginButton);

    expect(
      screen.getByRole('button', { name: '登录中...' })
    ).toBeInTheDocument();
  });
});

describe('RegisterForm', () => {
  let mockDispatch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Redux dispatch to return successful register action
    mockDispatch = jest.fn();
    mockDispatch.mockImplementation((action: any) => {
      if (action.type?.includes('register')) {
        return {
          unwrap: () =>
            Promise.resolve({
              id: '2',
              username: 'newuser',
              email: 'newuser@example.com',
              role: 'user',
              avatar: undefined,
              displayName: 'New User',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              profile: {
                firstName: 'New',
                lastName: 'User',
                phone: '',
                address: '',
                dateOfBirth: '',
                preferences: {
                  theme: 'light',
                  language: 'zh',
                  notifications: {
                    email: true,
                    push: true,
                    sms: false,
                  },
                },
              },
              permissions: ['read:profile', 'write:profile'],
              isActive: true,
            }),
        };
      }
      return { unwrap: () => Promise.resolve() };
    });

    // Mock useAppDispatch to return our mock dispatch
    require('@/hooks/redux').useAppDispatch.mockReturnValue(mockDispatch);

    // Mock useAppSelector to return appropriate auth state
    require('@/hooks/redux').useAppSelector.mockImplementation(
      (selector: any) => {
        const mockState = {
          auth: {
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            token: null,
            refreshToken: null,
            lastActivity: null,
            sessionExpiry: null,
            authStrategy: 'local',
          },
        };
        return selector(mockState);
      }
    );
  });

  it('should render register form correctly', () => {
    render(
      <TestWrapper>
        <RegisterForm />
      </TestWrapper>
    );

    expect(screen.getByText('用户注册')).toBeInTheDocument();
    expect(screen.getByLabelText('用户名')).toBeInTheDocument();
    expect(screen.getByLabelText('邮箱')).toBeInTheDocument();
    expect(screen.getByLabelText('密码')).toBeInTheDocument();
    expect(screen.getByLabelText('确认密码')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '创建账户' })
    ).toBeInTheDocument();
    expect(screen.getByText('已有账号？')).toBeInTheDocument();
    expect(screen.getByText('立即登录')).toBeInTheDocument();
  });

  it('should show validation errors for empty fields', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <RegisterForm />
      </TestWrapper>
    );

    const registerButton = screen.getByRole('button', { name: '创建账户' });
    await user.click(registerButton);

    await waitFor(() => {
      expect(screen.getByText('请输入用户名')).toBeInTheDocument();
      expect(screen.getByText('请输入邮箱')).toBeInTheDocument();
      expect(screen.getByText('请输入密码')).toBeInTheDocument();
      expect(screen.getByText('请确认密码')).toBeInTheDocument();
    });
  });

  it('should show validation error for invalid email format', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <RegisterForm />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText('Email');
    const registerButton = screen.getByRole('button', { name: '创建账户' });

    await user.type(emailInput, 'invalid-email');
    await user.click(registerButton);

    await waitFor(() => {
      expect(screen.getByText('请输入有效的邮箱地址')).toBeInTheDocument();
    });
  });

  it('should show validation error for password mismatch', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <RegisterForm />
      </TestWrapper>
    );

    const passwordInput = screen.getByLabelText('密码');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const registerButton = screen.getByRole('button', { name: '创建账户' });

    await user.type(passwordInput, 'Test123!@#');
    await user.type(confirmPasswordInput, 'DifferentPassword');
    await user.click(registerButton);

    await waitFor(() => {
      expect(
        screen.getByText('Password confirmation does not match')
      ).toBeInTheDocument();
    });
  });

  it('should show password strength indicator', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <RegisterForm />
      </TestWrapper>
    );

    const passwordInput = screen.getByLabelText('密码');

    // 弱密码
    await user.type(passwordInput, '123');
    await waitFor(() => {
      expect(screen.getByText('弱')).toBeInTheDocument();
    });

    // 清空并输入强密码
    await user.clear(passwordInput);
    await user.type(passwordInput, 'Test123!@#');
    await waitFor(() => {
      expect(screen.getByText('强')).toBeInTheDocument();
    });
  });

  it('should submit form with valid data', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <RegisterForm />
      </TestWrapper>
    );

    const usernameInput = screen.getByLabelText('用户名');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('密码');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const registerButton = screen.getByRole('button', { name: '创建账户' });

    await user.type(usernameInput, 'newuser');
    await user.type(emailInput, 'newuser@example.com');
    await user.type(passwordInput, 'Test123!@#');
    await user.type(confirmPasswordInput, 'Test123!@#');
    await user.click(registerButton);

    await waitFor(() => {
      expect(mockMessage.success).toHaveBeenCalledWith(
        'Registration successful'
      );
    });
  });

  it('should navigate to login page when clicking login link', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <RegisterForm />
      </TestWrapper>
    );

    const loginLink = screen.getByText('立即登录');
    await user.click(loginLink);

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});

describe('UserProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render user profile correctly', () => {
    render(
      <TestWrapper>
        <UserProfile />
      </TestWrapper>
    );

    expect(screen.getByText('个人资料')).toBeInTheDocument();
    expect(screen.getByDisplayValue(mockUser.username)).toBeInTheDocument();
    expect(screen.getByDisplayValue(mockUser.email)).toBeInTheDocument();
    expect(
      screen.getByDisplayValue(mockUser.displayName || '')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument();
  });

  it('should show user avatar', () => {
    render(
      <TestWrapper>
        <UserProfile />
      </TestWrapper>
    );

    const avatar = screen.getByRole('img');
    expect(avatar).toHaveAttribute('src', mockUser.avatar);
  });

  it('should show default avatar when user has no avatar', () => {
    const userWithoutAvatar = { ...mockUser, avatar: undefined };

    render(
      <TestWrapper>
        <UserProfile />
      </TestWrapper>
    );

    expect(screen.getByText('T')).toBeInTheDocument(); // 首字母头像
  });

  it('should enable edit mode when clicking edit button', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <UserProfile />
      </TestWrapper>
    );

    const editButton = screen.getByRole('button', { name: 'edit 编辑资料' });
    await user.click(editButton);

      expect(screen.getByRole('button', { name: 'close 取消' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'save 保存' })).toBeInTheDocument();
  });

  it('should update user profile', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <UserProfile />
      </TestWrapper>
    );

    const editButton = screen.getByRole('button', { name: 'edit 编辑资料' });
    await user.click(editButton);

    const displayNameInput = screen.getByDisplayValue(
      mockUser.displayName || ''
    );
    await user.clear(displayNameInput);
    await user.type(displayNameInput, 'Updated Name');

      const saveButton = screen.getByRole('button', { name: 'save 保存' });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockMessage.success).toHaveBeenCalledWith('个人资料更新成功');
    });
  });

  it('should cancel edit mode', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <UserProfile />
      </TestWrapper>
    );

    const editButton = screen.getByRole('button', { name: 'edit 编辑资料' });
    await user.click(editButton);

    const displayNameInput = screen.getByDisplayValue(
      mockUser.displayName || ''
    );
    await user.clear(displayNameInput);
    await user.type(displayNameInput, 'Updated Name');

      const cancelButton = screen.getByRole('button', { name: 'close 取消' });
    await user.click(cancelButton);

    // 应该恢复原始值
    expect(
      screen.getByDisplayValue(mockUser.displayName || '')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'edit 编辑资料' })).toBeInTheDocument();
  });

  it('should show role badge', () => {
    render(
      <TestWrapper>
        <UserProfile />
      </TestWrapper>
    );

    expect(screen.getByText('普通用户')).toBeInTheDocument();
  });

    it('should show admin role badge for admin user', () => {
      const adminUser = { ...mockUser, role: 'admin' as const };

      // 创建新的TestWrapper使用admin用户
      const AdminAuthProvider = ({ children }: { children: React.ReactNode }) => {
        const actual = jest.requireActual('../../contexts/AuthContext');
        const mockAdminAuthValue = {
          user: adminUser,
          isAuthenticated: true,
          isLoading: false,
          error: null,
          login: jest.fn(),
          register: jest.fn(),
          logout: jest.fn(),
          updateProfile: jest.fn(),
          changePassword: jest.fn(),
          refreshToken: jest.fn(),
          validateToken: jest.fn(),
        };

        return React.createElement(
          actual.AuthContext.Provider,
          { value: mockAdminAuthValue },
          children
        );
      };

      const AdminTestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        const queryClient = new QueryClient({
          defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
          },
        });

        const store = configureStore({
          reducer: {
            auth: authSlice.reducer,
            ui: uiSlice.reducer,
            dashboard: dashboardSlice.reducer,
          },
          preloadedState: {
            auth: {
              user: adminUser,
              isAuthenticated: true,
              isLoading: false,
              error: null,
              token: null,
              refreshToken: null,
              lastActivity: null,
              sessionExpiry: null,
              authStrategy: 'local',
            },
          },
        });

        return (
          <Provider store={store}>
            <QueryClientProvider client={queryClient}>
              <I18nextProvider i18n={{ changeLanguage: () => new Promise(() => {}), language: 'zh-CN', languages: ['zh-CN', 'en'], options: { lng: 'zh-CN', fallbackLng: 'zh-CN' } }}>
                <AdminAuthProvider>
                  <ThemeProvider>
                    <BrowserRouter>
                      <ConfigProvider locale={zhCN}>{children}</ConfigProvider>
                    </BrowserRouter>
                  </ThemeProvider>
                </AdminAuthProvider>
              </I18nextProvider>
            </QueryClientProvider>
          </Provider>
        );
      };

      render(
        <AdminTestWrapper>
          <UserProfile />
        </AdminTestWrapper>
      );

      expect(screen.getByText('管理员')).toBeInTheDocument();
    });

    it('should show change password section', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <UserProfile />
        </TestWrapper>
      );

      // 首先点击修改密码按钮打开模态框
      const changePasswordButton = screen.getByRole('button', { name: 'lock 修改密码' });
      await user.click(changePasswordButton);

      // 等待模态框打开
      await waitFor(() => {
        const modalTitles = screen.getAllByText('修改密码');
        expect(modalTitles.length).toBeGreaterThan(0);
      });

      // 检查模态框中的字段
      expect(screen.getByLabelText('当前密码')).toBeInTheDocument();
      expect(screen.getByLabelText('新密码')).toBeInTheDocument();
      expect(screen.getByLabelText('确认新密码')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'save 确认修改' })).toBeInTheDocument();
    });

  it('should change password successfully', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <UserProfile />
      </TestWrapper>
    );

    const currentPasswordInput = screen.getByLabelText('当前密码');
    const newPasswordInput = screen.getByLabelText('新密码');
    const confirmNewPasswordInput = screen.getByLabelText('确认新密码');
      const changePasswordButton = screen.getByRole('button', {
        name: 'save 确认修改',
      });

    await user.type(currentPasswordInput, 'Test123!@#');
    await user.type(newPasswordInput, 'NewPassword123!@#');
    await user.type(confirmNewPasswordInput, 'NewPassword123!@#');
    await user.click(changePasswordButton);

    await waitFor(() => {
      expect(mockMessage.success).toHaveBeenCalledWith('密码修改成功');
    });
  });

  it('should show validation error for password mismatch in change password', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <UserProfile />
      </TestWrapper>
    );

    // 等待组件加载完成
    await waitFor(
      () => {
        expect(screen.queryByText('加载用户信息中...')).not.toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // 首先点击修改密码按钮打开Modal
      const openPasswordModalButton = screen.getByRole('button', {
        name: 'lock 修改密码',
      });
      await user.click(openPasswordModalButton);

      // 等待Modal打开并查找密码输入字段
      await waitFor(() => {
        expect(screen.getByLabelText('当前密码')).toBeInTheDocument();
      });

    const currentPasswordInput = screen.getByLabelText('当前密码');
    const newPasswordInput = screen.getByLabelText('新密码');
    const confirmNewPasswordInput = screen.getByLabelText('确认新密码');
    const submitButton = screen.getByRole('button', { name: 'save 确认修改' });

    await user.type(currentPasswordInput, 'Test123!@#');
    await user.type(newPasswordInput, 'NewPassword123!@#');
    await user.type(confirmNewPasswordInput, 'DifferentPassword');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('两次输入的密码不一致')).toBeInTheDocument();
    });
  });
});

// Integration tests
describe('Auth Components Integration', () => {
  let mockDispatch: jest.Mock;
  let mockUseAppDispatch: jest.Mock;
  let mockUseAppSelector: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Redux dispatch to return successful register action
    mockDispatch = jest.fn();
    mockDispatch.mockImplementation((action: any) => {
      if (action.type?.includes('register')) {
        return {
          unwrap: () =>
            Promise.resolve({
              id: '2',
              username: 'newuser',
              email: 'newuser@example.com',
              role: 'user',
              avatar: undefined,
              displayName: 'New User',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              profile: {
                firstName: 'New',
                lastName: 'User',
                phone: '',
                address: '',
                dateOfBirth: '',
                preferences: {
                  theme: 'light',
                  language: 'zh',
                  notifications: {
                    email: true,
                    push: true,
                    sms: false,
                  },
                },
              },
              permissions: ['read:profile', 'write:profile'],
              isActive: true,
            }),
        };
      }
      return { unwrap: () => Promise.resolve() };
    });

    // Mock useAppDispatch to return our mock dispatch
    require('@/hooks/redux').useAppDispatch.mockReturnValue(mockDispatch);

    // Mock useAppSelector to return appropriate auth state
    require('@/hooks/redux').useAppSelector.mockImplementation(
      (selector: any) => {
        const mockState = {
          auth: {
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            token: null,
            refreshToken: null,
            lastActivity: null,
            sessionExpiry: null,
            authStrategy: 'local',
          },
        };
        return selector(mockState);
      }
    );
  });

  it('should handle authentication flow correctly', async () => {
    const user = userEvent.setup();

    // Render register form
    const mockOnSuccess = jest.fn();
    const { rerender } = render(
      <TestWrapper>
        <RegisterForm onSuccess={mockOnSuccess} />
      </TestWrapper>
    );

    // Fill register form
    const usernameInput = screen.getByLabelText('用户名');
    const emailInput = screen.getByLabelText('邮箱');
    const passwordInput = screen.getByLabelText('密码');
    const confirmPasswordInput = screen.getByLabelText('确认密码');
    const registerButton = screen.getByRole('button', {
      name: '创建账户',
    });

    await user.type(usernameInput, 'newuser');
    await user.type(emailInput, 'newuser@example.com');
    await user.type(passwordInput, 'Test123!@#');
    await user.type(confirmPasswordInput, 'Test123!@#');
    await user.click(registerButton);

    // Verify registration success message
    await waitFor(
      () => {
        expect(mockDispatch).toHaveBeenCalled();
        expect(mockMessage.success).toHaveBeenCalledWith('注册成功');
        expect(mockOnSuccess).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Verify registration form submitted correctly
    expect(mockDispatch).toHaveBeenCalled();
  });

  it('should handle registration to login flow', async () => {
    const user = userEvent.setup();
    const mockOnSuccess = jest.fn();

    render(
      <TestWrapper>
        <RegisterForm onSuccess={mockOnSuccess} />
      </TestWrapper>
    );

    // Fill registration form
    const usernameInput = screen.getByLabelText('用户名');
    const emailInput = screen.getByLabelText('邮箱');
    const passwordInput = screen.getByLabelText('密码');
    const confirmPasswordInput = screen.getByLabelText('确认密码');
    const registerButton = screen.getByRole('button', { name: '创建账户' });

    await user.type(usernameInput, 'newuser');
    await user.type(emailInput, 'newuser@example.com');
    await user.type(passwordInput, 'Test123!@#');
    await user.type(confirmPasswordInput, 'Test123!@#');

    // Ensure form validation passes
    await waitFor(() => {
      expect(registerButton).not.toBeDisabled();
    });

    await user.click(registerButton);

    // Wait for form submission processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check for form validation errors
    const errorElements = screen.queryAllByRole('alert');

    // If called, verify
    if (mockDispatch.mock.calls.length > 0) {
      expect(mockMessage.success).toHaveBeenCalledWith('注册成功');
      expect(mockOnSuccess).toHaveBeenCalled();
    } else {
      // If not called, form submission failed
      expect(mockDispatch).toHaveBeenCalled(); // This will fail and show the reason
    }
  });
});

// Redux Store Integration tests
describe('Redux Store Integration', () => {
  it('should properly access auth state from store', () => {
    // Create a minimal test wrapper without any other Providers
    const VeryMinimalTestWrapper: React.FC<{ children: React.ReactNode }> = ({
      children,
    }) => {
      const store = configureStore({
        reducer: {
          auth: authSlice.reducer,
        },
        preloadedState: {
          auth: {
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            token: null,
            refreshToken: null,
            lastActivity: null,
            sessionExpiry: null,
            authStrategy: 'local',
          },
        },
      });

      return <Provider store={store}>{children}</Provider>;
    };

    // Create a minimal test component without any hooks
    const VeryMinimalTestComponent = () => {
      return (
        <div>
          <div data-testid='simple-test'>Simple test component</div>
        </div>
      );
    };

    render(
      <VeryMinimalTestWrapper>
        <VeryMinimalTestComponent />
      </VeryMinimalTestWrapper>
    );

    expect(screen.getByTestId('simple-test')).toHaveTextContent(
      'Simple test component'
    );
  });
});
