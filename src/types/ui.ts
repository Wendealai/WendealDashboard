// UI相关的类型定义

export type ThemeMode = 'light' | 'dark';

export type Language = 'zh' | 'en';

export interface NotificationConfig {
  desktop: boolean;
  email: boolean;
  sound: boolean;
}

export interface SecurityConfig {
  autoLogout: number | 'never';
  twoFactorAuth: boolean;
}

export interface SystemInfo {
  version: string;
  buildTime: string;
  environment: 'development' | 'production' | 'test';
  browser: string;
}

export interface SettingsConfig {
  theme: ThemeMode;
  language: Language;
  notifications: NotificationConfig;
  security: SecurityConfig;
}

export interface UIPreferences {
  sidebarCollapsed: boolean;
  compactMode: boolean;
  showBreadcrumb: boolean;
  showFooter: boolean;
}

export interface ModalState {
  isOpen: boolean;
  type: string | null;
  data: any;
}

export interface NotificationItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  description?: string;
  duration?: number;
  timestamp: Date;
}

export interface LoadingState {
  global: boolean;
  components: Record<string, boolean>;
}

export interface UIState {
  theme: ThemeMode;
  language: Language;
  sidebarCollapsed: boolean;
  loading: LoadingState;
  notifications: NotificationItem[];
  modal: ModalState;
  preferences: UIPreferences;
}

// 设置页面相关类型
export interface SettingsFormData {
  theme: ThemeMode;
  language: Language;
  desktopNotifications: boolean;
  emailNotifications: boolean;
  soundNotifications: boolean;
  autoLogout: number | 'never';
  twoFactorAuth: boolean;
}

export interface SettingsPageProps {
  className?: string;
  onSettingsChange?: (settings: Partial<SettingsFormData>) => void;
}

// 主题配置
export interface ThemeConfig {
  primaryColor: string;
  borderRadius: number;
  colorBgContainer: string;
  colorText: string;
  colorTextSecondary: string;
  colorBorder: string;
  colorBgLayout: string;
}

// 响应式断点
export type BreakpointKey = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

export interface BreakpointConfig {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

// 布局配置
export interface LayoutConfig {
  headerHeight: number;
  sidebarWidth: number;
  sidebarCollapsedWidth: number;
  footerHeight: number;
  contentPadding: number;
}

// 动画配置
export interface AnimationConfig {
  duration: {
    fast: number;
    normal: number;
    slow: number;
  };
  easing: {
    ease: string;
    easeIn: string;
    easeOut: string;
    easeInOut: string;
  };
}

export default {};
