/**
 * Cleaning Inspection Admin Panel - Enhanced with Checklist Templates & Dynamic Sections
 */

import React, { useState } from 'react';
import {
  Card,
  Typography,
  Button,
  Space,
  Tag,
  Popconfirm,
  Row,
  Col,
  Input,
  Modal,
  Upload,
  message,
  Select,
  Empty,
  Checkbox,
  Collapse,
  Divider,
  Tooltip,
} from 'antd';
import type { RcFile } from 'antd/es/upload/interface';
import {
  HomeOutlined,
  PlusOutlined,
  LinkOutlined,
  DeleteOutlined,
  EyeOutlined,
  SettingOutlined,
  CloseOutlined,
  PlusCircleOutlined,
  CheckSquareOutlined,
  CameraOutlined,
  UnorderedListOutlined,
  RocketOutlined,
  FormOutlined,
  EditOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  BASE_ROOM_SECTIONS,
  OPTIONAL_SECTIONS,
  getActiveSections as getActiveSectionDefs,
  DEFAULT_CHECKLISTS,
} from '@/pages/CleaningInspection/types';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

/** Generate unique ID */
const generateId = () =>
  `${dayjs().format('YYYYMMDD')}-${Math.random().toString(36).substr(2, 9)}`;

/** Get all available sections (base + optional) */
const getAllSections = (activeSectionIds: string[]) => {
  return getActiveSectionDefs(activeSectionIds);
};

/** Main Component */
const CleaningInspectionAdmin: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();

  const [properties, setProperties] = useState<any[]>(() => {
    try {
      const data = localStorage.getItem('cleaning-inspection-properties');
      if (!data) return [];
      const parsed = JSON.parse(data);
      const migrated = parsed.map((p: any) => {
        if (!p.sections) {
          const newReferenceImages: Record<string, any[]> = {};
          const newSections: string[] = [...BASE_ROOM_SECTIONS.map(s => s.id)];
          if (p.referenceImages) {
            Object.entries(p.referenceImages).forEach(
              ([sectionId, image]: [string, any]) => {
                newReferenceImages[sectionId] = [{ image, description: '' }];
              }
            );
          }
          return {
            ...p,
            sections: newSections,
            referenceImages: newReferenceImages,
          };
        }
        return p;
      });
      if (JSON.stringify(migrated) !== data) {
        localStorage.setItem(
          'cleaning-inspection-properties',
          JSON.stringify(migrated)
        );
      }
      return migrated;
    } catch {
      return [];
    }
  });

  const [archives, setArchives] = useState<any[]>(() => {
    try {
      const data = localStorage.getItem('archived-cleaning-inspections');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  });

  const [searchText, setSearchText] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [checkOutDate, setCheckOutDate] = useState(
    dayjs().format('YYYY-MM-DD')
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const savePropertiesToStorage = (props: any[]) => {
    try {
      localStorage.setItem(
        'cleaning-inspection-properties',
        JSON.stringify(props)
      );
      setProperties(props);
    } catch {
      messageApi.error('Storage full');
    }
  };

  const saveArchivesToStorage = (archs: any[]) => {
    try {
      localStorage.setItem(
        'archived-cleaning-inspections',
        JSON.stringify(archs)
      );
      setArchives(archs);
    } catch {
      if (archs.length > 10) {
        const trimmed = archs.slice(0, 10);
        localStorage.setItem(
          'archived-cleaning-inspections',
          JSON.stringify(trimmed)
        );
        setArchives(trimmed);
      }
    }
  };

  const handleGenerateLink = () => {
    if (!selectedPropertyId) {
      messageApi.warning('Select property first');
      return;
    }
    const property = properties.find(p => p.id === selectedPropertyId);
    if (!property) {
      messageApi.error('Property not found');
      return;
    }

    const inspectionId = `insp-${generateId()}`;
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/cleaning-inspection?id=${inspectionId}&property=${encodeURIComponent(property.name)}`;

    const activeSections =
      property.sections || BASE_ROOM_SECTIONS.map(s => s.id);
    const sections = getAllSections(activeSections).map(s => ({
      ...s,
      referenceImages: property.referenceImages?.[s.id] || [],
      photos: [],
      notes: '',
    }));

    const newInspection = {
      id: inspectionId,
      propertyId: property.name,
      propertyAddress: property.address,
      propertyNotes: property.notes || '',
      checkOutDate,
      submittedAt: new Date().toISOString(),
      status: 'draft',
      sections,
    };

    const newArchives = [newInspection, ...archives];
    saveArchivesToStorage(newArchives);
    navigator.clipboard.writeText(url);
    window.open(url, '_blank');
    messageApi.success(
      'Inspection link copied to clipboard! You can send it to the cleaner.'
    );
  };

  const handleDelete = (id: string) => {
    const newArchives = archives.filter(a => a.id !== id);
    saveArchivesToStorage(newArchives);
    messageApi.success('Deleted');
  };

  const handleCopyLink = (id: string, propertyId: string) => {
    const url = `${window.location.origin}/cleaning-inspection?id=${id}&property=${encodeURIComponent(propertyId)}`;
    navigator.clipboard.writeText(url);
    messageApi.success('Link copied!');
  };

  const handleOpen = (id: string, propertyId: string) => {
    const url = `${window.location.origin}/cleaning-inspection?id=${id}&property=${encodeURIComponent(propertyId)}`;
    window.open(url, '_blank');
  };

  const filteredArchives = archives.filter(a => {
    const matchesSearch =
      !searchText ||
      a.propertyId?.toLowerCase().includes(searchText.toLowerCase()) ||
      a.id.toLowerCase().includes(searchText.toLowerCase());
    return matchesSearch;
  });

  /** 快速打开 Wizard：必须先选择房产和日期，生成唯一链接后新窗口打开 */
  const handleQuickStartWithProperty = () => {
    if (!selectedPropertyId) {
      messageApi.warning('Please select a property first (below)');
      return;
    }
    handleGenerateLink();
  };

  return (
    <div style={{ padding: '12px' }}>
      {contextHolder}
      <div style={{ marginBottom: '16px' }}>
        <Title level={3}>
          <HomeOutlined style={{ marginRight: '8px' }} />
          Cleaning Inspection
        </Title>
        <Space>
          <Button
            icon={<SettingOutlined />}
            onClick={() => setIsSettingsOpen(true)}
          >
            Property Templates
          </Button>
        </Space>
      </div>

      {/* ── 新 Wizard 快捷入口：选择房产 + 日期 → Start Inspection ── */}
      <Card
        size='small'
        style={{
          marginBottom: '16px',
          background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
          border: 'none',
          borderRadius: '12px',
        }}
      >
        <div style={{ marginBottom: '12px' }}>
          <Text
            strong
            style={{
              color: '#fff',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <FormOutlined /> Cleaning Inspection Wizard
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px' }}>
            Select a property and date, then click "Start Inspection" to
            generate a unique link. The wizard will open in a new window &mdash;
            share the link with the cleaner.
          </Text>
        </div>

        <Row gutter={[12, 12]} align='bottom'>
          <Col xs={24} sm={10}>
            <Text
              strong
              style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px' }}
            >
              Select Property *
            </Text>
            <div style={{ marginTop: '4px' }}>
              {properties.length === 0 ? (
                <Text
                  style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}
                >
                  No properties. Click "Property Templates" to add one.
                </Text>
              ) : (
                <Select
                  style={{ width: '100%' }}
                  placeholder='Select property'
                  value={selectedPropertyId || null}
                  onChange={(val: string) => setSelectedPropertyId(val)}
                >
                  {properties.map(p => (
                    <Option key={p.id} value={p.id}>
                      {p.name} - {p.address}
                    </Option>
                  ))}
                </Select>
              )}
            </div>
          </Col>
          <Col xs={24} sm={6}>
            <Text
              strong
              style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px' }}
            >
              Check-out Date
            </Text>
            <Input
              type='date'
              value={checkOutDate}
              onChange={e => setCheckOutDate(e.target.value)}
              style={{ marginTop: '4px' }}
            />
          </Col>
          <Col xs={24} sm={8}>
            <Button
              type='default'
              size='large'
              icon={<RocketOutlined />}
              onClick={handleQuickStartWithProperty}
              disabled={!selectedPropertyId || properties.length === 0}
              style={{
                width: '100%',
                fontWeight: 600,
                height: '44px',
                borderRadius: '8px',
                background: '#fff',
                color: '#389e0d',
                border: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}
            >
              <RocketOutlined /> Start Inspection
            </Button>
          </Col>
        </Row>
      </Card>

      <Card size='small' style={{ marginBottom: '16px' }}>
        <Input
          placeholder='Search by property or inspection ID'
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          allowClear
        />
      </Card>

      {filteredArchives.length > 0 ? (
        <div style={{ display: 'grid', gap: '12px' }}>
          {filteredArchives.map(item => (
            <Card key={item.id} size='small'>
              <Row align='middle' justify='space-between'>
                <Col xs={24} sm={16}>
                  <Text strong>{item.propertyId || 'Untitled'}</Text>
                  <div>
                    <Text type='secondary' style={{ fontSize: '12px' }}>
                      {item.checkOutDate} |{' '}
                      {dayjs(item.submittedAt).format('YYYY-MM-DD HH:mm')}
                    </Text>
                  </div>
                  <Text
                    type='secondary'
                    style={{ fontSize: '11px', fontFamily: 'monospace' }}
                  >
                    {item.id}
                  </Text>
                </Col>
                <Col xs={24} sm={8}>
                  <Space>
                    <Tag color={item.status === 'submitted' ? 'green' : 'blue'}>
                      {item.status?.toUpperCase()}
                    </Tag>
                    <Button
                      type='text'
                      icon={<EyeOutlined />}
                      onClick={() => handleOpen(item.id, item.propertyId)}
                    />
                    <Button
                      type='text'
                      icon={<LinkOutlined />}
                      onClick={() => handleCopyLink(item.id, item.propertyId)}
                    />
                    <Popconfirm
                      title='Delete?'
                      onConfirm={() => handleDelete(item.id)}
                    >
                      <Button type='text' danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                </Col>
              </Row>
            </Card>
          ))}
        </div>
      ) : (
        <Card style={{ textAlign: 'center', padding: '48px' }}>
          <HomeOutlined style={{ fontSize: '48px', color: '#bfbfbf' }} />
          <Title level={4} type='secondary'>
            No Inspections
          </Title>
        </Card>
      )}

      <PropertySettingsModal
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        properties={properties}
        onSave={savePropertiesToStorage}
      />
    </div>
  );
};

/** Enhanced Property Settings Modal */
const PropertySettingsModal: React.FC<{
  open: boolean;
  onClose: () => void;
  properties: any[];
  onSave: (props: any[]) => void;
}> = ({ open, onClose, properties, onSave }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [previewImage, setPreviewImage] = useState<{
    src: string;
    desc: string;
  } | null>(null);
  const [editingProperty, setEditingProperty] = useState<any>(null);

  /** 添加新房产 */
  const handleAdd = () => {
    if (!newName) {
      messageApi.warning('Enter property name');
      return;
    }
    const defaultSectionIds = BASE_ROOM_SECTIONS.map(s => s.id);
    // Pre-populate default checklists for each section
    const defaultChecklists: Record<string, any[]> = {};
    defaultSectionIds.forEach(sId => {
      if (DEFAULT_CHECKLISTS[sId]) {
        defaultChecklists[sId] = DEFAULT_CHECKLISTS[sId].map(item => ({
          label: item.label,
          requiredPhoto: item.requiredPhoto,
        }));
      }
    });

    const newProp = {
      id: `prop-${generateId()}`,
      name: newName,
      address: newAddress,
      notes: newNotes,
      sections: defaultSectionIds,
      referenceImages: {},
      checklists: defaultChecklists,
    };
    onSave([...properties, newProp]);
    setIsAddOpen(false);
    setNewName('');
    setNewAddress('');
    setNewNotes('');
    messageApi.success('Property added');
  };

  /** 更新房产基本信息（名称、地址、备注） */
  const handleUpdateProperty = (
    propertyId: string,
    field: 'name' | 'address' | 'notes',
    value: string
  ) => {
    const newProps = properties.map(p => {
      if (p.id === propertyId) {
        return { ...p, [field]: value };
      }
      return p;
    });
    onSave(newProps);
    // Keep editingProperty in sync
    const updated = newProps.find(p => p.id === propertyId);
    if (updated) setEditingProperty(updated);
  };

  const handleAddSection = (propertyId: string, sectionId: string) => {
    const newProps = properties.map(p => {
      if (p.id === propertyId) {
        const sections = p.sections || BASE_ROOM_SECTIONS.map(s => s.id);
        if (!sections.includes(sectionId)) {
          // Also pre-populate default checklist for the new section
          const defaultItems = DEFAULT_CHECKLISTS[sectionId] || [];
          const checklists = { ...(p.checklists || {}) };
          if (defaultItems.length > 0) {
            checklists[sectionId] = defaultItems.map(d => ({
              label: d.label,
              requiredPhoto: d.requiredPhoto,
            }));
          }
          return { ...p, sections: [...sections, sectionId], checklists };
        }
      }
      return p;
    });
    onSave(newProps);
    // Refresh editingProperty
    const updated = newProps.find(p => p.id === propertyId);
    if (updated) setEditingProperty(updated);
    messageApi.success('Section added');
  };

  const handleRemoveSection = (propertyId: string, sectionId: string) => {
    Modal.confirm({
      title: 'Remove Section',
      content:
        'This will also delete reference images and checklist. Continue?',
      onOk: () => {
        const newProps = properties.map(p => {
          if (p.id === propertyId) {
            const sections = (p.sections || []).filter(
              (s: string) => s !== sectionId
            );
            const referenceImages = { ...p.referenceImages };
            delete referenceImages[sectionId];
            const checklists = { ...(p.checklists || {}) };
            delete checklists[sectionId];
            return { ...p, sections, referenceImages, checklists };
          }
          return p;
        });
        onSave(newProps);
        // Refresh editingProperty
        const updated = newProps.find(p => p.id === propertyId);
        if (updated) setEditingProperty(updated);
        messageApi.success('Section removed');
      },
    });
  };

  const handleUploadImage = (
    propertyId: string,
    sectionId: string,
    file: RcFile
  ) => {
    const reader = new FileReader();
    reader.onload = e => {
      const result = e.target?.result as string;
      const newProps = properties.map(p => {
        if (p.id === propertyId) {
          const sectionImages = p.referenceImages?.[sectionId] || [];
          return {
            ...p,
            referenceImages: {
              ...p.referenceImages,
              [sectionId]: [
                ...sectionImages,
                { image: result, description: '' },
              ],
            },
          };
        }
        return p;
      });
      onSave(newProps);
    };
    reader.readAsDataURL(file);
    return false;
  };

  const handleDeleteImage = (
    propertyId: string,
    sectionId: string,
    imageIndex: number
  ) => {
    const newProps = properties.map(p => {
      if (p.id === propertyId) {
        const sectionImages = [...(p.referenceImages?.[sectionId] || [])];
        sectionImages.splice(imageIndex, 1);
        return {
          ...p,
          referenceImages: { ...p.referenceImages, [sectionId]: sectionImages },
        };
      }
      return p;
    });
    onSave(newProps);
    messageApi.success('Image deleted');
  };

  /** Update checklist template for a property section */
  const handleUpdateChecklist = (
    propertyId: string,
    sectionId: string,
    items: { label: string; requiredPhoto: boolean }[]
  ) => {
    const newProps = properties.map(p => {
      if (p.id === propertyId) {
        return {
          ...p,
          checklists: {
            ...(p.checklists || {}),
            [sectionId]: items,
          },
        };
      }
      return p;
    });
    onSave(newProps);
    // Also refresh editingProperty to keep UI in sync
    const updatedProp = newProps.find(p => p.id === propertyId);
    if (updatedProp) setEditingProperty(updatedProp);
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'Delete Property',
      content: 'Are you sure?',
      onOk: () => {
        onSave(properties.filter(p => p.id !== id));
        messageApi.success('Deleted');
      },
    });
  };

  const getActiveSections = (prop: any) => {
    const activeIds = prop.sections || BASE_ROOM_SECTIONS.map(s => s.id);
    return getAllSections(activeIds);
  };

  const getAvailableOptionalSections = (prop: any) => {
    const activeIds = new Set(
      prop.sections || BASE_ROOM_SECTIONS.map(s => s.id)
    );
    return OPTIONAL_SECTIONS.filter(s => !activeIds.has(s.id));
  };

  return (
    <>
      <Modal
        title='Property Templates'
        open={open}
        onCancel={onClose}
        footer={null}
        width={1000}
      >
        {contextHolder}
        <Button
          type='primary'
          icon={<PlusOutlined />}
          onClick={() => setIsAddOpen(true)}
          style={{ marginBottom: '16px' }}
        >
          Add Property
        </Button>

        {properties.length === 0 ? (
          <Empty description='No properties' />
        ) : (
          properties.map(prop => (
            <Card
              key={prop.id}
              size='small'
              style={{ marginBottom: '16px' }}
              title={
                <Space>
                  {prop.name} <Text type='secondary'>- {prop.address}</Text>
                </Space>
              }
              extra={
                <Space>
                  <Button
                    size='small'
                    icon={<EditOutlined />}
                    onClick={() => setEditingProperty(prop)}
                  >
                    Edit
                  </Button>
                  <Popconfirm
                    title='Delete?'
                    onConfirm={() => handleDelete(prop.id)}
                  >
                    <Button type='text' danger size='small'>
                      Delete
                    </Button>
                  </Popconfirm>
                </Space>
              }
            >
              {/* 备注信息 */}
              {prop.notes && (
                <div style={{ marginBottom: '10px' }}>
                  <Text strong style={{ fontSize: '12px' }}>
                    <InfoCircleOutlined style={{ marginRight: '4px' }} />
                    Notes:{' '}
                  </Text>
                  <Text style={{ fontSize: '12px', color: '#595959' }}>
                    {prop.notes}
                  </Text>
                </div>
              )}

              <Text strong style={{ fontSize: '12px' }}>
                Active Sections:{' '}
              </Text>
              {getActiveSections(prop).map(s => (
                <Tag key={s.id} color='blue' style={{ marginBottom: '4px' }}>
                  {s.name}
                </Tag>
              ))}

              <div
                style={{
                  height: '1px',
                  background: '#f0f0f0',
                  margin: '12px 0',
                }}
              />

              <Text strong style={{ fontSize: '12px' }}>
                Reference Images:
              </Text>
              <Row gutter={[12, 12]} style={{ marginTop: '8px' }}>
                {getActiveSections(prop).map(section => {
                  const images = prop.referenceImages?.[section.id] || [];
                  return (
                    <Col xs={12} sm={8} md={6} key={section.id}>
                      <div
                        style={{
                          border: '1px solid #d9d9d9',
                          padding: '10px',
                          textAlign: 'center',
                          background: '#fafafa',
                          borderRadius: '8px',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: '11px',
                            display: 'block',
                            marginBottom: '6px',
                          }}
                        >
                          {section.name} ({images.length})
                        </Text>
                        {images.length > 0 ? (
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '4px',
                              justifyContent: 'center',
                            }}
                          >
                            {images.map((imgData: any, idx: number) => (
                              <div key={idx} style={{ position: 'relative' }}>
                                <img
                                  src={imgData.image}
                                  alt={`${section.name} ${idx + 1}`}
                                  onClick={() =>
                                    setPreviewImage({
                                      src: imgData.image,
                                      desc: imgData.description,
                                    })
                                  }
                                  style={{
                                    width: '45px',
                                    height: '45px',
                                    objectFit: 'cover',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    border: '2px solid #52c41a',
                                  }}
                                />
                                <Button
                                  type='text'
                                  danger
                                  size='small'
                                  icon={<DeleteOutlined />}
                                  onClick={() =>
                                    handleDeleteImage(prop.id, section.id, idx)
                                  }
                                  style={{
                                    position: 'absolute',
                                    top: '-8px',
                                    right: '-8px',
                                    padding: '2px',
                                    background: '#fff',
                                    borderRadius: '50%',
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <Text type='secondary' style={{ fontSize: '10px' }}>
                            No images
                          </Text>
                        )}
                        <Upload
                          showUploadList={false}
                          beforeUpload={f =>
                            handleUploadImage(prop.id, section.id, f)
                          }
                        >
                          <Button
                            type={images.length > 0 ? 'default' : 'dashed'}
                            size='small'
                            icon={<PlusOutlined />}
                            style={{ marginTop: '8px', width: '100%' }}
                          >
                            {images.length > 0 ? 'Add More' : 'Upload'}
                          </Button>
                        </Upload>
                      </div>
                    </Col>
                  );
                })}
              </Row>
            </Card>
          ))
        )}

        <Modal
          title='Add Property'
          open={isAddOpen}
          onCancel={() => {
            setIsAddOpen(false);
            setNewName('');
            setNewAddress('');
            setNewNotes('');
          }}
          onOk={handleAdd}
        >
          <Space direction='vertical' style={{ width: '100%' }} size={12}>
            <div>
              <Text strong>Name *</Text>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder='e.g., UNIT-101'
                style={{ marginTop: '4px' }}
              />
            </div>
            <div>
              <Text strong>Address</Text>
              <Input
                value={newAddress}
                onChange={e => setNewAddress(e.target.value)}
                placeholder='e.g., 123 Main St'
                style={{ marginTop: '4px' }}
              />
            </div>
            <div>
              <Text strong>
                <InfoCircleOutlined style={{ marginRight: '4px' }} />
                Notes / Remarks
              </Text>
              <Input.TextArea
                value={newNotes}
                onChange={e => setNewNotes(e.target.value)}
                placeholder='e.g., Key in lockbox #1234 at front door; Alarm code: 5678; Contact manager before entering...'
                rows={3}
                style={{ marginTop: '4px' }}
              />
              <Text type='secondary' style={{ fontSize: '11px' }}>
                Add instructions for key pickup, alarm codes, access notes, etc.
                This will be shown to the cleaner.
              </Text>
            </div>
          </Space>
        </Modal>

        <Modal
          title={`Edit Property: ${editingProperty?.name || ''}`}
          open={!!editingProperty}
          onCancel={() => setEditingProperty(null)}
          footer={null}
          width={800}
        >
          {editingProperty && (
            <div>
              {/* ── Property Info Editing ── */}
              <Card
                size='small'
                style={{
                  marginBottom: '16px',
                  background: '#fafafa',
                  borderRadius: '8px',
                }}
              >
                <Title level={5} style={{ marginTop: 0 }}>
                  <EditOutlined style={{ marginRight: '6px' }} />
                  Property Info
                </Title>
                <Row gutter={[12, 12]}>
                  <Col xs={24} sm={12}>
                    <Text strong style={{ fontSize: '12px' }}>
                      Name *
                    </Text>
                    <Input
                      value={editingProperty.name}
                      onChange={e =>
                        handleUpdateProperty(
                          editingProperty.id,
                          'name',
                          e.target.value
                        )
                      }
                      placeholder='e.g., UNIT-101'
                      style={{ marginTop: '4px' }}
                    />
                  </Col>
                  <Col xs={24} sm={12}>
                    <Text strong style={{ fontSize: '12px' }}>
                      Address
                    </Text>
                    <Input
                      value={editingProperty.address || ''}
                      onChange={e =>
                        handleUpdateProperty(
                          editingProperty.id,
                          'address',
                          e.target.value
                        )
                      }
                      placeholder='e.g., 123 Main St'
                      style={{ marginTop: '4px' }}
                    />
                  </Col>
                  <Col xs={24}>
                    <Text strong style={{ fontSize: '12px' }}>
                      <InfoCircleOutlined style={{ marginRight: '4px' }} />
                      Notes / Remarks
                    </Text>
                    <Input.TextArea
                      value={editingProperty.notes || ''}
                      onChange={e =>
                        handleUpdateProperty(
                          editingProperty.id,
                          'notes',
                          e.target.value
                        )
                      }
                      placeholder='e.g., Key in lockbox #1234 at front door; Alarm code: 5678; Contact manager before entering...'
                      rows={3}
                      style={{ marginTop: '4px' }}
                    />
                    <Text type='secondary' style={{ fontSize: '11px' }}>
                      Instructions for key pickup, alarm codes, access notes,
                      etc. Shown to the cleaner in the wizard.
                    </Text>
                  </Col>
                </Row>
              </Card>

              <Divider style={{ margin: '12px 0' }} />

              <Title level={5}>Active Sections</Title>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginBottom: '16px',
                }}
              >
                {getActiveSections(editingProperty).map(section => (
                  <Tag
                    key={section.id}
                    color='blue'
                    closable
                    onClose={() =>
                      handleRemoveSection(editingProperty.id, section.id)
                    }
                    style={{ padding: '4px 8px', fontSize: '13px' }}
                  >
                    {section.name}
                  </Tag>
                ))}
              </div>
              <Title level={5}>Available Optional Sections</Title>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginBottom: '16px',
                }}
              >
                {getAvailableOptionalSections(editingProperty).map(section => (
                  <Tag
                    key={section.id}
                    color='default'
                    icon={<PlusCircleOutlined />}
                    style={{
                      padding: '4px 8px',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                    onClick={() =>
                      handleAddSection(editingProperty.id, section.id)
                    }
                  >
                    {section.name}
                  </Tag>
                ))}
                {getAvailableOptionalSections(editingProperty).length === 0 && (
                  <Text type='secondary'>
                    All optional sections are already added
                  </Text>
                )}
              </div>

              <Divider />

              {/* Checklist Template Editor */}
              <Title level={5}>
                <CheckSquareOutlined style={{ marginRight: '8px' }} />
                Checklist Templates
              </Title>
              <Text
                type='secondary'
                style={{
                  display: 'block',
                  marginBottom: '12px',
                  fontSize: '12px',
                }}
              >
                Customize the checklist items for each room. Items marked with a
                camera icon require the cleaner to attach a photo.
              </Text>

              <Collapse
                accordion
                items={getActiveSections(editingProperty).map(section => {
                  const checklistItems =
                    editingProperty.checklists?.[section.id] || [];
                  const defaultItems = DEFAULT_CHECKLISTS[section.id] || [];
                  const hasCustom = checklistItems.length > 0;

                  return {
                    key: section.id,
                    label: (
                      <Space>
                        <UnorderedListOutlined />
                        {section.name}
                        <Tag
                          color={hasCustom ? 'green' : 'default'}
                          style={{ fontSize: '11px' }}
                        >
                          {hasCustom
                            ? `${checklistItems.length} items`
                            : 'Using defaults'}
                        </Tag>
                      </Space>
                    ),
                    children: (
                      <div>
                        {/* Load defaults button */}
                        {!hasCustom && defaultItems.length > 0 && (
                          <Button
                            size='small'
                            type='dashed'
                            icon={<PlusOutlined />}
                            onClick={() => {
                              const items = defaultItems.map(d => ({
                                label: d.label,
                                requiredPhoto: d.requiredPhoto,
                              }));
                              handleUpdateChecklist(
                                editingProperty.id,
                                section.id,
                                items
                              );
                            }}
                            style={{ marginBottom: '12px' }}
                          >
                            Load Default Items ({defaultItems.length})
                          </Button>
                        )}

                        {/* Checklist items */}
                        {checklistItems.map((item: any, idx: number) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              gap: '8px',
                              alignItems: 'center',
                              marginBottom: '6px',
                              padding: '4px 8px',
                              background: '#fafafa',
                              borderRadius: '4px',
                            }}
                          >
                            <Input
                              size='small'
                              value={item.label}
                              onChange={e => {
                                const updated = [...checklistItems];
                                updated[idx] = {
                                  ...updated[idx],
                                  label: e.target.value,
                                };
                                handleUpdateChecklist(
                                  editingProperty.id,
                                  section.id,
                                  updated
                                );
                              }}
                              style={{ flex: 1 }}
                            />
                            <Tooltip title='Require photo'>
                              <Checkbox
                                checked={item.requiredPhoto}
                                onChange={e => {
                                  const updated = [...checklistItems];
                                  updated[idx] = {
                                    ...updated[idx],
                                    requiredPhoto: e.target.checked,
                                  };
                                  handleUpdateChecklist(
                                    editingProperty.id,
                                    section.id,
                                    updated
                                  );
                                }}
                              >
                                <CameraOutlined />
                              </Checkbox>
                            </Tooltip>
                            <Button
                              type='text'
                              danger
                              size='small'
                              icon={<DeleteOutlined />}
                              onClick={() => {
                                const updated = checklistItems.filter(
                                  (_: any, i: number) => i !== idx
                                );
                                handleUpdateChecklist(
                                  editingProperty.id,
                                  section.id,
                                  updated
                                );
                              }}
                            />
                          </div>
                        ))}

                        {/* Add item button */}
                        <Button
                          type='dashed'
                          size='small'
                          icon={<PlusOutlined />}
                          onClick={() => {
                            const updated = [
                              ...checklistItems,
                              { label: '', requiredPhoto: false },
                            ];
                            handleUpdateChecklist(
                              editingProperty.id,
                              section.id,
                              updated
                            );
                          }}
                          style={{ width: '100%', marginTop: '4px' }}
                        >
                          Add Checklist Item
                        </Button>
                      </div>
                    ),
                  };
                })}
              />
            </div>
          )}
        </Modal>
      </Modal>

      <Modal
        open={!!previewImage}
        onCancel={() => setPreviewImage(null)}
        footer={null}
        width='auto'
        style={{ maxWidth: '90vw' }}
        closable
        closeIcon={
          <CloseOutlined style={{ color: '#fff', fontSize: '20px' }} />
        }
        maskStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '200px',
            maxHeight: '80vh',
          }}
          onClick={e => {
            if (e.target === e.currentTarget) setPreviewImage(null);
          }}
        >
          {previewImage && (
            <>
              <img
                src={previewImage.src}
                alt='Preview'
                style={{
                  maxWidth: '100%',
                  maxHeight: '60vh',
                  objectFit: 'contain',
                  borderRadius: '8px',
                }}
              />
              {previewImage.desc && (
                <Paragraph
                  style={{
                    color: '#fff',
                    marginTop: '12px',
                    maxWidth: '600px',
                    textAlign: 'center',
                  }}
                >
                  {previewImage.desc}
                </Paragraph>
              )}
            </>
          )}
        </div>
      </Modal>
    </>
  );
};

export default CleaningInspectionAdmin;
