import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Form,
  Input,
  Button,
  Space,
  Divider,
  Switch,
  Select,
  DatePicker,
  Typography,
  Tag,
  Descriptions,
  Modal,
  Tabs,
} from 'antd';
import OriginUIAvatar from '@/components/OriginUIAvatar';
import AvatarUploader from '@/components/AvatarUploader';
import GradientButton from '@/components/GradientButton';
import {
  UserOutlined,
  EditOutlined,
  SaveOutlined,
  CameraOutlined,
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  SafetyOutlined,
  SettingOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/contexts';
import { useTranslation } from 'react-i18next';
import { useMessage } from '@/hooks';
import dayjs from 'dayjs';
import './index.scss';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface UserProfile {
  id: string;
  username: string;
  email: string;
  phone?: string;
  avatar?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  location?: string;
  website?: string;
  birthday?: string;
  gender?: 'male' | 'female' | 'other';
  language: string;
  timezone: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  marketingEmails: boolean;
  securityAlerts: boolean;
}

const ProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const { t, i18n } = useTranslation();
  const message = useMessage();
  const [form] = Form.useForm();
  const [securityForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);

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

  // 调试函数：检查localStorage中的数据
  const debugProfileData = () => {
    try {
      const savedData = localStorage.getItem('user_profile');
      console.log('Current profile state:', profile);
      console.log(
        'Saved profile data in localStorage:',
        savedData ? JSON.parse(savedData) : 'No data found'
      );
      console.log('Auth user data:', user);
    } catch (error) {
      console.error('Debug error:', error);
    }
  };

  // 在开发环境下暴露调试函数到window对象
  if (process.env.NODE_ENV === 'development') {
    (window as any).debugProfile = debugProfileData;
  }

  // Get saved profile data from localStorage
  const getSavedProfile = (): Partial<UserProfile> => {
    try {
      const saved = localStorage.getItem('user_profile');
      if (saved) {
        return JSON.parse(saved);
      }
      // Migrate old user_avatar to user_profile if exists
      const oldAvatar = localStorage.getItem('user_avatar');
      if (oldAvatar) {
        const migratedProfile = { avatar: oldAvatar };
        localStorage.setItem('user_profile', JSON.stringify(migratedProfile));
        localStorage.removeItem('user_avatar'); // Clean up old key
        return migratedProfile;
      }
      return {};
    } catch {
      return {};
    }
  };

  // Get saved avatar from localStorage
  const getSavedAvatar = () => {
    try {
      const savedProfile = getSavedProfile();
      return (
        savedProfile.avatar ||
        localStorage.getItem('user_avatar') ||
        user?.avatar ||
        'https://api.dicebear.com/7.x/avataaars/svg?seed=admin'
      );
    } catch {
      return (
        user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin'
      );
    }
  };

  // Initialize profile with saved data, user data from auth context, and defaults
  const [profile, setProfile] = useState<UserProfile>(() => {
    const savedProfile = getSavedProfile();
    return {
      id: user?.id || savedProfile.id || '1',
      username: user?.username || savedProfile.username || 'admin',
      email: user?.email || savedProfile.email || 'admin@wendeal.com',
      phone: savedProfile.phone || '+86 138 0013 8000',
      avatar: getSavedAvatar(),
      firstName:
        user?.firstName || savedProfile.firstName || t('profile.tags.admin'),
      lastName:
        user?.lastName || savedProfile.lastName || t('profile.fields.username'),
      bio: savedProfile.bio || t('profile.placeholders.bio'),
      location: savedProfile.location || t('profile.placeholders.location'),
      website: savedProfile.website || 'https://wendeal.com',
      birthday: savedProfile.birthday || '1990-01-01',
      gender: savedProfile.gender || 'male',
      language: savedProfile.language || 'zh-CN',
      timezone: savedProfile.timezone || 'Asia/Shanghai',
      emailNotifications: savedProfile.emailNotifications ?? true,
      smsNotifications: savedProfile.smsNotifications ?? false,
      marketingEmails: savedProfile.marketingEmails ?? true,
      securityAlerts: savedProfile.securityAlerts ?? true,
    };
  });

  // Update profile when user data changes
  useEffect(() => {
    if (user) {
      setProfile(prev => {
        const savedProfile = getSavedProfile();
        return {
          ...prev,
          id: user.id,
          username: user.username,
          email: user.email,
          avatar: getSavedAvatar(),
          firstName: user.firstName || savedProfile.firstName || prev.firstName,
          lastName: user.lastName || savedProfile.lastName || prev.lastName,
        };
      });
    }
  }, [user]);

  useEffect(() => {
    // 初始化表单数据
    form.setFieldsValue({
      ...profile,
      birthday: profile.birthday ? dayjs(profile.birthday) : null,
    });
  }, [profile, form]);

  const handleSave = async (values: any) => {
    setLoading(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));

      const updatedProfile = {
        ...profile,
        ...values,
        birthday: values.birthday ? values.birthday.format('YYYY-MM-DD') : null,
      };

      // Save to localStorage for persistence
      localStorage.setItem('user_profile', JSON.stringify(updatedProfile));

      // Update local profile state
      setProfile(updatedProfile);

      // Update auth context with relevant fields
      const authUpdateData = {
        firstName: updatedProfile.firstName,
        lastName: updatedProfile.lastName,
        email: updatedProfile.email,
        avatar: updatedProfile.avatar,
      };
      await updateProfile(authUpdateData);

      setEditing(false);
      message.success(t('profile.messages.updateSuccess'));
    } catch (error) {
      console.error('Profile save error:', error);
      message.error(t('profile.messages.updateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setLoading(true);
    try {
      // 模拟密码修改API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success(t('profile.messages.passwordChangeSuccess'));
      setChangePasswordVisible(false);
      securityForm.resetFields();
    } catch (error) {
      message.error(t('profile.messages.passwordChangeFailed'));
    } finally {
      setLoading(false);
    }
  };

  const uploadButton = (
    <div>
      <CameraOutlined />
      <div style={{ marginTop: 8 }}>{t('profile.changeAvatar')}</div>
    </div>
  );

  return (
    <div className='profile-page'>
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={8}>
          {/* 用户信息卡片 */}
          <Card className='profile-card'>
            <div className='profile-header'>
              <div className='avatar-section'>
                <AvatarUploader
                  value={profile.avatar}
                  onChange={async (avatar: string | undefined) => {
                    try {
                      // Update local profile state
                      setProfile(prev => {
                        const updatedProfile = {
                          ...prev,
                          avatar: avatar || '',
                        };
                        // Save complete profile to localStorage
                        localStorage.setItem(
                          'user_profile',
                          JSON.stringify(updatedProfile)
                        );
                        return updatedProfile;
                      });

                      // Update auth context user profile
                      await updateProfile({ avatar: avatar || '' });
                    } catch (error) {
                      console.error('Avatar update error:', error);
                      message.error(t('profile.messages.updateFailed'));
                    }
                  }}
                  disabled={false}
                />
              </div>

              <div className='user-info'>
                <Title level={4} style={{ margin: 0 }}>
                  {profile.firstName} {profile.lastName}
                </Title>
                <Text type='secondary'>@{profile.username}</Text>
                <div className='user-tags'>
                  <Tag color='blue'>{t('profile.tags.admin')}</Tag>
                  <Tag color='green'>{t('profile.tags.online')}</Tag>
                </div>
              </div>
            </div>

            <Divider />

            <Descriptions column={1} size='small'>
              <Descriptions.Item label={t('profile.fields.email')} span={1}>
                <Space>
                  <MailOutlined />
                  {profile.email}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label={t('profile.fields.phone')} span={1}>
                <Space>
                  <PhoneOutlined />
                  {profile.phone || t('profile.fields.notSet')}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label={t('profile.fields.location')} span={1}>
                <Space>
                  <EnvironmentOutlined />
                  {profile.location || t('profile.fields.notSet')}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label={t('profile.fields.birthday')} span={1}>
                <Space>
                  <CalendarOutlined />
                  {profile.birthday || t('profile.fields.notSet')}
                </Space>
              </Descriptions.Item>
            </Descriptions>

            {profile.bio && (
              <>
                <Divider />
                <div className='bio-section'>
                  <Text>{profile.bio}</Text>
                </div>
              </>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                {
                  key: 'profile',
                  label: (
                    <span>
                      <UserOutlined />
                      {t('profile.tabs.profile')}
                    </span>
                  ),
                  children: (
                    <div className='profile-form-section'>
                      <div className='section-header'>
                        <Title level={5}>
                          {t('profile.sections.basicInfo')}
                        </Title>
                        <GradientButton
                          editing={editing}
                          onClick={() => {
                            if (editing) {
                              form.submit();
                            } else {
                              setEditing(true);
                            }
                          }}
                          loading={loading}
                          disabled={loading}
                          editText={t('profile.buttons.edit')}
                          saveText={t('profile.buttons.save')}
                        />
                      </div>

                      <Form
                        form={form}
                        layout='vertical'
                        onFinish={handleSave}
                        disabled={!editing}
                      >
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item
                              label={t('profile.fields.firstName')}
                              name='firstName'
                              rules={[
                                {
                                  required: true,
                                  message: t(
                                    'profile.validation.firstNameRequired'
                                  ),
                                },
                              ]}
                            >
                              <Input
                                placeholder={t(
                                  'profile.placeholders.firstName'
                                )}
                              />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item
                              label={t('profile.fields.lastName')}
                              name='lastName'
                              rules={[
                                {
                                  required: true,
                                  message: t(
                                    'profile.validation.lastNameRequired'
                                  ),
                                },
                              ]}
                            >
                              <Input
                                placeholder={t('profile.placeholders.lastName')}
                              />
                            </Form.Item>
                          </Col>
                        </Row>

                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item
                              label={t('profile.fields.username')}
                              name='username'
                              rules={[
                                {
                                  required: true,
                                  message: t(
                                    'profile.validation.usernameRequired'
                                  ),
                                },
                              ]}
                            >
                              <Input
                                placeholder={t('profile.placeholders.username')}
                              />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item
                              label={t('profile.fields.email')}
                              name='email'
                              rules={[
                                {
                                  required: true,
                                  message: t(
                                    'profile.validation.emailRequired'
                                  ),
                                },
                                {
                                  type: 'email',
                                  message: t('profile.validation.emailInvalid'),
                                },
                              ]}
                            >
                              <Input
                                placeholder={t('profile.placeholders.email')}
                              />
                            </Form.Item>
                          </Col>
                        </Row>

                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item
                              label={t('profile.fields.phone')}
                              name='phone'
                            >
                              <Input
                                placeholder={t('profile.placeholders.phone')}
                              />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item
                              label={t('profile.fields.gender')}
                              name='gender'
                            >
                              <Select
                                placeholder={t('profile.placeholders.gender')}
                              >
                                <Option value='male'>
                                  {t('profile.gender.male')}
                                </Option>
                                <Option value='female'>
                                  {t('profile.gender.female')}
                                </Option>
                                <Option value='other'>
                                  {t('profile.gender.other')}
                                </Option>
                              </Select>
                            </Form.Item>
                          </Col>
                        </Row>

                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item
                              label={t('profile.fields.birthday')}
                              name='birthday'
                            >
                              <DatePicker
                                style={{ width: '100%' }}
                                placeholder={t('profile.placeholders.birthday')}
                                format='YYYY-MM-DD'
                              />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item
                              label={t('profile.fields.location')}
                              name='location'
                            >
                              <Input
                                placeholder={t('profile.placeholders.location')}
                              />
                            </Form.Item>
                          </Col>
                        </Row>

                        <Form.Item
                          label={t('profile.fields.website')}
                          name='website'
                        >
                          <Input
                            placeholder={t('profile.placeholders.website')}
                          />
                        </Form.Item>

                        <Form.Item label={t('profile.fields.bio')} name='bio'>
                          <TextArea
                            rows={4}
                            placeholder={t('profile.placeholders.bio')}
                            maxLength={200}
                            showCount
                          />
                        </Form.Item>
                      </Form>
                    </div>
                  ),
                },
                {
                  key: 'security',
                  label: (
                    <span>
                      <SafetyOutlined />
                      {t('profile.tabs.security')}
                    </span>
                  ),
                  children: (
                    <div className='security-section'>
                      <Title level={5}>
                        {t('profile.security.passwordSettings')}
                      </Title>
                      <div className='security-item'>
                        <div className='security-info'>
                          <Text strong>
                            {t('profile.security.loginPassword')}
                          </Text>
                          <Text type='secondary'>
                            {t('profile.security.passwordDescription')}
                          </Text>
                        </div>
                        <GradientButton
                          editing={false}
                          onClick={() => setChangePasswordVisible(true)}
                          editText={t('profile.security.changePassword')}
                        />
                      </div>

                      <Divider />

                      <Title level={5}>
                        {t('profile.security.twoFactorAuth')}
                      </Title>
                      <div className='security-item'>
                        <div className='security-info'>
                          <Text strong>
                            {t('profile.security.smsVerification')}
                          </Text>
                          <Text type='secondary'>
                            {t('profile.security.smsDescription')}
                          </Text>
                        </div>
                        <Switch defaultChecked={false} />
                      </div>

                      <div className='security-item'>
                        <div className='security-info'>
                          <Text strong>
                            {t('profile.security.emailVerification')}
                          </Text>
                          <Text type='secondary'>
                            {t('profile.security.emailDescription')}
                          </Text>
                        </div>
                        <Switch defaultChecked={true} />
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'preferences',
                  label: (
                    <span>
                      <SettingOutlined />
                      {t('profile.tabs.preferences')}
                    </span>
                  ),
                  children: (
                    <div className='preferences-section'>
                      <Title level={5}>
                        {t('profile.preferences.languageAndRegion')}
                      </Title>
                      <Form layout='vertical' form={form}>
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item
                              label={t('profile.preferences.language')}
                            >
                              <Select
                                value={profile.language}
                                onChange={value => {
                                  const updatedProfile = {
                                    ...profile,
                                    language: value,
                                  };
                                  setProfile(updatedProfile);
                                  localStorage.setItem(
                                    'user_profile',
                                    JSON.stringify(updatedProfile)
                                  );
                                }}
                              >
                                <Option value='zh-CN'>
                                  {t('profile.preferences.simplifiedChinese')}
                                </Option>
                                <Option value='en-US'>English</Option>
                                <Option value='ja-JP'>日本語</Option>
                              </Select>
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item
                              label={t('profile.preferences.timezone')}
                            >
                              <Select
                                value={profile.timezone}
                                onChange={value => {
                                  const updatedProfile = {
                                    ...profile,
                                    timezone: value,
                                  };
                                  setProfile(updatedProfile);
                                  localStorage.setItem(
                                    'user_profile',
                                    JSON.stringify(updatedProfile)
                                  );
                                }}
                              >
                                <Option value='Asia/Shanghai'>
                                  {t('profile.preferences.beijingTime')}
                                </Option>
                                <Option value='America/New_York'>
                                  {t('profile.preferences.newYorkTime')}
                                </Option>
                                <Option value='Europe/London'>
                                  {t('profile.preferences.londonTime')}
                                </Option>
                              </Select>
                            </Form.Item>
                          </Col>
                        </Row>
                      </Form>

                      <Divider />

                      <Title level={5}>
                        {t('profile.preferences.themeSettings')}
                      </Title>
                      <div className='theme-section'>
                        <div className='theme-item'>
                          <Text strong>
                            {t('profile.preferences.darkMode')}
                          </Text>
                          <Switch defaultChecked={false} />
                        </div>
                        <div className='theme-item'>
                          <Text strong>
                            {t('profile.preferences.compactMode')}
                          </Text>
                          <Switch defaultChecked={false} />
                        </div>
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'notifications',
                  label: (
                    <span>
                      <BellOutlined />
                      {t('profile.tabs.notifications')}
                    </span>
                  ),
                  children: (
                    <div className='notifications-section'>
                      <Title level={5}>
                        {t('profile.notifications.preferences')}
                      </Title>

                      <div className='notification-item'>
                        <div className='notification-info'>
                          <Text strong>
                            {t('profile.notifications.emailNotifications')}
                          </Text>
                          <Text type='secondary'>
                            {t('profile.notifications.emailDescription')}
                          </Text>
                        </div>
                        <Switch
                          checked={profile.emailNotifications}
                          onChange={checked => {
                            const updatedProfile = {
                              ...profile,
                              emailNotifications: checked,
                            };
                            setProfile(updatedProfile);
                            localStorage.setItem(
                              'user_profile',
                              JSON.stringify(updatedProfile)
                            );
                          }}
                        />
                      </div>

                      <div className='notification-item'>
                        <div className='notification-info'>
                          <Text strong>
                            {t('profile.notifications.smsNotifications')}
                          </Text>
                          <Text type='secondary'>
                            {t('profile.notifications.smsDescription')}
                          </Text>
                        </div>
                        <Switch
                          checked={profile.smsNotifications}
                          onChange={checked => {
                            const updatedProfile = {
                              ...profile,
                              smsNotifications: checked,
                            };
                            setProfile(updatedProfile);
                            localStorage.setItem(
                              'user_profile',
                              JSON.stringify(updatedProfile)
                            );
                          }}
                        />
                      </div>

                      <div className='notification-item'>
                        <div className='notification-info'>
                          <Text strong>
                            {t('profile.notifications.marketingEmails')}
                          </Text>
                          <Text type='secondary'>
                            {t('profile.notifications.marketingDescription')}
                          </Text>
                        </div>
                        <Switch
                          checked={profile.marketingEmails}
                          onChange={checked => {
                            const updatedProfile = {
                              ...profile,
                              marketingEmails: checked,
                            };
                            setProfile(updatedProfile);
                            localStorage.setItem(
                              'user_profile',
                              JSON.stringify(updatedProfile)
                            );
                          }}
                        />
                      </div>

                      <div className='notification-item'>
                        <div className='notification-info'>
                          <Text strong>
                            {t('profile.notifications.securityAlerts')}
                          </Text>
                          <Text type='secondary'>
                            {t('profile.notifications.securityDescription')}
                          </Text>
                        </div>
                        <Switch
                          checked={profile.securityAlerts}
                          onChange={checked => {
                            const updatedProfile = {
                              ...profile,
                              securityAlerts: checked,
                            };
                            setProfile(updatedProfile);
                            localStorage.setItem(
                              'user_profile',
                              JSON.stringify(updatedProfile)
                            );
                          }}
                        />
                      </div>
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      {/* 修改密码弹窗 */}
      <Modal
        title={t('profile.security.changePassword')}
        open={changePasswordVisible}
        onCancel={() => setChangePasswordVisible(false)}
        footer={null}
        width={400}
      >
        <Form
          form={securityForm}
          layout='vertical'
          onFinish={handleChangePassword}
        >
          <Form.Item
            label={t('profile.security.currentPassword')}
            name='currentPassword'
            rules={[
              {
                required: true,
                message: t('profile.validation.currentPasswordRequired'),
              },
            ]}
          >
            <Input.Password
              placeholder={t('profile.placeholders.currentPassword')}
            />
          </Form.Item>

          <Form.Item
            label={t('profile.security.newPassword')}
            name='newPassword'
            rules={[
              {
                required: true,
                message: t('profile.validation.newPasswordRequired'),
              },
              { min: 6, message: t('profile.validation.passwordMinLength') },
            ]}
          >
            <Input.Password
              placeholder={t('profile.placeholders.newPassword')}
            />
          </Form.Item>

          <Form.Item
            label={t('profile.security.confirmPassword')}
            name='confirmPassword'
            dependencies={['newPassword']}
            rules={[
              {
                required: true,
                message: t('profile.validation.confirmPasswordRequired'),
              },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error(safeT('profile.validation.passwordMismatch'))
                  );
                },
              }),
            ]}
          >
            <Input.Password
              placeholder={t('profile.placeholders.confirmPassword')}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setChangePasswordVisible(false)}>
                {t('profile.buttons.cancel')}
              </Button>
              <GradientButton
                editing={false}
                onClick={() => {}}
                loading={loading}
                disabled={loading}
                editText={t('profile.buttons.confirm')}
                type='submit'
              />
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProfilePage;
