// 认证服务抽象接口
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
  User,
  UserRole,
  AuthConfig,
} from '../../types/auth';

/**
 * 认证服务抽象接口
 * 为不同的认证实现（本地认证、Clerk等）提供统一的接口契约
 */
export interface IAuthService {
  /**
   * 初始化认证服务
   * @param config 认证配置
   */
  initialize(config: AuthConfig): Promise<void>;

  /**
   * 用户登录
   * @param credentials 登录凭据
   * @returns 登录响应信息
   */
  login(credentials: LoginRequest): Promise<LoginResponse>;

  /**
   * 用户注册
   * @param userData 用户注册数据
   * @returns 创建的用户信息
   */
  register(userData: RegisterRequest): Promise<User>;

  /**
   * 用户登出
   */
  logout(): Promise<void>;

  /**
   * 刷新访问令牌
   * @param refreshToken 刷新令牌
   * @returns 新的登录响应信息
   */
  refreshToken(refreshToken: string): Promise<LoginResponse>;

  /**
   * 获取当前用户信息
   * @returns 当前用户信息，如果未登录则返回null
   */
  getCurrentUser(): Promise<User | null>;

  /**
   * 更新用户资料
   * @param data 更新数据
   * @returns 更新后的用户信息
   */
  updateProfile(data: UpdateProfileRequest): Promise<User>;

  /**
   * 更改密码
   * @param data 密码更改数据
   */
  changePassword(data: ChangePasswordRequest): Promise<void>;

  /**
   * 检查用户是否具有指定权限
   * @param permission 权限标识符
   * @returns 是否具有权限
   */
  checkPermission(permission: string): boolean;

  /**
   * 检查用户是否具有指定角色
   * @param role 用户角色
   * @returns 是否具有角色
   */
  hasRole(role: UserRole): boolean;

  /**
   * 验证访问令牌是否有效
   * @param token 访问令牌
   * @returns 令牌是否有效
   */
  validateToken(token: string): Promise<boolean>;

  /**
   * 获取当前认证状态
   * @returns 是否已认证
   */
  isAuthenticated(): boolean;

  /**
   * 获取当前用户的权限列表
   * @returns 权限列表
   */
  getUserPermissions(): string[];

  /**
   * 获取当前用户角色
   * @returns 用户角色
   */
  getUserRole(): UserRole | null;

  /**
   * 清除认证状态和存储的令牌
   */
  clearAuthState(): void;

  /**
   * 设置认证状态变化监听器
   * @param listener 状态变化回调函数
   */
  onAuthStateChange(
    listener: (isAuthenticated: boolean, user: User | null) => void
  ): () => void;
}

/**
 * 认证服务工厂接口
 * 用于创建不同类型的认证服务实例
 */
export interface IAuthServiceFactory {
  /**
   * 创建认证服务实例
   * @param strategy 认证策略类型
   * @param config 认证配置
   * @returns 认证服务实例
   */
  createAuthService(
    strategy: 'local' | 'clerk',
    config: AuthConfig
  ): IAuthService;
}

/**
 * 认证服务提供者接口
 * 用于依赖注入和服务管理
 */
export interface IAuthServiceProvider {
  /**
   * 获取当前认证服务实例
   * @returns 认证服务实例
   */
  getAuthService(): IAuthService;

  /**
   * 设置认证服务实例
   * @param service 认证服务实例
   */
  setAuthService(service: IAuthService): void;

  /**
   * 切换认证策略
   * @param strategy 新的认证策略
   * @param config 认证配置
   */
  switchAuthStrategy(
    strategy: 'local' | 'clerk',
    config: AuthConfig
  ): Promise<void>;
}
