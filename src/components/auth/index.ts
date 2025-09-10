// Export all authentication components
export { default as LoginForm } from './LoginForm';
export { default as RegisterForm } from './RegisterForm';
export { default as UserProfile } from './UserProfile';
export {
  default as RoleGuard,
  RequireRole,
  RequirePermission,
  RequireAdmin,
  RequireAnyRole,
  RequireAllPermissions,
} from './RoleGuard';
export { default as ProtectedRoute } from './ProtectedRoute';

// Export component Props interfaces
export type { LoginFormProps } from './LoginForm';
export type { RegisterFormProps } from './RegisterForm';
export type { UserProfileProps } from './UserProfile';
export type {
  RoleGuardProps,
  RequireRoleProps,
  RequirePermissionProps,
  RequireAdminProps,
  RequireAnyRoleProps,
  RequireAllPermissionsProps,
} from './RoleGuard';
export type { ProtectedRouteProps } from './ProtectedRoute';
