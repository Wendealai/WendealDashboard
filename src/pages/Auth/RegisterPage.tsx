import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Typography, Space, Divider, Alert } from 'antd';
import { useTranslation } from 'react-i18next';
import { RegisterForm } from '@/components/auth';
import { useAuth } from '@/contexts/AuthContext';
import AuthLayout from './AuthLayout';

const { Title, Text } = Typography;

const RegisterPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // 如果已经登录，重定向到仪表板
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // 注册成功回调
  const handleRegisterSuccess = () => {
    // 注册成功后可以选择直接登录或跳转到登录页面
    // 这里我们跳转到登录页面，让用户手动登录
    navigate('/login', {
      replace: true,
      state: {
        message: t('auth.registerSuccess'),
      },
    });
  };

  // 如果已经登录，显示加载状态
  if (isAuthenticated && user) {
    return (
      <AuthLayout title={t('common.loading')} subtitle={t('auth.loginSuccess')}>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Text>{t('common.loading')}</Text>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t('auth.register.title')}
      subtitle={t('auth.register.subtitle')}
    >
      <Space direction='vertical' size='large' style={{ width: '100%' }}>
        {/* 页面标题 */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
            {t('auth.register.title')}
          </Title>
          <Text type='secondary' style={{ fontSize: 16 }}>
            {t('auth.register.subtitle')}
          </Text>
        </div>

        {/* 注册优势提示 */}
        <Alert
          message={t('auth.register.benefits', 'Registration Benefits')}
          description={t(
            'auth.register.benefitsDesc',
            'After registration, you will get full system access including personal dashboard, data management and advanced features.'
          )}
          type='success'
          showIcon
          style={{ marginBottom: 16 }}
        />

        {/* 注册表单 */}
        <RegisterForm onSuccess={handleRegisterSuccess} />

        <Divider style={{ margin: '24px 0' }}>
          <Text type='secondary'>{t('common.or')}</Text>
        </Divider>

        {/* 登录链接 */}
        <div style={{ textAlign: 'center' }}>
          <Text type='secondary'>
            {t('auth.login.hasAccount', 'Already have an account?')}{' '}
            <Link
              to='/login'
              style={{
                color: '#1890ff',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              {t('auth.login.loginButton')}
            </Link>
          </Text>
        </div>

        {/* 安全提示 */}
        <div
          style={{
            background: '#f6f8fa',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #e1e4e8',
          }}
        >
          <Space direction='vertical' size='small' style={{ width: '100%' }}>
            <Text strong style={{ color: '#24292e', fontSize: 14 }}>
              🔒 {t('auth.register.securityPromise', 'Security Promise')}
            </Text>
            <Text type='secondary' style={{ fontSize: 12, lineHeight: 1.5 }}>
              •{' '}
              {t(
                'auth.register.dataProtection',
                'Your personal information will be strictly protected'
              )}
            </Text>
            <Text type='secondary' style={{ fontSize: 12, lineHeight: 1.5 }}>
              •{' '}
              {t(
                'auth.register.passwordSecurity',
                'Passwords are stored using advanced encryption'
              )}
            </Text>
            <Text type='secondary' style={{ fontSize: 12, lineHeight: 1.5 }}>
              •{' '}
              {t(
                'auth.register.noDataSharing',
                'We will not share your data with third parties'
              )}
            </Text>
          </Space>
        </div>

        {/* 帮助信息 */}
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Space direction='vertical' size='small'>
            <Text type='secondary' style={{ fontSize: 12 }}>
              {t(
                'auth.register.agreeTermsText',
                'By registering, you agree to our'
              )}
            </Text>
            <Space size='small'>
              <Link
                to='/terms'
                style={{
                  color: '#1890ff',
                  fontSize: 12,
                  textDecoration: 'none',
                }}
              >
                {t('common.terms')}
              </Link>
              <Text type='secondary' style={{ fontSize: 12 }}>
                {t('common.and')}
              </Text>
              <Link
                to='/privacy'
                style={{
                  color: '#1890ff',
                  fontSize: 12,
                  textDecoration: 'none',
                }}
              >
                {t('common.privacy')}
              </Link>
            </Space>
          </Space>
        </div>
      </Space>
    </AuthLayout>
  );
};

export default RegisterPage;
