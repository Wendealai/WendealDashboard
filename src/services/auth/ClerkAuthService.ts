// Clerk认证服务实现
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
  User,
  AuthConfig,
  ClerkUserData,
} from '../../types/auth';
import { UserRole } from '../../types/auth';
import type { IAuthService } from './IAuthService';
import { LocalAuthService } from './LocalAuthService';

/**
 * Clerk认证服务实现
 * 为生产环境提供Clerk集成，包含降级到本地认证的机制
 */
export class ClerkAuthService implements IAuthService {
  private localAuthService: LocalAuthService;
  private config: AuthConfig | null = null;
  private isClerkAvailable: boolean = false;
  private currentUser: User | null = null;
  private authStateListeners: Array<
    (isAuthenticated: boolean, user: User | null) => void
  > = [];

  constructor() {
    this.localAuthService = new LocalAuthService();
  }

  async initialize(config: AuthConfig): Promise<void> {
    this.config = config;

    // 检查Clerk是否可用
    this.isClerkAvailable = await this.checkClerkAvailability();

    if (this.isClerkAvailable) {
      await this.initializeClerk();
    } else {
      console.warn('Clerk不可用，降级到本地认证');
      await this.localAuthService.initialize(config);
    }
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    if (this.isClerkAvailable) {
      return await this.clerkLogin(credentials);
    } else {
      return await this.localAuthService.login(credentials);
    }
  }

  async register(userData: RegisterRequest): Promise<User> {
    if (this.isClerkAvailable) {
      return await this.clerkRegister(userData);
    } else {
      return await this.localAuthService.register(userData);
    }
  }

  async logout(): Promise<void> {
    if (this.isClerkAvailable) {
      await this.clerkLogout();
    } else {
      await this.localAuthService.logout();
    }

    // 清除本地状态
    const wasAuthenticated = this.isAuthenticated();
    this.currentUser = null;

    if (wasAuthenticated) {
      this.notifyAuthStateChange(false, null);
    }
  }

  async refreshToken(refreshToken: string): Promise<LoginResponse> {
    if (this.isClerkAvailable) {
      return await this.clerkRefreshToken(refreshToken);
    } else {
      return await this.localAuthService.refreshToken(refreshToken);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    if (this.isClerkAvailable) {
      return await this.clerkGetCurrentUser();
    } else {
      return await this.localAuthService.getCurrentUser();
    }
  }

  async updateProfile(data: UpdateProfileRequest): Promise<User> {
    if (this.isClerkAvailable) {
      return await this.clerkUpdateProfile(data);
    } else {
      return await this.localAuthService.updateProfile(data);
    }
  }

  async changePassword(data: ChangePasswordRequest): Promise<void> {
    if (this.isClerkAvailable) {
      await this.clerkChangePassword(data);
    } else {
      await this.localAuthService.changePassword(data);
    }
  }

  checkPermission(permission: string): boolean {
    if (this.isClerkAvailable && this.currentUser) {
      return this.currentUser.permissions.some((p: string) => p === permission);
    } else {
      return this.localAuthService.checkPermission(permission);
    }
  }

  hasRole(role: UserRole): boolean {
    if (this.isClerkAvailable && this.currentUser) {
      return this.currentUser.role === role;
    } else {
      return this.localAuthService.hasRole(role);
    }
  }

  async validateToken(token: string): Promise<boolean> {
    if (this.isClerkAvailable) {
      return await this.clerkValidateToken();
    } else {
      return await this.localAuthService.validateToken(token);
    }
  }

  isAuthenticated(): boolean {
    if (this.isClerkAvailable) {
      return this.currentUser !== null;
    } else {
      return this.localAuthService.isAuthenticated();
    }
  }

  getUserPermissions(): string[] {
    if (this.isClerkAvailable && this.currentUser) {
      return this.currentUser.permissions;
    } else {
      return this.localAuthService.getUserPermissions();
    }
  }

  getUserRole(): UserRole | null {
    if (this.isClerkAvailable && this.currentUser) {
      return this.currentUser.role;
    } else {
      return this.localAuthService.getUserRole();
    }
  }

  clearAuthState(): void {
    this.currentUser = null;
    if (this.isClerkAvailable) {
      // 清除Clerk相关状态
      this.clearClerkState();
    } else {
      this.localAuthService.clearAuthState();
    }
  }

  onAuthStateChange(
    listener: (isAuthenticated: boolean, user: User | null) => void
  ): () => void {
    this.authStateListeners.push(listener);

    // 如果使用本地认证，也注册到本地服务
    let localUnsubscribe: (() => void) | null = null;
    if (!this.isClerkAvailable) {
      localUnsubscribe = this.localAuthService.onAuthStateChange(listener);
    }

    // 返回取消监听的函数
    return () => {
      const index = this.authStateListeners.indexOf(listener);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
      if (localUnsubscribe) {
        localUnsubscribe();
      }
    };
  }

  // Clerk特定方法
  private async checkClerkAvailability(): Promise<boolean> {
    try {
      // 检查Clerk是否已加载
      // 在实际实现中，这里会检查window.Clerk是否存在
      // 目前返回false以使用本地认证
      return false;
    } catch (error) {
      console.error('检查Clerk可用性时出错:', error);
      return false;
    }
  }

  private async initializeClerk(): Promise<void> {
    try {
      // 初始化Clerk
      // 在实际实现中，这里会调用Clerk的初始化方法
      console.log('初始化Clerk认证服务');

      // 设置Clerk事件监听器
      this.setupClerkEventListeners();
    } catch (error) {
      console.error('初始化Clerk失败:', error);
      this.isClerkAvailable = false;
      await this.localAuthService.initialize(this.config!);
    }
  }

  private setupClerkEventListeners(): void {
    // 在实际实现中，这里会设置Clerk的事件监听器
    // 例如：clerk.addListener('user', this.handleClerkUserChange.bind(this));
  }

  private async clerkLogin(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      // 实际实现中会调用Clerk的登录方法
      // const result = await clerk.client.signIn.create({
      //   identifier: credentials.username,
      //   password: credentials.password
      // });

      // 目前抛出未实现错误，降级到本地认证
      throw new Error('Clerk登录未实现');
    } catch (error) {
      console.error('Clerk登录失败，降级到本地认证:', error);
      this.isClerkAvailable = false;
      return await this.localAuthService.login(credentials);
    }
  }

  private async clerkRegister(userData: RegisterRequest): Promise<User> {
    try {
      // 实际实现中会调用Clerk的注册方法
      throw new Error('Clerk注册未实现');
    } catch (error) {
      console.error('Clerk注册失败，降级到本地认证:', error);
      this.isClerkAvailable = false;
      return await this.localAuthService.register(userData);
    }
  }

  private async clerkLogout(): Promise<void> {
    try {
      // 实际实现中会调用Clerk的登出方法
      // await clerk.signOut();
      console.log('Clerk登出');
    } catch (error) {
      console.error('Clerk登出失败:', error);
    }
  }

  private async clerkRefreshToken(
    _refreshToken: string
  ): Promise<LoginResponse> {
    try {
      // 实际实现中会调用Clerk的令牌刷新方法
      throw new Error('Clerk令牌刷新未实现');
    } catch (error) {
      console.error('Clerk令牌刷新失败，降级到本地认证:', error);
      this.isClerkAvailable = false;
      return await this.localAuthService.refreshToken(_refreshToken);
    }
  }

  private async clerkGetCurrentUser(): Promise<User | null> {
    try {
      // 实际实现中会获取Clerk当前用户
      // const clerkUser = clerk.user;
      // if (clerkUser) {
      //   return this.mapClerkUserToUser(clerkUser);
      // }
      return this.currentUser;
    } catch (error) {
      console.error('获取Clerk用户失败:', error);
      return null;
    }
  }

  private async clerkUpdateProfile(data: UpdateProfileRequest): Promise<User> {
    try {
      // 实际实现中会调用Clerk的用户更新方法
      throw new Error('Clerk用户更新未实现');
    } catch (error) {
      console.error('Clerk用户更新失败，降级到本地认证:', error);
      this.isClerkAvailable = false;
      return await this.localAuthService.updateProfile(data);
    }
  }

  private async clerkChangePassword(
    data: ChangePasswordRequest
  ): Promise<void> {
    try {
      // 实际实现中会调用Clerk的密码更改方法
      throw new Error('Clerk密码更改未实现');
    } catch (error) {
      console.error('Clerk密码更改失败，降级到本地认证:', error);
      this.isClerkAvailable = false;
      await this.localAuthService.changePassword(data);
    }
  }

  private async clerkValidateToken(): Promise<boolean> {
    try {
      // 实际实现中会验证Clerk令牌
      // const session = await clerk.client.sessions.getToken();
      // return session !== null;
      return false;
    } catch (error) {
      console.error('Clerk令牌验证失败:', error);
      return false;
    }
  }

  private clearClerkState(): void {
    // 清除Clerk相关的本地状态
    // 在实际实现中可能需要清除Clerk的会话信息
  }

  // Helper function to map Clerk user to User type
  private mapClerkUserToUser(clerkUser: any): User {
    return {
      id: clerkUser.id,
      username: clerkUser.username || clerkUser.email,
      email: clerkUser.email,
      firstName: clerkUser.firstName || '',
      lastName: clerkUser.lastName || '',
      avatar: clerkUser.avatar || '',
      role: UserRole.EMPLOYEE, // Default role
      permissions: [],
      isActive: true,
      createdAt: clerkUser.createdAt || new Date().toISOString(),
      updatedAt: clerkUser.updatedAt || new Date().toISOString(),
      lastLoginAt: clerkUser.lastLoginAt || new Date().toISOString(),
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

  // 公共方法：获取当前使用的认证策略
  getCurrentStrategy(): 'local' | 'clerk' {
    return this.isClerkAvailable ? 'clerk' : 'local';
  }

  // 公共方法：强制切换到本地认证
  async fallbackToLocal(): Promise<void> {
    if (this.isClerkAvailable) {
      console.log('强制切换到本地认证');
      this.isClerkAvailable = false;
      await this.localAuthService.initialize(this.config!);
    }
  }

  // 公共方法：尝试重新连接Clerk
  async reconnectClerk(): Promise<boolean> {
    this.isClerkAvailable = await this.checkClerkAvailability();
    if (this.isClerkAvailable) {
      await this.initializeClerk();
    }
    return this.isClerkAvailable;
  }
}
