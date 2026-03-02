import React from 'react';
import { useTranslation } from 'react-i18next';
import { Switch, Space, Tooltip } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { changeLanguage } from '@/locales';

const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();

  const handleLanguageChange = (checked: boolean) => {
    const newLanguage = checked ? 'en-US' : 'zh-CN';
    changeLanguage(newLanguage);
  };

  const isEnglish = i18n.language === 'en-US';

  return (
    <Tooltip title={t('language.switch', '切换语言')}>
      <Space size='small'>
        <GlobalOutlined
          style={{ fontSize: '16px', color: 'var(--color-text-secondary)' }}
        />
        <Switch
          className='theme-language-switch'
          size='small'
          checked={isEnglish}
          onChange={handleLanguageChange}
          checkedChildren={
            <span style={{ color: 'var(--color-text)' }}>En</span>
          }
          unCheckedChildren={
            <span style={{ color: 'var(--color-text)' }}>中</span>
          }
          style={{
            minWidth: '44px',
            backgroundColor: 'var(--color-bg-container)',
            borderColor: 'var(--color-border)',
          }}
        />
      </Space>
    </Tooltip>
  );
};

export { LanguageSwitcher as default };
export { LanguageSwitcher };
