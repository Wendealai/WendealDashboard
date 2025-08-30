import AuthService from '../auth';
import ApiService from '../api';
import type { LoginRequest, RegisterRequest, User } from '../auth';

// Mock ApiService
jest.mock('@/services/api');
const mockApiService = ApiService as jest.Mocked<typeof ApiService>;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
  });

  describe('login', () => {
    it('should login successfully and store token', async () => {
      const loginData: LoginRequest = {
        username: 'testuser',
        password: 'password123',
      };

      const mockResponse = {
        data: {
          data: {
            user: {
              id: '1',
              username: 'testuser',
              email: 'test@example.com',
              avatar: 'avatar.jpg',
              role: 'user',
              permissions: ['read'],
              createdAt: '2024-01-01T00:00:00Z',
              lastLoginAt: '2024-01-01T00:00:00Z',
            },
            token: 'mock-jwt-token',
            refreshToken: 'mock-refresh-token',
          },
        },
      };

      mockApiService.post.mockResolvedValue(mockResponse.data.data);

      const result = await AuthService.login(loginData);

      expect(mockApiService.post).toHaveBeenCalledWith(
        '/auth/login',
        loginData
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'token',
        'mock-jwt-token'
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'refreshToken',
        'mock-refresh-token'
      );
      expect(result).toEqual(mockResponse.data.data);
    });

    it('should handle login failure', async () => {
      const loginData: LoginRequest = {
        username: 'testuser',
        password: 'wrongpassword',
      };

      const mockError = new Error('Invalid credentials');
      mockApiService.post.mockRejectedValue(mockError);

      await expect(AuthService.login(loginData)).rejects.toThrow(
        'Invalid credentials'
      );
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('should register successfully', async () => {
      const registerData: RegisterRequest = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      };

      const mockResponse = {
        data: {
          data: {
            user: {
              id: '2',
              username: 'newuser',
              email: 'newuser@example.com',
              avatar: '',
              role: 'user',
              permissions: ['read'],
              createdAt: '2024-01-01T00:00:00Z',
            },
            token: 'mock-jwt-token',
            refreshToken: 'mock-refresh-token',
          },
        },
      };

      mockApiService.post.mockResolvedValue(mockResponse.data.data);

      const result = await AuthService.register(registerData);

      expect(mockApiService.post).toHaveBeenCalledWith(
        '/auth/register',
        registerData
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'token',
        'mock-jwt-token'
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'refreshToken',
        'mock-refresh-token'
      );
      expect(result).toEqual(mockResponse.data.data);
    });

    it('should handle registration failure', async () => {
      const registerData: RegisterRequest = {
        username: 'existinguser',
        email: 'existing@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      };

      const mockError = new Error('User already exists');
      mockApiService.post.mockRejectedValue(mockError);

      await expect(AuthService.register(registerData)).rejects.toThrow(
        'User already exists'
      );
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should logout successfully and clear tokens', async () => {
      mockLocalStorage.getItem.mockReturnValue('mock-refresh-token');
      mockApiService.post.mockResolvedValue({ data: { success: true } });

      await AuthService.logout();

      expect(mockApiService.post).toHaveBeenCalledWith('/auth/logout', {
        refreshToken: 'mock-refresh-token',
      });
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('refreshToken');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user');
    });

    it('should clear tokens even if API call fails', async () => {
      mockLocalStorage.getItem.mockReturnValue('mock-refresh-token');
      mockApiService.post.mockRejectedValue(new Error('Network error'));

      // logout方法应该不抛出错误，即使API调用失败
      await AuthService.logout();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('refreshToken');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user');
    });
  });

  describe('getCurrentUser', () => {
    it('should get current user successfully', async () => {
      const mockUser: User = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        avatar: 'avatar.jpg',
        role: 'user',
        permissions: ['read'],
        createdAt: '2024-01-01T00:00:00Z',
        lastLoginAt: '2024-01-01T00:00:00Z',
      };

      mockApiService.get.mockResolvedValue(mockUser);

      const result = await AuthService.getCurrentUser();

      expect(mockApiService.get).toHaveBeenCalledWith('/auth/me');
      expect(result).toEqual(mockUser);
    });

    it('should handle unauthorized error', async () => {
      const mockError = new Error('Unauthorized');
      mockApiService.get.mockRejectedValue(mockError);

      await expect(AuthService.getCurrentUser()).rejects.toThrow(
        'Unauthorized'
      );
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      mockLocalStorage.getItem.mockReturnValue('mock-refresh-token');

      const mockResponse = {
        data: {
          data: {
            token: 'new-jwt-token',
            refreshToken: 'new-refresh-token',
            user: {
              id: '1',
              username: 'testuser',
              email: 'test@example.com',
            },
          },
        },
      };

      mockApiService.post.mockResolvedValue(mockResponse.data.data);

      const result = await AuthService.refreshToken();

      expect(mockApiService.post).toHaveBeenCalledWith('/auth/refresh', {
        refreshToken: 'mock-refresh-token',
      });
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'token',
        'new-jwt-token'
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'refreshToken',
        'new-refresh-token'
      );
      expect(result).toEqual(mockResponse.data.data);
    });

    it('should throw error when no refresh token available', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      await expect(AuthService.refreshToken()).rejects.toThrow(
        'No refresh token available'
      );
      expect(mockApiService.post).not.toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const userData = {
        username: 'updateduser',
        email: 'updated@example.com',
        avatar: 'new-avatar.jpg',
      };

      const mockResponse = {
        data: {
          data: {
            id: '1',
            username: 'updateduser',
            email: 'updated@example.com',
            avatar: 'new-avatar.jpg',
            role: 'user',
            permissions: ['read'],
            createdAt: '2024-01-01T00:00:00Z',
            lastLoginAt: '2024-01-01T00:00:00Z',
          },
        },
      };

      mockApiService.put.mockResolvedValue(mockResponse.data.data);

      const result = await AuthService.updateUser(userData);

      expect(mockApiService.put).toHaveBeenCalledWith(
        '/auth/profile',
        userData
      );
      expect(result).toEqual(mockResponse.data.data);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const passwordData = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword',
        confirmPassword: 'newpassword',
      };

      mockApiService.post.mockResolvedValue({ data: { success: true } });

      await AuthService.changePassword(passwordData);

      expect(mockApiService.post).toHaveBeenCalledWith(
        '/auth/change-password',
        passwordData
      );
    });
  });

  describe('token management', () => {
    it('should get token from localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue('stored-token');

      const token = AuthService.getLocalToken();

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('token');
      expect(token).toBe('stored-token');
    });

    it('should return null when no token stored', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const token = AuthService.getLocalToken();

      expect(token).toBeNull();
    });

    it('should check if user is authenticated', () => {
      mockLocalStorage.getItem.mockImplementation(key => {
        if (key === 'token') return 'valid-token';
        if (key === 'user')
          return JSON.stringify({ id: '1', username: 'test' });
        return null;
      });

      const isAuthenticated = AuthService.isAuthenticated();

      expect(isAuthenticated).toBe(true);
    });

    it('should return false when no token available', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const isAuthenticated = AuthService.isAuthenticated();

      expect(isAuthenticated).toBe(false);
    });
  });

  describe('password reset', () => {
    it('should send forgot password email successfully', async () => {
      mockApiService.post.mockResolvedValue({ data: { success: true } });

      await AuthService.forgotPassword('test@example.com');

      expect(mockApiService.post).toHaveBeenCalledWith(
        '/auth/forgot-password',
        {
          email: 'test@example.com',
        }
      );
    });

    it('should reset password successfully', async () => {
      const token = 'reset-token';
      const password = 'newpassword';

      mockApiService.post.mockResolvedValue({ data: { success: true } });

      await AuthService.resetPassword(token, password);

      expect(mockApiService.post).toHaveBeenCalledWith('/auth/reset-password', {
        token,
        password,
      });
    });
  });
});
