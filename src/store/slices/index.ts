// Export all slices
export {
  userSlice,
  setUser,
  clearUser,
  setLoading as setUserLoading,
  setError as setUserError,
  clearError as clearUserError,
} from './userSlice';
export {
  uiSlice,
  setTheme,
  toggleSidebar,
  setSidebarCollapsed,
  setLoading as setUILoading,
  addNotification,
  removeNotification,
  clearNotifications,
  openModal,
  closeModal,
} from './uiSlice';

// Export types
export type { default as UserState } from './userSlice';
export type { default as UIState } from './uiSlice';
