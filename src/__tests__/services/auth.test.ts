import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LocalAuthService } from '../../services/auth/LocalAuthService';
import { PermissionService } from '../../services/auth/PermissionService';
import { tokenUtils, userUtils, sessionUtils } from '../../utils/auth';
import type { User, LoginCredentials, RegisterData } from '../../types/auth';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock console methods
const consoleMock = {
  error: vi.fn(),
  warn: vi.fn(),
  log: vi.fn(),
};

Object.defineProperty(console, 'error', { value: consoleMock.error });
Object.defineProperty(console, 'warn', { value: consoleMock.warn });
Object.defineProperty(console, 'log', { value: consoleMock.log });

// Test data
const mockUser: User = {
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  role: 'user',
  avatar: 'https://example.com/avatar.jpg',
  displayName: 'Test User',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockAdminUser: User = {
  ...mockUser,
  id: '2',
  username: 'admin',
  email: 'admin@example.com',
  role: 'admin',
  displayName: 'Admin User',
};

const mockLoginCredentials: LoginCredentials = {
  username: 'testuser',
  password: 'Test123!@#',
};

const mockRegisterData: RegisterData = {
  username: 'newuser',
  email: 'newuser@example.com',
  password: 'Test123!@#',
  confirmPassword: 'Test123!@#',
};

const mockToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6InRlc3R1c2VyIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.test';
const mockRefreshToken = 'refresh_token_123';

describe('LocalAuthService', () => {
  let authService: LocalAuthService;

  beforeEach(() => {
    authService = new LocalAuthService();
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const result = await authService.login(mockLoginCredentials);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user?.username).toBe(mockLoginCredentials.username);
    });

    it('should fail login with invalid username', async () => {
      const invalidCredentials = {
        username: 'invaliduser',
        password: 'Test123!@#',
      };

      const result = await authService.login(invalidCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid username or password');
      expect(result.user).toBeUndefined();
      expect(result.token).toBeUndefined();
    });

    it('should fail login with invalid password', async () => {
      const invalidCredentials = {
        username: 'testuser',
        password: 'wrongpassword',
      };

      const result = await authService.login(invalidCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid username or password');
    });

    it('should fail login with empty credentials', async () => {
      const emptyCredentials = {
        username: '',
        password: '',
      };

      const result = await authService.login(emptyCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Username and password cannot be empty');
    });
  });

  describe('register', () => {
    it('should register successfully with valid data', async () => {
      const result = await authService.register(mockRegisterData);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user?.username).toBe(mockRegisterData.username);
      expect(result.user?.email).toBe(mockRegisterData.email);
    });

    it('should fail registration with existing username', async () => {
      const existingUserData = {
        ...mockRegisterData,
        username: 'testuser', // Existing username
      };

      const result = await authService.register(existingUserData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Username already exists');
    });

    it('should fail registration with existing email', async () => {
      const existingEmailData = {
        ...mockRegisterData,
        email: 'test@example.com', // Existing email
      };

      const result = await authService.register(existingEmailData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email already registered');
    });

    it('should fail registration with mismatched passwords', async () => {
      const mismatchedPasswordData = {
        ...mockRegisterData,
        confirmPassword: 'DifferentPassword123!',
      };

      const result = await authService.register(mismatchedPasswordData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Password confirmation does not match');
    });

    it('should fail registration with invalid email format', async () => {
      const invalidEmailData = {
        ...mockRegisterData,
        email: 'invalid-email',
      };

      const result = await authService.register(invalidEmailData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email format');
    });

    it('should fail registration with weak password', async () => {
      const weakPasswordData = {
        ...mockRegisterData,
        password: '123',
        confirmPassword: '123',
      };

      const result = await authService.register(weakPasswordData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('password');
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      // Mock logged in state
      localStorageMock.getItem.mockImplementation(key => {
        if (key === 'wendeal_auth_token') return mockToken;
        if (key === 'wendeal_refresh_token') return mockRefreshToken;
        if (key === 'wendeal_user_info') return JSON.stringify(mockUser);
        return null;
      });

      const result = await authService.logout();

      expect(result.success).toBe(true);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        'wendeal_auth_token'
      );
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        'wendeal_refresh_token'
      );
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        'wendeal_user_info'
      );
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user when logged in', async () => {
      localStorageMock.getItem.mockImplementation(key => {
        if (key === 'wendeal_auth_token') return mockToken;
        if (key === 'wendeal_user_info') return JSON.stringify(mockUser);
        return null;
      });

      const result = await authService.getCurrentUser();

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
    });

    it('should return null when not logged in', async () => {
      const result = await authService.getCurrentUser();

      expect(result.success).toBe(false);
      expect(result.user).toBeNull();
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      localStorageMock.getItem.mockImplementation(key => {
        if (key === 'wendeal_refresh_token') return mockRefreshToken;
        return null;
      });

      const result = await authService.refreshToken();

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should fail to refresh token when refresh token is missing', async () => {
      const result = await authService.refreshToken();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Refresh token not found');
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      localStorageMock.getItem.mockImplementation(key => {
        if (key === 'wendeal_auth_token') return mockToken;
        if (key === 'wendeal_user_info') return JSON.stringify(mockUser);
        return null;
      });

      const updateData = {
        displayName: 'Updated Name',
        avatar: 'https://example.com/new-avatar.jpg',
      };

      const result = await authService.updateProfile(updateData);

      expect(result.success).toBe(true);
      expect(result.user?.displayName).toBe(updateData.displayName);
      expect(result.user?.avatar).toBe(updateData.avatar);
    });

    it('should fail to update profile when not logged in', async () => {
      const updateData = {
        displayName: 'Updated Name',
      };

      const result = await authService.updateProfile(updateData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not logged in');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      localStorageMock.getItem.mockImplementation(key => {
        if (key === 'wendeal_auth_token') return mockToken;
        if (key === 'wendeal_user_info') return JSON.stringify(mockUser);
        return null;
      });

      const result = await authService.changePassword(
        'Test123!@#',
        'NewPassword123!@#'
      );

      expect(result.success).toBe(true);
    });

    it('should fail to change password with wrong current password', async () => {
      localStorageMock.getItem.mockImplementation(key => {
        if (key === 'wendeal_auth_token') return mockToken;
        if (key === 'wendeal_user_info') return JSON.stringify(mockUser);
        return null;
      });

      const result = await authService.changePassword(
        'WrongPassword',
        'NewPassword123!@#'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Current password is incorrect');
    });

    it('should fail to change password when not logged in', async () => {
      const result = await authService.changePassword(
        'Test123!@#',
        'NewPassword123!@#'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not logged in');
    });
  });
});

describe('PermissionService', () => {
  let permissionService: PermissionService;

  beforeEach(() => {
    permissionService = new PermissionService();
    vi.clearAllMocks();
  });

  describe('hasRole', () => {
    it('should return true when user has required role', () => {
      const result = permissionService.hasRole(mockUser, ['user']);
      expect(result).toBe(true);
    });

    it('should return true when user has one of multiple required roles', () => {
      const result = permissionService.hasRole(mockAdminUser, [
        'user',
        'admin',
      ]);
      expect(result).toBe(true);
    });

    it('should return false when user does not have required role', () => {
      const result = permissionService.hasRole(mockUser, ['admin']);
      expect(result).toBe(false);
    });

    it('should return false when user is null', () => {
      const result = permissionService.hasRole(null, ['user']);
      expect(result).toBe(false);
    });
  });

  describe('isAdmin', () => {
    it('should return true for admin user', () => {
      const result = permissionService.isAdmin(mockAdminUser);
      expect(result).toBe(true);
    });

    it('should return false for regular user', () => {
      const result = permissionService.isAdmin(mockUser);
      expect(result).toBe(false);
    });

    it('should return false for null user', () => {
      const result = permissionService.isAdmin(null);
      expect(result).toBe(false);
    });
  });

  describe('isUser', () => {
    it('should return true for regular user', () => {
      const result = permissionService.isUser(mockUser);
      expect(result).toBe(true);
    });

    it('should return false for admin user', () => {
      const result = permissionService.isUser(mockAdminUser);
      expect(result).toBe(false);
    });

    it('should return false for null user', () => {
      const result = permissionService.isUser(null);
      expect(result).toBe(false);
    });
  });

  describe('canAccess', () => {
    it('should allow access to public paths without authentication', () => {
      const publicPaths = ['/', '/login', '/register'];

      publicPaths.forEach(path => {
        const result = permissionService.canAccess(null, path);
        expect(result).toBe(true);
      });
    });

    it('should deny access to protected paths without authentication', () => {
      const protectedPaths = ['/dashboard', '/profile', '/admin'];

      protectedPaths.forEach(path => {
        const result = permissionService.canAccess(null, path);
        expect(result).toBe(false);
      });
    });

    it('should allow access to general protected paths for authenticated users', () => {
      const result = permissionService.canAccess(mockUser, '/dashboard');
      expect(result).toBe(true);
    });

    it('should allow access to admin paths for admin users', () => {
      const result = permissionService.canAccess(mockAdminUser, '/admin', [
        'admin',
      ]);
      expect(result).toBe(true);
    });

    it('should deny access to admin paths for regular users', () => {
      const result = permissionService.canAccess(mockUser, '/admin', ['admin']);
      expect(result).toBe(false);
    });
  });

  describe('canPerform', () => {
    it('should allow admin to perform any action', () => {
      const actions = ['create', 'read', 'update', 'delete'];

      actions.forEach(action => {
        const result = permissionService.canPerform(
          mockAdminUser,
          action,
          'user'
        );
        expect(result).toBe(true);
      });
    });

    it('should allow users to read and update their own resources', () => {
      const readResult = permissionService.canPerform(
        mockUser,
        'read',
        'user',
        mockUser.id
      );
      const updateResult = permissionService.canPerform(
        mockUser,
        'update',
        'user',
        mockUser.id
      );

      expect(readResult).toBe(true);
      expect(updateResult).toBe(true);
    });

    it('should deny users from modifying other users resources', () => {
      const updateResult = permissionService.canPerform(
        mockUser,
        'update',
        'user',
        'other-user-id'
      );
      const deleteResult = permissionService.canPerform(
        mockUser,
        'delete',
        'user',
        'other-user-id'
      );

      expect(updateResult).toBe(false);
      expect(deleteResult).toBe(false);
    });

    it('should deny unauthenticated users from performing actions', () => {
      const result = permissionService.canPerform(null, 'read', 'user');
      expect(result).toBe(false);
    });
  });

  describe('getPermissions', () => {
    it('should return admin permissions for admin user', () => {
      const permissions = permissionService.getPermissions(mockAdminUser);

      expect(permissions).toContain('admin:read');
      expect(permissions).toContain('admin:write');
      expect(permissions).toContain('user:read');
      expect(permissions).toContain('user:write');
    });

    it('should return user permissions for regular user', () => {
      const permissions = permissionService.getPermissions(mockUser);

      expect(permissions).toContain('user:read');
      expect(permissions).toContain('user:write');
      expect(permissions).not.toContain('admin:read');
      expect(permissions).not.toContain('admin:write');
    });

    it('should return empty permissions for null user', () => {
      const permissions = permissionService.getPermissions(null);
      expect(permissions).toEqual([]);
    });
  });
});

// 工具函数测试
describe('Auth Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('tokenUtils', () => {
    it('should store and retrieve token', () => {
      tokenUtils.setToken(mockToken);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'wendeal_auth_token',
        mockToken
      );

      localStorageMock.getItem.mockReturnValue(mockToken);
      const retrievedToken = tokenUtils.getToken();
      expect(retrievedToken).toBe(mockToken);
    });

    it('should remove token', () => {
      tokenUtils.removeToken();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        'wendeal_auth_token'
      );
    });

    it('should check if token exists', () => {
      localStorageMock.getItem.mockReturnValue(mockToken);
      expect(tokenUtils.hasToken()).toBe(true);

      localStorageMock.getItem.mockReturnValue(null);
      expect(tokenUtils.hasToken()).toBe(false);
    });
  });

  describe('userUtils', () => {
    it('should store and retrieve user', () => {
      userUtils.setUser(mockUser);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'wendeal_user_info',
        JSON.stringify(mockUser)
      );

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser));
      const retrievedUser = userUtils.getUser();
      expect(retrievedUser).toEqual(mockUser);
    });

    it('should update user', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser));

      const updates = { displayName: 'Updated Name' };
      const updatedUser = userUtils.updateUser(updates);

      expect(updatedUser?.displayName).toBe('Updated Name');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'wendeal_user_info',
        JSON.stringify({ ...mockUser, ...updates })
      );
    });
  });

  describe('sessionUtils', () => {
    it('should check if user is logged in', () => {
      localStorageMock.getItem.mockImplementation(key => {
        if (key === 'wendeal_auth_token') return mockToken;
        if (key === 'wendeal_user_info') return JSON.stringify(mockUser);
        return null;
      });

      expect(sessionUtils.isLoggedIn()).toBe(true);
    });

    it('should clear session', () => {
      sessionUtils.clearSession();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        'wendeal_auth_token'
      );
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        'wendeal_refresh_token'
      );
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        'wendeal_user_info'
      );
    });
  });
});
