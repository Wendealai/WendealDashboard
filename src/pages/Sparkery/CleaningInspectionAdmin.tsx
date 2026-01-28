/**
 * Cleaning Inspection Admin Panel - Enhanced with Dynamic Sections & Multi-Image Support
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
} from 'antd';
import type { UploadFile, RcFile } from 'antd/es/upload/interface';
import {
  HomeOutlined,
  PlusOutlined,
  LinkOutlined,
  DeleteOutlined,
  EyeOutlined,
  SettingOutlined,
  UploadOutlined,
  CloseOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

/** Generate unique ID */
const generateId = () =>
  `${dayjs().format('YYYYMMDD')}-${Math.random().toString(36).substr(2, 9)}`;

/** Base room sections that are always included */
const BASE_ROOM_SECTIONS = [
  {
    id: 'kitchen',
    name: 'Kitchen',
    description: 'Kitchen cleaning: countertops, stove, sink, cabinets, floor',
  },
  {
    id: 'living-room',
    name: 'Living Room',
    description: 'Living room: sofa, coffee table, floor, windows',
  },
  {
    id: 'bedroom-1',
    name: 'Bedroom 1',
    description: 'Master bedroom: bed, sheets, nightstands, floor, wardrobe',
  },
  {
    id: 'bathroom-1',
    name: 'Bathroom 1',
    description: 'Main bathroom: toilet, shower, sink, mirror, floor',
  },
  {
    id: 'balcony',
    name: 'Balcony',
    description: 'Balcony: floor, railings, outdoor furniture',
  },
];

/** Available optional sections that can be added */
const OPTIONAL_SECTIONS = [
  { id: 'bedroom-2', name: 'Bedroom 2', description: 'Second bedroom' },
  { id: 'bathroom-2', name: 'Bathroom 2', description: 'Second bathroom' },
  { id: 'bedroom-3', name: 'Bedroom 3', description: 'Third bedroom' },
  { id: 'bathroom-3', name: 'Bathroom 3', description: 'Third bathroom' },
  { id: 'toilet', name: 'Toilet', description: 'Separate toilet' },
  { id: 'laundry', name: 'Laundry', description: 'Laundry room' },
  { id: 'garage', name: 'Garage', description: 'Garage' },
  { id: 'garden', name: 'Garden', description: 'Garden' },
];

/** Get all available sections (base + optional) */
const getAllSections = (activeSectionIds: string[]) => {
  const activeIds = new Set(activeSectionIds);
  return BASE_ROOM_SECTIONS.filter(s => activeIds.has(s.id)).concat(
    OPTIONAL_SECTIONS.filter(s => activeIds.has(s.id))
  );
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
      checkOutDate,
      submittedAt: new Date().toISOString(),
      status: 'draft',
      sections,
    };

    const newArchives = [newInspection, ...archives];
    saveArchivesToStorage(newArchives);
    navigator.clipboard.writeText(url);
    window.open(url, '_blank');
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

      <Card size='small' style={{ marginBottom: '16px' }}>
        <Title level={5}>Generate New Inspection Link</Title>
        <Row gutter={16} align='middle'>
          <Col xs={24} sm={10}>
            <Text strong>Select Property *</Text>
            <div style={{ marginTop: '4px' }}>
              {properties.length === 0 ? (
                <Text type='warning'>
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
          <Col xs={24} sm={5}>
            <Text strong>Check-out Date</Text>
            <Input
              type='date'
              value={checkOutDate}
              onChange={e => setCheckOutDate(e.target.value)}
              style={{ marginTop: '4px' }}
            />
          </Col>
          <Col xs={24} sm={9} style={{ textAlign: 'right' }}>
            <Button
              type='primary'
              icon={<LinkOutlined />}
              onClick={handleGenerateLink}
              disabled={!selectedPropertyId || properties.length === 0}
            >
              Generate Link & Open
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
  const [previewImage, setPreviewImage] = useState<{
    src: string;
    desc: string;
  } | null>(null);
  const [editingProperty, setEditingProperty] = useState<any>(null);

  const handleAdd = () => {
    if (!newName) {
      messageApi.warning('Enter property name');
      return;
    }
    const newProp = {
      id: `prop-${generateId()}`,
      name: newName,
      address: newAddress,
      sections: BASE_ROOM_SECTIONS.map(s => s.id),
      referenceImages: {},
    };
    onSave([...properties, newProp]);
    setIsAddOpen(false);
    setNewName('');
    setNewAddress('');
    messageApi.success('Property added');
  };

  const handleAddSection = (propertyId: string, sectionId: string) => {
    const newProps = properties.map(p => {
      if (p.id === propertyId) {
        const sections = p.sections || BASE_ROOM_SECTIONS.map(s => s.id);
        if (!sections.includes(sectionId))
          return { ...p, sections: [...sections, sectionId] };
      }
      return p;
    });
    onSave(newProps);
    messageApi.success('Section added');
  };

  const handleRemoveSection = (propertyId: string, sectionId: string) => {
    Modal.confirm({
      title: 'Remove Section',
      content: 'This will also delete all reference images. Continue?',
      onOk: () => {
        const newProps = properties.map(p => {
          if (p.id === propertyId) {
            const sections = (p.sections || []).filter(
              (s: string) => s !== sectionId
            );
            const referenceImages = { ...p.referenceImages };
            delete referenceImages[sectionId];
            return { ...p, sections, referenceImages };
          }
          return p;
        });
        onSave(newProps);
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
                  <Button size='small' onClick={() => setEditingProperty(prop)}>
                    Edit Sections
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
          onCancel={() => setIsAddOpen(false)}
          onOk={handleAdd}
        >
          <Space direction='vertical' style={{ width: '100%' }}>
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
          </Space>
        </Modal>

        <Modal
          title={`Edit Sections: ${editingProperty?.name || ''}`}
          open={!!editingProperty}
          onCancel={() => setEditingProperty(null)}
          footer={null}
          width={700}
        >
          {editingProperty && (
            <div>
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
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
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
