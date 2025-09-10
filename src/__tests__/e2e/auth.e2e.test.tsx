import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import App from '@/App';
import { server } from '@/mocks/server';
import { rest } from 'msw';

// Start MSW server
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Authentication E2E Tests', () => {
  beforeEach(() => {
    // Clear local storage
    localStorage.clear();
    sessionStorage.clear();

    // Reset URL
    window.history.pushState({}, '', '/');
  });

  it('should complete full login flow', async () => {
    renderWithProviders(<App />);

    // Verify redirect to login page
    await waitFor(() => {
      expect(screen.getByText('User Login')).toBeInTheDocument();
    });

    // Fill login form
    const usernameInput = screen.getByPlaceholderText('Enter username');
    const passwordInput = screen.getByPlaceholderText('Enter password');
    const loginButton = screen.getByRole('button', { name: 'Login' });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(loginButton);

    // Verify successful login and redirect to dashboard
    await waitFor(
      () => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Verify user info display
    expect(screen.getByText('Test User')).toBeInTheDocument();

    // Verify navigation menu
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('System Settings')).toBeInTheDocument();

    // Verify token storage
    expect(localStorage.getItem('token')).toBeTruthy();
  });

  it('should handle login with invalid credentials', async () => {
    // Mock login failure
    server.use(
      rest.post('/api/auth/login', (req, res, ctx) => {
        return res(
          ctx.status(401),
          ctx.json({ message: 'Invalid username or password' })
        );
      })
    );

    renderWithProviders(<App />);

    await waitFor(() => {
      expect(screen.getByText('User Login')).toBeInTheDocument();
    });

    // Fill incorrect login information
    const usernameInput = screen.getByPlaceholderText('Enter username');
    const passwordInput = screen.getByPlaceholderText('Enter password');
    const loginButton = screen.getByRole('button', { name: 'Login' });

    fireEvent.change(usernameInput, { target: { value: 'wronguser' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(loginButton);

    // Verify error message display
    await waitFor(() => {
      expect(
        screen.getByText('Invalid username or password')
      ).toBeInTheDocument();
    });

    // Verify still on login page
    expect(screen.getByText('User Login')).toBeInTheDocument();

    // Verify no token storage
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('should complete registration flow', async () => {
    renderWithProviders(<App />);

    await waitFor(() => {
      expect(screen.getByText('User Login')).toBeInTheDocument();
    });

    // Click register link
    const registerLink = screen.getByText('Register Now');
    fireEvent.click(registerLink);

    // Verify redirect to registration page
    await waitFor(() => {
      expect(screen.getByText('User Registration')).toBeInTheDocument();
    });

    // Fill registration form
    const usernameInput = screen.getByPlaceholderText('Enter username');
    const emailInput = screen.getByPlaceholderText('Enter email');
    const passwordInput = screen.getByPlaceholderText('Enter password');
    const confirmPasswordInput =
      screen.getByPlaceholderText('Confirm password');
    const registerButton = screen.getByRole('button', { name: 'Register' });

    fireEvent.change(usernameInput, { target: { value: 'newuser' } });
    fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, {
      target: { value: 'password123' },
    });

    // Agree to terms
    const agreeCheckbox = screen.getByRole('checkbox');
    fireEvent.click(agreeCheckbox);

    fireEvent.click(registerButton);

    // Verify registration success message
    await waitFor(() => {
      expect(
        screen.getByText('Registration successful, please login')
      ).toBeInTheDocument();
    });

    // Verify automatic redirect to login page
    await waitFor(() => {
      expect(screen.getByText('User Login')).toBeInTheDocument();
    });
  });

  it('should handle logout flow', async () => {
    // First set logged in state
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

    // Verify logged in state
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    // Click user avatar to open dropdown menu
    const userAvatar = screen.getByTestId('user-avatar');
    fireEvent.click(userAvatar);

    // Click logout
    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);

    // Verify confirmation dialog
    await waitFor(() => {
      expect(screen.getByText('Confirm logout?')).toBeInTheDocument();
    });

    // Confirm logout
    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    fireEvent.click(confirmButton);

    // Verify redirect to login page
    await waitFor(() => {
      expect(screen.getByText('User Login')).toBeInTheDocument();
    });

    // Verify token is cleared
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('should handle password reset flow', async () => {
    renderWithProviders(<App />);

    await waitFor(() => {
      expect(screen.getByText('User Login')).toBeInTheDocument();
    });

    // Click forgot password link
    const forgotPasswordLink = screen.getByText('Forgot Password?');
    fireEvent.click(forgotPasswordLink);

    // Verify redirect to password reset page
    await waitFor(() => {
      expect(screen.getByText('Reset Password')).toBeInTheDocument();
    });

    // Enter email
    const emailInput = screen.getByPlaceholderText('Enter registered email');
    const sendCodeButton = screen.getByRole('button', { name: 'Send Code' });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(sendCodeButton);

    // Verify verification code sent successfully
    await waitFor(() => {
      expect(
        screen.getByText('Verification code sent to your email')
      ).toBeInTheDocument();
    });

    // Enter verification code and new password
    const codeInput = screen.getByPlaceholderText('Enter verification code');
    const newPasswordInput = screen.getByPlaceholderText('Enter new password');
    const confirmPasswordInput = screen.getByPlaceholderText(
      'Confirm new password'
    );
    const resetButton = screen.getByRole('button', { name: 'Reset Password' });

    fireEvent.change(codeInput, { target: { value: '123456' } });
    fireEvent.change(newPasswordInput, { target: { value: 'newpassword123' } });
    fireEvent.change(confirmPasswordInput, {
      target: { value: 'newpassword123' },
    });
    fireEvent.click(resetButton);

    // Verify password reset successful
    await waitFor(() => {
      expect(
        screen.getByText(
          'Password reset successful, please login with new password'
        )
      ).toBeInTheDocument();
    });

    // Verify redirect to login page
    await waitFor(() => {
      expect(screen.getByText('User Login')).toBeInTheDocument();
    });
  });

  it('should handle session expiration', async () => {
    // Set expired token
    localStorage.setItem('token', 'expired-token');

    // Mock token validation failure
    server.use(
      rest.get('/api/auth/me', (req, res, ctx) => {
        return res(ctx.status(401), ctx.json({ message: 'Token expired' }));
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

    // Verify automatic redirect to login page
    await waitFor(() => {
      expect(screen.getByText('User Login')).toBeInTheDocument();
    });

    // Verify session expired message display
    expect(
      screen.getByText('Session expired, please login again')
    ).toBeInTheDocument();

    // Verify token is cleared
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('should handle remember me functionality', async () => {
    renderWithProviders(<App />);

    await waitFor(() => {
      expect(screen.getByText('User Login')).toBeInTheDocument();
    });

    // Fill login form and check remember me
    const usernameInput = screen.getByPlaceholderText('Enter username');
    const passwordInput = screen.getByPlaceholderText('Enter password');
    const rememberCheckbox = screen.getByLabelText('Remember me');
    const loginButton = screen.getByRole('button', { name: 'Login' });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(rememberCheckbox);
    fireEvent.click(loginButton);

    // Verify login successful
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    // Verify remember me info is saved
    expect(localStorage.getItem('rememberMe')).toBe('true');
    expect(localStorage.getItem('savedUsername')).toBe('testuser');
  });

  it('should handle auto-login with valid token', async () => {
    // Set valid token
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

    // Verify automatic redirect to dashboard (no login required)
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    // Verify user info display
    expect(screen.getByText('testuser')).toBeInTheDocument();
  });
});
