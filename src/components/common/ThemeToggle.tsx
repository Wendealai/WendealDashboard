import React, { useState } from 'react';
import { Button, Dropdown, Space, Tooltip } from 'antd';
import {
  BgColorsOutlined,
  SunOutlined,
  MoonOutlined,
  SettingOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useTheme, PRESET_THEMES } from '@/contexts/ThemeContext';
import { ThemeCustomizer } from '@/components/Layout';

export interface ThemeToggleProps {
  size?: 'small' | 'middle' | 'large';
  type?: 'primary' | 'default' | 'dashed' | 'link' | 'text';
  showText?: boolean;
  placement?:
    | 'topLeft'
    | 'topCenter'
    | 'topRight'
    | 'bottomLeft'
    | 'bottomCenter'
    | 'bottomRight';
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({
  size = 'middle',
  type = 'default',
  showText = false,
  placement = 'bottomRight',
}) => {
  const { state, setTheme, getAllThemes } = useTheme();
  const [customizerVisible, setCustomizerVisible] = useState(false);

  const allThemes = getAllThemes();

  // 构建主题菜单项
  const themeMenuItems: MenuProps['items'] = [
    // 预设主题
    {
      key: 'preset-themes',
      label: '预设主题',
      type: 'group',
    },
    ...PRESET_THEMES.map(theme => ({
      key: theme.id,
      label: (
        <Space>
          <div
            style={{
              width: 12,
              height: 12,
              backgroundColor: theme.primaryColor,
              borderRadius: 2,
              border: '1px solid #d9d9d9',
            }}
          />
          <span>{theme.name}</span>
          {state.currentTheme.id === theme.id && (
            <CheckOutlined style={{ color: '#52c41a' }} />
          )}
        </Space>
      ),
      onClick: () => setTheme(theme),
    })),

    // 分隔线
    {
      type: 'divider',
    },

    // 自定义主题
    ...(state.customThemes.length > 0
      ? [
          {
            key: 'custom-themes',
            label: '自定义主题',
            type: 'group',
          },
          ...state.customThemes.map(theme => ({
            key: theme.id,
            label: (
              <Space>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    backgroundColor: theme.primaryColor,
                    borderRadius: 2,
                    border: '1px solid #d9d9d9',
                  }}
                />
                <span>{theme.name}</span>
                {state.currentTheme.id === theme.id && (
                  <CheckOutlined style={{ color: '#52c41a' }} />
                )}
              </Space>
            ),
            onClick: () => setTheme(theme),
          })),
          {
            type: 'divider',
          },
        ]
      : []),

    // 主题定制器
    {
      key: 'customizer',
      label: (
        <Space>
          <SettingOutlined />
          主题定制器
        </Space>
      ),
      onClick: () => setCustomizerVisible(true),
    },
  ];

  // 快速切换深色/浅色模式
  const handleQuickToggle = () => {
    const currentTheme = state.currentTheme;
    if (currentTheme.isDark) {
      // 切换到浅色主题
      const lightTheme =
        allThemes.find(t => !t.isDark && t.id !== currentTheme.id) ||
        PRESET_THEMES[0];
      setTheme(lightTheme);
    } else {
      // 切换到深色主题
      const darkTheme =
        allThemes.find(t => t.isDark) ||
        PRESET_THEMES.find(t => t.isDark) ||
        PRESET_THEMES[1];
      setTheme(darkTheme);
    }
  };

  return (
    <>
      <Space.Compact>
        {/* 快速切换按钮 */}
        <Tooltip
          title={
            state.currentTheme.isDark ? '切换到浅色模式' : '切换到深色模式'
          }
        >
          <Button
            type={type}
            size={size}
            icon={
              state.currentTheme.isDark ? <SunOutlined /> : <MoonOutlined />
            }
            onClick={handleQuickToggle}
          >
            {showText && (state.currentTheme.isDark ? '浅色' : '深色')}
          </Button>
        </Tooltip>

        {/* 主题选择下拉菜单 */}
        <Dropdown
          menu={{ items: themeMenuItems }}
          placement={placement}
          trigger={['click']}
        >
          <Button type={type} size={size} icon={<BgColorsOutlined />}>
            {showText && '主题'}
          </Button>
        </Dropdown>
      </Space.Compact>

      {/* 主题定制器 */}
      <ThemeCustomizer
        visible={customizerVisible}
        onClose={() => setCustomizerVisible(false)}
      />
    </>
  );
};

export default ThemeToggle;
