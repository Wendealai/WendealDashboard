import React from 'react';
import { Typography, Space, Card, Breadcrumb, Alert } from 'antd';
import { HomeOutlined, UserOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { UserProfile, RequireRole } from '@/components/auth';
import { useAuth } from '@/contexts/AuthContext';

const { Title, Text } = Typography;

const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <RequireRole
      allowedRoles={['admin', 'user']}
      fallback={
        <div style={{ padding: '24px' }}>
          <Alert
            message='访问受限'
            description='您没有权限访问此页面。请联系管理员获取相应权限。'
            type='error'
            showIcon
          />
        </div>
      }
    >
      <div
        style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* 面包屑导航 */}
          <Breadcrumb style={{ marginBottom: '24px' }}>
            <Breadcrumb.Item>
              <Link to='/'>
                <HomeOutlined />
                <span style={{ marginLeft: '4px' }}>首页</span>
              </Link>
            </Breadcrumb.Item>
            <Breadcrumb.Item>
              <Link to='/dashboard'>仪表板</Link>
            </Breadcrumb.Item>
            <Breadcrumb.Item>
              <UserOutlined />
              <span style={{ marginLeft: '4px' }}>个人资料</span>
            </Breadcrumb.Item>
          </Breadcrumb>

          {/* 页面标题 */}
          <div style={{ marginBottom: '24px' }}>
            <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
              个人资料管理
            </Title>
            <Text type='secondary' style={{ fontSize: 16 }}>
              管理您的个人信息和账户设置
            </Text>
          </div>

          {/* 用户信息概览卡片 */}
          <Card
            style={{ marginBottom: '24px' }}
            styles={{ body: { padding: '20px 24px' } }}
          >
            <Space size='middle'>
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background:
                    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '24px',
                  fontWeight: 'bold',
                }}
              >
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  {user?.displayName || user?.username || '未知用户'}
                </Title>
                <Text type='secondary'>{user?.email || '未设置邮箱'}</Text>
                <br />
                <Text type='secondary' style={{ fontSize: '12px' }}>
                  角色: {user?.role || '普通用户'} | 最后登录:{' '}
                  {user?.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleString()
                    : '未知'}
                </Text>
              </div>
            </Space>
          </Card>

          {/* 用户资料组件 */}
          <UserProfile />

          {/* 帮助信息 */}
          <Card title='帮助信息' style={{ marginTop: '24px' }} size='small'>
            <Space direction='vertical' size='small' style={{ width: '100%' }}>
              <Text type='secondary'>
                • 修改个人信息后，某些更改可能需要重新登录才能生效
              </Text>
              <Text type='secondary'>• 为了账户安全，建议定期更新密码</Text>
              <Text type='secondary'>
                • 如果遇到问题，请联系系统管理员获取帮助
              </Text>
              <Text type='secondary'>
                • 头像显示为用户名首字母，暂不支持自定义头像上传
              </Text>
            </Space>
          </Card>
        </div>
      </div>
    </RequireRole>
  );
};

export default ProfilePage;
