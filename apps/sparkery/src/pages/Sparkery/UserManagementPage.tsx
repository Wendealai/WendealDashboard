import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
  message,
  type TableColumnsType,
} from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { UserRole } from '@/types/auth';
import { useAppSelector } from '@/hooks/redux';
import { selectAuth } from '@/store/slices/authSlice';
import SparkeryDataTable from '@/components/sparkery/SparkeryDataTable';
import {
  listWorkspaceMembers,
  saveWorkspaceMember,
  type WorkspaceMember,
  type WorkspaceMemberStatus,
  type WorkspaceSource,
} from '@/services/sparkeryWorkspaceUserService';

const { Paragraph, Text, Title } = Typography;

interface MemberFormValues {
  email: string;
  displayName: string;
  role: UserRole;
  status: WorkspaceMemberStatus;
}

const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'employee', label: 'Employee' },
  { value: 'user', label: 'User' },
  { value: 'guest', label: 'Guest' },
];

const STATUS_OPTIONS: Array<{
  value: WorkspaceMemberStatus;
  label: string;
}> = [
  { value: 'active', label: 'Active' },
  { value: 'invited', label: 'Invited' },
  { value: 'suspended', label: 'Suspended' },
];

const STATUS_COLORS: Record<WorkspaceMemberStatus, string> = {
  active: 'green',
  invited: 'blue',
  suspended: 'volcano',
};

const formatDateTime = (value: string | null): string => {
  if (!value) {
    return '-';
  }
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return value;
  }
  return new Date(timestamp).toLocaleString();
};

const UserManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const auth = useAppSelector(selectAuth);
  const [form] = Form.useForm<MemberFormValues>();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [source, setSource] = useState<WorkspaceSource>('local');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<WorkspaceMember | null>(
    null
  );

  const canManageUsers = ['admin', 'manager'].includes(auth.user?.role || '');

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listWorkspaceMembers({
        accessToken: auth.token,
      });
      setMembers(result.members);
      setSource(result.source);
      setWarning(result.warning);
    } catch (error) {
      setWarning(error instanceof Error ? error.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [auth.token]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const metrics = useMemo(
    () => ({
      total: members.length,
      active: members.filter(member => member.status === 'active').length,
      invited: members.filter(member => member.status === 'invited').length,
      suspended: members.filter(member => member.status === 'suspended').length,
    }),
    [members]
  );

  const memberColumns = useMemo<TableColumnsType<WorkspaceMember>>(
    () => [
      {
        title: t('sparkery.saas.users.columns.name', {
          defaultValue: 'Display Name',
        }),
        dataIndex: 'displayName',
        key: 'displayName',
        width: 220,
        render: value => <Text strong>{value}</Text>,
      },
      {
        title: t('sparkery.saas.users.columns.email', {
          defaultValue: 'Email',
        }),
        dataIndex: 'email',
        key: 'email',
        width: 260,
        render: value => <Text code>{value}</Text>,
      },
      {
        title: t('sparkery.saas.users.columns.role', {
          defaultValue: 'Role',
        }),
        dataIndex: 'role',
        key: 'role',
        width: 120,
        render: value => <Tag>{String(value).toUpperCase()}</Tag>,
      },
      {
        title: t('sparkery.saas.users.columns.status', {
          defaultValue: 'Status',
        }),
        dataIndex: 'status',
        key: 'status',
        width: 120,
        render: value => (
          <Tag color={STATUS_COLORS[value as WorkspaceMemberStatus]}>
            {String(value).toUpperCase()}
          </Tag>
        ),
      },
      {
        title: t('sparkery.saas.users.columns.lastLogin', {
          defaultValue: 'Last Login',
        }),
        dataIndex: 'lastLoginAt',
        key: 'lastLoginAt',
        width: 200,
        render: value => formatDateTime(value as string | null),
      },
      {
        title: t('sparkery.saas.users.columns.actions', {
          defaultValue: 'Actions',
        }),
        key: 'actions',
        width: 220,
        render: (_, record) => (
          <Space>
            <Button
              size='small'
              disabled={!canManageUsers}
              onClick={() => openEditModal(record)}
            >
              {t('common.edit', { defaultValue: 'Edit' })}
            </Button>
            {record.status === 'suspended' ? (
              <Popconfirm
                title={t('sparkery.saas.users.confirmActivate', {
                  defaultValue: 'Reactivate this user?',
                })}
                onConfirm={() => {
                  void handleQuickStatus(record, 'active');
                }}
              >
                <Button size='small' disabled={!canManageUsers} type='primary'>
                  {t('sparkery.saas.users.activate', {
                    defaultValue: 'Activate',
                  })}
                </Button>
              </Popconfirm>
            ) : (
              <Popconfirm
                title={t('sparkery.saas.users.confirmSuspend', {
                  defaultValue: 'Suspend this user?',
                })}
                onConfirm={() => {
                  void handleQuickStatus(record, 'suspended');
                }}
              >
                <Button size='small' danger disabled={!canManageUsers}>
                  {t('sparkery.saas.users.suspend', {
                    defaultValue: 'Suspend',
                  })}
                </Button>
              </Popconfirm>
            )}
          </Space>
        ),
      },
    ],
    [canManageUsers, t]
  );

  const openCreateModal = () => {
    setEditingMember(null);
    form.setFieldsValue({
      email: '',
      displayName: '',
      role: 'user',
      status: 'invited',
    });
    setModalOpen(true);
  };

  const openEditModal = (member: WorkspaceMember) => {
    setEditingMember(member);
    form.setFieldsValue({
      email: member.email,
      displayName: member.displayName,
      role: member.role,
      status: member.status,
    });
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingMember(null);
    form.resetFields();
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const result = await saveWorkspaceMember(
        {
          ...(editingMember?.id ? { id: editingMember.id } : {}),
          ...(editingMember?.userId ? { userId: editingMember.userId } : {}),
          email: values.email.trim().toLowerCase(),
          displayName: values.displayName.trim(),
          role: values.role,
          status: values.status,
          ...(editingMember?.lastLoginAt
            ? { lastLoginAt: editingMember.lastLoginAt }
            : {}),
        },
        {
          accessToken: auth.token,
        }
      );

      message.success(
        result.source === 'supabase'
          ? t('sparkery.saas.users.savedSupabase', {
              defaultValue: 'Workspace user saved',
            })
          : t('sparkery.saas.users.savedLocal', {
              defaultValue: 'Saved in local fallback mode',
            })
      );
      handleCloseModal();
      await loadMembers();
    } catch (error) {
      if (error instanceof Error && error.message) {
        message.error(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickStatus = async (
    member: WorkspaceMember,
    status: WorkspaceMemberStatus
  ) => {
    const result = await saveWorkspaceMember(
      {
        id: member.id,
        userId: member.userId,
        email: member.email,
        displayName: member.displayName,
        role: member.role,
        status,
        lastLoginAt: member.lastLoginAt,
      },
      {
        accessToken: auth.token,
      }
    );
    message.success(
      result.source === 'supabase'
        ? t('sparkery.saas.users.statusUpdated', {
            defaultValue: 'User status updated',
          })
        : t('sparkery.saas.users.statusUpdatedLocal', {
            defaultValue: 'Status updated in local mode',
          })
    );
    await loadMembers();
  };

  return (
    <div className='sparkery-saas-users-page'>
      <Card className='sparkery-saas-users-hero' bordered={false}>
        <Title level={4} style={{ marginBottom: 8 }}>
          {t('sparkery.saas.users.title', {
            defaultValue: 'Workspace User Management',
          })}
        </Title>
        <Paragraph type='secondary' style={{ marginBottom: 0 }}>
          {t('sparkery.saas.users.subtitle', {
            defaultValue:
              'Maintain role, status and basic identity profile for Sparkery workspace members.',
          })}
        </Paragraph>
      </Card>

      <Row gutter={[12, 12]} className='sparkery-saas-users-stats'>
        <Col xs={12} md={6}>
          <Card bordered={false}>
            <Statistic title='Total' value={metrics.total} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card bordered={false}>
            <Statistic title='Active' value={metrics.active} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card bordered={false}>
            <Statistic title='Invited' value={metrics.invited} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card bordered={false}>
            <Statistic title='Suspended' value={metrics.suspended} />
          </Card>
        </Col>
      </Row>

      {warning && (
        <Alert
          type='warning'
          showIcon
          message={warning}
          style={{ marginBottom: 12 }}
        />
      )}

      <Card
        bordered={false}
        extra={
          <Space>
            <Tag color={source === 'supabase' ? 'green' : 'orange'}>
              {source === 'supabase' ? 'Supabase' : 'Local Fallback'}
            </Tag>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                void loadMembers();
              }}
              loading={loading}
            >
              {t('common.refresh', { defaultValue: 'Refresh' })}
            </Button>
            <Button
              type='primary'
              icon={<PlusOutlined />}
              disabled={!canManageUsers}
              onClick={openCreateModal}
            >
              {t('sparkery.saas.users.addUser', {
                defaultValue: 'Add User',
              })}
            </Button>
          </Space>
        }
      >
        {!canManageUsers && (
          <Alert
            type='info'
            showIcon
            style={{ marginBottom: 12 }}
            message={t('sparkery.saas.users.permissionHint', {
              defaultValue:
                'Only Admin or Manager can edit workspace users. You can still view current directory.',
            })}
          />
        )}

        <SparkeryDataTable<WorkspaceMember>
          tableId='workspace-members'
          rowKey='id'
          loading={loading}
          dataSource={members}
          columns={memberColumns}
          showQuickFilterRow
          showSortBuilder
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 980 }}
          {...(canManageUsers ? { onRowOpen: openEditModal } : {})}
        />
      </Card>

      <Modal
        title={
          editingMember
            ? t('sparkery.saas.users.editUser', {
                defaultValue: 'Edit User',
              })
            : t('sparkery.saas.users.addUser', {
                defaultValue: 'Add User',
              })
        }
        open={modalOpen}
        onCancel={handleCloseModal}
        onOk={handleSave}
        confirmLoading={submitting}
      >
        <Form<MemberFormValues>
          form={form}
          layout='vertical'
          disabled={!canManageUsers}
        >
          <Form.Item
            label='Email'
            name='email'
            rules={[
              { required: true, message: 'Email is required' },
              { type: 'email', message: 'Please input valid email' },
            ]}
          >
            <Input placeholder='name@company.com' disabled={Boolean(editingMember)} />
          </Form.Item>
          <Form.Item
            label='Display Name'
            name='displayName'
            rules={[{ required: true, message: 'Display name is required' }]}
          >
            <Input placeholder='User display name' />
          </Form.Item>
          <Form.Item label='Role' name='role' rules={[{ required: true }]}>
            <Select options={ROLE_OPTIONS} />
          </Form.Item>
          <Form.Item label='Status' name='status' rules={[{ required: true }]}>
            <Select options={STATUS_OPTIONS} />
          </Form.Item>
          <Alert
            type='info'
            showIcon
            message={t('sparkery.saas.users.inviteHint', {
              defaultValue:
                'This manages workspace profile only. Create authentication users in Supabase Auth Dashboard.',
            })}
          />
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagementPage;
