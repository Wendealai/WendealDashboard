import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { UserProfile, ProtectedRoute } from '../../components/auth';
import authSlice from '../../store/slices/authSlice';
import { uiSlice } from '../../store/slices/uiSlice';
import type { User } from '../../types/auth';
import { UserRole } from '../../types/auth';

// Mock LocalAuthService class
const mockGetCurrentUser = jest.fn();
const mockChangePassword = jest.fn();
const mockUpdateProfile = jest.fn();

// Mock the LocalAuthService class
jest.mock('../../services/auth/LocalAuthService', () => ({
  LocalAuthService: jest.fn().mockImplementation(() => ({
    getCurrentUser: mockGetCurrentUser,
    changePassword: mockChangePassword,
    updateProfile: mockUpdateProfile,
    isAuthenticated: jest.fn().mockReturnValue(true),
    initialize: jest.fn(),
  })),
}));

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
        push: true,
        sms: false,
      },
    },
  },
  permissions: ['read:profile', 'write:profile'],
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
};

// Mock AuthContext
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
    error: null,
    updateProfile: mockUpdateProfile,
    changePassword: mockChangePassword,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: () => new Promise(() => {}),
    },
  }),
}));

// Test wrapper component
interface TestWrapperProps {
  children: React.ReactNode;
  initialRoute?: string;
}

const TestWrapper: React.FC<TestWrapperProps> = ({
  children,
  initialRoute = '/',
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

  // 创建测试用的Redux store with preloaded state
  const testStore = configureStore({
    reducer: {
      auth: authSlice,
      ui: uiSlice.reducer,
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
        authStrategy: 'local' as const,
      },
      ui: {
        sidebarCollapsed: false,
        theme: 'light',
        language: 'en',
      },
    },
  });

  return (
    <Provider store={testStore}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <MemoryRouter initialEntries={[initialRoute]}>
            <Routes>
              <Route
                path='/profile'
                element={
                  <ProtectedRoute>
                    <UserProfile />
                  </ProtectedRoute>
                }
              />
              {children}
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>
  );
};

describe('Password Change Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should change password successfully', async () => {
    const user = userEvent.setup();

    // Mock authenticated user
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockChangePassword.mockResolvedValue(undefined);

    render(<TestWrapper initialRoute='/profile' />);

    // Wait for the UserProfile component to fully render
    await waitFor(() => {
      expect(screen.getByText('编辑资料')).toBeInTheDocument();
    });

    // First click "编辑资料" button to enter edit mode
    const editProfileButton = screen.getByRole('button', { name: /编辑资料/i });
    await user.click(editProfileButton);

    // Now navigate to password change section
    const changePasswordButton = screen.getByRole('button', {
      name: /修改密码/i,
    });
    await user.click(changePasswordButton);

    // Debug: Check what buttons are available
    screen.debug();

    // Fill password change form
    const currentPasswordInput = screen.getByPlaceholderText('请输入当前密码');
    const newPasswordInput = screen.getByPlaceholderText('请输入新密码');
    const confirmNewPasswordInput =
      screen.getByPlaceholderText('请再次输入新密码');

    // Try to find submit button with different approaches
    const submitButton = screen.getByRole('button', { name: /确认/i });

    await user.type(currentPasswordInput, 'currentpassword');
    await user.type(newPasswordInput, 'newpassword123');
    await user.type(confirmNewPasswordInput, 'newpassword123');
    await user.click(submitButton);

    // Verify password change was called
    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith({
        currentPassword: 'currentpassword',
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123',
      });
    });
  });
});
