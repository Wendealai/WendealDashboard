// 认证状态管理切片
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type {
  User,
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
  AuthError,
} from '../../types/auth';
import { AuthErrorType } from '../../types/auth';
import { LocalAuthService } from '../../services/auth/LocalAuthService';
import { ClerkAuthService } from '../../services/auth/ClerkAuthService';
import type { IAuthService } from '../../services/auth/IAuthService';

// 认证状态接口
interface AuthSliceState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
  token: string | null;
  refreshToken: string | null;
  lastActivity: string | null;
  sessionExpiry: string | null;
  authStrategy: 'local' | 'clerk';
}

// 初始状态
const initialState: AuthSliceState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  token: null,
  refreshToken: null,
  lastActivity: null,
  sessionExpiry: null,
  authStrategy: 'local',
};

// 认证服务实例
let authService: IAuthService;

// 初始化认证服务
const initializeAuthService = (
  strategy: 'local' | 'clerk' = 'local'
): IAuthService => {
  if (
    !authService ||
    (strategy === 'clerk' && !(authService instanceof ClerkAuthService))
  ) {
    authService =
      strategy === 'clerk' ? new ClerkAuthService() : new LocalAuthService();
  }
  return authService;
};

// 异步Thunk Actions

// 初始化认证
export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (strategy: 'local' | 'clerk' = 'local', { rejectWithValue }) => {
    try {
      const service = initializeAuthService(strategy);
      await service.initialize({
        strategy,
        enableRememberMe: true,
        tokenExpirationTime: 24 * 60 * 60 * 1000, // 24 hours
        refreshTokenExpirationTime: 7 * 24 * 60 * 60 * 1000, // 7 days
        maxLoginAttempts: 5,
        lockoutDuration: 15 * 60 * 1000, // 15 minutes
      });

      // 检查是否有已存储的用户信息
      const currentUser = await service.getCurrentUser();
      const isAuthenticated = service.isAuthenticated();

      return {
        user: currentUser,
        isAuthenticated,
        strategy,
      };
    } catch (error: any) {
      return rejectWithValue({
        type: AuthErrorType.UNKNOWN_ERROR,
        message: error.message || '认证初始化失败',
        details: error,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// 用户登录
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      const service = initializeAuthService();
      const response = await service.login(credentials);

      // 设置会话过期时间（默认24小时）
      const sessionExpiry = new Date();
      sessionExpiry.setHours(sessionExpiry.getHours() + 24);

      return {
        ...response,
        sessionExpiry: sessionExpiry.toISOString(),
      };
    } catch (error: any) {
      return rejectWithValue({
        type: AuthErrorType.INVALID_CREDENTIALS,
        message: error.message || '登录失败',
        details: error,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// 用户注册
export const register = createAsyncThunk(
  'auth/register',
  async (userData: RegisterRequest, { rejectWithValue }) => {
    try {
      const service = initializeAuthService();
      const user = await service.register(userData);
      return user;
    } catch (error: any) {
      return rejectWithValue({
        type: AuthErrorType.UNKNOWN_ERROR,
        message: error.message || '注册失败',
        details: error,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// 用户登出
export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      const service = initializeAuthService();
      await service.logout();
      return null;
    } catch (error: any) {
      return rejectWithValue({
        type: AuthErrorType.UNKNOWN_ERROR,
        message: error.message || '登出失败',
        details: error,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// 刷新令牌
export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (refreshToken: string, { rejectWithValue }) => {
    try {
      const service = initializeAuthService();
      const response = await service.refreshToken(refreshToken);

      // 更新会话过期时间
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 24);
      const sessionExpiry = expiryDate.toISOString();

      return {
        ...response,
        sessionExpiry,
      };
    } catch (error: any) {
      return rejectWithValue({
        type: AuthErrorType.TOKEN_EXPIRED,
        message: error.message || '刷新令牌失败',
        details: error,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// 获取当前用户
export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const service = initializeAuthService();
      const user = await service.getCurrentUser();
      return user;
    } catch (error: any) {
      return rejectWithValue({
        type: AuthErrorType.UNKNOWN_ERROR,
        message: error.message || '获取用户信息失败',
        details: error,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// 更新用户资料
export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (data: UpdateProfileRequest, { rejectWithValue }) => {
    try {
      const service = initializeAuthService();
      const updatedUser = await service.updateProfile(data);
      return updatedUser;
    } catch (error: any) {
      return rejectWithValue({
        type: AuthErrorType.UNKNOWN_ERROR,
        message: error.message || '更新用户资料失败',
        details: error,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// 修改密码
export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async (data: ChangePasswordRequest, { rejectWithValue }) => {
    try {
      const service = initializeAuthService();
      await service.changePassword(data);
      return null;
    } catch (error: any) {
      return rejectWithValue({
        type: AuthErrorType.UNKNOWN_ERROR,
        message: error.message || '修改密码失败',
        details: error,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// 验证令牌
export const validateToken = createAsyncThunk(
  'auth/validateToken',
  async (token: string, { rejectWithValue }) => {
    try {
      const service = initializeAuthService();
      const isValid = await service.validateToken(token);
      return isValid;
    } catch (error: any) {
      return rejectWithValue({
        type: AuthErrorType.TOKEN_INVALID,
        message: error.message || '令牌验证失败',
        details: error,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// 辅助函数：序列化用户数据
const serializeUser = (user: User | null): any => {
  if (!user) return null;
  return {
    ...user,
    createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
    updatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString() : null,
    lastLoginAt: user.lastLoginAt
      ? new Date(user.lastLoginAt).toISOString()
      : null,
  };
};

// 创建认证切片
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // 清除错误
    clearError: state => {
      state.error = null;
    },

    // 更新最后活动时间
    updateLastActivity: state => {
      state.lastActivity = new Date().toISOString();
    },

    // 设置加载状态
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    // 清除认证状态
    clearAuthState: state => {
      state.user = null;
      state.isAuthenticated = false;
      state.token = null;
      state.refreshToken = null;
      state.error = null;
      state.lastActivity = null;
      state.sessionExpiry = null;
    },

    // 设置认证策略
    setAuthStrategy: (state, action: PayloadAction<'local' | 'clerk'>) => {
      state.authStrategy = action.payload;
    },

    // 设置会话过期时间
    setSessionExpiry: (state, action: PayloadAction<string>) => {
      state.sessionExpiry = action.payload;
    },

    // 手动设置用户信息（用于外部认证）
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.isAuthenticated = action.payload !== null;
      if (action.payload) {
        state.lastActivity = new Date().toISOString();
      }
    },

    // 设置令牌
    setTokens: (
      state,
      action: PayloadAction<{ token: string; refreshToken?: string }>
    ) => {
      state.token = action.payload.token;
      if (action.payload.refreshToken) {
        state.refreshToken = action.payload.refreshToken;
      }
    },
  },
  extraReducers: builder => {
    // 初始化认证
    builder
      .addCase(initializeAuth.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = serializeUser(action.payload.user);
        state.isAuthenticated = action.payload.isAuthenticated;
        state.authStrategy = action.payload.strategy;
        state.error = null;
        if (action.payload.user) {
          state.lastActivity = new Date().toISOString();
        }
      })
      .addCase(initializeAuth.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as AuthError;
        state.isAuthenticated = false;
        state.user = null;
      });

    // 登录
    builder
      .addCase(login.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = serializeUser(action.payload.user);
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.sessionExpiry = action.payload.sessionExpiry;
        state.lastActivity = new Date().toISOString();
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as AuthError;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
      });

    // 注册
    builder
      .addCase(register.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, _action) => {
        state.isLoading = false;
        state.error = null;
        // 注册成功后不自动登录，需要用户手动登录
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as AuthError;
      });

    // 登出
    builder
      .addCase(logout.pending, state => {
        state.isLoading = true;
      })
      .addCase(logout.fulfilled, state => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.token = null;
        state.refreshToken = null;
        state.error = null;
        state.lastActivity = null;
        state.sessionExpiry = null;
      })
      .addCase(logout.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as AuthError;
        // 即使登出失败，也清除本地状态
        state.user = null;
        state.isAuthenticated = false;
        state.token = null;
        state.refreshToken = null;
      });

    // 刷新令牌
    builder
      .addCase(refreshToken.pending, state => {
        state.isLoading = true;
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = serializeUser(action.payload.user);
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.sessionExpiry = action.payload.sessionExpiry;
        state.lastActivity = new Date().toISOString();
        state.error = null;
      })
      .addCase(refreshToken.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as AuthError;
        // 刷新失败，清除认证状态
        state.user = null;
        state.isAuthenticated = false;
        state.token = null;
        state.refreshToken = null;
      });

    // 获取当前用户
    builder
      .addCase(getCurrentUser.pending, state => {
        state.isLoading = true;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = serializeUser(action.payload);
        state.isAuthenticated = action.payload !== null;
        state.error = null;
        if (action.payload) {
          state.lastActivity = new Date().toISOString();
        }
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as AuthError;
      });

    // 更新用户资料
    builder
      .addCase(updateProfile.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = serializeUser(action.payload);
        state.lastActivity = new Date().toISOString();
        state.error = null;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as AuthError;
      });

    // 修改密码
    builder
      .addCase(changePassword.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, state => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as AuthError;
      });

    // 验证令牌
    builder
      .addCase(validateToken.pending, state => {
        state.isLoading = true;
      })
      .addCase(validateToken.fulfilled, (state, action) => {
        state.isLoading = false;
        // 不在这里清除认证状态，让 AuthContext 处理 token 刷新逻辑
        // 只更新加载状态
        // 如果 token 有效，确保认证状态正确
        if (action.payload && state.user) {
          state.isAuthenticated = true;
        }
        state.error = null;
      })
      .addCase(validateToken.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as AuthError;
        // 不在这里清除认证状态，让 AuthContext 处理 token 刷新逻辑
      });
  },
});

// 导出actions
export const {
  clearError,
  updateLastActivity,
  setLoading,
  clearAuthState,
  setAuthStrategy,
  setSessionExpiry,
  setUser,
  setTokens,
} = authSlice.actions;

// 选择器
export const selectAuth = (state: { auth?: AuthSliceState }) =>
  state.auth || initialState;
export const selectUser = (state: { auth?: AuthSliceState }) =>
  state.auth?.user || null;
export const selectIsAuthenticated = (state: { auth?: AuthSliceState }) =>
  state.auth?.isAuthenticated || false;
export const selectIsLoading = (state: { auth?: AuthSliceState }) =>
  state.auth?.isLoading || false;
export const selectAuthError = (state: { auth?: AuthSliceState }) =>
  state.auth?.error || null;
export const selectToken = (state: { auth?: AuthSliceState }) =>
  state.auth?.token || null;
export const selectRefreshToken = (state: { auth?: AuthSliceState }) =>
  state.auth?.refreshToken || null;
export const selectLastActivity = (state: { auth?: AuthSliceState }) =>
  state.auth?.lastActivity || null;
export const selectSessionExpiry = (state: { auth?: AuthSliceState }) =>
  state.auth?.sessionExpiry || null;
export const selectAuthStrategy = (state: { auth?: AuthSliceState }) =>
  state.auth?.authStrategy || 'local';

// 复合选择器
export const selectUserPermissions = (state: { auth?: AuthSliceState }) => {
  return state.auth?.user?.permissions || [];
};

export const selectUserRole = (state: { auth?: AuthSliceState }) => {
  return state.auth?.user?.role || null;
};

export const selectIsSessionExpired = (state: { auth?: AuthSliceState }) => {
  const sessionExpiry = state.auth?.sessionExpiry;
  if (!sessionExpiry) return false;
  return new Date() > new Date(sessionExpiry);
};

export const selectIsSessionExpiringSoon = (
  state: { auth?: AuthSliceState },
  minutesThreshold: number = 15
) => {
  const sessionExpiry = state.auth?.sessionExpiry;
  if (!sessionExpiry) return false;
  const now = new Date();
  const expiry = new Date(sessionExpiry);
  const timeDiff = expiry.getTime() - now.getTime();
  const minutesDiff = timeDiff / (1000 * 60);
  return minutesDiff <= minutesThreshold && minutesDiff > 0;
};

// 导出reducer
export default authSlice.reducer;

// 导出认证服务实例（用于组件中直接调用）
export const getAuthService = () => authService;
