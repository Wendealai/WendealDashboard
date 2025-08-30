import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { AuthProvider } from '../../contexts/AuthContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { MainLayout } from '../../components/Layout';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import authSlice from '../../store/slices/authSlice';
import { uiSlice } from '../../store/slices/uiSlice';
import type { User } from '../../types/auth';
import { UserRole } from '../../types/auth';

// Mock Redux hooks
jest.mock('../../hooks/redux', () => ({
  useAppSelector: jest.fn(),
  useAppDispatch: jest.fn(),
}));

const mockUseAppSelector = useAppSelector as jest.MockedFunction<
  typeof useAppSelector
>;
const mockUseAppDispatch = useAppDispatch as jest.MockedFunction<
  typeof useAppDispatch
>;

// Mock data
const mockUser: User = {
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  role: UserRole.USER,
  profile: {
    firstName: 'Test',
    lastName: 'User',
    avatar: 'https://example.com/avatar.jpg',
  },
  permissions: ['read:dashboard'],
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
};

// Create a mock store
const createMockStore = () => {
  return configureStore({
    reducer: {
      auth: authSlice,
      ui: uiSlice.reducer,
    },
    preloadedState: {
      auth: {
        user: mockUser,
        isAuthenticated: true,
        loading: false,
        error: null,
      },
      ui: {
        sidebarCollapsed: false,
        theme: 'light',
        language: 'en',
      },
    },
  });
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const store = createMockStore();

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ThemeProvider>
            <AuthProvider>{children}</AuthProvider>
          </ThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  );
};

describe('Auth Redux Mock Debug', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Redux hooks
    mockUseAppSelector.mockImplementation(selector => {
      const mockState = {
        auth: {
          user: mockUser,
          isAuthenticated: true,
          loading: false,
          error: null,
        },
        ui: {
          sidebarCollapsed: false,
          theme: 'light',
          language: 'en',
        },
      };
      return selector(mockState);
    });

    mockUseAppDispatch.mockReturnValue(jest.fn());
  });

  it('should render MainLayout with mocked user data', async () => {
    render(
      <TestWrapper>
        <MainLayout>
          <div>Test Content</div>
        </MainLayout>
      </TestWrapper>
    );

    // Debug: Print all text content
    console.log('=== All text content ===');
    console.log(screen.getByRole('main').textContent);

    console.log('=== Document body ===');
    console.log(document.body.textContent);

    // Check if testuser is present
    const elementsWithTest = screen.queryAllByText(/test/i);
    console.log(
      'Elements with "test":',
      elementsWithTest.map(el => el.textContent)
    );

    const elementsWithTestuser = screen.queryAllByText(/testuser/i);
    console.log(
      'Elements with "testuser":',
      elementsWithTestuser.map(el => el.textContent)
    );

    // Check Redux mock calls
    console.log('useAppSelector calls:', mockUseAppSelector.mock.calls.length);
    console.log('useAppDispatch calls:', mockUseAppDispatch.mock.calls.length);
  });
});
