import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import App from '@/App';
import { server } from '@/mocks/server';
import { rest } from 'msw';

// 启动MSW服务器
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Authentication E2E Tests', () => {
  beforeEach(() => {
    // 清除本地存储
    localStorage.clear();
    sessionStorage.clear();

    // 重置URL
    window.history.pushState({}, '', '/');
  });

  it('should complete full login flow', async () => {
    renderWithProviders(<App />);

    // 验证重定向到登录页面
    await waitFor(() => {
      expect(screen.getByText('用户登录')).toBeInTheDocument();
    });

    // 填写登录表单
    const usernameInput = screen.getByPlaceholderText('请输入用户名');
    const passwordInput = screen.getByPlaceholderText('请输入密码');
    const loginButton = screen.getByRole('button', { name: '登录' });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(loginButton);

    // 验证登录成功并重定向到仪表板
    await waitFor(
      () => {
        expect(screen.getByText('仪表板')).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // 验证用户信息显示
    expect(screen.getByText('测试用户')).toBeInTheDocument();

    // 验证导航菜单
    expect(screen.getByText('首页')).toBeInTheDocument();
    expect(screen.getByText('用户管理')).toBeInTheDocument();
    expect(screen.getByText('系统设置')).toBeInTheDocument();

    // 验证token存储
    expect(localStorage.getItem('token')).toBeTruthy();
  });

  it('should handle login with invalid credentials', async () => {
    // 模拟登录失败
    server.use(
      rest.post('/api/auth/login', (req, res, ctx) => {
        return res(ctx.status(401), ctx.json({ message: '用户名或密码错误' }));
      })
    );

    renderWithProviders(<App />);

    await waitFor(() => {
      expect(screen.getByText('用户登录')).toBeInTheDocument();
    });

    // 填写错误的登录信息
    const usernameInput = screen.getByPlaceholderText('请输入用户名');
    const passwordInput = screen.getByPlaceholderText('请输入密码');
    const loginButton = screen.getByRole('button', { name: '登录' });

    fireEvent.change(usernameInput, { target: { value: 'wronguser' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(loginButton);

    // 验证错误消息显示
    await waitFor(() => {
      expect(screen.getByText('用户名或密码错误')).toBeInTheDocument();
    });

    // 验证仍在登录页面
    expect(screen.getByText('用户登录')).toBeInTheDocument();

    // 验证没有token存储
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('should complete registration flow', async () => {
    renderWithProviders(<App />);

    await waitFor(() => {
      expect(screen.getByText('用户登录')).toBeInTheDocument();
    });

    // 点击注册链接
    const registerLink = screen.getByText('立即注册');
    fireEvent.click(registerLink);

    // 验证跳转到注册页面
    await waitFor(() => {
      expect(screen.getByText('用户注册')).toBeInTheDocument();
    });

    // 填写注册表单
    const usernameInput = screen.getByPlaceholderText('请输入用户名');
    const emailInput = screen.getByPlaceholderText('请输入邮箱');
    const passwordInput = screen.getByPlaceholderText('请输入密码');
    const confirmPasswordInput = screen.getByPlaceholderText('请确认密码');
    const registerButton = screen.getByRole('button', { name: '注册' });

    fireEvent.change(usernameInput, { target: { value: 'newuser' } });
    fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, {
      target: { value: 'password123' },
    });

    // 同意条款
    const agreeCheckbox = screen.getByRole('checkbox');
    fireEvent.click(agreeCheckbox);

    fireEvent.click(registerButton);

    // 验证注册成功消息
    await waitFor(() => {
      expect(screen.getByText('注册成功，请登录')).toBeInTheDocument();
    });

    // 验证自动跳转到登录页面
    await waitFor(() => {
      expect(screen.getByText('用户登录')).toBeInTheDocument();
    });
  });

  it('should handle logout flow', async () => {
    // 先设置已登录状态
    localStorage.setItem('token', 'mock-token');

    const initialState = {
      user: {
        user: {
          id: '1',
          username: 'testuser',
          email: 'test@example.com',
          avatar: '',
          role: 'user',
        },
        loading: false,
        error: null,
      },
      ui: {
        theme: 'light',
        sidebarCollapsed: false,
        loading: false,
        notifications: [],
        modal: {
          visible: false,
          title: '',
          content: null,
        },
      },
    };

    renderWithProviders(<App />, { initialState });

    // 验证已登录状态
    await waitFor(() => {
      expect(screen.getByText('仪表板')).toBeInTheDocument();
    });

    // 点击用户头像打开下拉菜单
    const userAvatar = screen.getByTestId('user-avatar');
    fireEvent.click(userAvatar);

    // 点击退出登录
    const logoutButton = screen.getByText('退出登录');
    fireEvent.click(logoutButton);

    // 验证确认对话框
    await waitFor(() => {
      expect(screen.getByText('确认退出登录？')).toBeInTheDocument();
    });

    // 确认退出
    const confirmButton = screen.getByRole('button', { name: '确定' });
    fireEvent.click(confirmButton);

    // 验证跳转到登录页面
    await waitFor(() => {
      expect(screen.getByText('用户登录')).toBeInTheDocument();
    });

    // 验证token被清除
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('should handle password reset flow', async () => {
    renderWithProviders(<App />);

    await waitFor(() => {
      expect(screen.getByText('用户登录')).toBeInTheDocument();
    });

    // 点击忘记密码链接
    const forgotPasswordLink = screen.getByText('忘记密码？');
    fireEvent.click(forgotPasswordLink);

    // 验证跳转到密码重置页面
    await waitFor(() => {
      expect(screen.getByText('重置密码')).toBeInTheDocument();
    });

    // 输入邮箱
    const emailInput = screen.getByPlaceholderText('请输入注册邮箱');
    const sendCodeButton = screen.getByRole('button', { name: '发送验证码' });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(sendCodeButton);

    // 验证验证码发送成功
    await waitFor(() => {
      expect(screen.getByText('验证码已发送到您的邮箱')).toBeInTheDocument();
    });

    // 输入验证码和新密码
    const codeInput = screen.getByPlaceholderText('请输入验证码');
    const newPasswordInput = screen.getByPlaceholderText('请输入新密码');
    const confirmPasswordInput = screen.getByPlaceholderText('请确认新密码');
    const resetButton = screen.getByRole('button', { name: '重置密码' });

    fireEvent.change(codeInput, { target: { value: '123456' } });
    fireEvent.change(newPasswordInput, { target: { value: 'newpassword123' } });
    fireEvent.change(confirmPasswordInput, {
      target: { value: 'newpassword123' },
    });
    fireEvent.click(resetButton);

    // 验证密码重置成功
    await waitFor(() => {
      expect(
        screen.getByText('密码重置成功，请使用新密码登录')
      ).toBeInTheDocument();
    });

    // 验证跳转到登录页面
    await waitFor(() => {
      expect(screen.getByText('用户登录')).toBeInTheDocument();
    });
  });

  it('should handle session expiration', async () => {
    // 设置过期的token
    localStorage.setItem('token', 'expired-token');

    // 模拟token验证失败
    server.use(
      rest.get('/api/auth/me', (req, res, ctx) => {
        return res(ctx.status(401), ctx.json({ message: 'Token已过期' }));
      })
    );

    const initialState = {
      user: {
        user: null,
        loading: false,
        error: null,
      },
      ui: {
        theme: 'light',
        sidebarCollapsed: false,
        loading: false,
        notifications: [],
        modal: {
          visible: false,
          title: '',
          content: null,
        },
      },
    };

    renderWithProviders(<App />, { initialState });

    // 验证自动跳转到登录页面
    await waitFor(() => {
      expect(screen.getByText('用户登录')).toBeInTheDocument();
    });

    // 验证显示会话过期提示
    expect(screen.getByText('会话已过期，请重新登录')).toBeInTheDocument();

    // 验证token被清除
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('should handle remember me functionality', async () => {
    renderWithProviders(<App />);

    await waitFor(() => {
      expect(screen.getByText('用户登录')).toBeInTheDocument();
    });

    // 填写登录表单并勾选记住我
    const usernameInput = screen.getByPlaceholderText('请输入用户名');
    const passwordInput = screen.getByPlaceholderText('请输入密码');
    const rememberCheckbox = screen.getByLabelText('记住我');
    const loginButton = screen.getByRole('button', { name: '登录' });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(rememberCheckbox);
    fireEvent.click(loginButton);

    // 验证登录成功
    await waitFor(() => {
      expect(screen.getByText('仪表板')).toBeInTheDocument();
    });

    // 验证记住我信息被保存
    expect(localStorage.getItem('rememberMe')).toBe('true');
    expect(localStorage.getItem('savedUsername')).toBe('testuser');
  });

  it('should handle auto-login with valid token', async () => {
    // 设置有效的token
    localStorage.setItem('token', 'valid-token');

    const initialState = {
      user: {
        user: {
          id: '1',
          username: 'testuser',
          email: 'test@example.com',
          avatar: '',
          role: 'user',
        },
        loading: false,
        error: null,
      },
      ui: {
        theme: 'light',
        sidebarCollapsed: false,
        loading: false,
        notifications: [],
        modal: {
          visible: false,
          title: '',
          content: null,
        },
      },
    };

    renderWithProviders(<App />, { initialState });

    // 验证直接跳转到仪表板（无需登录）
    await waitFor(() => {
      expect(screen.getByText('仪表板')).toBeInTheDocument();
    });

    // 验证用户信息显示
    expect(screen.getByText('testuser')).toBeInTheDocument();
  });
});
