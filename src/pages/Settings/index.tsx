import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Switch,
  Select,
  Button,
  Divider,
  Space,
  Typography,
} from 'antd';
import { useMessage } from '@/hooks';
import {
  SettingOutlined,
  BgColorsOutlined,
  GlobalOutlined,
  BellOutlined,
  SecurityScanOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { toggleTheme, setLanguage } from '@/store/slices/uiSlice';
import type { Language } from '@/types/ui';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;
const { Option } = Select;

interface SettingsPageProps {}

const SettingsPage: React.FC<SettingsPageProps> = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { theme, language } = useAppSelector(state => state.ui);
  const [loading, setLoading] = useState(false);
  const message = useMessage();

  // 主题切换处理
  const handleThemeChange = (checked: boolean) => {
    dispatch(toggleTheme());
    const mode = checked
      ? t('settings.messages.dark')
      : t('settings.messages.light');
    message.success(t('settings.messages.themeChanged', { mode }));
  };

  // 语言切换处理
  const handleLanguageChange = (value: Language) => {
    dispatch(setLanguage(value));
    const languageName =
      value === 'zh'
        ? t('settings.appearance.chinese')
        : t('settings.appearance.english');
    message.success(
      t('settings.messages.languageChanged', { language: languageName })
    );
  };

  // 保存设置
  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // 模拟保存设置到服务器
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success(t('settings.messages.settingsSaved'));
    } catch (error) {
      message.error(t('settings.messages.settingsSaveFailed'));
    } finally {
      setLoading(false);
    }
  };

  // 重置设置
  const handleResetSettings = () => {
    dispatch(setLanguage('zh'));
    if (theme === 'dark') {
      dispatch(toggleTheme());
    }
    message.success(t('settings.messages.settingsReset'));
  };

  // 通知测试
  const handleNotificationTest = () => {
    // 跳转到通知演示页面
    navigate('/notification-demo');
  };

  return (
    <div className='settings-page' style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <SettingOutlined style={{ marginRight: '8px' }} />
          {t('settings.title')}
        </Title>
        <Text type='secondary'>{t('settings.subtitle')}</Text>
      </div>

      <Row gutter={[24, 24]}>
        {/* 外观设置 */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <BgColorsOutlined />
                {t('settings.appearance.title')}
              </Space>
            }
            className='settings-card'
          >
            <div className='setting-item'>
              <div className='setting-label'>
                <Text strong>{t('settings.appearance.darkMode')}</Text>
                <br />
                <Text type='secondary' style={{ fontSize: '12px' }}>
                  {t('settings.appearance.darkModeDesc')}
                </Text>
              </div>
              <Switch
                checked={theme === 'dark'}
                onChange={handleThemeChange}
                checkedChildren={t('settings.appearance.darkLabel')}
                unCheckedChildren={t('settings.appearance.lightLabel')}
              />
            </div>

            <Divider />

            <div className='setting-item'>
              <div className='setting-label'>
                <Text strong>{t('settings.appearance.language')}</Text>
                <br />
                <Text type='secondary' style={{ fontSize: '12px' }}>
                  {t('settings.appearance.languageDesc')}
                </Text>
              </div>
              <Select
                value={language}
                onChange={handleLanguageChange}
                style={{ width: 120 }}
              >
                <Option value='zh'>{t('settings.appearance.chinese')}</Option>
                <Option value='en'>{t('settings.appearance.english')}</Option>
              </Select>
            </div>
          </Card>
        </Col>

        {/* 通知设置 */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <BellOutlined />
                {t('settings.notifications.title')}
              </Space>
            }
            className='settings-card'
          >
            <div className='setting-item'>
              <div className='setting-label'>
                <Text strong>{t('settings.notifications.desktop')}</Text>
                <br />
                <Text type='secondary' style={{ fontSize: '12px' }}>
                  {t('settings.notifications.desktopDesc')}
                </Text>
              </div>
              <Switch defaultChecked />
            </div>

            <Divider />

            <div className='setting-item'>
              <div className='setting-label'>
                <Text strong>{t('settings.notifications.email')}</Text>
                <br />
                <Text type='secondary' style={{ fontSize: '12px' }}>
                  {t('settings.notifications.emailDesc')}
                </Text>
              </div>
              <Switch defaultChecked />
            </div>

            <Divider />

            <div className='setting-item'>
              <div className='setting-label'>
                <Text strong>{t('settings.notifications.sound')}</Text>
                <br />
                <Text type='secondary' style={{ fontSize: '12px' }}>
                  {t('settings.notifications.soundDesc')}
                </Text>
              </div>
              <Switch />
            </div>

            <Divider />

            <div className='setting-item'>
              <div className='setting-label'>
                <Text strong>{t('settings.notifications.test')}</Text>
                <br />
                <Text type='secondary' style={{ fontSize: '12px' }}>
                  {t('settings.notifications.testDesc')}
                </Text>
              </div>
              <Button
                icon={<ExperimentOutlined />}
                onClick={handleNotificationTest}
                type='default'
              >
                {t('settings.notifications.testButton')}
              </Button>
            </div>
          </Card>
        </Col>

        {/* 安全设置 */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <SecurityScanOutlined />
                {t('settings.security.title')}
              </Space>
            }
            className='settings-card'
          >
            <div className='setting-item'>
              <div className='setting-label'>
                <Text strong>{t('settings.security.autoLogout')}</Text>
                <br />
                <Text type='secondary' style={{ fontSize: '12px' }}>
                  {t('settings.security.autoLogoutDesc')}
                </Text>
              </div>
              <Select defaultValue='30' style={{ width: 120 }}>
                <Option value='15'>
                  {t('settings.security.timeOptions.15min')}
                </Option>
                <Option value='30'>
                  {t('settings.security.timeOptions.30min')}
                </Option>
                <Option value='60'>
                  {t('settings.security.timeOptions.1hour')}
                </Option>
                <Option value='never'>
                  {t('settings.security.timeOptions.never')}
                </Option>
              </Select>
            </div>

            <Divider />

            <div className='setting-item'>
              <div className='setting-label'>
                <Text strong>{t('settings.security.twoFactor')}</Text>
                <br />
                <Text type='secondary' style={{ fontSize: '12px' }}>
                  {t('settings.security.twoFactorDesc')}
                </Text>
              </div>
              <Switch />
            </div>
          </Card>
        </Col>

        {/* 系统信息 */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <GlobalOutlined />
                {t('settings.systemInfo.title')}
              </Space>
            }
            className='settings-card'
          >
            <div className='system-info'>
              <div className='info-item'>
                <Text type='secondary'>
                  {t('settings.systemInfo.appVersion')}：
                </Text>
                <Text strong>v1.0.0</Text>
              </div>
              <div className='info-item'>
                <Text type='secondary'>
                  {t('settings.systemInfo.buildTime')}：
                </Text>
                <Text strong>2024-01-20</Text>
              </div>
              <div className='info-item'>
                <Text type='secondary'>
                  {t('settings.systemInfo.environment')}：
                </Text>
                <Text strong>{t('settings.systemInfo.development')}</Text>
              </div>
              <div className='info-item'>
                <Text type='secondary'>
                  {t('settings.systemInfo.browser')}：
                </Text>
                <Text strong>{navigator.userAgent.split(' ')[0]}</Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 操作按钮 */}
      <div style={{ marginTop: '32px', textAlign: 'center' }}>
        <Space size='large'>
          <Button
            type='primary'
            size='large'
            loading={loading}
            onClick={handleSaveSettings}
          >
            {t('settings.buttons.save')}
          </Button>
          <Button size='large' onClick={handleResetSettings}>
            {t('settings.buttons.reset')}
          </Button>
        </Space>
      </div>

      <style>{`
        .settings-card {
          height: 100%;
        }

        .setting-item {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin: 16px 0;
        }

        .setting-label {
          flex: 1;
          margin-right: 16px;
        }

        .system-info .info-item {
          display: flex;
          justify-content: space-between;
          margin: 12px 0;
          padding: 8px 0;
          border-bottom: 1px solid var(--border-color, #f0f0f0);
        }

        .system-info .info-item:last-child {
          border-bottom: none;
        }

        @media (max-width: 768px) {
          .settings-page {
            padding: 16px;
          }

          .setting-item {
            flex-direction: column;
            align-items: flex-start;
          }

          .setting-label {
            margin-right: 0;
            margin-bottom: 8px;
          }
        }
      `}</style>
    </div>
  );
};

export default SettingsPage;
