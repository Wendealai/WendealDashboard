import React, { useState, useEffect } from 'react';
import { Button, Dropdown, Space, Tooltip } from 'antd';
import { GlobalOutlined, CheckOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  supportedLanguages,
  changeLanguage,
  getCurrentLanguageInfo,
} from '@/locales';

export interface LanguageSwitchProps {
  size?: 'small' | 'middle' | 'large';
  type?: 'primary' | 'default' | 'dashed' | 'link' | 'text';
  showText?: boolean;
  showFlag?: boolean;
  placement?:
    | 'topLeft'
    | 'topCenter'
    | 'topRight'
    | 'bottomLeft'
    | 'bottomCenter'
    | 'bottomRight';
}

const LanguageSwitch: React.FC<LanguageSwitchProps> = ({
  size = 'middle',
  type = 'default',
  showText = false,
  showFlag = true,
  placement = 'bottomRight',
}) => {
  const { t, i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(getCurrentLanguageInfo());

  // 监听语言变化
  useEffect(() => {
    const handleLanguageChange = () => {
      setCurrentLang(getCurrentLanguageInfo());
    };

    // 监听i18n语言变化事件
    i18n.on('languageChanged', handleLanguageChange);

    // 监听自定义语言变化事件
    window.addEventListener('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
      window.removeEventListener('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  // 处理语言切换
  const handleLanguageChange = (languageKey: string) => {
    changeLanguage(languageKey);
  };

  // 构建语言菜单项
  const languageMenuItems: MenuProps['items'] = supportedLanguages.map(
    lang => ({
      key: lang.key,
      label: (
        <Space>
          {showFlag && <span style={{ fontSize: '16px' }}>{lang.flag}</span>}
          <span>{lang.label}</span>
          {currentLang.key === lang.key && (
            <CheckOutlined style={{ color: '#52c41a' }} />
          )}
        </Space>
      ),
      onClick: () => handleLanguageChange(lang.key),
    })
  );

  // 获取当前语言显示内容
  const getCurrentLanguageDisplay = () => {
    if (showText && showFlag) {
      return (
        <Space>
          <span style={{ fontSize: '16px' }}>{currentLang.flag}</span>
          <span>{currentLang.label}</span>
        </Space>
      );
    }

    if (showText) {
      return currentLang.label;
    }

    if (showFlag) {
      return <span style={{ fontSize: '16px' }}>{currentLang.flag}</span>;
    }

    return null;
  };

  return (
    <Dropdown
      menu={{ items: languageMenuItems }}
      placement={placement}
      trigger={['click']}
    >
      <Tooltip title={t('language.switch')}>
        <Button
          type={type}
          size={size}
          icon={!showFlag && !showText ? <GlobalOutlined /> : undefined}
        >
          {getCurrentLanguageDisplay()}
        </Button>
      </Tooltip>
    </Dropdown>
  );
};

export { LanguageSwitch as default };
export { LanguageSwitch };
