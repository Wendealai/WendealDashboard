// 本地认证服务实现
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
  User,
  AuthConfig,
  // Permission,
  AuthError,
  AuthErrorTypeValue,
} from '../../types/auth';
import { AuthErrorType, UserRole } from '../../types/auth';
import type { IAuthService } from './IAuthService';

/**
 * 本地认证服务实现
 * 用于本地开发环境，提供简单的用户名密码认证
 */
export class LocalAuthService implements IAuthService {
  private currentUser: User | null = null;
  private token: string | null = null;
  private refreshTokenValue: string | null = null;
  private config: AuthConfig | null = null;
  private authStateListeners: Array<
    (isAuthenticated: boolean, user: User | null) => void
  > = [];

  // 预设测试账户
  private readonly testUsers: User[] = [
    {
      id: 'admin-001',
      username: 'admin',
      email: 'admin@wendeal.com',
      firstName: 'Admin',
      lastName: 'User',
      avatar: '',
      role: UserRole.ADMIN,
      permissions: ['perm-001', 'perm-002', 'perm-003', 'perm-004'],
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      lastLoginAt: '2024-01-01T00:00:00.000Z' as string,
    } as User,
    {
      id: 'user-001',
      username: 'user',
      email: 'user@wendeal.com',
      firstName: 'Regular',
      lastName: 'User',
      avatar: '',
      role: UserRole.USER,
      permissions: ['dashboard.read'],
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      lastLoginAt: '2024-01-01T00:00:00.000Z' as string,
    } as User,
    {
      id: 'wendeal-001',
      username: 'wendeal',
      email: 'wendeal@wendeal.com',
      firstName: 'Wendeal',
      lastName: 'User',
      avatar: '',
      role: UserRole.ADMIN,
      permissions: ['perm-001', 'perm-002', 'perm-003', 'perm-004'],
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      lastLoginAt: '2024-01-01T00:00:00.000Z' as string,
    } as User,
  ];

  // 预设密码映射（实际应用中应该使用哈希存储）
  private readonly testPasswords: Record<string, string> = {
    admin: 'admin',
    user: 'user',
    wendeal: 'zwyy0323',
  };

  async initialize(config: AuthConfig): Promise<void> {
    this.config = config;

    // 尝试从本地存储恢复认证状态（优先 localStorage，回退 sessionStorage）
    let storedToken = localStorage.getItem('auth_token');
    let storedUser = localStorage.getItem('auth_user');

    if (!storedToken || !storedUser) {
      storedToken = storedToken || sessionStorage.getItem('auth_token');
      storedUser = storedUser || sessionStorage.getItem('auth_user');
    }

    if (storedToken && storedUser) {
      try {
        this.token = storedToken;
        this.currentUser = JSON.parse(storedUser);

        // 验证令牌是否仍然有效
        const isValid = await this.validateToken(storedToken);
        if (!isValid) {
          this.clearAuthState();
        }
      } catch (error) {
        console.error('Failed to restore auth state:', error);
        this.clearAuthState();
      }
    }
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const { username, password, rememberMe } = credentials;

    // 查找用户
    const user = this.testUsers.find(u => u.username === username);
    if (!user) {
      throw this.createAuthError(AuthErrorType.USER_NOT_FOUND, '用户不存在');
    }

    // 检查用户是否激活
    if (!user.isActive) {
      throw this.createAuthError(
        AuthErrorType.USER_INACTIVE,
        '用户账户已被禁用'
      );
    }

    // 验证密码
    const expectedPassword = this.testPasswords[username];
    if (password !== expectedPassword) {
      throw this.createAuthError(
        AuthErrorType.INVALID_CREDENTIALS,
        '用户名或密码错误'
      );
    }

    // 生成令牌
    const token = this.generateToken(user.id);
    const refreshToken = this.generateRefreshToken(user.id);

    // 更新用户最后登录时间
    const updatedUser: User = {
      ...user,
      lastLoginAt: new Date().toISOString() as string,
      updatedAt: new Date().toISOString(),
    } as User;

    // 设置认证状态
    this.currentUser = updatedUser;
    this.token = token;
    this.refreshTokenValue = refreshToken;

    // 存储到本地存储（如果记住我）
    if (rememberMe) {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
      localStorage.setItem('auth_refresh_token', refreshToken);
    } else {
      sessionStorage.setItem('auth_token', token);
      sessionStorage.setItem('auth_user', JSON.stringify(updatedUser));
    }

    // 通知状态变化
    this.notifyAuthStateChange(true, updatedUser);

    const expiresIn = this.config?.tokenExpirationTime || 3600; // 默认1小时

    return {
      user: updatedUser,
      token,
      refreshToken,
      expiresIn,
    };
  }

  async register(userData: RegisterRequest): Promise<User> {
    console.log('🔐 LocalAuthService.register called with:', {
      username: userData.username,
      email: userData.email,
    });
    const { username, email, password, firstName, lastName } = userData;

    // 检查用户名是否已存在
    console.log('🔍 Checking if username exists:', username);
    if (this.testUsers.some(u => u.username === username)) {
      console.error('❌ Username already exists:', username);
      throw this.createAuthError(
        AuthErrorType.USERNAME_ALREADY_EXISTS,
        '用户名已存在'
      );
    }

    // 检查邮箱是否已存在
    console.log('📧 Checking if email exists:', email);
    if (this.testUsers.some(u => u.email === email)) {
      console.error('❌ Email already exists:', email);
      throw this.createAuthError(
        AuthErrorType.EMAIL_ALREADY_EXISTS,
        '邮箱已存在'
      );
    }
    console.log('✅ Username and email are available');

    // 创建新用户
    console.log('👤 Creating new user...');
    const newUser: User = {
      id: `user-${Date.now()}`,
      username,
      email,
      firstName: firstName || '',
      lastName: lastName || '',
      avatar: '',
      role: UserRole.USER, // 默认为普通用户角色
      permissions: ['dashboard.read'],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString() as string,
    } as User;

    // 添加到测试用户列表
    console.log('💾 Adding user to test users list...');
    this.testUsers.push(newUser);
    this.testPasswords[username] = password;
    console.log('🎉 User registration successful:', newUser.username);

    return newUser;
  }

  async logout(): Promise<void> {
    // 清除存储的认证信息
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_refresh_token');
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_user');

    // 清除内存中的认证状态
    const wasAuthenticated = this.isAuthenticated();
    this.currentUser = null;
    this.token = null;
    this.refreshTokenValue = null;

    // 通知状态变化
    if (wasAuthenticated) {
      this.notifyAuthStateChange(false, null);
    }
  }

  async refreshToken(refreshToken: string): Promise<LoginResponse> {
    if (!this.currentUser || this.refreshTokenValue !== refreshToken) {
      throw this.createAuthError(AuthErrorType.TOKEN_INVALID, '刷新令牌无效');
    }

    // 生成新的令牌
    const newToken = this.generateToken(this.currentUser.id);
    const newRefreshToken = this.generateRefreshToken(this.currentUser.id);

    this.token = newToken;
    this.refreshTokenValue = newRefreshToken;

    // 更新存储
    const storage = localStorage.getItem('auth_token')
      ? localStorage
      : sessionStorage;
    storage.setItem('auth_token', newToken);
    if (localStorage.getItem('auth_refresh_token')) {
      localStorage.setItem('auth_refresh_token', newRefreshToken);
    }

    const expiresIn = this.config?.tokenExpirationTime || 3600;

    return {
      user: this.currentUser,
      token: newToken,
      refreshToken: newRefreshToken,
      expiresIn,
    };
  }

  async getCurrentUser(): Promise<User | null> {
    return this.currentUser;
  }

  async updateProfile(data: UpdateProfileRequest): Promise<User> {
    if (!this.currentUser) {
      throw this.createAuthError(AuthErrorType.TOKEN_INVALID, '用户未登录');
    }

    const updatedUser: User = {
      ...this.currentUser,
      ...data,
      updatedAt: new Date().toISOString(),
      lastLoginAt: (this.currentUser.lastLoginAt ??
        new Date().toISOString()) as string,
    } as User;

    this.currentUser = updatedUser;

    // 更新存储
    const storage = localStorage.getItem('auth_user')
      ? localStorage
      : sessionStorage;
    storage.setItem('auth_user', JSON.stringify(updatedUser));

    return updatedUser;
  }

  async changePassword(data: ChangePasswordRequest): Promise<void> {
    if (!this.currentUser) {
      throw this.createAuthError(AuthErrorType.TOKEN_INVALID, '用户未登录');
    }

    const { currentPassword, newPassword, confirmPassword } = data;

    // 验证当前密码
    const expectedPassword = this.testPasswords[this.currentUser.username];
    if (currentPassword !== expectedPassword) {
      throw this.createAuthError(
        AuthErrorType.INVALID_CREDENTIALS,
        '当前密码错误'
      );
    }

    // 验证新密码确认
    if (newPassword !== confirmPassword) {
      throw this.createAuthError(
        AuthErrorType.PASSWORD_WEAK,
        '新密码确认不匹配'
      );
    }

    // 更新密码
    this.testPasswords[this.currentUser.username] = newPassword;
  }

  checkPermission(permission: string): boolean {
    if (!this.currentUser) return false;
    return this.currentUser.permissions.some(p => p === permission);
  }

  hasRole(role: UserRole): boolean {
    if (!this.currentUser) return false;
    return this.currentUser.role === role;
  }

  async validateToken(token: string): Promise<boolean> {
    if (!token || token !== this.token) return false;

    // 简单的令牌验证（实际应用中应该验证签名和过期时间）
    try {
      const payload = this.parseToken(token);
      return payload && payload.exp > Date.now();
    } catch {
      return false;
    }
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null && this.token !== null;
  }

  getUserPermissions(): string[] {
    if (!this.currentUser) return [];
    return this.currentUser.permissions;
  }

  getUserRole(): UserRole | null {
    return this.currentUser?.role || null;
  }

  clearAuthState(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_refresh_token');
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_user');

    this.currentUser = null;
    this.token = null;
    this.refreshTokenValue = null;
  }

  onAuthStateChange(
    listener: (isAuthenticated: boolean, user: User | null) => void
  ): () => void {
    this.authStateListeners.push(listener);

    // 返回取消监听的函数
    return () => {
      const index = this.authStateListeners.indexOf(listener);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  // 私有辅助方法
  private generateToken(userId: string): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
      sub: userId,
      iat: Date.now(),
      // 延长 token 过期时间到 8 小时，减少频繁过期的问题
      exp: Date.now() + (this.config?.tokenExpirationTime || 28800) * 1000, // 8小时 = 8 * 3600
    };

    // 简单的令牌生成（实际应用中应该使用真正的JWT库）
    return btoa(JSON.stringify({ header, payload }));
  }

  private generateRefreshToken(userId: string): string {
    const payload = {
      sub: userId,
      type: 'refresh',
      iat: Date.now(),
      exp:
        Date.now() + (this.config?.refreshTokenExpirationTime || 604800) * 1000, // 默认7天
    };

    return btoa(JSON.stringify(payload));
  }

  private parseToken(token: string): any {
    try {
      return JSON.parse(atob(token)).payload;
    } catch {
      return null;
    }
  }

  private createAuthError(
    type: AuthErrorTypeValue,
    message: string,
    details?: any
  ): AuthError {
    return {
      type,
      message,
      details,
      timestamp: new Date().toISOString(),
    };
  }

  private notifyAuthStateChange(
    isAuthenticated: boolean,
    user: User | null
  ): void {
    this.authStateListeners.forEach(listener => {
      try {
        listener(isAuthenticated, user);
      } catch (error) {
        console.error('Error in auth state listener:', error);
      }
    });
  }

  // 开发辅助方法
  getTestUsers(): User[] {
    return [...this.testUsers];
  }

  addTestUser(user: User, password: string): void {
    const userWithDefaults: User = {
      ...user,
      lastLoginAt: (user.lastLoginAt ?? new Date().toISOString()) as string,
      updatedAt: user.updatedAt || new Date().toISOString(),
    } as User;
    this.testUsers.push(userWithDefaults);
    this.testPasswords[user.username] = password;
  }
}
