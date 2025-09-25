import React from 'react';
import { Layout, Typography } from 'antd';
import {
  CalendarOutlined,
  BarChartOutlined,
  FileTextOutlined,
  SafetyOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import './AuthLayout.css';

const { Content } = Layout;
const { Title, Text } = Typography;

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

/**
 * Authentication Layout Component
 * Full-screen white background design with login form on left and info panel on right
 */
const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const { t } = useTranslation();

  return (
    <Layout className='auth-layout'>
      <Content className='auth-content'>
        {/* Language Switcher */}
        <div className='language-switcher-container'>
          <LanguageSwitcher />
        </div>

        <div className='auth-container'>
          {/* Left Panel - Login Form */}
          <div className='auth-left-panel'>
            <div className='auth-brand'>
              <div className='brand-logo'>
                <SafetyOutlined className='logo-icon' />
                <div className='logo-text'>
                  <Title level={2} className='brand-name'>
                    WendealWeb
                  </Title>
                  <Text className='brand-subtitle'>
                    {t('authLayout.subtitle', 'Enterprise Management Platform')}
                  </Text>
                </div>
              </div>
            </div>

            <div className='login-form-section'>{children}</div>

            <div className='auth-footer'>
              <Text className='copyright'>
                {t(
                  'authLayout.copyright',
                  '© 2024 WendealWeb - Enterprise Management Platform'
                )}
              </Text>
            </div>
          </div>

          {/* Right Panel - Information */}
          <div className='auth-right-panel'>
            <div className='info-content'>
              <div className='welcome-section'>
                <Title level={1} className='welcome-title'>
                  {t('authLayout.welcome', 'Welcome to WendealWeb')}
                </Title>
                <Text className='welcome-subtitle'>
                  {t(
                    'authLayout.welcomeSubtitle',
                    'Your comprehensive enterprise management solution'
                  )}
                </Text>
              </div>

              <div className='features-section'>
                <Title level={3} className='features-title'>
                  {t(
                    'authLayout.featuresTitle',
                    'Powerful Features for Your Business'
                  )}
                </Title>

                <div className='features-grid'>
                  <div className='feature-item'>
                    <DashboardOutlined className='feature-icon' />
                    <div className='feature-content'>
                      <Text strong className='feature-title'>
                        {t(
                          'authLayout.features.dashboard.title',
                          'Smart Dashboard'
                        )}
                      </Text>
                      <Text className='feature-desc'>
                        {t(
                          'authLayout.features.dashboard.desc',
                          'Real-time analytics and insights'
                        )}
                      </Text>
                    </div>
                  </div>

                  <div className='feature-item'>
                    <TeamOutlined className='feature-icon' />
                    <div className='feature-content'>
                      <Text strong className='feature-title'>
                        {t('authLayout.features.team.title', 'Team Management')}
                      </Text>
                      <Text className='feature-desc'>
                        {t(
                          'authLayout.features.team.desc',
                          'Efficient team collaboration tools'
                        )}
                      </Text>
                    </div>
                  </div>

                  <div className='feature-item'>
                    <CalendarOutlined className='feature-icon' />
                    <div className='feature-content'>
                      <Text strong className='feature-title'>
                        {t(
                          'authLayout.features.schedule.title',
                          'Schedule Management'
                        )}
                      </Text>
                      <Text className='feature-desc'>
                        {t(
                          'authLayout.features.schedule.desc',
                          'Advanced scheduling and planning'
                        )}
                      </Text>
                    </div>
                  </div>

                  <div className='feature-item'>
                    <BarChartOutlined className='feature-icon' />
                    <div className='feature-content'>
                      <Text strong className='feature-title'>
                        {t(
                          'authLayout.features.analytics.title',
                          'Data Analytics'
                        )}
                      </Text>
                      <Text className='feature-desc'>
                        {t(
                          'authLayout.features.analytics.desc',
                          'Comprehensive reporting system'
                        )}
                      </Text>
                    </div>
                  </div>

                  <div className='feature-item'>
                    <FileTextOutlined className='feature-icon' />
                    <div className='feature-content'>
                      <Text strong className='feature-title'>
                        {t(
                          'authLayout.features.document.title',
                          'Document Management'
                        )}
                      </Text>
                      <Text className='feature-desc'>
                        {t(
                          'authLayout.features.document.desc',
                          'Streamlined document workflows'
                        )}
                      </Text>
                    </div>
                  </div>

                  <div className='feature-item'>
                    <CheckCircleOutlined className='feature-icon' />
                    <div className='feature-content'>
                      <Text strong className='feature-title'>
                        {t(
                          'authLayout.features.quality.title',
                          'Quality Assurance'
                        )}
                      </Text>
                      <Text className='feature-desc'>
                        {t(
                          'authLayout.features.quality.desc',
                          'Built-in quality control systems'
                        )}
                      </Text>
                    </div>
                  </div>
                </div>
              </div>

              <div className='benefits-section'>
                <Title level={4} className='benefits-title'>
                  {t('authLayout.benefitsTitle', 'Why Choose WendealWeb?')}
                </Title>
                <ul className='benefits-list'>
                  <li>
                    {t(
                      'authLayout.benefits.interface',
                      'Intuitive and user-friendly interface'
                    )}
                  </li>
                  <li>
                    {t(
                      'authLayout.benefits.scalable',
                      'Scalable solution for businesses of all sizes'
                    )}
                  </li>
                  <li>
                    {t(
                      'authLayout.benefits.security',
                      'Advanced security and data protection'
                    )}
                  </li>
                  <li>
                    {t(
                      'authLayout.benefits.support',
                      '24/7 customer support and assistance'
                    )}
                  </li>
                  <li>
                    {t(
                      'authLayout.benefits.updates',
                      'Regular updates and feature enhancements'
                    )}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Content>
    </Layout>
  );
};

export default AuthLayout;
