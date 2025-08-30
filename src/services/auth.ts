import ApiService from './api';

// 用户信息接口
export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  role: string;
  permissions: string[];
  createdAt: string;
  lastLoginAt?: string;
}

// 登录请求接口
export interface LoginRequest {
  username: string;
  password: string;
  remember?: boolean;
}

// 登录响应接口
export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

// 注册请求接口
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// 修改密码请求接口
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// 更新用户信息请求接口
export interface UpdateUserRequest {
  username?: string;
  email?: string;
  avatar?: string;
}

// 认证服务类
export class AuthService {
  // 登录
  static async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await ApiService.post<LoginResponse>('/auth/login', data);

    // 保存token到localStorage
    if (response.token) {
      localStorage.setItem('token', response.token);
      localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.user));
    }

    return response;
  }

  // 注册
  static async register(data: RegisterRequest): Promise<LoginResponse> {
    const response = await ApiService.post<LoginResponse>(
      '/auth/register',
      data
    );

    // 保存token到localStorage
    if (response.token) {
      localStorage.setItem('token', response.token);
      localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.user));
    }

    return response;
  }

  // 登出
  static async logout(): Promise<void> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await ApiService.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      // 忽略API调用错误，确保本地存储始终被清除
      console.warn('Logout API call failed:', error);
    } finally {
      // 清除本地存储
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  }

  // 获取当前用户信息
  static async getCurrentUser(): Promise<User> {
    return await ApiService.get<User>('/auth/me');
  }

  // 刷新token
  static async refreshToken(): Promise<LoginResponse> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await ApiService.post<LoginResponse>('/auth/refresh', {
      refreshToken,
    });

    // 更新token
    if (response.token) {
      localStorage.setItem('token', response.token);
      localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.user));
    }

    return response;
  }

  // 修改密码
  static async changePassword(data: ChangePasswordRequest): Promise<void> {
    await ApiService.post('/auth/change-password', data);
  }

  // 更新用户信息
  static async updateUser(data: UpdateUserRequest): Promise<User> {
    const response = await ApiService.put<User>('/auth/profile', data);

    // 更新本地存储的用户信息
    localStorage.setItem('user', JSON.stringify(response));

    return response;
  }

  // 忘记密码
  static async forgotPassword(email: string): Promise<void> {
    await ApiService.post('/auth/forgot-password', { email });
  }

  // 重置密码
  static async resetPassword(token: string, password: string): Promise<void> {
    await ApiService.post('/auth/reset-password', { token, password });
  }

  // 验证邮箱
  static async verifyEmail(token: string): Promise<void> {
    await ApiService.post('/auth/verify-email', { token });
  }

  // 重发验证邮件
  static async resendVerificationEmail(): Promise<void> {
    await ApiService.post('/auth/resend-verification');
  }

  // 检查用户名是否可用
  static async checkUsernameAvailability(username: string): Promise<boolean> {
    const response = await ApiService.get<{ available: boolean }>(
      `/auth/check-username/${username}`
    );
    return response.available;
  }

  // 检查邮箱是否可用
  static async checkEmailAvailability(email: string): Promise<boolean> {
    const response = await ApiService.get<{ available: boolean }>(
      `/auth/check-email/${email}`
    );
    return response.available;
  }

  // 获取本地存储的用户信息
  static getLocalUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  // 获取本地存储的token
  static getLocalToken(): string | null {
    return localStorage.getItem('token');
  }

  // 检查是否已登录
  static isAuthenticated(): boolean {
    const token = this.getLocalToken();
    const user = this.getLocalUser();
    return !!(token && user);
  }
}

export default AuthService;
