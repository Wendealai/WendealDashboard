import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '../../store';
import { AuthProvider } from '../../contexts/AuthContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { MainLayout } from '../../components/Layout';
import { LocalAuthService } from '../../services/auth/LocalAuthService';
import { PermissionService } from '../../services/auth/PermissionService';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import type { User, UserRole } from '../../types/auth';
import '../../locales';

// Mock services
jest.mock('../../services/auth/LocalAuthService');
jest.mock('../../services/auth/PermissionService');
jest.mock('../../hooks/redux');

const mockUseAppSelector = useAppSelector as jest.MockedFunction<
  typeof useAppSelector
>;
const mockUseAppDispatch = useAppDispatch as jest.MockedFunction<
  typeof useAppDispatch
>;

const MockedLocalAuthService = LocalAuthService as jest.MockedClass<
  typeof LocalAuthService
>;
const MockedPermissionService = PermissionService as jest.MockedClass<
  typeof PermissionService
>;

const mockUser: User = {
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  role: 'user' as UserRole,
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
  isActive: true,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
};

const SimpleTestWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <ThemeProvider>
      <Provider store={store}>
        <BrowserRouter>
          <AuthProvider>{children}</AuthProvider>
        </BrowserRouter>
      </Provider>
    </ThemeProvider>
  );
};

describe('MainLayout Debug', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Redux store selectors
    mockUseAppSelector.mockImplementation((selector: any) => {
      const mockState = {
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
          sidebarOpen: false,
          theme: 'light',
        },
      };
      return selector(mockState);
    });

    // Mock Redux dispatch
    const mockDispatch = jest.fn();
    mockUseAppDispatch.mockReturnValue(mockDispatch);
  });

  it('should render MainLayout and show what content is available', async () => {
    render(
      <SimpleTestWrapper>
        <MainLayout />
      </SimpleTestWrapper>
    );

    // Debug: log all text content
    console.log('=== All text content ===');
    const mainElement = screen.getByRole('main');
    console.log('Main content:', mainElement.textContent);

    // Debug: log entire document body
    console.log('=== Document body ===');
    console.log('Body content:', document.body.textContent);

    // Debug: try to find any user-related text
    const userElements = screen.queryAllByText(/test/i);
    console.log(
      'Elements with "test":',
      userElements.map(el => el.textContent)
    );

    // Debug: check for username specifically
    const usernameElements = screen.queryAllByText(/testuser/i);
    console.log(
      'Elements with "testuser":',
      usernameElements.map(el => el.textContent)
    );

    // Debug: check for any dropdown or user menu
    const dropdownElements = document.querySelectorAll(
      '[class*="dropdown"], [class*="user"], [class*="menu"]'
    );
    console.log(
      'Dropdown/user elements:',
      Array.from(dropdownElements).map(el => el.textContent)
    );

    // Just check that MainLayout renders
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
