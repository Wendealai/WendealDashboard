// 从小写auth目录导出认证组件
export { default as LoginForm } from '../auth/LoginForm';
export { default as RegisterForm } from '../auth/RegisterForm';
export { default as UserProfile } from '../auth/UserProfile';
export {
  default as RoleGuard,
  RequireRole,
  RequirePermission,
  RequireAdmin,
  RequireAnyRole,
  RequireAllPermissions,
} from '../auth/RoleGuard';

// 导出ProtectedRoute组件
export { default as ProtectedRoute } from './ProtectedRoute';
