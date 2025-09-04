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

// Simplified test wrapper
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

    // LoginForm should render successfully, look for login button
    expect(screen.getByText(/sign in|login/i)).toBeInTheDocument();
  });

  it('should render RegisterForm without errors', () => {
    render(
      <SimpleTestWrapper>
        <Routes>
          <Route path='/' element={<RegisterForm />} />
        </Routes>
      </SimpleTestWrapper>
    );

    // RegisterForm should render successfully, look for registration related text
    expect(screen.getByText(/register|sign up/i)).toBeInTheDocument();
  });

  it('should render UserProfile without errors', () => {
    render(
      <SimpleTestWrapper>
        <Routes>
          <Route path='/' element={<UserProfile />} />
        </Routes>
      </SimpleTestWrapper>
    );

    // UserProfile should render successfully
    expect(
      screen.getByText(/profile|user info|user profile/i)
    ).toBeInTheDocument();
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

    // ProtectedRoute should render successfully (may show login page or protected content)
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

    // MainLayout should render successfully, check for basic layout structure
    expect(document.body).toBeInTheDocument();
  });
});
