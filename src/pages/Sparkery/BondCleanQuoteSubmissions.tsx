import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Typography,
  Modal,
  Descriptions,
  Input,
  Select,
  Row,
  Col,
  DatePicker,
  message,
  Popconfirm,
  Statistic,
  Divider,
} from 'antd';
import {
  EyeOutlined,
  DeleteOutlined,
  DownloadOutlined,
  SearchOutlined,
  ReloadOutlined,
  FileTextOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface QuoteSubmission {
  id: string;
  submittedAt: string;
  formType: string;
  customerName: string;
  email: string;
  phone: string;
  propertyAddress: string;
  propertyType: string;
  roomType: string;
  customRoomType?: string;
  hasCarpet: boolean;
  carpetRooms: number;
  garage: boolean;
  glassDoorWindowCount: number;
  oven: boolean;
  fridge: boolean;
  wallStainsCount: number;
  acFilterCount: number;
  blindsCount: number;
  moldCount: number;
  heavySoiling: boolean;
  rubbishRemoval: boolean;
  rubbishRemovalNotes?: string;
  preferredDate: string;
  additionalNotes: string;
  status:
    | 'new'
    | 'contacted'
    | 'quoted'
    | 'confirmed'
    | 'completed'
    | 'cancelled';
}

const BondCleanQuoteSubmissions: React.FC = () => {
  const [submissions, setSubmissions] = useState<QuoteSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSubmission, setSelectedSubmission] =
    useState<QuoteSubmission | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formTypeFilter, setFormTypeFilter] = useState<string>('all');

  // Load submissions from localStorage (replace with API call in production)
  const loadSubmissions = () => {
    setLoading(true);
    try {
      const stored = localStorage.getItem('bondCleanQuoteRequests');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Add status if not present (for backward compatibility)
        const withStatus = parsed.map((s: QuoteSubmission) => ({
          ...s,
          status: s.status || 'new',
        }));
        setSubmissions(withStatus.reverse()); // Show newest first
      }
    } catch (error) {
      message.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  // Update submission status
  const updateStatus = (id: string, newStatus: QuoteSubmission['status']) => {
    const updated = submissions.map(s =>
      s.id === id ? { ...s, status: newStatus } : s
    );
    setSubmissions(updated);
    localStorage.setItem('bondCleanQuoteRequests', JSON.stringify(updated));
    message.success('Status updated');
  };

  // Delete submission
  const deleteSubmission = (id: string) => {
    const filtered = submissions.filter(s => s.id !== id);
    setSubmissions(filtered);
    localStorage.setItem('bondCleanQuoteRequests', JSON.stringify(filtered));
    message.success('Submission deleted');
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'ID',
      'Submitted At',
      'Form Type',
      'Customer Name',
      'Email',
      'Phone',
      'Property Address',
      'Property Type',
      'Room Type',
      'Has Carpet',
      'Carpet Rooms',
      'Garage',
      'Glass Panels',
      'Oven',
      'Fridge',
      'Wall Stains',
      'AC Filters',
      'Blinds',
      'Mold Areas',
      'Heavy Soiling',
      'Rubbish Removal',
      'Rubbish Notes',
      'Preferred Date',
      'Notes',
      'Status',
    ];

    const rows = submissions.map(s => [
      s.id,
      s.submittedAt,
      s.formType,
      s.customerName,
      s.email,
      s.phone,
      s.propertyAddress,
      s.propertyType,
      s.roomType,
      s.hasCarpet ? 'Yes' : 'No',
      s.carpetRooms,
      s.garage ? 'Yes' : 'No',
      s.glassDoorWindowCount,
      s.oven ? 'Yes' : 'No',
      s.fridge ? 'Yes' : 'No',
      s.wallStainsCount,
      s.acFilterCount,
      s.blindsCount,
      s.moldCount,
      s.heavySoiling ? 'Yes' : 'No',
      s.rubbishRemoval ? 'Yes' : 'No',
      s.rubbishRemovalNotes || '',
      s.preferredDate,
      s.additionalNotes,
      s.status,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `quote-submissions-${dayjs().format('YYYY-MM-DD')}.csv`;
    link.click();
    message.success('Exported to CSV');
  };

  // Filter submissions
  const filteredSubmissions = submissions.filter(s => {
    const matchesSearch =
      s.customerName.toLowerCase().includes(searchText.toLowerCase()) ||
      s.email.toLowerCase().includes(searchText.toLowerCase()) ||
      s.phone.includes(searchText) ||
      s.propertyAddress.toLowerCase().includes(searchText.toLowerCase());

    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchesFormType =
      formTypeFilter === 'all' || s.formType === formTypeFilter;

    return matchesSearch && matchesStatus && matchesFormType;
  });

  // Statistics
  const stats = {
    total: submissions.length,
    new: submissions.filter(s => s.status === 'new').length,
    contacted: submissions.filter(s => s.status === 'contacted').length,
    quoted: submissions.filter(s => s.status === 'quoted').length,
    confirmed: submissions.filter(s => s.status === 'confirmed').length,
    completed: submissions.filter(s => s.status === 'completed').length,
  };

  const statusColors: Record<string, string> = {
    new: 'blue',
    contacted: 'orange',
    quoted: 'purple',
    confirmed: 'cyan',
    completed: 'green',
    cancelled: 'red',
  };

  const columns: ColumnsType<QuoteSubmission> = [
    {
      title: 'Submitted At',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      width: 160,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
      sorter: (a, b) =>
        new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(),
    },
    {
      title: 'Type',
      dataIndex: 'formType',
      key: 'formType',
      width: 80,
      render: (type: string) => (
        <Tag
          icon={<GlobalOutlined />}
          color={type.includes('cn') ? 'red' : 'blue'}
        >
          {type.includes('cn') ? 'CN' : 'EN'}
        </Tag>
      ),
    },
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'customerName',
      width: 120,
    },
    {
      title: 'Contact',
      key: 'contact',
      width: 200,
      render: (_, record) => (
        <div>
          <div>{record.phone}</div>
          <div style={{ fontSize: 12, color: '#888' }}>{record.email}</div>
        </div>
      ),
    },
    {
      title: 'Property',
      key: 'property',
      width: 200,
      render: (_, record) => (
        <div>
          <Tag>{record.propertyType}</Tag>
          <Tag>
            {record.roomType === 'other'
              ? record.customRoomType
              : record.roomType}
          </Tag>
          {record.hasCarpet && <Tag color='green'>Carpet</Tag>}
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={statusColors[status] || 'default'}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            size='small'
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedSubmission(record);
              setDetailModalVisible(true);
            }}
          >
            View
          </Button>
          <Popconfirm
            title='Delete this submission?'
            onConfirm={() => deleteSubmission(record.id)}
          >
            <Button size='small' danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const renderDetailModal = () => {
    if (!selectedSubmission) return null;

    return (
      <Modal
        title={`Quote Request - ${selectedSubmission.id}`}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width={800}
        footer={[
          <Button key='close' onClick={() => setDetailModalVisible(false)}>
            Close
          </Button>,
        ]}
      >
        <Descriptions bordered column={2} size='small'>
          <Descriptions.Item label='Submitted At' span={2}>
            {dayjs(selectedSubmission.submittedAt).format(
              'YYYY-MM-DD HH:mm:ss'
            )}
          </Descriptions.Item>
          <Descriptions.Item label='Form Type'>
            <Tag
              color={
                selectedSubmission.formType.includes('cn') ? 'red' : 'blue'
              }
            >
              {selectedSubmission.formType.includes('cn')
                ? 'Chinese'
                : 'English'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label='Status'>
            <Select
              value={selectedSubmission.status}
              onChange={value => {
                updateStatus(selectedSubmission.id, value);
                setSelectedSubmission({ ...selectedSubmission, status: value });
              }}
              style={{ width: 120 }}
            >
              <Option value='new'>New</Option>
              <Option value='contacted'>Contacted</Option>
              <Option value='quoted'>Quoted</Option>
              <Option value='confirmed'>Confirmed</Option>
              <Option value='completed'>Completed</Option>
              <Option value='cancelled'>Cancelled</Option>
            </Select>
          </Descriptions.Item>

          <Descriptions.Item label='Customer Name'>
            {selectedSubmission.customerName}
          </Descriptions.Item>
          <Descriptions.Item label='Phone'>
            {selectedSubmission.phone}
          </Descriptions.Item>
          <Descriptions.Item label='Email' span={2}>
            {selectedSubmission.email}
          </Descriptions.Item>
          <Descriptions.Item label='Property Address' span={2}>
            {selectedSubmission.propertyAddress}
          </Descriptions.Item>

          <Descriptions.Item label='Property Type'>
            {selectedSubmission.propertyType}
          </Descriptions.Item>
          <Descriptions.Item label='Room Type'>
            {selectedSubmission.roomType === 'other'
              ? selectedSubmission.customRoomType
              : selectedSubmission.roomType}
          </Descriptions.Item>
          <Descriptions.Item label='Has Carpet'>
            {selectedSubmission.hasCarpet
              ? `Yes (${selectedSubmission.carpetRooms} rooms)`
              : 'No'}
          </Descriptions.Item>

          <Descriptions.Item label='Additional Services' span={2}>
            <Space wrap>
              {selectedSubmission.garage && (
                <Tag color='blue'>Garage/Balcony</Tag>
              )}
              {selectedSubmission.glassDoorWindowCount > 0 && (
                <Tag color='blue'>
                  Glass: {selectedSubmission.glassDoorWindowCount}
                </Tag>
              )}
              {selectedSubmission.oven && <Tag color='blue'>Oven</Tag>}
              {selectedSubmission.fridge && <Tag color='blue'>Fridge</Tag>}
              {selectedSubmission.wallStainsCount > 0 && (
                <Tag color='blue'>
                  Wall Stains: {selectedSubmission.wallStainsCount}
                </Tag>
              )}
              {selectedSubmission.acFilterCount > 0 && (
                <Tag color='blue'>AC: {selectedSubmission.acFilterCount}</Tag>
              )}
              {selectedSubmission.blindsCount > 0 && (
                <Tag color='blue'>Blinds: {selectedSubmission.blindsCount}</Tag>
              )}
              {selectedSubmission.moldCount > 0 && (
                <Tag color='blue'>Mold: {selectedSubmission.moldCount}</Tag>
              )}
              {selectedSubmission.heavySoiling && (
                <Tag color='orange'>Heavy Soiling</Tag>
              )}
              {selectedSubmission.rubbishRemoval && (
                <Tag color='orange'>Rubbish Removal</Tag>
              )}
            </Space>
          </Descriptions.Item>

          {selectedSubmission.rubbishRemovalNotes && (
            <Descriptions.Item label='Rubbish Notes' span={2}>
              {selectedSubmission.rubbishRemovalNotes}
            </Descriptions.Item>
          )}

          <Descriptions.Item label='Preferred Date' span={2}>
            {selectedSubmission.preferredDate || 'Not specified'}
          </Descriptions.Item>

          <Descriptions.Item label='Additional Notes' span={2}>
            {selectedSubmission.additionalNotes || 'None'}
          </Descriptions.Item>
        </Descriptions>
      </Modal>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={3}>
        <FileTextOutlined style={{ marginRight: 8 }} />
        Bond Clean Quote Submissions
      </Title>
      <Text type='secondary'>View and manage customer quote requests</Text>

      {/* Statistics */}
      <Row gutter={16} style={{ marginTop: 24, marginBottom: 24 }}>
        <Col xs={12} sm={8} md={4}>
          <Card>
            <Statistic title='Total' value={stats.total} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card>
            <Statistic
              title='New'
              value={stats.new}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card>
            <Statistic
              title='Contacted'
              value={stats.contacted}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card>
            <Statistic
              title='Quoted'
              value={stats.quoted}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card>
            <Statistic
              title='Confirmed'
              value={stats.confirmed}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card>
            <Statistic
              title='Completed'
              value={stats.completed}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align='middle'>
          <Col xs={24} sm={8} md={6}>
            <Input
              placeholder='Search name, email, phone...'
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
            >
              <Option value='all'>All Status</Option>
              <Option value='new'>New</Option>
              <Option value='contacted'>Contacted</Option>
              <Option value='quoted'>Quoted</Option>
              <Option value='confirmed'>Confirmed</Option>
              <Option value='completed'>Completed</Option>
              <Option value='cancelled'>Cancelled</Option>
            </Select>
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Select
              value={formTypeFilter}
              onChange={setFormTypeFilter}
              style={{ width: '100%' }}
            >
              <Option value='all'>All Forms</Option>
              <Option value='bond_clean_quote_request'>English</Option>
              <Option value='bond_clean_quote_request_cn'>Chinese</Option>
            </Select>
          </Col>
          <Col xs={24} sm={24} md={10} style={{ textAlign: 'right' }}>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={loadSubmissions}>
                Refresh
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={exportToCSV}
                type='primary'
              >
                Export CSV
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredSubmissions}
          rowKey='id'
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: total => `Total ${total} submissions`,
          }}
        />
      </Card>

      {renderDetailModal()}
    </div>
  );
};

export default BondCleanQuoteSubmissions;
