// 认证系统相关类型定义

// 用户角色常量
export const UserRole = {
  ADMIN: 'admin',
  EMPLOYEE: 'employee',
  USER: 'user',
  MANAGER: 'manager',
  GUEST: 'guest',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// 权限类型
export interface Permission {
  id: string;
  name: string;
  description?: string;
  resource: string; // 资源标识符
  action: string; // 操作类型 (read, write, delete, etc.)
}

// 用户偏好设置接口
export interface UserPreferences {
  theme: 'light' | 'dark';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
}

// 用户资料接口
export interface UserProfile {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  preferences?: UserPreferences;
}

// 用户基础信息接口 - 确保正确导出
export interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role: UserRole;
  permissions: string[]; // 简化为字符串数组以匹配测试
  profile?: UserProfile; // 添加profile属性
  isActive?: boolean;
  createdAt: string; // 改为字符串以匹配测试
  updatedAt: string; // 改为字符串以匹配测试
  lastLoginAt?: string; // 改为字符串以匹配测试
}

// 认证状态接口
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
}

// 登录请求接口
export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
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
  firstName?: string;
  lastName?: string;
}

// 用户资料更新接口
export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  avatar?: string;
}

// 密码更改接口
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// 认证服务接口
export interface AuthService {
  login(credentials: LoginRequest): Promise<LoginResponse>;
  register(userData: RegisterRequest): Promise<User>;
  logout(): Promise<void>;
  refreshToken(token: string): Promise<LoginResponse>;
  getCurrentUser(): Promise<User | null>;
  updateProfile(data: UpdateProfileRequest): Promise<User>;
  changePassword(data: ChangePasswordRequest): Promise<void>;
  checkPermission(permission: string): boolean;
  hasRole(role: UserRole): boolean;
}

// 权限检查函数类型
export type PermissionChecker = (permission: string) => boolean;
export type RoleChecker = (role: UserRole) => boolean;

// 认证上下文类型
export interface AuthContextType {
  authState: AuthState;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: UpdateProfileRequest) => Promise<void>;
  changePassword: (data: ChangePasswordRequest) => Promise<void>;
  checkPermission: PermissionChecker;
  hasRole: RoleChecker;
  refreshAuth: () => Promise<void>;
}

// 路由守卫配置
export interface RouteGuardConfig {
  requireAuth?: boolean;
  requiredRole?: UserRole;
  requiredRoles?: UserRole[];
  requiredPermissions?: string[];
  redirectTo?: string;
  customValidator?: (user: User | null) => boolean;
}

// Clerk 用户信息映射接口
export interface ClerkUserData {
  id: string;
  username: string | null;
  emailAddresses: Array<{
    emailAddress: string;
    id: string;
  }>;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  createdAt: number;
  updatedAt: number;
  lastSignInAt: number | null;
}

// 认证策略类型
export type AuthStrategy = 'local' | 'clerk';

// 认证配置接口
export interface AuthConfig {
  strategy: AuthStrategy;
  enableRememberMe: boolean;
  tokenExpirationTime: number;
  refreshTokenExpirationTime: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
}

// 会话信息接口
export interface SessionInfo {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  lastAccessedAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

// 认证错误类型常量
export const AuthErrorType = {
  INVALID_CREDENTIALS: 'invalid_credentials',
  USER_NOT_FOUND: 'user_not_found',
  USER_INACTIVE: 'user_inactive',
  TOKEN_EXPIRED: 'token_expired',
  TOKEN_INVALID: 'token_invalid',
  PERMISSION_DENIED: 'permission_denied',
  ACCOUNT_LOCKED: 'account_locked',
  PASSWORD_WEAK: 'password_weak',
  EMAIL_ALREADY_EXISTS: 'email_already_exists',
  USERNAME_ALREADY_EXISTS: 'username_already_exists',
  NETWORK_ERROR: 'network_error',
  UNKNOWN_ERROR: 'unknown_error',
} as const;

export type AuthErrorTypeValue =
  (typeof AuthErrorType)[keyof typeof AuthErrorType];

// 认证错误接口
export interface AuthError {
  type: AuthErrorTypeValue;
  message: string;
  details?: any;
  timestamp: string;
}

// 兼容性类型别名
export type LoginCredentials = LoginRequest;
export type RegisterData = RegisterRequest;
export type UpdateProfileData = UpdateProfileRequest;
export type ChangePasswordData = ChangePasswordRequest;
