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
        <GlobalOutlined style={{ fontSize: '16px' }} />
        <Switch
          size='small'
          checked={isEnglish}
          onChange={handleLanguageChange}
          checkedChildren={<span style={{ color: '#000000' }}>En</span>}
          unCheckedChildren={<span style={{ color: '#000000' }}>中</span>}
          style={{
            minWidth: '44px',
            backgroundColor: isEnglish ? '#ffffff' : '#ffffff',
            borderColor: '#d9d9d9',
          }}
        />
      </Space>
    </Tooltip>
  );
};

export { LanguageSwitcher as default };
export { LanguageSwitcher };
