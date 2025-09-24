import React from 'react';
import { Result, Button } from 'antd';
import { LockOutlined, HomeOutlined } from '@ant-design/icons';
import { useAuth } from '@/contexts';
import { PermissionService } from '@/services/auth/PermissionService';
import type { UserRole, Permission } from '@/types/auth';

export interface RoleGuardProps {
  /** 子组件 */
  children: React.ReactNode;
  /** 允许访问的角色列表 */
  allowedRoles?: UserRole[];
  /** 需要的权限列表 */
  requiredPermissions?: Permission[];
  /** 权限检查模式：'any' 表示满足任一条件即可，'all' 表示需要满足所有条件 */
  mode?: 'any' | 'all';
  /** 权限不足时的回退组件 */
  fallback?: React.ReactNode;
  /** 是否显示默认的无权限页面 */
  showFallback?: boolean;
  /** 自定义无权限消息 */
  noPermissionMessage?: string;
  /** 重定向到首页的回调 */
  onRedirectHome?: () => void;
}

const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles = [],
  requiredPermissions = [],
  mode = 'any',
  fallback,
  showFallback = true,
  noPermissionMessage,
  onRedirectHome,
}) => {
  const { user, isAuthenticated } = useAuth();

  // 如果用户未登录，显示登录提示
  if (!isAuthenticated || !user) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (!showFallback) {
      return null;
    }

    return (
      <Result
        status='403'
        title='需要登录'
        subTitle='请先登录以访问此内容'
        icon={<LockOutlined />}
        extra={
          <Button
            type='primary'
            onClick={() => (window.location.href = '/login')}
          >
            前往登录
          </Button>
        }
      />
    );
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
        PermissionService.getInstance().hasPermission(user, permission.name)
      );
    } else {
      // 满足任一权限即可
      return requiredPermissions.some(permission =>
        PermissionService.getInstance().hasPermission(user, permission.name)
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

  // 权限不足时的处理
  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showFallback) {
    return null;
  }

  // 默认的无权限页面
  const defaultMessage =
    noPermissionMessage || `您没有访问此内容的权限。当前角色：${user.role}`;

  const handleRedirectHome = () => {
    if (onRedirectHome) {
      onRedirectHome();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <Result
      status='403'
      title='访问被拒绝'
      subTitle={defaultMessage}
      icon={<LockOutlined />}
      extra={
        <Button
          type='primary'
          icon={<HomeOutlined />}
          onClick={handleRedirectHome}
        >
          返回首页
        </Button>
      }
    />
  );
};

// 便捷的角色检查组件
export interface RequireRoleProps {
  children: React.ReactNode;
  role: UserRole;
  fallback?: React.ReactNode;
}

export const RequireRole: React.FC<RequireRoleProps> = ({
  children,
  role,
  fallback,
}) => {
  return (
    <RoleGuard allowedRoles={[role]} fallback={fallback}>
      {children}
    </RoleGuard>
  );
};

// 便捷的权限检查组件
export interface RequirePermissionProps {
  children: React.ReactNode;
  permission: Permission;
  fallback?: React.ReactNode;
}

export const RequirePermission: React.FC<RequirePermissionProps> = ({
  children,
  permission,
  fallback,
}) => {
  return (
    <RoleGuard requiredPermissions={[permission]} fallback={fallback}>
      {children}
    </RoleGuard>
  );
};

// 便捷的管理员检查组件
export interface RequireAdminProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RequireAdmin: React.FC<RequireAdminProps> = ({
  children,
  fallback,
}) => {
  return (
    <RoleGuard allowedRoles={['admin']} fallback={fallback}>
      {children}
    </RoleGuard>
  );
};

// 便捷的多角色检查组件
export interface RequireAnyRoleProps {
  children: React.ReactNode;
  roles: UserRole[];
  fallback?: React.ReactNode;
}

export const RequireAnyRole: React.FC<RequireAnyRoleProps> = ({
  children,
  roles,
  fallback,
}) => {
  return (
    <RoleGuard allowedRoles={roles} mode='any' fallback={fallback}>
      {children}
    </RoleGuard>
  );
};

// 便捷的多权限检查组件
export interface RequireAllPermissionsProps {
  children: React.ReactNode;
  permissions: Permission[];
  fallback?: React.ReactNode;
}

export const RequireAllPermissions: React.FC<RequireAllPermissionsProps> = ({
  children,
  permissions,
  fallback,
}) => {
  return (
    <RoleGuard requiredPermissions={permissions} mode='all' fallback={fallback}>
      {children}
    </RoleGuard>
  );
};

export { RoleGuard as default };
export { RoleGuard };
