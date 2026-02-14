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
  getDefaultChecklistForSection,
  migratePropertyChecklists,
} from '@/pages/CleaningInspection/types';
import type { Employee } from '@/pages/CleaningInspection/types';
import { submitInspection } from '@/services/inspectionService';
import { compressImage } from '@/pages/CleaningInspection/utils';

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
      // Also migrate checklist labels to new zh/en format
      const withChecklists = migrated.map(migratePropertyChecklists);
      if (JSON.stringify(withChecklists) !== data) {
        try {
          localStorage.setItem(
            'cleaning-inspection-properties',
            JSON.stringify(withChecklists)
          );
        } catch {
          /* quota exceeded, skip write */
        }
      }
      return withChecklists;
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
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [checkOutDate, setCheckOutDate] = useState(
    dayjs().format('YYYY-MM-DD')
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEmployeesOpen, setIsEmployeesOpen] = useState(false);

  // ── Employee Management ──
  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const data = localStorage.getItem('cleaning-inspection-employees');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  });

  /** Save employees to localStorage */
  const saveEmployeesToStorage = (emps: Employee[]) => {
    try {
      localStorage.setItem(
        'cleaning-inspection-employees',
        JSON.stringify(emps)
      );
      setEmployees(emps);
    } catch {
      messageApi.error('存储空间已满');
    }
  };

  const savePropertiesToStorage = (props: any[]) => {
    try {
      localStorage.setItem(
        'cleaning-inspection-properties',
        JSON.stringify(props)
      );
      setProperties(props);
    } catch {
      // Quota exceeded: try clearing old archived inspections to free space
      try {
        localStorage.removeItem('archived-cleaning-inspections');
        localStorage.setItem(
          'cleaning-inspection-properties',
          JSON.stringify(props)
        );
        setProperties(props);
        messageApi.warning('存储空间不足，已清理旧检查记录');
      } catch {
        messageApi.error('存储空间已满，请清理浏览器数据');
      }
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
      // Quota exceeded: trim to fewer records
      try {
        const trimmed = archs.slice(0, 5);
        localStorage.setItem(
          'archived-cleaning-inspections',
          JSON.stringify(trimmed)
        );
        setArchives(trimmed);
      } catch {
        // Still failing: keep only 1
        try {
          localStorage.setItem(
            'archived-cleaning-inspections',
            JSON.stringify(archs.slice(0, 1))
          );
          setArchives(archs.slice(0, 1));
        } catch {
          // Give up on localStorage
          setArchives(archs);
        }
      }
    }
  };

  const handleGenerateLink = () => {
    if (!selectedPropertyId) {
      messageApi.warning('请先选择房产');
      return;
    }
    const property = properties.find(p => p.id === selectedPropertyId);
    if (!property) {
      messageApi.error('未找到该房产');
      return;
    }

    const inspectionId = `insp-${generateId()}`;
    const baseUrl = window.location.origin;

    // Build URL with optional employee param
    let url = `${baseUrl}/cleaning-inspection?id=${inspectionId}&property=${encodeURIComponent(property.name)}`;
    const selectedEmployee = selectedEmployeeId
      ? employees.find(e => e.id === selectedEmployeeId)
      : undefined;
    if (selectedEmployee) {
      url += `&employee=${encodeURIComponent(selectedEmployee.id)}`;
    }

    const activeSections =
      property.sections || BASE_ROOM_SECTIONS.map(s => s.id);
    const sections = getAllSections(activeSections).map(s => {
      // Build checklists: use property template checklists or defaults
      let checklist: any[] = [];
      if (property.checklists?.[s.id]) {
        checklist = property.checklists[s.id].map((t: any, idx: number) => {
          const item: any = {
            id: `${s.id}-item-${idx}`,
            label: t.label,
            checked: false,
            requiredPhoto: t.requiredPhoto || false,
          };
          if (t.labelEn) item.labelEn = t.labelEn;
          return item;
        });
      } else {
        checklist = getDefaultChecklistForSection(s.id);
      }
      return {
        ...s,
        referenceImages: property.referenceImages?.[s.id] || [],
        photos: [],
        notes: '',
        checklist,
      };
    });

    const newInspection: any = {
      id: inspectionId,
      propertyId: property.name,
      propertyAddress: property.address,
      propertyNotes: property.notes || '',
      ...(property.notesZh ? { propertyNotesZh: property.notesZh } : {}),
      checkOutDate,
      submittedAt: '',
      status: 'pending',
      sections,
      checkIn: null,
      checkOut: null,
      damageReports: [],
    };
    if (property.noteImages && property.noteImages.length > 0) {
      newInspection.propertyNoteImages = [...property.noteImages];
    }
    if (selectedEmployee) {
      newInspection.assignedEmployee = selectedEmployee;
    }

    const newArchives = [newInspection, ...archives];
    saveArchivesToStorage(newArchives);

    // Submit to n8n server so the cleaner's device can load it
    submitInspection(newInspection).catch(() => {
      console.warn('[Admin] Failed to sync inspection to server');
    });

    navigator.clipboard.writeText(url);
    window.open(url, '_blank');
    messageApi.success('检查链接已复制到剪贴板！可以发送给清洁工。');
  };

  const handleDelete = (id: string) => {
    const newArchives = archives.filter(a => a.id !== id);
    saveArchivesToStorage(newArchives);
    messageApi.success('已删除');
  };

  const handleCopyLink = (id: string, propertyId: string) => {
    const url = `${window.location.origin}/cleaning-inspection?id=${id}&property=${encodeURIComponent(propertyId)}`;
    navigator.clipboard.writeText(url);
    messageApi.success('链接已复制！');
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
      messageApi.warning('请先在下方选择一个房产');
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
          清洁检查管理
        </Title>
        <Space>
          <Button
            icon={<SettingOutlined />}
            onClick={() => setIsSettingsOpen(true)}
          >
            房产模板
          </Button>
          <Button
            icon={<EditOutlined />}
            onClick={() => setIsEmployeesOpen(true)}
          >
            员工管理 ({employees.length})
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
            <FormOutlined /> 清洁检查向导
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px' }}>
            选择房产和日期后点击"开始检查"，系统会生成唯一链接并在新窗口打开向导，
            将链接发送给清洁工即可。
          </Text>
        </div>

        <Row gutter={[12, 12]} align='bottom'>
          <Col xs={24} sm={10}>
            <Text
              strong
              style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px' }}
            >
              选择房产 *
            </Text>
            <div style={{ marginTop: '4px' }}>
              {properties.length === 0 ? (
                <Text
                  style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}
                >
                  暂无房产，请先在"房产模板"中添加。
                </Text>
              ) : (
                <Select
                  style={{ width: '100%' }}
                  placeholder='请选择房产'
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
            <Text
              strong
              style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px' }}
            >
              退房日期
            </Text>
            <Input
              type='date'
              value={checkOutDate}
              onChange={e => setCheckOutDate(e.target.value)}
              style={{ marginTop: '4px' }}
            />
          </Col>
          <Col xs={24} sm={5}>
            <Text
              strong
              style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px' }}
            >
              指派员工
            </Text>
            <div style={{ marginTop: '4px' }}>
              <Select
                style={{ width: '100%' }}
                placeholder='可选'
                value={selectedEmployeeId || null}
                onChange={(val: string) => setSelectedEmployeeId(val || '')}
                allowClear
              >
                {employees.map(emp => (
                  <Option key={emp.id} value={emp.id}>
                    {emp.name}
                    {emp.nameEn ? ` (${emp.nameEn})` : ''}
                  </Option>
                ))}
              </Select>
            </div>
          </Col>
          <Col xs={24} sm={4}>
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
              <RocketOutlined /> 开始检查
            </Button>
          </Col>
        </Row>
      </Card>

      <Card size='small' style={{ marginBottom: '16px' }}>
        <Input
          placeholder='搜索房产名称或检查ID'
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
                  <Text strong>{item.propertyId || '未命名'}</Text>
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
                      {item.status === 'submitted'
                        ? '已提交'
                        : item.status === 'in_progress'
                          ? '进行中'
                          : '待开始'}
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
                      title='确认删除？'
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
            暂无检查记录
          </Title>
        </Card>
      )}

      <PropertySettingsModal
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        properties={properties}
        onSave={savePropertiesToStorage}
      />
      <EmployeesModal
        open={isEmployeesOpen}
        onClose={() => setIsEmployeesOpen(false)}
        employees={employees}
        onSave={saveEmployeesToStorage}
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
  const [newNotesZh, setNewNotesZh] = useState('');
  const [newNoteImages, setNewNoteImages] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<{
    src: string;
    desc: string;
  } | null>(null);
  const [editingProperty, setEditingProperty] = useState<any>(null);

  /** 添加新房产 */
  const handleAdd = () => {
    if (!newName) {
      messageApi.warning('请输入房产名称');
      return;
    }
    const defaultSectionIds = BASE_ROOM_SECTIONS.map(s => s.id);
    // Pre-populate default checklists for each section
    const defaultChecklists: Record<string, any[]> = {};
    defaultSectionIds.forEach(sId => {
      if (DEFAULT_CHECKLISTS[sId]) {
        defaultChecklists[sId] = DEFAULT_CHECKLISTS[sId].map(item => ({
          label: item.label,
          ...(item.labelEn ? { labelEn: item.labelEn } : {}),
          requiredPhoto: item.requiredPhoto,
        }));
      }
    });

    const newProp: any = {
      id: `prop-${generateId()}`,
      name: newName,
      address: newAddress,
      notes: newNotes,
      sections: defaultSectionIds,
      referenceImages: {},
      checklists: defaultChecklists,
    };
    if (newNotesZh.trim()) newProp.notesZh = newNotesZh;
    if (newNoteImages.length > 0) {
      newProp.noteImages = [...newNoteImages];
    }
    onSave([...properties, newProp]);
    setIsAddOpen(false);
    setNewName('');
    setNewAddress('');
    setNewNotes('');
    setNewNotesZh('');
    setNewNoteImages([]);
    messageApi.success('房产已添加');
  };

  /** 更新房产基本信息（名称、地址、备注等） */
  const handleUpdateProperty = (
    propertyId: string,
    field: 'name' | 'address' | 'notes' | 'notesZh',
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

  /** 添加备注说明图片（编辑模式），自动压缩避免 localStorage 配额溢出 */
  const handleAddNoteImage = (propertyId: string, file: RcFile) => {
    const reader = new FileReader();
    reader.onload = async e => {
      const rawDataUrl = e.target?.result as string;
      // Compress to max 800px width, 0.6 quality to keep localStorage usage low
      const compressed = await compressImage(rawDataUrl, 800, 0.6);
      const newProps = properties.map(p => {
        if (p.id === propertyId) {
          const images = p.noteImages || [];
          return { ...p, noteImages: [...images, compressed] };
        }
        return p;
      });
      onSave(newProps);
      const updated = newProps.find(p => p.id === propertyId);
      if (updated) setEditingProperty(updated);
    };
    reader.readAsDataURL(file);
    return false;
  };

  /** 删除备注说明图片（编辑模式） */
  const handleDeleteNoteImage = (propertyId: string, imageIndex: number) => {
    const newProps = properties.map(p => {
      if (p.id === propertyId) {
        const images = [...(p.noteImages || [])];
        images.splice(imageIndex, 1);
        return { ...p, noteImages: images };
      }
      return p;
    });
    onSave(newProps);
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
    messageApi.success('区域已添加');
  };

  const handleRemoveSection = (propertyId: string, sectionId: string) => {
    Modal.confirm({
      title: '移除区域',
      content: '移除后该区域的参考图片和清单也会被删除，确认继续？',
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
        messageApi.success('区域已移除');
      },
    });
  };

  const handleUploadImage = (
    propertyId: string,
    sectionId: string,
    file: RcFile
  ) => {
    const reader = new FileReader();
    reader.onload = async e => {
      const raw = e.target?.result as string;
      const result = await compressImage(raw, 800, 0.6);
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
    messageApi.success('图片已删除');
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
      title: '删除房产',
      content: '确定要删除这个房产吗？',
      onOk: () => {
        onSave(properties.filter(p => p.id !== id));
        messageApi.success('已删除');
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
        title='房产模板管理'
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
          添加房产
        </Button>

        {properties.length === 0 ? (
          <Empty description='暂无房产' />
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
                    编辑
                  </Button>
                  <Popconfirm
                    title='确认删除？'
                    onConfirm={() => handleDelete(prop.id)}
                  >
                    <Button type='text' danger size='small'>
                      删除
                    </Button>
                  </Popconfirm>
                </Space>
              }
            >
              {/* 备注信息 */}
              {(prop.notes ||
                prop.notesZh ||
                (prop.noteImages && prop.noteImages.length > 0)) && (
                <div style={{ marginBottom: '10px' }}>
                  <Text strong style={{ fontSize: '12px' }}>
                    <InfoCircleOutlined style={{ marginRight: '4px' }} />
                    备注：{' '}
                  </Text>
                  {prop.notesZh && (
                    <Text
                      style={{
                        fontSize: '12px',
                        color: '#595959',
                        display: 'block',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {prop.notesZh.length > 60
                        ? prop.notesZh.substring(0, 60) + '...'
                        : prop.notesZh}
                    </Text>
                  )}
                  {prop.notes && !prop.notesZh && (
                    <Text style={{ fontSize: '12px', color: '#595959' }}>
                      {prop.notes.length > 60
                        ? prop.notes.substring(0, 60) + '...'
                        : prop.notes}
                    </Text>
                  )}
                  {prop.noteImages && prop.noteImages.length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        gap: '6px',
                        flexWrap: 'wrap',
                        marginTop: '6px',
                      }}
                    >
                      {prop.noteImages.map((img: string, idx: number) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`说明${idx + 1}`}
                          style={{
                            width: '48px',
                            height: '48px',
                            objectFit: 'cover',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            border: '1px solid #d9d9d9',
                          }}
                          onClick={() =>
                            setPreviewImage({
                              src: img,
                              desc: `说明图片 ${idx + 1}`,
                            })
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Text strong style={{ fontSize: '12px' }}>
                检查区域：{' '}
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
                参考图片：
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
                            暂无图片
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
                            {images.length > 0 ? '添加更多' : '上传图片'}
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
          title='添加房产'
          open={isAddOpen}
          onCancel={() => {
            setIsAddOpen(false);
            setNewName('');
            setNewAddress('');
            setNewNotes('');
            setNewNotesZh('');
            setNewNoteImages([]);
          }}
          onOk={handleAdd}
        >
          <Space direction='vertical' style={{ width: '100%' }} size={12}>
            <div>
              <Text strong>名称 *</Text>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder='例如：UNIT-101'
                style={{ marginTop: '4px' }}
              />
            </div>
            <div>
              <Text strong>地址</Text>
              <Input
                value={newAddress}
                onChange={e => setNewAddress(e.target.value)}
                placeholder='例如：123 Main St, Brisbane'
                style={{ marginTop: '4px' }}
              />
            </div>
            <div>
              <Text strong>
                <InfoCircleOutlined style={{ marginRight: '4px' }} />
                备注说明（中文版）
              </Text>
              <Input.TextArea
                value={newNotesZh}
                onChange={e => setNewNotesZh(e.target.value)}
                placeholder='例如：🔑 取钥匙说明：&#10;1. 前往信箱室（穿过大堂走到底）&#10;2. 密码锁密码：3091&#10;3. 取出钥匙&#10;&#10;🚪 进入方式：&#10;1. 进入大堂（8 Margaret St）...'
                rows={4}
                style={{ marginTop: '4px' }}
              />
              <Text type='secondary' style={{ fontSize: '11px' }}>
                填写中文版取钥匙方式、门禁密码、位置信息等，中文模式下清洁工看到此版本。
              </Text>
              <div style={{ marginTop: '8px' }}>
                <Text strong>
                  <InfoCircleOutlined style={{ marginRight: '4px' }} />
                  备注说明（English版）
                </Text>
                <Input.TextArea
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder='e.g. 🔑 Key Access:&#10;1. Go to the lockbox at the mailroom.&#10;2. Code: 3091&#10;&#10;🚪 Entry:&#10;1. Enter the building lobby (8 Margaret St)...'
                  rows={4}
                  style={{ marginTop: '4px' }}
                />
                <Text type='secondary' style={{ fontSize: '11px' }}>
                  English version of key pickup, access code, etc. Shown when
                  cleaner switches to English.
                </Text>
              </div>
              <Text
                type='secondary'
                style={{
                  fontSize: '11px',
                  display: 'block',
                  marginTop: '4px',
                  color: '#fa8c16',
                }}
              >
                💡 中英文各填一份，清洁工界面会根据语言自动切换显示对应版本。
              </Text>
              {/* 备注说明图片 */}
              <div style={{ marginTop: '8px' }}>
                <Text
                  strong
                  style={{
                    fontSize: '12px',
                    display: 'block',
                    marginBottom: '6px',
                  }}
                >
                  <CameraOutlined style={{ marginRight: '4px' }} />
                  说明图片（可选）
                </Text>
                {newNoteImages.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '8px',
                      marginBottom: '8px',
                    }}
                  >
                    {newNoteImages.map((img, idx) => (
                      <div
                        key={idx}
                        style={{
                          position: 'relative',
                          width: '80px',
                          height: '80px',
                        }}
                      >
                        <img
                          src={img}
                          alt={`说明图${idx + 1}`}
                          style={{
                            width: '80px',
                            height: '80px',
                            objectFit: 'cover',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            border: '1px solid #d9d9d9',
                          }}
                          onClick={() =>
                            setPreviewImage({
                              src: img,
                              desc: `说明图片 ${idx + 1}`,
                            })
                          }
                        />
                        <Button
                          type='text'
                          danger
                          size='small'
                          icon={<DeleteOutlined />}
                          onClick={() =>
                            setNewNoteImages(prev =>
                              prev.filter((_, i) => i !== idx)
                            )
                          }
                          style={{
                            position: 'absolute',
                            top: '-6px',
                            right: '-6px',
                            padding: '2px',
                            background: '#fff',
                            borderRadius: '50%',
                            boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
                <Upload
                  showUploadList={false}
                  accept='image/*'
                  beforeUpload={file => {
                    const reader = new FileReader();
                    reader.onload = async e => {
                      const rawDataUrl = e.target?.result as string;
                      const compressed = await compressImage(
                        rawDataUrl,
                        800,
                        0.6
                      );
                      setNewNoteImages(prev => [...prev, compressed]);
                    };
                    reader.readAsDataURL(file);
                    return false;
                  }}
                >
                  <Button
                    type='dashed'
                    size='small'
                    icon={<PlusOutlined />}
                    style={{ width: '100%' }}
                  >
                    添加说明图片
                  </Button>
                </Upload>
                <Text type='secondary' style={{ fontSize: '11px' }}>
                  上传钥匙位置、mail
                  room、门禁等关键位置的照片，方便清洁工找到。
                </Text>
              </div>
            </div>
          </Space>
        </Modal>

        <Modal
          title={`编辑房产：${editingProperty?.name || ''}`}
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
                  房产信息
                </Title>
                <Row gutter={[12, 12]}>
                  <Col xs={24} sm={12}>
                    <Text strong style={{ fontSize: '12px' }}>
                      名称 *
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
                      placeholder='例如：UNIT-101'
                      style={{ marginTop: '4px' }}
                    />
                  </Col>
                  <Col xs={24} sm={12}>
                    <Text strong style={{ fontSize: '12px' }}>
                      地址
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
                      placeholder='例如：123 Main St, Brisbane'
                      style={{ marginTop: '4px' }}
                    />
                  </Col>
                  <Col xs={24}>
                    <Text strong style={{ fontSize: '12px' }}>
                      <InfoCircleOutlined style={{ marginRight: '4px' }} />
                      备注说明（中文版）
                    </Text>
                    <Input.TextArea
                      value={editingProperty.notesZh || ''}
                      onChange={e =>
                        handleUpdateProperty(
                          editingProperty.id,
                          'notesZh',
                          e.target.value
                        )
                      }
                      placeholder='例如：🔑 取钥匙说明：&#10;1. 前往信箱室（穿过大堂走到底）&#10;2. 密码锁密码：3091&#10;3. 取出钥匙'
                      rows={4}
                      style={{ marginTop: '4px' }}
                    />
                    <Text type='secondary' style={{ fontSize: '11px' }}>
                      中文版取钥匙方式、门禁密码、位置信息等，中文模式下清洁工看到此版本。
                    </Text>
                    <div style={{ marginTop: '8px' }}>
                      <Text strong style={{ fontSize: '12px' }}>
                        <InfoCircleOutlined style={{ marginRight: '4px' }} />
                        备注说明（English版）
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
                        placeholder='e.g. 🔑 Key Access:&#10;1. Go to the lockbox at the mailroom.&#10;2. Code: 3091'
                        rows={4}
                        style={{ marginTop: '4px' }}
                      />
                      <Text type='secondary' style={{ fontSize: '11px' }}>
                        English version shown when language is set to English.
                      </Text>
                    </div>
                    <Text
                      type='secondary'
                      style={{
                        fontSize: '11px',
                        display: 'block',
                        marginTop: '4px',
                        color: '#fa8c16',
                      }}
                    >
                      💡 中英文各填一份，清洁工界面会根据语言自动切换显示。
                    </Text>
                    {/* 备注说明图片（编辑模式） */}
                    <div style={{ marginTop: '8px' }}>
                      <Text
                        strong
                        style={{
                          fontSize: '12px',
                          display: 'block',
                          marginBottom: '6px',
                        }}
                      >
                        <CameraOutlined style={{ marginRight: '4px' }} />
                        说明图片
                      </Text>
                      {(editingProperty.noteImages || []).length > 0 && (
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '8px',
                            marginBottom: '8px',
                          }}
                        >
                          {(editingProperty.noteImages || []).map(
                            (img: string, idx: number) => (
                              <div
                                key={idx}
                                style={{
                                  position: 'relative',
                                  width: '100px',
                                  height: '100px',
                                }}
                              >
                                <img
                                  src={img}
                                  alt={`说明图${idx + 1}`}
                                  style={{
                                    width: '100px',
                                    height: '100px',
                                    objectFit: 'cover',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    border: '1px solid #d9d9d9',
                                  }}
                                  onClick={() =>
                                    setPreviewImage({
                                      src: img,
                                      desc: `说明图片 ${idx + 1}`,
                                    })
                                  }
                                />
                                <Button
                                  type='text'
                                  danger
                                  size='small'
                                  icon={<DeleteOutlined />}
                                  onClick={() =>
                                    handleDeleteNoteImage(
                                      editingProperty.id,
                                      idx
                                    )
                                  }
                                  style={{
                                    position: 'absolute',
                                    top: '-6px',
                                    right: '-6px',
                                    padding: '2px',
                                    background: '#fff',
                                    borderRadius: '50%',
                                    boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                                  }}
                                />
                              </div>
                            )
                          )}
                        </div>
                      )}
                      <Upload
                        showUploadList={false}
                        accept='image/*'
                        beforeUpload={f =>
                          handleAddNoteImage(editingProperty.id, f)
                        }
                      >
                        <Button
                          type='dashed'
                          size='small'
                          icon={<PlusOutlined />}
                        >
                          添加说明图片
                        </Button>
                      </Upload>
                      <Text
                        type='secondary'
                        style={{
                          fontSize: '11px',
                          display: 'block',
                          marginTop: '4px',
                        }}
                      >
                        上传钥匙位置、mail
                        room、门禁等关键位置的照片，方便清洁工找到。
                      </Text>
                    </div>
                  </Col>
                </Row>
              </Card>

              <Divider style={{ margin: '12px 0' }} />

              <Title level={5}>检查区域</Title>
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
              <Title level={5}>可选区域</Title>
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
                  <Text type='secondary'>所有可选区域均已添加</Text>
                )}
              </div>

              <Divider />

              {/* Checklist Template Editor */}
              <Title level={5}>
                <CheckSquareOutlined style={{ marginRight: '8px' }} />
                清单模板
              </Title>
              <Text
                type='secondary'
                style={{
                  display: 'block',
                  marginBottom: '12px',
                  fontSize: '12px',
                }}
              >
                自定义每个房间的检查清单项目。带相机图标的项目需要清洁工拍照。
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
                            ? `${checklistItems.length} 项`
                            : '使用默认'}
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
                              const items = defaultItems.map(d => {
                                const it: any = {
                                  label: d.label,
                                  requiredPhoto: d.requiredPhoto,
                                };
                                if (d.labelEn) it.labelEn = d.labelEn;
                                return it;
                              });
                              handleUpdateChecklist(
                                editingProperty.id,
                                section.id,
                                items
                              );
                            }}
                            style={{ marginBottom: '12px' }}
                          >
                            加载默认项目 ({defaultItems.length})
                          </Button>
                        )}

                        {/* Checklist items */}
                        {checklistItems.map((item: any, idx: number) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              gap: '6px',
                              alignItems: 'center',
                              marginBottom: '6px',
                              padding: '6px 8px',
                              background: '#fafafa',
                              borderRadius: '4px',
                            }}
                          >
                            <div
                              style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
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
                                placeholder='中文'
                                prefix={
                                  <Text
                                    type='secondary'
                                    style={{ fontSize: '10px' }}
                                  >
                                    中
                                  </Text>
                                }
                              />
                              <Input
                                size='small'
                                value={item.labelEn || ''}
                                onChange={e => {
                                  const updated = [...checklistItems];
                                  updated[idx] = {
                                    ...updated[idx],
                                    labelEn: e.target.value,
                                  };
                                  handleUpdateChecklist(
                                    editingProperty.id,
                                    section.id,
                                    updated
                                  );
                                }}
                                placeholder='English'
                                prefix={
                                  <Text
                                    type='secondary'
                                    style={{ fontSize: '10px' }}
                                  >
                                    EN
                                  </Text>
                                }
                              />
                            </div>
                            <Tooltip title='需要拍照'>
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
                              { label: '', labelEn: '', requiredPhoto: false },
                            ];
                            handleUpdateChecklist(
                              editingProperty.id,
                              section.id,
                              updated
                            );
                          }}
                          style={{ width: '100%', marginTop: '4px' }}
                        >
                          添加检查项
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

// ──────────────────────── Employee Management Modal ────────────────────────

/** EmployeesModal - CRUD for cleaning employees */
const EmployeesModal: React.FC<{
  open: boolean;
  onClose: () => void;
  employees: Employee[];
  onSave: (emps: Employee[]) => void;
}> = ({ open, onClose, employees, onSave }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formName, setFormName] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formNotes, setFormNotes] = useState('');

  /** Reset form fields */
  const resetForm = () => {
    setFormName('');
    setFormNameEn('');
    setFormPhone('');
    setFormNotes('');
  };

  /** Open add modal */
  const handleOpenAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  /** Open edit modal */
  const handleOpenEdit = (emp: Employee) => {
    setFormName(emp.name);
    setFormNameEn(emp.nameEn || '');
    setFormPhone(emp.phone || '');
    setFormNotes(emp.notes || '');
    setEditingEmployee(emp);
  };

  /** Build employee object from form, only including non-empty optional fields */
  const buildEmployeeFromForm = (id: string): Employee => {
    const emp: Employee = { id, name: formName.trim() };
    if (formNameEn.trim()) emp.nameEn = formNameEn.trim();
    if (formPhone.trim()) emp.phone = formPhone.trim();
    if (formNotes.trim()) emp.notes = formNotes.trim();
    return emp;
  };

  /** Save new employee */
  const handleAdd = () => {
    if (!formName.trim()) {
      messageApi.warning('请输入员工姓名');
      return;
    }
    const newEmp = buildEmployeeFromForm(`emp-${generateId()}`);
    onSave([...employees, newEmp]);
    setIsAddOpen(false);
    resetForm();
    messageApi.success('员工已添加');
  };

  /** Save edited employee */
  const handleSaveEdit = () => {
    if (!editingEmployee || !formName.trim()) return;
    const updatedEmp = buildEmployeeFromForm(editingEmployee.id);
    const updated = employees.map(e =>
      e.id === editingEmployee.id ? updatedEmp : e
    );
    onSave(updated);
    setEditingEmployee(null);
    resetForm();
    messageApi.success('已更新');
  };

  /** Delete an employee */
  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这位员工吗？',
      onOk: () => {
        onSave(employees.filter(e => e.id !== id));
        messageApi.success('已删除');
      },
    });
  };

  return (
    <>
      <Modal
        title='员工管理'
        open={open}
        onCancel={onClose}
        footer={null}
        width={700}
      >
        {contextHolder}
        <Button
          type='primary'
          icon={<PlusOutlined />}
          onClick={handleOpenAdd}
          style={{ marginBottom: '16px' }}
        >
          添加员工
        </Button>

        {employees.length === 0 ? (
          <Empty description='暂无员工' />
        ) : (
          employees.map(emp => (
            <Card
              key={emp.id}
              size='small'
              style={{ marginBottom: '10px' }}
              title={
                <Space>
                  <Text strong>{emp.name}</Text>
                  {emp.nameEn && <Text type='secondary'>({emp.nameEn})</Text>}
                </Space>
              }
              extra={
                <Space>
                  <Button
                    size='small'
                    icon={<EditOutlined />}
                    onClick={() => handleOpenEdit(emp)}
                  >
                    编辑
                  </Button>
                  <Button
                    type='text'
                    danger
                    size='small'
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(emp.id)}
                  />
                </Space>
              }
            >
              {emp.phone && (
                <Text
                  type='secondary'
                  style={{ fontSize: '12px', display: 'block' }}
                >
                  📱 {emp.phone}
                </Text>
              )}
              {emp.notes && (
                <Text
                  type='secondary'
                  style={{ fontSize: '12px', display: 'block' }}
                >
                  📝 {emp.notes}
                </Text>
              )}
            </Card>
          ))
        )}

        {/* Add Employee Modal */}
        <Modal
          title='添加员工'
          open={isAddOpen}
          onCancel={() => {
            setIsAddOpen(false);
            resetForm();
          }}
          onOk={handleAdd}
        >
          <Space direction='vertical' style={{ width: '100%' }} size={12}>
            <div>
              <Text strong>姓名 *</Text>
              <Input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder='例如：张三'
                style={{ marginTop: '4px' }}
              />
            </div>
            <div>
              <Text strong>英文名</Text>
              <Input
                value={formNameEn}
                onChange={e => setFormNameEn(e.target.value)}
                placeholder='例如：Zhang San'
                style={{ marginTop: '4px' }}
              />
            </div>
            <div>
              <Text strong>电话</Text>
              <Input
                value={formPhone}
                onChange={e => setFormPhone(e.target.value)}
                placeholder='例如：0412345678'
                style={{ marginTop: '4px' }}
              />
            </div>
            <div>
              <Text strong>备注</Text>
              <Input.TextArea
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                placeholder='备注信息...'
                rows={2}
                style={{ marginTop: '4px' }}
              />
            </div>
          </Space>
        </Modal>

        {/* Edit Employee Modal */}
        <Modal
          title='编辑员工'
          open={!!editingEmployee}
          onCancel={() => {
            setEditingEmployee(null);
            resetForm();
          }}
          onOk={handleSaveEdit}
        >
          <Space direction='vertical' style={{ width: '100%' }} size={12}>
            <div>
              <Text strong>姓名 *</Text>
              <Input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder='例如：张三'
                style={{ marginTop: '4px' }}
              />
            </div>
            <div>
              <Text strong>英文名</Text>
              <Input
                value={formNameEn}
                onChange={e => setFormNameEn(e.target.value)}
                placeholder='例如：Zhang San'
                style={{ marginTop: '4px' }}
              />
            </div>
            <div>
              <Text strong>电话</Text>
              <Input
                value={formPhone}
                onChange={e => setFormPhone(e.target.value)}
                placeholder='例如：0412345678'
                style={{ marginTop: '4px' }}
              />
            </div>
            <div>
              <Text strong>备注</Text>
              <Input.TextArea
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                placeholder='备注信息...'
                rows={2}
                style={{ marginTop: '4px' }}
              />
            </div>
          </Space>
        </Modal>
      </Modal>
    </>
  );
};

export default CleaningInspectionAdmin;
