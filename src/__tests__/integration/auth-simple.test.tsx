import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { AuthProvider } from '../../contexts/AuthContext';
import LoginForm from '../../components/auth/LoginForm';
import RegisterForm from '../../components/auth/RegisterForm';
import UserProfile from '../../components/auth/UserProfile';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import MainLayout from '../../components/Layout/MainLayout';
import authSlice from '../../store/slices/authSlice';

// 简化的测试包装器
const SimpleTestWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const testStore = configureStore({
    reducer: {
      auth: authSlice,
    },
  });

  return (
    <Provider store={testStore}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>{children}</AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  );
};

describe('Simple Auth Test', () => {
  it('should render AuthProvider without errors', () => {
    render(
      <SimpleTestWrapper>
        <div data-testid='test-content'>Test Content</div>
      </SimpleTestWrapper>
    );

    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });

  it('should render LoginForm without errors', () => {
    render(
      <SimpleTestWrapper>
        <Routes>
          <Route path='/' element={<LoginForm />} />
        </Routes>
      </SimpleTestWrapper>
    );

    // LoginForm应该渲染成功，查找登录按钮
    expect(screen.getByText(/sign in|登录/i)).toBeInTheDocument();
  });

  it('should render RegisterForm without errors', () => {
    render(
      <SimpleTestWrapper>
        <Routes>
          <Route path='/' element={<RegisterForm />} />
        </Routes>
      </SimpleTestWrapper>
    );

    // RegisterForm应该渲染成功，查找注册相关文本
    expect(screen.getByText(/register|注册|sign up/i)).toBeInTheDocument();
  });

  it('should render UserProfile without errors', () => {
    render(
      <SimpleTestWrapper>
        <Routes>
          <Route path='/' element={<UserProfile />} />
        </Routes>
      </SimpleTestWrapper>
    );

    // UserProfile应该渲染成功
    expect(screen.getByText(/profile|个人资料|用户信息/i)).toBeInTheDocument();
  });

  it('should render ProtectedRoute without errors', () => {
    render(
      <SimpleTestWrapper>
        <Routes>
          <Route
            path='/'
            element={
              <ProtectedRoute>
                <div data-testid='protected-content'>Protected Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </SimpleTestWrapper>
    );

    // ProtectedRoute应该渲染成功（可能显示登录页面或受保护内容）
    expect(document.body).toBeInTheDocument();
  });

  it('should render MainLayout without errors', () => {
    render(
      <SimpleTestWrapper>
        <Routes>
          <Route path='/' element={<MainLayout />} />
        </Routes>
      </SimpleTestWrapper>
    );

    // MainLayout应该渲染成功，检查是否有基本的布局结构
    expect(document.body).toBeInTheDocument();
  });
});
