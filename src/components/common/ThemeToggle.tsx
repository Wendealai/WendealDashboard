import React, { useState } from 'react';
import { MoonOutlined, SunOutlined } from '@ant-design/icons';
import { Flex, Segmented } from 'antd';
import type { SizeType } from 'antd/es/config-provider/SizeContext';
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
  const [componentSize, setComponentSize] = useState<SizeType>('middle');
  const { state, setTheme, getAllThemes } = useTheme();

  // 处理主题切换
  const handleThemeChange = (value: string) => {
    const allThemes = getAllThemes();

    if (value === 'light') {
      // 切换到浅色主题
      const lightTheme = allThemes.find(t => !t.isDark);
      if (lightTheme) {
        setTheme(lightTheme);
      }
    } else if (value === 'dark') {
      // 切换到深色主题
      const darkTheme = allThemes.find(t => t.isDark);
      if (darkTheme) {
        setTheme(darkTheme);
      }
    }
  };

  // 如果需要显示文本，使用原始按钮样式
  if (showText) {
    return (
      <Flex gap='small' align='flex-start' vertical>
        <Segmented
          options={['small', 'middle', 'large']}
          value={componentSize}
          onChange={value => setComponentSize(value as SizeType)}
        />
        <Segmented
          size={componentSize}
          shape='round'
          options={[
            {
              value: 'light',
              icon: <SunOutlined />,
              label: '浅色',
            },
            {
              value: 'dark',
              icon: <MoonOutlined />,
              label: '深色',
            },
          ]}
          value={state.currentTheme.isDark ? 'dark' : 'light'}
          onChange={handleThemeChange}
        />
      </Flex>
    );
  }

  // 默认使用分段控制器
  return (
    <Segmented
      size={size}
      shape='round'
      options={[
        { value: 'light', icon: <SunOutlined /> },
        { value: 'dark', icon: <MoonOutlined /> },
      ]}
      value={state.currentTheme.isDark ? 'dark' : 'light'}
      onChange={handleThemeChange}
    />
  );
};

export default ThemeToggle;
