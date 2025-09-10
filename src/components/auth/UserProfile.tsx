import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Avatar,
  Typography,
  Space,
  Divider,
  Alert,
  Modal,
  Row,
  Col,
  Tag,
} from 'antd';
import { useMessage } from '@/hooks';
import {
  UserOutlined,
  EditOutlined,
  LockOutlined,
  MailOutlined,
  SaveOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts';
import type { UpdateProfileData, ChangePasswordData } from '../../types/auth';
import './UserProfile.css';

const { Title, Text } = Typography;

export interface UserProfileProps {
  className?: string;
}

const UserProfile: React.FC<UserProfileProps> = ({ className }) => {
  const { t } = useTranslation();
  const { user, updateProfile, changePassword, isLoading, error } = useAuth();
  const message = useMessage();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [isEditing, setIsEditing] = useState(false);
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // 初始化表单数据
  useEffect(() => {
    if (user) {
      profileForm.setFieldsValue({
        username: user.username,
        email: user.email,
        displayName: user.displayName || '',
        bio: user.bio || '',
      });
    }
  }, [user, profileForm]);

  // 处理资料更新
  const handleProfileUpdate = async (values: UpdateProfileData) => {
    try {
      setProfileError(null);
      await updateProfile(values);
      setIsEditing(false);
      message.success('资料更新成功');
    } catch (err: any) {
      const errorMessage = err?.message || '更新失败，请稍后重试';
      setProfileError(errorMessage);
    }
  };

  // 处理密码修改
  const handlePasswordChange = async (values: ChangePasswordData) => {
    try {
      setPasswordError(null);
      await changePassword(values);
      setIsPasswordModalVisible(false);
      passwordForm.resetFields();
      message.success('密码修改成功');
    } catch (err: any) {
      const errorMessage = err?.message || '密码修改失败，请稍后重试';
      setPasswordError(errorMessage);
    }
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setIsEditing(false);
    setProfileError(null);
    if (user) {
      profileForm.setFieldsValue({
        username: user.username,
        email: user.email,
        displayName: user.displayName || '',
        bio: user.bio || '',
      });
    }
  };

  // 取消密码修改
  const handleCancelPasswordChange = () => {
    setIsPasswordModalVisible(false);
    setPasswordError(null);
    passwordForm.resetFields();
  };

  if (!user) {
    return (
      <Card className={`user-profile-card ${className || ''}`}>
        <div className='profile-loading'>
          <Text type='secondary'>加载用户信息中...</Text>
        </div>
      </Card>
    );
  }

  return (
    <div className={`user-profile-container ${className || ''}`}>
      <Card className='user-profile-card'>
        {/* 用户头像和基本信息 */}
        <div className='profile-header'>
          <Avatar
            size={80}
            icon={<UserOutlined />}
            src={user.avatar || null}
            className='profile-avatar'
          />
          <div className='profile-basic-info'>
            <Title level={3} className='profile-name'>
              {user.displayName || user.username}
            </Title>
            <Text type='secondary' className='profile-username'>
              @{user.username}
            </Text>
            <div className='profile-tags'>
              <Tag color='blue'>
                {t(`user.roles.${user.role.toLowerCase()}`)}
              </Tag>
              {user.isActive && <Tag color='green'>活跃</Tag>}
            </div>
          </div>
          <div className='profile-actions'>
            {!isEditing ? (
              <Button
                type='primary'
                icon={<EditOutlined />}
                onClick={() => setIsEditing(true)}
              >
                编辑资料
              </Button>
            ) : (
              <Space>
                <Button
                  icon={<SaveOutlined />}
                  onClick={() => profileForm.submit()}
                  loading={isLoading}
                  type='primary'
                >
                  保存
                </Button>
                <Button icon={<CloseOutlined />} onClick={handleCancelEdit}>
                  取消
                </Button>
              </Space>
            )}
          </div>
        </div>

        <Divider />

        {/* 错误提示 */}
        {(error || profileError) && (
          <Alert
            message={
              profileError ||
              (typeof error === 'string' ? error : (error as any)?.message || '操作失败')
            }
            type='error'
            showIcon
            closable
            className='profile-error-alert'
            onClose={() => setProfileError(null)}
          />
        )}

        {/* 用户信息表单 */}
        <Form
          form={profileForm}
          layout='vertical'
          onFinish={handleProfileUpdate}
          className='profile-form'
        >
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name='username'
                label='用户名'
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 3, message: '用户名至少3个字符' },
                  { max: 20, message: '用户名最多20个字符' },
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  disabled={!isEditing}
                  placeholder='请输入用户名'
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name='email'
                label='邮箱'
                rules={[
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '请输入有效的邮箱地址' },
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  disabled={!isEditing}
                  placeholder='请输入邮箱'
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name='displayName'
            label='显示名称'
            rules={[{ max: 50, message: '显示名称最多50个字符' }]}
          >
            <Input disabled={!isEditing} placeholder='请输入显示名称' />
          </Form.Item>

          <Form.Item
            name='bio'
            label='个人简介'
            rules={[{ max: 200, message: '个人简介最多200个字符' }]}
          >
            <Input.TextArea
              disabled={!isEditing}
              placeholder='请输入个人简介'
              rows={4}
              showCount
              maxLength={200}
            />
          </Form.Item>
        </Form>

        <Divider />

        {/* 安全设置 */}
        <div className='security-section'>
          <Title level={4}>安全设置</Title>
          <div className='security-item'>
            <div className='security-info'>
              <Text strong>密码</Text>
              <Text type='secondary'>定期更新密码以保护账户安全</Text>
            </div>
            <Button
              icon={<LockOutlined />}
              onClick={() => setIsPasswordModalVisible(true)}
            >
              修改密码
            </Button>
          </div>
        </div>
      </Card>

      {/* 修改密码模态框 */}
      <Modal
        title='修改密码'
        open={isPasswordModalVisible}
        onCancel={handleCancelPasswordChange}
        footer={null}
        className='password-modal'
      >
        {passwordError && (
          <Alert
            message={passwordError}
            type='error'
            showIcon
            closable
            className='password-error-alert'
            onClose={() => setPasswordError(null)}
          />
        )}

        <Form
          form={passwordForm}
          layout='vertical'
          onFinish={handlePasswordChange}
          className='password-form'
        >
          <Form.Item
            name='currentPassword'
            label='当前密码'
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder='请输入当前密码'
            />
          </Form.Item>

          <Form.Item
            name='newPassword'
            label='新密码'
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 8, message: '密码至少8个字符' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder='请输入新密码'
            />
          </Form.Item>

          <Form.Item
            name='confirmPassword'
            label='确认新密码'
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder='请再次输入新密码'
            />
          </Form.Item>

          <Form.Item className='password-form-actions'>
            <Space>
              <Button
                type='primary'
                htmlType='submit'
                loading={isLoading}
                icon={<SaveOutlined />}
              >
                确认修改
              </Button>
              <Button onClick={handleCancelPasswordChange}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export { UserProfile as default };
export { UserProfile };
