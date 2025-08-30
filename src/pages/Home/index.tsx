import React from 'react';
import { Card, Row, Col, Typography, Button, Space, Avatar, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  DashboardOutlined,
  UserOutlined,
  SettingOutlined,
  BarChartOutlined,
  LoginOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/contexts';
import './styles.css';

const { Title, Paragraph } = Typography;

interface QuickActionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  path: string;
}

const QuickAction: React.FC<QuickActionProps> = ({
  icon,
  title,
  description,
  path,
}) => {
  const navigate = useNavigate();

  return (
    <Card
      hoverable
      className='quick-action-card'
      onClick={() => navigate(path)}
      styles={{ body: { textAlign: 'center', padding: '24px' } }}
    >
      <div className='quick-action-icon'>{icon}</div>
      <Title level={4} style={{ margin: '16px 0 8px' }}>
        {title}
      </Title>
      <Paragraph type='secondary' style={{ margin: 0 }}>
        {description}
      </Paragraph>
    </Card>
  );
};

const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const quickActions = [
    {
      icon: (
        <DashboardOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
      ),
      title: t('home.actions.dashboard.title'),
      description: t('home.actions.dashboard.description'),
      path: '/dashboard',
    },
    {
      icon: <BarChartOutlined style={{ fontSize: '32px', color: '#52c41a' }} />,
      title: t('home.actions.dataAnalysis.title'),
      description: t('home.actions.dataAnalysis.description'),
      path: '/analytics',
    },
    {
      icon: <UserOutlined style={{ fontSize: '32px', color: '#722ed1' }} />,
      title: t('home.actions.userManagement.title'),
      description: t('home.actions.userManagement.description'),
      path: '/users',
    },
    {
      icon: <SettingOutlined style={{ fontSize: '32px', color: '#fa8c16' }} />,
      title: t('home.actions.systemSettings.title'),
      description: t('home.actions.systemSettings.description'),
      path: '/settings',
    },
  ];

  return (
    <div className='home-page'>
      <div className='home-header'>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <Title level={1} className='welcome-title' style={{ margin: 0 }}>
            {t('home.welcome')}
          </Title>
          {isAuthenticated && user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Avatar size='large' icon={<UserOutlined />} />
              <div>
                <div style={{ fontWeight: 'bold' }}>{user.username}</div>
                <Tag color={user.role === 'admin' ? 'red' : 'blue'}>
                  {user.role}
                </Tag>
              </div>
              <Button
                type='text'
                icon={<LoginOutlined />}
                onClick={() => logout()}
              >
                {t('navigation.logout')}
              </Button>
            </div>
          )}
        </div>
        <Paragraph className='welcome-description'>
          {isAuthenticated
            ? t('home.welcomeBack', { username: user?.username })
            : t('home.welcomeGuest')}
        </Paragraph>
      </div>

      <div className='quick-actions-section'>
        <Title level={2} style={{ marginBottom: '24px', textAlign: 'center' }}>
          {t('home.quickActions')}
        </Title>
        <Row gutter={[24, 24]}>
          {quickActions.map((action, index) => (
            <Col xs={24} sm={12} lg={6} key={index}>
              <QuickAction {...action} />
            </Col>
          ))}
        </Row>
      </div>

      <div className='getting-started-section'>
        <Card className='getting-started-card'>
          <Title level={3}>{t('home.gettingStarted')}</Title>
          <Paragraph>{t('home.firstTimeUser')}</Paragraph>
          <ul>
            <li>{t('home.steps.dashboard')}</li>
            <li>{t('home.steps.userManagement')}</li>
            <li>{t('home.steps.systemSettings')}</li>
            <li>{t('home.steps.dataAnalysis')}</li>
          </ul>
          <Space style={{ marginTop: '16px' }}>
            {isAuthenticated ? (
              <>
                <Button type='primary' onClick={() => navigate('/dashboard')}>
                  {t('home.buttons.goToDashboard')}
                </Button>
                <Button onClick={() => navigate('/profile')}>
                  {t('home.buttons.profile')}
                </Button>
              </>
            ) : (
              <>
                <Button type='primary' onClick={() => navigate('/login')}>
                  {t('home.buttons.loginNow')}
                </Button>
                <Button onClick={() => navigate('/register')}>
                  {t('home.buttons.registerAccount')}
                </Button>
              </>
            )}
          </Space>
        </Card>
      </div>
    </div>
  );
};

export default HomePage;
