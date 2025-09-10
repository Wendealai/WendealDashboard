import React, { useState } from 'react';
import {
  Form,
  Input,
  Button,
  Alert,
  Card,
  Typography,
  Space,
  Progress,
} from 'antd';
import { useMessage } from '@/hooks';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts';
import type { RegisterData } from '../../types/auth';
import './RegisterForm.css';

const { Title, Text } = Typography;

export interface RegisterFormProps {
  onSuccess?: () => void;
  onLoginClick?: () => void;
  showLoginLink?: boolean;
}

// 密码强度检查函数
const checkPasswordStrength = (password: string) => {
  let score = 0;
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  Object.values(checks).forEach(check => {
    if (check) score += 20;
  });

  return {
    score,
    checks,
    level: score < 40 ? 'weak' : score < 80 ? 'medium' : 'strong',
  };
};

const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  onLoginClick,
  showLoginLink = true,
}) => {
  const { t, i18n } = useTranslation();
  const [form] = Form.useForm();
  const { register, isLoading, error } = useAuth();
  const message = useMessage();
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    level: 'weak',
    checks: {},
  });

  // 安全的翻译函数，防止在i18n未初始化时出错
  const safeT = (key: string, options?: any): string => {
    try {
      if (!i18n.isInitialized) {
        console.warn('i18n not initialized, using fallback for key:', key);
        return key;
      }
      return String(t(key, options));
    } catch (error) {
      console.warn('Translation error for key:', key, error);
      return key;
    }
  };

  const handleSubmit = async (values: RegisterData) => {
    console.log('📝 RegisterForm.handleSubmit called with:', values);
    try {
      setRegisterError(null);
      console.log('🔄 Calling register function...');
      await register(values);
      console.log('✅ Register function completed successfully');
      message.success(t('auth.register.registerSuccess'));
      onSuccess?.();
    } catch (err: any) {
      console.error('❌ RegisterForm.handleSubmit error:', err);
      const errorMessage = err?.message || t('auth.errors.unknownError');
      setRegisterError(errorMessage);
    }
  };

  const handleSubmitFailed = (errorInfo: any) => {
    console.log('❌ RegisterForm validation failed:', errorInfo);
    console.log('Failed fields:', errorInfo.errorFields);
  };

  const handleFormChange = () => {
    // 清除错误信息当用户开始输入时
    if (registerError) {
      setRegisterError(null);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value;
    const strength = checkPasswordStrength(password);
    setPasswordStrength(strength);
  };

  const getPasswordStrengthColor = () => {
    switch (passwordStrength.level) {
      case 'weak':
        return '#ff4d4f';
      case 'medium':
        return '#faad14';
      case 'strong':
        return '#52c41a';
      default:
        return '#d9d9d9';
    }
  };

  const getPasswordStrengthText = () => {
    switch (passwordStrength.level) {
      case 'weak':
        return t('form.passwordWeak');
      case 'medium':
        return t('form.passwordMedium');
      case 'strong':
        return t('form.passwordStrong');
      default:
        return '';
    }
  };

  return (
    <div className='register-form-container'>
      <Card className='register-form-card'>
        <div className='register-form-header'>
          <Title level={2} className='register-title'>
            {t('auth.register.title')}
          </Title>
          <Text type='secondary' className='register-subtitle'>
            {t('auth.register.subtitle')}
          </Text>
        </div>

        {(error || registerError) && (
          <Alert
            message={
              registerError ||
              (typeof error === 'string'
                ? error
                : error?.message || t('auth.errors.unknownError'))
            }
            type='error'
            showIcon
            closable
            className='register-error-alert'
            onClose={() => setRegisterError(null)}
          />
        )}

        <Form
          form={form}
          name='register'
          onFinish={handleSubmit}
          onFinishFailed={handleSubmitFailed}
          onValuesChange={handleFormChange}
          layout='vertical'
          size='large'
          className='register-form'
        >
          <Form.Item
            name='username'
            label={t('auth.register.username')}
            rules={[
              {
                required: true,
                message: t('form.required'),
              },
              {
                min: 3,
                message: t('form.tooShort', { min: 3 }),
              },
              {
                max: 20,
                message: t('form.tooLong', { max: 20 }),
              },
              {
                pattern: /^[a-zA-Z0-9_]+$/,
                message: t('auth.register.usernamePattern'),
              },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder={t('auth.register.username')}
              autoComplete='username'
            />
          </Form.Item>

          <Form.Item
            name='email'
            label={t('auth.register.email')}
            rules={[
              {
                required: true,
                message: t('form.required'),
              },
              {
                type: 'email',
                message: t('form.invalidEmail'),
              },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder={t('auth.register.email')}
              autoComplete='email'
            />
          </Form.Item>

          <Form.Item
            name='password'
            label={t('auth.register.password')}
            rules={[
              {
                required: true,
                message: t('form.required'),
              },
              {
                min: 8,
                message: t('form.tooShort', { min: 8 }),
              },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  const strength = checkPasswordStrength(value);
                  if (strength.score < 60) {
                    return Promise.reject(
                      new Error(safeT('form.weakPassword'))
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t('auth.register.password')}
              autoComplete='new-password'
              onChange={handlePasswordChange}
            />
          </Form.Item>

          {/* 密码强度指示器 */}
          <div className='password-strength-indicator'>
            <div className='strength-progress'>
              <Progress
                percent={passwordStrength.score}
                strokeColor={getPasswordStrengthColor()}
                showInfo={false}
                size='small'
              />
              <Text
                className='strength-text'
                style={{ color: getPasswordStrengthColor() }}
              >
                {t('form.passwordStrength')}: {getPasswordStrengthText()}
              </Text>
            </div>
          </div>

          <Form.Item
            name='confirmPassword'
            label={t('auth.register.confirmPassword')}
            dependencies={['password']}
            rules={[
              {
                required: true,
                message: t('form.required'),
              },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error(safeT('auth.errors.passwordMismatch'))
                  );
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t('auth.register.confirmPassword')}
              autoComplete='new-password'
            />
          </Form.Item>

          <Form.Item className='register-form-actions'>
            <Button
              type='primary'
              htmlType='submit'
              loading={isLoading}
              block
              className='register-submit-btn'
              onClick={() => console.log('🔘 Register button clicked')}
            >
              {isLoading
                ? `${t('auth.register.registerButton')}...`
                : t('auth.register.registerButton')}
            </Button>
          </Form.Item>
        </Form>

        {showLoginLink && (
          <div className='register-form-footer'>
            <Space>
              <Text type='secondary'>{t('auth.register.haveAccount')}</Text>
              <Button type='link' onClick={onLoginClick} className='login-link'>
                {t('auth.register.login')}
              </Button>
            </Space>
          </div>
        )}
      </Card>
    </div>
  );
};

export { RegisterForm };
export default RegisterForm;
