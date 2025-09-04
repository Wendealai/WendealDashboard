import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { AuthProvider } from '../../contexts/AuthContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { MainLayout } from '../../components/Layout';
import authSlice from '../../store/slices/authSlice';
import { uiSlice } from '../../store/slices/uiSlice';
import type { User } from '../../types/auth';
import { UserRole } from '../../types/auth';

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
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const testStore = configureStore({
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

  return (
    <Provider store={testStore}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <BrowserRouter>
            <AuthProvider>{children}</AuthProvider>
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>
  );
};

describe('MainLayout User Display Debug', () => {
  test('should display user information correctly', async () => {
    render(
      <TestWrapper>
        <MainLayout />
      </TestWrapper>
    );

    // Debug: Print entire DOM structure
    console.log('=== DOM Structure ===');
    console.log(document.body.innerHTML);

    // Debug: Find all elements containing testuser
    const elementsWithTestuser = screen.queryAllByText(/testuser/i);
    console.log(
      'Elements with "testuser":',
      elementsWithTestuser.map(el => el.textContent)
    );

    // Debug: Find all elements containing user-related text
    const userElements = screen.queryAllByText(/user|admin|logged/i);
    console.log(
      'User-related elements:',
      userElements.map(el => el.textContent)
    );

    // Try to find testuser text
    const testUserElement = screen.queryByText('testuser');
    console.log('testuser element found:', !!testUserElement);

    if (testUserElement) {
      console.log('testuser element content:', testUserElement.textContent);
    }

    // Verify if username is displayed
    expect(screen.getByText('testuser')).toBeInTheDocument();
  });
});
