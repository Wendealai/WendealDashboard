import React from 'react';
import { Button, Tooltip } from 'antd';
import { SunOutlined, MoonOutlined } from '@ant-design/icons';
import { useTheme } from '@/contexts/ThemeContext';

export interface ThemeToggleProps {
  size?: 'small' | 'middle' | 'large';
  type?: 'primary' | 'default' | 'dashed' | 'link' | 'text';
  showText?: boolean;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({
  size = 'middle',
  type = 'default',
  showText = false,
}) => {
  const { state, setTheme, getAllThemes } = useTheme();

  // 快速切换深色/浅色模式
  const handleQuickToggle = () => {
    const currentTheme = state.currentTheme;
    const allThemes = getAllThemes();

    if (currentTheme.isDark) {
      // 切换到浅色主题
      const lightTheme = allThemes.find(t => !t.isDark);
      if (lightTheme) {
        setTheme(lightTheme);
      }
    } else {
      // 切换到深色主题
      const darkTheme = allThemes.find(t => t.isDark);
      if (darkTheme) {
        setTheme(darkTheme);
      }
    }
  };

  return (
    <Tooltip
      title={state.currentTheme.isDark ? '切换到浅色模式' : '切换到深色模式'}
    >
      <Button
        type={type}
        size={size}
        icon={state.currentTheme.isDark ? <SunOutlined /> : <MoonOutlined />}
        onClick={handleQuickToggle}
      >
        {showText && (state.currentTheme.isDark ? '浅色' : '深色')}
      </Button>
    </Tooltip>
  );
};

export default ThemeToggle;
