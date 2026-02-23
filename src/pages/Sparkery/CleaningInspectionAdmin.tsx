/**
 * Cleaning Inspection Admin Panel - Enhanced with Checklist Templates & Dynamic Sections
 */

import React, { useRef, useState } from 'react';
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
  MenuOutlined,
  UpOutlined,
  DownOutlined,
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
  buildNextSectionInstanceId,
  getSectionTypeId,
  DEFAULT_CHECKLISTS,
  getDefaultChecklistForSection,
  migratePropertyChecklists,
  type Employee,
  type PropertyTemplate,
  OFFICE_SECTION_IDS,
  removeOfficeSections,
} from '@/pages/CleaningInspection/types';
import {
  submitInspection,
  loadAllInspections,
  deleteInspection,
  loadPropertyTemplates,
  savePropertyTemplates,
  loadEmployees,
  saveEmployees,
  clearInspectionTemplateLocalCache,
  isInspectionSupabaseConfigured,
  checkInspectionSupabaseConnection,
  getInspectionSupabaseUrl,
  getInspectionStorageBucket,
  getInspectionLastCloudWriteAt,
  migrateInspectionAssetsToStorage,
} from '@/services/inspectionService';
import { compressImage } from '@/pages/CleaningInspection/utils';
import { buildInspectionShareUrl } from '@/pages/CleaningInspection/shareLink';
import './sparkery.css';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

type InspectionArchive = {
  id: string;
  propertyId: string;
  status: 'pending' | 'in_progress' | 'submitted';
  [key: string]: any;
};

type SupabaseStatus = 'local' | 'checking' | 'connected' | 'unreachable';

/** Generate unique ID */
const generateId = () =>
  `${dayjs().format('YYYYMMDD')}-${Math.random().toString(36).substr(2, 9)}`;

/** Get all available sections (base + optional) */
const getAllSections = (activeSectionIds: string[]) =>
  getActiveSectionDefs(activeSectionIds);

const cloneTemplateSnapshot = (
  templates: PropertyTemplate[]
): PropertyTemplate[] => {
  try {
    return JSON.parse(JSON.stringify(templates)) as PropertyTemplate[];
  } catch {
    return templates.map(item => ({ ...item }));
  }
};

/** Main Component */
const CleaningInspectionAdmin: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const supabaseConfigured = React.useMemo(
    () => isInspectionSupabaseConfigured(),
    []
  );
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseStatus>(
    supabaseConfigured ? 'checking' : 'local'
  );
  const [supabaseStatusMessage, setSupabaseStatusMessage] = useState('');
  const [isMigratingAssets, setIsMigratingAssets] = useState(false);
  const [lastCloudWriteAt, setLastCloudWriteAt] = useState<string | null>(() =>
    getInspectionLastCloudWriteAt()
  );
  const storageBucket = React.useMemo(() => getInspectionStorageBucket(), []);

  const [properties, setProperties] = useState<PropertyTemplate[]>([]);

  const [archives, setArchives] = useState<InspectionArchive[]>([]);

  const [searchText, setSearchText] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [checkOutDate, setCheckOutDate] = useState(
    dayjs().format('YYYY-MM-DD')
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEmployeesOpen, setIsEmployeesOpen] = useState(false);

  // Employee Management
  const [employees, setEmployees] = useState<Employee[]>([]);
  const pendingTemplateSaveRef = useRef<PropertyTemplate[] | null>(null);
  const isTemplateSaveRunningRef = useRef(false);

  const checkCloudConnectivity = React.useCallback(
    async (showToast = false): Promise<boolean> => {
      if (!supabaseConfigured) {
        setSupabaseStatus('local');
        setSupabaseStatusMessage('Supabase environment variables are missing.');
        setLastCloudWriteAt(getInspectionLastCloudWriteAt());
        if (showToast) {
          messageApi.warning(
            'Supabase is not configured. Running in local cache mode.'
          );
        }
        return false;
      }

      setSupabaseStatus('checking');
      const status = await checkInspectionSupabaseConnection();
      if (status.connected) {
        const supabaseUrl = getInspectionSupabaseUrl();
        const host = supabaseUrl
          ? (() => {
              try {
                return new URL(supabaseUrl).host;
              } catch {
                return supabaseUrl;
              }
            })()
          : '';
        setSupabaseStatus('connected');
        setSupabaseStatusMessage(
          host
            ? `Cloud database is reachable (${host}) | bucket: ${storageBucket}`
            : `Cloud database is reachable | bucket: ${storageBucket}`
        );
        setLastCloudWriteAt(getInspectionLastCloudWriteAt());
        if (showToast) {
          messageApi.success('Supabase connection verified');
        }
        return true;
      }

      setSupabaseStatus('unreachable');
      const reason = status.message || 'Unable to reach Supabase';
      setSupabaseStatusMessage(reason);
      if (showToast) {
        messageApi.error(`Supabase is unreachable: ${reason}`);
      }
      return false;
    },
    [messageApi, storageBucket, supabaseConfigured]
  );

  React.useEffect(() => {
    let cancelled = false;

    const loadInitialData = async () => {
      const [templatesResult, archivesResult, employeesResult] =
        await Promise.allSettled([
          loadPropertyTemplates(),
          loadAllInspections(),
          loadEmployees(),
        ]);

      if (cancelled) return;

      if (templatesResult.status === 'fulfilled') {
        const migratedTemplates = templatesResult.value.map((p: any) => {
          if (!p.sections) {
            const newReferenceImages: Record<string, any[]> = {};
            const newSections: string[] = [
              ...BASE_ROOM_SECTIONS.map(s => s.id),
            ];
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
        setProperties(migratedTemplates.map(migratePropertyChecklists));
      }

      if (archivesResult.status === 'fulfilled') {
        setArchives(archivesResult.value as InspectionArchive[]);
      }

      if (employeesResult.status === 'fulfilled') {
        setEmployees(employeesResult.value);
      }

      if (
        templatesResult.status === 'rejected' ||
        archivesResult.status === 'rejected' ||
        employeesResult.status === 'rejected'
      ) {
        messageApi.warning(
          'Some cloud data failed to load. Please verify Supabase tables and RLS policies.'
        );
      }
    };

    loadInitialData();
    return () => {
      cancelled = true;
    };
  }, [messageApi]);

  React.useEffect(() => {
    checkCloudConnectivity(false);
  }, [checkCloudConnectivity]);

  React.useEffect(() => {
    let disposed = false;

    const refreshArchives = async () => {
      try {
        const latest = await loadAllInspections();
        if (!disposed) {
          setArchives(latest as InspectionArchive[]);
        }
      } catch {
        // Keep current data when refresh fails.
      }
    };

    const onFocus = () => {
      refreshArchives();
    };

    const timer = window.setInterval(refreshArchives, 15000);
    window.addEventListener('focus', onFocus);

    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  /** Save employees to Supabase */
  const saveEmployeesToStorage = async (emps: Employee[]) => {
    setEmployees(emps);
    try {
      await saveEmployees(emps);
      setLastCloudWriteAt(getInspectionLastCloudWriteAt());
    } catch {
      messageApi.error('Failed to save employees. Please try again.');
    }
  };

  const drainTemplateSaveQueue = React.useCallback(async () => {
    if (isTemplateSaveRunningRef.current) {
      return;
    }

    isTemplateSaveRunningRef.current = true;
    try {
      while (pendingTemplateSaveRef.current) {
        const snapshot = pendingTemplateSaveRef.current;
        pendingTemplateSaveRef.current = null;

        try {
          const savedTemplates = await savePropertyTemplates(snapshot);
          setProperties(savedTemplates.map(migratePropertyChecklists));
          setLastCloudWriteAt(getInspectionLastCloudWriteAt());
        } catch (error) {
          const reason =
            error instanceof Error ? error.message : 'unknown cloud error';
          messageApi.error(`Property template save failed: ${reason}`);

          if (supabaseConfigured) {
            try {
              clearInspectionTemplateLocalCache();
              const cloudTemplates = await loadPropertyTemplates();
              setProperties(cloudTemplates.map(migratePropertyChecklists));
            } catch {
              // Keep current state if cloud refresh also fails.
            }
          }
        }
      }
    } finally {
      isTemplateSaveRunningRef.current = false;
      if (pendingTemplateSaveRef.current) {
        void drainTemplateSaveQueue();
      }
    }
  }, [messageApi, supabaseConfigured]);

  const savePropertiesToStorage = (props: PropertyTemplate[]) => {
    const snapshot = cloneTemplateSnapshot(props);
    setProperties(snapshot);
    pendingTemplateSaveRef.current = snapshot;
    void drainTemplateSaveQueue();
  };
  const handleForceRefreshTemplates = async () => {
    const connected = await checkCloudConnectivity(true);
    if (!connected) {
      return;
    }

    try {
      clearInspectionTemplateLocalCache();
      const templates = await loadPropertyTemplates();
      setProperties(templates.map(migratePropertyChecklists));
      setSupabaseStatus('connected');
      setSupabaseStatusMessage('Cloud templates were refreshed successfully.');
      setLastCloudWriteAt(getInspectionLastCloudWriteAt());
      messageApi.success('Property templates refreshed from cloud');
    } catch (error) {
      setSupabaseStatus('unreachable');
      const reason =
        error instanceof Error ? error.message : 'unknown cloud error';
      setSupabaseStatusMessage(reason);
      messageApi.error(`Cloud template refresh failed: ${reason}`);
    }
  };

  const handleMigrateLegacyAssets = async () => {
    const connected = await checkCloudConnectivity(true);
    if (!connected) {
      return;
    }

    setIsMigratingAssets(true);
    try {
      const result = await migrateInspectionAssetsToStorage();
      clearInspectionTemplateLocalCache();
      const templates = await loadPropertyTemplates();
      setProperties(templates.map(migratePropertyChecklists));
      setLastCloudWriteAt(getInspectionLastCloudWriteAt());
      setSupabaseStatus('connected');
      setSupabaseStatusMessage(
        `Legacy image migration completed. Templates: ${result.templatesUpdated}/${result.templatesProcessed}, inspections: ${result.inspectionsUpdated}/${result.inspectionsProcessed}.`
      );

      messageApi.success(
        `Migration completed. Uploaded ${result.uploadedAssets} assets.`
      );
      if (result.failedInspections > 0) {
        messageApi.warning(
          `${result.failedInspections} inspection records failed during migration.`
        );
      }
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : 'unknown cloud error';
      setSupabaseStatus('unreachable');
      setSupabaseStatusMessage(reason);
      messageApi.error(`Legacy image migration failed: ${reason}`);
    } finally {
      setIsMigratingAssets(false);
    }
  };

  const buildShareUrl = (
    archive: Partial<InspectionArchive> & { id: string }
  ) => {
    const assignedEmployees = (archive as any).assignedEmployees as
      | Employee[]
      | undefined;
    const employeeIds =
      assignedEmployees && assignedEmployees.length > 0
        ? assignedEmployees.map(emp => emp.id)
        : (archive as any).assignedEmployee
          ? [(archive as any).assignedEmployee.id]
          : [];

    return buildInspectionShareUrl(window.location.origin, {
      id: archive.id,
      propertyName: archive.propertyId || '',
      propertyAddress: (archive as any).propertyAddress || '',
      checkOutDate: (archive as any).checkOutDate || '',
      employeeIds,
      templateId: (archive as any).propertyTemplateId || '',
    });
  };

  const handleGenerateLink = async () => {
    if (!selectedPropertyId) {
      messageApi.warning('Please select a property first');
      return;
    }
    const property = properties.find(p => p.id === selectedPropertyId);
    if (!property) {
      messageApi.error('Property not found');
      return;
    }

    const inspectionId = `insp-${generateId()}`;
    const selectedEmployees = employees.filter(emp =>
      selectedEmployeeIds.includes(emp.id)
    );

    const activeSections =
      property.sections || BASE_ROOM_SECTIONS.map(s => s.id);
    const sections = getAllSections(activeSections).map(s => {
      // Build checklists: use property template checklists or defaults
      let checklist: any[] = [];
      const sectionChecklist =
        property.checklists?.[s.id] ||
        property.checklists?.[getSectionTypeId(s.id)];
      if (sectionChecklist) {
        checklist = sectionChecklist.map((t: any, idx: number) => {
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
        referenceImages:
          property.referenceImages?.[s.id] ||
          property.referenceImages?.[getSectionTypeId(s.id)] ||
          [],
        photos: [],
        notes: '',
        checklist,
      };
    });

    const newInspection: any = {
      id: inspectionId,
      propertyTemplateId: property.id,
      templateName: property.name,
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
    if (selectedEmployees.length > 0) {
      newInspection.assignedEmployees = selectedEmployees;
      newInspection.assignedEmployee = selectedEmployees[0];
    }

    setArchives(prev => [
      newInspection,
      ...prev.filter(item => item.id !== inspectionId),
    ]);

    const syncResult = await submitInspection(newInspection);

    const url = buildShareUrl(newInspection);
    navigator.clipboard.writeText(url);
    window.open(url, '_blank');

    if (syncResult.source === 'supabase') {
      setLastCloudWriteAt(getInspectionLastCloudWriteAt());
      messageApi.success('Inspection link copied and synced to cloud');
    } else {
      messageApi.warning(
        'Link copied, but cloud sync failed. Data is currently local only.'
      );
    }
  };

  const handleDelete = (id: string) => {
    deleteInspection(id)
      .then(() => {
        const newArchives = archives.filter(a => a.id !== id);
        setArchives(newArchives);
        setLastCloudWriteAt(getInspectionLastCloudWriteAt());
        messageApi.success('Deleted');
      })
      .catch(() => {
        messageApi.error('Delete failed. Please try again.');
      });
  };

  const handleCopyLink = (archive: InspectionArchive) => {
    const url = buildShareUrl(archive);
    navigator.clipboard.writeText(url);
    messageApi.success('Link copied.');
  };

  const handleOpen = (archive: InspectionArchive) => {
    const url = buildShareUrl(archive);
    window.open(url, '_blank');
  };

  const filteredArchives = archives.filter(a => {
    const matchesSearch =
      !searchText ||
      a.propertyId?.toLowerCase().includes(searchText.toLowerCase()) ||
      a.id.toLowerCase().includes(searchText.toLowerCase());
    return matchesSearch;
  });

  /** Quick-start wizard: pick property + date, then generate/open a unique link. */
  const handleQuickStartWithProperty = () => {
    if (!selectedPropertyId) {
      messageApi.warning('Please select a property first');
      return;
    }
    handleGenerateLink();
  };

  const supabaseTagColor =
    supabaseStatus === 'connected'
      ? 'green'
      : supabaseStatus === 'checking'
        ? 'processing'
        : supabaseStatus === 'unreachable'
          ? 'red'
          : 'orange';

  const supabaseTagText =
    supabaseStatus === 'connected'
      ? 'Supabase Connected'
      : supabaseStatus === 'checking'
        ? 'Checking Supabase...'
        : supabaseStatus === 'unreachable'
          ? 'Supabase Unreachable'
          : 'Local Cache Mode';

  const formattedLastCloudWriteAt = lastCloudWriteAt
    ? dayjs(lastCloudWriteAt).isValid()
      ? dayjs(lastCloudWriteAt).format('YYYY-MM-DD HH:mm:ss')
      : lastCloudWriteAt
    : 'Never';

  return (
    <div className='sparkery-tool-page sparkery-inspection-admin-page'>
      {contextHolder}
      <div className='sparkery-inspection-header'>
        <Title level={3} className='sparkery-tool-page-title'>
          <HomeOutlined className='sparkery-inspection-icon-8' />
          Cleaning Inspection Admin
        </Title>
        <Space wrap>
          <Button
            icon={<SettingOutlined />}
            onClick={() => setIsSettingsOpen(true)}
          >
            Property Templates
          </Button>
          <Button
            icon={<EditOutlined />}
            onClick={() => setIsEmployeesOpen(true)}
          >
            Employee Management ({employees.length})
          </Button>
          <Button
            onClick={handleForceRefreshTemplates}
            loading={supabaseStatus === 'checking' && !isMigratingAssets}
            disabled={isMigratingAssets}
          >
            Refresh Cloud Templates
          </Button>
          <Button
            onClick={handleMigrateLegacyAssets}
            loading={isMigratingAssets}
            disabled={supabaseStatus === 'checking'}
          >
            Migrate Legacy Images
          </Button>
          <Tag color={supabaseTagColor}>{supabaseTagText}</Tag>
          {supabaseStatusMessage ? (
            <Text type='secondary' className='sparkery-inspection-status-note'>
              {supabaseStatusMessage}
            </Text>
          ) : null}
        </Space>
        <div className='sparkery-inspection-cloud-meta'>
          <Text type='secondary' className='sparkery-inspection-status-note'>
            Storage bucket: {storageBucket}
          </Text>
          <Text type='secondary' className='sparkery-inspection-status-note'>
            Last cloud write: {formattedLastCloudWriteAt}
          </Text>
        </div>
      </div>

      {/* Quick Start Wizard: select property + date, then start inspection */}
      <Card size='small' className='sparkery-inspection-quick-card'>
        <div className='sparkery-inspection-quick-header'>
          <Text strong className='sparkery-inspection-quick-title'>
            <FormOutlined /> Quick Inspection Link
          </Text>
          <Text className='sparkery-inspection-quick-description'>
            Select property and date, then click Start Inspection to generate a
            unique share link. The link opens in a new tab and can be sent to
            assigned cleaners immediately.
          </Text>
        </div>

        <Row gutter={[12, 12]} align='bottom'>
          <Col xs={24} sm={10}>
            <Text strong className='sparkery-inspection-quick-label'>
              Property *
            </Text>
            <div className='sparkery-inspection-quick-field'>
              {properties.length === 0 ? (
                <Text className='sparkery-inspection-quick-help'>
                  No property templates yet. Add one in "Property Templates"
                  first.
                </Text>
              ) : (
                <Select
                  className='sparkery-inspection-full-width'
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
            <Text strong className='sparkery-inspection-quick-label'>
              Check-out Date
            </Text>
            <Input
              type='date'
              value={checkOutDate}
              onChange={e => setCheckOutDate(e.target.value)}
              className='sparkery-inspection-quick-field'
            />
          </Col>
          <Col xs={24} sm={5}>
            <Text strong className='sparkery-inspection-quick-label'>
              Assigned Employees
            </Text>
            <div className='sparkery-inspection-quick-field'>
              <Select
                className='sparkery-inspection-full-width'
                placeholder='Optional'
                mode='multiple'
                value={selectedEmployeeIds}
                onChange={(vals: string[]) => setSelectedEmployeeIds(vals)}
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
              className='sparkery-inspection-quick-start-btn'
            >
              <RocketOutlined /> Start Inspection
            </Button>
          </Col>
        </Row>
      </Card>

      <Card size='small' className='sparkery-inspection-search-card'>
        <Input
          placeholder='Search by property name or inspection ID'
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          allowClear
        />
      </Card>

      {filteredArchives.length > 0 ? (
        <div className='sparkery-inspection-archive-list'>
          {filteredArchives.map(item => (
            <Card key={item.id} size='small'>
              <Row align='middle' justify='space-between'>
                <Col xs={24} sm={16}>
                  <Text strong>{item.propertyId || 'Unnamed'}</Text>
                  <div>
                    <Text
                      type='secondary'
                      className='sparkery-inspection-text-12'
                    >
                      {item.checkOutDate} |{' '}
                      {dayjs(item.submittedAt).format('YYYY-MM-DD HH:mm')}
                    </Text>
                  </div>
                  <Text
                    type='secondary'
                    className='sparkery-inspection-id-text'
                  >
                    {item.id}
                  </Text>
                </Col>
                <Col xs={24} sm={8}>
                  <Space>
                    <Tag color={item.status === 'submitted' ? 'green' : 'blue'}>
                      {item.status === 'submitted'
                        ? 'Submitted'
                        : item.status === 'in_progress'
                          ? 'In Progress'
                          : 'Pending'}
                    </Tag>
                    <Button
                      type='text'
                      icon={<EyeOutlined />}
                      onClick={() => handleOpen(item)}
                    />
                    <Button
                      type='text'
                      icon={<LinkOutlined />}
                      onClick={() => handleCopyLink(item)}
                    />
                    <Popconfirm
                      title='Confirm delete?'
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
        <Card className='sparkery-inspection-empty-card'>
          <HomeOutlined className='sparkery-inspection-empty-icon' />
          <Title level={4} type='secondary'>
            No inspections yet.
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
  const [newOptionalSectionIds, setNewOptionalSectionIds] = useState<string[]>(
    []
  );
  const [previewImage, setPreviewImage] = useState<{
    src: string;
    desc: string;
  } | null>(null);
  const [editingProperty, setEditingProperty] = useState<any>(null);
  const [dragSectionIndex, setDragSectionIndex] = useState<number | null>(null);
  const [dragOverSectionIndex, setDragOverSectionIndex] = useState<
    number | null
  >(null);
  const dragSectionIndexRef = useRef<number | null>(null);

  /** Add new property */
  const handleAdd = () => {
    if (!newName) {
      messageApi.warning('Please enter property name');
      return;
    }
    const defaultSectionIds = Array.from(
      new Set([...BASE_ROOM_SECTIONS.map(s => s.id), ...newOptionalSectionIds])
    );
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
    setNewOptionalSectionIds([]);
    messageApi.success('Property added');
  };

  /** Update property basic info (name, address, notes, etc.) */
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

  /** Add note image (edit mode), auto-compress to reduce storage usage */
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

  /** Remove note image (edit mode) */
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
        const nextSectionId = buildNextSectionInstanceId(sectionId, sections);
        const sectionTypeId = getSectionTypeId(nextSectionId);
        // Pre-populate default checklist for the new section instance.
        const defaultItems = DEFAULT_CHECKLISTS[sectionTypeId] || [];
        const checklists = { ...(p.checklists || {}) };
        if (defaultItems.length > 0) {
          checklists[nextSectionId] = defaultItems.map(d => ({
            label: d.label,
            labelEn: d.labelEn,
            requiredPhoto: d.requiredPhoto,
          }));
        }
        return { ...p, sections: [...sections, nextSectionId], checklists };
      }
      return p;
    });
    onSave(newProps);
    // Refresh editingProperty
    const updated = newProps.find(p => p.id === propertyId);
    if (updated) setEditingProperty(updated);
    messageApi.success('Section added');
  };

  const handleApplyOfficeSections = (propertyId: string) => {
    const officeSectionIds = [...OFFICE_SECTION_IDS];
    const newProps = properties.map(p => {
      if (p.id !== propertyId) {
        return p;
      }

      const currentSections = p.sections || BASE_ROOM_SECTIONS.map(s => s.id);
      const nextSections = [...currentSections];
      const nextChecklists = { ...(p.checklists || {}) };

      officeSectionIds.forEach(sectionTypeId => {
        const nextSectionId = buildNextSectionInstanceId(
          sectionTypeId,
          nextSections
        );
        nextSections.push(nextSectionId);
        const defaultItems = DEFAULT_CHECKLISTS[sectionTypeId] || [];
        if (defaultItems.length > 0) {
          nextChecklists[nextSectionId] = defaultItems.map(item => ({
            label: item.label,
            labelEn: item.labelEn,
            requiredPhoto: item.requiredPhoto,
          }));
        }
      });

      return {
        ...p,
        sections: nextSections,
        checklists: nextChecklists,
      };
    });

    onSave(newProps);
    const updated = newProps.find(p => p.id === propertyId);
    if (updated) {
      setEditingProperty(updated);
    }
    messageApi.success('Office areas added');
  };

  const handleRemoveOfficeSectionsPreset = (propertyId: string) => {
    const newProps = properties.map(p => {
      if (p.id !== propertyId) {
        return p;
      }

      const currentSections = p.sections || BASE_ROOM_SECTIONS.map(s => s.id);
      const nextSections = removeOfficeSections(currentSections);
      const nextReferenceImages = { ...(p.referenceImages || {}) };
      const nextChecklists = { ...(p.checklists || {}) };
      const officeSectionTypeSet = new Set<string>(OFFICE_SECTION_IDS);

      Object.keys(nextReferenceImages).forEach(sectionId => {
        if (officeSectionTypeSet.has(getSectionTypeId(sectionId))) {
          delete nextReferenceImages[sectionId];
        }
      });
      Object.keys(nextChecklists).forEach(sectionId => {
        if (officeSectionTypeSet.has(getSectionTypeId(sectionId))) {
          delete nextChecklists[sectionId];
        }
      });

      return {
        ...p,
        sections: nextSections,
        referenceImages: nextReferenceImages,
        checklists: nextChecklists,
      };
    });

    onSave(newProps);
    const updated = newProps.find(p => p.id === propertyId);
    if (updated) {
      setEditingProperty(updated);
    }
    messageApi.success('Office areas removed');
  };

  const handleRemoveSection = (propertyId: string, sectionId: string) => {
    Modal.confirm({
      title: 'Remove Section',
      content:
        'Removing this section will also remove its reference images and checklist. Continue?',
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

  const reorderArray = <T,>(items: T[], fromIndex: number, toIndex: number) => {
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= items.length ||
      toIndex >= items.length ||
      fromIndex === toIndex
    ) {
      return items;
    }
    const next = [...items];
    const [moved] = next.splice(fromIndex, 1);
    if (typeof moved === 'undefined') {
      return items;
    }
    next.splice(toIndex, 0, moved);
    return next;
  };

  const handleSectionReorder = (
    pid: string,
    oldIndex: number,
    newIndex: number
  ) => {
    const targetIndex = oldIndex === newIndex ? newIndex : oldIndex;
    let hasChanges = oldIndex !== newIndex;

    const newProps = properties.map(p => {
      if (p.id !== pid) return p;

      const sections = p.sections || BASE_ROOM_SECTIONS.map(s => s.id);
      const reorderedSections = reorderArray(sections, oldIndex, newIndex);

      if (hasChanges) {
        return { ...p, sections: reorderedSections };
      }

      return p;
    });

    const updated = newProps.find(p => p.id === pid);
    if (updated) {
      setEditingProperty({ ...updated });
    } else {
      setEditingProperty(newProps[0]);
    }
  };

  const handleSectionMove = (
    propertyId: string,
    index: number,
    direction: 'up' | 'down'
  ) => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0) return;

    const property = properties.find(p => p.id === propertyId);
    const sectionCount = (
      property?.sections || BASE_ROOM_SECTIONS.map(s => s.id)
    ).length;
    if (nextIndex >= sectionCount) return;

    handleSectionReorder(propertyId, index, nextIndex);
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
    messageApi.success('Image removed');
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
      content: 'Are you sure you want to delete this property?',
      onOk: () => {
        onSave(properties.filter(p => p.id !== id));
        messageApi.success('Property deleted');
      },
    });
  };

  const getActiveSections = (prop: any) => {
    const activeIds = prop.sections || BASE_ROOM_SECTIONS.map(s => s.id);
    return getAllSections(activeIds);
  };

  const getAvailableOptionalSections = () => OPTIONAL_SECTIONS;

  return (
    <>
      <Modal
        title='Property Template Management'
        open={open}
        onCancel={onClose}
        footer={null}
        width={1000}
      >
        {contextHolder}
        <Button
          type='primary'
          icon={<PlusOutlined />}
          onClick={() => {
            setNewOptionalSectionIds([]);
            setIsAddOpen(true);
          }}
          className='sparkery-inspection-gap-16'
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
              className='sparkery-inspection-gap-16'
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
                    title='Confirm delete?'
                    onConfirm={() => handleDelete(prop.id)}
                  >
                    <Button type='text' danger size='small'>
                      Delete
                    </Button>
                  </Popconfirm>
                </Space>
              }
            >
              {/* Notes */}
              {(prop.notes ||
                prop.notesZh ||
                (prop.noteImages && prop.noteImages.length > 0)) && (
                <div className='sparkery-inspection-gap-10'>
                  <Text strong className='sparkery-inspection-text-12'>
                    <InfoCircleOutlined className='sparkery-inspection-icon-4' />
                    Notes:
                  </Text>
                  {prop.notesZh && (
                    <Text className='sparkery-inspection-note-text'>
                      {prop.notesZh.length > 60
                        ? prop.notesZh.substring(0, 60) + '...'
                        : prop.notesZh}
                    </Text>
                  )}
                  {prop.notes && !prop.notesZh && (
                    <Text className='sparkery-inspection-note-text-inline'>
                      {prop.notes.length > 60
                        ? prop.notes.substring(0, 60) + '...'
                        : prop.notes}
                    </Text>
                  )}
                  {prop.noteImages && prop.noteImages.length > 0 && (
                    <div className='sparkery-inspection-thumb-row'>
                      {prop.noteImages.map((img: string, idx: number) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`Note ${idx + 1}`}
                          className='sparkery-inspection-thumb-48'
                          onClick={() =>
                            setPreviewImage({
                              src: img,
                              desc: `Note image ${idx + 1}`,
                            })
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Text strong className='sparkery-inspection-text-12'>
                Sections:{' '}
              </Text>
              {getActiveSections(prop).map(s => (
                <Tag
                  key={s.id}
                  color='blue'
                  className='sparkery-inspection-section-tag-gap'
                >
                  {s.name}
                </Tag>
              ))}

              <div className='sparkery-inspection-divider-soft' />

              <Text strong className='sparkery-inspection-text-12'>
                Reference Images:
              </Text>
              <Row gutter={[12, 12]} className='sparkery-inspection-top-8'>
                {getActiveSections(prop).map(section => {
                  const images = prop.referenceImages?.[section.id] || [];
                  return (
                    <Col xs={12} sm={8} md={6} key={section.id}>
                      <div className='sparkery-inspection-ref-card'>
                        <Text className='sparkery-inspection-ref-label'>
                          {section.name} ({images.length})
                        </Text>
                        {images.length > 0 ? (
                          <div className='sparkery-inspection-ref-grid'>
                            {images.map((imgData: any, idx: number) => (
                              <div
                                key={idx}
                                className='sparkery-inspection-thumb-wrap'
                              >
                                <img
                                  src={imgData.image}
                                  alt={`${section.name} ${idx + 1}`}
                                  onClick={() =>
                                    setPreviewImage({
                                      src: imgData.image,
                                      desc: imgData.description,
                                    })
                                  }
                                  className='sparkery-inspection-thumb-45'
                                />
                                <Button
                                  type='text'
                                  danger
                                  size='small'
                                  icon={<DeleteOutlined />}
                                  onClick={() =>
                                    handleDeleteImage(prop.id, section.id, idx)
                                  }
                                  className='sparkery-inspection-thumb-delete'
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <Text
                            type='secondary'
                            className='sparkery-inspection-text-10'
                          >
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
                            className='sparkery-inspection-full-width sparkery-inspection-top-8'
                          >
                            {images.length > 0 ? 'Add more' : 'Upload image'}
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
            setNewNotesZh('');
            setNewNoteImages([]);
            setNewOptionalSectionIds([]);
          }}
          onOk={handleAdd}
        >
          <Space
            direction='vertical'
            className='sparkery-inspection-full-width'
            size={12}
          >
            <div>
              <Text strong>Name *</Text>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder='e.g. UNIT-101'
                className='sparkery-inspection-top-4'
              />
            </div>
            <div>
              <Text strong>Address</Text>
              <Input
                value={newAddress}
                onChange={e => setNewAddress(e.target.value)}
                placeholder='e.g. 123 Main St, Brisbane'
                className='sparkery-inspection-top-4'
              />
            </div>
            <div>
              <Text strong>Sections (optional)</Text>
              <Text type='secondary' className='sparkery-inspection-help-text'>
                Base sections are included by default. Add optional areas like
                Meeting Room and Office Area.
              </Text>
              <Space size={8} wrap className='sparkery-inspection-top-8'>
                <Button
                  size='small'
                  onClick={() =>
                    setNewOptionalSectionIds(prev =>
                      Array.from(new Set([...prev, ...OFFICE_SECTION_IDS]))
                    )
                  }
                >
                  Add office preset
                </Button>
                <Button
                  size='small'
                  onClick={() => setNewOptionalSectionIds([])}
                >
                  Clear optional
                </Button>
              </Space>
              <div className='sparkery-inspection-top-8'>
                <Checkbox.Group
                  value={newOptionalSectionIds}
                  onChange={vals => setNewOptionalSectionIds(vals as string[])}
                  className='sparkery-inspection-full-width'
                >
                  <Row gutter={[8, 8]}>
                    {OPTIONAL_SECTIONS.map(section => (
                      <Col key={section.id} xs={24} sm={12}>
                        <Checkbox value={section.id}>{section.name}</Checkbox>
                      </Col>
                    ))}
                  </Row>
                </Checkbox.Group>
              </div>
            </div>
            <div>
              <Text strong>
                <InfoCircleOutlined className='sparkery-inspection-icon-4' />
                Property Notes (Chinese)
              </Text>
              <Input.TextArea
                value={newNotesZh}
                onChange={e => setNewNotesZh(e.target.value)}
                placeholder='e.g. Key pickup instructions, lockbox location, entry method, and access code.'
                rows={6}
                className='sparkery-inspection-top-4'
              />
              <Text type='secondary' className='sparkery-inspection-text-11'>
                Chinese notes shown when cleaner uses Chinese UI.
              </Text>
              <div className='sparkery-inspection-top-8'>
                <Text strong>
                  <InfoCircleOutlined className='sparkery-inspection-icon-4' />
                  Property Notes (English)
                </Text>
                <Input.TextArea
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder='e.g. Key access: lockbox at mailroom, code 3091. Entry: building lobby.'
                  rows={6}
                  className='sparkery-inspection-top-4'
                />
                <Text type='secondary' className='sparkery-inspection-text-11'>
                  English version of key pickup, access code, etc. Shown when
                  cleaner switches to English.
                </Text>
              </div>
              <Text
                type='secondary'
                className='sparkery-inspection-bilingual-warning'
              >
                Please fill both Chinese and English notes for bilingual output.
              </Text>
              {/* Note images */}
              <div className='sparkery-inspection-top-8'>
                <Text strong className='sparkery-inspection-subtitle'>
                  <CameraOutlined className='sparkery-inspection-icon-4' />
                  Note Images (Optional)
                </Text>
                {newNoteImages.length > 0 && (
                  <div className='sparkery-inspection-note-image-grid'>
                    {newNoteImages.map((img, idx) => (
                      <div
                        key={idx}
                        className='sparkery-inspection-note-image-wrap-80'
                      >
                        <img
                          src={img}
                          alt={`Note image ${idx + 1}`}
                          className='sparkery-inspection-note-image-80'
                          onClick={() =>
                            setPreviewImage({
                              src: img,
                              desc: `Note image ${idx + 1}`,
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
                          className='sparkery-inspection-note-image-delete'
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
                    className='sparkery-inspection-full-width'
                  >
                    Add Note Images
                  </Button>
                </Upload>
                <Text type='secondary' className='sparkery-inspection-text-11'>
                  Upload photos of key locations (lockbox, mailroom, entry
                  points, etc.).
                </Text>
              </div>
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
              {/* Property Info Editing */}
              <Card
                size='small'
                className='sparkery-inspection-gap-16 sparkery-inspection-card-soft'
              >
                <Title level={5} className='sparkery-inspection-title-no-top'>
                  <EditOutlined className='sparkery-inspection-icon-6' />
                  Property Information
                </Title>
                <Row gutter={[12, 12]}>
                  <Col xs={24} sm={12}>
                    <Text strong className='sparkery-inspection-text-12'>
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
                      placeholder='e.g. UNIT-101'
                      className='sparkery-inspection-top-4'
                    />
                  </Col>
                  <Col xs={24} sm={12}>
                    <Text strong className='sparkery-inspection-text-12'>
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
                      placeholder='e.g. 123 Main St, Brisbane'
                      className='sparkery-inspection-top-4'
                    />
                  </Col>
                  <Col xs={24}>
                    <Text strong className='sparkery-inspection-text-12'>
                      <InfoCircleOutlined className='sparkery-inspection-icon-4' />
                      Property Notes (Chinese)
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
                      placeholder='e.g. Key pickup instructions, lockbox location, entry method, and access code.'
                      rows={6}
                      className='sparkery-inspection-top-4'
                    />
                    <Text
                      type='secondary'
                      className='sparkery-inspection-text-11'
                    >
                      Chinese notes shown when cleaner uses Chinese UI.
                    </Text>
                    <div className='sparkery-inspection-top-8'>
                      <Text strong className='sparkery-inspection-text-12'>
                        <InfoCircleOutlined className='sparkery-inspection-icon-4' />
                        Property Notes (English)
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
                        placeholder='e.g. Key access: lockbox at mailroom, code 3091.'
                        rows={6}
                        className='sparkery-inspection-top-4'
                      />
                      <Text
                        type='secondary'
                        className='sparkery-inspection-text-11'
                      >
                        English version shown when language is set to English.
                      </Text>
                    </div>
                    <Text
                      type='secondary'
                      className='sparkery-inspection-bilingual-warning'
                    >
                      Please fill both Chinese and English notes for bilingual
                      output.
                    </Text>
                    {/* Note images (edit mode) */}
                    <div className='sparkery-inspection-top-8'>
                      <Text strong className='sparkery-inspection-subtitle'>
                        <CameraOutlined className='sparkery-inspection-icon-4' />
                        Note Images
                      </Text>
                      {(editingProperty.noteImages || []).length > 0 && (
                        <div className='sparkery-inspection-note-image-grid'>
                          {(editingProperty.noteImages || []).map(
                            (img: string, idx: number) => (
                              <div
                                key={idx}
                                className='sparkery-inspection-note-image-wrap-100'
                              >
                                <img
                                  src={img}
                                  alt={`Note image ${idx + 1}`}
                                  className='sparkery-inspection-note-image-100'
                                  onClick={() =>
                                    setPreviewImage({
                                      src: img,
                                      desc: `Note image ${idx + 1}`,
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
                                  className='sparkery-inspection-note-image-delete'
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
                          Add Note Images
                        </Button>
                      </Upload>
                      <Text
                        type='secondary'
                        className='sparkery-inspection-help-text'
                      >
                        Upload photos of key locations (lockbox, mailroom, entry
                        points, etc.).
                      </Text>
                    </div>
                  </Col>
                </Row>
              </Card>

              <Divider className='sparkery-inspection-divider' />

              <Title level={5}>Inspection Sections</Title>
              <Text type='secondary' className='sparkery-inspection-hint'>
                Drag the <MenuOutlined /> handle to reorder section sequence.
              </Text>
              <div className='sparkery-inspection-chip-row'>
                {getActiveSections(editingProperty).map((section, idx) => {
                  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
                    e.preventDefault();

                    const sourceData = e.dataTransfer.getData('text/plain');

                    if (!sourceData) {
                      return;
                    }
                    const sourceIdxFromData = Number.parseInt(sourceData, 10);
                    const sourceIdx = Number.isNaN(sourceIdxFromData)
                      ? dragSectionIndexRef.current
                      : sourceIdxFromData;

                    if (sourceIdx === null) {
                      return;
                    }
                    if (sourceIdx !== idx) {
                      const pid = editingProperty.id;
                      handleSectionReorder(pid, sourceIdx, idx);
                    }
                    dragSectionIndexRef.current = null;
                    setDragSectionIndex(null);
                    setDragOverSectionIndex(null);
                  };
                  return (
                    <div
                      key={section.id}
                      draggable
                      onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
                        dragSectionIndexRef.current = idx;
                        setDragSectionIndex(idx);
                        e.dataTransfer.effectAllowed = 'move';
                        // Firefox/Zen requires setData for drag events to fire reliably.
                        e.dataTransfer.setData('text/plain', String(idx));
                      }}
                      onDragOver={(e: React.DragEvent<HTMLDivElement>) => {
                        e.preventDefault();
                        setDragOverSectionIndex(idx);
                      }}
                      onDragEnd={() => {
                        setTimeout(() => {
                          dragSectionIndexRef.current = null;
                          setDragSectionIndex(null);
                          setDragOverSectionIndex(null);
                        }, 0);
                      }}
                      onDrop={handleDrop}
                      className={`sparkery-inspection-draggable-chip${
                        dragSectionIndex === idx
                          ? ' sparkery-inspection-draggable-chip-dragging'
                          : ''
                      }${
                        dragOverSectionIndex === idx && dragSectionIndex !== idx
                          ? ' sparkery-inspection-draggable-chip-over'
                          : ''
                      }`}
                    >
                      <Space size={4}>
                        <Button
                          type='text'
                          size='small'
                          icon={<UpOutlined />}
                          onMouseDown={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSectionMove(editingProperty.id, idx, 'up');
                          }}
                        />
                        <Button
                          type='text'
                          size='small'
                          icon={<DownOutlined />}
                          onMouseDown={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSectionMove(editingProperty.id, idx, 'down');
                          }}
                        />
                        <Tag
                          color='blue'
                          closable
                          onClose={() =>
                            handleRemoveSection(editingProperty.id, section.id)
                          }
                          className='sparkery-inspection-section-tag'
                        >
                          <MenuOutlined className='sparkery-inspection-drag-icon' />
                          {section.name}
                        </Tag>
                      </Space>
                    </div>
                  );
                })}
              </div>
              <Title level={5}>Optional Sections</Title>
              <div className='sparkery-inspection-gap-8'>
                <Space>
                  <Button
                    size='small'
                    icon={<PlusOutlined />}
                    onClick={() =>
                      handleApplyOfficeSections(editingProperty.id)
                    }
                  >
                    Add Office Areas
                  </Button>
                  <Button
                    size='small'
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() =>
                      handleRemoveOfficeSectionsPreset(editingProperty.id)
                    }
                  >
                    Remove Office Areas
                  </Button>
                </Space>
              </div>
              <div className='sparkery-inspection-chip-row'>
                {getAvailableOptionalSections().map(section => (
                  <Tag
                    key={section.id}
                    color='default'
                    icon={<PlusCircleOutlined />}
                    className='sparkery-inspection-optional-tag'
                    onClick={() =>
                      handleAddSection(editingProperty.id, section.id)
                    }
                  >
                    {section.name}
                  </Tag>
                ))}
                {getAvailableOptionalSections().length === 0 && (
                  <Text type='secondary'>
                    All optional sections have been added
                  </Text>
                )}
              </div>

              <Divider />

              {/* Checklist Template Editor */}
              <Title level={5}>
                <CheckSquareOutlined className='sparkery-inspection-icon-8' />
                Checklist Templates
              </Title>
              <Text
                type='secondary'
                className='sparkery-inspection-hint-compact'
              >
                Customize checklist items by section. Items with camera icon
                require photo capture.
              </Text>

              <Collapse
                accordion
                items={getActiveSections(editingProperty).map(section => {
                  const checklistItems =
                    editingProperty.checklists?.[section.id] || [];
                  const defaultItems =
                    DEFAULT_CHECKLISTS[getSectionTypeId(section.id)] || [];
                  const hasCustom = checklistItems.length > 0;

                  return {
                    key: section.id,
                    label: (
                      <Space>
                        <UnorderedListOutlined />
                        {section.name}
                        <Tag
                          color={hasCustom ? 'green' : 'default'}
                          className='sparkery-inspection-text-11'
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
                            className='sparkery-inspection-gap-12'
                          >
                            Load default items ({defaultItems.length})
                          </Button>
                        )}

                        {/* Checklist items */}
                        {checklistItems.map((item: any, idx: number) => (
                          <div
                            key={idx}
                            className='sparkery-inspection-checklist-item'
                          >
                            <div className='sparkery-inspection-checklist-fields'>
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
                                placeholder='Chinese label'
                                prefix={
                                  <Text
                                    type='secondary'
                                    className='sparkery-inspection-text-10'
                                  >
                                    CN
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
                                    className='sparkery-inspection-text-10'
                                  >
                                    EN
                                  </Text>
                                }
                              />
                            </div>
                            <Tooltip title='Requires photo'>
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
                          className='sparkery-inspection-full-width sparkery-inspection-top-4'
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
        className='sparkery-inspection-preview-modal'
        closable
        closeIcon={
          <CloseOutlined className='sparkery-inspection-preview-close' />
        }
        maskStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
      >
        <div
          className='sparkery-inspection-preview-shell'
          onClick={e => {
            if (e.target === e.currentTarget) setPreviewImage(null);
          }}
        >
          {previewImage && (
            <>
              <img
                src={previewImage.src}
                alt='Preview'
                className='sparkery-inspection-preview-image'
              />
              {previewImage.desc && (
                <Paragraph className='sparkery-inspection-preview-desc'>
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

// Employee Management Modal

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
      messageApi.warning('Please enter employee name');
      return;
    }
    const newEmp = buildEmployeeFromForm(`emp-${generateId()}`);
    onSave([...employees, newEmp]);
    setIsAddOpen(false);
    resetForm();
    messageApi.success('Employee added');
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
    messageApi.success('Employee updated');
  };

  /** Delete an employee */
  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'Confirm Delete',
      content: 'Are you sure you want to delete this employee?',
      onOk: () => {
        onSave(employees.filter(e => e.id !== id));
        messageApi.success('Employee deleted');
      },
    });
  };

  return (
    <>
      <Modal
        title='Employee Management'
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
          className='sparkery-inspection-gap-16'
        >
          Add Employee
        </Button>

        {employees.length === 0 ? (
          <Empty description='No employees' />
        ) : (
          employees.map(emp => (
            <Card
              key={emp.id}
              size='small'
              className='sparkery-inspection-gap-10'
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
                    Edit
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
                  className='sparkery-inspection-text-12-block'
                >
                  Phone: {emp.phone}
                </Text>
              )}
              {emp.notes && (
                <Text
                  type='secondary'
                  className='sparkery-inspection-text-12-block'
                >
                  Notes: {emp.notes}
                </Text>
              )}
            </Card>
          ))
        )}

        {/* Add Employee Modal */}
        <Modal
          title='Add Employee'
          open={isAddOpen}
          onCancel={() => {
            setIsAddOpen(false);
            resetForm();
          }}
          onOk={handleAdd}
        >
          <Space
            direction='vertical'
            className='sparkery-inspection-full-width'
            size={12}
          >
            <div>
              <Text strong>Name *</Text>
              <Input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder='e.g. Zhang San'
                className='sparkery-inspection-top-4'
              />
            </div>
            <div>
              <Text strong>English Name</Text>
              <Input
                value={formNameEn}
                onChange={e => setFormNameEn(e.target.value)}
                placeholder='e.g. Zhang San'
                className='sparkery-inspection-top-4'
              />
            </div>
            <div>
              <Text strong>Phone</Text>
              <Input
                value={formPhone}
                onChange={e => setFormPhone(e.target.value)}
                placeholder='e.g. 0412345678'
                className='sparkery-inspection-top-4'
              />
            </div>
            <div>
              <Text strong>Notes</Text>
              <Input.TextArea
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                placeholder='Optional notes...'
                rows={2}
                className='sparkery-inspection-top-4'
              />
            </div>
          </Space>
        </Modal>

        {/* Edit Employee Modal */}
        <Modal
          title='Edit Employee'
          open={!!editingEmployee}
          onCancel={() => {
            setEditingEmployee(null);
            resetForm();
          }}
          onOk={handleSaveEdit}
        >
          <Space
            direction='vertical'
            className='sparkery-inspection-full-width'
            size={12}
          >
            <div>
              <Text strong>Name *</Text>
              <Input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder='e.g. Zhang San'
                className='sparkery-inspection-top-4'
              />
            </div>
            <div>
              <Text strong>English Name</Text>
              <Input
                value={formNameEn}
                onChange={e => setFormNameEn(e.target.value)}
                placeholder='e.g. Zhang San'
                className='sparkery-inspection-top-4'
              />
            </div>
            <div>
              <Text strong>Phone</Text>
              <Input
                value={formPhone}
                onChange={e => setFormPhone(e.target.value)}
                placeholder='e.g. 0412345678'
                className='sparkery-inspection-top-4'
              />
            </div>
            <div>
              <Text strong>Notes</Text>
              <Input.TextArea
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                placeholder='Optional notes...'
                rows={2}
                className='sparkery-inspection-top-4'
              />
            </div>
          </Space>
        </Modal>
      </Modal>
    </>
  );
};

export default CleaningInspectionAdmin;
