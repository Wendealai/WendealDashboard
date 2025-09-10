import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Result, Button, Spin } from 'antd';
import { LockOutlined, HomeOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts';
import { PermissionService } from '../../services/auth/PermissionService';
import type { UserRole, Permission } from '../../types/auth';

/**
 * 受保护路由组件的属性接口
 */
export interface ProtectedRouteProps {
  /** 子组件 */
  children: React.ReactNode;
  /** 需要的用户角色 */
  requiredRole?: UserRole;
  /** 允许访问的角色列表 */
  allowedRoles?: UserRole[];
  /** 需要的权限列表 */
  requiredPermissions?: Permission[];
  /** 权限检查模式：'any' 表示满足任一条件即可，'all' 表示需要满足所有条件 */
  mode?: 'any' | 'all';
  /** 重定向路径，默认为登录页 */
  redirectTo?: string;
  /** 无权限时的重定向路径，默认为首页 */
  unauthorizedRedirectTo?: string;
  /** 是否显示加载状态 */
  showLoading?: boolean;
  /** 是否显示无权限页面而不是重定向 */
  showUnauthorizedPage?: boolean;
}

/**
 * 受保护路由组件
 * 用于保护需要特定权限或角色才能访问的路由
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  allowedRoles = [],
  requiredPermissions = [],
  mode = 'any',
  redirectTo = '/login',
  unauthorizedRedirectTo = '/',
  showLoading = true,
  showUnauthorizedPage = false,
}) => {
  const location = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();

  // 显示加载状态
  if (showLoading && isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <Spin size='large'>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            {t('common.loading')}
          </div>
        </Spin>
      </div>
    );
  }

  // 检查是否已认证
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // 如果已认证但用户信息不存在
  if (isAuthenticated && !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // 构建完整的角色列表
  const finalAllowedRoles = [...allowedRoles];
  if (requiredRole && !finalAllowedRoles.includes(requiredRole)) {
    finalAllowedRoles.push(requiredRole);
  }

  /**
   * 检查角色权限
   */
  const hasRolePermission = (): boolean => {
    if (finalAllowedRoles.length === 0) {
      return true; // 如果没有指定角色要求，则允许访问
    }
    return finalAllowedRoles.includes(user!.role);
  };

  /**
   * 检查具体权限
   */
  const hasSpecificPermissions = (): boolean => {
    if (requiredPermissions.length === 0) {
      return true; // 如果没有指定权限要求，则允许访问
    }

    if (mode === 'all') {
      // 需要满足所有权限
      return requiredPermissions.every(permission =>
        PermissionService.getInstance().hasPermission(user!, permission)
      );
    } else {
      // 满足任一权限即可
      return requiredPermissions.some(permission =>
        PermissionService.getInstance().hasPermission(user!, permission)
      );
    }
  };

  /**
   * 综合权限检查
   */
  const hasAccess = (): boolean => {
    const roleCheck = hasRolePermission();
    const permissionCheck = hasSpecificPermissions();

    // 如果同时指定了角色和权限要求
    if (finalAllowedRoles.length > 0 && requiredPermissions.length > 0) {
      if (mode === 'all') {
        return roleCheck && permissionCheck;
      } else {
        return roleCheck || permissionCheck;
      }
    }

    // 只有角色要求或只有权限要求
    return roleCheck && permissionCheck;
  };

  // 如果有访问权限，渲染子组件
  if (hasAccess()) {
    return <>{children}</>;
  }

  // 权限不足的处理
  if (showUnauthorizedPage) {
    return (
      <Result
        status='403'
        title={t('common.accessDenied')}
        subTitle={t('common.insufficientPermissions', { role: user!.role })}
        icon={<LockOutlined />}
        extra={
          <Button
            type='primary'
            icon={<HomeOutlined />}
            onClick={() => (window.location.href = unauthorizedRedirectTo)}
          >
            {t('common.backToHome')}
          </Button>
        }
      />
    );
  }

  // 默认重定向到无权限页面
  return (
    <Navigate
      to={unauthorizedRedirectTo}
      state={{ from: location, reason: 'insufficient_permissions' }}
      replace
    />
  );
};

export { ProtectedRoute };
export default ProtectedRoute;
