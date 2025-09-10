import React, { useState } from 'react';
import {
  Form,
  Input,
  Button,
  Alert,
  Card,
  Typography,
  Space,
  Checkbox,
} from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts';
import type { LoginRequest } from '../../types/auth';
import './LoginForm.css';

const { Title, Text } = Typography;

export interface LoginFormProps {
  onSuccess?: () => void;
  onRegisterClick?: () => void;
  showRegisterLink?: boolean;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onRegisterClick,
  showRegisterLink = true,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const { login, isLoading, error } = useAuth();
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleSubmit = async (values: LoginRequest) => {
    console.log('🔐 LoginForm.handleSubmit called with:', values);
    try {
      setLoginError(null);
      console.log('📞 Calling login function...');
      await login(values);
      console.log('✅ Login successful!');
      onSuccess?.();
    } catch (err: any) {
      console.error('❌ Login failed:', err);
      const errorMessage = err?.message || t('auth.errors.invalidCredentials');
      setLoginError(errorMessage);
    }
  };

  const handleFormChange = () => {
    // 清除错误信息当用户开始输入时
    if (loginError) {
      setLoginError(null);
    }
  };

  return (
    <div className='login-form-container'>
      <Card className='login-form-card'>
        <div className='login-form-header'>
          <Title level={2} className='login-title'>
            {t('auth.login.title')}
          </Title>
          <Text type='secondary' className='login-subtitle'>
            {t('auth.login.accountInfo')}
          </Text>
        </div>

        {(error || loginError) && (
          <Alert
            message={
              loginError ||
              (typeof error === 'string'
                ? error
                : (error as any)?.message || t('auth.errors.unknownError'))
            }
            type='error'
            showIcon
            closable
            className='login-error-alert'
            onClose={() => setLoginError(null)}
          />
        )}

        <Form
          form={form}
          name='login'
          onFinish={handleSubmit}
          onValuesChange={handleFormChange}
          layout='vertical'
          size='large'
          className='login-form'
        >
          <Form.Item
            name='username'
            label={t('auth.login.username')}
            rules={[
              {
                required: true,
                message: 'Please enter username',
              },
              {
                min: 3,
                message: 'Username must be at least 3 characters',
              },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder={t('auth.login.username')}
              autoComplete='username'
            />
          </Form.Item>

          <Form.Item
            name='password'
            label={t('auth.login.password')}
            rules={[
              {
                required: true,
                message: 'Please enter password',
              },
              {
                min: 4,
                message: 'Password must be at least 4 characters',
              },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t('auth.login.password')}
              autoComplete='current-password'
            />
          </Form.Item>

          <Form.Item
            name='rememberMe'
            valuePropName='checked'
            initialValue={false}
          >
            <Checkbox>{t('auth.login.rememberMe')}</Checkbox>
          </Form.Item>

          <Form.Item className='login-form-actions'>
            <Button
              type='primary'
              htmlType='submit'
              loading={isLoading}
              block
              className='login-submit-btn'
            >
              {isLoading
                ? `${t('auth.login.loginButton')}...`
                : t('auth.login.loginButton')}
            </Button>
          </Form.Item>
        </Form>

        {showRegisterLink && (
          <div className='login-form-footer'>
            <Space>
              <Text type='secondary'>{t('auth.login.noAccount')}</Text>
              <Button
                type='link'
                onClick={onRegisterClick}
                className='register-link'
              >
                {t('auth.login.register')}
              </Button>
            </Space>
          </div>
        )}
      </Card>
    </div>
  );
};

export { LoginForm };
export default LoginForm;
