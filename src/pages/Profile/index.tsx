import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Form,
  Input,
  Button,
  Avatar,
  Upload,
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
import type { UploadFile } from 'antd/es/upload/interface';
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
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const message = useMessage();
  const [form] = Form.useForm();
  const [securityForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [avatarFile, setAvatarFile] = useState<UploadFile[]>([]);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);

  // 安全的翻译函数，防止在i18n未初始化时出错
  const safeT = (key: string, options?: any): string => {
    try {
      if (!i18n.isInitialized) {
        console.warn('i18n not initialized, using fallback for key:', key);
        return key;
      }
      return t(key, options);
    } catch (error) {
      console.warn('Translation error for key:', key, error);
      return key;
    }
  };

  // 模拟用户资料数据
  const [profile, setProfile] = useState<UserProfile>({
    id: user?.id || '1',
    username: user?.username || 'admin',
    email: user?.email || 'admin@wendeal.com',
    phone: '+86 138 0013 8000',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
    firstName: t('profile.tags.admin'),
    lastName: t('profile.fields.username'),
    bio: t('profile.placeholders.bio'),
    location: t('profile.placeholders.location'),
    website: 'https://wendeal.com',
    birthday: '1990-01-01',
    gender: 'male',
    language: 'zh-CN',
    timezone: 'Asia/Shanghai',
    emailNotifications: true,
    smsNotifications: false,
    marketingEmails: true,
    securityAlerts: true,
  });

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

      setProfile(updatedProfile);
      setEditing(false);
      message.success(t('profile.messages.updateSuccess'));
    } catch (error) {
      message.error(t('profile.messages.updateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (info: any) => {
    if (info.file.status === 'uploading') {
      setLoading(true);
      return;
    }
    if (info.file.status === 'done') {
      // 模拟头像上传成功
      const newAvatar = URL.createObjectURL(info.file.originFileObj);
      setProfile(prev => ({ ...prev, avatar: newAvatar }));
      message.success(t('profile.messages.avatarUploadSuccess'));
      setLoading(false);
    }
  };

  const handleChangePassword = async (values: any) => {
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
                <Upload
                  name='avatar'
                  listType='picture-circle'
                  className='avatar-uploader'
                  showUploadList={false}
                  beforeUpload={() => false}
                  onChange={handleAvatarChange}
                  disabled={!editing}
                >
                  {profile.avatar ? (
                    <Avatar size={100} src={profile.avatar || null} />
                  ) : (
                    uploadButton
                  )}
                </Upload>
                {editing && (
                  <Button
                    type='link'
                    icon={<CameraOutlined />}
                    size='small'
                    className='change-avatar-btn'
                  >
                    {t('profile.changeAvatar')}
                  </Button>
                )}
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
                        <Button
                          type={editing ? 'default' : 'primary'}
                          icon={editing ? <SaveOutlined /> : <EditOutlined />}
                          onClick={() => {
                            if (editing) {
                              form.submit();
                            } else {
                              setEditing(true);
                            }
                          }}
                          loading={loading}
                        >
                          {editing
                            ? t('profile.buttons.save')
                            : t('profile.buttons.edit')}
                        </Button>
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
                        <Button
                          type='primary'
                          onClick={() => setChangePasswordVisible(true)}
                        >
                          {t('profile.security.changePassword')}
                        </Button>
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
                      <Form layout='vertical'>
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item
                              label={t('profile.preferences.language')}
                            >
                              <Select defaultValue={profile.language}>
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
                              <Select defaultValue={profile.timezone}>
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
                          defaultChecked={profile.emailNotifications}
                          onChange={checked =>
                            setProfile(prev => ({
                              ...prev,
                              emailNotifications: checked,
                            }))
                          }
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
                          defaultChecked={profile.smsNotifications}
                          onChange={checked =>
                            setProfile(prev => ({
                              ...prev,
                              smsNotifications: checked,
                            }))
                          }
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
                          defaultChecked={profile.marketingEmails}
                          onChange={checked =>
                            setProfile(prev => ({
                              ...prev,
                              marketingEmails: checked,
                            }))
                          }
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
                          defaultChecked={profile.securityAlerts}
                          onChange={checked =>
                            setProfile(prev => ({
                              ...prev,
                              securityAlerts: checked,
                            }))
                          }
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
              <Button type='primary' htmlType='submit' loading={loading}>
                {t('profile.buttons.confirm')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProfilePage;
