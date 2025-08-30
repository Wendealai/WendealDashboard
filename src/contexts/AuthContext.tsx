import React, { createContext, useContext, useEffect, ReactNode } from 'react';
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
  selectAuth,
  selectUser,
  selectIsAuthenticated,
  selectIsLoading,
  selectAuthError,
  initializeAuth,
} from '@/store';
import type {
  LoginCredentials,
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
  error: string | null;

  // 方法
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
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
  const authState = useAppSelector(selectAuth);
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isLoading = useAppSelector(selectIsLoading);
  const error = useAppSelector(selectAuthError);

  // 初始化认证服务
  useEffect(() => {
    dispatch(initializeAuth(useClerk ? 'clerk' : 'local'));

    // 检查本地存储的token
    const token = localStorage.getItem('auth_token');
    if (token) {
      dispatch(validateToken(token));
    }
  }, [dispatch, useClerk]);

  // 包装异步操作
  const handleLogin = async (credentials: LoginCredentials) => {
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
    await dispatch(refreshToken()).unwrap();
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

  const handleValidateToken = async () => {
    await dispatch(validateToken()).unwrap();
  };

  const handleInitializeAuth = (useClerk?: boolean) => {
    dispatch(initializeAuth(useClerk || false));
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
    validateToken: handleValidateToken,
    initializeAuth: handleInitializeAuth,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

// 使用认证上下文的Hook
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

// 认证状态Hook（简化版）
export const useAuthState = () => {
  const { user, isAuthenticated, isLoading, error } = useAuth();
  return { user, isAuthenticated, isLoading, error };
};

// 认证操作Hook（简化版）
export const useAuthActions = () => {
  const {
    login,
    register,
    logout,
    refreshToken,
    getCurrentUser,
    updateProfile,
    changePassword,
    validateToken,
    initializeAuth,
  } = useAuth();

  return {
    login,
    register,
    logout,
    refreshToken,
    getCurrentUser,
    updateProfile,
    changePassword,
    validateToken,
    initializeAuth,
  };
};

export default AuthContext;
