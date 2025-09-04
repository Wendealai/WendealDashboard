import type { User, UserRole } from '../types/auth';
import i18n from '../locales';

// 安全的翻译函数，避免在i18n未初始化时调用
const safeT = (key: string, fallback?: string): string => {
  try {
    return i18n.t ? i18n.t(key) : fallback || key;
  } catch (error) {
    console.warn('Translation failed for key:', key, error);
    return fallback || key;
  }
};

// Token 存储键名
const TOKEN_KEY = 'wendeal_auth_token';
const REFRESH_TOKEN_KEY = 'wendeal_refresh_token';
const USER_KEY = 'wendeal_user_info';

/**
 * Token 管理工具函数
 */
export const tokenUtils = {
  /**
   * 获取访问令牌
   */
  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get token from localStorage:', error);
      return null;
    }
  },

  /**
   * 设置访问令牌
   */
  setToken(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to set token to localStorage:', error);
    }
  },

  /**
   * 移除访问令牌
   */
  removeToken(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.error('Failed to remove token from localStorage:', error);
    }
  },

  /**
   * 获取刷新令牌
   */
  getRefreshToken(): string | null {
    try {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get refresh token from localStorage:', error);
      return null;
    }
  },

  /**
   * 设置刷新令牌
   */
  setRefreshToken(token: string): void {
    try {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to set refresh token to localStorage:', error);
    }
  },

  /**
   * 移除刷新令牌
   */
  removeRefreshToken(): void {
    try {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to remove refresh token from localStorage:', error);
    }
  },

  /**
   * 清除所有令牌
   */
  clearTokens(): void {
    this.removeToken();
    this.removeRefreshToken();
  },

  /**
   * 检查令牌是否存在
   */
  hasToken(): boolean {
    return !!this.getToken();
  },

  /**
   * 解析JWT令牌（简单实现，生产环境建议使用专业库）
   */
  parseToken(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      if (!base64Url) {
        throw new Error('Invalid token format');
      }
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Failed to parse token:', error);
      return null;
    }
  },

  /**
   * 检查令牌是否过期
   */
  isTokenExpired(token?: string): boolean {
    const tokenToCheck = token || this.getToken();
    if (!tokenToCheck) return true;

    try {
      const payload = this.parseToken(tokenToCheck);
      if (!payload || !payload.exp) return true;

      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch (error) {
      console.error('Failed to check token expiration:', error);
      return true;
    }
  },
};

/**
 * 用户信息管理工具函数
 */
export const userUtils = {
  /**
   * 获取用户信息
   */
  getUser(): User | null {
    try {
      const userStr = localStorage.getItem(USER_KEY);
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Failed to get user from localStorage:', error);
      return null;
    }
  },

  /**
   * 设置用户信息
   */
  setUser(user: User): void {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to set user to localStorage:', error);
    }
  },

  /**
   * 移除用户信息
   */
  removeUser(): void {
    try {
      localStorage.removeItem(USER_KEY);
    } catch (error) {
      console.error('Failed to remove user from localStorage:', error);
    }
  },

  /**
   * 更新用户信息
   */
  updateUser(updates: Partial<User>): User | null {
    const currentUser = this.getUser();
    if (!currentUser) return null;

    const updatedUser = { ...currentUser, ...updates };
    this.setUser(updatedUser);
    return updatedUser;
  },
};

/**
 * 会话管理工具函数
 */
export const sessionUtils = {
  /**
   * 检查用户是否已登录
   */
  isLoggedIn(): boolean {
    return (
      tokenUtils.hasToken() &&
      !tokenUtils.isTokenExpired() &&
      !!userUtils.getUser()
    );
  },

  /**
   * 清除会话
   */
  clearSession(): void {
    tokenUtils.clearTokens();
    userUtils.removeUser();
  },

  /**
   * 初始化会话
   */
  initSession(token: string, refreshToken: string, user: User): void {
    tokenUtils.setToken(token);
    tokenUtils.setRefreshToken(refreshToken);
    userUtils.setUser(user);
  },

  /**
   * 获取会话信息
   */
  getSession(): { token: string | null; user: User | null; isValid: boolean } {
    const token = tokenUtils.getToken();
    const user = userUtils.getUser();
    const isValid = this.isLoggedIn();

    return { token, user, isValid };
  },
};

/**
 * 密码强度验证
 */
export const passwordUtils = {
  /**
   * 密码强度等级
   */
  PasswordStrength: {
    WEAK: 'weak',
    MEDIUM: 'medium',
    STRONG: 'strong',
    VERY_STRONG: 'very_strong',
  } as const,

  /**
   * 检查密码强度
   */
  checkStrength(password: string): {
    strength: string;
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;

    // 长度检查
    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push(safeT('passwordValidation.minLength', '密码长度至少8位'));
    }

    if (password.length >= 12) {
      score += 1;
    }

    // 包含小写字母
    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push(
        safeT('passwordValidation.shouldContainLowercase', '应包含小写字母')
      );
    }

    // 包含大写字母
    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push(
        safeT('passwordValidation.shouldContainUppercase', '应包含大写字母')
      );
    }

    // 包含数字
    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push(
        safeT('passwordValidation.shouldContainNumber', '应包含数字')
      );
    }

    // 包含特殊字符
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1;
    } else {
      feedback.push(
        safeT('passwordValidation.shouldContainSpecialChar', '应包含特殊字符')
      );
    }

    // 不包含常见弱密码模式
    const weakPatterns = [
      /123456/,
      /password/i,
      /qwerty/i,
      /(.)\1{2,}/, // 连续相同字符
    ];

    const hasWeakPattern = weakPatterns.some(pattern => pattern.test(password));
    if (hasWeakPattern) {
      score -= 2;
      feedback.push(
        safeT('passwordValidation.avoidWeakPatterns', '避免使用弱密码模式')
      );
    }

    // 确定强度等级
    let strength: string;
    if (score <= 2) {
      strength = this.PasswordStrength.WEAK;
    } else if (score <= 4) {
      strength = this.PasswordStrength.MEDIUM;
    } else if (score <= 5) {
      strength = this.PasswordStrength.STRONG;
    } else {
      strength = this.PasswordStrength.VERY_STRONG;
    }

    return {
      strength,
      score: Math.max(0, Math.min(6, score)),
      feedback,
    };
  },

  /**
   * 验证密码是否符合要求
   */
  validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!password) {
      errors.push(safeT('passwordValidation.empty', '密码不能为空'));
      return { isValid: false, errors };
    }

    if (password.length < 8) {
      errors.push(safeT('passwordValidation.minLength', '密码长度至少8位'));
    }

    if (password.length > 128) {
      errors.push(
        safeT('passwordValidation.maxLength', '密码长度不能超过128位')
      );
    }

    if (!/[a-z]/.test(password)) {
      errors.push(
        safeT('passwordValidation.requireLowercase', '密码必须包含小写字母')
      );
    }

    if (!/[A-Z]/.test(password)) {
      errors.push(
        safeT('passwordValidation.requireUppercase', '密码必须包含大写字母')
      );
    }

    if (!/\d/.test(password)) {
      errors.push(
        safeT('passwordValidation.requireNumber', '密码必须包含数字')
      );
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push(
        safeT('passwordValidation.requireSpecialChar', '密码必须包含特殊字符')
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
};

/**
 * 权限检查工具函数
 */
export const permissionUtils = {
  /**
   * 检查用户是否具有指定角色
   */
  hasRole(user: User | null, allowedRoles: UserRole[]): boolean {
    if (!user || !user.role) return false;
    return allowedRoles.includes(user.role);
  },

  /**
   * 检查用户是否为管理员
   */
  isAdmin(user: User | null): boolean {
    return user?.role === 'admin';
  },

  /**
   * 检查用户是否为普通用户
   */
  isUser(user: User | null): boolean {
    return user?.role === 'user';
  },

  /**
   * 检查是否可以访问指定路径
   */
  canAccessPath(
    user: User | null,
    path: string,
    requiredRoles?: UserRole[]
  ): boolean {
    // 公开路径
    const publicPaths = ['/', '/login', '/register'];
    if (publicPaths.includes(path)) {
      return true;
    }

    // 需要登录
    if (!user) {
      return false;
    }

    // 如果没有角色要求，登录即可访问
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 检查角色权限
    return this.hasRole(user, requiredRoles);
  },
};

/**
 * 加密工具函数（简单实现，生产环境建议使用专业加密库）
 */
export const cryptoUtils = {
  /**
   * 简单的字符串哈希（仅用于演示，生产环境请使用安全的哈希算法）
   */
  simpleHash(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return Math.abs(hash).toString(16);
  },

  /**
   * 生成随机字符串
   */
  generateRandomString(length: number = 16): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
  },

  /**
   * 生成UUID（简单版本）
   */
  generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  },
};

/**
 * 验证工具函数
 */
export const validationUtils = {
  /**
   * 验证邮箱格式
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * 验证用户名格式
   */
  isValidUsername(username: string): boolean {
    // 用户名：3-20位，只能包含字母、数字、下划线
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  },

  /**
   * 验证手机号格式（中国大陆）
   */
  isValidPhone(phone: string): boolean {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  },
};

// 导出所有工具函数
export default {
  tokenUtils,
  userUtils,
  sessionUtils,
  passwordUtils,
  permissionUtils,
  cryptoUtils,
  validationUtils,
};
