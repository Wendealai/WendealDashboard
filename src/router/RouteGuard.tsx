import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Result, Button, Spin } from 'antd';
import { LockOutlined, HomeOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts';
import { PermissionService } from '@/services/auth/PermissionService';
import type { UserRole, Permission } from '@/types/auth';

interface RouteGuardProps {
  /** 子组件 */
  children: React.ReactNode;
  /** 是否需要认证 */
  requiresAuth?: boolean;
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

const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  requiresAuth = false,
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

  // 如果正在加载或认证状态未确定，显示加载状态
  // 给认证系统更多时间进行 token 验证和刷新
  if (
    showLoading &&
    (isLoading || (requiresAuth && isAuthenticated === undefined))
  ) {
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

  // 检查是否需要认证
  if (requiresAuth && !isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // 如果需要认证但用户信息不存在
  if (requiresAuth && isAuthenticated && !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // 如果不需要认证，直接渲染子组件
  if (!requiresAuth) {
    return <>{children}</>;
  }

  // 以下逻辑需要用户已认证且用户信息存在
  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // 检查角色权限
  const hasRolePermission = () => {
    if (allowedRoles.length === 0) {
      return true; // 如果没有指定角色要求，则允许访问
    }
    return allowedRoles.includes(user.role);
  };

  // 检查具体权限
  const hasSpecificPermissions = () => {
    if (requiredPermissions.length === 0) {
      return true; // 如果没有指定权限要求，则允许访问
    }

    if (mode === 'all') {
      // 需要满足所有权限
      return requiredPermissions.every(permission =>
        PermissionService.getInstance().hasPermission(user, typeof permission === 'string' ? permission : permission.name)
      );
    } else {
      // 满足任一权限即可
      return requiredPermissions.some(permission =>
        PermissionService.getInstance().hasPermission(user, typeof permission === 'string' ? permission : permission.name)
      );
    }
  };

  // 综合权限检查
  const hasAccess = () => {
    const roleCheck = hasRolePermission();
    const permissionCheck = hasSpecificPermissions();

    // 如果同时指定了角色和权限要求
    if (allowedRoles.length > 0 && requiredPermissions.length > 0) {
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
        subTitle={t('common.insufficientPermissions', { role: user.role })}
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

export default RouteGuard;
