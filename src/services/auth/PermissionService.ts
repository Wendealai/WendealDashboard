// 权限管理服务
import type { User, Permission, RouteGuardConfig } from '../../types/auth';
import { UserRole } from '../../types/auth';

/**
 * 权限管理服务
 * 提供基于角色的访问控制(RBAC)功能
 */
export class PermissionService {
  private static instance: PermissionService;
  private rolePermissions: Map<UserRole, Permission[]> = new Map();
  private routePermissions: Map<string, string[]> = new Map();
  private resourcePermissions: Map<string, Map<string, string[]>> = new Map();

  private constructor() {
    this.initializeDefaultPermissions();
    this.initializeRoutePermissions();
  }

  /**
   * 获取权限服务单例实例
   */
  public static getInstance(): PermissionService {
    if (!PermissionService.instance) {
      PermissionService.instance = new PermissionService();
    }
    return PermissionService.instance;
  }

  /**
   * 初始化默认权限配置
   */
  private initializeDefaultPermissions(): void {
    // 管理员权限
    const adminPermissions: Permission[] = [
      {
        id: 'perm-001',
        name: 'dashboard.read',
        description: '查看仪表板',
        resource: 'dashboard',
        action: 'read',
      },
      {
        id: 'perm-002',
        name: 'dashboard.write',
        description: '编辑仪表板',
        resource: 'dashboard',
        action: 'write',
      },
      {
        id: 'perm-003',
        name: 'dashboard.delete',
        description: '删除仪表板',
        resource: 'dashboard',
        action: 'delete',
      },
      {
        id: 'perm-004',
        name: 'users.read',
        description: '查看用户',
        resource: 'users',
        action: 'read',
      },
      {
        id: 'perm-005',
        name: 'users.write',
        description: '编辑用户',
        resource: 'users',
        action: 'write',
      },
      {
        id: 'perm-006',
        name: 'users.delete',
        description: '删除用户',
        resource: 'users',
        action: 'delete',
      },
      {
        id: 'perm-007',
        name: 'system.admin',
        description: '系统管理',
        resource: 'system',
        action: 'admin',
      },
      {
        id: 'perm-008',
        name: 'reports.read',
        description: '查看报告',
        resource: 'reports',
        action: 'read',
      },
      {
        id: 'perm-009',
        name: 'reports.write',
        description: '编辑报告',
        resource: 'reports',
        action: 'write',
      },
      {
        id: 'perm-010',
        name: 'settings.manage',
        description: '管理设置',
        resource: 'settings',
        action: 'manage',
      },
    ];

    // 经理权限
    const managerPermissions: Permission[] = [
      {
        id: 'perm-001',
        name: 'dashboard.read',
        description: '查看仪表板',
        resource: 'dashboard',
        action: 'read',
      },
      {
        id: 'perm-002',
        name: 'dashboard.write',
        description: '编辑仪表板',
        resource: 'dashboard',
        action: 'write',
      },
      {
        id: 'perm-004',
        name: 'users.read',
        description: '查看用户',
        resource: 'users',
        action: 'read',
      },
      {
        id: 'perm-008',
        name: 'reports.read',
        description: '查看报告',
        resource: 'reports',
        action: 'read',
      },
      {
        id: 'perm-009',
        name: 'reports.write',
        description: '编辑报告',
        resource: 'reports',
        action: 'write',
      },
      {
        id: 'perm-011',
        name: 'team.manage',
        description: '管理团队',
        resource: 'team',
        action: 'manage',
      },
    ];

    // 员工权限
    const employeePermissions: Permission[] = [
      {
        id: 'perm-001',
        name: 'dashboard.read',
        description: '查看仪表板',
        resource: 'dashboard',
        action: 'read',
      },
      {
        id: 'perm-008',
        name: 'reports.read',
        description: '查看报告',
        resource: 'reports',
        action: 'read',
      },
      {
        id: 'perm-012',
        name: 'profile.read',
        description: '查看个人资料',
        resource: 'profile',
        action: 'read',
      },
      {
        id: 'perm-013',
        name: 'profile.write',
        description: '编辑个人资料',
        resource: 'profile',
        action: 'write',
      },
    ];

    // 访客权限
    const guestPermissions: Permission[] = [
      {
        id: 'perm-001',
        name: 'dashboard.read',
        description: '查看仪表板',
        resource: 'dashboard',
        action: 'read',
      },
    ];

    // 设置角色权限映射
    this.rolePermissions.set(UserRole.ADMIN, adminPermissions);
    this.rolePermissions.set(UserRole.MANAGER, managerPermissions);
    this.rolePermissions.set(UserRole.EMPLOYEE, employeePermissions);
    this.rolePermissions.set(UserRole.GUEST, guestPermissions);
  }

  /**
   * 初始化路由权限配置
   */
  private initializeRoutePermissions(): void {
    // 路由权限映射
    this.routePermissions.set('/', ['dashboard.read']);
    this.routePermissions.set('/dashboard', ['dashboard.read']);
    this.routePermissions.set('/dashboard/edit', ['dashboard.write']);
    this.routePermissions.set('/users', ['users.read']);
    this.routePermissions.set('/users/create', ['users.write']);
    this.routePermissions.set('/users/edit/:id', ['users.write']);
    this.routePermissions.set('/users/delete/:id', ['users.delete']);
    this.routePermissions.set('/reports', ['reports.read']);
    this.routePermissions.set('/reports/create', ['reports.write']);
    this.routePermissions.set('/reports/edit/:id', ['reports.write']);
    this.routePermissions.set('/settings', ['settings.manage']);
    this.routePermissions.set('/admin', ['system.admin']);
    this.routePermissions.set('/profile', ['profile.read']);
    this.routePermissions.set('/profile/edit', ['profile.write']);

    // 资源权限映射
    this.resourcePermissions.set(
      'dashboard',
      new Map([
        ['read', ['dashboard.read']],
        ['write', ['dashboard.write']],
        ['delete', ['dashboard.delete']],
      ])
    );

    this.resourcePermissions.set(
      'users',
      new Map([
        ['read', ['users.read']],
        ['write', ['users.write']],
        ['delete', ['users.delete']],
      ])
    );

    this.resourcePermissions.set(
      'reports',
      new Map([
        ['read', ['reports.read']],
        ['write', ['reports.write']],
      ])
    );

    this.resourcePermissions.set(
      'system',
      new Map([['admin', ['system.admin']]])
    );
  }

  /**
   * 检查用户是否具有指定权限
   */
  public hasPermission(user: User | null, permission: string): boolean {
    if (!user) {
      return false;
    }

    // 检查用户直接权限
    const hasDirectPermission = user.permissions.some(
      p => p === permission
    );
    if (hasDirectPermission) {
      return true;
    }

    // 检查角色权限
    const rolePermissions = this.rolePermissions.get(user.role);
    if (rolePermissions) {
      return rolePermissions.some(p => p.name === permission);
    }

    return false;
  }

  /**
   * 检查用户是否具有指定角色
   */
  public hasRole(user: User | null, role: UserRole): boolean {
    if (!user) {
      return false;
    }
    return user.role === role;
  }

  /**
   * 检查用户是否具有任一指定角色
   */
  public hasAnyRole(user: User | null, roles: UserRole[]): boolean {
    if (!user) {
      return false;
    }
    return roles.includes(user.role);
  }

  /**
   * 检查用户是否可以访问指定路由
   */
  public canAccessRoute(user: User | null, route: string): boolean {
    if (!user) {
      return false;
    }

    // 获取路由所需权限
    const requiredPermissions = this.getRoutePermissions(route);
    if (requiredPermissions.length === 0) {
      // 如果路由没有权限要求，默认允许访问
      return true;
    }

    // 检查用户是否具有任一所需权限
    return requiredPermissions.some(permission =>
      this.hasPermission(user, permission)
    );
  }

  /**
   * 检查用户是否可以对资源执行指定操作
   */
  public canPerformAction(
    user: User | null,
    resource: string,
    action: string
  ): boolean {
    if (!user) {
      return false;
    }

    const resourceActions = this.resourcePermissions.get(resource);
    if (!resourceActions) {
      return false;
    }

    const requiredPermissions = resourceActions.get(action);
    if (!requiredPermissions) {
      return false;
    }

    return requiredPermissions.some(permission =>
      this.hasPermission(user, permission)
    );
  }

  /**
   * 获取用户的所有权限
   */
  public getUserPermissions(user: User | null): Permission[] {
    if (!user) {
      return [];
    }

    // 合并用户直接权限和角色权限
    const directPermissions = user.permissions;
    const rolePermissions = this.rolePermissions.get(user.role) || [];

    // 去重合并
    const allPermissions = [...directPermissions];
    rolePermissions.forEach(rolePerm => {
      if (!allPermissions.some(p => p === rolePerm.name)) {
        allPermissions.push(rolePerm.name);
      }
    });

    return allPermissions;
  }

  /**
   * 获取角色的所有权限
   */
  public getRolePermissions(role: UserRole): Permission[] {
    return this.rolePermissions.get(role) || [];
  }

  public getRolePermissionNames(role: UserRole): string[] {
    const permissions = this.rolePermissions.get(role) || [];
    return permissions.map(p => p.name);
  }

  /**
   * 获取路由所需权限
   */
  public getRoutePermissions(route: string): string[] {
    // 精确匹配
    if (this.routePermissions.has(route)) {
      return this.routePermissions.get(route) || [];
    }

    // 模式匹配（处理动态路由）
    for (const [pattern, permissions] of this.routePermissions.entries()) {
      if (this.matchRoute(pattern, route)) {
        return permissions;
      }
    }

    return [];
  }

  /**
   * 路由模式匹配
   */
  private matchRoute(pattern: string, route: string): boolean {
    // 将路由模式转换为正则表达式
    const regexPattern = pattern
      .replace(/:[^/]+/g, '[^/]+') // 替换参数占位符
      .replace(/\*/g, '.*'); // 替换通配符

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(route);
  }

  /**
   * 创建路由守卫配置
   */
  public createRouteGuard(
    config: RouteGuardConfig
  ): (user: User | null) => boolean {
    return (user: User | null) => {
      // 检查角色要求
      if (config.requiredRoles && config.requiredRoles.length > 0) {
        if (!this.hasAnyRole(user, config.requiredRoles)) {
          return false;
        }
      }

      // 检查权限要求
      if (config.requiredPermissions && config.requiredPermissions.length > 0) {
        const hasAllPermissions = config.requiredPermissions.every(permission =>
          this.hasPermission(user, permission)
        );
        if (!hasAllPermissions) {
          return false;
        }
      }

      // 执行自定义验证
      if (config.customValidator) {
        return config.customValidator(user);
      }

      return true;
    };
  }

  /**
   * 检查用户是否为管理员
   */
  public isAdmin(user: User | null): boolean {
    return this.hasRole(user, UserRole.ADMIN);
  }

  /**
   * 检查用户是否为经理或更高级别
   */
  public isManagerOrAbove(user: User | null): boolean {
    return this.hasAnyRole(user, [UserRole.ADMIN, UserRole.MANAGER]);
  }

  /**
   * 检查用户是否为员工或更高级别
   */
  public isEmployeeOrAbove(user: User | null): boolean {
    return this.hasAnyRole(user, [
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.EMPLOYEE,
    ]);
  }

  /**
   * 添加自定义权限到角色
   */
  public addPermissionToRole(role: UserRole, permission: Permission): void {
    const rolePermissions = this.rolePermissions.get(role) || [];
    if (!rolePermissions.some(p => p.name === permission.name)) {
      rolePermissions.push(permission);
      this.rolePermissions.set(role, rolePermissions);
    }
  }

  /**
   * 从角色移除权限
   */
  public removePermissionFromRole(
    role: UserRole,
    permissionName: string
  ): void {
    const rolePermissions = this.rolePermissions.get(role) || [];
    const filteredPermissions = rolePermissions.filter(
      p => p.name !== permissionName
    );
    this.rolePermissions.set(role, filteredPermissions);
  }

  /**
   * 添加路由权限配置
   */
  public addRoutePermission(route: string, permissions: string[]): void {
    this.routePermissions.set(route, permissions);
  }

  /**
   * 移除路由权限配置
   */
  public removeRoutePermission(route: string): void {
    this.routePermissions.delete(route);
  }

  /**
   * 获取所有可用权限
   */
  public getAllPermissions(): Permission[] {
    const allPermissions: Permission[] = [];
    const seenPermissions = new Set<string>();

    this.rolePermissions.forEach(permissions => {
      permissions.forEach(permission => {
        if (!seenPermissions.has(permission.name)) {
          allPermissions.push(permission);
          seenPermissions.add(permission.name);
        }
      });
    });

    return allPermissions;
  }

  /**
   * 重置权限配置
   */
  public reset(): void {
    this.rolePermissions.clear();
    this.routePermissions.clear();
    this.resourcePermissions.clear();
    this.initializeDefaultPermissions();
    this.initializeRoutePermissions();
  }
}

// 导出单例实例
export const permissionService = PermissionService.getInstance();

// 导出便捷函数
export const hasPermission = (
  user: User | null,
  permission: string
): boolean => {
  return permissionService.hasPermission(user, permission);
};

export const hasRole = (user: User | null, role: UserRole): boolean => {
  return permissionService.hasRole(user, role);
};

export const canAccessRoute = (user: User | null, route: string): boolean => {
  return permissionService.canAccessRoute(user, route);
};

export const canPerformAction = (
  user: User | null,
  resource: string,
  action: string
): boolean => {
  return permissionService.canPerformAction(user, resource, action);
};

export const isAdmin = (user: User | null): boolean => {
  return permissionService.isAdmin(user);
};

export const isManagerOrAbove = (user: User | null): boolean => {
  return permissionService.isManagerOrAbove(user);
};

export const isEmployeeOrAbove = (user: User | null): boolean => {
  return permissionService.isEmployeeOrAbove(user);
};
