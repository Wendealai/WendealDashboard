import React, { useEffect, useMemo } from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import {
  clearAuthError,
  loginWithPassword,
  selectAuth,
} from '@/store/slices/authSlice';
import { isSupabaseAuthReady } from '@/services/sparkeryAuthService';
import { useTranslation } from 'react-i18next';

const { Title, Paragraph, Text } = Typography;

interface LoginFormValues {
  email: string;
  password: string;
}

const resolveRedirect = (searchParams: URLSearchParams): string => {
  const redirect = searchParams.get('redirect');
  if (!redirect) {
    return '/sparkery';
  }
  if (!redirect.startsWith('/')) {
    return '/sparkery';
  }
  if (redirect.startsWith('/login')) {
    return '/sparkery';
  }
  return redirect;
};

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const auth = useAppSelector(selectAuth);
  const [form] = Form.useForm<LoginFormValues>();

  const redirectPath = useMemo(() => resolveRedirect(searchParams), [searchParams]);
  const supabaseReady = isSupabaseAuthReady();

  useEffect(() => {
    if (auth.isAuthenticated) {
      navigate(redirectPath, { replace: true });
    }
  }, [auth.isAuthenticated, navigate, redirectPath]);

  useEffect(() => {
    return () => {
      dispatch(clearAuthError());
    };
  }, [dispatch]);

  const handleSubmit = async (values: LoginFormValues) => {
    const result = await dispatch(loginWithPassword(values));
    if (loginWithPassword.fulfilled.match(result)) {
      message.success(
        t('sparkery.saas.login.signInSuccess', {
          defaultValue: 'Sign in successful',
        })
      );
      navigate(redirectPath, { replace: true });
      return;
    }
    message.error(
      result.payload ||
        t('sparkery.saas.login.signInFailed', {
          defaultValue: 'Unable to sign in',
        })
    );
  };

  return (
    <div className='sparkery-saas-login'>
      <div className='sparkery-saas-login-bg' />
      <Card className='sparkery-saas-login-card' bordered={false}>
        <Space direction='vertical' size={16} style={{ width: '100%' }}>
          <div>
            <Tag color='blue' bordered={false}>
              {t('sparkery.saas.login.tag', {
                defaultValue: 'Sparkery SaaS',
              })}
            </Tag>
            <Title level={2} className='sparkery-saas-login-title'>
              {t('sparkery.saas.login.title', {
                defaultValue: 'Sign in to Sparkery',
              })}
            </Title>
            <Paragraph className='sparkery-saas-login-subtitle'>
              {t('sparkery.saas.login.subtitle', {
                defaultValue:
                  'Manage operations, dispatch and finance in one SaaS workspace.',
              })}
            </Paragraph>
          </div>

          {!supabaseReady && (
            <Alert
              type='warning'
              showIcon
              message={t('sparkery.saas.login.localMode', {
                defaultValue: 'Supabase auth is not configured. Local demo mode is enabled.',
              })}
            />
          )}

          {auth.error && (
            <Alert
              type='error'
              showIcon
              message={auth.error}
              closable
              onClose={() => dispatch(clearAuthError())}
            />
          )}

          <Form<LoginFormValues>
            layout='vertical'
            form={form}
            onFinish={handleSubmit}
            autoComplete='on'
          >
            <Form.Item
              label={t('sparkery.saas.login.emailLabel', {
                defaultValue: 'Email',
              })}
              name='email'
              rules={[
                {
                  required: true,
                  message: t('sparkery.saas.login.emailRequired', {
                    defaultValue: 'Please enter email',
                  }),
                },
                {
                  type: 'email',
                  message: t('sparkery.saas.login.emailInvalid', {
                    defaultValue: 'Please enter a valid email',
                  }),
                },
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder='name@company.com'
                size='large'
              />
            </Form.Item>

            <Form.Item
              label={t('sparkery.saas.login.passwordLabel', {
                defaultValue: 'Password',
              })}
              name='password'
              rules={[
                {
                  required: true,
                  message: t('sparkery.saas.login.passwordRequired', {
                    defaultValue: 'Please enter password',
                  }),
                },
                {
                  min: 6,
                  message: t('sparkery.saas.login.passwordMinLength', {
                    defaultValue: 'Password must be at least 6 characters',
                  }),
                },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder='••••••••'
                size='large'
              />
            </Form.Item>

            <Button
              type='primary'
              htmlType='submit'
              size='large'
              className='sparkery-saas-login-submit'
              loading={auth.isSubmitting}
              block
            >
              {t('sparkery.saas.login.signIn', {
                defaultValue: 'Sign in',
              })}
            </Button>
          </Form>

          <Text type='secondary'>
            {t('sparkery.saas.login.tip', {
              defaultValue:
                'For production, create users in Supabase Auth and map role/status in Workspace Users.',
            })}
          </Text>
        </Space>
      </Card>
    </div>
  );
};

export default LoginPage;
