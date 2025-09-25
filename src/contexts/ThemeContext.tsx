import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
} from 'react';
import { ConfigProvider, theme } from 'antd';
import type { ThemeConfig } from 'antd';

// 主题类型定义
export interface CustomTheme {
  id: string;
  name: string;
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  headerColor: string;
  sidebarColor: string;
  cardColor: string;
  isDark: boolean;
  fontSize: {
    small: number;
    medium: number;
    large: number;
  };
  borderRadius: number;
  spacing: {
    small: number;
    medium: number;
    large: number;
  };
}

// 预设主题
export const PRESET_THEMES: CustomTheme[] = [
  {
    id: 'default',
    name: '默认主题',
    primaryColor: '#1890ff',
    backgroundColor: '#f5f5f5',
    textColor: '#262626',
    borderColor: '#d9d9d9',
    headerColor: '#ffffff',
    sidebarColor: '#001529',
    cardColor: '#ffffff',
    isDark: false,
    fontSize: {
      small: 12,
      medium: 14,
      large: 16,
    },
    borderRadius: 6,
    spacing: {
      small: 8,
      medium: 16,
      large: 24,
    },
  },
  {
    id: 'dark',
    name: '深色主题',
    primaryColor: '#1890ff',
    backgroundColor: '#141414',
    textColor: '#ffffff',
    borderColor: '#303030',
    headerColor: '#1f1f1f',
    sidebarColor: '#000000',
    cardColor: '#1f1f1f',
    isDark: true,
    fontSize: {
      small: 12,
      medium: 14,
      large: 16,
    },
    borderRadius: 6,
    spacing: {
      small: 8,
      medium: 16,
      large: 24,
    },
  },
  {
    id: 'blue',
    name: '蓝色主题',
    primaryColor: '#2f54eb',
    backgroundColor: '#f0f5ff',
    textColor: '#262626',
    borderColor: '#adc6ff',
    headerColor: '#ffffff',
    sidebarColor: '#001d66',
    cardColor: '#ffffff',
    isDark: false,
    fontSize: {
      small: 12,
      medium: 14,
      large: 16,
    },
    borderRadius: 8,
    spacing: {
      small: 8,
      medium: 16,
      large: 24,
    },
  },
  {
    id: 'green',
    name: '绿色主题',
    primaryColor: '#52c41a',
    backgroundColor: '#f6ffed',
    textColor: '#262626',
    borderColor: '#b7eb8f',
    headerColor: '#ffffff',
    sidebarColor: '#092b00',
    cardColor: '#ffffff',
    isDark: false,
    fontSize: {
      small: 12,
      medium: 14,
      large: 16,
    },
    borderRadius: 8,
    spacing: {
      small: 8,
      medium: 16,
      large: 24,
    },
  },
  {
    id: 'purple',
    name: '紫色主题',
    primaryColor: '#722ed1',
    backgroundColor: '#f9f0ff',
    textColor: '#262626',
    borderColor: '#d3adf7',
    headerColor: '#ffffff',
    sidebarColor: '#22075e',
    cardColor: '#ffffff',
    isDark: false,
    fontSize: {
      small: 12,
      medium: 14,
      large: 16,
    },
    borderRadius: 8,
    spacing: {
      small: 8,
      medium: 16,
      large: 24,
    },
  },
];

// 主题状态
interface ThemeState {
  currentTheme: CustomTheme;
  customThemes: CustomTheme[];
  isCustomizing: boolean;
}

// 主题动作
type ThemeAction =
  | { type: 'SET_THEME'; payload: CustomTheme }
  | { type: 'ADD_CUSTOM_THEME'; payload: CustomTheme }
  | { type: 'UPDATE_CUSTOM_THEME'; payload: CustomTheme }
  | { type: 'DELETE_CUSTOM_THEME'; payload: string }
  | { type: 'SET_CUSTOMIZING'; payload: boolean }
  | {
      type: 'LOAD_THEMES';
      payload: { currentTheme: CustomTheme; customThemes: CustomTheme[] };
    };

// 主题reducer
const themeReducer = (state: ThemeState, action: ThemeAction): ThemeState => {
  switch (action.type) {
    case 'SET_THEME':
      return {
        ...state,
        currentTheme: action.payload,
      };
    case 'ADD_CUSTOM_THEME':
      return {
        ...state,
        customThemes: [...state.customThemes, action.payload],
      };
    case 'UPDATE_CUSTOM_THEME':
      return {
        ...state,
        customThemes: state.customThemes.map(theme =>
          theme.id === action.payload.id ? action.payload : theme
        ),
        currentTheme:
          state.currentTheme.id === action.payload.id
            ? action.payload
            : state.currentTheme,
      };
    case 'DELETE_CUSTOM_THEME':
      return {
        ...state,
        customThemes: state.customThemes.filter(
          theme => theme.id !== action.payload
        ),
        currentTheme:
          state.currentTheme.id === action.payload
            ? PRESET_THEMES[0] || state.currentTheme
            : state.currentTheme,
      };
    case 'SET_CUSTOMIZING':
      return {
        ...state,
        isCustomizing: action.payload,
      };
    case 'LOAD_THEMES':
      return {
        ...state,
        currentTheme: action.payload.currentTheme,
        customThemes: action.payload.customThemes,
      };
    default:
      return state;
  }
};

// 主题上下文
interface ThemeContextType {
  state: ThemeState;
  setTheme: (theme: CustomTheme) => void;
  addCustomTheme: (theme: CustomTheme) => void;
  updateCustomTheme: (theme: CustomTheme) => void;
  deleteCustomTheme: (themeId: string) => void;
  setCustomizing: (isCustomizing: boolean) => void;
  getAllThemes: () => CustomTheme[];
  getAntdThemeConfig: () => ThemeConfig;
  exportTheme: (theme: CustomTheme) => string;
  importTheme: (themeData: string) => CustomTheme | null;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// 本地存储键
const STORAGE_KEYS = {
  CURRENT_THEME: 'wendeal_current_theme',
  CUSTOM_THEMES: 'wendeal_custom_themes',
};

// 主题提供者组件
interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(themeReducer, {
    currentTheme: PRESET_THEMES[0] || {
      id: 'default',
      name: '默认主题',
      primaryColor: '#1890ff',
      backgroundColor: '#f5f5f5',
      textColor: '#262626',
      borderColor: '#d9d9d9',
      headerColor: '#ffffff',
      sidebarColor: '#f8f9fa',
      cardColor: '#ffffff',
      isDark: false,
      fontSize: { small: 12, medium: 14, large: 16 },
      borderRadius: 6,
      spacing: { small: 8, medium: 16, large: 24 },
    },
    customThemes: [],
    isCustomizing: false,
  });

  // 从本地存储加载主题
  useEffect(() => {
    try {
      const savedCurrentTheme = localStorage.getItem(
        STORAGE_KEYS.CURRENT_THEME
      );
      const savedCustomThemes = localStorage.getItem(
        STORAGE_KEYS.CUSTOM_THEMES
      );

      let currentTheme: CustomTheme = PRESET_THEMES[0] || {
        id: 'default',
        name: '默认主题',
        primaryColor: '#1890ff',
        backgroundColor: '#f5f5f5',
        textColor: '#262626',
        borderColor: '#d9d9d9',
        headerColor: '#ffffff',
        sidebarColor: '#f8f9fa',
        cardColor: '#ffffff',
        isDark: false,
        fontSize: { small: 12, medium: 14, large: 16 },
        borderRadius: 6,
        spacing: { small: 8, medium: 16, large: 24 },
      };
      let customThemes: CustomTheme[] = [];

      if (savedCustomThemes) {
        customThemes = JSON.parse(savedCustomThemes);
      }

      if (savedCurrentTheme) {
        const themeData = JSON.parse(savedCurrentTheme);
        // 查找预设主题或自定义主题
        const foundTheme = [...PRESET_THEMES, ...customThemes].find(
          t => t.id === themeData.id
        );
        if (foundTheme) {
          currentTheme = foundTheme;
        }
      }

      dispatch({
        type: 'LOAD_THEMES',
        payload: { currentTheme, customThemes },
      });
    } catch (error) {
      console.error('Failed to load themes from localStorage:', error);
    }
  }, []);

  // 保存当前主题到本地存储
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.CURRENT_THEME,
        JSON.stringify(state.currentTheme)
      );
    } catch (error) {
      console.error('Failed to save current theme to localStorage:', error);
    }
  }, [state.currentTheme]);

  // 保存自定义主题到本地存储
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.CUSTOM_THEMES,
        JSON.stringify(state.customThemes)
      );
    } catch (error) {
      console.error('Failed to save custom themes to localStorage:', error);
    }
  }, [state.customThemes]);

  // 应用CSS变量
  useEffect(() => {
    const root = document.documentElement;
    const theme = state.currentTheme;

    root.style.setProperty('--primary-color', theme.primaryColor);
    root.style.setProperty('--background-color', theme.backgroundColor);
    root.style.setProperty('--text-color', theme.textColor);
    root.style.setProperty('--border-color', theme.borderColor);
    root.style.setProperty('--header-color', theme.headerColor);
    root.style.setProperty('--sidebar-color', theme.sidebarColor);
    root.style.setProperty('--card-color', theme.cardColor);
    root.style.setProperty('--font-size-small', `${theme.fontSize.small}px`);
    root.style.setProperty('--font-size-medium', `${theme.fontSize.medium}px`);
    root.style.setProperty('--font-size-large', `${theme.fontSize.large}px`);
    root.style.setProperty('--border-radius', `${theme.borderRadius}px`);
    root.style.setProperty('--spacing-small', `${theme.spacing.small}px`);
    root.style.setProperty('--spacing-medium', `${theme.spacing.medium}px`);
    root.style.setProperty('--spacing-large', `${theme.spacing.large}px`);

    // 设置body的主题类
    document.body.className = theme.isDark ? 'theme-dark' : 'theme-light';
  }, [state.currentTheme]);

  const setTheme = (theme: CustomTheme) => {
    dispatch({ type: 'SET_THEME', payload: theme });
  };

  const addCustomTheme = (theme: CustomTheme) => {
    dispatch({ type: 'ADD_CUSTOM_THEME', payload: theme });
  };

  const updateCustomTheme = (theme: CustomTheme) => {
    dispatch({ type: 'UPDATE_CUSTOM_THEME', payload: theme });
  };

  const deleteCustomTheme = (themeId: string) => {
    dispatch({ type: 'DELETE_CUSTOM_THEME', payload: themeId });
  };

  const setCustomizing = (isCustomizing: boolean) => {
    dispatch({ type: 'SET_CUSTOMIZING', payload: isCustomizing });
  };

  const getAllThemes = (): CustomTheme[] => {
    return [...PRESET_THEMES, ...state.customThemes];
  };

  const getAntdThemeConfig = (): ThemeConfig => {
    const currentTheme = state.currentTheme;
    return {
      algorithm: currentTheme.isDark
        ? theme.darkAlgorithm
        : theme.defaultAlgorithm,
      token: {
        colorPrimary: currentTheme.primaryColor,
        colorBgBase: currentTheme.backgroundColor,
        colorTextBase: currentTheme.textColor,
        colorBorder: currentTheme.borderColor,
        borderRadius: currentTheme.borderRadius,
        fontSize: currentTheme.fontSize.medium,
        fontSizeSM: currentTheme.fontSize.small,
        fontSizeLG: currentTheme.fontSize.large,
      },
      components: {
        Layout: {
          colorBgLayout: currentTheme.backgroundColor,
          colorBgHeader: currentTheme.headerColor,
          colorBgBody: currentTheme.backgroundColor,
          headerBg: currentTheme.headerColor,
          siderBg: currentTheme.sidebarColor,
          bodyBg: currentTheme.backgroundColor,
        },
        Card: {
          colorBgContainer: currentTheme.cardColor,
        },
      },
    };
  };

  const exportTheme = (theme: CustomTheme): string => {
    return JSON.stringify(theme, null, 2);
  };

  const importTheme = (themeData: string): CustomTheme | null => {
    try {
      const theme = JSON.parse(themeData) as CustomTheme;
      // 验证主题数据结构
      if (
        theme.id &&
        theme.name &&
        theme.primaryColor &&
        theme.backgroundColor &&
        theme.textColor &&
        theme.fontSize &&
        typeof theme.isDark === 'boolean'
      ) {
        return theme;
      }
      return null;
    } catch {
      return null;
    }
  };

  const contextValue: ThemeContextType = {
    state,
    setTheme,
    addCustomTheme,
    updateCustomTheme,
    deleteCustomTheme,
    setCustomizing,
    getAllThemes,
    getAntdThemeConfig,
    exportTheme,
    importTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <ConfigProvider theme={getAntdThemeConfig()}>{children}</ConfigProvider>
    </ThemeContext.Provider>
  );
};

// 主题Hook
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
