import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Typography,
  Statistic,
  Progress,
  Tabs,
  Avatar,
  Tooltip,
  Badge,
} from 'antd';
import { useTranslation } from 'react-i18next';
import {
  UserOutlined,
  TeamOutlined,
  SettingOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  ExportOutlined,
  SecurityScanOutlined,
  MonitorOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/contexts';
import { PermissionService } from '@/services/auth/PermissionService';
import type { User, UserRole } from '@/types/auth';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

interface AdminPageProps {}

// 模拟用户数据
const mockUsers: User[] = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@wendeal.com',
    role: 'ADMIN' as UserRole,
    profile: {
      firstName: '管理员',
      lastName: '用户',
      avatar: '',
      phone: '13800138000',
      department: '技术部',
      position: '系统管理员',
    },
    createdAt: new Date('2024-01-01'),
    lastLoginAt: new Date('2024-01-20'),
    isActive: true,
  },
  {
    id: '2',
    username: 'manager1',
    email: 'manager1@wendeal.com',
    role: 'MANAGER' as UserRole,
    profile: {
      firstName: '张',
      lastName: '经理',
      avatar: '',
      phone: '13800138001',
      department: '销售部',
      position: '销售经理',
    },
    createdAt: new Date('2024-01-02'),
    lastLoginAt: new Date('2024-01-19'),
    isActive: true,
  },
  {
    id: '3',
    username: 'employee1',
    email: 'employee1@wendeal.com',
    role: 'EMPLOYEE' as UserRole,
    profile: {
      firstName: '李',
      lastName: '员工',
      avatar: '',
      phone: '13800138002',
      department: '技术部',
      position: '前端开发',
    },
    createdAt: new Date('2024-01-03'),
    lastLoginAt: new Date('2024-01-18'),
    isActive: true,
  },
  {
    id: '4',
    username: 'employee2',
    email: 'employee2@wendeal.com',
    role: 'EMPLOYEE' as UserRole,
    profile: {
      firstName: '王',
      lastName: '员工',
      avatar: '',
      phone: '13800138003',
      department: '设计部',
      position: 'UI设计师',
    },
    createdAt: new Date('2024-01-04'),
    lastLoginAt: new Date('2024-01-17'),
    isActive: false,
  },
];

// 系统统计数据
interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalSessions: number;
  systemLoad: number;
  memoryUsage: number;
  diskUsage: number;
}

const mockSystemStats: SystemStats = {
  totalUsers: 156,
  activeUsers: 89,
  totalSessions: 45,
  systemLoad: 65,
  memoryUsage: 72,
  diskUsage: 58,
};

const AdminPage: React.FC<AdminPageProps> = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStats>(mockSystemStats);
  const [form] = Form.useForm();

  // 检查管理员权限
  const canManageUsers = PermissionService.hasPermission(user, 'users.manage');
  const canViewSystem = PermissionService.hasPermission(user, 'system.monitor');

  useEffect(() => {
    loadUsers();
    loadSystemStats();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      setUsers(mockUsers);
    } catch (error) {
      message.error(t('admin.loadUsersFailed'));
    } finally {
      setLoading(false);
    }
  };

  const loadSystemStats = async () => {
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 500));
      setSystemStats(mockSystemStats);
    } catch (error) {
      message.error(t('admin.loadStatsFailed'));
    }
  };

  const handleAddUser = () => {
    setEditingUser(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      username: user.username,
      email: user.email,
      role: user.role,
      firstName: user.profile.firstName,
      lastName: user.profile.lastName,
      phone: user.profile.phone,
      department: user.profile.department,
      position: user.profile.position,
      isActive: user.isActive,
    });
    setModalVisible(true);
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 500));
      setUsers(users.filter(u => u.id !== userId));
      message.success(t('admin.deleteUserSuccess'));
    } catch (error) {
      message.error(t('admin.deleteUserFailed'));
    }
  };

  const handleToggleUserStatus = async (userId: string) => {
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 500));
      setUsers(
        users.map(u => (u.id === userId ? { ...u, isActive: !u.isActive } : u))
      );
      message.success(t('admin.updateStatusSuccess'));
    } catch (error) {
      message.error(t('admin.updateStatusFailed'));
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (editingUser) {
        // 更新用户
        const updatedUser: User = {
          ...editingUser,
          username: values.username,
          email: values.email,
          role: values.role,
          profile: {
            ...editingUser.profile,
            firstName: values.firstName,
            lastName: values.lastName,
            phone: values.phone,
            department: values.department,
            position: values.position,
          },
          isActive: values.isActive,
        };
        setUsers(users.map(u => (u.id === editingUser.id ? updatedUser : u)));
        message.success(t('admin.updateUserSuccess'));
      } else {
        // 添加新用户
        const newUser: User = {
          id: Date.now().toString(),
          username: values.username,
          email: values.email,
          role: values.role,
          profile: {
            firstName: values.firstName,
            lastName: values.lastName,
            avatar: '',
            phone: values.phone,
            department: values.department,
            position: values.position,
          },
          createdAt: new Date(),
          lastLoginAt: undefined,
          isActive: values.isActive ?? true,
        };
        setUsers([...users, newUser]);
        message.success(t('admin.createUserSuccess'));
      }

      setModalVisible(false);
      form.resetFields();
    } catch (error) {
      message.error(t('admin.operationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'red';
      case 'MANAGER':
        return 'blue';
      case 'EMPLOYEE':
        return 'green';
      case 'GUEST':
        return 'default';
      default:
        return 'default';
    }
  };

  const getRoleText = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return t('admin.roles.ADMIN');
      case 'MANAGER':
        return t('admin.roles.MANAGER');
      case 'EMPLOYEE':
        return t('admin.roles.EMPLOYEE');
      case 'GUEST':
        return t('admin.roles.GUEST');
      default:
        return role;
    }
  };

  const userColumns: ColumnsType<User> = [
    {
      title: t('user.title'),
      key: 'user',
      render: (_, record) => (
        <Space>
          <Avatar
            size='small'
            icon={<UserOutlined />}
            src={record.profile.avatar}
          />
          <div>
            <div>
              {record.profile.firstName} {record.profile.lastName}
            </div>
            <Text type='secondary' style={{ fontSize: '12px' }}>
              @{record.username}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: t('user.email'),
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: t('user.role'),
      dataIndex: 'role',
      key: 'role',
      render: (role: UserRole) => (
        <Tag color={getRoleColor(role)}>{getRoleText(role)}</Tag>
      ),
    },
    {
      title: t('user.department'),
      key: 'department',
      render: (_, record) => record.profile.department,
    },
    {
      title: t('user.position'),
      key: 'position',
      render: (_, record) => record.profile.position,
    },
    {
      title: t('user.status'),
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Badge
          status={isActive ? 'success' : 'default'}
          text={isActive ? t('user.active') : t('user.inactive')}
        />
      ),
    },
    {
      title: t('user.lastLogin'),
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      render: (date: Date) =>
        date ? date.toLocaleDateString() : t('user.neverLoggedIn'),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_, record) => (
        <Space size='small'>
          <Tooltip title={t('user.viewDetails')}>
            <Button
              type='text'
              size='small'
              icon={<EyeOutlined />}
              onClick={() => handleEditUser(record)}
            />
          </Tooltip>
          {canManageUsers && (
            <>
              <Tooltip title={t('common.edit')}>
                <Button
                  type='text'
                  size='small'
                  icon={<EditOutlined />}
                  onClick={() => handleEditUser(record)}
                />
              </Tooltip>
              <Tooltip
                title={record.isActive ? t('user.disable') : t('user.enable')}
              >
                <Button
                  type='text'
                  size='small'
                  onClick={() => handleToggleUserStatus(record.id)}
                >
                  {record.isActive ? t('user.disable') : t('user.enable')}
                </Button>
              </Tooltip>
              <Popconfirm
                title={t('user.deleteConfirm')}
                onConfirm={() => handleDeleteUser(record.id)}
                okText={t('common.confirm')}
                cancelText={t('common.cancel')}
              >
                <Tooltip title={t('common.delete')}>
                  <Button
                    type='text'
                    size='small'
                    danger
                    icon={<DeleteOutlined />}
                  />
                </Tooltip>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  if (!canManageUsers && !canViewSystem) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Title level={3}>{t('admin.accessDenied')}</Title>
        <Text type='secondary'>{t('admin.noPermission')}</Text>
      </div>
    );
  }

  return (
    <div className='admin-page' style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <SettingOutlined style={{ marginRight: '8px' }} />
          {t('admin.title')}
        </Title>
        <Text type='secondary'>{t('admin.subtitle')}</Text>
      </div>

      <Tabs defaultActiveKey='overview' type='card'>
        {/* 系统概览 */}
        <TabPane
          tab={
            <span>
              <MonitorOutlined />
              {t('admin.overview')}
            </span>
          }
          key='overview'
        >
          <Row gutter={[24, 24]}>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title={t('admin.totalUsers')}
                  value={systemStats.totalUsers}
                  prefix={<TeamOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title={t('admin.activeUsers')}
                  value={systemStats.activeUsers}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title={t('admin.onlineSessions')}
                  value={systemStats.totalSessions}
                  prefix={<SecurityScanOutlined />}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title={t('admin.systemLoad')}
                  value={systemStats.systemLoad}
                  suffix='%'
                  prefix={<DatabaseOutlined />}
                  valueStyle={{
                    color: systemStats.systemLoad > 80 ? '#ff4d4f' : '#52c41a',
                  }}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
            <Col xs={24} lg={8}>
              <Card title={t('admin.systemResources')}>
                <div style={{ marginBottom: '16px' }}>
                  <Text>{t('admin.cpuUsage')}</Text>
                  <Progress
                    percent={systemStats.systemLoad}
                    status={
                      systemStats.systemLoad > 80 ? 'exception' : 'normal'
                    }
                  />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <Text>{t('admin.memoryUsage')}</Text>
                  <Progress
                    percent={systemStats.memoryUsage}
                    status={
                      systemStats.memoryUsage > 85 ? 'exception' : 'normal'
                    }
                  />
                </div>
                <div>
                  <Text>{t('admin.diskUsage')}</Text>
                  <Progress
                    percent={systemStats.diskUsage}
                    status={systemStats.diskUsage > 90 ? 'exception' : 'normal'}
                  />
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={16}>
              <Card title={t('admin.quickActions')}>
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12} md={8}>
                    <Button
                      type='primary'
                      block
                      icon={<PlusOutlined />}
                      onClick={handleAddUser}
                      disabled={!canManageUsers}
                    >
                      {t('admin.addUser')}
                    </Button>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Button block icon={<ReloadOutlined />} onClick={loadUsers}>
                      {t('admin.refreshData')}
                    </Button>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Button block icon={<ExportOutlined />}>
                      {t('admin.exportReport')}
                    </Button>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>
        </TabPane>

        {/* 用户管理 */}
        {canManageUsers && (
          <TabPane
            tab={
              <span>
                <TeamOutlined />
                {t('admin.userManagement')}
              </span>
            }
            key='users'
          >
            <Card
              title={t('admin.userList')}
              extra={
                <Space>
                  <Button
                    type='primary'
                    icon={<PlusOutlined />}
                    onClick={handleAddUser}
                  >
                    {t('admin.addUser')}
                  </Button>
                  <Button icon={<ReloadOutlined />} onClick={loadUsers}>
                    {t('admin.refresh')}
                  </Button>
                </Space>
              }
            >
              <Table
                columns={userColumns}
                dataSource={users}
                rowKey='id'
                loading={loading}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: total => t('user.totalRecords', { total }),
                }}
              />
            </Card>
          </TabPane>
        )}
      </Tabs>

      {/* 用户编辑模态框 */}
      <Modal
        title={editingUser ? t('admin.editUser') : t('admin.addUser')}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        confirmLoading={loading}
        width={600}
      >
        <Form form={form} layout='vertical' initialValues={{ isActive: true }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name='username'
                label={t('user.username')}
                rules={[{ required: true, message: t('form.required') }]}
              >
                <Input placeholder={t('form.enterUsername')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name='email'
                label={t('user.email')}
                rules={[
                  { required: true, message: t('form.required') },
                  { type: 'email', message: t('form.invalidEmail') },
                ]}
              >
                <Input placeholder={t('form.enterEmail')} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name='firstName'
                label={t('user.firstName')}
                rules={[{ required: true, message: t('form.required') }]}
              >
                <Input placeholder={t('form.enterFirstName')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name='lastName'
                label={t('user.lastName')}
                rules={[{ required: true, message: t('form.required') }]}
              >
                <Input placeholder={t('form.enterLastName')} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name='role'
                label={t('user.role')}
                rules={[{ required: true, message: t('form.required') }]}
              >
                <Select placeholder={t('form.selectRole')}>
                  <Option value='ADMIN'>{t('admin.roles.ADMIN')}</Option>
                  <Option value='MANAGER'>{t('admin.roles.MANAGER')}</Option>
                  <Option value='EMPLOYEE'>{t('admin.roles.EMPLOYEE')}</Option>
                  <Option value='GUEST'>{t('admin.roles.GUEST')}</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name='phone' label={t('user.phone')}>
                <Input placeholder={t('form.enterPhone')} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name='department' label={t('user.department')}>
                <Input placeholder={t('form.enterDepartment')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name='position' label={t('user.position')}>
                <Input placeholder={t('form.enterPosition')} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminPage;
