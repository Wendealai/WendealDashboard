import { useContext, useMemo } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import type { UserRole } from '../types/auth';

/**
 * 认证相关的自定义Hook
 * 简化组件中的认证逻辑访问
 */
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

/**
 * 权限检查Hook
 * 用于检查用户是否具有特定权限
 */
export const usePermission = () => {
  const { user, isAuthenticated } = useAuth();

  /**
   * 检查用户是否具有指定角色
   * @param allowedRoles 允许的角色列表
   * @returns 是否具有权限
   */
  const hasRole = useMemo(() => {
    return (allowedRoles: UserRole[]) => {
      if (!isAuthenticated || !user?.role) {
        return false;
      }
      return allowedRoles.includes(user.role);
    };
  }, [isAuthenticated, user?.role]);

  /**
   * 检查用户是否为管理员
   * @returns 是否为管理员
   */
  const isAdmin = useMemo(() => {
    return isAuthenticated && user?.role === 'admin';
  }, [isAuthenticated, user?.role]);

  /**
   * 检查用户是否为普通用户
   * @returns 是否为普通用户
   */
  const isUser = useMemo(() => {
    return isAuthenticated && user?.role === 'user';
  }, [isAuthenticated, user?.role]);

  /**
   * 检查是否可以访问指定路径
   * @param path 路径
   * @param requiredRoles 需要的角色
   * @returns 是否可以访问
   */
  const canAccess = useMemo(() => {
    return (path: string, requiredRoles?: UserRole[]) => {
      // 公开路径，无需认证
      const publicPaths = ['/', '/login', '/register'];
      if (publicPaths.includes(path)) {
        return true;
      }

      // 需要认证的路径
      if (!isAuthenticated) {
        return false;
      }

      // 如果没有指定角色要求，只要认证即可
      if (!requiredRoles || requiredRoles.length === 0) {
        return true;
      }

      // 检查角色权限
      return hasRole(requiredRoles);
    };
  }, [isAuthenticated, hasRole]);

  /**
   * 检查是否可以执行指定操作
   * @param action 操作名称
   * @param resource 资源类型
   * @returns 是否可以执行
   */
  const canPerform = useMemo(() => {
    return (action: string, resource?: string) => {
      if (!isAuthenticated || !user) {
        return false;
      }

      // 管理员可以执行所有操作
      if (user.role === 'admin') {
        return true;
      }

      // 普通用户的权限检查
      if (user.role === 'user') {
        // 可以查看自己的资料
        if (action === 'read' && resource === 'profile') {
          return true;
        }

        // 可以更新自己的资料
        if (action === 'update' && resource === 'profile') {
          return true;
        }

        // 可以查看仪表板
        if (action === 'read' && resource === 'dashboard') {
          return true;
        }

        // 其他操作默认不允许
        return false;
      }

      return false;
    };
  }, [isAuthenticated, user]);

  return {
    hasRole,
    isAdmin,
    isUser,
    canAccess,
    canPerform,
    user,
    isAuthenticated,
  };
};

/**
 * 用户状态Hook
 * 提供用户相关的状态和操作
 */
export const useUserStatus = () => {
  const { user, isAuthenticated } = useAuth();

  /**
   * 获取用户显示名称
   */
  const displayName = useMemo(() => {
    if (!isAuthenticated || !user) {
      return '未登录';
    }
    return user.displayName || user.username || '用户';
  }, [isAuthenticated, user]);

  /**
   * 获取用户头像字母
   */
  const avatarLetter = useMemo(() => {
    if (!isAuthenticated || !user?.username) {
      return 'U';
    }
    return user.username.charAt(0).toUpperCase();
  }, [isAuthenticated, user?.username]);

  /**
   * 获取角色显示文本
   */
  const roleText = useMemo(() => {
    if (!isAuthenticated || !user?.role) {
      return '访客';
    }
    return user.role === 'admin' ? '管理员' : '用户';
  }, [isAuthenticated, user?.role]);

  /**
   * 获取在线状态
   */
  const isOnline = useMemo(() => {
    return isAuthenticated && !!user;
  }, [isAuthenticated, user]);

  return {
    displayName,
    avatarLetter,
    roleText,
    isOnline,
    user,
    isAuthenticated,
  };
};

export default useAuth;
