import React, { createContext, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import {
  login,
  register,
  logout,
  refreshToken,
  getCurrentUser,
  updateProfile,
  changePassword,
  validateToken,
  selectUser,
  selectIsAuthenticated,
  selectIsLoading,
  selectAuthError,
  initializeAuth,
  setUser,
  setTokens,
  clearAuthState,
} from '@/store';
import type {
  LoginRequest,
  RegisterData,
  UpdateProfileData,
  ChangePasswordData,
} from '@/types/auth';

// 认证上下文接口
interface AuthContextType {
  // 状态
  user: any;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: any;

  // 方法
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterData) => Promise<any>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  getCurrentUser: () => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
  changePassword: (data: ChangePasswordData) => Promise<void>;
  validateToken: () => Promise<void>;
  initializeAuth: (useClerk?: boolean) => void;
}

// 创建认证上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 导出AuthContext供其他文件使用
export { AuthContext };

// 认证提供者组件属性
interface AuthProviderProps {
  children: ReactNode;
  useClerk?: boolean; // 是否使用Clerk认证
}

// 认证提供者组件
export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  useClerk = false,
}) => {
  const dispatch = useAppDispatch();

  // 从Redux store获取认证状态
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isLoading = useAppSelector(selectIsLoading);
  const error = useAppSelector(selectAuthError);

  // Token 验证处理函数
  const handleValidateToken = async (token?: string) => {
    try {
      const tokenToValidate = token || localStorage.getItem('auth_token');
      if (!tokenToValidate) return;

      const result = await dispatch(validateToken(tokenToValidate));
      // 如果 token 验证失败，尝试使用 refresh token 刷新
      if (
        validateToken.rejected.match(result) ||
        (validateToken.fulfilled.match(result) && !result.payload)
      ) {
        const refreshTokenValue = localStorage.getItem('auth_refresh_token');
        if (refreshTokenValue && user) {
          try {
            await handleRefreshToken();
            return;
          } catch (refreshError) {
            console.warn(
              'Token refresh failed, clearing auth state:',
              refreshError
            );
          }
        }
        // 如果刷新失败或没有 refresh token，清除认证状态
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_refresh_token');
        dispatch(clearAuthState());
      }
    } catch (error) {
      console.error('Token validation error:', error);
    }
  };

  // 初始化认证服务
  useEffect(() => {
    dispatch(initializeAuth(useClerk ? 'clerk' : 'local'));
  }, [dispatch, useClerk]);

  // 检查本地存储的认证状态
  useEffect(() => {
    const initializeAuthState = async () => {
      const token = localStorage.getItem('auth_token');
      const userData = localStorage.getItem('auth_user');

      if (token && userData) {
        try {
          const user = JSON.parse(userData);
          dispatch(setUser(user));
          const refreshTokenValue = localStorage.getItem('auth_refresh_token');
          dispatch(
            setTokens({
              token,
              refreshToken: refreshTokenValue || '',
            })
          );

          // 验证 token 是否仍然有效
          await handleValidateToken(token);
        } catch (error) {
          console.error('Failed to restore auth state:', error);
          // 清除无效的存储数据
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          localStorage.removeItem('auth_refresh_token');
        }
      }
    };

    initializeAuthState();
  }, []);

  // 包装异步操作
  const handleLogin = async (credentials: LoginRequest) => {
    await dispatch(login(credentials)).unwrap();
  };

  const handleRegister = async (data: RegisterData) => {
    console.log('🚀 AuthContext.handleRegister called with:', data.username);
    try {
      const result = await dispatch(register(data)).unwrap();
      console.log('✅ AuthContext.handleRegister success:', result);
      return result;
    } catch (error) {
      console.error('❌ AuthContext.handleRegister error:', error);
      throw error;
    }
  };

  const handleLogout = async () => {
    await dispatch(logout()).unwrap();
  };

  const handleRefreshToken = async () => {
    await dispatch(
      refreshToken(localStorage.getItem('auth_refresh_token') || '')
    ).unwrap();
  };

  const handleGetCurrentUser = async () => {
    await dispatch(getCurrentUser()).unwrap();
  };

  const handleUpdateProfile = async (data: UpdateProfileData) => {
    await dispatch(updateProfile(data)).unwrap();
  };

  const handleChangePassword = async (data: ChangePasswordData) => {
    await dispatch(changePassword(data)).unwrap();
  };

  const handleValidateTokenWrapper = async () => {
    await handleValidateToken();
  };

  const handleInitializeAuth = (useClerk?: boolean) => {
    dispatch(initializeAuth(useClerk ? 'clerk' : 'local'));
  };

  // 上下文值
  const contextValue: AuthContextType = {
    // 状态
    user,
    isAuthenticated,
    isLoading,
    error,

    // 方法
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    refreshToken: handleRefreshToken,
    getCurrentUser: handleGetCurrentUser,
    updateProfile: handleUpdateProfile,
    changePassword: handleChangePassword,
    validateToken: handleValidateTokenWrapper,
    initializeAuth: handleInitializeAuth,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

// 使用认证上下文的Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// 默认导出
export default AuthProvider;
