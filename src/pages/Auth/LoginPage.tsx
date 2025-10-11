import React, { useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Typography, Space, Alert } from 'antd';
import { useTranslation } from 'react-i18next';
import { LoginForm } from '@/components/auth';
import { useAuth } from '@/contexts/AuthContext';
import AuthLayout from './AuthLayout';

const { Text } = Typography;

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();

  // 获取重定向路径，默认为首页
  const from = (location.state as any)?.from?.pathname || '/';

  // 处理已登录用户的自动跳转
  useEffect(() => {
    // 只有在非加载状态且已认证时才跳转，避免登录过程中的意外跳转
    if (isAuthenticated && user && !isLoading) {
      // 延迟跳转，避免与登录流程冲突
      const timer = setTimeout(() => {
        navigate(from, { replace: true });
      }, 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isAuthenticated, user, isLoading, navigate, from]);

  // 登录成功回调
  const handleLoginSuccess = () => {
    // 登录成功后重定向
    navigate(from, { replace: true });
  };

  // 如果已经登录且不在加载状态，显示跳转状态
  if (isAuthenticated && user && !isLoading) {
    return (
      <AuthLayout>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Text>{t('common.loading')}</Text>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div style={{ width: '100%' }}>
        {/* 显示来源页面信息 */}
        {location.state?.from && (
          <Alert
            message={t('auth.login.needLogin')}
            description={t('auth.login.loginRequired', {
              path: location.state.from.pathname,
            })}
            type='info'
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        {/* 登录表单 */}
        <LoginForm onSuccess={handleLoginSuccess} />

        {/* 帮助信息 */}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Space direction='vertical' size='small'>
            <Text type='secondary' style={{ fontSize: 12 }}>
              {t('auth.login.agreeTerms', 'By signing in, you agree to our')}
            </Text>
            <Space size='small'>
              <Link
                to='/terms'
                style={{
                  color: '#667eea',
                  fontSize: 12,
                  textDecoration: 'none',
                }}
              >
                {t('common.terms', 'Terms of Service')}
              </Link>
              <Text type='secondary' style={{ fontSize: 12 }}>
                {t('common.and', 'and')}
              </Text>
              <Link
                to='/privacy'
                style={{
                  color: '#667eea',
                  fontSize: 12,
                  textDecoration: 'none',
                }}
              >
                {t('common.privacy', 'Privacy Policy')}
              </Link>
            </Space>
          </Space>
        </div>
      </div>
    </AuthLayout>
  );
};

export default LoginPage;
