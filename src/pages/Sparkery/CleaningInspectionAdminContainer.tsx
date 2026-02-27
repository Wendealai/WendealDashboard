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
  Alert,
  Skeleton,
  Statistic,
  Segmented,
  Switch,
  Progress,
  Drawer,
} from 'antd';
import type { RcFile } from 'antd/es/upload/interface';
import type { InputRef } from 'antd/es/input';
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
  CopyOutlined,
  HistoryOutlined,
  SearchOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  HourglassOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
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
import {
  applySectionBundleToSectionIds,
  buildOneOffChecklistDraftForSection,
  buildOneOffChecklistDraftMap,
  buildOneOffScenarioTypeKey,
  buildOneOffSectionPreset,
  buildOneOffTemplateSnapshot,
  calculateOneOffTemplateDrift,
  DEFAULT_ONE_OFF_GOVERNANCE_POLICY,
  evaluateOneOffGovernance,
  evaluateOneOffQuality,
  getOneOffSectionFamilyId,
  normalizeOneOffTemplateSnapshot,
  ONE_OFF_SECTION_BUNDLES,
  removeSectionBundleFromSectionIds,
  type ChecklistTemplateDraftItem,
  type OneOffCleaningType,
  type OneOffPropertyType,
  type OneOffSectionBundleId,
} from '@/pages/Sparkery/inspectionOneOff';
import {
  getSparkeryTelemetryActorRole,
  getSparkeryTelemetrySessionId,
  trackSparkeryEvent,
} from '@/services/sparkeryTelemetry';
import {
  fetchOneOffTemplateRecommendations,
  type OneOffRecommendationResponse,
} from '@/services/inspectionOneOffRecommendationService';
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
type OneOffDraftSnapshot = {
  id: string;
  name: string;
  customerName: string;
  address: string;
  notes: string;
  notesZh: string;
  checkOutDate: string;
  cleaningType?: OneOffCleaningType;
  propertyType?: OneOffPropertyType;
  sectionIds: string[];
  checklists: Record<string, ChecklistTemplateDraftItem[]>;
  employeeIds: string[];
  updatedAt: string;
};

type OneOffCustomerMemory = {
  cleaningType?: OneOffCleaningType;
  propertyType?: OneOffPropertyType;
  sectionIds: string[];
  employeeIds: string[];
  updatedAt: string;
};

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

const NUMBERED_SECTION_TYPE_RE = /^(.*?)-([1-9]\d*)$/;
const ONE_OFF_SECTION_LABEL_OVERRIDES: Record<string, string> = {
  bedroom: '卧室 Bedroom',
  bathroom: '卫生间 Bathroom',
  'office-area': '办公区 Office Area',
};

const getSectionFamilyId = (sectionId: string): string => {
  return getOneOffSectionFamilyId(sectionId);
};

const buildNextNumberedSectionId = (
  sectionTypeId: string,
  existingSectionIds: string[]
): string | null => {
  const normalizedTypeId = getSectionTypeId(sectionTypeId);
  const typeMatch = normalizedTypeId.match(NUMBERED_SECTION_TYPE_RE);
  if (!typeMatch) {
    return null;
  }

  const prefix = typeMatch[1];
  if (!prefix) {
    return null;
  }

  let maxOrdinal = 0;
  existingSectionIds.forEach(existingId => {
    const normalizedExistingId = getSectionTypeId(existingId);
    const existingMatch = normalizedExistingId.match(NUMBERED_SECTION_TYPE_RE);
    if (!existingMatch || existingMatch[1] !== prefix) {
      return;
    }
    const ordinal = Number.parseInt(existingMatch[2] || '0', 10);
    if (ordinal > maxOrdinal) {
      maxOrdinal = ordinal;
    }
  });

  return `${prefix}-${Math.max(1, maxOrdinal + 1)}`;
};

const buildNextOneOffSectionId = (
  sectionTypeId: string,
  existingSectionIds: string[]
): string => {
  const nextNumberedId = buildNextNumberedSectionId(
    sectionTypeId,
    existingSectionIds
  );
  if (nextNumberedId) {
    return nextNumberedId;
  }
  return buildNextSectionInstanceId(sectionTypeId, existingSectionIds);
};

const reorderList = <T,>(
  items: T[],
  fromIndex: number,
  toIndex: number
): T[] => {
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

const buildOneOffSectionAddOptions = (): Array<{
  value: string;
  label: string;
}> => {
  const seenFamilyIds = new Set<string>();
  const options: Array<{ value: string; label: string }> = [];
  [...BASE_ROOM_SECTIONS, ...OPTIONAL_SECTIONS].forEach(section => {
    const familyId = getSectionFamilyId(section.id);
    if (seenFamilyIds.has(familyId)) {
      return;
    }
    seenFamilyIds.add(familyId);
    options.push({
      value: section.id,
      label: ONE_OFF_SECTION_LABEL_OVERRIDES[familyId] || section.name,
    });
  });
  return options;
};

const buildInspectionSectionsFromTemplates = (
  activeSectionIds: string[],
  checklistTemplates?: Record<string, ChecklistTemplateDraftItem[]>,
  referenceImages?: Record<string, any[]>
) => {
  return getAllSections(activeSectionIds).map(section => {
    const sectionChecklist =
      checklistTemplates?.[section.id] ||
      checklistTemplates?.[getSectionTypeId(section.id)];
    const checklist =
      sectionChecklist && sectionChecklist.length > 0
        ? sectionChecklist.map((item, idx) => {
            const nextItem: any = {
              id: `${section.id}-item-${idx}`,
              label: item.label,
              checked: false,
              requiredPhoto: item.requiredPhoto || false,
            };
            if (item.labelEn) nextItem.labelEn = item.labelEn;
            return nextItem;
          })
        : getDefaultChecklistForSection(section.id);

    return {
      ...section,
      referenceImages:
        referenceImages?.[section.id] ||
        referenceImages?.[getSectionTypeId(section.id)] ||
        [],
      photos: [],
      notes: '',
      checklist,
    };
  });
};

const ONE_OFF_DRAFT_STORAGE_KEY = 'sparkery_inspection_one_off_draft_v1';
const ONE_OFF_DRAFT_HISTORY_STORAGE_KEY =
  'sparkery_inspection_one_off_history_v1';
const ONE_OFF_CUSTOMER_MEMORY_STORAGE_KEY =
  'sparkery_inspection_one_off_customer_memory_v1';
const INSPECTION_ARCHIVE_FILTER_STORAGE_KEY =
  'sparkery_inspection_archive_filter_v1';
const INSPECTION_ARCHIVE_VIEWS_STORAGE_KEY =
  'sparkery_inspection_archive_views_v1';
const INSPECTION_ARCHIVE_ACTION_LOG_STORAGE_KEY =
  'sparkery_inspection_archive_action_logs_v1';
const INSPECTION_ARCHIVE_QUERY_PREFIX = 'insp_';
const MAX_ARCHIVE_VIEWS = 12;
const MAX_ARCHIVE_ACTION_LOGS = 50;
const ONE_OFF_MAX_SESSION_DRAFTS = 8;
const ONE_OFF_ADVANCED_ROLE_SET = new Set(['admin', 'owner', 'ops_manager']);

type ArchiveStatusFilter = 'all' | 'pending' | 'in_progress' | 'submitted';
type ArchiveSortMode =
  | 'latest'
  | 'oldest'
  | 'check_out_latest'
  | 'check_out_oldest';
type ArchiveDensityMode = 'comfortable' | 'compact';
type ArchiveLayoutMode = 'list' | 'board';
type ArchiveQuickChip = 'all' | 'needs_attention' | 'stale_48h' | 'no_assignee';

type ArchiveFilterState = {
  status: ArchiveStatusFilter;
  sortMode: ArchiveSortMode;
  dateFrom: string;
  dateTo: string;
  oneOffOnly: boolean;
  density: ArchiveDensityMode;
  quickChip: ArchiveQuickChip;
  layout: ArchiveLayoutMode;
};

type ArchiveViewPreset = {
  id: string;
  name: string;
  searchText: string;
  filters: ArchiveFilterState;
  createdAt: string;
  updatedAt: string;
};

type ArchiveActionLog = {
  id: string;
  at: string;
  type: string;
  detail: string;
};

const ARCHIVE_STATUS_FILTERS: ArchiveStatusFilter[] = [
  'all',
  'pending',
  'in_progress',
  'submitted',
];

const ARCHIVE_SORT_MODES: ArchiveSortMode[] = [
  'latest',
  'oldest',
  'check_out_latest',
  'check_out_oldest',
];

const ARCHIVE_DENSITY_MODES: ArchiveDensityMode[] = ['comfortable', 'compact'];
const ARCHIVE_LAYOUT_MODES: ArchiveLayoutMode[] = ['list', 'board'];
const ARCHIVE_QUICK_CHIPS: ArchiveQuickChip[] = [
  'all',
  'needs_attention',
  'stale_48h',
  'no_assignee',
];
const ARCHIVE_BOARD_STATUS_ORDER: InspectionArchive['status'][] = [
  'pending',
  'in_progress',
  'submitted',
];

const DEFAULT_ARCHIVE_FILTER_STATE: ArchiveFilterState = {
  status: 'all',
  sortMode: 'latest',
  dateFrom: '',
  dateTo: '',
  oneOffOnly: false,
  density: 'comfortable',
  quickChip: 'all',
  layout: 'list',
};

const normalizeArchiveFilterState = (
  value?: Partial<ArchiveFilterState> | null
): ArchiveFilterState => ({
  status:
    value?.status && ARCHIVE_STATUS_FILTERS.includes(value.status)
      ? value.status
      : DEFAULT_ARCHIVE_FILTER_STATE.status,
  sortMode:
    value?.sortMode && ARCHIVE_SORT_MODES.includes(value.sortMode)
      ? value.sortMode
      : DEFAULT_ARCHIVE_FILTER_STATE.sortMode,
  dateFrom: typeof value?.dateFrom === 'string' ? value.dateFrom : '',
  dateTo: typeof value?.dateTo === 'string' ? value.dateTo : '',
  oneOffOnly: typeof value?.oneOffOnly === 'boolean' ? value.oneOffOnly : false,
  density:
    value?.density && ARCHIVE_DENSITY_MODES.includes(value.density)
      ? value.density
      : DEFAULT_ARCHIVE_FILTER_STATE.density,
  quickChip:
    value?.quickChip && ARCHIVE_QUICK_CHIPS.includes(value.quickChip)
      ? value.quickChip
      : DEFAULT_ARCHIVE_FILTER_STATE.quickChip,
  layout:
    value?.layout && ARCHIVE_LAYOUT_MODES.includes(value.layout)
      ? value.layout
      : DEFAULT_ARCHIVE_FILTER_STATE.layout,
});

const parseArchiveDateValue = (value: unknown): number => {
  if (typeof value !== 'string' || !value) {
    return 0;
  }
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.valueOf() : 0;
};

const readArchiveFilterQueryState = (): {
  searchText: string;
  filters: Partial<ArchiveFilterState>;
} => {
  if (typeof window === 'undefined') {
    return {
      searchText: '',
      filters: {},
    };
  }
  const params = new URLSearchParams(window.location.search);
  const rawOneOff = params.get(`${INSPECTION_ARCHIVE_QUERY_PREFIX}oneoff`);
  return {
    searchText: params.get(`${INSPECTION_ARCHIVE_QUERY_PREFIX}search`) || '',
    filters: {
      ...(params.get(`${INSPECTION_ARCHIVE_QUERY_PREFIX}status`)
        ? {
            status: params.get(
              `${INSPECTION_ARCHIVE_QUERY_PREFIX}status`
            ) as ArchiveStatusFilter,
          }
        : {}),
      ...(params.get(`${INSPECTION_ARCHIVE_QUERY_PREFIX}sort`)
        ? {
            sortMode: params.get(
              `${INSPECTION_ARCHIVE_QUERY_PREFIX}sort`
            ) as ArchiveSortMode,
          }
        : {}),
      ...(params.get(`${INSPECTION_ARCHIVE_QUERY_PREFIX}from`)
        ? {
            dateFrom:
              params.get(`${INSPECTION_ARCHIVE_QUERY_PREFIX}from`) || '',
          }
        : {}),
      ...(params.get(`${INSPECTION_ARCHIVE_QUERY_PREFIX}to`)
        ? { dateTo: params.get(`${INSPECTION_ARCHIVE_QUERY_PREFIX}to`) || '' }
        : {}),
      ...(rawOneOff === '1' || rawOneOff === '0'
        ? { oneOffOnly: rawOneOff === '1' }
        : {}),
      ...(params.get(`${INSPECTION_ARCHIVE_QUERY_PREFIX}density`)
        ? {
            density: params.get(
              `${INSPECTION_ARCHIVE_QUERY_PREFIX}density`
            ) as ArchiveDensityMode,
          }
        : {}),
      ...(params.get(`${INSPECTION_ARCHIVE_QUERY_PREFIX}quick`)
        ? {
            quickChip: params.get(
              `${INSPECTION_ARCHIVE_QUERY_PREFIX}quick`
            ) as ArchiveQuickChip,
          }
        : {}),
      ...(params.get(`${INSPECTION_ARCHIVE_QUERY_PREFIX}layout`)
        ? {
            layout: params.get(
              `${INSPECTION_ARCHIVE_QUERY_PREFIX}layout`
            ) as ArchiveLayoutMode,
          }
        : {}),
    },
  };
};

const safeReadLocalJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const safeWriteLocalJson = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota or private-mode write errors.
  }
};

/** Main Component */
const CleaningInspectionAdmin: React.FC = () => {
  const { t } = useTranslation();
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
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isArchiveRefreshing, setIsArchiveRefreshing] = useState(false);
  const [archiveFilters, setArchiveFilters] = useState<ArchiveFilterState>(
    () => {
      const queryState = readArchiveFilterQueryState();
      const stored = normalizeArchiveFilterState(
        safeReadLocalJson<Partial<ArchiveFilterState>>(
          INSPECTION_ARCHIVE_FILTER_STORAGE_KEY,
          DEFAULT_ARCHIVE_FILTER_STATE
        )
      );
      return normalizeArchiveFilterState({
        ...stored,
        ...queryState.filters,
      });
    }
  );
  const [archiveViews, setArchiveViews] = useState<ArchiveViewPreset[]>(() => {
    const storedViews = safeReadLocalJson<ArchiveViewPreset[]>(
      INSPECTION_ARCHIVE_VIEWS_STORAGE_KEY,
      []
    );
    return storedViews
      .filter(
        item =>
          item &&
          typeof item.id === 'string' &&
          typeof item.name === 'string' &&
          item.name.trim().length > 0
      )
      .slice(0, MAX_ARCHIVE_VIEWS)
      .map(item => ({
        id: item.id,
        name: item.name,
        searchText: typeof item.searchText === 'string' ? item.searchText : '',
        filters: normalizeArchiveFilterState(item.filters),
        createdAt:
          typeof item.createdAt === 'string'
            ? item.createdAt
            : new Date().toISOString(),
        updatedAt:
          typeof item.updatedAt === 'string'
            ? item.updatedAt
            : new Date().toISOString(),
      }));
  });
  const [archiveViewName, setArchiveViewName] = useState('');
  const [activeArchiveViewId, setActiveArchiveViewId] = useState('');
  const [selectedArchiveIds, setSelectedArchiveIds] = useState<string[]>([]);
  const [expandedArchiveIds, setExpandedArchiveIds] = useState<string[]>([]);
  const [archiveActionLogs, setArchiveActionLogs] = useState<
    ArchiveActionLog[]
  >(() => {
    const logs = safeReadLocalJson<ArchiveActionLog[]>(
      INSPECTION_ARCHIVE_ACTION_LOG_STORAGE_KEY,
      []
    );
    return logs
      .filter(item => item && typeof item.id === 'string')
      .slice(0, MAX_ARCHIVE_ACTION_LOGS);
  });
  const [lastArchiveRefreshAt, setLastArchiveRefreshAt] = useState<
    string | null
  >(null);
  const [detailArchiveId, setDetailArchiveId] = useState('');
  const [lastDeletedArchive, setLastDeletedArchive] =
    useState<InspectionArchive | null>(null);
  const archiveSearchInputRef = useRef<InputRef>(null);

  const [searchText, setSearchText] = useState(
    () => readArchiveFilterQueryState().searchText
  );
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [checkOutDate, setCheckOutDate] = useState(
    dayjs().format('YYYY-MM-DD')
  );
  const [isOneOffOpen, setIsOneOffOpen] = useState(false);
  const [oneOffCustomerName, setOneOffCustomerName] = useState('');
  const [oneOffName, setOneOffName] = useState('');
  const [oneOffAddress, setOneOffAddress] = useState('');
  const [oneOffNotes, setOneOffNotes] = useState('');
  const [oneOffNotesZh, setOneOffNotesZh] = useState('');
  const [oneOffCheckOutDate, setOneOffCheckOutDate] = useState(
    dayjs().format('YYYY-MM-DD')
  );
  const [oneOffCleaningType, setOneOffCleaningType] =
    useState<OneOffCleaningType>();
  const [oneOffPropertyType, setOneOffPropertyType] =
    useState<OneOffPropertyType>();
  const [oneOffSectionIds, setOneOffSectionIds] = useState<string[]>(() => {
    const preset = buildOneOffSectionPreset(undefined, undefined);
    return preset;
  });
  const [oneOffChecklists, setOneOffChecklists] = useState<
    Record<string, ChecklistTemplateDraftItem[]>
  >(() =>
    buildOneOffChecklistDraftMap(buildOneOffSectionPreset(undefined, undefined))
  );
  const [oneOffEmployeeIds, setOneOffEmployeeIds] = useState<string[]>([]);
  const [oneOffSelectedBundleId, setOneOffSelectedBundleId] =
    useState<OneOffSectionBundleId>();
  const [oneOffDraftHistory, setOneOffDraftHistory] = useState<
    OneOffDraftSnapshot[]
  >(() =>
    safeReadLocalJson<OneOffDraftSnapshot[]>(
      ONE_OFF_DRAFT_HISTORY_STORAGE_KEY,
      []
    )
  );
  const [oneOffHistoryCloneId, setOneOffHistoryCloneId] = useState<string>();
  const [oneOffCustomerMemoryMap, setOneOffCustomerMemoryMap] = useState<
    Record<string, OneOffCustomerMemory>
  >(() =>
    safeReadLocalJson<Record<string, OneOffCustomerMemory>>(
      ONE_OFF_CUSTOMER_MEMORY_STORAGE_KEY,
      {}
    )
  );
  const [oneOffRecommendation, setOneOffRecommendation] =
    useState<OneOffRecommendationResponse | null>(null);
  const [oneOffRecommendationLoading, setOneOffRecommendationLoading] =
    useState(false);
  const [oneOffPreviewOpen, setOneOffPreviewOpen] = useState(true);
  const [oneOffOptionalSectionToAdd, setOneOffOptionalSectionToAdd] = useState<
    string | undefined
  >(undefined);
  const [oneOffDragSectionIndex, setOneOffDragSectionIndex] = useState<
    number | null
  >(null);
  const [oneOffDragOverSectionIndex, setOneOffDragOverSectionIndex] = useState<
    number | null
  >(null);
  const oneOffDragSectionIndexRef = useRef<number | null>(null);
  const oneOffAutoAppliedMemoryKeyRef = useRef('');
  const oneOffPreviewTelemetrySentRef = useRef(false);
  const oneOffModalOpenedAtRef = useRef<number>(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEmployeesOpen, setIsEmployeesOpen] = useState(false);

  // Employee Management
  const [employees, setEmployees] = useState<Employee[]>([]);
  const pendingTemplateSaveRef = useRef<PropertyTemplate[] | null>(null);
  const isTemplateSaveRunningRef = useRef(false);

  const appendArchiveActionLog = React.useCallback(
    (type: string, detail: string) => {
      setArchiveActionLogs(prev => {
        const next: ArchiveActionLog[] = [
          {
            id: generateId(),
            at: new Date().toISOString(),
            type,
            detail,
          },
          ...prev,
        ].slice(0, MAX_ARCHIVE_ACTION_LOGS);
        return next;
      });
    },
    []
  );

  const checkCloudConnectivity = React.useCallback(
    async (showToast = false): Promise<boolean> => {
      if (!supabaseConfigured) {
        setSupabaseStatus('local');
        setSupabaseStatusMessage(
          t('sparkery.inspectionAdmin.messages.supabaseEnvMissing', {
            defaultValue: 'Supabase environment variables are missing.',
          })
        );
        setLastCloudWriteAt(getInspectionLastCloudWriteAt());
        if (showToast) {
          messageApi.warning(
            t('sparkery.inspectionAdmin.messages.supabaseNotConfigured', {
              defaultValue:
                'Supabase is not configured. Running in local cache mode.',
            })
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
          t('sparkery.inspectionAdmin.messages.cloudReachableWithBucket', {
            defaultValue:
              'Cloud database is reachable{{hostPart}} | bucket: {{bucket}}',
            hostPart: host ? ` (${host})` : '',
            bucket: storageBucket,
          })
        );
        setLastCloudWriteAt(getInspectionLastCloudWriteAt());
        if (showToast) {
          messageApi.success(
            t('sparkery.inspectionAdmin.messages.supabaseConnectionVerified', {
              defaultValue: 'Supabase connection verified',
            })
          );
        }
        return true;
      }

      setSupabaseStatus('unreachable');
      const reason =
        status.message ||
        t('sparkery.inspectionAdmin.messages.unableReachSupabase', {
          defaultValue: 'Unable to reach Supabase',
        });
      setSupabaseStatusMessage(reason);
      if (showToast) {
        messageApi.error(
          t('sparkery.inspectionAdmin.messages.supabaseUnreachable', {
            defaultValue: 'Supabase is unreachable: {{reason}}',
            reason,
          })
        );
      }
      return false;
    },
    [messageApi, storageBucket, supabaseConfigured, t]
  );

  React.useEffect(() => {
    let cancelled = false;

    const loadInitialData = async () => {
      setIsInitialLoading(true);
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
        setLastArchiveRefreshAt(new Date().toISOString());
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
          t('sparkery.inspectionAdmin.messages.someCloudDataFailed', {
            defaultValue:
              'Some cloud data failed to load. Please verify Supabase tables and RLS policies.',
          })
        );
      }

      if (!cancelled) {
        setIsInitialLoading(false);
      }
    };

    loadInitialData();
    return () => {
      cancelled = true;
    };
  }, [messageApi, t]);

  React.useEffect(() => {
    checkCloudConnectivity(false);
  }, [checkCloudConnectivity]);

  const handleManualRefreshArchives = React.useCallback(async () => {
    setIsArchiveRefreshing(true);
    try {
      const latest = await loadAllInspections();
      setArchives(latest as InspectionArchive[]);
      const refreshedAt = new Date().toISOString();
      setLastArchiveRefreshAt(refreshedAt);
      appendArchiveActionLog(
        'refresh.success',
        `Archive refreshed (${latest.length} records)`
      );
      messageApi.success(
        t('sparkery.inspectionAdmin.messages.archivesRefreshed', {
          defaultValue: 'Inspection archive refreshed.',
        })
      );
    } catch {
      appendArchiveActionLog(
        'refresh.failed',
        'Archive refresh failed due to network or permission issue.'
      );
      messageApi.warning(
        t('sparkery.inspectionAdmin.messages.archiveRefreshFailed', {
          defaultValue:
            'Unable to refresh inspection archive right now. Please retry.',
        })
      );
    } finally {
      setIsArchiveRefreshing(false);
    }
  }, [appendArchiveActionLog, messageApi, t]);

  React.useEffect(() => {
    let disposed = false;

    const refreshArchives = async () => {
      try {
        const latest = await loadAllInspections();
        if (!disposed) {
          setArchives(latest as InspectionArchive[]);
          setLastArchiveRefreshAt(new Date().toISOString());
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

  React.useEffect(() => {
    safeWriteLocalJson(INSPECTION_ARCHIVE_FILTER_STORAGE_KEY, archiveFilters);
  }, [archiveFilters]);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const currentUrl = new URL(window.location.href);
    const params = currentUrl.searchParams;
    const setParam = (key: string, value: string | null) => {
      const fullKey = `${INSPECTION_ARCHIVE_QUERY_PREFIX}${key}`;
      if (!value) {
        params.delete(fullKey);
      } else {
        params.set(fullKey, value);
      }
    };

    setParam('search', searchText.trim() || null);
    setParam(
      'status',
      archiveFilters.status !== DEFAULT_ARCHIVE_FILTER_STATE.status
        ? archiveFilters.status
        : null
    );
    setParam(
      'sort',
      archiveFilters.sortMode !== DEFAULT_ARCHIVE_FILTER_STATE.sortMode
        ? archiveFilters.sortMode
        : null
    );
    setParam('from', archiveFilters.dateFrom || null);
    setParam('to', archiveFilters.dateTo || null);
    setParam('oneoff', archiveFilters.oneOffOnly ? '1' : null);
    setParam(
      'density',
      archiveFilters.density !== DEFAULT_ARCHIVE_FILTER_STATE.density
        ? archiveFilters.density
        : null
    );
    setParam(
      'quick',
      archiveFilters.quickChip !== DEFAULT_ARCHIVE_FILTER_STATE.quickChip
        ? archiveFilters.quickChip
        : null
    );
    setParam(
      'layout',
      archiveFilters.layout !== DEFAULT_ARCHIVE_FILTER_STATE.layout
        ? archiveFilters.layout
        : null
    );

    const nextSearch = params.toString();
    const currentSearch = window.location.search.replace(/^\?/, '');
    if (nextSearch !== currentSearch) {
      const nextUrl = `${currentUrl.pathname}${
        nextSearch ? `?${nextSearch}` : ''
      }${currentUrl.hash}`;
      window.history.replaceState({}, '', nextUrl);
    }
  }, [archiveFilters, searchText]);

  React.useEffect(() => {
    safeWriteLocalJson(INSPECTION_ARCHIVE_VIEWS_STORAGE_KEY, archiveViews);
  }, [archiveViews]);

  React.useEffect(() => {
    safeWriteLocalJson(
      INSPECTION_ARCHIVE_ACTION_LOG_STORAGE_KEY,
      archiveActionLogs.slice(0, MAX_ARCHIVE_ACTION_LOGS)
    );
  }, [archiveActionLogs]);

  React.useEffect(() => {
    const archiveIds = new Set(archives.map(item => item.id));
    setSelectedArchiveIds(prev => prev.filter(id => archiveIds.has(id)));
    setExpandedArchiveIds(prev => prev.filter(id => archiveIds.has(id)));
    setDetailArchiveId(prev => (prev && !archiveIds.has(prev) ? '' : prev));
  }, [archives]);

  /** Save employees to Supabase */
  const saveEmployeesToStorage = async (emps: Employee[]) => {
    setEmployees(emps);
    try {
      await saveEmployees(emps);
      setLastCloudWriteAt(getInspectionLastCloudWriteAt());
    } catch {
      messageApi.error(
        t('sparkery.inspectionAdmin.messages.saveEmployeesFailed', {
          defaultValue: 'Failed to save employees. Please try again.',
        })
      );
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
            error instanceof Error
              ? error.message
              : t('sparkery.inspectionAdmin.messages.unknownCloudError', {
                  defaultValue: 'unknown cloud error',
                });
          messageApi.error(
            t('sparkery.inspectionAdmin.messages.propertyTemplateSaveFailed', {
              defaultValue: 'Property template save failed: {{reason}}',
              reason,
            })
          );

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
  }, [messageApi, supabaseConfigured, t]);

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
      setSupabaseStatusMessage(
        t('sparkery.inspectionAdmin.messages.cloudTemplatesRefreshed', {
          defaultValue: 'Cloud templates were refreshed successfully.',
        })
      );
      setLastCloudWriteAt(getInspectionLastCloudWriteAt());
      messageApi.success(
        t('sparkery.inspectionAdmin.messages.propertyTemplatesRefreshed', {
          defaultValue: 'Property templates refreshed from cloud',
        })
      );
    } catch (error) {
      setSupabaseStatus('unreachable');
      const reason =
        error instanceof Error
          ? error.message
          : t('sparkery.inspectionAdmin.messages.unknownCloudError', {
              defaultValue: 'unknown cloud error',
            });
      setSupabaseStatusMessage(reason);
      messageApi.error(
        t('sparkery.inspectionAdmin.messages.cloudTemplateRefreshFailed', {
          defaultValue: 'Cloud template refresh failed: {{reason}}',
          reason,
        })
      );
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
        t('sparkery.inspectionAdmin.messages.legacyMigrationSummary', {
          defaultValue:
            'Legacy image migration completed. Templates: {{templatesUpdated}}/{{templatesProcessed}}, inspections: {{inspectionsUpdated}}/{{inspectionsProcessed}}.',
          templatesUpdated: result.templatesUpdated,
          templatesProcessed: result.templatesProcessed,
          inspectionsUpdated: result.inspectionsUpdated,
          inspectionsProcessed: result.inspectionsProcessed,
        })
      );

      messageApi.success(
        t('sparkery.inspectionAdmin.messages.migrationCompleted', {
          defaultValue: 'Migration completed. Uploaded {{count}} assets.',
          count: result.uploadedAssets,
        })
      );
      if (result.failedInspections > 0) {
        messageApi.warning(
          t('sparkery.inspectionAdmin.messages.migrationFailedInspections', {
            defaultValue:
              '{{count}} inspection records failed during migration.',
            count: result.failedInspections,
          })
        );
      }
    } catch (error) {
      const reason =
        error instanceof Error
          ? error.message
          : t('sparkery.inspectionAdmin.messages.unknownCloudError', {
              defaultValue: 'unknown cloud error',
            });
      setSupabaseStatus('unreachable');
      setSupabaseStatusMessage(reason);
      messageApi.error(
        t('sparkery.inspectionAdmin.messages.legacyMigrationFailed', {
          defaultValue: 'Legacy image migration failed: {{reason}}',
          reason,
        })
      );
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

  const actorRole = React.useMemo(
    () => getSparkeryTelemetryActorRole() || '',
    []
  );
  const sessionId = React.useMemo(
    () => getSparkeryTelemetrySessionId() || '',
    []
  );
  const hasAdvancedOneOffPermission = React.useMemo(() => {
    const normalizedRole = actorRole.trim().toLowerCase();
    if (!normalizedRole) {
      return true;
    }
    return ONE_OFF_ADVANCED_ROLE_SET.has(normalizedRole);
  }, [actorRole]);
  const oneOffScenarioKey = React.useMemo(
    () => buildOneOffScenarioTypeKey(oneOffCleaningType, oneOffPropertyType),
    [oneOffCleaningType, oneOffPropertyType]
  );
  const oneOffQualityReport = React.useMemo(
    () => evaluateOneOffQuality(oneOffSectionIds, oneOffChecklists),
    [oneOffSectionIds, oneOffChecklists]
  );
  const oneOffGovernanceReport = React.useMemo(
    () =>
      evaluateOneOffGovernance(
        oneOffSectionIds,
        oneOffChecklists,
        DEFAULT_ONE_OFF_GOVERNANCE_POLICY
      ),
    [oneOffSectionIds, oneOffChecklists]
  );

  const oneOffDriftInsight = React.useMemo(() => {
    const submittedOneOff = archives.filter(archive => {
      const anyArchive = archive as any;
      return (
        archive.status === 'submitted' &&
        anyArchive?.oneOffMeta?.mode === 'one_off' &&
        anyArchive?.oneOffMeta?.templateSnapshot
      );
    });
    if (submittedOneOff.length === 0) {
      return {
        sampleCount: 0,
        averageScore: 0,
      };
    }

    let totalScore = 0;
    submittedOneOff.forEach(archive => {
      const anyArchive = archive as any;
      const snapshot = normalizeOneOffTemplateSnapshot(
        anyArchive.oneOffMeta.templateSnapshot
      );
      const drift = calculateOneOffTemplateDrift(
        snapshot,
        (anyArchive.sections || []) as any[]
      );
      totalScore += drift.driftScore;
    });

    return {
      sampleCount: submittedOneOff.length,
      averageScore:
        submittedOneOff.length > 0 ? totalScore / submittedOneOff.length : 0,
    };
  }, [archives]);

  const oneOffCustomerMemoryKey = React.useMemo(() => {
    const normalized = oneOffCustomerName
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
    return normalized;
  }, [oneOffCustomerName]);
  const oneOffMatchedMemory = React.useMemo(() => {
    if (!oneOffCustomerMemoryKey) return null;
    return oneOffCustomerMemoryMap[oneOffCustomerMemoryKey] || null;
  }, [oneOffCustomerMemoryKey, oneOffCustomerMemoryMap]);

  const trackOneOffEvent = React.useCallback(
    (
      name:
        | 'inspection.one_off.modal.opened'
        | 'inspection.one_off.recommendation.loaded'
        | 'inspection.one_off.template.regenerated'
        | 'inspection.one_off.preview.rendered'
        | 'inspection.one_off.draft.restored'
        | 'inspection.one_off.create.started'
        | 'inspection.one_off.create.succeeded'
        | 'inspection.one_off.create.failed'
        | 'inspection.one_off.link.open.failed',
      data: Record<string, unknown> = {},
      options?: {
        success?: boolean;
        durationMs?: number;
      }
    ) => {
      trackSparkeryEvent(name, {
        ...(typeof options?.success === 'boolean'
          ? { success: options.success }
          : {}),
        ...(typeof options?.durationMs === 'number'
          ? { durationMs: options.durationMs }
          : {}),
        data: {
          ...data,
          ...(actorRole ? { actorRole } : {}),
          ...(sessionId ? { sessionId } : {}),
        },
      });
    },
    [actorRole, sessionId]
  );

  const persistInspectionAndOpenLink = async (
    newInspection: any,
    options?: {
      oneOff?: boolean;
      scenarioKey?: string;
    }
  ): Promise<{ source: 'supabase' | 'local'; linkOpened: boolean }> => {
    setArchives(prev => [
      newInspection,
      ...prev.filter(item => item.id !== newInspection.id),
    ]);

    const syncResult = await submitInspection(newInspection);
    const url = buildShareUrl(newInspection);
    navigator.clipboard.writeText(url);
    const linkWindow = window.open(url, '_blank');
    const linkOpened = Boolean(linkWindow);
    if (!linkOpened && options?.oneOff) {
      trackOneOffEvent('inspection.one_off.link.open.failed', {
        scenarioKey: options.scenarioKey || 'unknown::unknown',
        inspectionId: newInspection.id,
      });
    }

    if (syncResult.source === 'supabase') {
      setLastCloudWriteAt(getInspectionLastCloudWriteAt());
      messageApi.success(
        t('sparkery.inspectionAdmin.messages.linkCopiedAndSynced', {
          defaultValue: 'Inspection link copied and synced to cloud',
        })
      );
    } else {
      messageApi.warning(
        t('sparkery.inspectionAdmin.messages.linkCopiedCloudSyncFailed', {
          defaultValue:
            'Link copied, but cloud sync failed. Data is currently local only.',
        })
      );
    }

    return {
      source: syncResult.source,
      linkOpened,
    };
  };

  const createOneOffDraftSnapshot = React.useCallback(
    (draftId?: string): OneOffDraftSnapshot => ({
      id: draftId || `one-off-${generateId()}`,
      name: oneOffName.trim(),
      customerName: oneOffCustomerName.trim(),
      address: oneOffAddress.trim(),
      notes: oneOffNotes,
      notesZh: oneOffNotesZh,
      checkOutDate: oneOffCheckOutDate,
      ...(oneOffCleaningType ? { cleaningType: oneOffCleaningType } : {}),
      ...(oneOffPropertyType ? { propertyType: oneOffPropertyType } : {}),
      sectionIds: [...oneOffSectionIds],
      checklists: { ...oneOffChecklists },
      employeeIds: [...oneOffEmployeeIds],
      updatedAt: new Date().toISOString(),
    }),
    [
      oneOffAddress,
      oneOffCheckOutDate,
      oneOffChecklists,
      oneOffCleaningType,
      oneOffCustomerName,
      oneOffEmployeeIds,
      oneOffName,
      oneOffNotes,
      oneOffNotesZh,
      oneOffPropertyType,
      oneOffSectionIds,
    ]
  );

  const applyOneOffDraftSnapshot = React.useCallback(
    (snapshot: OneOffDraftSnapshot, source: 'recovery' | 'history') => {
      setOneOffName(snapshot.name || '');
      setOneOffCustomerName(snapshot.customerName || '');
      setOneOffAddress(snapshot.address || '');
      setOneOffNotes(snapshot.notes || '');
      setOneOffNotesZh(snapshot.notesZh || '');
      setOneOffCheckOutDate(
        snapshot.checkOutDate || dayjs().format('YYYY-MM-DD')
      );
      setOneOffCleaningType(snapshot.cleaningType);
      setOneOffPropertyType(snapshot.propertyType);
      setOneOffSectionIds(snapshot.sectionIds || []);
      setOneOffChecklists(snapshot.checklists || {});
      setOneOffEmployeeIds(snapshot.employeeIds || []);
      setOneOffOptionalSectionToAdd(undefined);
      oneOffDragSectionIndexRef.current = null;
      setOneOffDragSectionIndex(null);
      setOneOffDragOverSectionIndex(null);

      if (source === 'recovery') {
        trackOneOffEvent('inspection.one_off.draft.restored', {
          scenarioKey: buildOneOffScenarioTypeKey(
            snapshot.cleaningType,
            snapshot.propertyType
          ),
          sectionCount: snapshot.sectionIds.length,
          checklistCount: Object.values(snapshot.checklists || {}).reduce(
            (sum, items) => sum + items.length,
            0
          ),
        });
      }
    },
    [trackOneOffEvent]
  );

  const saveOneOffDraftHistory = React.useCallback(
    (snapshot: OneOffDraftSnapshot) => {
      setOneOffDraftHistory(prev => {
        const deduped = prev.filter(item => item.id !== snapshot.id);
        const next = [snapshot, ...deduped].slice(
          0,
          ONE_OFF_MAX_SESSION_DRAFTS
        );
        safeWriteLocalJson(ONE_OFF_DRAFT_HISTORY_STORAGE_KEY, next);
        return next;
      });
    },
    []
  );

  const rememberCustomerPreference = React.useCallback(() => {
    if (!oneOffCustomerMemoryKey) return;
    const record: OneOffCustomerMemory = {
      ...(oneOffCleaningType ? { cleaningType: oneOffCleaningType } : {}),
      ...(oneOffPropertyType ? { propertyType: oneOffPropertyType } : {}),
      sectionIds: [...oneOffSectionIds],
      employeeIds: [...oneOffEmployeeIds],
      updatedAt: new Date().toISOString(),
    };

    setOneOffCustomerMemoryMap(prev => {
      const next = { ...prev, [oneOffCustomerMemoryKey]: record };
      safeWriteLocalJson(ONE_OFF_CUSTOMER_MEMORY_STORAGE_KEY, next);
      return next;
    });
  }, [
    oneOffCleaningType,
    oneOffCustomerMemoryKey,
    oneOffEmployeeIds,
    oneOffPropertyType,
    oneOffSectionIds,
  ]);

  const handleApplyCustomerMemory = React.useCallback(() => {
    if (!oneOffMatchedMemory) return;
    setOneOffCleaningType(oneOffMatchedMemory.cleaningType);
    setOneOffPropertyType(oneOffMatchedMemory.propertyType);
    setOneOffSectionIds(oneOffMatchedMemory.sectionIds);
    setOneOffChecklists(
      buildOneOffChecklistDraftMap(oneOffMatchedMemory.sectionIds || [])
    );
    setOneOffEmployeeIds(oneOffMatchedMemory.employeeIds || []);
    messageApi.success(
      t('sparkery.inspectionAdmin.messages.customerPreferenceApplied', {
        defaultValue: 'Saved one-off preference applied for this customer.',
      })
    );
  }, [messageApi, oneOffMatchedMemory, t]);

  const handleCloneHistoryDraft = React.useCallback(() => {
    const targetId = oneOffHistoryCloneId || oneOffDraftHistory[0]?.id;
    if (!targetId) return;
    const matched = oneOffDraftHistory.find(item => item.id === targetId);
    if (!matched) return;
    applyOneOffDraftSnapshot(
      {
        ...matched,
        id: `one-off-${generateId()}`,
        updatedAt: new Date().toISOString(),
      },
      'history'
    );
    messageApi.success(
      t('sparkery.inspectionAdmin.messages.oneOffDraftDuplicated', {
        defaultValue: 'One-off draft duplicated. Continue editing.',
      })
    );
  }, [
    applyOneOffDraftSnapshot,
    messageApi,
    oneOffDraftHistory,
    oneOffHistoryCloneId,
    t,
  ]);

  const regenerateOneOffTemplate = React.useCallback(
    (cleaningType?: OneOffCleaningType, propertyType?: OneOffPropertyType) => {
      const nextSectionIds = buildOneOffSectionPreset(
        cleaningType,
        propertyType
      );
      setOneOffSectionIds(nextSectionIds);
      setOneOffChecklists(buildOneOffChecklistDraftMap(nextSectionIds));
      trackOneOffEvent('inspection.one_off.template.regenerated', {
        scenarioKey: buildOneOffScenarioTypeKey(cleaningType, propertyType),
        sectionCount: nextSectionIds.length,
      });
    },
    [trackOneOffEvent]
  );

  const resetOneOffDraft = React.useCallback(() => {
    setOneOffName('');
    setOneOffCustomerName('');
    setOneOffAddress('');
    setOneOffNotes('');
    setOneOffNotesZh('');
    setOneOffCheckOutDate(checkOutDate);
    setOneOffCleaningType(undefined);
    setOneOffPropertyType(undefined);
    const preset = buildOneOffSectionPreset(undefined, undefined);
    setOneOffSectionIds(preset);
    setOneOffChecklists(buildOneOffChecklistDraftMap(preset));
    setOneOffEmployeeIds(selectedEmployeeIds);
    setOneOffOptionalSectionToAdd(undefined);
    setOneOffSelectedBundleId(undefined);
    oneOffDragSectionIndexRef.current = null;
    oneOffAutoAppliedMemoryKeyRef.current = '';
    setOneOffDragSectionIndex(null);
    setOneOffDragOverSectionIndex(null);
    setOneOffPreviewOpen(true);
    oneOffPreviewTelemetrySentRef.current = false;
  }, [checkOutDate, selectedEmployeeIds]);

  const handleOpenOneOffGenerator = React.useCallback(() => {
    resetOneOffDraft();
    setIsOneOffOpen(true);
    oneOffModalOpenedAtRef.current = Date.now();
    trackOneOffEvent('inspection.one_off.modal.opened', {
      selectedEmployeeCount: selectedEmployeeIds.length,
    });

    const cachedDraft = safeReadLocalJson<OneOffDraftSnapshot | null>(
      ONE_OFF_DRAFT_STORAGE_KEY,
      null
    );
    if (
      cachedDraft &&
      cachedDraft.updatedAt &&
      Date.now() - new Date(cachedDraft.updatedAt).getTime() <=
        DEFAULT_ONE_OFF_GOVERNANCE_POLICY.draftTtlMs
    ) {
      Modal.confirm({
        title: t('sparkery.inspectionAdmin.oneOffModal.recoverDraftTitle', {
          defaultValue: 'Recover unsaved one-off draft?',
        }),
        content: t('sparkery.inspectionAdmin.oneOffModal.recoverDraftContent', {
          defaultValue:
            'A recent one-off draft was found. Do you want to restore it?',
        }),
        okText: t('sparkery.inspectionAdmin.actions.restoreDraft', {
          defaultValue: 'Restore',
        }),
        cancelText: t('sparkery.inspectionAdmin.actions.discardDraft', {
          defaultValue: 'Discard',
        }),
        onOk: () => applyOneOffDraftSnapshot(cachedDraft, 'recovery'),
        onCancel: () =>
          safeWriteLocalJson(ONE_OFF_DRAFT_STORAGE_KEY, {
            ...cachedDraft,
            updatedAt: new Date(0).toISOString(),
          }),
      });
    }
  }, [
    applyOneOffDraftSnapshot,
    resetOneOffDraft,
    selectedEmployeeIds.length,
    t,
    trackOneOffEvent,
  ]);

  React.useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const withMeta = event.ctrlKey || event.metaKey;
      if (!withMeta || !event.shiftKey) {
        return;
      }
      const shortcutKey = event.key.toLowerCase();
      if (shortcutKey === 'n') {
        event.preventDefault();
        handleOpenOneOffGenerator();
        return;
      }
      if (shortcutKey === 'r') {
        event.preventDefault();
        void handleManualRefreshArchives();
        return;
      }
      if (shortcutKey === 'f') {
        event.preventDefault();
        archiveSearchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => {
      window.removeEventListener('keydown', handleShortcut);
    };
  }, [handleManualRefreshArchives, handleOpenOneOffGenerator]);

  const handleApplyOneOffBundle = (bundleId: OneOffSectionBundleId) => {
    const nextSections = applySectionBundleToSectionIds(
      oneOffSectionIds,
      bundleId
    );
    const nextChecklists = { ...oneOffChecklists };
    nextSections.forEach(sectionId => {
      if (!nextChecklists[sectionId]) {
        nextChecklists[sectionId] =
          buildOneOffChecklistDraftForSection(sectionId);
      }
    });
    setOneOffSectionIds(nextSections);
    setOneOffChecklists(nextChecklists);
    setOneOffSelectedBundleId(bundleId);
  };

  const handleRemoveOneOffBundle = (bundleId: OneOffSectionBundleId) => {
    const nextSections = removeSectionBundleFromSectionIds(
      oneOffSectionIds,
      bundleId
    );
    setOneOffSectionIds(nextSections);
    setOneOffChecklists(prev => {
      const next: Record<string, ChecklistTemplateDraftItem[]> = {};
      nextSections.forEach(sectionId => {
        next[sectionId] =
          prev[sectionId] || buildOneOffChecklistDraftForSection(sectionId);
      });
      return next;
    });
  };

  const handleOneOffAddSection = (sectionTypeId: string) => {
    if (!sectionTypeId) return;
    setOneOffSectionIds(prev => {
      const nextSectionId = buildNextOneOffSectionId(sectionTypeId, prev);
      const nextSectionDefaults =
        buildOneOffChecklistDraftForSection(nextSectionId);
      const nextChecklist =
        nextSectionDefaults.length > 0
          ? nextSectionDefaults
          : buildOneOffChecklistDraftForSection(sectionTypeId);
      const next = [...prev, nextSectionId];
      setOneOffChecklists(current => ({
        ...current,
        [nextSectionId]: nextChecklist,
      }));
      return next;
    });
    setOneOffOptionalSectionToAdd(undefined);
  };

  const handleOneOffRemoveSection = (sectionId: string) => {
    const familyId = getSectionFamilyId(sectionId);
    if (
      !hasAdvancedOneOffPermission &&
      (familyId === 'kitchen' ||
        familyId === 'bathroom' ||
        familyId === 'living-room')
    ) {
      messageApi.warning(
        t(
          'sparkery.inspectionAdmin.messages.permissionRequiredForCriticalSection',
          {
            defaultValue:
              'Only advanced roles can remove critical sections (kitchen/living room/bathroom).',
          }
        )
      );
      return;
    }

    setOneOffSectionIds(prev => prev.filter(item => item !== sectionId));
    setOneOffChecklists(prev => {
      const next = { ...prev };
      delete next[sectionId];
      return next;
    });
  };

  const handleOneOffSectionReorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) {
      return;
    }
    setOneOffSectionIds(prev => reorderList(prev, fromIndex, toIndex));
  };

  const handleOneOffSectionMove = (index: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= oneOffSectionIds.length) {
      return;
    }
    handleOneOffSectionReorder(index, nextIndex);
  };

  const handleOneOffChecklistUpdate = (
    sectionId: string,
    items: ChecklistTemplateDraftItem[]
  ) => {
    if (
      items.length >
      DEFAULT_ONE_OFF_GOVERNANCE_POLICY.maxChecklistItemsPerSection
    ) {
      messageApi.warning(
        t('sparkery.inspectionAdmin.messages.oneOffChecklistCapExceeded', {
          defaultValue:
            'Checklist item cap reached for this section ({{count}} max).',
          count: DEFAULT_ONE_OFF_GOVERNANCE_POLICY.maxChecklistItemsPerSection,
        })
      );
      return;
    }
    setOneOffChecklists(prev => ({
      ...prev,
      [sectionId]: items,
    }));
  };

  const handleOneOffChecklistBulkAction = (
    sectionId: string,
    action: 'mark_all_photo' | 'clear_all_photo' | 'delete_empty' | 'sort_label'
  ) => {
    const items = oneOffChecklists[sectionId] || [];
    let next = [...items];

    if (action === 'mark_all_photo') {
      next = next.map(item => ({ ...item, requiredPhoto: true }));
    } else if (action === 'clear_all_photo') {
      next = next.map(item => ({ ...item, requiredPhoto: false }));
    } else if (action === 'delete_empty') {
      next = next.filter(
        item => (item.label || '').trim() || (item.labelEn || '').trim()
      );
    } else if (action === 'sort_label') {
      next = next.sort((a, b) =>
        (a.label || a.labelEn || '').localeCompare(b.label || b.labelEn || '')
      );
    }

    handleOneOffChecklistUpdate(sectionId, next);
  };

  const handleCreateOneOffInspection = async () => {
    if (!oneOffCleaningType && !oneOffPropertyType) {
      messageApi.warning(
        t('sparkery.inspectionAdmin.messages.selectCleaningOrPropertyType', {
          defaultValue: 'Please select cleaning type or property type first.',
        })
      );
      return;
    }
    if (oneOffSectionIds.length === 0) {
      messageApi.warning(
        t('sparkery.inspectionAdmin.messages.oneOffSectionsRequired', {
          defaultValue: 'Please keep at least one inspection section.',
        })
      );
      return;
    }
    if (!oneOffQualityReport.valid) {
      messageApi.warning(
        oneOffQualityReport.issues[0]?.message ||
          'One-off quality check failed.'
      );
      return;
    }
    if (!oneOffGovernanceReport.valid) {
      messageApi.warning(
        oneOffGovernanceReport.issues[0] || 'One-off governance check failed.'
      );
      return;
    }

    const createStartedAt = Date.now();
    trackOneOffEvent('inspection.one_off.create.started', {
      scenarioKey: oneOffScenarioKey,
      sectionCount: oneOffSectionIds.length,
      checklistCount: oneOffQualityReport.totalChecklistItems,
      draftReadyLatencyMs: oneOffModalOpenedAtRef.current
        ? createStartedAt - oneOffModalOpenedAtRef.current
        : undefined,
    });

    const selectedEmployees = employees.filter(emp =>
      oneOffEmployeeIds.includes(emp.id)
    );
    const inspectionId = `insp-${generateId()}`;
    const displayName =
      oneOffName.trim() ||
      t('sparkery.inspectionAdmin.labels.oneOffTemplateDefaultName', {
        defaultValue: 'One-off Inspection',
      });
    const sections = buildInspectionSectionsFromTemplates(
      oneOffSectionIds,
      oneOffChecklists
    );
    const templateSnapshot = buildOneOffTemplateSnapshot(
      oneOffSectionIds,
      oneOffChecklists
    );

    const newInspection: any = {
      id: inspectionId,
      templateName: `${displayName} (One-off)`,
      propertyId: displayName,
      propertyAddress: oneOffAddress.trim(),
      propertyNotes: oneOffNotes || '',
      ...(oneOffNotesZh.trim() ? { propertyNotesZh: oneOffNotesZh } : {}),
      checkOutDate: oneOffCheckOutDate,
      submittedAt: '',
      status: 'pending',
      sections,
      checkIn: null,
      checkOut: null,
      damageReports: [],
      oneOffMeta: {
        mode: 'one_off',
        scenarioKey: oneOffScenarioKey,
        cleaningType: oneOffCleaningType || null,
        propertyType: oneOffPropertyType || null,
        customerName: oneOffCustomerName.trim() || null,
        templateSnapshot,
      },
    };
    if (selectedEmployees.length > 0) {
      newInspection.assignedEmployees = selectedEmployees;
      newInspection.assignedEmployee = selectedEmployees[0];
    }
    const propertyNoteImageCount = Array.isArray(
      newInspection.propertyNoteImages
    )
      ? newInspection.propertyNoteImages.length
      : 0;
    if (
      propertyNoteImageCount >
      DEFAULT_ONE_OFF_GOVERNANCE_POLICY.maxPropertyNoteImages
    ) {
      messageApi.error(
        t('sparkery.inspectionAdmin.messages.oneOffImageCapExceeded', {
          defaultValue:
            'One-off note image count exceeds cap ({{count}}/{{limit}}).',
          count: propertyNoteImageCount,
          limit: DEFAULT_ONE_OFF_GOVERNANCE_POLICY.maxPropertyNoteImages,
        })
      );
      return;
    }

    const payloadBytes = new TextEncoder().encode(
      JSON.stringify(newInspection)
    ).length;
    if (payloadBytes > DEFAULT_ONE_OFF_GOVERNANCE_POLICY.maxPayloadBytes) {
      messageApi.error(
        t('sparkery.inspectionAdmin.messages.oneOffPayloadTooLarge', {
          defaultValue:
            'Generated payload is too large ({{size}} bytes). Reduce sections/checklists and retry.',
          size: payloadBytes,
        })
      );
      return;
    }

    try {
      const result = await persistInspectionAndOpenLink(newInspection, {
        oneOff: true,
        scenarioKey: oneOffScenarioKey,
      });
      const historySnapshot = createOneOffDraftSnapshot();
      saveOneOffDraftHistory(historySnapshot);
      rememberCustomerPreference();
      safeWriteLocalJson(ONE_OFF_DRAFT_STORAGE_KEY, null);
      setIsOneOffOpen(false);
      trackOneOffEvent(
        'inspection.one_off.create.succeeded',
        {
          scenarioKey: oneOffScenarioKey,
          syncSource: result.source,
          linkOpened: result.linkOpened,
          averageHistoricalDriftScore: Number(
            oneOffDriftInsight.averageScore.toFixed(2)
          ),
        },
        {
          success: true,
          durationMs: Date.now() - createStartedAt,
        }
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown error';
      trackOneOffEvent(
        'inspection.one_off.create.failed',
        {
          scenarioKey: oneOffScenarioKey,
          errorReason: reason,
        },
        {
          success: false,
          durationMs: Date.now() - createStartedAt,
        }
      );
      messageApi.error(
        t('sparkery.inspectionAdmin.messages.oneOffCreateFailed', {
          defaultValue: 'One-off link creation failed: {{reason}}',
          reason,
        })
      );
    }
  };

  React.useEffect(() => {
    const now = Date.now();
    const nextHistory = oneOffDraftHistory.filter(item => {
      if (!item.updatedAt) return false;
      return (
        now - new Date(item.updatedAt).getTime() <=
        DEFAULT_ONE_OFF_GOVERNANCE_POLICY.draftTtlMs
      );
    });
    if (nextHistory.length !== oneOffDraftHistory.length) {
      setOneOffDraftHistory(nextHistory);
      safeWriteLocalJson(ONE_OFF_DRAFT_HISTORY_STORAGE_KEY, nextHistory);
    }

    const nextMemory: Record<string, OneOffCustomerMemory> = {};
    Object.entries(oneOffCustomerMemoryMap).forEach(([key, value]) => {
      if (
        value?.updatedAt &&
        now - new Date(value.updatedAt).getTime() <=
          DEFAULT_ONE_OFF_GOVERNANCE_POLICY.memoryTtlMs
      ) {
        nextMemory[key] = value;
      }
    });
    if (
      Object.keys(nextMemory).length !==
      Object.keys(oneOffCustomerMemoryMap).length
    ) {
      setOneOffCustomerMemoryMap(nextMemory);
      safeWriteLocalJson(ONE_OFF_CUSTOMER_MEMORY_STORAGE_KEY, nextMemory);
    }
  }, [oneOffCustomerMemoryMap, oneOffDraftHistory]);

  React.useEffect(() => {
    if (!isOneOffOpen) {
      return;
    }
    const draft = createOneOffDraftSnapshot();
    safeWriteLocalJson(ONE_OFF_DRAFT_STORAGE_KEY, draft);
  }, [
    createOneOffDraftSnapshot,
    isOneOffOpen,
    oneOffAddress,
    oneOffCheckOutDate,
    oneOffChecklists,
    oneOffCleaningType,
    oneOffCustomerName,
    oneOffEmployeeIds,
    oneOffName,
    oneOffNotes,
    oneOffNotesZh,
    oneOffPropertyType,
    oneOffSectionIds,
  ]);

  React.useEffect(() => {
    if (!isOneOffOpen || !oneOffMatchedMemory || !oneOffCustomerMemoryKey) {
      return;
    }
    if (oneOffAutoAppliedMemoryKeyRef.current === oneOffCustomerMemoryKey) {
      return;
    }

    const defaultSections = buildOneOffSectionPreset(undefined, undefined);
    const isBaselineDraft =
      !oneOffCleaningType &&
      !oneOffPropertyType &&
      oneOffSectionIds.join('|') === defaultSections.join('|');

    if (!isBaselineDraft) {
      return;
    }

    oneOffAutoAppliedMemoryKeyRef.current = oneOffCustomerMemoryKey;
    setOneOffCleaningType(oneOffMatchedMemory.cleaningType);
    setOneOffPropertyType(oneOffMatchedMemory.propertyType);
    setOneOffSectionIds(oneOffMatchedMemory.sectionIds);
    setOneOffChecklists(
      buildOneOffChecklistDraftMap(oneOffMatchedMemory.sectionIds)
    );
    setOneOffEmployeeIds(oneOffMatchedMemory.employeeIds || []);
    messageApi.info(
      t('sparkery.inspectionAdmin.messages.customerPreferenceAutoApplied', {
        defaultValue: 'Loaded saved one-off defaults for this customer.',
      })
    );
  }, [
    isOneOffOpen,
    messageApi,
    oneOffCleaningType,
    oneOffCustomerMemoryKey,
    oneOffMatchedMemory,
    oneOffPropertyType,
    oneOffSectionIds,
    t,
  ]);

  React.useEffect(() => {
    if (!isOneOffOpen) {
      return;
    }
    let cancelled = false;
    setOneOffRecommendationLoading(true);
    const recommendationRequest = {
      ...(oneOffCleaningType ? { cleaningType: oneOffCleaningType } : {}),
      ...(oneOffPropertyType ? { propertyType: oneOffPropertyType } : {}),
      ...(oneOffCustomerName ? { customerName: oneOffCustomerName } : {}),
      currentSectionIds: oneOffSectionIds,
      ...(oneOffDriftInsight.sampleCount > 0
        ? { recentDriftScore: oneOffDriftInsight.averageScore }
        : {}),
    };
    void fetchOneOffTemplateRecommendations({
      ...recommendationRequest,
    })
      .then(result => {
        if (cancelled) return;
        setOneOffRecommendation(result);
        if (result.recommendedBundleIds[0]) {
          setOneOffSelectedBundleId(
            result.recommendedBundleIds[0] as OneOffSectionBundleId
          );
        }
        trackOneOffEvent('inspection.one_off.recommendation.loaded', {
          scenarioKey: result.scenarioKey,
          source: result.source,
          recommendedSectionCount: result.recommendedSectionIds.length,
          recommendedBundleCount: result.recommendedBundleIds.length,
        });
      })
      .finally(() => {
        if (!cancelled) {
          setOneOffRecommendationLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    isOneOffOpen,
    oneOffCleaningType,
    oneOffCustomerName,
    oneOffDriftInsight.averageScore,
    oneOffDriftInsight.sampleCount,
    oneOffPropertyType,
    oneOffSectionIds,
    trackOneOffEvent,
  ]);

  React.useEffect(() => {
    if (
      !isOneOffOpen ||
      !oneOffPreviewOpen ||
      oneOffPreviewTelemetrySentRef.current
    ) {
      return;
    }
    oneOffPreviewTelemetrySentRef.current = true;
    trackOneOffEvent('inspection.one_off.preview.rendered', {
      scenarioKey: oneOffScenarioKey,
      sectionCount: oneOffSectionIds.length,
      checklistCount: oneOffQualityReport.totalChecklistItems,
      qualityPassed: oneOffQualityReport.valid,
    });
  }, [
    isOneOffOpen,
    oneOffPreviewOpen,
    oneOffQualityReport.totalChecklistItems,
    oneOffQualityReport.valid,
    oneOffScenarioKey,
    oneOffSectionIds.length,
    trackOneOffEvent,
  ]);

  const handleGenerateLink = async () => {
    if (!selectedPropertyId) {
      messageApi.warning(
        t('sparkery.inspectionAdmin.messages.selectPropertyFirst', {
          defaultValue: 'Please select a property first',
        })
      );
      return;
    }
    const property = properties.find(p => p.id === selectedPropertyId);
    if (!property) {
      messageApi.error(
        t('sparkery.inspectionAdmin.messages.propertyNotFound', {
          defaultValue: 'Property not found',
        })
      );
      return;
    }

    const inspectionId = `insp-${generateId()}`;
    const selectedEmployees = employees.filter(emp =>
      selectedEmployeeIds.includes(emp.id)
    );

    const activeSections =
      property.sections || BASE_ROOM_SECTIONS.map(s => s.id);
    const sections = buildInspectionSectionsFromTemplates(
      activeSections,
      property.checklists,
      property.referenceImages
    );

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

    await persistInspectionAndOpenLink(newInspection);
  };

  const handleUndoDeleteArchive = React.useCallback(
    async (archiveToRestore?: InspectionArchive | null) => {
      const targetArchive = archiveToRestore || lastDeletedArchive;
      if (!targetArchive) {
        return;
      }
      try {
        await submitInspection(targetArchive as any);
        setArchives(prev => [
          targetArchive,
          ...prev.filter(item => item.id !== targetArchive.id),
        ]);
        setLastCloudWriteAt(getInspectionLastCloudWriteAt());
        appendArchiveActionLog(
          'delete.undo.success',
          `Restored inspection (${targetArchive.id})`
        );
        setLastDeletedArchive(prev =>
          prev && prev.id === targetArchive.id ? null : prev
        );
        messageApi.success(
          t('sparkery.inspectionAdmin.messages.undoDeleteSuccess', {
            defaultValue: 'Deleted inspection restored.',
          })
        );
      } catch {
        appendArchiveActionLog(
          'delete.undo.failed',
          `Failed to restore inspection (${targetArchive.id})`
        );
        messageApi.warning(
          t('sparkery.inspectionAdmin.messages.undoDeleteFailed', {
            defaultValue: 'Unable to restore deleted inspection.',
          })
        );
      }
    },
    [appendArchiveActionLog, lastDeletedArchive, messageApi, t]
  );

  const handleDelete = React.useCallback(
    async (id: string) => {
      const removedArchive = archives.find(item => item.id === id) || null;
      try {
        await deleteInspection(id);
        setArchives(prev => prev.filter(item => item.id !== id));
        setSelectedArchiveIds(prev => prev.filter(itemId => itemId !== id));
        setLastCloudWriteAt(getInspectionLastCloudWriteAt());
        setLastDeletedArchive(removedArchive);
        appendArchiveActionLog('delete.success', `Inspection deleted (${id})`);
        const toastKey = `inspection-delete-${id}`;
        messageApi.open({
          key: toastKey,
          duration: 8,
          type: 'success',
          content: (
            <Space size={8}>
              <span>
                {t('sparkery.inspectionAdmin.messages.deleted', {
                  defaultValue: 'Deleted',
                })}
              </span>
              {removedArchive ? (
                <Button
                  size='small'
                  type='link'
                  onClick={() => {
                    messageApi.destroy(toastKey);
                    void handleUndoDeleteArchive(removedArchive);
                  }}
                >
                  {t('sparkery.inspectionAdmin.actions.undo', {
                    defaultValue: 'Undo',
                  })}
                </Button>
              ) : null}
            </Space>
          ),
        });
      } catch {
        appendArchiveActionLog(
          'delete.failed',
          `Inspection delete failed (${id})`
        );
        messageApi.error(
          t('sparkery.inspectionAdmin.messages.deleteFailed', {
            defaultValue: 'Delete failed. Please try again.',
          })
        );
      }
    },
    [appendArchiveActionLog, archives, handleUndoDeleteArchive, messageApi, t]
  );

  const handleDeleteSelectedArchives = React.useCallback(async () => {
    if (selectedArchiveIds.length === 0) {
      return;
    }
    const deleteResults = await Promise.allSettled(
      selectedArchiveIds.map(id => deleteInspection(id))
    );
    const successIds: string[] = [];
    const failedIds: string[] = [];
    deleteResults.forEach((result, index) => {
      const id = selectedArchiveIds[index];
      if (!id) {
        return;
      }
      if (result.status === 'fulfilled') {
        successIds.push(id);
      } else {
        failedIds.push(id);
      }
    });

    if (successIds.length > 0) {
      setArchives(prev => prev.filter(item => !successIds.includes(item.id)));
      setSelectedArchiveIds(prev =>
        prev.filter(id => !successIds.includes(id))
      );
      setLastCloudWriteAt(getInspectionLastCloudWriteAt());
    }

    if (successIds.length > 0 && failedIds.length === 0) {
      appendArchiveActionLog(
        'batch_delete.success',
        `Deleted ${successIds.length} inspections`
      );
      messageApi.success(
        t('sparkery.inspectionAdmin.messages.batchDeleteSuccess', {
          defaultValue: '{{count}} inspections deleted.',
          count: successIds.length,
        })
      );
      return;
    }

    appendArchiveActionLog(
      failedIds.length > 0 ? 'batch_delete.partial' : 'batch_delete.failed',
      `Deleted ${successIds.length}, failed ${failedIds.length}`
    );
    messageApi.warning(
      t('sparkery.inspectionAdmin.messages.batchDeletePartial', {
        defaultValue:
          'Batch delete completed with partial result. Success: {{success}}, Failed: {{failed}}.',
        success: successIds.length,
        failed: failedIds.length,
      })
    );
  }, [appendArchiveActionLog, messageApi, selectedArchiveIds, t]);

  const handleCopyLink = React.useCallback(
    async (archive: InspectionArchive) => {
      const url = buildShareUrl(archive);
      try {
        await navigator.clipboard.writeText(url);
        appendArchiveActionLog('copy.success', `Copied link (${archive.id})`);
        messageApi.success(
          t('sparkery.inspectionAdmin.messages.linkCopied', {
            defaultValue: 'Link copied.',
          })
        );
      } catch {
        appendArchiveActionLog(
          'copy.failed',
          `Copy link failed (${archive.id})`
        );
        messageApi.warning(
          t('sparkery.inspectionAdmin.messages.linkCopyFailed', {
            defaultValue: 'Copy failed. Please retry.',
          })
        );
      }
    },
    [appendArchiveActionLog, messageApi, t]
  );

  const handleCopySelectedLinks = React.useCallback(async () => {
    if (selectedArchiveIds.length === 0) {
      return;
    }
    const selectedItems = archives.filter(item =>
      selectedArchiveIds.includes(item.id)
    );
    const allLinks = selectedItems.map(item => buildShareUrl(item)).join('\n');
    try {
      await navigator.clipboard.writeText(allLinks);
      appendArchiveActionLog(
        'batch_copy.success',
        `Copied ${selectedItems.length} links`
      );
      messageApi.success(
        t('sparkery.inspectionAdmin.messages.batchCopySuccess', {
          defaultValue: '{{count}} links copied.',
          count: selectedItems.length,
        })
      );
    } catch {
      appendArchiveActionLog('batch_copy.failed', 'Batch copy links failed');
      messageApi.warning(
        t('sparkery.inspectionAdmin.messages.batchCopyFailed', {
          defaultValue: 'Batch copy failed. Please retry.',
        })
      );
    }
  }, [appendArchiveActionLog, archives, messageApi, selectedArchiveIds, t]);

  const handleOpen = React.useCallback(
    (archive: InspectionArchive) => {
      const url = buildShareUrl(archive);
      const windowRef = window.open(url, '_blank');
      appendArchiveActionLog(
        windowRef ? 'open.success' : 'open.failed',
        `${windowRef ? 'Opened' : 'Open blocked'} (${archive.id})`
      );
    },
    [appendArchiveActionLog]
  );

  const handleOpenSelectedArchives = React.useCallback(() => {
    if (selectedArchiveIds.length === 0) {
      return;
    }
    const selectedItems = archives.filter(item =>
      selectedArchiveIds.includes(item.id)
    );
    const targetItems = selectedItems.slice(0, 8);
    let openedCount = 0;
    targetItems.forEach(item => {
      const opened = Boolean(window.open(buildShareUrl(item), '_blank'));
      if (opened) {
        openedCount += 1;
      }
    });
    appendArchiveActionLog(
      openedCount > 0 ? 'batch_open.success' : 'batch_open.failed',
      `Opened ${openedCount}/${targetItems.length} selected inspections`
    );
    messageApi.info(
      t('sparkery.inspectionAdmin.messages.batchOpenSummary', {
        defaultValue: 'Opened {{opened}} of {{total}} selected inspections.',
        opened: openedCount,
        total: targetItems.length,
      })
    );
  }, [appendArchiveActionLog, archives, messageApi, selectedArchiveIds, t]);

  const updateArchiveFilter = React.useCallback(
    (patch: Partial<ArchiveFilterState>) => {
      setActiveArchiveViewId('');
      setArchiveFilters(prev => ({
        ...prev,
        ...patch,
      }));
    },
    []
  );

  const resetArchiveFilters = React.useCallback(() => {
    setArchiveFilters({ ...DEFAULT_ARCHIVE_FILTER_STATE });
    setSearchText('');
    setActiveArchiveViewId('');
    appendArchiveActionLog('filter.reset', 'Search and filters reset');
  }, [appendArchiveActionLog]);

  const archiveStats = React.useMemo(() => {
    return archives.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.status === 'pending') {
          acc.pending += 1;
        } else if (item.status === 'in_progress') {
          acc.inProgress += 1;
        } else if (item.status === 'submitted') {
          acc.submitted += 1;
        }
        if ((item as any)?.oneOffMeta?.mode === 'one_off') {
          acc.oneOff += 1;
        }
        return acc;
      },
      {
        total: 0,
        pending: 0,
        inProgress: 0,
        submitted: 0,
        oneOff: 0,
      }
    );
  }, [archives]);

  const getSortValueByMode = React.useCallback(
    (archive: InspectionArchive, mode: ArchiveSortMode) => {
      if (mode === 'check_out_latest' || mode === 'check_out_oldest') {
        return parseArchiveDateValue((archive as any).checkOutDate);
      }
      return (
        parseArchiveDateValue((archive as any).submittedAt) ||
        parseArchiveDateValue((archive as any).checkOutDate)
      );
    },
    []
  );

  const filteredArchives = React.useMemo(() => {
    const search = searchText.trim().toLowerCase();
    const rawFromDateValue = archiveFilters.dateFrom
      ? parseArchiveDateValue(archiveFilters.dateFrom)
      : 0;
    const rawToDateStartValue = archiveFilters.dateTo
      ? parseArchiveDateValue(archiveFilters.dateTo)
      : 0;
    const rawToDateEndValue = rawToDateStartValue
      ? dayjs(rawToDateStartValue).endOf('day').valueOf()
      : 0;
    const fromDateValue =
      rawFromDateValue &&
      rawToDateEndValue &&
      rawFromDateValue > rawToDateEndValue
        ? rawToDateStartValue
        : rawFromDateValue;
    const toDateEndValue =
      rawFromDateValue &&
      rawToDateEndValue &&
      rawFromDateValue > rawToDateEndValue
        ? dayjs(rawFromDateValue).endOf('day').valueOf()
        : rawToDateEndValue;
    const nowValue = dayjs().valueOf();
    const sorted = archives.filter(item => {
      const assignedEmployees = (item as any).assignedEmployees as
        | Employee[]
        | undefined;
      const assignedEmployee = (item as any).assignedEmployee as
        | Employee
        | undefined;
      const hasAssignee = Boolean(
        (assignedEmployees && assignedEmployees.length > 0) || assignedEmployee
      );
      const assignedText = assignedEmployees?.length
        ? assignedEmployees
            .map(emp => [emp.name, emp.nameEn].filter(Boolean).join(' '))
            .join(' ')
        : [assignedEmployee?.name, assignedEmployee?.nameEn]
            .filter(Boolean)
            .join(' ');
      const primaryArchiveDate =
        parseArchiveDateValue((item as any).checkOutDate) ||
        parseArchiveDateValue((item as any).submittedAt);
      const searchableFields = [
        item.propertyId,
        item.id,
        (item as any).propertyAddress,
        (item as any).templateName,
        (item as any)?.oneOffMeta?.customerName,
        assignedText,
      ]
        .filter((value): value is string => typeof value === 'string')
        .map(value => value.toLowerCase());
      const matchesSearch =
        !search || searchableFields.some(value => value.includes(search));
      if (!matchesSearch) {
        return false;
      }
      if (
        archiveFilters.status !== 'all' &&
        item.status !== archiveFilters.status
      ) {
        return false;
      }
      if (
        archiveFilters.oneOffOnly &&
        (item as any)?.oneOffMeta?.mode !== 'one_off'
      ) {
        return false;
      }
      if (
        archiveFilters.quickChip === 'needs_attention' &&
        item.status === 'submitted'
      ) {
        return false;
      }
      if (archiveFilters.quickChip === 'no_assignee' && hasAssignee) {
        return false;
      }
      if (archiveFilters.quickChip === 'stale_48h') {
        const staleHours = primaryArchiveDate
          ? (nowValue - primaryArchiveDate) / (1000 * 60 * 60)
          : 0;
        if (
          item.status === 'submitted' ||
          !primaryArchiveDate ||
          staleHours < 48
        ) {
          return false;
        }
      }
      if (fromDateValue || toDateEndValue) {
        if (!primaryArchiveDate) {
          return false;
        }
        if (fromDateValue && primaryArchiveDate < fromDateValue) {
          return false;
        }
        if (toDateEndValue && primaryArchiveDate > toDateEndValue) {
          return false;
        }
      }
      return true;
    });

    const isAscending =
      archiveFilters.sortMode === 'oldest' ||
      archiveFilters.sortMode === 'check_out_oldest';
    sorted.sort((left, right) => {
      const leftValue = getSortValueByMode(left, archiveFilters.sortMode);
      const rightValue = getSortValueByMode(right, archiveFilters.sortMode);
      if (leftValue === rightValue) {
        return left.id.localeCompare(right.id);
      }
      return isAscending ? leftValue - rightValue : rightValue - leftValue;
    });
    return sorted;
  }, [archiveFilters, archives, getSortValueByMode, searchText]);

  const archiveSubmissionRate = React.useMemo(() => {
    if (archiveStats.total === 0) {
      return 0;
    }
    return Number(
      ((archiveStats.submitted / archiveStats.total) * 100).toFixed(1)
    );
  }, [archiveStats.submitted, archiveStats.total]);

  const selectedArchiveItems = React.useMemo(
    () => archives.filter(item => selectedArchiveIds.includes(item.id)),
    [archives, selectedArchiveIds]
  );
  const detailArchive = React.useMemo(
    () => archives.find(item => item.id === detailArchiveId) || null,
    [archives, detailArchiveId]
  );

  const allVisibleSelected =
    filteredArchives.length > 0 &&
    filteredArchives.every(item => selectedArchiveIds.includes(item.id));

  const someVisibleSelected = filteredArchives.some(item =>
    selectedArchiveIds.includes(item.id)
  );

  const toggleArchiveSelection = React.useCallback(
    (archiveId: string, checked: boolean) => {
      setSelectedArchiveIds(prev => {
        const current = new Set(prev);
        if (checked) {
          current.add(archiveId);
        } else {
          current.delete(archiveId);
        }
        return Array.from(current);
      });
    },
    []
  );

  const toggleSelectAllVisible = React.useCallback(
    (checked: boolean) => {
      const visibleIds = filteredArchives.map(item => item.id);
      setSelectedArchiveIds(prev => {
        const current = new Set(prev);
        if (checked) {
          visibleIds.forEach(id => current.add(id));
        } else {
          visibleIds.forEach(id => current.delete(id));
        }
        return Array.from(current);
      });
    },
    [filteredArchives]
  );

  const toggleArchiveExpanded = React.useCallback((archiveId: string) => {
    setExpandedArchiveIds(prev =>
      prev.includes(archiveId)
        ? prev.filter(id => id !== archiveId)
        : [...prev, archiveId]
    );
  }, []);

  const handleSaveArchiveView = React.useCallback(() => {
    const viewName = archiveViewName.trim();
    if (!viewName) {
      messageApi.warning(
        t('sparkery.inspectionAdmin.messages.archiveViewNameRequired', {
          defaultValue: 'Please input a view name first.',
        })
      );
      return;
    }
    setArchiveViews(prev => {
      const now = new Date().toISOString();
      const existing = prev.find(item => item.id === activeArchiveViewId);
      if (existing) {
        const next = prev.map(item =>
          item.id === existing.id
            ? {
                ...item,
                name: viewName,
                searchText,
                filters: { ...archiveFilters },
                updatedAt: now,
              }
            : item
        );
        appendArchiveActionLog('view.updated', `Updated view "${viewName}"`);
        return next;
      }

      if (prev.length >= MAX_ARCHIVE_VIEWS) {
        messageApi.warning(
          t('sparkery.inspectionAdmin.messages.archiveViewLimitReached', {
            defaultValue: 'Saved views limit reached ({{count}}).',
            count: MAX_ARCHIVE_VIEWS,
          })
        );
        return prev;
      }

      const nextView: ArchiveViewPreset = {
        id: `view-${generateId()}`,
        name: viewName,
        searchText,
        filters: { ...archiveFilters },
        createdAt: now,
        updatedAt: now,
      };
      setActiveArchiveViewId(nextView.id);
      appendArchiveActionLog('view.saved', `Saved view "${viewName}"`);
      return [nextView, ...prev];
    });
    setArchiveViewName('');
  }, [
    activeArchiveViewId,
    appendArchiveActionLog,
    archiveFilters,
    archiveViewName,
    messageApi,
    searchText,
    t,
  ]);

  const handleApplyArchiveView = React.useCallback(
    (viewId: string) => {
      const targetView = archiveViews.find(item => item.id === viewId);
      if (!targetView) {
        return;
      }
      setArchiveFilters(normalizeArchiveFilterState(targetView.filters));
      setSearchText(targetView.searchText || '');
      setActiveArchiveViewId(targetView.id);
      appendArchiveActionLog(
        'view.applied',
        `Applied view "${targetView.name}"`
      );
    },
    [appendArchiveActionLog, archiveViews]
  );

  const handleDeleteArchiveView = React.useCallback(
    (viewId: string) => {
      const targetView = archiveViews.find(item => item.id === viewId);
      setArchiveViews(prev => prev.filter(item => item.id !== viewId));
      if (activeArchiveViewId === viewId) {
        setActiveArchiveViewId('');
      }
      appendArchiveActionLog(
        'view.deleted',
        `Deleted view "${targetView?.name || viewId}"`
      );
    },
    [activeArchiveViewId, appendArchiveActionLog, archiveViews]
  );

  React.useEffect(() => {
    if (!activeArchiveViewId) {
      return;
    }
    const activeView = archiveViews.find(
      item => item.id === activeArchiveViewId
    );
    if (!activeView) {
      setActiveArchiveViewId('');
      return;
    }
    const sameSearch = activeView.searchText === searchText;
    const sameFilter =
      JSON.stringify(activeView.filters) === JSON.stringify(archiveFilters);
    if (!sameSearch || !sameFilter) {
      setActiveArchiveViewId('');
    }
  }, [activeArchiveViewId, archiveFilters, archiveViews, searchText]);

  const getArchiveStatusMeta = React.useCallback(
    (status: InspectionArchive['status']) => {
      if (status === 'submitted') {
        return {
          color: 'green',
          icon: <CheckCircleOutlined />,
          label: t('sparkery.inspectionAdmin.status.submitted', {
            defaultValue: 'Submitted',
          }),
        };
      }
      if (status === 'in_progress') {
        return {
          color: 'gold',
          icon: <HourglassOutlined />,
          label: t('sparkery.inspectionAdmin.status.inProgress', {
            defaultValue: 'In Progress',
          }),
        };
      }
      return {
        color: 'blue',
        icon: <ClockCircleOutlined />,
        label: t('sparkery.inspectionAdmin.status.pending', {
          defaultValue: 'Pending',
        }),
      };
    },
    [t]
  );

  /** Quick-start wizard: pick property + date, then generate/open a unique link. */
  const handleQuickStartWithProperty = () => {
    if (!selectedPropertyId) {
      messageApi.warning(
        t('sparkery.inspectionAdmin.messages.selectPropertyFirst', {
          defaultValue: 'Please select a property first',
        })
      );
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
      ? t('sparkery.inspectionAdmin.status.supabaseConnected', {
          defaultValue: 'Supabase Connected',
        })
      : supabaseStatus === 'checking'
        ? t('sparkery.inspectionAdmin.status.checkingSupabase', {
            defaultValue: 'Checking Supabase...',
          })
        : supabaseStatus === 'unreachable'
          ? t('sparkery.inspectionAdmin.status.supabaseUnreachable', {
              defaultValue: 'Supabase Unreachable',
            })
          : t('sparkery.inspectionAdmin.status.localCacheMode', {
              defaultValue: 'Local Cache Mode',
            });

  const formattedLastCloudWriteAt = lastCloudWriteAt
    ? dayjs(lastCloudWriteAt).isValid()
      ? dayjs(lastCloudWriteAt).format('YYYY-MM-DD HH:mm:ss')
      : lastCloudWriteAt
    : t('sparkery.inspectionAdmin.labels.never', { defaultValue: 'Never' });
  const oneOffSections = getAllSections(oneOffSectionIds);
  const oneOffSectionAddOptions = React.useMemo(
    () => buildOneOffSectionAddOptions(),
    []
  );
  const archiveBoardColumns = React.useMemo(
    () =>
      ARCHIVE_BOARD_STATUS_ORDER.map(status => ({
        status,
        meta: getArchiveStatusMeta(status),
        items: filteredArchives.filter(item => item.status === status),
      })),
    [filteredArchives, getArchiveStatusMeta]
  );
  const detailArchiveSummary = React.useMemo(() => {
    if (!detailArchive) {
      return null;
    }

    const assignedEmployees = (detailArchive as any).assignedEmployees as
      | Employee[]
      | undefined;
    const assignedEmployee = (detailArchive as any).assignedEmployee as
      | Employee
      | undefined;
    const assignedLabel = assignedEmployees?.length
      ? assignedEmployees
          .map(emp => [emp.name, emp.nameEn].filter(Boolean).join(' '))
          .join(', ')
      : [assignedEmployee?.name, assignedEmployee?.nameEn]
          .filter(Boolean)
          .join(' ');
    const sectionItems = Array.isArray((detailArchive as any).sections)
      ? ((detailArchive as any).sections as any[])
      : [];
    const checklistCount = sectionItems.reduce((total, section) => {
      const checklist = Array.isArray(section?.checklist)
        ? section.checklist
        : [];
      return total + checklist.length;
    }, 0);
    const completedChecklistCount = sectionItems.reduce((total, section) => {
      const checklist = Array.isArray(section?.checklist)
        ? section.checklist
        : [];
      return (
        total +
        checklist.filter((checklistItem: any) => checklistItem?.checked).length
      );
    }, 0);
    const requiredPhotoCount = sectionItems.reduce((total, section) => {
      const checklist = Array.isArray(section?.checklist)
        ? section.checklist
        : [];
      return (
        total +
        checklist.filter(
          (checklistItem: any) => checklistItem?.requiredPhoto === true
        ).length
      );
    }, 0);
    const damageReportCount = Array.isArray(
      (detailArchive as any).damageReports
    )
      ? ((detailArchive as any).damageReports as any[]).length
      : 0;
    const checkOutText =
      typeof (detailArchive as any).checkOutDate === 'string' &&
      (detailArchive as any).checkOutDate
        ? (detailArchive as any).checkOutDate
        : t('sparkery.inspectionAdmin.labels.notSet', {
            defaultValue: 'Not set',
          });
    const submittedAt = parseArchiveDateValue(
      (detailArchive as any).submittedAt
    );
    const submittedText = submittedAt
      ? dayjs(submittedAt).format('YYYY-MM-DD HH:mm')
      : t('sparkery.inspectionAdmin.labels.notSubmitted', {
          defaultValue: 'Not submitted',
        });
    return {
      assignedLabel,
      sectionItems,
      checklistCount,
      completedChecklistCount,
      requiredPhotoCount,
      damageReportCount,
      checkOutText,
      submittedText,
      notePreview: ((detailArchive as any).propertyNotes as string) || '',
      isOneOff: (detailArchive as any)?.oneOffMeta?.mode === 'one_off',
      statusMeta: getArchiveStatusMeta(detailArchive.status),
    };
  }, [detailArchive, getArchiveStatusMeta, t]);
  const handleOpenArchiveDetailDrawer = React.useCallback(
    (archiveId: string) => {
      setDetailArchiveId(archiveId);
      appendArchiveActionLog(
        'detail.open',
        `Opened detail drawer (${archiveId})`
      );
    },
    [appendArchiveActionLog]
  );
  const handleCloseArchiveDetailDrawer = React.useCallback(() => {
    if (detailArchiveId) {
      appendArchiveActionLog(
        'detail.close',
        `Closed detail drawer (${detailArchiveId})`
      );
    }
    setDetailArchiveId('');
  }, [appendArchiveActionLog, detailArchiveId]);
  const renderArchiveCard = React.useCallback(
    (item: InspectionArchive, inBoard = false) => {
      const statusMeta = getArchiveStatusMeta(item.status);
      const assignedEmployees = (item as any).assignedEmployees as
        | Employee[]
        | undefined;
      const assignedEmployee = (item as any).assignedEmployee as
        | Employee
        | undefined;
      const assignedLabel = assignedEmployees?.length
        ? assignedEmployees
            .map(emp => [emp.name, emp.nameEn].filter(Boolean).join(' '))
            .join(', ')
        : [assignedEmployee?.name, assignedEmployee?.nameEn]
            .filter(Boolean)
            .join(' ');
      const checkOutText =
        typeof (item as any).checkOutDate === 'string' &&
        (item as any).checkOutDate
          ? (item as any).checkOutDate
          : t('sparkery.inspectionAdmin.labels.notSet', {
              defaultValue: 'Not set',
            });
      const submittedAt = parseArchiveDateValue((item as any).submittedAt);
      const submittedText = submittedAt
        ? dayjs(submittedAt).format('YYYY-MM-DD HH:mm')
        : t('sparkery.inspectionAdmin.labels.notSubmitted', {
            defaultValue: 'Not submitted',
          });
      const isOneOff = (item as any)?.oneOffMeta?.mode === 'one_off';
      const sectionItems = Array.isArray((item as any).sections)
        ? ((item as any).sections as any[])
        : [];
      const checklistCount = sectionItems.reduce((total, section) => {
        const checklist = Array.isArray(section?.checklist)
          ? section.checklist
          : [];
        return total + checklist.length;
      }, 0);
      const requiredPhotoCount = sectionItems.reduce((total, section) => {
        const checklist = Array.isArray(section?.checklist)
          ? section.checklist
          : [];
        return (
          total +
          checklist.filter(
            (checklistItem: any) => checklistItem?.requiredPhoto === true
          ).length
        );
      }, 0);
      const completedChecklistCount = sectionItems.reduce((total, section) => {
        const checklist = Array.isArray(section?.checklist)
          ? section.checklist
          : [];
        return (
          total +
          checklist.filter((checklistItem: any) => checklistItem?.checked)
            .length
        );
      }, 0);
      const damageReportCount = Array.isArray((item as any).damageReports)
        ? ((item as any).damageReports as any[]).length
        : 0;
      const notePreview = ((item as any).propertyNotes as string) || '';
      const isSelected = selectedArchiveIds.includes(item.id);
      const isExpanded = expandedArchiveIds.includes(item.id);
      return (
        <Card
          key={item.id}
          size='small'
          className={`sparkery-inspection-archive-card ${
            isSelected ? 'sparkery-inspection-archive-card-selected' : ''
          } ${
            archiveFilters.density === 'compact'
              ? 'sparkery-inspection-archive-card-compact'
              : 'sparkery-inspection-archive-card-comfortable'
          } ${inBoard ? 'sparkery-inspection-archive-card-board' : ''}`}
        >
          <Row align='middle' justify='space-between' gutter={[12, 12]}>
            <Col xs={24} md={inBoard ? 24 : 16}>
              <Space
                size={[8, 8]}
                wrap
                className='sparkery-inspection-archive-title-row'
              >
                <Checkbox
                  checked={isSelected}
                  onChange={event =>
                    toggleArchiveSelection(item.id, event.target.checked)
                  }
                  aria-label={t(
                    'sparkery.inspectionAdmin.aria.selectInspection',
                    {
                      defaultValue: 'Select inspection {{id}}',
                      id: item.id,
                    }
                  )}
                />
                <Text strong>
                  {item.propertyId ||
                    t('sparkery.inspectionAdmin.labels.unnamed', {
                      defaultValue: 'Unnamed',
                    })}
                </Text>
                <Tag color={statusMeta.color} icon={statusMeta.icon}>
                  {statusMeta.label}
                </Tag>
                {isOneOff ? (
                  <Tag color='geekblue'>
                    {t('sparkery.inspectionAdmin.labels.oneOff', {
                      defaultValue: 'One-off',
                    })}
                  </Tag>
                ) : null}
              </Space>
              <Text
                type='secondary'
                className='sparkery-inspection-archive-meta-text'
              >
                {t('sparkery.inspectionAdmin.labels.checkOutDate', {
                  defaultValue: 'Check-out',
                })}
                : {checkOutText}
                {' | '}
                {t('sparkery.inspectionAdmin.labels.submittedAt', {
                  defaultValue: 'Submitted',
                })}
                : {submittedText}
              </Text>
              {(item as any).propertyAddress ? (
                <Text
                  type='secondary'
                  className='sparkery-inspection-archive-meta-text'
                >
                  {(item as any).propertyAddress}
                </Text>
              ) : null}
              {assignedLabel ? (
                <Text
                  type='secondary'
                  className='sparkery-inspection-archive-meta-text'
                >
                  {t('sparkery.inspectionAdmin.labels.assignedEmployees', {
                    defaultValue: 'Assigned Employees',
                  })}
                  : {assignedLabel}
                </Text>
              ) : null}
              <Text type='secondary' className='sparkery-inspection-id-text'>
                {item.id}
              </Text>
            </Col>
            <Col xs={24} md={inBoard ? 24 : 8}>
              <Space
                wrap
                className={`sparkery-inspection-archive-actions ${
                  inBoard ? 'sparkery-inspection-archive-actions-board' : ''
                }`}
                size={[6, 6]}
              >
                <Button
                  type='text'
                  icon={<UnorderedListOutlined />}
                  onClick={() => toggleArchiveExpanded(item.id)}
                >
                  {isExpanded
                    ? t('sparkery.inspectionAdmin.actions.hideDetails', {
                        defaultValue: 'Hide',
                      })
                    : t('sparkery.inspectionAdmin.actions.showDetails', {
                        defaultValue: 'Details',
                      })}
                </Button>
                <Tooltip
                  title={t('sparkery.inspectionAdmin.actions.viewPanel', {
                    defaultValue: 'Detail panel',
                  })}
                >
                  <Button
                    type='text'
                    icon={<InfoCircleOutlined />}
                    onClick={() => handleOpenArchiveDetailDrawer(item.id)}
                    aria-label={t(
                      'sparkery.inspectionAdmin.aria.openDetailPanel',
                      {
                        defaultValue: 'Open detail panel for inspection {{id}}',
                        id: item.id,
                      }
                    )}
                  />
                </Tooltip>
                <Tooltip
                  title={t('sparkery.inspectionAdmin.actions.openInspection', {
                    defaultValue: 'Open inspection',
                  })}
                >
                  <Button
                    type='text'
                    icon={<EyeOutlined />}
                    onClick={() => handleOpen(item)}
                    aria-label={t(
                      'sparkery.inspectionAdmin.aria.openInspection',
                      {
                        defaultValue: 'Open inspection {{id}}',
                        id: item.id,
                      }
                    )}
                  />
                </Tooltip>
                <Tooltip
                  title={t('sparkery.inspectionAdmin.actions.copyLink', {
                    defaultValue: 'Copy link',
                  })}
                >
                  <Button
                    type='text'
                    icon={<LinkOutlined />}
                    onClick={() => void handleCopyLink(item)}
                    aria-label={t(
                      'sparkery.inspectionAdmin.aria.copyInspectionLink',
                      {
                        defaultValue: 'Copy link for inspection {{id}}',
                        id: item.id,
                      }
                    )}
                  />
                </Tooltip>
                <Popconfirm
                  title={t(
                    'sparkery.inspectionAdmin.confirm.deleteInspection',
                    {
                      defaultValue: 'Confirm delete?',
                    }
                  )}
                  onConfirm={() => void handleDelete(item.id)}
                >
                  <Button type='text' danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            </Col>
          </Row>
          {isExpanded ? (
            <div className='sparkery-inspection-archive-detail-grid'>
              <Tag>
                {t('sparkery.inspectionAdmin.labels.sections', {
                  defaultValue: 'Sections',
                })}
                : {sectionItems.length}
              </Tag>
              <Tag>
                {t('sparkery.inspectionAdmin.labels.checklist', {
                  defaultValue: 'Checklist',
                })}
                : {completedChecklistCount}/{checklistCount}
              </Tag>
              <Tag>
                {t('sparkery.inspectionAdmin.labels.requiredPhotos', {
                  defaultValue: 'Required Photos',
                })}
                : {requiredPhotoCount}
              </Tag>
              <Tag>
                {t('sparkery.inspectionAdmin.labels.damageReports', {
                  defaultValue: 'Damage Reports',
                })}
                : {damageReportCount}
              </Tag>
              {notePreview ? (
                <Text
                  type='secondary'
                  className='sparkery-inspection-archive-note-preview'
                >
                  {notePreview.length > 180
                    ? `${notePreview.slice(0, 180)}...`
                    : notePreview}
                </Text>
              ) : null}
            </div>
          ) : null}
        </Card>
      );
    },
    [
      archiveFilters.density,
      expandedArchiveIds,
      getArchiveStatusMeta,
      handleCopyLink,
      handleDelete,
      handleOpen,
      handleOpenArchiveDetailDrawer,
      selectedArchiveIds,
      t,
      toggleArchiveExpanded,
      toggleArchiveSelection,
    ]
  );

  return (
    <div className='sparkery-tool-page sparkery-inspection-admin-page'>
      {contextHolder}
      <div className='sparkery-inspection-header'>
        <Title level={3} className='sparkery-tool-page-title'>
          <HomeOutlined className='sparkery-inspection-icon-8' />
          {t('sparkery.inspectionAdmin.title', {
            defaultValue: 'Cleaning Inspection Admin',
          })}
        </Title>
        <Space wrap>
          <Button
            icon={<SettingOutlined />}
            onClick={() => setIsSettingsOpen(true)}
          >
            {t('sparkery.inspectionAdmin.actions.propertyTemplates', {
              defaultValue: 'Property Templates',
            })}
          </Button>
          <Button
            icon={<EditOutlined />}
            onClick={() => setIsEmployeesOpen(true)}
          >
            {t('sparkery.inspectionAdmin.actions.employeeManagementCount', {
              defaultValue: 'Employee Management ({{count}})',
              count: employees.length,
            })}
          </Button>
          <Button
            onClick={handleForceRefreshTemplates}
            loading={supabaseStatus === 'checking' && !isMigratingAssets}
            disabled={isMigratingAssets}
          >
            {t('sparkery.inspectionAdmin.actions.refreshCloudTemplates', {
              defaultValue: 'Refresh Cloud Templates',
            })}
          </Button>
          <Button
            onClick={handleMigrateLegacyAssets}
            loading={isMigratingAssets}
            disabled={supabaseStatus === 'checking'}
          >
            {t('sparkery.inspectionAdmin.actions.migrateLegacyImages', {
              defaultValue: 'Migrate Legacy Images',
            })}
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
            {t('sparkery.inspectionAdmin.labels.storageBucket', {
              defaultValue: 'Storage bucket',
            })}
            : {storageBucket}
          </Text>
          <Text type='secondary' className='sparkery-inspection-status-note'>
            {t('sparkery.inspectionAdmin.labels.lastCloudWrite', {
              defaultValue: 'Last cloud write',
            })}
            : {formattedLastCloudWriteAt}
          </Text>
        </div>
      </div>

      {/* Quick Start Wizard: select property + date, then start inspection */}
      <Card size='small' className='sparkery-inspection-quick-card'>
        <div className='sparkery-inspection-quick-header'>
          <Text strong className='sparkery-inspection-quick-title'>
            <FormOutlined />{' '}
            {t('sparkery.inspectionAdmin.quick.title', {
              defaultValue: 'Quick Inspection Link',
            })}
          </Text>
          <Text className='sparkery-inspection-quick-description'>
            {t('sparkery.inspectionAdmin.quick.description', {
              defaultValue:
                'Select property and date, then click Start Inspection to generate a unique share link. The link opens in a new tab and can be sent to assigned cleaners immediately.',
            })}
          </Text>
        </div>

        <Row gutter={[12, 12]} align='bottom'>
          <Col xs={24} sm={10}>
            <Text strong className='sparkery-inspection-quick-label'>
              {t('sparkery.inspectionAdmin.fields.property', {
                defaultValue: 'Property',
              })}{' '}
              *
            </Text>
            <div className='sparkery-inspection-quick-field'>
              {properties.length === 0 ? (
                <Text className='sparkery-inspection-quick-help'>
                  {t('sparkery.inspectionAdmin.quick.noPropertyTemplates', {
                    defaultValue:
                      'No property templates yet. Add one in "Property Templates" first.',
                  })}
                </Text>
              ) : (
                <Select
                  className='sparkery-inspection-full-width'
                  placeholder={t(
                    'sparkery.inspectionAdmin.placeholders.selectProperty',
                    {
                      defaultValue: 'Select property',
                    }
                  )}
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
              {t('sparkery.inspectionAdmin.fields.checkOutDate', {
                defaultValue: 'Check-out Date',
              })}
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
              {t('sparkery.inspectionAdmin.fields.assignedEmployees', {
                defaultValue: 'Assigned Employees',
              })}
            </Text>
            <div className='sparkery-inspection-quick-field'>
              <Select
                className='sparkery-inspection-full-width'
                placeholder={t(
                  'sparkery.inspectionAdmin.placeholders.optional',
                  {
                    defaultValue: 'Optional',
                  }
                )}
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
              <RocketOutlined />{' '}
              {t('sparkery.inspectionAdmin.actions.startInspection', {
                defaultValue: 'Start Inspection',
              })}
            </Button>
          </Col>
        </Row>
        <Divider className='sparkery-inspection-divider-soft' />
        <Space wrap>
          <Button
            icon={<PlusCircleOutlined />}
            onClick={handleOpenOneOffGenerator}
          >
            {t('sparkery.inspectionAdmin.actions.oneOffTemplateGenerator', {
              defaultValue: 'One-off Template Generator',
            })}
          </Button>
          <Text type='secondary'>
            {t('sparkery.inspectionAdmin.hints.oneOffTemplateGenerator', {
              defaultValue:
                'For one-time jobs: choose cleaning/property type, auto-generate detailed sections and checklist, then edit and create link.',
            })}
          </Text>
          <Text type='secondary' className='sparkery-inspection-shortcut-hint'>
            {t('sparkery.inspectionAdmin.hints.oneOffShortcut', {
              defaultValue:
                'Shortcuts: Ctrl/Cmd+Shift+N (one-off), Ctrl/Cmd+Shift+R (refresh), Ctrl/Cmd+Shift+F (focus search)',
            })}
          </Text>
        </Space>
      </Card>

      <Card size='small' className='sparkery-inspection-overview-card'>
        <div className='sparkery-inspection-overview-head'>
          <Text strong>
            {t('sparkery.inspectionAdmin.overview.title', {
              defaultValue: 'Inspection Overview',
            })}
          </Text>
          <Space size={12} wrap>
            <Text type='secondary'>
              {t('sparkery.inspectionAdmin.overview.visibleSummary', {
                defaultValue: 'Showing {{visible}} of {{total}} inspections',
                visible: filteredArchives.length,
                total: archiveStats.total,
              })}
            </Text>
            <Text type='secondary'>
              {t('sparkery.inspectionAdmin.overview.lastRefresh', {
                defaultValue: 'Last refresh: {{time}}',
                time: lastArchiveRefreshAt
                  ? dayjs(lastArchiveRefreshAt).format('YYYY-MM-DD HH:mm:ss')
                  : t('sparkery.inspectionAdmin.labels.never', {
                      defaultValue: 'Never',
                    }),
              })}
            </Text>
          </Space>
        </div>
        <div className='sparkery-inspection-progress-wrap'>
          <Text type='secondary'>
            {t('sparkery.inspectionAdmin.overview.submissionProgress', {
              defaultValue: 'Submission progress',
            })}
          </Text>
          <Progress
            percent={archiveSubmissionRate}
            size='small'
            status='active'
            strokeColor='#52c41a'
            format={percent =>
              t('sparkery.inspectionAdmin.overview.percentWithValue', {
                defaultValue: '{{percent}}% submitted',
                percent: percent ?? 0,
              })
            }
          />
        </div>
        <div className='sparkery-inspection-metric-grid'>
          <Card size='small' className='sparkery-inspection-metric-card'>
            <Statistic
              title={t('sparkery.inspectionAdmin.metrics.total', {
                defaultValue: 'Total',
              })}
              value={archiveStats.total}
              prefix={<BarChartOutlined />}
            />
          </Card>
          <Card size='small' className='sparkery-inspection-metric-card'>
            <Statistic
              title={t('sparkery.inspectionAdmin.metrics.pending', {
                defaultValue: 'Pending',
              })}
              value={archiveStats.pending}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
          <Card size='small' className='sparkery-inspection-metric-card'>
            <Statistic
              title={t('sparkery.inspectionAdmin.metrics.inProgress', {
                defaultValue: 'In Progress',
              })}
              value={archiveStats.inProgress}
              prefix={<HourglassOutlined />}
            />
          </Card>
          <Card size='small' className='sparkery-inspection-metric-card'>
            <Statistic
              title={t('sparkery.inspectionAdmin.metrics.submitted', {
                defaultValue: 'Submitted',
              })}
              value={archiveStats.submitted}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
          <Card size='small' className='sparkery-inspection-metric-card'>
            <Statistic
              title={t('sparkery.inspectionAdmin.metrics.oneOff', {
                defaultValue: 'One-off',
              })}
              value={archiveStats.oneOff}
              prefix={<FormOutlined />}
            />
          </Card>
        </div>
      </Card>

      <Card size='small' className='sparkery-inspection-search-card'>
        <Space
          direction='vertical'
          className='sparkery-inspection-full-width'
          size={12}
        >
          <div className='sparkery-inspection-filter-row'>
            <Input
              ref={archiveSearchInputRef}
              prefix={<SearchOutlined />}
              placeholder={t(
                'sparkery.inspectionAdmin.placeholders.searchInspection',
                {
                  defaultValue: 'Search by property name or inspection ID',
                }
              )}
              value={searchText}
              onChange={e => {
                setSearchText(e.target.value);
                setActiveArchiveViewId('');
              }}
              allowClear
              aria-label={t('sparkery.inspectionAdmin.aria.searchInspection', {
                defaultValue: 'Search inspection archives',
              })}
            />
            <Space wrap className='sparkery-inspection-filter-actions'>
              <Button
                icon={<ReloadOutlined />}
                loading={isArchiveRefreshing}
                onClick={() => {
                  void handleManualRefreshArchives();
                }}
              >
                {t('sparkery.inspectionAdmin.actions.refreshArchives', {
                  defaultValue: 'Refresh',
                })}
              </Button>
              <Button onClick={resetArchiveFilters}>
                {t('sparkery.inspectionAdmin.actions.resetFilters', {
                  defaultValue: 'Reset Filters',
                })}
              </Button>
            </Space>
          </div>

          <div className='sparkery-inspection-view-row'>
            <Select
              value={activeArchiveViewId || undefined}
              allowClear
              className='sparkery-inspection-view-select'
              placeholder={t('sparkery.inspectionAdmin.filters.savedViews', {
                defaultValue: 'Saved views',
              })}
              onChange={(value?: string) => {
                if (!value) {
                  setActiveArchiveViewId('');
                  return;
                }
                handleApplyArchiveView(value);
              }}
              onClear={() => setActiveArchiveViewId('')}
              options={archiveViews.map(view => ({
                value: view.id,
                label: `${view.name} · ${dayjs(view.updatedAt).format('MM-DD HH:mm')}`,
              }))}
            />
            <Input
              value={archiveViewName}
              onChange={event => setArchiveViewName(event.target.value)}
              placeholder={t(
                'sparkery.inspectionAdmin.placeholders.saveViewName',
                {
                  defaultValue: 'Save current filters as...',
                }
              )}
            />
            <Button onClick={handleSaveArchiveView}>
              {t('sparkery.inspectionAdmin.actions.saveView', {
                defaultValue: 'Save View',
              })}
            </Button>
            <Popconfirm
              title={t('sparkery.inspectionAdmin.confirm.deleteView', {
                defaultValue: 'Delete current view?',
              })}
              onConfirm={() => handleDeleteArchiveView(activeArchiveViewId)}
              disabled={!activeArchiveViewId}
            >
              <Button danger disabled={!activeArchiveViewId}>
                {t('sparkery.inspectionAdmin.actions.deleteView', {
                  defaultValue: 'Delete View',
                })}
              </Button>
            </Popconfirm>
          </div>

          <div className='sparkery-inspection-filter-grid'>
            <div className='sparkery-inspection-filter-item'>
              <Text
                type='secondary'
                className='sparkery-inspection-filter-item-label'
              >
                {t('sparkery.inspectionAdmin.filters.status', {
                  defaultValue: 'Status',
                })}
              </Text>
              <Segmented
                block
                value={archiveFilters.status}
                options={[
                  {
                    value: 'all',
                    label: t('sparkery.inspectionAdmin.filters.statusAll', {
                      defaultValue: 'All',
                    }),
                  },
                  {
                    value: 'pending',
                    label: t(
                      'sparkery.inspectionAdmin.filters.statusPendingShort',
                      {
                        defaultValue: 'Pending',
                      }
                    ),
                  },
                  {
                    value: 'in_progress',
                    label: t(
                      'sparkery.inspectionAdmin.filters.statusInProgressShort',
                      {
                        defaultValue: 'In Progress',
                      }
                    ),
                  },
                  {
                    value: 'submitted',
                    label: t(
                      'sparkery.inspectionAdmin.filters.statusSubmittedShort',
                      {
                        defaultValue: 'Submitted',
                      }
                    ),
                  },
                ]}
                onChange={value =>
                  updateArchiveFilter({
                    status: value as ArchiveStatusFilter,
                  })
                }
              />
            </div>
            <div className='sparkery-inspection-filter-item'>
              <Text
                type='secondary'
                className='sparkery-inspection-filter-item-label'
              >
                {t('sparkery.inspectionAdmin.filters.sortBy', {
                  defaultValue: 'Sort By',
                })}
              </Text>
              <Select
                value={archiveFilters.sortMode}
                className='sparkery-inspection-full-width'
                onChange={(value: ArchiveSortMode) =>
                  updateArchiveFilter({ sortMode: value })
                }
                options={[
                  {
                    value: 'latest',
                    label: t('sparkery.inspectionAdmin.filters.sortLatest', {
                      defaultValue: 'Latest activity first',
                    }),
                  },
                  {
                    value: 'oldest',
                    label: t('sparkery.inspectionAdmin.filters.sortOldest', {
                      defaultValue: 'Oldest activity first',
                    }),
                  },
                  {
                    value: 'check_out_latest',
                    label: t(
                      'sparkery.inspectionAdmin.filters.sortCheckOutLatest',
                      {
                        defaultValue: 'Latest check-out date first',
                      }
                    ),
                  },
                  {
                    value: 'check_out_oldest',
                    label: t(
                      'sparkery.inspectionAdmin.filters.sortCheckOutOldest',
                      {
                        defaultValue: 'Oldest check-out date first',
                      }
                    ),
                  },
                ]}
              />
            </div>
            <div className='sparkery-inspection-filter-item'>
              <Text
                type='secondary'
                className='sparkery-inspection-filter-item-label'
              >
                {t('sparkery.inspectionAdmin.filters.fromDate', {
                  defaultValue: 'From',
                })}
              </Text>
              <Input
                type='date'
                value={archiveFilters.dateFrom}
                onChange={event =>
                  updateArchiveFilter({ dateFrom: event.target.value })
                }
              />
            </div>
            <div className='sparkery-inspection-filter-item'>
              <Text
                type='secondary'
                className='sparkery-inspection-filter-item-label'
              >
                {t('sparkery.inspectionAdmin.filters.toDate', {
                  defaultValue: 'To',
                })}
              </Text>
              <Input
                type='date'
                value={archiveFilters.dateTo}
                onChange={event =>
                  updateArchiveFilter({ dateTo: event.target.value })
                }
              />
            </div>
            <div className='sparkery-inspection-filter-item'>
              <Text
                type='secondary'
                className='sparkery-inspection-filter-item-label'
              >
                {t('sparkery.inspectionAdmin.filters.layout', {
                  defaultValue: 'Layout',
                })}
              </Text>
              <Segmented
                value={archiveFilters.layout}
                options={[
                  {
                    value: 'list',
                    label: t('sparkery.inspectionAdmin.filters.layoutList', {
                      defaultValue: 'List',
                    }),
                  },
                  {
                    value: 'board',
                    label: t('sparkery.inspectionAdmin.filters.layoutBoard', {
                      defaultValue: 'Board',
                    }),
                  },
                ]}
                onChange={value =>
                  updateArchiveFilter({
                    layout: value as ArchiveLayoutMode,
                  })
                }
              />
            </div>
            <div className='sparkery-inspection-filter-item sparkery-inspection-filter-item-toggle'>
              <Text
                type='secondary'
                className='sparkery-inspection-filter-item-label'
              >
                {t('sparkery.inspectionAdmin.filters.scope', {
                  defaultValue: 'Scope',
                })}
              </Text>
              <Space>
                <Switch
                  checked={archiveFilters.oneOffOnly}
                  onChange={checked =>
                    updateArchiveFilter({ oneOffOnly: checked })
                  }
                />
                <Text>
                  {t('sparkery.inspectionAdmin.filters.oneOffOnly', {
                    defaultValue: 'One-off only',
                  })}
                </Text>
              </Space>
            </div>
            <div className='sparkery-inspection-filter-item'>
              <Text
                type='secondary'
                className='sparkery-inspection-filter-item-label'
              >
                {t('sparkery.inspectionAdmin.filters.quickFilter', {
                  defaultValue: 'Quick Filter',
                })}
              </Text>
              <Segmented
                value={archiveFilters.quickChip}
                options={[
                  {
                    value: 'all',
                    label: t('sparkery.inspectionAdmin.filters.quickAll', {
                      defaultValue: 'All',
                    }),
                  },
                  {
                    value: 'needs_attention',
                    label: t(
                      'sparkery.inspectionAdmin.filters.quickAttention',
                      {
                        defaultValue: 'Needs Attention',
                      }
                    ),
                  },
                  {
                    value: 'stale_48h',
                    label: t('sparkery.inspectionAdmin.filters.quickStale', {
                      defaultValue: 'Stale 48h+',
                    }),
                  },
                  {
                    value: 'no_assignee',
                    label: t(
                      'sparkery.inspectionAdmin.filters.quickNoAssignee',
                      {
                        defaultValue: 'No Assignee',
                      }
                    ),
                  },
                ]}
                onChange={value =>
                  updateArchiveFilter({
                    quickChip: value as ArchiveQuickChip,
                  })
                }
              />
            </div>
            <div className='sparkery-inspection-filter-item'>
              <Text
                type='secondary'
                className='sparkery-inspection-filter-item-label'
              >
                {t('sparkery.inspectionAdmin.filters.cardDensity', {
                  defaultValue: 'Card Density',
                })}
              </Text>
              <Segmented
                value={archiveFilters.density}
                options={[
                  {
                    value: 'comfortable',
                    label: t(
                      'sparkery.inspectionAdmin.filters.densityComfort',
                      {
                        defaultValue: 'Comfortable',
                      }
                    ),
                  },
                  {
                    value: 'compact',
                    label: t(
                      'sparkery.inspectionAdmin.filters.densityCompact',
                      {
                        defaultValue: 'Compact',
                      }
                    ),
                  },
                ]}
                onChange={value =>
                  updateArchiveFilter({
                    density: value as ArchiveDensityMode,
                  })
                }
              />
            </div>
            <div className='sparkery-inspection-filter-item sparkery-inspection-filter-item-toggle'>
              <Text
                type='secondary'
                className='sparkery-inspection-filter-item-label'
              >
                {t('sparkery.inspectionAdmin.filters.selection', {
                  defaultValue: 'Selection',
                })}
              </Text>
              <Checkbox
                indeterminate={someVisibleSelected && !allVisibleSelected}
                checked={allVisibleSelected}
                onChange={event => toggleSelectAllVisible(event.target.checked)}
              >
                {t('sparkery.inspectionAdmin.filters.selectVisible', {
                  defaultValue: 'Select visible',
                })}
              </Checkbox>
            </div>
          </div>
        </Space>
      </Card>

      {selectedArchiveItems.length > 0 ? (
        <Card size='small' className='sparkery-inspection-batch-card'>
          <div className='sparkery-inspection-batch-row'>
            <Text strong>
              {t('sparkery.inspectionAdmin.batch.selectedCount', {
                defaultValue: '{{count}} selected',
                count: selectedArchiveItems.length,
              })}
            </Text>
            <Space wrap>
              <Button
                icon={<LinkOutlined />}
                onClick={() => void handleCopySelectedLinks()}
              >
                {t('sparkery.inspectionAdmin.actions.batchCopyLinks', {
                  defaultValue: 'Copy Links',
                })}
              </Button>
              <Button
                icon={<EyeOutlined />}
                onClick={handleOpenSelectedArchives}
              >
                {t('sparkery.inspectionAdmin.actions.batchOpen', {
                  defaultValue: 'Open Selected',
                })}
              </Button>
              <Popconfirm
                title={t('sparkery.inspectionAdmin.confirm.batchDelete', {
                  defaultValue: 'Delete selected inspections?',
                })}
                onConfirm={() => void handleDeleteSelectedArchives()}
              >
                <Button danger icon={<DeleteOutlined />}>
                  {t('sparkery.inspectionAdmin.actions.batchDelete', {
                    defaultValue: 'Delete Selected',
                  })}
                </Button>
              </Popconfirm>
              <Button onClick={() => setSelectedArchiveIds([])}>
                {t('sparkery.inspectionAdmin.actions.clearSelection', {
                  defaultValue: 'Clear Selection',
                })}
              </Button>
            </Space>
          </div>
        </Card>
      ) : null}

      {isInitialLoading ? (
        <div className='sparkery-inspection-archive-list'>
          {[0, 1, 2].map(index => (
            <Card
              key={`archive-skeleton-${index}`}
              size='small'
              className='sparkery-inspection-archive-card'
            >
              <Skeleton
                active
                title={{ width: '52%' }}
                paragraph={{
                  rows: archiveFilters.density === 'compact' ? 1 : 2,
                }}
              />
            </Card>
          ))}
        </div>
      ) : filteredArchives.length > 0 ? (
        archiveFilters.layout === 'board' ? (
          <div className='sparkery-inspection-board'>
            {archiveBoardColumns.map(column => (
              <Card
                key={column.status}
                size='small'
                className='sparkery-inspection-board-column'
              >
                <div className='sparkery-inspection-board-column-head'>
                  <Tag color={column.meta.color} icon={column.meta.icon}>
                    {column.meta.label}
                  </Tag>
                  <Text type='secondary'>
                    {t('sparkery.inspectionAdmin.labels.count', {
                      defaultValue: '{{count}} items',
                      count: column.items.length,
                    })}
                  </Text>
                </div>
                {column.items.length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={t(
                      'sparkery.inspectionAdmin.empty.noItemsInColumn',
                      {
                        defaultValue: 'No inspections in this status.',
                      }
                    )}
                    className='sparkery-inspection-board-empty'
                  />
                ) : (
                  <div className='sparkery-inspection-board-list'>
                    {column.items.map(item => renderArchiveCard(item, true))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <div className='sparkery-inspection-archive-list'>
            {filteredArchives.map(item => renderArchiveCard(item))}
          </div>
        )
      ) : (
        <Card className='sparkery-inspection-empty-card'>
          <HomeOutlined className='sparkery-inspection-empty-icon' />
          <Title level={4} type='secondary'>
            {archives.length > 0
              ? t('sparkery.inspectionAdmin.empty.noMatches', {
                  defaultValue: 'No inspections match current filters.',
                })
              : t('sparkery.inspectionAdmin.empty.noInspections', {
                  defaultValue: 'No inspections yet.',
                })}
          </Title>
          <Text type='secondary'>
            {archives.length > 0
              ? t('sparkery.inspectionAdmin.empty.tryAdjustingFilters', {
                  defaultValue:
                    'Try adjusting search, date range, or status filters.',
                })
              : t('sparkery.inspectionAdmin.empty.createFirstInspection', {
                  defaultValue:
                    'Create one via Quick Inspection Link or One-off Template Generator.',
                })}
          </Text>
          <Space wrap className='sparkery-inspection-empty-actions'>
            <Button onClick={resetArchiveFilters}>
              {t('sparkery.inspectionAdmin.actions.clearSearchAndFilters', {
                defaultValue: 'Clear Search & Filters',
              })}
            </Button>
            <Button
              icon={<PlusCircleOutlined />}
              onClick={handleOpenOneOffGenerator}
            >
              {t('sparkery.inspectionAdmin.actions.oneOffTemplateGenerator', {
                defaultValue: 'One-off Template Generator',
              })}
            </Button>
          </Space>
        </Card>
      )}
      <Drawer
        title={t('sparkery.inspectionAdmin.drawer.title', {
          defaultValue: 'Inspection Detail',
        })}
        width={480}
        open={Boolean(detailArchive)}
        onClose={handleCloseArchiveDetailDrawer}
        destroyOnClose
      >
        {detailArchive && detailArchiveSummary ? (
          <Space
            direction='vertical'
            className='sparkery-inspection-full-width'
            size={12}
          >
            <Space wrap>
              <Tag
                color={detailArchiveSummary.statusMeta.color}
                icon={detailArchiveSummary.statusMeta.icon}
              >
                {detailArchiveSummary.statusMeta.label}
              </Tag>
              {detailArchiveSummary.isOneOff ? (
                <Tag color='geekblue'>
                  {t('sparkery.inspectionAdmin.labels.oneOff', {
                    defaultValue: 'One-off',
                  })}
                </Tag>
              ) : null}
            </Space>

            <Card size='small' className='sparkery-inspection-drawer-card'>
              <div className='sparkery-inspection-drawer-meta-grid'>
                <div className='sparkery-inspection-drawer-meta-item'>
                  <Text type='secondary'>
                    {t('sparkery.inspectionAdmin.labels.property', {
                      defaultValue: 'Property',
                    })}
                  </Text>
                  <Text strong>
                    {detailArchive.propertyId ||
                      t('sparkery.inspectionAdmin.labels.unnamed', {
                        defaultValue: 'Unnamed',
                      })}
                  </Text>
                </div>
                <div className='sparkery-inspection-drawer-meta-item'>
                  <Text type='secondary'>
                    {t('sparkery.inspectionAdmin.labels.checkOutDate', {
                      defaultValue: 'Check-out',
                    })}
                  </Text>
                  <Text>{detailArchiveSummary.checkOutText}</Text>
                </div>
                <div className='sparkery-inspection-drawer-meta-item'>
                  <Text type='secondary'>
                    {t('sparkery.inspectionAdmin.labels.submittedAt', {
                      defaultValue: 'Submitted',
                    })}
                  </Text>
                  <Text>{detailArchiveSummary.submittedText}</Text>
                </div>
                <div className='sparkery-inspection-drawer-meta-item'>
                  <Text type='secondary'>
                    {t('sparkery.inspectionAdmin.labels.assignedEmployees', {
                      defaultValue: 'Assigned Employees',
                    })}
                  </Text>
                  <Text>
                    {detailArchiveSummary.assignedLabel ||
                      t('sparkery.inspectionAdmin.labels.notSet', {
                        defaultValue: 'Not set',
                      })}
                  </Text>
                </div>
                <div className='sparkery-inspection-drawer-meta-item sparkery-inspection-drawer-meta-item-full'>
                  <Text type='secondary'>
                    {t('sparkery.inspectionAdmin.labels.inspectionId', {
                      defaultValue: 'Inspection ID',
                    })}
                  </Text>
                  <Text code>{detailArchive.id}</Text>
                </div>
                {(detailArchive as any).propertyAddress ? (
                  <div className='sparkery-inspection-drawer-meta-item sparkery-inspection-drawer-meta-item-full'>
                    <Text type='secondary'>
                      {t('sparkery.inspectionAdmin.labels.address', {
                        defaultValue: 'Address',
                      })}
                    </Text>
                    <Text>{(detailArchive as any).propertyAddress}</Text>
                  </div>
                ) : null}
              </div>
            </Card>

            <Card size='small' className='sparkery-inspection-drawer-card'>
              <Space wrap>
                <Tag>
                  {t('sparkery.inspectionAdmin.labels.sections', {
                    defaultValue: 'Sections',
                  })}
                  : {detailArchiveSummary.sectionItems.length}
                </Tag>
                <Tag>
                  {t('sparkery.inspectionAdmin.labels.checklist', {
                    defaultValue: 'Checklist',
                  })}
                  : {detailArchiveSummary.completedChecklistCount}/
                  {detailArchiveSummary.checklistCount}
                </Tag>
                <Tag>
                  {t('sparkery.inspectionAdmin.labels.requiredPhotos', {
                    defaultValue: 'Required Photos',
                  })}
                  : {detailArchiveSummary.requiredPhotoCount}
                </Tag>
                <Tag>
                  {t('sparkery.inspectionAdmin.labels.damageReports', {
                    defaultValue: 'Damage Reports',
                  })}
                  : {detailArchiveSummary.damageReportCount}
                </Tag>
              </Space>
              {detailArchiveSummary.sectionItems.length > 0 ? (
                <div className='sparkery-inspection-drawer-section-list'>
                  {detailArchiveSummary.sectionItems
                    .slice(0, 12)
                    .map((section: any, index: number) => {
                      const sectionName =
                        section?.name || section?.nameEn || section?.id;
                      return (
                        <Tag key={`${sectionName}-${index}`}>
                          {sectionName || `Section ${index + 1}`}
                        </Tag>
                      );
                    })}
                </div>
              ) : null}
              {detailArchiveSummary.notePreview ? (
                <>
                  <Divider className='sparkery-inspection-divider-soft' />
                  <Paragraph className='sparkery-inspection-note-text-inline'>
                    {detailArchiveSummary.notePreview}
                  </Paragraph>
                </>
              ) : null}
            </Card>

            <Space wrap>
              <Button
                icon={<EyeOutlined />}
                onClick={() => handleOpen(detailArchive)}
              >
                {t('sparkery.inspectionAdmin.actions.openInspection', {
                  defaultValue: 'Open inspection',
                })}
              </Button>
              <Button
                icon={<LinkOutlined />}
                onClick={() => void handleCopyLink(detailArchive)}
              >
                {t('sparkery.inspectionAdmin.actions.copyLink', {
                  defaultValue: 'Copy link',
                })}
              </Button>
            </Space>
          </Space>
        ) : null}
      </Drawer>

      <Card size='small' className='sparkery-inspection-action-log-card'>
        <div className='sparkery-inspection-action-log-head'>
          <Text strong>
            {t('sparkery.inspectionAdmin.logs.title', {
              defaultValue: 'Operation Center',
            })}
          </Text>
          <Space>
            <Text type='secondary'>
              {t('sparkery.inspectionAdmin.logs.count', {
                defaultValue: '{{count}} recent logs',
                count: archiveActionLogs.length,
              })}
            </Text>
            <Button size='small' onClick={() => setArchiveActionLogs([])}>
              {t('sparkery.inspectionAdmin.actions.clearLogs', {
                defaultValue: 'Clear',
              })}
            </Button>
          </Space>
        </div>
        {archiveActionLogs.length === 0 ? (
          <Text type='secondary'>
            {t('sparkery.inspectionAdmin.logs.empty', {
              defaultValue:
                'No operation logs yet. Refresh, copy/open links, or save a view to generate logs.',
            })}
          </Text>
        ) : (
          <div className='sparkery-inspection-action-log-list'>
            {archiveActionLogs.slice(0, 12).map(log => (
              <div key={log.id} className='sparkery-inspection-action-log-item'>
                <Text className='sparkery-inspection-action-log-type'>
                  {log.type}
                </Text>
                <Text
                  type='secondary'
                  className='sparkery-inspection-action-log-time'
                >
                  {dayjs(log.at).format('MM-DD HH:mm:ss')}
                </Text>
                <Text type='secondary'>{log.detail}</Text>
              </div>
            ))}
          </div>
        )}
      </Card>

      <PropertySettingsModal
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        properties={properties}
        onSave={savePropertiesToStorage}
      />
      <Modal
        title={t('sparkery.inspectionAdmin.oneOffModal.title', {
          defaultValue: 'One-off Inspection Template Generator',
        })}
        open={isOneOffOpen}
        onCancel={() => setIsOneOffOpen(false)}
        onOk={() => {
          void handleCreateOneOffInspection();
        }}
        width={980}
        okText={t('sparkery.inspectionAdmin.oneOffModal.createLink', {
          defaultValue: 'Create Link',
        })}
        okButtonProps={{
          disabled: !oneOffQualityReport.valid || !oneOffGovernanceReport.valid,
        }}
      >
        <Space
          direction='vertical'
          className='sparkery-inspection-full-width'
          size={12}
        >
          <Card size='small'>
            <Space
              direction='vertical'
              className='sparkery-inspection-full-width'
            >
              <Space wrap>
                <Tag color={hasAdvancedOneOffPermission ? 'green' : 'gold'}>
                  {hasAdvancedOneOffPermission
                    ? t('sparkery.inspectionAdmin.labels.advancedEditEnabled', {
                        defaultValue: 'Advanced Edit: Enabled',
                      })
                    : t(
                        'sparkery.inspectionAdmin.labels.advancedEditRestricted',
                        {
                          defaultValue: 'Advanced Edit: Restricted',
                        }
                      )}
                </Tag>
                <Tag>
                  {t('sparkery.inspectionAdmin.labels.currentRole', {
                    defaultValue: 'Role: {{role}}',
                    role: actorRole || 'default',
                  })}
                </Tag>
                <Tag
                  color={
                    oneOffRecommendation?.source === 'cloud'
                      ? 'blue'
                      : 'default'
                  }
                >
                  {t('sparkery.inspectionAdmin.labels.recommendationSource', {
                    defaultValue: 'Recommendation: {{source}}',
                    source: oneOffRecommendation?.source || 'n/a',
                  })}
                </Tag>
              </Space>
              <Alert
                type={oneOffQualityReport.valid ? 'success' : 'warning'}
                showIcon
                message={t(
                  'sparkery.inspectionAdmin.oneOffModal.qualitySummary',
                  {
                    defaultValue:
                      'Quality {{state}} | Sections: {{sections}} | Checklist: {{checklist}} | Required photo: {{photos}}',
                    state: oneOffQualityReport.valid ? 'PASS' : 'BLOCKED',
                    sections: oneOffQualityReport.totalSections,
                    checklist: oneOffQualityReport.totalChecklistItems,
                    photos: oneOffQualityReport.requiredPhotoItems,
                  }
                )}
                description={
                  !oneOffQualityReport.valid ? (
                    <div>
                      {oneOffQualityReport.issues.map(issue => (
                        <Text
                          key={issue.code}
                          type='secondary'
                          className='sparkery-inspection-text-12-block'
                        >
                          - {issue.message}
                        </Text>
                      ))}
                    </div>
                  ) : undefined
                }
              />
              <Alert
                type={oneOffGovernanceReport.valid ? 'success' : 'warning'}
                showIcon
                message={t(
                  'sparkery.inspectionAdmin.oneOffModal.governanceSummary',
                  {
                    defaultValue:
                      'Governance {{state}} | Payload: {{payload}} bytes / {{limit}} bytes',
                    state: oneOffGovernanceReport.valid ? 'PASS' : 'BLOCKED',
                    payload: oneOffGovernanceReport.payloadBytes,
                    limit: DEFAULT_ONE_OFF_GOVERNANCE_POLICY.maxPayloadBytes,
                  }
                )}
                description={
                  !oneOffGovernanceReport.valid ? (
                    <div>
                      {oneOffGovernanceReport.issues.map(issue => (
                        <Text
                          key={issue}
                          type='secondary'
                          className='sparkery-inspection-text-12-block'
                        >
                          - {issue}
                        </Text>
                      ))}
                    </div>
                  ) : undefined
                }
              />
              <Space wrap>
                <Button
                  icon={<CopyOutlined />}
                  onClick={handleCloneHistoryDraft}
                  disabled={oneOffDraftHistory.length === 0}
                >
                  {t('sparkery.inspectionAdmin.actions.duplicateLastDraft', {
                    defaultValue: 'Duplicate Last Draft',
                  })}
                </Button>
                <Select
                  value={oneOffHistoryCloneId || null}
                  onChange={(val: string) => setOneOffHistoryCloneId(val)}
                  allowClear
                  placeholder={t(
                    'sparkery.inspectionAdmin.placeholders.selectDraftToClone',
                    {
                      defaultValue: 'Select draft to clone',
                    }
                  )}
                  style={{ minWidth: 220 }}
                  options={oneOffDraftHistory.map(item => ({
                    value: item.id,
                    label: `${item.name || item.customerName || 'One-off'} • ${dayjs(
                      item.updatedAt
                    ).format('MM-DD HH:mm')}`,
                  }))}
                />
                <Button
                  icon={<HistoryOutlined />}
                  onClick={handleApplyCustomerMemory}
                  disabled={!oneOffMatchedMemory}
                >
                  {t('sparkery.inspectionAdmin.actions.applyCustomerMemory', {
                    defaultValue: 'Apply Customer Memory',
                  })}
                </Button>
                <Button
                  onClick={() => setOneOffPreviewOpen(prev => !prev)}
                  icon={<EyeOutlined />}
                >
                  {oneOffPreviewOpen
                    ? t('sparkery.inspectionAdmin.actions.hidePreview', {
                        defaultValue: 'Hide Preview',
                      })
                    : t('sparkery.inspectionAdmin.actions.showPreview', {
                        defaultValue: 'Show Preview',
                      })}
                </Button>
              </Space>
            </Space>
          </Card>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Text strong>
                {t('sparkery.inspectionAdmin.fields.oneOffName', {
                  defaultValue: 'One-off Name',
                })}
              </Text>
              <Input
                value={oneOffName}
                onChange={e => setOneOffName(e.target.value)}
                placeholder={t(
                  'sparkery.inspectionAdmin.placeholders.oneOffName',
                  {
                    defaultValue: 'e.g. 19 Queen St - One-off Deep Clean',
                  }
                )}
                className='sparkery-inspection-top-4'
              />
            </Col>
            <Col xs={24} md={12}>
              <Text strong>
                {t('sparkery.inspectionAdmin.fields.customerName', {
                  defaultValue: 'Customer Name',
                })}
              </Text>
              <Input
                value={oneOffCustomerName}
                onChange={e => setOneOffCustomerName(e.target.value)}
                placeholder={t(
                  'sparkery.inspectionAdmin.placeholders.customerName',
                  {
                    defaultValue: 'e.g. Brisbane Property Group',
                  }
                )}
                className='sparkery-inspection-top-4'
              />
            </Col>
            <Col xs={24} md={12}>
              <Text strong>
                {t('sparkery.inspectionAdmin.fields.address', {
                  defaultValue: 'Address',
                })}
              </Text>
              <Input
                value={oneOffAddress}
                onChange={e => setOneOffAddress(e.target.value)}
                placeholder={t(
                  'sparkery.inspectionAdmin.placeholders.propertyAddress',
                  {
                    defaultValue: 'e.g. 123 Main St, Brisbane',
                  }
                )}
                className='sparkery-inspection-top-4'
              />
            </Col>
            <Col xs={24} md={8}>
              <Text strong>
                {t('sparkery.inspectionAdmin.fields.cleaningType', {
                  defaultValue: 'Cleaning Type',
                })}
              </Text>
              <Select
                allowClear
                value={oneOffCleaningType}
                placeholder={t(
                  'sparkery.inspectionAdmin.placeholders.selectCleaningType',
                  { defaultValue: 'Select cleaning type' }
                )}
                className='sparkery-inspection-full-width sparkery-inspection-top-4'
                onChange={(val: OneOffCleaningType | undefined) => {
                  setOneOffCleaningType(val);
                  regenerateOneOffTemplate(val, oneOffPropertyType);
                }}
                options={[
                  {
                    value: 'bond_clean',
                    label: t(
                      'sparkery.inspectionAdmin.oneOffModal.cleaningTypes.bond',
                      { defaultValue: 'Bond Clean' }
                    ),
                  },
                  {
                    value: 'routine_clean',
                    label: t(
                      'sparkery.inspectionAdmin.oneOffModal.cleaningTypes.routine',
                      { defaultValue: 'Routine Clean' }
                    ),
                  },
                  {
                    value: 'deep_clean',
                    label: t(
                      'sparkery.inspectionAdmin.oneOffModal.cleaningTypes.deep',
                      { defaultValue: 'Deep Clean' }
                    ),
                  },
                  {
                    value: 'office_clean',
                    label: t(
                      'sparkery.inspectionAdmin.oneOffModal.cleaningTypes.office',
                      { defaultValue: 'Office Clean' }
                    ),
                  },
                  {
                    value: 'airbnb_turnover',
                    label: t(
                      'sparkery.inspectionAdmin.oneOffModal.cleaningTypes.airbnb',
                      { defaultValue: 'Airbnb Turnover' }
                    ),
                  },
                ]}
              />
            </Col>
            <Col xs={24} md={8}>
              <Text strong>
                {t('sparkery.inspectionAdmin.fields.propertyType', {
                  defaultValue: 'Property Type',
                })}
              </Text>
              <Select
                allowClear
                value={oneOffPropertyType}
                placeholder={t(
                  'sparkery.inspectionAdmin.placeholders.selectPropertyType',
                  { defaultValue: 'Select property type' }
                )}
                className='sparkery-inspection-full-width sparkery-inspection-top-4'
                onChange={(val: OneOffPropertyType | undefined) => {
                  setOneOffPropertyType(val);
                  regenerateOneOffTemplate(oneOffCleaningType, val);
                }}
                options={[
                  { value: 'studio', label: 'Studio' },
                  { value: 'apartment_1b1b', label: 'Apartment 1B1B' },
                  { value: 'apartment_2b2b', label: 'Apartment 2B2B' },
                  { value: 'apartment_3b2b', label: 'Apartment 3B2B' },
                  { value: 'house_4b2b', label: 'House 4B2B+' },
                  { value: 'office_small', label: 'Office - Small' },
                  { value: 'office_large', label: 'Office - Large' },
                ]}
              />
            </Col>
            <Col xs={24} md={8}>
              <Text strong>
                {t('sparkery.inspectionAdmin.fields.checkOutDate', {
                  defaultValue: 'Check-out Date',
                })}
              </Text>
              <Input
                type='date'
                value={oneOffCheckOutDate}
                onChange={e => setOneOffCheckOutDate(e.target.value)}
                className='sparkery-inspection-top-4'
              />
            </Col>
            <Col xs={24}>
              <Text strong>
                {t('sparkery.inspectionAdmin.fields.assignedEmployees', {
                  defaultValue: 'Assigned Employees',
                })}
              </Text>
              <Select
                mode='multiple'
                allowClear
                value={oneOffEmployeeIds}
                onChange={(vals: string[]) => setOneOffEmployeeIds(vals)}
                className='sparkery-inspection-full-width sparkery-inspection-top-4'
                placeholder={t(
                  'sparkery.inspectionAdmin.placeholders.optional',
                  {
                    defaultValue: 'Optional',
                  }
                )}
              >
                {employees.map(emp => (
                  <Option key={emp.id} value={emp.id}>
                    {emp.name}
                    {emp.nameEn ? ` (${emp.nameEn})` : ''}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={24}>
              <Text strong>
                {t('sparkery.inspectionAdmin.fields.propertyNotesChinese', {
                  defaultValue: 'Property Notes (Chinese)',
                })}
              </Text>
              <Input.TextArea
                rows={3}
                value={oneOffNotesZh}
                onChange={e => setOneOffNotesZh(e.target.value)}
                className='sparkery-inspection-top-4'
              />
            </Col>
            <Col xs={24}>
              <Text strong>
                {t('sparkery.inspectionAdmin.fields.propertyNotesEnglish', {
                  defaultValue: 'Property Notes (English)',
                })}
              </Text>
              <Input.TextArea
                rows={3}
                value={oneOffNotes}
                onChange={e => setOneOffNotes(e.target.value)}
                className='sparkery-inspection-top-4'
              />
            </Col>
          </Row>

          <Card
            size='small'
            title={t(
              'sparkery.inspectionAdmin.oneOffModal.recommendationTitle',
              {
                defaultValue: 'Template Recommendations',
              }
            )}
            extra={
              <Button
                size='small'
                loading={oneOffRecommendationLoading}
                onClick={() =>
                  regenerateOneOffTemplate(
                    oneOffCleaningType,
                    oneOffPropertyType
                  )
                }
              >
                {t('sparkery.inspectionAdmin.actions.refreshRecommendation', {
                  defaultValue: 'Refresh baseline',
                })}
              </Button>
            }
          >
            <Space
              direction='vertical'
              className='sparkery-inspection-full-width'
            >
              {oneOffRecommendation?.notes?.length ? (
                <div>
                  {oneOffRecommendation.notes.map(note => (
                    <Text
                      key={note}
                      type='secondary'
                      className='sparkery-inspection-text-12-block'
                    >
                      - {note}
                    </Text>
                  ))}
                </div>
              ) : null}
              {oneOffRecommendation?.recommendedBundleIds?.length ? (
                <Space wrap>
                  {oneOffRecommendation.recommendedBundleIds.map(bundleId => (
                    <Tag key={bundleId} color='blue'>
                      {bundleId}
                    </Tag>
                  ))}
                </Space>
              ) : null}
              <Space wrap>
                <Button
                  onClick={() => {
                    const nextSections =
                      oneOffRecommendation?.recommendedSectionIds || [];
                    if (nextSections.length === 0) {
                      return;
                    }
                    setOneOffSectionIds(nextSections);
                    setOneOffChecklists(
                      buildOneOffChecklistDraftMap(nextSections)
                    );
                  }}
                  disabled={
                    oneOffRecommendationLoading ||
                    !oneOffRecommendation?.recommendedSectionIds?.length
                  }
                >
                  {t(
                    'sparkery.inspectionAdmin.actions.applyRecommendedSections',
                    {
                      defaultValue: 'Apply recommended sections',
                    }
                  )}
                </Button>
                <Select
                  value={oneOffSelectedBundleId || null}
                  onChange={(val: OneOffSectionBundleId) =>
                    setOneOffSelectedBundleId(val)
                  }
                  allowClear
                  placeholder={t(
                    'sparkery.inspectionAdmin.placeholders.selectSectionBundle',
                    { defaultValue: 'Select bundle macro' }
                  )}
                  style={{ minWidth: 260 }}
                  options={ONE_OFF_SECTION_BUNDLES.map(bundle => ({
                    value: bundle.id,
                    label: bundle.label,
                  }))}
                />
                <Button
                  onClick={() =>
                    oneOffSelectedBundleId &&
                    handleApplyOneOffBundle(oneOffSelectedBundleId)
                  }
                  disabled={!oneOffSelectedBundleId}
                >
                  {t('sparkery.inspectionAdmin.actions.applyBundle', {
                    defaultValue: 'Apply bundle',
                  })}
                </Button>
                <Button
                  danger
                  onClick={() =>
                    oneOffSelectedBundleId &&
                    handleRemoveOneOffBundle(oneOffSelectedBundleId)
                  }
                  disabled={!oneOffSelectedBundleId}
                >
                  {t('sparkery.inspectionAdmin.actions.removeBundle', {
                    defaultValue: 'Remove bundle',
                  })}
                </Button>
              </Space>
              <Text
                type='secondary'
                className='sparkery-inspection-text-12-block'
              >
                {t(
                  'sparkery.inspectionAdmin.oneOffModal.recommendationGovernance',
                  {
                    defaultValue:
                      'Recommended governance cap: {{section}} sections / {{item}} items per section',
                    section:
                      oneOffRecommendation?.governance?.maxSections ||
                      DEFAULT_ONE_OFF_GOVERNANCE_POLICY.maxSections,
                    item:
                      oneOffRecommendation?.governance
                        ?.maxChecklistItemsPerSection ||
                      DEFAULT_ONE_OFF_GOVERNANCE_POLICY.maxChecklistItemsPerSection,
                  }
                )}
              </Text>
              {oneOffDriftInsight.sampleCount > 0 ? (
                <Text
                  type='secondary'
                  className='sparkery-inspection-text-12-block'
                >
                  {t('sparkery.inspectionAdmin.oneOffModal.driftHint', {
                    defaultValue:
                      'Drift insight: {{count}} submitted one-off reports, average drift score {{score}}.',
                    count: oneOffDriftInsight.sampleCount,
                    score: oneOffDriftInsight.averageScore.toFixed(2),
                  })}
                </Text>
              ) : null}
            </Space>
          </Card>

          <Card
            size='small'
            title={t('sparkery.inspectionAdmin.oneOffModal.generatedSections', {
              defaultValue: 'Generated Inspection Sections',
            })}
            extra={
              <Button
                size='small'
                onClick={() =>
                  regenerateOneOffTemplate(
                    oneOffCleaningType,
                    oneOffPropertyType
                  )
                }
              >
                {t('sparkery.inspectionAdmin.actions.regenerateTemplate', {
                  defaultValue: 'Regenerate from selection',
                })}
              </Button>
            }
          >
            <Text type='secondary' className='sparkery-inspection-hint'>
              {t('sparkery.inspectionAdmin.hints.reorderSections', {
                defaultValue: 'Drag the handle to reorder section sequence.',
              })}
            </Text>
            {!hasAdvancedOneOffPermission && (
              <Text
                type='secondary'
                className='sparkery-inspection-text-12-block'
              >
                {t('sparkery.inspectionAdmin.hints.advancedEditRestricted', {
                  defaultValue:
                    'Critical sections and photo-required flags are protected for advanced roles only.',
                })}
              </Text>
            )}
            <div className='sparkery-inspection-chip-row'>
              {oneOffSections.map((section, idx) => {
                const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
                  e.preventDefault();
                  const sourceData = e.dataTransfer.getData('text/plain');
                  if (!sourceData) {
                    return;
                  }
                  const sourceIdxFromData = Number.parseInt(sourceData, 10);
                  const sourceIdx = Number.isNaN(sourceIdxFromData)
                    ? oneOffDragSectionIndexRef.current
                    : sourceIdxFromData;
                  if (sourceIdx === null) {
                    return;
                  }
                  if (sourceIdx !== idx) {
                    handleOneOffSectionReorder(sourceIdx, idx);
                  }
                  oneOffDragSectionIndexRef.current = null;
                  setOneOffDragSectionIndex(null);
                  setOneOffDragOverSectionIndex(null);
                };

                return (
                  <div
                    key={section.id}
                    draggable
                    onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
                      oneOffDragSectionIndexRef.current = idx;
                      setOneOffDragSectionIndex(idx);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', String(idx));
                    }}
                    onDragOver={(e: React.DragEvent<HTMLDivElement>) => {
                      e.preventDefault();
                      setOneOffDragOverSectionIndex(idx);
                    }}
                    onDragEnd={() => {
                      setTimeout(() => {
                        oneOffDragSectionIndexRef.current = null;
                        setOneOffDragSectionIndex(null);
                        setOneOffDragOverSectionIndex(null);
                      }, 0);
                    }}
                    onDrop={handleDrop}
                    className={`sparkery-inspection-draggable-chip${
                      oneOffDragSectionIndex === idx
                        ? ' sparkery-inspection-draggable-chip-dragging'
                        : ''
                    }${
                      oneOffDragOverSectionIndex === idx &&
                      oneOffDragSectionIndex !== idx
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
                          handleOneOffSectionMove(idx, 'up');
                        }}
                      />
                      <Button
                        type='text'
                        size='small'
                        icon={<DownOutlined />}
                        onMouseDown={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleOneOffSectionMove(idx, 'down');
                        }}
                      />
                      <Tag
                        color='blue'
                        closable={
                          hasAdvancedOneOffPermission ||
                          !(
                            getSectionFamilyId(section.id) === 'kitchen' ||
                            getSectionFamilyId(section.id) === 'bathroom' ||
                            getSectionFamilyId(section.id) === 'living-room'
                          )
                        }
                        onClose={e => {
                          e.preventDefault();
                          handleOneOffRemoveSection(section.id);
                        }}
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
            <div className='sparkery-inspection-top-8'>
              <Space wrap>
                <Select
                  value={oneOffOptionalSectionToAdd || null}
                  onChange={(val: string) => setOneOffOptionalSectionToAdd(val)}
                  placeholder={t(
                    'sparkery.inspectionAdmin.placeholders.addSection',
                    {
                      defaultValue: 'Select a section to add',
                    }
                  )}
                  style={{ minWidth: 240 }}
                  options={oneOffSectionAddOptions}
                />
                <Button
                  type='dashed'
                  icon={<PlusOutlined />}
                  onClick={() => {
                    if (!oneOffOptionalSectionToAdd) return;
                    handleOneOffAddSection(oneOffOptionalSectionToAdd);
                  }}
                >
                  {t('sparkery.inspectionAdmin.actions.addSection', {
                    defaultValue: 'Add Section',
                  })}
                </Button>
              </Space>
            </div>
          </Card>

          {oneOffPreviewOpen && (
            <Card
              size='small'
              title={t('sparkery.inspectionAdmin.oneOffModal.previewTitle', {
                defaultValue: 'Inline Report Preview',
              })}
            >
              <Space
                direction='vertical'
                className='sparkery-inspection-full-width'
              >
                <Text strong>
                  {t('sparkery.inspectionAdmin.oneOffModal.previewSummary', {
                    defaultValue:
                      '{{name}} | {{sections}} sections | {{items}} checklist items',
                    name: oneOffName || oneOffCustomerName || 'One-off',
                    sections: oneOffSectionIds.length,
                    items: oneOffQualityReport.totalChecklistItems,
                  })}
                </Text>
                {oneOffSections.map(section => {
                  const items = oneOffChecklists[section.id] || [];
                  return (
                    <div key={`preview-${section.id}`}>
                      <Text strong>{section.name}</Text>
                      <Text
                        type='secondary'
                        className='sparkery-inspection-text-12-block'
                      >
                        {t(
                          'sparkery.inspectionAdmin.oneOffModal.previewChecklistCount',
                          {
                            defaultValue:
                              '{{count}} checklist items ({{photoCount}} require photo)',
                            count: items.length,
                            photoCount: items.filter(item => item.requiredPhoto)
                              .length,
                          }
                        )}
                      </Text>
                    </div>
                  );
                })}
              </Space>
            </Card>
          )}

          <Collapse
            items={oneOffSections.map(section => {
              const checklistItems = oneOffChecklists[section.id] || [];
              const defaultItems =
                DEFAULT_CHECKLISTS[getSectionTypeId(section.id)] || [];

              return {
                key: section.id,
                label: (
                  <Space>
                    <UnorderedListOutlined />
                    {section.name}
                    <Tag>{checklistItems.length}</Tag>
                  </Space>
                ),
                children: (
                  <div>
                    {checklistItems.length === 0 && defaultItems.length > 0 && (
                      <Button
                        size='small'
                        type='dashed'
                        onClick={() =>
                          handleOneOffChecklistUpdate(
                            section.id,
                            buildOneOffChecklistDraftForSection(section.id)
                          )
                        }
                        className='sparkery-inspection-gap-12'
                      >
                        {t(
                          'sparkery.inspectionAdmin.actions.loadDefaultItems',
                          {
                            defaultValue: 'Load default items ({{count}})',
                            count: defaultItems.length,
                          }
                        )}
                      </Button>
                    )}
                    <Space wrap className='sparkery-inspection-gap-12'>
                      <Button
                        size='small'
                        onClick={() =>
                          handleOneOffChecklistBulkAction(
                            section.id,
                            'mark_all_photo'
                          )
                        }
                        disabled={!hasAdvancedOneOffPermission}
                      >
                        {t(
                          'sparkery.inspectionAdmin.actions.bulkMarkPhotoRequired',
                          {
                            defaultValue: 'Bulk: require photo',
                          }
                        )}
                      </Button>
                      <Button
                        size='small'
                        onClick={() =>
                          handleOneOffChecklistBulkAction(
                            section.id,
                            'clear_all_photo'
                          )
                        }
                        disabled={!hasAdvancedOneOffPermission}
                      >
                        {t(
                          'sparkery.inspectionAdmin.actions.bulkClearPhotoRequired',
                          {
                            defaultValue: 'Bulk: clear photo flag',
                          }
                        )}
                      </Button>
                      <Button
                        size='small'
                        onClick={() =>
                          handleOneOffChecklistBulkAction(
                            section.id,
                            'delete_empty'
                          )
                        }
                      >
                        {t('sparkery.inspectionAdmin.actions.bulkDeleteEmpty', {
                          defaultValue: 'Bulk: delete empty',
                        })}
                      </Button>
                      <Button
                        size='small'
                        onClick={() =>
                          handleOneOffChecklistBulkAction(
                            section.id,
                            'sort_label'
                          )
                        }
                      >
                        {t(
                          'sparkery.inspectionAdmin.actions.bulkSortChecklist',
                          {
                            defaultValue: 'Bulk: sort by label',
                          }
                        )}
                      </Button>
                    </Space>
                    {checklistItems.map((item, idx) => (
                      <div
                        key={`${section.id}-${idx}`}
                        className='sparkery-inspection-checklist-item'
                      >
                        <div className='sparkery-inspection-checklist-fields'>
                          <Input
                            size='small'
                            value={item.label}
                            onChange={e => {
                              const updated = [...checklistItems];
                              const current = updated[idx];
                              if (!current) return;
                              updated[idx] = {
                                ...current,
                                label: e.target.value,
                              };
                              handleOneOffChecklistUpdate(section.id, updated);
                            }}
                            placeholder={t(
                              'sparkery.inspectionAdmin.placeholders.chineseLabel',
                              {
                                defaultValue: 'Chinese label',
                              }
                            )}
                          />
                          <Input
                            size='small'
                            value={item.labelEn || ''}
                            onChange={e => {
                              const updated = [...checklistItems];
                              const current = updated[idx];
                              if (!current) return;
                              updated[idx] = {
                                ...current,
                                labelEn: e.target.value,
                              };
                              handleOneOffChecklistUpdate(section.id, updated);
                            }}
                            placeholder={t(
                              'sparkery.inspectionAdmin.placeholders.englishLabel',
                              {
                                defaultValue: 'English',
                              }
                            )}
                          />
                        </div>
                        <Tooltip
                          title={
                            hasAdvancedOneOffPermission
                              ? t(
                                  'sparkery.inspectionAdmin.labels.requiresPhoto',
                                  {
                                    defaultValue: 'Requires photo',
                                  }
                                )
                              : t(
                                  'sparkery.inspectionAdmin.labels.requiresPhotoPermission',
                                  {
                                    defaultValue:
                                      'Advanced role required to edit photo-required flags',
                                  }
                                )
                          }
                        >
                          <Checkbox
                            checked={item.requiredPhoto}
                            disabled={!hasAdvancedOneOffPermission}
                            onChange={e => {
                              const updated = [...checklistItems];
                              const current = updated[idx];
                              if (!current) return;
                              updated[idx] = {
                                ...current,
                                requiredPhoto: e.target.checked,
                              };
                              handleOneOffChecklistUpdate(section.id, updated);
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
                              (_unused, index) => index !== idx
                            );
                            handleOneOffChecklistUpdate(section.id, updated);
                          }}
                        />
                      </div>
                    ))}
                    <Button
                      type='dashed'
                      size='small'
                      icon={<PlusOutlined />}
                      className='sparkery-inspection-full-width sparkery-inspection-top-4'
                      onClick={() => {
                        handleOneOffChecklistUpdate(section.id, [
                          ...checklistItems,
                          { label: '', labelEn: '', requiredPhoto: false },
                        ]);
                      }}
                    >
                      {t('sparkery.inspectionAdmin.actions.addChecklistItem', {
                        defaultValue: 'Add Checklist Item',
                      })}
                    </Button>
                  </div>
                ),
              };
            })}
          />
        </Space>
      </Modal>
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
  const { t } = useTranslation();
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
      messageApi.warning(
        t('sparkery.inspectionAdmin.messages.enterPropertyName', {
          defaultValue: 'Please enter property name',
        })
      );
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
    messageApi.success(
      t('sparkery.inspectionAdmin.messages.propertyAdded', {
        defaultValue: 'Property added',
      })
    );
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
    messageApi.success(
      t('sparkery.inspectionAdmin.messages.sectionAdded', {
        defaultValue: 'Section added',
      })
    );
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
    messageApi.success(
      t('sparkery.inspectionAdmin.messages.officeAreasAdded', {
        defaultValue: 'Office areas added',
      })
    );
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
    messageApi.success(
      t('sparkery.inspectionAdmin.messages.officeAreasRemoved', {
        defaultValue: 'Office areas removed',
      })
    );
  };

  const handleRemoveSection = (propertyId: string, sectionId: string) => {
    Modal.confirm({
      title: t('sparkery.inspectionAdmin.confirm.removeSectionTitle', {
        defaultValue: 'Remove Section',
      }),
      content: t('sparkery.inspectionAdmin.confirm.removeSectionContent', {
        defaultValue:
          'Removing this section will also remove its reference images and checklist. Continue?',
      }),
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
        messageApi.success(
          t('sparkery.inspectionAdmin.messages.sectionRemoved', {
            defaultValue: 'Section removed',
          })
        );
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
    messageApi.success(
      t('sparkery.inspectionAdmin.messages.imageRemoved', {
        defaultValue: 'Image removed',
      })
    );
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
      title: t('sparkery.inspectionAdmin.confirm.deletePropertyTitle', {
        defaultValue: 'Delete Property',
      }),
      content: t('sparkery.inspectionAdmin.confirm.deletePropertyContent', {
        defaultValue: 'Are you sure you want to delete this property?',
      }),
      onOk: () => {
        onSave(properties.filter(p => p.id !== id));
        messageApi.success(
          t('sparkery.inspectionAdmin.messages.propertyDeleted', {
            defaultValue: 'Property deleted',
          })
        );
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
        title={t('sparkery.inspectionAdmin.propertyModal.title', {
          defaultValue: 'Property Template Management',
        })}
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
          {t('sparkery.inspectionAdmin.propertyModal.addProperty', {
            defaultValue: 'Add Property',
          })}
        </Button>

        {properties.length === 0 ? (
          <Empty
            description={t('sparkery.inspectionAdmin.empty.noProperties', {
              defaultValue: 'No properties',
            })}
          />
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
                    {t('sparkery.inspectionAdmin.actions.edit', {
                      defaultValue: 'Edit',
                    })}
                  </Button>
                  <Popconfirm
                    title={t('sparkery.inspectionAdmin.confirm.confirmDelete', {
                      defaultValue: 'Confirm delete?',
                    })}
                    onConfirm={() => handleDelete(prop.id)}
                  >
                    <Button type='text' danger size='small'>
                      {t('sparkery.inspectionAdmin.actions.delete', {
                        defaultValue: 'Delete',
                      })}
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
                    {t('sparkery.inspectionAdmin.labels.notes', {
                      defaultValue: 'Notes',
                    })}
                    :
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
                          alt={t(
                            'sparkery.inspectionAdmin.labels.noteImageAlt',
                            {
                              defaultValue: 'Note {{index}}',
                              index: idx + 1,
                            }
                          )}
                          className='sparkery-inspection-thumb-48'
                          onClick={() =>
                            setPreviewImage({
                              src: img,
                              desc: t(
                                'sparkery.inspectionAdmin.labels.noteImageDesc',
                                {
                                  defaultValue: 'Note image {{index}}',
                                  index: idx + 1,
                                }
                              ),
                            })
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Text strong className='sparkery-inspection-text-12'>
                {t('sparkery.inspectionAdmin.labels.sections', {
                  defaultValue: 'Sections',
                })}
                :{' '}
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
                {t('sparkery.inspectionAdmin.labels.referenceImages', {
                  defaultValue: 'Reference Images',
                })}
                :
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
                            {t('sparkery.inspectionAdmin.empty.noImages', {
                              defaultValue: 'No images',
                            })}
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
                            {images.length > 0
                              ? t('sparkery.inspectionAdmin.actions.addMore', {
                                  defaultValue: 'Add more',
                                })
                              : t(
                                  'sparkery.inspectionAdmin.actions.uploadImage',
                                  {
                                    defaultValue: 'Upload image',
                                  }
                                )}
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
          title={t('sparkery.inspectionAdmin.propertyModal.addProperty', {
            defaultValue: 'Add Property',
          })}
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
              <Text strong>
                {t('sparkery.inspectionAdmin.fields.name', {
                  defaultValue: 'Name',
                })}{' '}
                *
              </Text>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder={t(
                  'sparkery.inspectionAdmin.placeholders.unitName',
                  {
                    defaultValue: 'e.g. UNIT-101',
                  }
                )}
                className='sparkery-inspection-top-4'
              />
            </div>
            <div>
              <Text strong>
                {t('sparkery.inspectionAdmin.fields.address', {
                  defaultValue: 'Address',
                })}
              </Text>
              <Input
                value={newAddress}
                onChange={e => setNewAddress(e.target.value)}
                placeholder={t(
                  'sparkery.inspectionAdmin.placeholders.propertyAddress',
                  {
                    defaultValue: 'e.g. 123 Main St, Brisbane',
                  }
                )}
                className='sparkery-inspection-top-4'
              />
            </div>
            <div>
              <Text strong>
                {t('sparkery.inspectionAdmin.fields.sectionsOptional', {
                  defaultValue: 'Sections (optional)',
                })}
              </Text>
              <Text type='secondary' className='sparkery-inspection-help-text'>
                {t('sparkery.inspectionAdmin.hints.sectionsOptional', {
                  defaultValue:
                    'Base sections are included by default. Add optional areas like Meeting Room and Office Area.',
                })}
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
                  {t('sparkery.inspectionAdmin.actions.addOfficePreset', {
                    defaultValue: 'Add office preset',
                  })}
                </Button>
                <Button
                  size='small'
                  onClick={() => setNewOptionalSectionIds([])}
                >
                  {t('sparkery.inspectionAdmin.actions.clearOptional', {
                    defaultValue: 'Clear optional',
                  })}
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
                {t('sparkery.inspectionAdmin.fields.propertyNotesChinese', {
                  defaultValue: 'Property Notes (Chinese)',
                })}
              </Text>
              <Input.TextArea
                value={newNotesZh}
                onChange={e => setNewNotesZh(e.target.value)}
                placeholder={t(
                  'sparkery.inspectionAdmin.placeholders.notesChinese',
                  {
                    defaultValue:
                      'e.g. Key pickup instructions, lockbox location, entry method, and access code.',
                  }
                )}
                rows={6}
                className='sparkery-inspection-top-4'
              />
              <Text type='secondary' className='sparkery-inspection-text-11'>
                {t('sparkery.inspectionAdmin.hints.notesChinese', {
                  defaultValue:
                    'Chinese notes shown when cleaner uses Chinese UI.',
                })}
              </Text>
              <div className='sparkery-inspection-top-8'>
                <Text strong>
                  <InfoCircleOutlined className='sparkery-inspection-icon-4' />
                  {t('sparkery.inspectionAdmin.fields.propertyNotesEnglish', {
                    defaultValue: 'Property Notes (English)',
                  })}
                </Text>
                <Input.TextArea
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder={t(
                    'sparkery.inspectionAdmin.placeholders.notesEnglish',
                    {
                      defaultValue:
                        'e.g. Key access: lockbox at mailroom, code 3091. Entry: building lobby.',
                    }
                  )}
                  rows={6}
                  className='sparkery-inspection-top-4'
                />
                <Text type='secondary' className='sparkery-inspection-text-11'>
                  {t('sparkery.inspectionAdmin.hints.notesEnglish', {
                    defaultValue:
                      'English version of key pickup, access code, etc. Shown when cleaner switches to English.',
                  })}
                </Text>
              </div>
              <Text
                type='secondary'
                className='sparkery-inspection-bilingual-warning'
              >
                {t('sparkery.inspectionAdmin.hints.fillBothNotes', {
                  defaultValue:
                    'Please fill both Chinese and English notes for bilingual output.',
                })}
              </Text>
              {/* Note images */}
              <div className='sparkery-inspection-top-8'>
                <Text strong className='sparkery-inspection-subtitle'>
                  <CameraOutlined className='sparkery-inspection-icon-4' />
                  {t('sparkery.inspectionAdmin.fields.noteImagesOptional', {
                    defaultValue: 'Note Images (Optional)',
                  })}
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
                          alt={t(
                            'sparkery.inspectionAdmin.labels.noteImageAlt',
                            {
                              defaultValue: 'Note image {{index}}',
                              index: idx + 1,
                            }
                          )}
                          className='sparkery-inspection-note-image-80'
                          onClick={() =>
                            setPreviewImage({
                              src: img,
                              desc: t(
                                'sparkery.inspectionAdmin.labels.noteImageDesc',
                                {
                                  defaultValue: 'Note image {{index}}',
                                  index: idx + 1,
                                }
                              ),
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
                    {t('sparkery.inspectionAdmin.actions.addNoteImages', {
                      defaultValue: 'Add Note Images',
                    })}
                  </Button>
                </Upload>
                <Text type='secondary' className='sparkery-inspection-text-11'>
                  {t('sparkery.inspectionAdmin.hints.noteImages', {
                    defaultValue:
                      'Upload photos of key locations (lockbox, mailroom, entry points, etc.).',
                  })}
                </Text>
              </div>
            </div>
          </Space>
        </Modal>

        <Modal
          title={t('sparkery.inspectionAdmin.propertyModal.editProperty', {
            defaultValue: 'Edit Property: {{name}}',
            name: editingProperty?.name || '',
          })}
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
                  {t('sparkery.inspectionAdmin.sections.propertyInformation', {
                    defaultValue: 'Property Information',
                  })}
                </Title>
                <Row gutter={[12, 12]}>
                  <Col xs={24} sm={12}>
                    <Text strong className='sparkery-inspection-text-12'>
                      {t('sparkery.inspectionAdmin.fields.name', {
                        defaultValue: 'Name',
                      })}{' '}
                      *
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
                      placeholder={t(
                        'sparkery.inspectionAdmin.placeholders.unitName',
                        {
                          defaultValue: 'e.g. UNIT-101',
                        }
                      )}
                      className='sparkery-inspection-top-4'
                    />
                  </Col>
                  <Col xs={24} sm={12}>
                    <Text strong className='sparkery-inspection-text-12'>
                      {t('sparkery.inspectionAdmin.fields.address', {
                        defaultValue: 'Address',
                      })}
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
                      placeholder={t(
                        'sparkery.inspectionAdmin.placeholders.propertyAddress',
                        {
                          defaultValue: 'e.g. 123 Main St, Brisbane',
                        }
                      )}
                      className='sparkery-inspection-top-4'
                    />
                  </Col>
                  <Col xs={24}>
                    <Text strong className='sparkery-inspection-text-12'>
                      <InfoCircleOutlined className='sparkery-inspection-icon-4' />
                      {t(
                        'sparkery.inspectionAdmin.fields.propertyNotesChinese',
                        {
                          defaultValue: 'Property Notes (Chinese)',
                        }
                      )}
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
                      placeholder={t(
                        'sparkery.inspectionAdmin.placeholders.notesChinese',
                        {
                          defaultValue:
                            'e.g. Key pickup instructions, lockbox location, entry method, and access code.',
                        }
                      )}
                      rows={6}
                      className='sparkery-inspection-top-4'
                    />
                    <Text
                      type='secondary'
                      className='sparkery-inspection-text-11'
                    >
                      {t('sparkery.inspectionAdmin.hints.notesChinese', {
                        defaultValue:
                          'Chinese notes shown when cleaner uses Chinese UI.',
                      })}
                    </Text>
                    <div className='sparkery-inspection-top-8'>
                      <Text strong className='sparkery-inspection-text-12'>
                        <InfoCircleOutlined className='sparkery-inspection-icon-4' />
                        {t(
                          'sparkery.inspectionAdmin.fields.propertyNotesEnglish',
                          {
                            defaultValue: 'Property Notes (English)',
                          }
                        )}
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
                        placeholder={t(
                          'sparkery.inspectionAdmin.placeholders.notesEnglishShort',
                          {
                            defaultValue:
                              'e.g. Key access: lockbox at mailroom, code 3091.',
                          }
                        )}
                        rows={6}
                        className='sparkery-inspection-top-4'
                      />
                      <Text
                        type='secondary'
                        className='sparkery-inspection-text-11'
                      >
                        {t('sparkery.inspectionAdmin.hints.notesEnglishShort', {
                          defaultValue:
                            'English version shown when language is set to English.',
                        })}
                      </Text>
                    </div>
                    <Text
                      type='secondary'
                      className='sparkery-inspection-bilingual-warning'
                    >
                      {t('sparkery.inspectionAdmin.hints.fillBothNotes', {
                        defaultValue:
                          'Please fill both Chinese and English notes for bilingual output.',
                      })}
                    </Text>
                    {/* Note images (edit mode) */}
                    <div className='sparkery-inspection-top-8'>
                      <Text strong className='sparkery-inspection-subtitle'>
                        <CameraOutlined className='sparkery-inspection-icon-4' />
                        {t('sparkery.inspectionAdmin.fields.noteImages', {
                          defaultValue: 'Note Images',
                        })}
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
                                  alt={t(
                                    'sparkery.inspectionAdmin.labels.noteImageAlt',
                                    {
                                      defaultValue: 'Note image {{index}}',
                                      index: idx + 1,
                                    }
                                  )}
                                  className='sparkery-inspection-note-image-100'
                                  onClick={() =>
                                    setPreviewImage({
                                      src: img,
                                      desc: t(
                                        'sparkery.inspectionAdmin.labels.noteImageDesc',
                                        {
                                          defaultValue: 'Note image {{index}}',
                                          index: idx + 1,
                                        }
                                      ),
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
                          {t('sparkery.inspectionAdmin.actions.addNoteImages', {
                            defaultValue: 'Add Note Images',
                          })}
                        </Button>
                      </Upload>
                      <Text
                        type='secondary'
                        className='sparkery-inspection-help-text'
                      >
                        {t('sparkery.inspectionAdmin.hints.noteImages', {
                          defaultValue:
                            'Upload photos of key locations (lockbox, mailroom, entry points, etc.).',
                        })}
                      </Text>
                    </div>
                  </Col>
                </Row>
              </Card>

              <Divider className='sparkery-inspection-divider' />

              <Title level={5}>
                {t('sparkery.inspectionAdmin.sections.inspectionSections', {
                  defaultValue: 'Inspection Sections',
                })}
              </Title>
              <Text type='secondary' className='sparkery-inspection-hint'>
                {t('sparkery.inspectionAdmin.hints.reorderSections', {
                  defaultValue: 'Drag the handle to reorder section sequence.',
                })}
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
              <Title level={5}>
                {t('sparkery.inspectionAdmin.sections.optionalSections', {
                  defaultValue: 'Optional Sections',
                })}
              </Title>
              <div className='sparkery-inspection-gap-8'>
                <Space>
                  <Button
                    size='small'
                    icon={<PlusOutlined />}
                    onClick={() =>
                      handleApplyOfficeSections(editingProperty.id)
                    }
                  >
                    {t('sparkery.inspectionAdmin.actions.addOfficeAreas', {
                      defaultValue: 'Add Office Areas',
                    })}
                  </Button>
                  <Button
                    size='small'
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() =>
                      handleRemoveOfficeSectionsPreset(editingProperty.id)
                    }
                  >
                    {t('sparkery.inspectionAdmin.actions.removeOfficeAreas', {
                      defaultValue: 'Remove Office Areas',
                    })}
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
                    {t('sparkery.inspectionAdmin.empty.allOptionalAdded', {
                      defaultValue: 'All optional sections have been added',
                    })}
                  </Text>
                )}
              </div>

              <Divider />

              {/* Checklist Template Editor */}
              <Title level={5}>
                <CheckSquareOutlined className='sparkery-inspection-icon-8' />
                {t('sparkery.inspectionAdmin.sections.checklistTemplates', {
                  defaultValue: 'Checklist Templates',
                })}
              </Title>
              <Text
                type='secondary'
                className='sparkery-inspection-hint-compact'
              >
                {t('sparkery.inspectionAdmin.hints.checklistTemplates', {
                  defaultValue:
                    'Customize checklist items by section. Items with camera icon require photo capture.',
                })}
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
                            ? t('sparkery.inspectionAdmin.labels.itemsCount', {
                                defaultValue: '{{count}} items',
                                count: checklistItems.length,
                              })
                            : t(
                                'sparkery.inspectionAdmin.labels.usingDefaults',
                                {
                                  defaultValue: 'Using defaults',
                                }
                              )}
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
                            {t(
                              'sparkery.inspectionAdmin.actions.loadDefaultItems',
                              {
                                defaultValue: 'Load default items ({{count}})',
                                count: defaultItems.length,
                              }
                            )}
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
                                placeholder={t(
                                  'sparkery.inspectionAdmin.placeholders.chineseLabel',
                                  {
                                    defaultValue: 'Chinese label',
                                  }
                                )}
                                prefix={
                                  <Text
                                    type='secondary'
                                    className='sparkery-inspection-text-10'
                                  >
                                    {t(
                                      'sparkery.inspectionAdmin.labels.chineseAbbr',
                                      {
                                        defaultValue: 'CN',
                                      }
                                    )}
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
                                placeholder={t(
                                  'sparkery.inspectionAdmin.placeholders.englishLabel',
                                  {
                                    defaultValue: 'English',
                                  }
                                )}
                                prefix={
                                  <Text
                                    type='secondary'
                                    className='sparkery-inspection-text-10'
                                  >
                                    {t(
                                      'sparkery.inspectionAdmin.labels.englishAbbr',
                                      {
                                        defaultValue: 'EN',
                                      }
                                    )}
                                  </Text>
                                }
                              />
                            </div>
                            <Tooltip
                              title={t(
                                'sparkery.inspectionAdmin.labels.requiresPhoto',
                                {
                                  defaultValue: 'Requires photo',
                                }
                              )}
                            >
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
                          {t(
                            'sparkery.inspectionAdmin.actions.addChecklistItem',
                            {
                              defaultValue: 'Add Checklist Item',
                            }
                          )}
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
                alt={t('sparkery.inspectionAdmin.labels.preview', {
                  defaultValue: 'Preview',
                })}
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
  const { t } = useTranslation();
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
      messageApi.warning(
        t('sparkery.inspectionAdmin.messages.enterEmployeeName', {
          defaultValue: 'Please enter employee name',
        })
      );
      return;
    }
    const newEmp = buildEmployeeFromForm(`emp-${generateId()}`);
    onSave([...employees, newEmp]);
    setIsAddOpen(false);
    resetForm();
    messageApi.success(
      t('sparkery.inspectionAdmin.messages.employeeAdded', {
        defaultValue: 'Employee added',
      })
    );
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
    messageApi.success(
      t('sparkery.inspectionAdmin.messages.employeeUpdated', {
        defaultValue: 'Employee updated',
      })
    );
  };

  /** Delete an employee */
  const handleDelete = (id: string) => {
    Modal.confirm({
      title: t('sparkery.inspectionAdmin.confirm.confirmDelete', {
        defaultValue: 'Confirm Delete',
      }),
      content: t('sparkery.inspectionAdmin.confirm.deleteEmployeeContent', {
        defaultValue: 'Are you sure you want to delete this employee?',
      }),
      onOk: () => {
        onSave(employees.filter(e => e.id !== id));
        messageApi.success(
          t('sparkery.inspectionAdmin.messages.employeeDeleted', {
            defaultValue: 'Employee deleted',
          })
        );
      },
    });
  };

  return (
    <>
      <Modal
        title={t('sparkery.inspectionAdmin.employeeModal.title', {
          defaultValue: 'Employee Management',
        })}
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
          {t('sparkery.inspectionAdmin.employeeModal.addEmployee', {
            defaultValue: 'Add Employee',
          })}
        </Button>

        {employees.length === 0 ? (
          <Empty
            description={t('sparkery.inspectionAdmin.empty.noEmployees', {
              defaultValue: 'No employees',
            })}
          />
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
                    {t('sparkery.inspectionAdmin.actions.edit', {
                      defaultValue: 'Edit',
                    })}
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
                  {t('sparkery.inspectionAdmin.fields.phone', {
                    defaultValue: 'Phone',
                  })}
                  : {emp.phone}
                </Text>
              )}
              {emp.notes && (
                <Text
                  type='secondary'
                  className='sparkery-inspection-text-12-block'
                >
                  {t('sparkery.inspectionAdmin.fields.notes', {
                    defaultValue: 'Notes',
                  })}
                  : {emp.notes}
                </Text>
              )}
            </Card>
          ))
        )}

        {/* Add Employee Modal */}
        <Modal
          title={t('sparkery.inspectionAdmin.employeeModal.addEmployee', {
            defaultValue: 'Add Employee',
          })}
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
              <Text strong>
                {t('sparkery.inspectionAdmin.fields.name', {
                  defaultValue: 'Name',
                })}{' '}
                *
              </Text>
              <Input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder={t(
                  'sparkery.inspectionAdmin.placeholders.employeeName',
                  {
                    defaultValue: 'e.g. Zhang San',
                  }
                )}
                className='sparkery-inspection-top-4'
              />
            </div>
            <div>
              <Text strong>
                {t('sparkery.inspectionAdmin.fields.englishName', {
                  defaultValue: 'English Name',
                })}
              </Text>
              <Input
                value={formNameEn}
                onChange={e => setFormNameEn(e.target.value)}
                placeholder={t(
                  'sparkery.inspectionAdmin.placeholders.employeeName',
                  {
                    defaultValue: 'e.g. Zhang San',
                  }
                )}
                className='sparkery-inspection-top-4'
              />
            </div>
            <div>
              <Text strong>
                {t('sparkery.inspectionAdmin.fields.phone', {
                  defaultValue: 'Phone',
                })}
              </Text>
              <Input
                value={formPhone}
                onChange={e => setFormPhone(e.target.value)}
                placeholder={t('sparkery.inspectionAdmin.placeholders.phone', {
                  defaultValue: 'e.g. 0412345678',
                })}
                className='sparkery-inspection-top-4'
              />
            </div>
            <div>
              <Text strong>
                {t('sparkery.inspectionAdmin.fields.notes', {
                  defaultValue: 'Notes',
                })}
              </Text>
              <Input.TextArea
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                placeholder={t(
                  'sparkery.inspectionAdmin.placeholders.optionalNotes',
                  {
                    defaultValue: 'Optional notes...',
                  }
                )}
                rows={2}
                className='sparkery-inspection-top-4'
              />
            </div>
          </Space>
        </Modal>

        {/* Edit Employee Modal */}
        <Modal
          title={t('sparkery.inspectionAdmin.employeeModal.editEmployee', {
            defaultValue: 'Edit Employee',
          })}
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
              <Text strong>
                {t('sparkery.inspectionAdmin.fields.name', {
                  defaultValue: 'Name',
                })}{' '}
                *
              </Text>
              <Input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder={t(
                  'sparkery.inspectionAdmin.placeholders.employeeName',
                  {
                    defaultValue: 'e.g. Zhang San',
                  }
                )}
                className='sparkery-inspection-top-4'
              />
            </div>
            <div>
              <Text strong>
                {t('sparkery.inspectionAdmin.fields.englishName', {
                  defaultValue: 'English Name',
                })}
              </Text>
              <Input
                value={formNameEn}
                onChange={e => setFormNameEn(e.target.value)}
                placeholder={t(
                  'sparkery.inspectionAdmin.placeholders.employeeName',
                  {
                    defaultValue: 'e.g. Zhang San',
                  }
                )}
                className='sparkery-inspection-top-4'
              />
            </div>
            <div>
              <Text strong>
                {t('sparkery.inspectionAdmin.fields.phone', {
                  defaultValue: 'Phone',
                })}
              </Text>
              <Input
                value={formPhone}
                onChange={e => setFormPhone(e.target.value)}
                placeholder={t('sparkery.inspectionAdmin.placeholders.phone', {
                  defaultValue: 'e.g. 0412345678',
                })}
                className='sparkery-inspection-top-4'
              />
            </div>
            <div>
              <Text strong>
                {t('sparkery.inspectionAdmin.fields.notes', {
                  defaultValue: 'Notes',
                })}
              </Text>
              <Input.TextArea
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                placeholder={t(
                  'sparkery.inspectionAdmin.placeholders.optionalNotes',
                  {
                    defaultValue: 'Optional notes...',
                  }
                )}
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
