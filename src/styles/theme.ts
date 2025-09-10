import type { ThemeConfig } from 'antd';

// Modern Grayscale Theme
export const lightTheme: ThemeConfig = {
  token: {
    // Primary colors - Grayscale theme
    colorPrimary: '#666666',
    colorSuccess: '#888888',
    colorWarning: '#AAAAAA',
    colorError: '#555555',
    colorInfo: '#777777',

    // Background colors - Light theme for contrast
    colorBgBase: '#ffffff',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgLayout: '#f5f5f5',

    // Text colors - Professional readability
    colorText: '#212529',
    colorTextSecondary: '#6c757d',
    colorTextTertiary: '#adb5bd',
    colorTextQuaternary: '#dee2e6',

    // Border - Clean borders
    colorBorder: '#dee2e6',
    colorBorderSecondary: '#e9ecef',

    // Border radius - Modern rounded corners
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,
    borderRadiusXS: 4,

    // Font - Modern financial dashboard font
    fontSize: 14,
    fontSizeLG: 16,
    fontSizeSM: 12,
    fontSizeXL: 20,
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',

    // Line height
    lineHeight: 1.5715,
    lineHeightLG: 1.5,
    lineHeightSM: 1.66,

    // Motion
    motionDurationFast: '0.1s',
    motionDurationMid: '0.2s',
    motionDurationSlow: '0.3s',
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      headerHeight: 64,
      headerPadding: '0 24px',
      siderBg: '#2C3E50',
      triggerBg: '#34495e',
      triggerColor: '#ffffff',
      bodyBg: '#f8f9fa',
    },
    Menu: {
      itemBg: 'transparent',
      subMenuItemBg: '#444444',
      itemSelectedBg: '#666666',
      itemHoverBg: '#555555',
      itemColor: '#ffffff',
      itemSelectedColor: '#ffffff',
    },
    Button: {
      borderRadius: 8,
      controlHeight: 36,
      controlHeightLG: 44,
      controlHeightSM: 28,
      primaryColor: '#ffffff',
      defaultColor: '#666666',
    },
    Input: {
      borderRadius: 8,
      controlHeight: 36,
      controlHeightLG: 44,
      controlHeightSM: 28,
    },
    Card: {
      borderRadius: 12,
      headerBg: 'transparent',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    },
    Table: {
      borderRadius: 12,
      headerBg: '#f8f9fa',
      rowHoverBg: '#e9ecef',
    },
  },
};

// Modern Grayscale Dark Theme
export const darkTheme: ThemeConfig = {
  ...lightTheme,
  token: {
    ...lightTheme.token,
    // Primary colors - Dark grayscale theme
    colorPrimary: '#999999',
    colorSuccess: '#BBBBBB',
    colorWarning: '#CCCCCC',
    colorError: '#888888',
    colorInfo: '#AAAAAA',

    // Background colors - Deep charcoal/black theme
    colorBgBase: '#1a1a1a',
    colorBgContainer: '#2D2D2D',
    colorBgElevated: '#2D2D2D',
    colorBgLayout: '#1a1a1a',

    // Text colors - White and light gray
    colorText: '#ffffff',
    colorTextSecondary: '#B0B0B0',
    colorTextTertiary: '#808080',
    colorTextQuaternary: '#606060',

    // Border colors - Subtle dark borders
    colorBorder: '#404040',
    colorBorderSecondary: '#333333',
  },
  components: {
    ...lightTheme.components,
    Layout: {
      ...lightTheme.components?.Layout,
      headerBg: '#1a1a1a',
      siderBg: '#1a1a1a',
      bodyBg: '#1a1a1a',
    },
    Menu: {
      darkItemBg: '#1a1a1a',
      darkSubMenuItemBg: '#2D2D2D',
      darkItemSelectedBg: '#666666',
      darkItemHoverBg: '#333333',
      darkItemColor: '#ffffff',
      darkItemSelectedColor: '#ffffff',
    },
    Card: {
      ...lightTheme.components?.Card,
      headerBg: '#2D2D2D',
    },
    Table: {
      ...lightTheme.components?.Table,
      headerBg: '#2D2D2D',
      rowHoverBg: '#333333',
    },
    Button: {
      ...lightTheme.components?.Button,
      primaryColor: '#ffffff',
      defaultColor: '#888888',
    },
  },
};

// Responsive breakpoints
export const breakpoints = {
  xs: 480,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1600,
};

// Common spacing values
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};
