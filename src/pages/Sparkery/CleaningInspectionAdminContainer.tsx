/**
 * Cleaning Inspection Admin Panel - Enhanced with Checklist Templates & Dynamic Sections
 */

import React, { useRef, useState } from 'react';
import {
  Card,
  Typography,
  Button,
  Space,
  Breadcrumb,
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
  Badge,
  FloatButton,
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
  DownloadOutlined,
  LeftOutlined,
  RightOutlined,
  QuestionCircleOutlined,
  PushpinOutlined,
  PushpinFilled,
  StarOutlined,
  StarFilled,
  CheckOutlined,
  TagsOutlined,
  FilterOutlined,
  VerticalAlignTopOutlined,
  VerticalAlignBottomOutlined,
  SwapOutlined,
  ThunderboltOutlined,
  BellOutlined,
  PlayCircleOutlined,
  BulbOutlined,
  ReadOutlined,
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
const INSPECTION_ARCHIVE_FIELD_VISIBILITY_STORAGE_KEY =
  'sparkery_inspection_archive_fields_v1';
const INSPECTION_ARCHIVE_BOARD_COLLAPSE_STORAGE_KEY =
  'sparkery_inspection_archive_board_collapse_v1';
const INSPECTION_ARCHIVE_BOARD_ORDER_STORAGE_KEY =
  'sparkery_inspection_archive_board_order_v1';
const INSPECTION_ARCHIVE_BOARD_HIDDEN_STORAGE_KEY =
  'sparkery_inspection_archive_board_hidden_v1';
const INSPECTION_ARCHIVE_REFRESH_INTERVAL_STORAGE_KEY =
  'sparkery_inspection_archive_refresh_interval_v1';
const INSPECTION_ARCHIVE_ADVANCED_FILTER_STORAGE_KEY =
  'sparkery_inspection_archive_advanced_filter_v1';
const INSPECTION_ARCHIVE_VIEW_PINNED_STORAGE_KEY =
  'sparkery_inspection_archive_view_pinned_v1';
const INSPECTION_ARCHIVE_CARD_META_STORAGE_KEY =
  'sparkery_inspection_archive_card_meta_v1';
const INSPECTION_ARCHIVE_UI_PREFS_STORAGE_KEY =
  'sparkery_inspection_archive_ui_prefs_v1';
const INSPECTION_ARCHIVE_RECENT_FILTER_HISTORY_STORAGE_KEY =
  'sparkery_inspection_archive_recent_filter_history_v1';
const INSPECTION_ARCHIVE_LAST_SESSION_STORAGE_KEY =
  'sparkery_inspection_archive_last_session_v1';
const INSPECTION_ARCHIVE_DRAWER_WIDTH_STORAGE_KEY =
  'sparkery_inspection_archive_drawer_width_v1';
const INSPECTION_ARCHIVE_FAVORITE_ACTIONS_STORAGE_KEY =
  'sparkery_inspection_archive_favorite_actions_v1';
const INSPECTION_ARCHIVE_SEARCH_HISTORY_STORAGE_KEY =
  'sparkery_inspection_archive_search_history_v1';
const INSPECTION_ARCHIVE_OPS_INBOX_READ_AT_STORAGE_KEY =
  'sparkery_inspection_archive_ops_inbox_read_at_v1';
const INSPECTION_ARCHIVE_SEARCH_TEXT_STORAGE_KEY =
  'sparkery_inspection_archive_search_text_v1';
const INSPECTION_ARCHIVE_MODULE_ORDER_STORAGE_KEY =
  'sparkery_inspection_archive_module_order_v1';
const INSPECTION_ARCHIVE_MODULE_HIDDEN_STORAGE_KEY =
  'sparkery_inspection_archive_module_hidden_v1';
const INSPECTION_ARCHIVE_MODULE_FAVORITES_STORAGE_KEY =
  'sparkery_inspection_archive_module_favorites_v1';
const INSPECTION_ARCHIVE_LAYOUT_PRESETS_STORAGE_KEY =
  'sparkery_inspection_archive_layout_presets_v1';
const INSPECTION_ARCHIVE_NIGHT_REVIEW_MODE_STORAGE_KEY =
  'sparkery_inspection_archive_night_review_mode_v1';
const INSPECTION_ARCHIVE_RECENT_OPENED_STORAGE_KEY =
  'sparkery_inspection_archive_recent_opened_v1';
const INSPECTION_ARCHIVE_RESULTS_GROUP_BY_STORAGE_KEY =
  'sparkery_inspection_archive_results_group_by_v1';
const INSPECTION_ARCHIVE_PRIORITY_MODE_STORAGE_KEY =
  'sparkery_inspection_archive_priority_mode_v1';
const INSPECTION_ARCHIVE_VIEWS_STORAGE_KEY =
  'sparkery_inspection_archive_views_v1';
const INSPECTION_ARCHIVE_ACTION_LOG_STORAGE_KEY =
  'sparkery_inspection_archive_action_logs_v1';
const INSPECTION_ARCHIVE_QUERY_PREFIX = 'insp_';
const MAX_ARCHIVE_VIEWS = 12;
const MAX_ARCHIVE_ACTION_LOGS = 50;
const MAX_ARCHIVE_FILTER_HISTORY = 10;
const MAX_ARCHIVE_SEARCH_HISTORY = 12;
const MAX_ARCHIVE_LAYOUT_PRESETS = 8;
const MAX_ARCHIVE_RECENT_OPENED = 14;
const ONE_OFF_MAX_SESSION_DRAFTS = 8;
const ONE_OFF_ADVANCED_ROLE_SET = new Set(['admin', 'owner', 'ops_manager']);
const ARCHIVE_REFRESH_INTERVAL_OPTIONS = [0, 15, 30, 60] as const;

type ArchiveStatusFilter = 'all' | 'pending' | 'in_progress' | 'submitted';
type ArchiveSortMode =
  | 'latest'
  | 'oldest'
  | 'check_out_latest'
  | 'check_out_oldest';
type ArchiveDensityMode = 'comfortable' | 'compact' | 'dense';
type ArchiveLayoutMode = 'list' | 'board';
type ArchiveResultsGroupBy = 'none' | 'status' | 'assignee' | 'date';
type ArchiveQuickChip =
  | 'all'
  | 'needs_attention'
  | 'stale_48h'
  | 'no_assignee'
  | 'due_today'
  | 'overdue'
  | 'missing_required_photos';
type ArchiveSearchMode = 'smart' | 'and' | 'or';
type ArchivePriorityMode = 'off' | 'soft' | 'hard';

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
type ArchiveAdvancedFilterState = {
  myAssignmentsOnly: boolean;
  myAssignmentKeyword: string;
  excludeStatus: ArchiveStatusFilter | 'none';
  missingAddressOnly: boolean;
  missingDateOnly: boolean;
  missingAssigneeOnly: boolean;
  searchMode: ArchiveSearchMode;
};
type ArchiveFieldVisibilityState = {
  showDates: boolean;
  showAddress: boolean;
  showAssignee: boolean;
  showId: boolean;
};
type ArchiveBoardCollapseState = Record<InspectionArchive['status'], boolean>;
type ArchiveCardMetaState = {
  pinnedIds: string[];
  starredIds: string[];
  reviewedIds: string[];
  tagByArchiveId: Record<string, string[]>;
};
type ArchiveUiPrefsState = {
  colorBlindMode: boolean;
  highContrastFocus: boolean;
  fontScale: 'normal' | 'large';
  screenReaderCompact: boolean;
  reduceMotion: boolean;
  spacing: 'normal' | 'tight';
};
const ARCHIVE_MODULE_IDS = [
  'workspace',
  'system_health',
  'quick_start',
  'today_focus',
  'overview',
  'ui_preferences',
  'quick_actions',
  'search',
  'batch',
  'results',
  'logs',
] as const;
type ArchiveModuleId = (typeof ARCHIVE_MODULE_IDS)[number];
type ArchiveLayoutPreset = {
  id: string;
  name: string;
  moduleOrder: ArchiveModuleId[];
  hiddenModules: ArchiveModuleId[];
  favoriteModules: ArchiveModuleId[];
  nightReviewMode: boolean;
  updatedAt: string;
};
type ParsedArchiveSearch = {
  freeTokens: string[];
  fieldTokens: {
    status?: ArchiveStatusFilter;
    assignee: string[];
    id: string[];
    tag: string[];
    address: string[];
    customer: string[];
    oneOff: boolean | null;
  };
};

type ArchiveRefreshSource =
  | 'initial'
  | 'manual'
  | 'auto_focus'
  | 'auto_interval';

type UiQuickActionId =
  | 'new_one_off'
  | 'refresh_archive'
  | 'focus_search'
  | 'save_snapshot'
  | 'restore_session'
  | 'open_shortcuts'
  | 'open_filters_drawer'
  | 'open_ops_inbox'
  | 'open_ui_tour'
  | 'toggle_filter_collapse'
  | 'export_filtered_csv'
  | 'export_logs_csv'
  | 'copy_selected_links'
  | 'copy_selected_ids'
  | 'select_visible'
  | 'invert_visible_selection';

type UiQuickAction = {
  id: UiQuickActionId;
  label: string;
  hint: string;
  keywords: string[];
};

type ArchiveViewPreset = {
  id: string;
  name: string;
  searchText: string;
  filters: ArchiveFilterState;
  advancedFilters: ArchiveAdvancedFilterState;
  fieldVisibility: ArchiveFieldVisibilityState;
  createdAt: string;
  updatedAt: string;
};

type ArchiveActionLog = {
  id: string;
  at: string;
  type: string;
  detail: string;
};
type ArchiveFilterHistoryEntry = {
  id: string;
  at: string;
  searchText: string;
  filters: ArchiveFilterState;
  advancedFilters: ArchiveAdvancedFilterState;
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

const ARCHIVE_DENSITY_MODES: ArchiveDensityMode[] = [
  'comfortable',
  'compact',
  'dense',
];
const ARCHIVE_LAYOUT_MODES: ArchiveLayoutMode[] = ['list', 'board'];
const ARCHIVE_RESULTS_GROUP_BY_OPTIONS: ArchiveResultsGroupBy[] = [
  'none',
  'status',
  'assignee',
  'date',
];
const ARCHIVE_PRIORITY_MODES: ArchivePriorityMode[] = ['off', 'soft', 'hard'];
const ARCHIVE_QUICK_CHIPS: ArchiveQuickChip[] = [
  'all',
  'needs_attention',
  'stale_48h',
  'no_assignee',
  'due_today',
  'overdue',
  'missing_required_photos',
];
const ARCHIVE_BOARD_WIP_LIMITS: Record<InspectionArchive['status'], number> = {
  pending: 20,
  in_progress: 16,
  submitted: 40,
};
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
const DEFAULT_ARCHIVE_ADVANCED_FILTER_STATE: ArchiveAdvancedFilterState = {
  myAssignmentsOnly: false,
  myAssignmentKeyword: '',
  excludeStatus: 'none',
  missingAddressOnly: false,
  missingDateOnly: false,
  missingAssigneeOnly: false,
  searchMode: 'smart',
};
const DEFAULT_ARCHIVE_FIELD_VISIBILITY: ArchiveFieldVisibilityState = {
  showDates: true,
  showAddress: true,
  showAssignee: true,
  showId: true,
};
const DEFAULT_ARCHIVE_BOARD_COLLAPSE_STATE: ArchiveBoardCollapseState = {
  pending: false,
  in_progress: false,
  submitted: false,
};
const DEFAULT_ARCHIVE_CARD_META_STATE: ArchiveCardMetaState = {
  pinnedIds: [],
  starredIds: [],
  reviewedIds: [],
  tagByArchiveId: {},
};
const DEFAULT_ARCHIVE_UI_PREFS_STATE: ArchiveUiPrefsState = {
  colorBlindMode: false,
  highContrastFocus: false,
  fontScale: 'normal',
  screenReaderCompact: false,
  reduceMotion: false,
  spacing: 'normal',
};
const DEFAULT_ARCHIVE_MODULE_ORDER: ArchiveModuleId[] = [...ARCHIVE_MODULE_IDS];

const normalizeArchiveFieldVisibility = (
  value?: Partial<ArchiveFieldVisibilityState> | null
): ArchiveFieldVisibilityState => ({
  showDates:
    typeof value?.showDates === 'boolean'
      ? value.showDates
      : DEFAULT_ARCHIVE_FIELD_VISIBILITY.showDates,
  showAddress:
    typeof value?.showAddress === 'boolean'
      ? value.showAddress
      : DEFAULT_ARCHIVE_FIELD_VISIBILITY.showAddress,
  showAssignee:
    typeof value?.showAssignee === 'boolean'
      ? value.showAssignee
      : DEFAULT_ARCHIVE_FIELD_VISIBILITY.showAssignee,
  showId:
    typeof value?.showId === 'boolean'
      ? value.showId
      : DEFAULT_ARCHIVE_FIELD_VISIBILITY.showId,
});

const normalizeArchiveBoardCollapseState = (
  value?: Partial<Record<string, boolean>> | null
): ArchiveBoardCollapseState => ({
  pending:
    typeof value?.pending === 'boolean'
      ? value.pending
      : DEFAULT_ARCHIVE_BOARD_COLLAPSE_STATE.pending,
  in_progress:
    typeof value?.in_progress === 'boolean'
      ? value.in_progress
      : DEFAULT_ARCHIVE_BOARD_COLLAPSE_STATE.in_progress,
  submitted:
    typeof value?.submitted === 'boolean'
      ? value.submitted
      : DEFAULT_ARCHIVE_BOARD_COLLAPSE_STATE.submitted,
});

const normalizeArchiveAdvancedFilters = (
  value?: Partial<ArchiveAdvancedFilterState> | null
): ArchiveAdvancedFilterState => ({
  myAssignmentsOnly:
    typeof value?.myAssignmentsOnly === 'boolean'
      ? value.myAssignmentsOnly
      : DEFAULT_ARCHIVE_ADVANCED_FILTER_STATE.myAssignmentsOnly,
  myAssignmentKeyword:
    typeof value?.myAssignmentKeyword === 'string'
      ? value.myAssignmentKeyword
      : DEFAULT_ARCHIVE_ADVANCED_FILTER_STATE.myAssignmentKeyword,
  excludeStatus:
    value?.excludeStatus &&
    ['all', 'pending', 'in_progress', 'submitted', 'none'].includes(
      value.excludeStatus
    )
      ? value.excludeStatus
      : DEFAULT_ARCHIVE_ADVANCED_FILTER_STATE.excludeStatus,
  missingAddressOnly:
    typeof value?.missingAddressOnly === 'boolean'
      ? value.missingAddressOnly
      : DEFAULT_ARCHIVE_ADVANCED_FILTER_STATE.missingAddressOnly,
  missingDateOnly:
    typeof value?.missingDateOnly === 'boolean'
      ? value.missingDateOnly
      : DEFAULT_ARCHIVE_ADVANCED_FILTER_STATE.missingDateOnly,
  missingAssigneeOnly:
    typeof value?.missingAssigneeOnly === 'boolean'
      ? value.missingAssigneeOnly
      : DEFAULT_ARCHIVE_ADVANCED_FILTER_STATE.missingAssigneeOnly,
  searchMode:
    value?.searchMode && ['smart', 'and', 'or'].includes(value.searchMode)
      ? value.searchMode
      : DEFAULT_ARCHIVE_ADVANCED_FILTER_STATE.searchMode,
});

const normalizeArchiveCardMetaState = (
  value?: Partial<ArchiveCardMetaState> | null
): ArchiveCardMetaState => ({
  pinnedIds: Array.isArray(value?.pinnedIds)
    ? value.pinnedIds.filter((id): id is string => typeof id === 'string')
    : [],
  starredIds: Array.isArray(value?.starredIds)
    ? value.starredIds.filter((id): id is string => typeof id === 'string')
    : [],
  reviewedIds: Array.isArray(value?.reviewedIds)
    ? value.reviewedIds.filter((id): id is string => typeof id === 'string')
    : [],
  tagByArchiveId:
    value?.tagByArchiveId && typeof value.tagByArchiveId === 'object'
      ? Object.entries(value.tagByArchiveId).reduce(
          (acc, [key, tags]) => {
            if (!Array.isArray(tags)) {
              return acc;
            }
            acc[key] = tags.filter(
              (tag): tag is string =>
                typeof tag === 'string' && tag.trim().length > 0
            );
            return acc;
          },
          {} as Record<string, string[]>
        )
      : {},
});

const normalizeArchiveUiPrefsState = (
  value?: Partial<ArchiveUiPrefsState> | null
): ArchiveUiPrefsState => ({
  colorBlindMode:
    typeof value?.colorBlindMode === 'boolean'
      ? value.colorBlindMode
      : DEFAULT_ARCHIVE_UI_PREFS_STATE.colorBlindMode,
  highContrastFocus:
    typeof value?.highContrastFocus === 'boolean'
      ? value.highContrastFocus
      : DEFAULT_ARCHIVE_UI_PREFS_STATE.highContrastFocus,
  fontScale:
    value?.fontScale && ['normal', 'large'].includes(value.fontScale)
      ? value.fontScale
      : DEFAULT_ARCHIVE_UI_PREFS_STATE.fontScale,
  screenReaderCompact:
    typeof value?.screenReaderCompact === 'boolean'
      ? value.screenReaderCompact
      : DEFAULT_ARCHIVE_UI_PREFS_STATE.screenReaderCompact,
  reduceMotion:
    typeof value?.reduceMotion === 'boolean'
      ? value.reduceMotion
      : DEFAULT_ARCHIVE_UI_PREFS_STATE.reduceMotion,
  spacing:
    value?.spacing && ['normal', 'tight'].includes(value.spacing)
      ? value.spacing
      : DEFAULT_ARCHIVE_UI_PREFS_STATE.spacing,
});

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

const normalizeArchiveModuleOrder = (
  value?: ArchiveModuleId[] | null
): ArchiveModuleId[] => {
  const ordered = Array.isArray(value)
    ? value.filter((item): item is ArchiveModuleId =>
        ARCHIVE_MODULE_IDS.includes(item as ArchiveModuleId)
      )
    : [];
  DEFAULT_ARCHIVE_MODULE_ORDER.forEach(item => {
    if (!ordered.includes(item)) {
      ordered.push(item);
    }
  });
  return ordered;
};

const normalizeArchiveModuleList = (
  value?: ArchiveModuleId[] | null
): ArchiveModuleId[] =>
  Array.isArray(value)
    ? value.filter((item): item is ArchiveModuleId =>
        ARCHIVE_MODULE_IDS.includes(item as ArchiveModuleId)
      )
    : [];

const parseArchiveDateValue = (value: unknown): number => {
  if (typeof value !== 'string' || !value) {
    return 0;
  }
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.valueOf() : 0;
};

const parseArchiveSearchQuery = (rawInput: string): ParsedArchiveSearch => {
  const tokens = rawInput
    .trim()
    .split(/\s+/)
    .map(item => item.trim())
    .filter(Boolean);
  const parsed: ParsedArchiveSearch = {
    freeTokens: [],
    fieldTokens: {
      assignee: [],
      id: [],
      tag: [],
      address: [],
      customer: [],
      oneOff: null,
    },
  };
  tokens.forEach(token => {
    const match = token.match(/^([a-z_]+):(.*)$/i);
    if (!match) {
      parsed.freeTokens.push(token.toLowerCase());
      return;
    }
    const key = (match[1] || '').toLowerCase();
    const value = (match[2] || '').trim().toLowerCase();
    if (!value) {
      parsed.freeTokens.push(token.toLowerCase());
      return;
    }
    if (
      key === 'status' &&
      ['all', 'pending', 'in_progress', 'submitted'].includes(value)
    ) {
      parsed.fieldTokens.status = value as ArchiveStatusFilter;
      return;
    }
    if (key === 'assignee' || key === 'owner' || key === 'employee') {
      parsed.fieldTokens.assignee.push(value);
      return;
    }
    if (key === 'id' || key === 'inspection') {
      parsed.fieldTokens.id.push(value);
      return;
    }
    if (key === 'tag') {
      parsed.fieldTokens.tag.push(value);
      return;
    }
    if (key === 'address') {
      parsed.fieldTokens.address.push(value);
      return;
    }
    if (key === 'customer' || key === 'client') {
      parsed.fieldTokens.customer.push(value);
      return;
    }
    if (key === 'oneoff' || key === 'one_off') {
      if (['yes', 'true', '1'].includes(value)) {
        parsed.fieldTokens.oneOff = true;
        return;
      }
      if (['no', 'false', '0'].includes(value)) {
        parsed.fieldTokens.oneOff = false;
        return;
      }
    }
    parsed.freeTokens.push(token.toLowerCase());
  });
  return parsed;
};

const renderHighlightedText = (
  text: string,
  keyword: string
): React.ReactNode => {
  const tokens = parseArchiveSearchQuery(keyword).freeTokens.slice(0, 8);
  if (tokens.length === 0) {
    return text;
  }
  const escapedTokens = tokens
    .map(token => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .filter(Boolean);
  if (escapedTokens.length === 0) {
    return text;
  }
  const regex = new RegExp(`(${escapedTokens.join('|')})`, 'ig');
  const parts = text.split(regex);
  if (parts.length <= 1) {
    return text;
  }
  return (
    <>
      {parts.map((part, index) =>
        tokens.some(token => token.toLowerCase() === part.toLowerCase()) ? (
          <mark
            key={`hl-${index}-${part}`}
            className='sparkery-inspection-search-mark'
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={`txt-${index}-${part}`}>{part}</React.Fragment>
        )
      )}
    </>
  );
};

const readArchiveFilterQueryState = (): {
  searchText: string;
  filters: Partial<ArchiveFilterState>;
  advancedFilters: Partial<ArchiveAdvancedFilterState>;
  priorityMode: ArchivePriorityMode | null;
} => {
  if (typeof window === 'undefined') {
    return {
      searchText: '',
      filters: {},
      advancedFilters: {},
      priorityMode: null,
    };
  }
  const params = new URLSearchParams(window.location.search);
  const rawOneOff = params.get(`${INSPECTION_ARCHIVE_QUERY_PREFIX}oneoff`);
  const rawPriorityMode = params.get(
    `${INSPECTION_ARCHIVE_QUERY_PREFIX}priority`
  );
  const priorityMode =
    rawPriorityMode &&
    ARCHIVE_PRIORITY_MODES.includes(rawPriorityMode as ArchivePriorityMode)
      ? (rawPriorityMode as ArchivePriorityMode)
      : null;
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
    advancedFilters: {
      ...(params.get(`${INSPECTION_ARCHIVE_QUERY_PREFIX}search_mode`)
        ? {
            searchMode: params.get(
              `${INSPECTION_ARCHIVE_QUERY_PREFIX}search_mode`
            ) as ArchiveSearchMode,
          }
        : {}),
      ...(params.get(`${INSPECTION_ARCHIVE_QUERY_PREFIX}mine`) === '1'
        ? {
            myAssignmentsOnly: true,
          }
        : {}),
      ...(params.get(`${INSPECTION_ARCHIVE_QUERY_PREFIX}mine_key`)
        ? {
            myAssignmentKeyword:
              params.get(`${INSPECTION_ARCHIVE_QUERY_PREFIX}mine_key`) || '',
          }
        : {}),
      ...(params.get(`${INSPECTION_ARCHIVE_QUERY_PREFIX}exclude_status`)
        ? {
            excludeStatus: params.get(
              `${INSPECTION_ARCHIVE_QUERY_PREFIX}exclude_status`
            ) as ArchiveStatusFilter,
          }
        : {}),
      ...(params.get(`${INSPECTION_ARCHIVE_QUERY_PREFIX}missing_addr`) === '1'
        ? {
            missingAddressOnly: true,
          }
        : {}),
      ...(params.get(`${INSPECTION_ARCHIVE_QUERY_PREFIX}missing_date`) === '1'
        ? {
            missingDateOnly: true,
          }
        : {}),
      ...(params.get(`${INSPECTION_ARCHIVE_QUERY_PREFIX}missing_assignee`) ===
      '1'
        ? {
            missingAssigneeOnly: true,
          }
        : {}),
    },
    priorityMode,
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
  const [archiveAdvancedFilters, setArchiveAdvancedFilters] =
    useState<ArchiveAdvancedFilterState>(() => {
      const queryState = readArchiveFilterQueryState();
      const stored = normalizeArchiveAdvancedFilters(
        safeReadLocalJson<Partial<ArchiveAdvancedFilterState>>(
          INSPECTION_ARCHIVE_ADVANCED_FILTER_STORAGE_KEY,
          DEFAULT_ARCHIVE_ADVANCED_FILTER_STATE
        )
      );
      return normalizeArchiveAdvancedFilters({
        ...stored,
        ...queryState.advancedFilters,
      });
    });
  const [archiveFieldVisibility, setArchiveFieldVisibility] =
    useState<ArchiveFieldVisibilityState>(() =>
      normalizeArchiveFieldVisibility(
        safeReadLocalJson<Partial<ArchiveFieldVisibilityState>>(
          INSPECTION_ARCHIVE_FIELD_VISIBILITY_STORAGE_KEY,
          DEFAULT_ARCHIVE_FIELD_VISIBILITY
        )
      )
    );
  const [archiveBoardCollapse, setArchiveBoardCollapse] =
    useState<ArchiveBoardCollapseState>(() =>
      normalizeArchiveBoardCollapseState(
        safeReadLocalJson<Partial<Record<string, boolean>>>(
          INSPECTION_ARCHIVE_BOARD_COLLAPSE_STORAGE_KEY,
          DEFAULT_ARCHIVE_BOARD_COLLAPSE_STATE
        )
      )
    );
  const [archiveBoardStatusOrder, setArchiveBoardStatusOrder] = useState<
    InspectionArchive['status'][]
  >(() => {
    const stored = safeReadLocalJson<InspectionArchive['status'][]>(
      INSPECTION_ARCHIVE_BOARD_ORDER_STORAGE_KEY,
      [...ARCHIVE_BOARD_STATUS_ORDER]
    );
    const normalized = stored.filter(status =>
      ARCHIVE_BOARD_STATUS_ORDER.includes(status)
    );
    ARCHIVE_BOARD_STATUS_ORDER.forEach(status => {
      if (!normalized.includes(status)) {
        normalized.push(status);
      }
    });
    return normalized;
  });
  const [archiveBoardHiddenStatuses, setArchiveBoardHiddenStatuses] = useState<
    InspectionArchive['status'][]
  >(() => {
    const stored = safeReadLocalJson<InspectionArchive['status'][]>(
      INSPECTION_ARCHIVE_BOARD_HIDDEN_STORAGE_KEY,
      []
    );
    return stored.filter(status => ARCHIVE_BOARD_STATUS_ORDER.includes(status));
  });
  const [draggingArchiveId, setDraggingArchiveId] = useState('');
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
        advancedFilters: normalizeArchiveAdvancedFilters(
          (item as any).advancedFilters
        ),
        fieldVisibility: normalizeArchiveFieldVisibility(
          (item as any).fieldVisibility
        ),
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
  const [pinnedArchiveViewIds, setPinnedArchiveViewIds] = useState<string[]>(
    () =>
      safeReadLocalJson<string[]>(
        INSPECTION_ARCHIVE_VIEW_PINNED_STORAGE_KEY,
        []
      ).filter(id => typeof id === 'string')
  );
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
  const [archiveLogFilterType, setArchiveLogFilterType] = useState('all');
  const [archiveLogSearchText, setArchiveLogSearchText] = useState('');
  const [archiveLogRetentionDays, setArchiveLogRetentionDays] = useState(7);
  const [isArchiveLogExpanded, setIsArchiveLogExpanded] = useState(false);
  const [archiveFilterHistory, setArchiveFilterHistory] = useState<
    ArchiveFilterHistoryEntry[]
  >(() =>
    safeReadLocalJson<ArchiveFilterHistoryEntry[]>(
      INSPECTION_ARCHIVE_RECENT_FILTER_HISTORY_STORAGE_KEY,
      []
    )
      .filter(item => item && typeof item.id === 'string')
      .slice(0, MAX_ARCHIVE_FILTER_HISTORY)
  );
  const [lastArchiveRefreshAt, setLastArchiveRefreshAt] = useState<
    string | null
  >(null);
  const [archiveRefreshIntervalSeconds, setArchiveRefreshIntervalSeconds] =
    useState<number>(() => {
      const stored = safeReadLocalJson<number>(
        INSPECTION_ARCHIVE_REFRESH_INTERVAL_STORAGE_KEY,
        15
      );
      return ARCHIVE_REFRESH_INTERVAL_OPTIONS.includes(
        stored as (typeof ARCHIVE_REFRESH_INTERVAL_OPTIONS)[number]
      )
        ? stored
        : 15;
    });
  const [archiveResultsGroupBy, setArchiveResultsGroupBy] =
    useState<ArchiveResultsGroupBy>(() => {
      const stored = safeReadLocalJson<ArchiveResultsGroupBy>(
        INSPECTION_ARCHIVE_RESULTS_GROUP_BY_STORAGE_KEY,
        'none'
      );
      return ARCHIVE_RESULTS_GROUP_BY_OPTIONS.includes(stored)
        ? stored
        : 'none';
    });
  const [archivePriorityMode, setArchivePriorityMode] =
    useState<ArchivePriorityMode>(() => {
      const queryState = readArchiveFilterQueryState();
      if (queryState.priorityMode) {
        return queryState.priorityMode;
      }
      const stored = safeReadLocalJson<ArchivePriorityMode>(
        INSPECTION_ARCHIVE_PRIORITY_MODE_STORAGE_KEY,
        'off'
      );
      return ARCHIVE_PRIORITY_MODES.includes(stored) ? stored : 'off';
    });
  const [collapsedArchiveGroupKeys, setCollapsedArchiveGroupKeys] = useState<
    string[]
  >([]);
  const [lastArchiveRefreshSource, setLastArchiveRefreshSource] =
    useState<ArchiveRefreshSource>('initial');
  const [archiveCardMeta, setArchiveCardMeta] = useState<ArchiveCardMetaState>(
    () =>
      normalizeArchiveCardMetaState(
        safeReadLocalJson<Partial<ArchiveCardMetaState>>(
          INSPECTION_ARCHIVE_CARD_META_STORAGE_KEY,
          DEFAULT_ARCHIVE_CARD_META_STATE
        )
      )
  );
  const [archiveUiPrefs, setArchiveUiPrefs] = useState<ArchiveUiPrefsState>(
    () =>
      normalizeArchiveUiPrefsState(
        safeReadLocalJson<Partial<ArchiveUiPrefsState>>(
          INSPECTION_ARCHIVE_UI_PREFS_STORAGE_KEY,
          DEFAULT_ARCHIVE_UI_PREFS_STATE
        )
      )
  );
  const [isArchiveFiltersCollapsed, setIsArchiveFiltersCollapsed] =
    useState(false);
  const [isArchiveFiltersDrawerOpen, setIsArchiveFiltersDrawerOpen] =
    useState(false);
  const [archiveTagDraft, setArchiveTagDraft] = useState('');
  const [archiveDrawerWidth, setArchiveDrawerWidth] = useState<number>(() => {
    const stored = safeReadLocalJson<number>(
      INSPECTION_ARCHIVE_DRAWER_WIDTH_STORAGE_KEY,
      480
    );
    return Math.max(420, Math.min(860, stored));
  });
  const [archiveModuleOrder, setArchiveModuleOrder] = useState<
    ArchiveModuleId[]
  >(() =>
    normalizeArchiveModuleOrder(
      safeReadLocalJson<ArchiveModuleId[]>(
        INSPECTION_ARCHIVE_MODULE_ORDER_STORAGE_KEY,
        DEFAULT_ARCHIVE_MODULE_ORDER
      )
    )
  );
  const [archiveHiddenModules, setArchiveHiddenModules] = useState<
    ArchiveModuleId[]
  >(() =>
    normalizeArchiveModuleList(
      safeReadLocalJson<ArchiveModuleId[]>(
        INSPECTION_ARCHIVE_MODULE_HIDDEN_STORAGE_KEY,
        []
      )
    ).filter(item => item !== 'workspace')
  );
  const [favoriteArchiveModules, setFavoriteArchiveModules] = useState<
    ArchiveModuleId[]
  >(() =>
    normalizeArchiveModuleList(
      safeReadLocalJson<ArchiveModuleId[]>(
        INSPECTION_ARCHIVE_MODULE_FAVORITES_STORAGE_KEY,
        ['search', 'results', 'quick_actions']
      )
    )
  );
  const [archiveLayoutPresets, setArchiveLayoutPresets] = useState<
    ArchiveLayoutPreset[]
  >(() =>
    safeReadLocalJson<ArchiveLayoutPreset[]>(
      INSPECTION_ARCHIVE_LAYOUT_PRESETS_STORAGE_KEY,
      []
    )
      .filter(item => item && typeof item.id === 'string')
      .slice(0, MAX_ARCHIVE_LAYOUT_PRESETS)
      .map(item => ({
        ...item,
        moduleOrder: normalizeArchiveModuleOrder(item.moduleOrder),
        hiddenModules: normalizeArchiveModuleList(item.hiddenModules).filter(
          moduleId => moduleId !== 'workspace'
        ),
        favoriteModules: normalizeArchiveModuleList(item.favoriteModules),
        nightReviewMode: Boolean(item.nightReviewMode),
      }))
  );
  const [activeArchiveLayoutPresetId, setActiveArchiveLayoutPresetId] =
    useState('');
  const [archiveLayoutName, setArchiveLayoutName] = useState('');
  const [isNightReviewMode, setIsNightReviewMode] = useState<boolean>(() =>
    safeReadLocalJson<boolean>(
      INSPECTION_ARCHIVE_NIGHT_REVIEW_MODE_STORAGE_KEY,
      false
    )
  );
  const [recentOpenedArchiveIds, setRecentOpenedArchiveIds] = useState<
    string[]
  >(() =>
    safeReadLocalJson<string[]>(
      INSPECTION_ARCHIVE_RECENT_OPENED_STORAGE_KEY,
      []
    ).filter(id => typeof id === 'string')
  );
  const [isRecentOpenedOpen, setIsRecentOpenedOpen] = useState(false);
  const [favoriteQuickActionIds, setFavoriteQuickActionIds] = useState<
    UiQuickActionId[]
  >(() =>
    safeReadLocalJson<UiQuickActionId[]>(
      INSPECTION_ARCHIVE_FAVORITE_ACTIONS_STORAGE_KEY,
      ['new_one_off', 'refresh_archive', 'focus_search', 'open_filters_drawer']
    ).filter((item): item is UiQuickActionId => typeof item === 'string')
  );
  const [archiveSearchHistory, setArchiveSearchHistory] = useState<string[]>(
    () =>
      safeReadLocalJson<string[]>(
        INSPECTION_ARCHIVE_SEARCH_HISTORY_STORAGE_KEY,
        []
      ).filter(item => typeof item === 'string' && item.trim().length > 0)
  );
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandPaletteQuery, setCommandPaletteQuery] = useState('');
  const [isOpsInboxOpen, setIsOpsInboxOpen] = useState(false);
  const [opsInboxReadAt, setOpsInboxReadAt] = useState<string>(() =>
    safeReadLocalJson<string>(
      INSPECTION_ARCHIVE_OPS_INBOX_READ_AT_STORAGE_KEY,
      new Date(0).toISOString()
    )
  );
  const [isUiTourOpen, setIsUiTourOpen] = useState(false);
  const [detailArchiveId, setDetailArchiveId] = useState('');
  const [lastDeletedArchive, setLastDeletedArchive] =
    useState<InspectionArchive | null>(null);
  const [batchStatus, setBatchStatus] = useState<
    InspectionArchive['status'] | ''
  >('');
  const [batchAssignEmployeeIds, setBatchAssignEmployeeIds] = useState<
    string[]
  >([]);
  const [batchCheckOutDate, setBatchCheckOutDate] = useState('');
  const [batchScheduledAt, setBatchScheduledAt] = useState('');
  const [isBatchPreviewOpen, setIsBatchPreviewOpen] = useState(false);
  const [batchPreviewAction, setBatchPreviewAction] = useState<
    'status' | 'assignees' | 'date' | ''
  >('');
  const [batchProgress, setBatchProgress] = useState({
    running: false,
    total: 0,
    completed: 0,
    failedIds: [] as string[],
  });
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState(false);
  const archiveSearchInputRef = useRef<InputRef>(null);

  const [searchText, setSearchText] = useState(() => {
    const queryText = readArchiveFilterQueryState().searchText;
    if (queryText) {
      return queryText;
    }
    return safeReadLocalJson<string>(
      INSPECTION_ARCHIVE_SEARCH_TEXT_STORAGE_KEY,
      ''
    );
  });
  const [searchMatchCursor, setSearchMatchCursor] = useState(0);
  const [archiveListRenderCount, setArchiveListRenderCount] = useState(60);
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
        setLastArchiveRefreshSource('initial');
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
      setLastArchiveRefreshSource('manual');
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

    const refreshArchives = async (
      source: Exclude<ArchiveRefreshSource, 'initial'>
    ) => {
      try {
        const latest = await loadAllInspections();
        if (!disposed) {
          setArchives(latest as InspectionArchive[]);
          setLastArchiveRefreshAt(new Date().toISOString());
          setLastArchiveRefreshSource(source);
        }
      } catch {
        // Keep current data when refresh fails.
      }
    };

    const onFocus = () => {
      void refreshArchives('auto_focus');
    };

    const timer =
      archiveRefreshIntervalSeconds > 0
        ? window.setInterval(() => {
            void refreshArchives('auto_interval');
          }, archiveRefreshIntervalSeconds * 1000)
        : null;
    window.addEventListener('focus', onFocus);

    return () => {
      disposed = true;
      if (timer) {
        window.clearInterval(timer);
      }
      window.removeEventListener('focus', onFocus);
    };
  }, [archiveRefreshIntervalSeconds]);

  React.useEffect(() => {
    safeWriteLocalJson(INSPECTION_ARCHIVE_FILTER_STORAGE_KEY, archiveFilters);
  }, [archiveFilters]);

  React.useEffect(() => {
    safeWriteLocalJson(
      INSPECTION_ARCHIVE_ADVANCED_FILTER_STORAGE_KEY,
      archiveAdvancedFilters
    );
  }, [archiveAdvancedFilters]);

  React.useEffect(() => {
    safeWriteLocalJson(
      INSPECTION_ARCHIVE_FIELD_VISIBILITY_STORAGE_KEY,
      archiveFieldVisibility
    );
  }, [archiveFieldVisibility]);

  React.useEffect(() => {
    safeWriteLocalJson(
      INSPECTION_ARCHIVE_BOARD_COLLAPSE_STORAGE_KEY,
      archiveBoardCollapse
    );
  }, [archiveBoardCollapse]);

  React.useEffect(() => {
    safeWriteLocalJson(
      INSPECTION_ARCHIVE_BOARD_ORDER_STORAGE_KEY,
      archiveBoardStatusOrder
    );
  }, [archiveBoardStatusOrder]);

  React.useEffect(() => {
    safeWriteLocalJson(
      INSPECTION_ARCHIVE_BOARD_HIDDEN_STORAGE_KEY,
      archiveBoardHiddenStatuses
    );
  }, [archiveBoardHiddenStatuses]);

  React.useEffect(() => {
    safeWriteLocalJson(
      INSPECTION_ARCHIVE_REFRESH_INTERVAL_STORAGE_KEY,
      archiveRefreshIntervalSeconds
    );
  }, [archiveRefreshIntervalSeconds]);

  React.useEffect(() => {
    safeWriteLocalJson(
      INSPECTION_ARCHIVE_RESULTS_GROUP_BY_STORAGE_KEY,
      archiveResultsGroupBy
    );
  }, [archiveResultsGroupBy]);

  React.useEffect(() => {
    safeWriteLocalJson(
      INSPECTION_ARCHIVE_PRIORITY_MODE_STORAGE_KEY,
      archivePriorityMode
    );
  }, [archivePriorityMode]);

  React.useEffect(() => {
    safeWriteLocalJson(
      INSPECTION_ARCHIVE_VIEW_PINNED_STORAGE_KEY,
      pinnedArchiveViewIds
    );
  }, [pinnedArchiveViewIds]);

  React.useEffect(() => {
    safeWriteLocalJson(
      INSPECTION_ARCHIVE_CARD_META_STORAGE_KEY,
      archiveCardMeta
    );
  }, [archiveCardMeta]);

  React.useEffect(() => {
    safeWriteLocalJson(INSPECTION_ARCHIVE_UI_PREFS_STORAGE_KEY, archiveUiPrefs);
  }, [archiveUiPrefs]);

  React.useEffect(() => {
    safeWriteLocalJson(
      INSPECTION_ARCHIVE_DRAWER_WIDTH_STORAGE_KEY,
      archiveDrawerWidth
    );
  }, [archiveDrawerWidth]);

  React.useEffect(() => {
    safeWriteLocalJson(
      INSPECTION_ARCHIVE_FAVORITE_ACTIONS_STORAGE_KEY,
      favoriteQuickActionIds
    );
  }, [favoriteQuickActionIds]);

  React.useEffect(() => {
    safeWriteLocalJson(
      INSPECTION_ARCHIVE_SEARCH_HISTORY_STORAGE_KEY,
      archiveSearchHistory.slice(0, MAX_ARCHIVE_SEARCH_HISTORY)
    );
  }, [archiveSearchHistory]);

  React.useEffect(() => {
    safeWriteLocalJson(
      INSPECTION_ARCHIVE_OPS_INBOX_READ_AT_STORAGE_KEY,
      opsInboxReadAt
    );
  }, [opsInboxReadAt]);

  React.useEffect(() => {
    safeWriteLocalJson(INSPECTION_ARCHIVE_SEARCH_TEXT_STORAGE_KEY, searchText);
  }, [searchText]);

  React.useEffect(() => {
    safeWriteLocalJson(
      INSPECTION_ARCHIVE_MODULE_ORDER_STORAGE_KEY,
      archiveModuleOrder
    );
  }, [archiveModuleOrder]);

  React.useEffect(() => {
    safeWriteLocalJson(
      INSPECTION_ARCHIVE_MODULE_HIDDEN_STORAGE_KEY,
      archiveHiddenModules
    );
  }, [archiveHiddenModules]);

  React.useEffect(() => {
    safeWriteLocalJson(
      INSPECTION_ARCHIVE_MODULE_FAVORITES_STORAGE_KEY,
      favoriteArchiveModules
    );
  }, [favoriteArchiveModules]);

  React.useEffect(() => {
    safeWriteLocalJson(
      INSPECTION_ARCHIVE_LAYOUT_PRESETS_STORAGE_KEY,
      archiveLayoutPresets.slice(0, MAX_ARCHIVE_LAYOUT_PRESETS)
    );
  }, [archiveLayoutPresets]);

  React.useEffect(() => {
    safeWriteLocalJson(
      INSPECTION_ARCHIVE_NIGHT_REVIEW_MODE_STORAGE_KEY,
      isNightReviewMode
    );
  }, [isNightReviewMode]);

  React.useEffect(() => {
    safeWriteLocalJson(
      INSPECTION_ARCHIVE_RECENT_OPENED_STORAGE_KEY,
      recentOpenedArchiveIds.slice(0, MAX_ARCHIVE_RECENT_OPENED)
    );
  }, [recentOpenedArchiveIds]);

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
    setParam(
      'priority',
      archivePriorityMode !== 'off' ? archivePriorityMode : null
    );
    setParam(
      'search_mode',
      archiveAdvancedFilters.searchMode !== 'smart'
        ? archiveAdvancedFilters.searchMode
        : null
    );
    setParam('mine', archiveAdvancedFilters.myAssignmentsOnly ? '1' : null);
    setParam(
      'mine_key',
      archiveAdvancedFilters.myAssignmentKeyword.trim() || null
    );
    setParam(
      'exclude_status',
      archiveAdvancedFilters.excludeStatus !== 'none'
        ? archiveAdvancedFilters.excludeStatus
        : null
    );
    setParam(
      'missing_addr',
      archiveAdvancedFilters.missingAddressOnly ? '1' : null
    );
    setParam(
      'missing_date',
      archiveAdvancedFilters.missingDateOnly ? '1' : null
    );
    setParam(
      'missing_assignee',
      archiveAdvancedFilters.missingAssigneeOnly ? '1' : null
    );

    const nextSearch = params.toString();
    const currentSearch = window.location.search.replace(/^\?/, '');
    if (nextSearch !== currentSearch) {
      const nextUrl = `${currentUrl.pathname}${
        nextSearch ? `?${nextSearch}` : ''
      }${currentUrl.hash}`;
      window.history.replaceState({}, '', nextUrl);
    }
  }, [archiveAdvancedFilters, archiveFilters, archivePriorityMode, searchText]);

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
    safeWriteLocalJson(
      INSPECTION_ARCHIVE_RECENT_FILTER_HISTORY_STORAGE_KEY,
      archiveFilterHistory.slice(0, MAX_ARCHIVE_FILTER_HISTORY)
    );
  }, [archiveFilterHistory]);

  React.useEffect(() => {
    safeWriteLocalJson(INSPECTION_ARCHIVE_LAST_SESSION_STORAGE_KEY, {
      searchText,
      filters: archiveFilters,
      advancedFilters: archiveAdvancedFilters,
      fieldVisibility: archiveFieldVisibility,
    });
  }, [
    archiveAdvancedFilters,
    archiveFieldVisibility,
    archiveFilters,
    searchText,
  ]);

  React.useEffect(() => {
    const retentionMs = archiveLogRetentionDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    setArchiveActionLogs(prev =>
      prev.filter(log => now - parseArchiveDateValue(log.at) <= retentionMs)
    );
  }, [archiveLogRetentionDays]);

  React.useEffect(() => {
    const handleStorageSync = (event: StorageEvent) => {
      if (!event.key) {
        return;
      }
      if (event.key === INSPECTION_ARCHIVE_FILTER_STORAGE_KEY) {
        setArchiveFilters(
          normalizeArchiveFilterState(
            safeReadLocalJson<Partial<ArchiveFilterState>>(
              INSPECTION_ARCHIVE_FILTER_STORAGE_KEY,
              DEFAULT_ARCHIVE_FILTER_STATE
            )
          )
        );
      }
      if (event.key === INSPECTION_ARCHIVE_ADVANCED_FILTER_STORAGE_KEY) {
        setArchiveAdvancedFilters(
          normalizeArchiveAdvancedFilters(
            safeReadLocalJson<Partial<ArchiveAdvancedFilterState>>(
              INSPECTION_ARCHIVE_ADVANCED_FILTER_STORAGE_KEY,
              DEFAULT_ARCHIVE_ADVANCED_FILTER_STATE
            )
          )
        );
      }
      if (event.key === INSPECTION_ARCHIVE_SEARCH_TEXT_STORAGE_KEY) {
        setSearchText(
          safeReadLocalJson<string>(
            INSPECTION_ARCHIVE_SEARCH_TEXT_STORAGE_KEY,
            ''
          )
        );
      }
      if (event.key === INSPECTION_ARCHIVE_MODULE_ORDER_STORAGE_KEY) {
        setArchiveModuleOrder(
          normalizeArchiveModuleOrder(
            safeReadLocalJson<ArchiveModuleId[]>(
              INSPECTION_ARCHIVE_MODULE_ORDER_STORAGE_KEY,
              DEFAULT_ARCHIVE_MODULE_ORDER
            )
          )
        );
      }
      if (event.key === INSPECTION_ARCHIVE_MODULE_HIDDEN_STORAGE_KEY) {
        setArchiveHiddenModules(
          normalizeArchiveModuleList(
            safeReadLocalJson<ArchiveModuleId[]>(
              INSPECTION_ARCHIVE_MODULE_HIDDEN_STORAGE_KEY,
              []
            )
          ).filter(item => item !== 'workspace')
        );
      }
      if (event.key === INSPECTION_ARCHIVE_NIGHT_REVIEW_MODE_STORAGE_KEY) {
        setIsNightReviewMode(
          safeReadLocalJson<boolean>(
            INSPECTION_ARCHIVE_NIGHT_REVIEW_MODE_STORAGE_KEY,
            false
          )
        );
      }
      if (event.key === INSPECTION_ARCHIVE_RESULTS_GROUP_BY_STORAGE_KEY) {
        const stored = safeReadLocalJson<ArchiveResultsGroupBy>(
          INSPECTION_ARCHIVE_RESULTS_GROUP_BY_STORAGE_KEY,
          'none'
        );
        setArchiveResultsGroupBy(
          ARCHIVE_RESULTS_GROUP_BY_OPTIONS.includes(stored) ? stored : 'none'
        );
      }
      if (event.key === INSPECTION_ARCHIVE_PRIORITY_MODE_STORAGE_KEY) {
        const stored = safeReadLocalJson<ArchivePriorityMode>(
          INSPECTION_ARCHIVE_PRIORITY_MODE_STORAGE_KEY,
          'off'
        );
        setArchivePriorityMode(
          ARCHIVE_PRIORITY_MODES.includes(stored) ? stored : 'off'
        );
      }
    };
    window.addEventListener('storage', handleStorageSync);
    return () => {
      window.removeEventListener('storage', handleStorageSync);
    };
  }, []);

  React.useEffect(() => {
    if (!isOpsInboxOpen) {
      return;
    }
    setOpsInboxReadAt(new Date().toISOString());
  }, [isOpsInboxOpen]);

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

  const handleCopyArchiveJson = React.useCallback(
    async (archive: InspectionArchive) => {
      try {
        await navigator.clipboard.writeText(JSON.stringify(archive, null, 2));
        appendArchiveActionLog(
          'copy.json.success',
          `Copied json (${archive.id})`
        );
        messageApi.success(
          t('sparkery.inspectionAdmin.messages.jsonCopied', {
            defaultValue: 'Inspection JSON copied.',
          })
        );
      } catch {
        appendArchiveActionLog(
          'copy.json.failed',
          `Copy json failed (${archive.id})`
        );
        messageApi.warning(
          t('sparkery.inspectionAdmin.messages.jsonCopyFailed', {
            defaultValue: 'Unable to copy JSON right now.',
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

  const handleCopySelectedIds = React.useCallback(async () => {
    if (selectedArchiveIds.length === 0) {
      return;
    }
    const selectedItems = archives.filter(item =>
      selectedArchiveIds.includes(item.id)
    );
    const allIds = selectedItems.map(item => item.id).join('\n');
    try {
      await navigator.clipboard.writeText(allIds);
      appendArchiveActionLog(
        'batch_copy_ids.success',
        `Copied ${selectedItems.length} inspection IDs`
      );
      messageApi.success(
        t('sparkery.inspectionAdmin.messages.batchCopyIdsSuccess', {
          defaultValue: '{{count}} inspection IDs copied.',
          count: selectedItems.length,
        })
      );
    } catch {
      appendArchiveActionLog('batch_copy_ids.failed', 'Batch copy IDs failed');
      messageApi.warning(
        t('sparkery.inspectionAdmin.messages.batchCopyIdsFailed', {
          defaultValue: 'Unable to copy IDs right now. Please retry.',
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

  const runBatchArchiveMutation = React.useCallback(
    async (
      mutationType: string,
      mutateRecord: (record: InspectionArchive) => InspectionArchive
    ) => {
      if (selectedArchiveIds.length === 0) {
        return;
      }
      const selectedItems = archives.filter(item =>
        selectedArchiveIds.includes(item.id)
      );
      if (selectedItems.length === 0) {
        return;
      }
      const nextItems = selectedItems.map(item => mutateRecord(item));
      setBatchProgress({
        running: true,
        total: nextItems.length,
        completed: 0,
        failedIds: [],
      });
      const successIds = new Set<string>();
      const failedIds: string[] = [];
      for (let index = 0; index < nextItems.length; index += 1) {
        const target = nextItems[index];
        if (!target) {
          continue;
        }
        try {
          await submitInspection(target as any);
          successIds.add(target.id);
        } catch {
          failedIds.push(target.id);
        }
        setBatchProgress(prev => ({
          ...prev,
          completed: Math.min(prev.total, prev.completed + 1),
          failedIds,
        }));
      }
      if (successIds.size === 0) {
        appendArchiveActionLog(
          `${mutationType}.failed`,
          'Batch mutation failed for all selected inspections'
        );
        messageApi.warning(
          t('sparkery.inspectionAdmin.messages.batchMutationFailed', {
            defaultValue: 'Batch update failed. Please retry.',
          })
        );
        setBatchProgress(prev => ({
          ...prev,
          running: false,
          failedIds,
        }));
        return;
      }
      const nextMap = new Map(nextItems.map(item => [item.id, item]));
      setArchives(prev =>
        prev.map(item =>
          successIds.has(item.id) ? nextMap.get(item.id) || item : item
        )
      );
      setLastCloudWriteAt(getInspectionLastCloudWriteAt());
      appendArchiveActionLog(
        `${mutationType}.succeeded`,
        `Batch mutation updated ${successIds.size}/${selectedItems.length} inspections`
      );
      messageApi.success(
        t('sparkery.inspectionAdmin.messages.batchMutationSuccess', {
          defaultValue:
            'Batch update applied to {{success}} of {{total}} selected inspections.',
          success: successIds.size,
          total: selectedItems.length,
        })
      );
      setBatchProgress({
        running: false,
        total: nextItems.length,
        completed: nextItems.length,
        failedIds,
      });
    },
    [appendArchiveActionLog, archives, messageApi, selectedArchiveIds, t]
  );

  const handleUpdateSingleArchive = React.useCallback(
    async (archiveId: string, patch: Partial<InspectionArchive>) => {
      const current = archives.find(item => item.id === archiveId);
      if (!current) {
        return;
      }
      const nextArchive = {
        ...current,
        ...patch,
      };
      try {
        await submitInspection(nextArchive as any);
        setArchives(prev =>
          prev.map(item => (item.id === archiveId ? nextArchive : item))
        );
        setLastCloudWriteAt(getInspectionLastCloudWriteAt());
        appendArchiveActionLog(
          'detail.update.succeeded',
          `Updated inspection (${archiveId}) from detail drawer`
        );
        messageApi.success(
          t('sparkery.inspectionAdmin.messages.detailUpdateSuccess', {
            defaultValue: 'Inspection updated.',
          })
        );
      } catch {
        appendArchiveActionLog(
          'detail.update.failed',
          `Failed to update inspection (${archiveId}) from detail drawer`
        );
        messageApi.warning(
          t('sparkery.inspectionAdmin.messages.detailUpdateFailed', {
            defaultValue: 'Unable to update inspection right now.',
          })
        );
      }
    },
    [appendArchiveActionLog, archives, messageApi, t]
  );

  const toggleArchiveMetaId = React.useCallback(
    (
      archiveId: string,
      key: 'pinnedIds' | 'starredIds' | 'reviewedIds',
      logType: string
    ) => {
      setArchiveCardMeta(prev => {
        const current = new Set(prev[key]);
        if (current.has(archiveId)) {
          current.delete(archiveId);
        } else {
          current.add(archiveId);
        }
        return {
          ...prev,
          [key]: Array.from(current),
        };
      });
      appendArchiveActionLog(logType, `Updated ${key} for ${archiveId}`);
    },
    [appendArchiveActionLog]
  );

  const handleAddArchiveTag = React.useCallback(
    (archiveId: string, rawTag: string) => {
      const tag = rawTag.trim();
      if (!tag) {
        return;
      }
      setArchiveCardMeta(prev => {
        const currentTags = prev.tagByArchiveId[archiveId] || [];
        if (currentTags.includes(tag)) {
          return prev;
        }
        return {
          ...prev,
          tagByArchiveId: {
            ...prev.tagByArchiveId,
            [archiveId]: [...currentTags, tag].slice(0, 12),
          },
        };
      });
      appendArchiveActionLog('tag.added', `Added tag "${tag}" to ${archiveId}`);
    },
    [appendArchiveActionLog]
  );

  const handleRemoveArchiveTag = React.useCallback(
    (archiveId: string, tag: string) => {
      setArchiveCardMeta(prev => {
        const currentTags = prev.tagByArchiveId[archiveId] || [];
        const nextTags = currentTags.filter(item => item !== tag);
        return {
          ...prev,
          tagByArchiveId: {
            ...prev.tagByArchiveId,
            [archiveId]: nextTags,
          },
        };
      });
      appendArchiveActionLog(
        'tag.removed',
        `Removed tag "${tag}" from ${archiveId}`
      );
    },
    [appendArchiveActionLog]
  );

  const handleApplyBatchStatus = React.useCallback(async () => {
    if (!batchStatus) {
      messageApi.info(
        t('sparkery.inspectionAdmin.messages.batchStatusRequired', {
          defaultValue: 'Select a target status first.',
        })
      );
      return;
    }
    const nowIso = new Date().toISOString();
    await runBatchArchiveMutation('batch_status', item => ({
      ...item,
      status: batchStatus,
      submittedAt:
        batchStatus === 'submitted'
          ? ((item as any).submittedAt as string) || nowIso
          : ((item as any).submittedAt as string) || '',
    }));
  }, [batchStatus, messageApi, runBatchArchiveMutation, t]);

  const executeBatchActionWithSchedule = React.useCallback(
    (runner: () => Promise<void>) => {
      const targetTimestamp = batchScheduledAt
        ? parseArchiveDateValue(batchScheduledAt)
        : 0;
      if (targetTimestamp > Date.now()) {
        const delay = targetTimestamp - Date.now();
        window.setTimeout(() => {
          void runner();
        }, delay);
        messageApi.success(
          t('sparkery.inspectionAdmin.messages.batchScheduled', {
            defaultValue: 'Batch action scheduled.',
          })
        );
        return;
      }
      void runner();
    },
    [batchScheduledAt, messageApi, t]
  );

  const handleApplyBatchAssignees = React.useCallback(async () => {
    if (batchAssignEmployeeIds.length === 0) {
      messageApi.info(
        t('sparkery.inspectionAdmin.messages.batchAssigneeRequired', {
          defaultValue: 'Select at least one assignee.',
        })
      );
      return;
    }
    const assignedEmployees = employees.filter(emp =>
      batchAssignEmployeeIds.includes(emp.id)
    );
    if (assignedEmployees.length === 0) {
      return;
    }
    await runBatchArchiveMutation('batch_assign', item => ({
      ...item,
      assignedEmployees,
      assignedEmployee: assignedEmployees[0],
    }));
  }, [
    batchAssignEmployeeIds,
    employees,
    messageApi,
    runBatchArchiveMutation,
    t,
  ]);

  const handleApplyBatchCheckOutDate = React.useCallback(async () => {
    if (!batchCheckOutDate) {
      messageApi.info(
        t('sparkery.inspectionAdmin.messages.batchDateRequired', {
          defaultValue: 'Select a check-out date first.',
        })
      );
      return;
    }
    await runBatchArchiveMutation('batch_checkout_date', item => ({
      ...item,
      checkOutDate: batchCheckOutDate,
    }));
  }, [batchCheckOutDate, messageApi, runBatchArchiveMutation, t]);

  const openBatchPreview = React.useCallback(
    (action: 'status' | 'assignees' | 'date') => {
      setBatchPreviewAction(action);
      setIsBatchPreviewOpen(true);
    },
    []
  );

  const handleConfirmBatchPreview = React.useCallback(() => {
    setIsBatchPreviewOpen(false);
    if (batchPreviewAction === 'status') {
      executeBatchActionWithSchedule(handleApplyBatchStatus);
      return;
    }
    if (batchPreviewAction === 'assignees') {
      executeBatchActionWithSchedule(handleApplyBatchAssignees);
      return;
    }
    if (batchPreviewAction === 'date') {
      executeBatchActionWithSchedule(handleApplyBatchCheckOutDate);
    }
  }, [
    batchPreviewAction,
    executeBatchActionWithSchedule,
    handleApplyBatchAssignees,
    handleApplyBatchCheckOutDate,
    handleApplyBatchStatus,
  ]);

  const handleRetryFailedBatchItems = React.useCallback(async () => {
    if (batchProgress.failedIds.length === 0) {
      return;
    }
    const failedSet = new Set(batchProgress.failedIds);
    setSelectedArchiveIds(prev =>
      Array.from(new Set([...prev, ...batchProgress.failedIds]))
    );
    appendArchiveActionLog(
      'batch.retry.failed_subset',
      `Queued ${failedSet.size} failed records for retry`
    );
  }, [appendArchiveActionLog, batchProgress.failedIds]);

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

  const updateArchiveAdvancedFilter = React.useCallback(
    (patch: Partial<ArchiveAdvancedFilterState>) => {
      setActiveArchiveViewId('');
      setArchiveAdvancedFilters(prev => ({
        ...prev,
        ...patch,
      }));
    },
    []
  );

  const handleApplyArchiveDatePreset = React.useCallback(
    (preset: 'today' | 'last_7_days' | 'last_30_days' | 'clear') => {
      const today = dayjs();
      if (preset === 'today') {
        updateArchiveFilter({
          dateFrom: today.format('YYYY-MM-DD'),
          dateTo: today.format('YYYY-MM-DD'),
        });
      } else if (preset === 'last_7_days') {
        updateArchiveFilter({
          dateFrom: today.subtract(6, 'day').format('YYYY-MM-DD'),
          dateTo: today.format('YYYY-MM-DD'),
        });
      } else if (preset === 'last_30_days') {
        updateArchiveFilter({
          dateFrom: today.subtract(29, 'day').format('YYYY-MM-DD'),
          dateTo: today.format('YYYY-MM-DD'),
        });
      } else {
        updateArchiveFilter({
          dateFrom: '',
          dateTo: '',
        });
      }
      appendArchiveActionLog(
        'filter.date_preset',
        `Applied date preset: ${preset}`
      );
    },
    [appendArchiveActionLog, updateArchiveFilter]
  );

  const resetArchiveFilters = React.useCallback(() => {
    setArchiveFilters({ ...DEFAULT_ARCHIVE_FILTER_STATE });
    setArchiveAdvancedFilters({ ...DEFAULT_ARCHIVE_ADVANCED_FILTER_STATE });
    setArchivePriorityMode('off');
    setSearchText('');
    setActiveArchiveViewId('');
    appendArchiveActionLog('filter.reset', 'Search and filters reset');
  }, [appendArchiveActionLog]);

  const handleRememberCurrentFilterContext = React.useCallback(() => {
    const entry: ArchiveFilterHistoryEntry = {
      id: generateId(),
      at: new Date().toISOString(),
      searchText,
      filters: { ...archiveFilters },
      advancedFilters: { ...archiveAdvancedFilters },
    };
    setArchiveFilterHistory(prev =>
      [entry, ...prev].slice(0, MAX_ARCHIVE_FILTER_HISTORY)
    );
    appendArchiveActionLog(
      'filter.snapshot.saved',
      'Saved current filter snapshot'
    );
  }, [
    appendArchiveActionLog,
    archiveAdvancedFilters,
    archiveFilters,
    searchText,
  ]);

  const handleApplyFilterHistoryEntry = React.useCallback(
    (entryId: string) => {
      const target = archiveFilterHistory.find(item => item.id === entryId);
      if (!target) {
        return;
      }
      setSearchText(target.searchText);
      setArchiveFilters(normalizeArchiveFilterState(target.filters));
      setArchiveAdvancedFilters(
        normalizeArchiveAdvancedFilters(target.advancedFilters)
      );
      setActiveArchiveViewId('');
      appendArchiveActionLog(
        'filter.snapshot.applied',
        `Applied snapshot from ${dayjs(target.at).format('MM-DD HH:mm')}`
      );
    },
    [appendArchiveActionLog, archiveFilterHistory]
  );

  const handleRestoreLastSessionFilters = React.useCallback(() => {
    const session = safeReadLocalJson<{
      searchText?: string;
      filters?: Partial<ArchiveFilterState>;
      advancedFilters?: Partial<ArchiveAdvancedFilterState>;
      fieldVisibility?: Partial<ArchiveFieldVisibilityState>;
    }>(INSPECTION_ARCHIVE_LAST_SESSION_STORAGE_KEY, {});
    setSearchText(session.searchText || '');
    setArchiveFilters(normalizeArchiveFilterState(session.filters));
    setArchiveAdvancedFilters(
      normalizeArchiveAdvancedFilters(session.advancedFilters)
    );
    setArchiveFieldVisibility(
      normalizeArchiveFieldVisibility(session.fieldVisibility)
    );
    setActiveArchiveViewId('');
    appendArchiveActionLog(
      'filter.session.restore',
      'Restored last session filters'
    );
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
    const parsedSearch = parseArchiveSearchQuery(searchText);
    const searchTokens = parsedSearch.freeTokens;
    const searchFieldTokens = parsedSearch.fieldTokens;
    const pinnedSet = new Set(archiveCardMeta.pinnedIds);
    const starredSet = new Set(archiveCardMeta.starredIds);
    const reviewedSet = new Set(archiveCardMeta.reviewedIds);
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
    const todayStart = dayjs().startOf('day').valueOf();
    const todayEnd = dayjs().endOf('day').valueOf();
    const priorityScoreMap = new Map<string, number>();
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
      const sectionItems = Array.isArray((item as any).sections)
        ? ((item as any).sections as any[])
        : [];
      const missingRequiredPhotoCount = sectionItems.reduce(
        (total, section) => {
          const checklist = Array.isArray(section?.checklist)
            ? section.checklist
            : [];
          return (
            total +
            checklist.filter(
              (checklistItem: any) =>
                checklistItem?.requiredPhoto === true && !checklistItem?.photo
            ).length
          );
        },
        0
      );
      const searchableFields = [
        item.propertyId,
        item.id,
        (item as any).propertyAddress,
        (item as any).templateName,
        (item as any)?.oneOffMeta?.customerName,
        assignedText,
        ...(archiveCardMeta.tagByArchiveId[item.id] || []),
      ]
        .filter((value): value is string => typeof value === 'string')
        .map(value => value.toLowerCase());
      const oneOffMode = (item as any)?.oneOffMeta?.mode === 'one_off';
      if (
        searchFieldTokens.status &&
        searchFieldTokens.status !== 'all' &&
        item.status !== searchFieldTokens.status
      ) {
        return false;
      }
      if (
        searchFieldTokens.oneOff !== null &&
        oneOffMode !== searchFieldTokens.oneOff
      ) {
        return false;
      }
      if (
        searchFieldTokens.id.length > 0 &&
        !searchFieldTokens.id.some(token =>
          item.id.toLowerCase().includes(token)
        )
      ) {
        return false;
      }
      if (
        searchFieldTokens.assignee.length > 0 &&
        !searchFieldTokens.assignee.some(token =>
          assignedText.toLowerCase().includes(token)
        )
      ) {
        return false;
      }
      if (
        searchFieldTokens.tag.length > 0 &&
        !searchFieldTokens.tag.some(token =>
          (archiveCardMeta.tagByArchiveId[item.id] || [])
            .join(' ')
            .toLowerCase()
            .includes(token)
        )
      ) {
        return false;
      }
      if (
        searchFieldTokens.address.length > 0 &&
        !searchFieldTokens.address.some(token =>
          String((item as any).propertyAddress || '')
            .toLowerCase()
            .includes(token)
        )
      ) {
        return false;
      }
      if (
        searchFieldTokens.customer.length > 0 &&
        !searchFieldTokens.customer.some(token =>
          String((item as any)?.oneOffMeta?.customerName || '')
            .toLowerCase()
            .includes(token)
        )
      ) {
        return false;
      }
      const matchesSearch = (() => {
        if (searchTokens.length === 0) {
          return true;
        }
        if (archiveAdvancedFilters.searchMode === 'and') {
          return searchTokens.every(token =>
            searchableFields.some(value => value.includes(token))
          );
        }
        return searchTokens.some(token =>
          searchableFields.some(value => value.includes(token))
        );
      })();
      if (!matchesSearch) {
        return false;
      }
      if (
        archiveAdvancedFilters.excludeStatus !== 'none' &&
        item.status === archiveAdvancedFilters.excludeStatus
      ) {
        return false;
      }
      if (
        archiveAdvancedFilters.missingAddressOnly &&
        (item as any).propertyAddress
      ) {
        return false;
      }
      if (
        archiveFilters.status !== 'all' &&
        item.status !== archiveFilters.status
      ) {
        return false;
      }
      if (archiveAdvancedFilters.missingDateOnly) {
        const hasAnyDate = Boolean(
          (item as any).checkOutDate || (item as any).submittedAt
        );
        if (hasAnyDate) {
          return false;
        }
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
      if (archiveAdvancedFilters.missingAssigneeOnly && hasAssignee) {
        return false;
      }
      if (archiveAdvancedFilters.myAssignmentsOnly) {
        const assignmentKeyword = archiveAdvancedFilters.myAssignmentKeyword
          .trim()
          .toLowerCase();
        if (!assignmentKeyword) {
          return false;
        }
        const assignmentFields = [
          assignedText,
          ...(assignedEmployees || []).map(emp => emp.id),
          assignedEmployee?.id || '',
        ]
          .filter((value): value is string => typeof value === 'string')
          .map(value => value.toLowerCase());
        if (
          !assignmentFields.some(value => value.includes(assignmentKeyword))
        ) {
          return false;
        }
      }
      const checkOutDateValue = parseArchiveDateValue(
        (item as any).checkOutDate
      );
      if (archiveFilters.quickChip === 'due_today') {
        if (
          item.status === 'submitted' ||
          !checkOutDateValue ||
          checkOutDateValue < todayStart ||
          checkOutDateValue > todayEnd
        ) {
          return false;
        }
      }
      if (archiveFilters.quickChip === 'overdue') {
        if (
          item.status === 'submitted' ||
          !checkOutDateValue ||
          checkOutDateValue >= todayStart
        ) {
          return false;
        }
      }
      if (archiveFilters.quickChip === 'missing_required_photos') {
        if (missingRequiredPhotoCount <= 0) {
          return false;
        }
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
      if (archivePriorityMode !== 'off') {
        const isOverdue =
          item.status !== 'submitted' &&
          checkOutDateValue > 0 &&
          checkOutDateValue < todayStart;
        const isDueToday =
          item.status !== 'submitted' &&
          checkOutDateValue >= todayStart &&
          checkOutDateValue <= todayEnd;
        const isStale48h =
          item.status !== 'submitted' &&
          primaryArchiveDate > 0 &&
          (nowValue - primaryArchiveDate) / (1000 * 60 * 60) >= 48;
        const score =
          (isOverdue ? 5 : 0) +
          (isDueToday ? 3 : 0) +
          (!hasAssignee ? 2 : 0) +
          (missingRequiredPhotoCount > 0 ? 2 : 0) +
          (isStale48h ? 1 : 0);
        priorityScoreMap.set(item.id, score);
      }
      return true;
    });

    const isAscending =
      archiveFilters.sortMode === 'oldest' ||
      archiveFilters.sortMode === 'check_out_oldest';
    const compareByPriority = (
      left: InspectionArchive,
      right: InspectionArchive
    ) => {
      const leftScore = priorityScoreMap.get(left.id) || 0;
      const rightScore = priorityScoreMap.get(right.id) || 0;
      if (leftScore === rightScore) {
        return 0;
      }
      return rightScore - leftScore;
    };
    sorted.sort((left, right) => {
      const leftPinned = pinnedSet.has(left.id);
      const rightPinned = pinnedSet.has(right.id);
      if (leftPinned !== rightPinned) {
        return leftPinned ? -1 : 1;
      }
      const leftStarred = starredSet.has(left.id);
      const rightStarred = starredSet.has(right.id);
      if (leftStarred !== rightStarred) {
        return leftStarred ? -1 : 1;
      }
      if (archivePriorityMode === 'hard') {
        const priorityDiff = compareByPriority(left, right);
        if (priorityDiff !== 0) {
          return priorityDiff;
        }
      }
      const leftReviewed = reviewedSet.has(left.id);
      const rightReviewed = reviewedSet.has(right.id);
      if (leftReviewed !== rightReviewed) {
        return leftReviewed ? 1 : -1;
      }
      if (archivePriorityMode === 'soft') {
        const priorityDiff = compareByPriority(left, right);
        if (priorityDiff !== 0) {
          return priorityDiff;
        }
      }
      const leftValue = getSortValueByMode(left, archiveFilters.sortMode);
      const rightValue = getSortValueByMode(right, archiveFilters.sortMode);
      if (leftValue === rightValue) {
        return left.id.localeCompare(right.id);
      }
      return isAscending ? leftValue - rightValue : rightValue - leftValue;
    });
    return sorted;
  }, [
    archiveAdvancedFilters,
    archiveCardMeta,
    archiveFilters,
    archivePriorityMode,
    archives,
    getSortValueByMode,
    parseArchiveSearchQuery,
    searchText,
  ]);

  const searchableArchiveIds = React.useMemo(
    () =>
      filteredArchives
        .filter(item => {
          const keywordTokens = parseArchiveSearchQuery(searchText).freeTokens;
          if (keywordTokens.length === 0) {
            return false;
          }
          const fields = [
            item.id,
            item.propertyId,
            (item as any).propertyAddress,
            (item as any).templateName,
            (item as any)?.oneOffMeta?.customerName,
          ]
            .filter((value): value is string => typeof value === 'string')
            .map(value => value.toLowerCase());
          return keywordTokens.some(token =>
            fields.some(field => field.includes(token))
          );
        })
        .map(item => item.id),
    [filteredArchives, searchText]
  );

  React.useEffect(() => {
    setSearchMatchCursor(0);
  }, [searchText]);

  React.useEffect(() => {
    const keyword = searchText.trim();
    if (keyword.length < 2) {
      return;
    }
    const timer = window.setTimeout(() => {
      setArchiveSearchHistory(prev => {
        const next = [
          keyword,
          ...prev.filter(item => item.toLowerCase() !== keyword.toLowerCase()),
        ].slice(0, MAX_ARCHIVE_SEARCH_HISTORY);
        return next;
      });
    }, 320);
    return () => {
      window.clearTimeout(timer);
    };
  }, [searchText]);

  React.useEffect(() => {
    setArchiveListRenderCount(60);
  }, [archiveAdvancedFilters, archiveFilters, searchText]);

  const focusSearchMatchByOffset = React.useCallback(
    (offset: -1 | 1) => {
      if (searchableArchiveIds.length === 0) {
        return;
      }
      setSearchMatchCursor(prev => {
        const nextRaw = prev + offset;
        const next =
          ((nextRaw % searchableArchiveIds.length) +
            searchableArchiveIds.length) %
          searchableArchiveIds.length;
        const archiveId = searchableArchiveIds[next];
        if (archiveId) {
          setDetailArchiveId(archiveId);
        }
        return next;
      });
    },
    [searchableArchiveIds]
  );

  React.useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const targetTag = target?.tagName?.toLowerCase() || '';
      const isTypingTarget =
        targetTag === 'input' ||
        targetTag === 'textarea' ||
        target?.isContentEditable;
      if (isTypingTarget) {
        return;
      }
      const withMeta = event.ctrlKey || event.metaKey;
      const shortcutKey = event.key.toLowerCase();
      if (withMeta && !event.shiftKey && shortcutKey === 'k') {
        event.preventDefault();
        setCommandPaletteQuery('');
        setIsCommandPaletteOpen(true);
        return;
      }
      if (!withMeta || !event.shiftKey) {
        if (event.key === '?' || (event.shiftKey && event.key === '/')) {
          event.preventDefault();
          setIsShortcutHelpOpen(true);
          return;
        }
        return;
      }
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
        return;
      }
      if (shortcutKey === 'g') {
        event.preventDefault();
        focusSearchMatchByOffset(1);
        return;
      }
      if (shortcutKey === 'h') {
        event.preventDefault();
        focusSearchMatchByOffset(-1);
        return;
      }
      if (shortcutKey === 'm') {
        event.preventDefault();
        setIsArchiveFiltersDrawerOpen(true);
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => {
      window.removeEventListener('keydown', handleShortcut);
    };
  }, [
    focusSearchMatchByOffset,
    handleManualRefreshArchives,
    handleOpenOneOffGenerator,
  ]);

  const archiveSubmissionRate = React.useMemo(() => {
    if (archiveStats.total === 0) {
      return 0;
    }
    return Number(
      ((archiveStats.submitted / archiveStats.total) * 100).toFixed(1)
    );
  }, [archiveStats.submitted, archiveStats.total]);
  const renderedListArchives = React.useMemo(
    () => filteredArchives.slice(0, archiveListRenderCount),
    [archiveListRenderCount, filteredArchives]
  );
  const groupedRenderedListArchives = React.useMemo(() => {
    if (archiveResultsGroupBy === 'none') {
      return [] as Array<{
        key: string;
        label: string;
        items: InspectionArchive[];
      }>;
    }
    const getStatusLabel = (status: InspectionArchive['status']) => {
      if (status === 'pending') {
        return t('sparkery.inspectionAdmin.filters.statusPendingShort', {
          defaultValue: 'Pending',
        });
      }
      if (status === 'in_progress') {
        return t('sparkery.inspectionAdmin.filters.statusInProgressShort', {
          defaultValue: 'In Progress',
        });
      }
      return t('sparkery.inspectionAdmin.filters.statusSubmittedShort', {
        defaultValue: 'Submitted',
      });
    };
    const groups = new Map<string, InspectionArchive[]>();
    renderedListArchives.forEach(item => {
      let key = '';
      let label = '';
      if (archiveResultsGroupBy === 'status') {
        key = item.status;
        label = getStatusLabel(item.status);
      } else if (archiveResultsGroupBy === 'assignee') {
        const assignedEmployees = (item as any).assignedEmployees as
          | Employee[]
          | undefined;
        const assignedEmployee = (item as any).assignedEmployee as
          | Employee
          | undefined;
        const text =
          assignedEmployees && assignedEmployees.length > 0
            ? assignedEmployees
                .map(emp => emp?.name || emp?.nameEn || emp?.id || '')
                .filter(Boolean)
                .join(', ')
            : assignedEmployee?.name ||
              assignedEmployee?.nameEn ||
              assignedEmployee?.id ||
              t('sparkery.inspectionAdmin.labels.unassigned', {
                defaultValue: 'Unassigned',
              });
        key = text.toLowerCase();
        label = text;
      } else {
        const checkOut = parseArchiveDateValue((item as any).checkOutDate);
        if (checkOut > 0) {
          label = dayjs(checkOut).format('YYYY-MM-DD');
        } else {
          label = t('sparkery.inspectionAdmin.labels.noDate', {
            defaultValue: 'No date',
          });
        }
        key = label;
      }
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)?.push(item);
    });
    return Array.from(groups.entries()).map(([key, items]) => ({
      key,
      label:
        archiveResultsGroupBy === 'status'
          ? getStatusLabel(key as InspectionArchive['status'])
          : items.length > 0
            ? (() => {
                if (archiveResultsGroupBy === 'assignee') {
                  const assignedEmployees = (items[0] as any)
                    .assignedEmployees as Employee[] | undefined;
                  const assignedEmployee = (items[0] as any)
                    .assignedEmployee as Employee | undefined;
                  return (
                    (assignedEmployees && assignedEmployees.length > 0
                      ? assignedEmployees
                          .map(emp => emp?.name || emp?.nameEn || emp?.id || '')
                          .filter(Boolean)
                          .join(', ')
                      : assignedEmployee?.name ||
                        assignedEmployee?.nameEn ||
                        assignedEmployee?.id) ||
                    t('sparkery.inspectionAdmin.labels.unassigned', {
                      defaultValue: 'Unassigned',
                    })
                  );
                }
                const checkOut = parseArchiveDateValue(
                  (items[0] as any).checkOutDate
                );
                return checkOut > 0
                  ? dayjs(checkOut).format('YYYY-MM-DD')
                  : t('sparkery.inspectionAdmin.labels.noDate', {
                      defaultValue: 'No date',
                    });
              })()
            : key,
      items,
    }));
  }, [archiveResultsGroupBy, renderedListArchives, t]);
  React.useEffect(() => {
    if (archiveResultsGroupBy === 'none') {
      setCollapsedArchiveGroupKeys([]);
      return;
    }
    const validKeys = new Set(
      groupedRenderedListArchives.map(group => group.key)
    );
    setCollapsedArchiveGroupKeys(prev =>
      prev.filter(groupKey => validKeys.has(groupKey))
    );
  }, [archiveResultsGroupBy, groupedRenderedListArchives]);
  const toggleArchiveGroupCollapse = React.useCallback((groupKey: string) => {
    setCollapsedArchiveGroupKeys(prev =>
      prev.includes(groupKey)
        ? prev.filter(item => item !== groupKey)
        : [...prev, groupKey]
    );
  }, []);
  const collapseAllArchiveGroups = React.useCallback(() => {
    setCollapsedArchiveGroupKeys(
      groupedRenderedListArchives.map(group => group.key)
    );
  }, [groupedRenderedListArchives]);
  const expandAllArchiveGroups = React.useCallback(() => {
    setCollapsedArchiveGroupKeys([]);
  }, []);

  const archiveDatePresetState = React.useMemo(() => {
    const today = dayjs();
    const todayValue = today.format('YYYY-MM-DD');
    const last7Start = today.subtract(6, 'day').format('YYYY-MM-DD');
    const last30Start = today.subtract(29, 'day').format('YYYY-MM-DD');
    const from = archiveFilters.dateFrom;
    const to = archiveFilters.dateTo;
    return {
      isClear: !from && !to,
      isToday: from === todayValue && to === todayValue,
      isLast7Days: from === last7Start && to === todayValue,
      isLast30Days: from === last30Start && to === todayValue,
    };
  }, [archiveFilters.dateFrom, archiveFilters.dateTo]);

  const archiveFilterHints = React.useMemo(() => {
    const hints: string[] = [];
    const parsedSearch = parseArchiveSearchQuery(searchText);
    if (
      archiveAdvancedFilters.myAssignmentsOnly &&
      !archiveAdvancedFilters.myAssignmentKeyword.trim()
    ) {
      hints.push(
        t('sparkery.inspectionAdmin.hints.mineKeywordRequired', {
          defaultValue: 'Mine only is enabled but mine keyword is empty.',
        })
      );
    }
    if (
      archiveFilters.status !== 'all' &&
      archiveAdvancedFilters.excludeStatus !== 'none' &&
      archiveFilters.status === archiveAdvancedFilters.excludeStatus
    ) {
      hints.push(
        t('sparkery.inspectionAdmin.hints.statusConflict', {
          defaultValue:
            'Status include and exclude are the same; result may be empty.',
        })
      );
    }
    if (
      archiveFilters.dateFrom &&
      archiveFilters.dateTo &&
      archiveFilters.dateFrom > archiveFilters.dateTo
    ) {
      hints.push(
        t('sparkery.inspectionAdmin.hints.dateRangeReversed', {
          defaultValue: 'Date range is reversed; From is after To.',
        })
      );
    }
    if (
      archiveFilters.oneOffOnly &&
      parsedSearch.fieldTokens.oneOff === false
    ) {
      hints.push(
        t('sparkery.inspectionAdmin.hints.oneOffConflict', {
          defaultValue:
            'One-off only is enabled while search uses oneoff:false; results may be empty.',
        })
      );
    }
    if (
      archiveFilters.status !== 'all' &&
      parsedSearch.fieldTokens.status &&
      parsedSearch.fieldTokens.status !== 'all' &&
      parsedSearch.fieldTokens.status !== archiveFilters.status
    ) {
      hints.push(
        t('sparkery.inspectionAdmin.hints.searchStatusConflict', {
          defaultValue:
            'Status filter and search status token are different; result set is heavily narrowed.',
        })
      );
    }
    return hints;
  }, [
    archiveAdvancedFilters.excludeStatus,
    archiveAdvancedFilters.myAssignmentKeyword,
    archiveAdvancedFilters.myAssignmentsOnly,
    archiveFilters.dateFrom,
    archiveFilters.dateTo,
    archiveFilters.oneOffOnly,
    archiveFilters.status,
    parseArchiveSearchQuery,
    searchText,
    t,
  ]);

  const filteredArchiveRiskStats = React.useMemo(() => {
    const todayStart = dayjs().startOf('day').valueOf();
    const todayEnd = dayjs().endOf('day').valueOf();
    const nowValue = dayjs().valueOf();
    return filteredArchives.reduce(
      (acc, item) => {
        const checkOutDateValue = parseArchiveDateValue(
          (item as any).checkOutDate
        );
        if (
          item.status !== 'submitted' &&
          checkOutDateValue &&
          checkOutDateValue >= todayStart &&
          checkOutDateValue <= todayEnd
        ) {
          acc.dueToday += 1;
        }
        if (
          item.status !== 'submitted' &&
          checkOutDateValue &&
          checkOutDateValue < todayStart
        ) {
          acc.overdue += 1;
        }
        const assignedEmployees = (item as any).assignedEmployees as
          | Employee[]
          | undefined;
        const assignedEmployee = (item as any).assignedEmployee as
          | Employee
          | undefined;
        if (
          !assignedEmployee &&
          (!assignedEmployees || assignedEmployees.length === 0)
        ) {
          acc.noAssignee += 1;
        }
        const sectionItems = Array.isArray((item as any).sections)
          ? ((item as any).sections as any[])
          : [];
        const missingRequiredPhotoCount = sectionItems.reduce(
          (total, section) => {
            const checklist = Array.isArray(section?.checklist)
              ? section.checklist
              : [];
            return (
              total +
              checklist.filter(
                (checklistItem: any) =>
                  checklistItem?.requiredPhoto === true && !checklistItem?.photo
              ).length
            );
          },
          0
        );
        if (missingRequiredPhotoCount > 0) {
          acc.missingRequiredPhotos += 1;
        }
        const primaryArchiveDate =
          parseArchiveDateValue((item as any).checkOutDate) ||
          parseArchiveDateValue((item as any).submittedAt);
        if (
          item.status !== 'submitted' &&
          primaryArchiveDate &&
          (nowValue - primaryArchiveDate) / (1000 * 60 * 60) >= 48
        ) {
          acc.stale48h += 1;
        }
        return acc;
      },
      {
        dueToday: 0,
        overdue: 0,
        noAssignee: 0,
        missingRequiredPhotos: 0,
        stale48h: 0,
      }
    );
  }, [filteredArchives]);
  const archiveEmptyStateSignals = React.useMemo(() => {
    if (archives.length === 0 || filteredArchives.length > 0) {
      return [] as string[];
    }
    const signals: string[] = [];
    if (searchText.trim()) {
      signals.push(
        t('sparkery.inspectionAdmin.empty.signalSearch', {
          defaultValue: 'Search keyword is narrowing results.',
        })
      );
    }
    if (archiveFilters.status !== 'all') {
      signals.push(
        t('sparkery.inspectionAdmin.empty.signalStatusFilter', {
          defaultValue: 'Status filter is active.',
        })
      );
    }
    if (archiveFilters.quickChip !== 'all') {
      signals.push(
        t('sparkery.inspectionAdmin.empty.signalQuickFilter', {
          defaultValue: 'Quick filter is active.',
        })
      );
    }
    if (archiveFilters.dateFrom || archiveFilters.dateTo) {
      signals.push(
        t('sparkery.inspectionAdmin.empty.signalDateRange', {
          defaultValue: 'Date range is limiting records.',
        })
      );
    }
    if (archiveFilters.oneOffOnly) {
      signals.push(
        t('sparkery.inspectionAdmin.empty.signalOneOffOnly', {
          defaultValue: 'One-off only scope is enabled.',
        })
      );
    }
    if (
      archiveAdvancedFilters.excludeStatus !== 'none' ||
      archiveAdvancedFilters.myAssignmentsOnly ||
      archiveAdvancedFilters.missingAddressOnly ||
      archiveAdvancedFilters.missingDateOnly ||
      archiveAdvancedFilters.missingAssigneeOnly
    ) {
      signals.push(
        t('sparkery.inspectionAdmin.empty.signalAdvancedFilter', {
          defaultValue: 'Advanced filters are enabled.',
        })
      );
    }
    if (archiveFilterHints.length > 0) {
      signals.push(
        t('sparkery.inspectionAdmin.empty.signalFilterConflict', {
          defaultValue:
            'One or more filter/search combinations may conflict with each other.',
        })
      );
    }
    return signals.slice(0, 6);
  }, [
    archiveAdvancedFilters.excludeStatus,
    archiveAdvancedFilters.missingAddressOnly,
    archiveAdvancedFilters.missingAssigneeOnly,
    archiveAdvancedFilters.missingDateOnly,
    archiveAdvancedFilters.myAssignmentsOnly,
    archiveFilterHints.length,
    archiveFilters.dateFrom,
    archiveFilters.dateTo,
    archiveFilters.oneOffOnly,
    archiveFilters.quickChip,
    archiveFilters.status,
    archives.length,
    filteredArchives.length,
    searchText,
    t,
  ]);

  const filteredArchiveActionLogs = React.useMemo(() => {
    const search = archiveLogSearchText.trim().toLowerCase();
    return archiveActionLogs.filter(log => {
      if (archiveLogFilterType !== 'all' && log.type !== archiveLogFilterType) {
        return false;
      }
      if (!search) {
        return true;
      }
      return (
        log.type.toLowerCase().includes(search) ||
        log.detail.toLowerCase().includes(search)
      );
    });
  }, [archiveActionLogs, archiveLogFilterType, archiveLogSearchText]);

  const archiveActionLogTypeOptions = React.useMemo(() => {
    const types = Array.from(new Set(archiveActionLogs.map(log => log.type)));
    return ['all', ...types];
  }, [archiveActionLogs]);

  const archiveActionLogErrorSummary = React.useMemo(() => {
    const groups: Record<string, number> = {};
    archiveActionLogs.forEach(log => {
      if (
        !log.type.toLowerCase().includes('failed') &&
        !log.type.toLowerCase().includes('error')
      ) {
        return;
      }
      groups[log.type] = (groups[log.type] || 0) + 1;
    });
    return Object.entries(groups)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 6);
  }, [archiveActionLogs]);

  const handleExportActionLogsCsv = React.useCallback(() => {
    if (filteredArchiveActionLogs.length === 0) {
      return;
    }
    const escapeCsv = (value: unknown): string =>
      `"${String(value ?? '').replace(/"/g, '""')}"`;
    const header = ['at', 'type', 'detail'].map(escapeCsv).join(',');
    const rows = filteredArchiveActionLogs.map(log =>
      [log.at, log.type, log.detail].map(escapeCsv).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `inspection-action-logs-${dayjs().format('YYYYMMDD-HHmmss')}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    appendArchiveActionLog(
      'logs.export.csv',
      `Exported ${filteredArchiveActionLogs.length} action logs`
    );
  }, [appendArchiveActionLog, filteredArchiveActionLogs]);

  const selectedArchiveItems = React.useMemo(
    () => archives.filter(item => selectedArchiveIds.includes(item.id)),
    [archives, selectedArchiveIds]
  );
  const detailArchive = React.useMemo(
    () => archives.find(item => item.id === detailArchiveId) || null,
    [archives, detailArchiveId]
  );
  const detailArchiveIndex = React.useMemo(
    () => filteredArchives.findIndex(item => item.id === detailArchiveId),
    [detailArchiveId, filteredArchives]
  );
  const hasNextUnsubmittedArchive = React.useMemo(() => {
    if (filteredArchives.length === 0) {
      return false;
    }
    const startIndex = detailArchiveIndex >= 0 ? detailArchiveIndex + 1 : 0;
    const rotated = [
      ...filteredArchives.slice(startIndex),
      ...filteredArchives.slice(0, startIndex),
    ];
    return rotated.some(item => item.status !== 'submitted');
  }, [detailArchiveIndex, filteredArchives]);
  const hasNextUncheckedArchive = React.useMemo(() => {
    if (filteredArchives.length === 0) {
      return false;
    }
    const startIndex = detailArchiveIndex >= 0 ? detailArchiveIndex + 1 : 0;
    const rotated = [
      ...filteredArchives.slice(startIndex),
      ...filteredArchives.slice(0, startIndex),
    ];
    return rotated.some(item => {
      const sections = Array.isArray((item as any).sections)
        ? ((item as any).sections as any[])
        : [];
      const total = sections.reduce(
        (sum, section) =>
          sum +
          (Array.isArray(section?.checklist) ? section.checklist.length : 0),
        0
      );
      const checked = sections.reduce(
        (sum, section) =>
          sum +
          (Array.isArray(section?.checklist)
            ? section.checklist.filter((checkItem: any) => checkItem?.checked)
                .length
            : 0),
        0
      );
      return total > checked;
    });
  }, [detailArchiveIndex, filteredArchives]);
  const hasNextMissingPhotoArchive = React.useMemo(() => {
    if (filteredArchives.length === 0) {
      return false;
    }
    const startIndex = detailArchiveIndex >= 0 ? detailArchiveIndex + 1 : 0;
    const rotated = [
      ...filteredArchives.slice(startIndex),
      ...filteredArchives.slice(0, startIndex),
    ];
    return rotated.some(item => {
      const sections = Array.isArray((item as any).sections)
        ? ((item as any).sections as any[])
        : [];
      const missingRequiredPhotoCount = sections.reduce((sum, section) => {
        const checklist = Array.isArray(section?.checklist)
          ? section.checklist
          : [];
        return (
          sum +
          checklist.filter(
            (checkItem: any) =>
              checkItem?.requiredPhoto === true && !checkItem?.photo
          ).length
        );
      }, 0);
      return missingRequiredPhotoCount > 0;
    });
  }, [detailArchiveIndex, filteredArchives]);

  const focusNextArchiveInDrawer = React.useCallback(() => {
    if (detailArchiveIndex < 0) {
      return;
    }
    const next = filteredArchives[detailArchiveIndex + 1];
    if (!next) {
      return;
    }
    setDetailArchiveId(next.id);
  }, [detailArchiveIndex, filteredArchives]);

  const focusPrevArchiveInDrawer = React.useCallback(() => {
    if (detailArchiveIndex < 0) {
      return;
    }
    const prev = filteredArchives[detailArchiveIndex - 1];
    if (!prev) {
      return;
    }
    setDetailArchiveId(prev.id);
  }, [detailArchiveIndex, filteredArchives]);

  const focusNextUnsubmittedArchiveInDrawer = React.useCallback(() => {
    if (filteredArchives.length === 0) {
      return;
    }
    const startIndex = detailArchiveIndex >= 0 ? detailArchiveIndex + 1 : 0;
    const rotated = [
      ...filteredArchives.slice(startIndex),
      ...filteredArchives.slice(0, startIndex),
    ];
    const next = rotated.find(item => item.status !== 'submitted');
    if (next) {
      setDetailArchiveId(next.id);
    }
  }, [detailArchiveIndex, filteredArchives]);
  const focusNextUncheckedArchiveInDrawer = React.useCallback(() => {
    if (filteredArchives.length === 0) {
      return;
    }
    const startIndex = detailArchiveIndex >= 0 ? detailArchiveIndex + 1 : 0;
    const rotated = [
      ...filteredArchives.slice(startIndex),
      ...filteredArchives.slice(0, startIndex),
    ];
    const next = rotated.find(item => {
      const sections = Array.isArray((item as any).sections)
        ? ((item as any).sections as any[])
        : [];
      const total = sections.reduce(
        (sum, section) =>
          sum +
          (Array.isArray(section?.checklist) ? section.checklist.length : 0),
        0
      );
      const checked = sections.reduce(
        (sum, section) =>
          sum +
          (Array.isArray(section?.checklist)
            ? section.checklist.filter((checkItem: any) => checkItem?.checked)
                .length
            : 0),
        0
      );
      return total > checked;
    });
    if (next) {
      setDetailArchiveId(next.id);
    }
  }, [detailArchiveIndex, filteredArchives]);
  const focusNextMissingPhotoArchiveInDrawer = React.useCallback(() => {
    if (filteredArchives.length === 0) {
      return;
    }
    const startIndex = detailArchiveIndex >= 0 ? detailArchiveIndex + 1 : 0;
    const rotated = [
      ...filteredArchives.slice(startIndex),
      ...filteredArchives.slice(0, startIndex),
    ];
    const next = rotated.find(item => {
      const sections = Array.isArray((item as any).sections)
        ? ((item as any).sections as any[])
        : [];
      return (
        sections.reduce((sum, section) => {
          const checklist = Array.isArray(section?.checklist)
            ? section.checklist
            : [];
          return (
            sum +
            checklist.filter(
              (checkItem: any) =>
                checkItem?.requiredPhoto === true && !checkItem?.photo
            ).length
          );
        }, 0) > 0
      );
    });
    if (next) {
      setDetailArchiveId(next.id);
    }
  }, [detailArchiveIndex, filteredArchives]);

  React.useEffect(() => {
    const handleDrawerNavigation = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const targetTag = target?.tagName?.toLowerCase() || '';
      const isTypingTarget =
        targetTag === 'input' ||
        targetTag === 'textarea' ||
        target?.isContentEditable;
      if (isTypingTarget) {
        return;
      }
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
        return;
      }
      if (event.key.toLowerCase() === 'j') {
        event.preventDefault();
        focusNextArchiveInDrawer();
      } else if (event.key.toLowerCase() === 'k') {
        event.preventDefault();
        focusPrevArchiveInDrawer();
      }
    };
    window.addEventListener('keydown', handleDrawerNavigation);
    return () => {
      window.removeEventListener('keydown', handleDrawerNavigation);
    };
  }, [focusNextArchiveInDrawer, focusPrevArchiveInDrawer]);

  const handleExportFilteredArchivesCsv = React.useCallback(() => {
    if (filteredArchives.length === 0) {
      messageApi.info(
        t('sparkery.inspectionAdmin.messages.noRecordsToExport', {
          defaultValue: 'No records to export.',
        })
      );
      return;
    }
    const escapeCsv = (value: unknown): string => {
      const raw =
        typeof value === 'string'
          ? value
          : typeof value === 'number' || typeof value === 'boolean'
            ? String(value)
            : '';
      return `"${raw.replace(/"/g, '""')}"`;
    };
    const rows = filteredArchives.map(item => {
      const assignedEmployees = (item as any).assignedEmployees as
        | Employee[]
        | undefined;
      const assignedEmployee = (item as any).assignedEmployee as
        | Employee
        | undefined;
      const assignedLabel = assignedEmployees?.length
        ? assignedEmployees
            .map(emp => [emp.name, emp.nameEn].filter(Boolean).join(' '))
            .join('; ')
        : [assignedEmployee?.name, assignedEmployee?.nameEn]
            .filter(Boolean)
            .join(' ');
      const isOneOff = (item as any)?.oneOffMeta?.mode === 'one_off';
      return [
        item.id,
        item.propertyId,
        (item as any).propertyAddress || '',
        item.status,
        (item as any).checkOutDate || '',
        (item as any).submittedAt || '',
        assignedLabel,
        isOneOff ? 'yes' : 'no',
      ]
        .map(cell => escapeCsv(cell))
        .join(',');
    });
    const header = [
      'id',
      'property',
      'address',
      'status',
      'check_out_date',
      'submitted_at',
      'assigned',
      'one_off',
    ]
      .map(cell => `"${cell}"`)
      .join(',');
    const csvContent = [header, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `inspection-archive-${dayjs().format('YYYYMMDD-HHmmss')}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    appendArchiveActionLog(
      'export.csv',
      `Exported ${filteredArchives.length} filtered inspections`
    );
    messageApi.success(
      t('sparkery.inspectionAdmin.messages.exportCsvSuccess', {
        defaultValue: '{{count}} records exported to CSV.',
        count: filteredArchives.length,
      })
    );
  }, [appendArchiveActionLog, filteredArchives, messageApi, t]);

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

  const handleInvertVisibleSelection = React.useCallback(() => {
    const visibleIds = filteredArchives.map(item => item.id);
    if (visibleIds.length === 0) {
      return;
    }
    setSelectedArchiveIds(prev => {
      const current = new Set(prev);
      visibleIds.forEach(id => {
        if (current.has(id)) {
          current.delete(id);
        } else {
          current.add(id);
        }
      });
      return Array.from(current);
    });
    appendArchiveActionLog(
      'selection.invert_visible',
      `Inverted selection for ${visibleIds.length} visible inspections`
    );
  }, [appendArchiveActionLog, filteredArchives]);

  const handleSelectVisibleByQuickChip = React.useCallback(
    (
      quickChip:
        | 'due_today'
        | 'overdue'
        | 'missing_required_photos'
        | 'no_assignee'
    ) => {
      const todayStart = dayjs().startOf('day').valueOf();
      const todayEnd = dayjs().endOf('day').valueOf();
      const targetIds = filteredArchives
        .filter(item => {
          if (quickChip === 'due_today') {
            const checkOutDateValue = parseArchiveDateValue(
              (item as any).checkOutDate
            );
            return (
              item.status !== 'submitted' &&
              checkOutDateValue >= todayStart &&
              checkOutDateValue <= todayEnd
            );
          }
          if (quickChip === 'overdue') {
            const checkOutDateValue = parseArchiveDateValue(
              (item as any).checkOutDate
            );
            return (
              item.status !== 'submitted' &&
              checkOutDateValue > 0 &&
              checkOutDateValue < todayStart
            );
          }
          if (quickChip === 'no_assignee') {
            const assignedEmployees = (item as any).assignedEmployees as
              | Employee[]
              | undefined;
            const assignedEmployee = (item as any).assignedEmployee as
              | Employee
              | undefined;
            return (
              !assignedEmployee &&
              (!assignedEmployees || assignedEmployees.length === 0)
            );
          }
          const sectionItems = Array.isArray((item as any).sections)
            ? ((item as any).sections as any[])
            : [];
          const missingRequiredPhotoCount = sectionItems.reduce(
            (total, section) => {
              const checklist = Array.isArray(section?.checklist)
                ? section.checklist
                : [];
              return (
                total +
                checklist.filter(
                  (checklistItem: any) =>
                    checklistItem?.requiredPhoto === true &&
                    !checklistItem?.photo
                ).length
              );
            },
            0
          );
          return missingRequiredPhotoCount > 0;
        })
        .map(item => item.id);

      if (targetIds.length === 0) {
        messageApi.info(
          t('sparkery.inspectionAdmin.messages.noMatchingRecordsForSelection', {
            defaultValue: 'No matching records in current results.',
          })
        );
        return;
      }
      setSelectedArchiveIds(prev =>
        Array.from(new Set([...prev, ...targetIds]))
      );
      appendArchiveActionLog(
        'selection.quick_subset',
        `Selected ${targetIds.length} records for quick chip ${quickChip}`
      );
      messageApi.success(
        t('sparkery.inspectionAdmin.messages.quickSelectionApplied', {
          defaultValue: 'Selected {{count}} matching records.',
          count: targetIds.length,
        })
      );
    },
    [appendArchiveActionLog, filteredArchives, messageApi, t]
  );

  const toggleArchiveExpanded = React.useCallback((archiveId: string) => {
    setExpandedArchiveIds(prev =>
      prev.includes(archiveId)
        ? prev.filter(id => id !== archiveId)
        : [...prev, archiveId]
    );
  }, []);

  const handleSetVisibleArchiveExpanded = React.useCallback(
    (expanded: boolean) => {
      const visibleIds = filteredArchives.map(item => item.id);
      if (visibleIds.length === 0) {
        return;
      }
      const visibleSet = new Set(visibleIds);
      setExpandedArchiveIds(prev => {
        if (expanded) {
          const next = new Set(prev);
          visibleIds.forEach(id => next.add(id));
          return Array.from(next);
        }
        return prev.filter(id => !visibleSet.has(id));
      });
      appendArchiveActionLog(
        expanded ? 'detail.expand_visible' : 'detail.collapse_visible',
        `${expanded ? 'Expanded' : 'Collapsed'} ${visibleIds.length} visible detail cards`
      );
    },
    [appendArchiveActionLog, filteredArchives]
  );

  React.useEffect(() => {
    const handleSelectionShortcut = (event: KeyboardEvent) => {
      const withMeta = event.ctrlKey || event.metaKey;
      if (!withMeta || !event.shiftKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      const targetTag = target?.tagName?.toLowerCase() || '';
      const isTypingTarget =
        targetTag === 'input' ||
        targetTag === 'textarea' ||
        target?.isContentEditable;
      if (isTypingTarget) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === 'a') {
        event.preventDefault();
        toggleSelectAllVisible(true);
        return;
      }
      if (key === 'i') {
        event.preventDefault();
        handleInvertVisibleSelection();
        return;
      }
      if (key === 'l') {
        event.preventDefault();
        void handleCopySelectedLinks();
        return;
      }
      if (key === 'd') {
        event.preventDefault();
        void handleCopySelectedIds();
        return;
      }
      if (key === 'e') {
        event.preventDefault();
        handleSetVisibleArchiveExpanded(true);
        return;
      }
      if (key === 'w') {
        event.preventDefault();
        handleSetVisibleArchiveExpanded(false);
      }
    };
    window.addEventListener('keydown', handleSelectionShortcut);
    return () => {
      window.removeEventListener('keydown', handleSelectionShortcut);
    };
  }, [
    handleCopySelectedIds,
    handleCopySelectedLinks,
    handleInvertVisibleSelection,
    handleSetVisibleArchiveExpanded,
    toggleSelectAllVisible,
  ]);

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
                advancedFilters: { ...archiveAdvancedFilters },
                fieldVisibility: { ...archiveFieldVisibility },
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
        advancedFilters: { ...archiveAdvancedFilters },
        fieldVisibility: { ...archiveFieldVisibility },
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
    archiveAdvancedFilters,
    archiveFieldVisibility,
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
      setArchiveAdvancedFilters(
        normalizeArchiveAdvancedFilters(targetView.advancedFilters)
      );
      setArchiveFieldVisibility(
        normalizeArchiveFieldVisibility(targetView.fieldVisibility)
      );
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

  const toggleArchiveViewPinned = React.useCallback((viewId: string) => {
    setPinnedArchiveViewIds(prev =>
      prev.includes(viewId)
        ? prev.filter(id => id !== viewId)
        : [viewId, ...prev].slice(0, MAX_ARCHIVE_VIEWS)
    );
  }, []);

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
    const sameAdvancedFilter =
      JSON.stringify(activeView.advancedFilters) ===
      JSON.stringify(archiveAdvancedFilters);
    const sameFieldVisibility =
      JSON.stringify(activeView.fieldVisibility) ===
      JSON.stringify(archiveFieldVisibility);
    if (
      !sameSearch ||
      !sameFilter ||
      !sameAdvancedFilter ||
      !sameFieldVisibility
    ) {
      setActiveArchiveViewId('');
    }
  }, [
    activeArchiveViewId,
    archiveAdvancedFilters,
    archiveFieldVisibility,
    archiveFilters,
    archiveViews,
    searchText,
  ]);

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
  const archiveRefreshSourceMeta = React.useMemo(() => {
    if (lastArchiveRefreshSource === 'manual') {
      return {
        color: 'blue',
        text: t('sparkery.inspectionAdmin.labels.refreshManual', {
          defaultValue: 'Manual',
        }),
      };
    }
    if (lastArchiveRefreshSource === 'auto_focus') {
      return {
        color: 'purple',
        text: t('sparkery.inspectionAdmin.labels.refreshOnFocus', {
          defaultValue: 'Auto (Focus)',
        }),
      };
    }
    if (lastArchiveRefreshSource === 'auto_interval') {
      return {
        color: 'geekblue',
        text: t('sparkery.inspectionAdmin.labels.refreshByInterval', {
          defaultValue: 'Auto (Interval)',
        }),
      };
    }
    return {
      color: 'default',
      text: t('sparkery.inspectionAdmin.labels.refreshInitial', {
        defaultValue: 'Initial',
      }),
    };
  }, [lastArchiveRefreshSource, t]);
  const oneOffSections = getAllSections(oneOffSectionIds);
  const oneOffSectionAddOptions = React.useMemo(
    () => buildOneOffSectionAddOptions(),
    []
  );
  const sortedArchiveViews = React.useMemo(() => {
    const pinned = new Set(pinnedArchiveViewIds);
    return [...archiveViews].sort((left, right) => {
      const leftPinned = pinned.has(left.id);
      const rightPinned = pinned.has(right.id);
      if (leftPinned !== rightPinned) {
        return leftPinned ? -1 : 1;
      }
      return (
        parseArchiveDateValue(right.updatedAt) -
        parseArchiveDateValue(left.updatedAt)
      );
    });
  }, [archiveViews, pinnedArchiveViewIds]);
  const recentArchiveViews = React.useMemo(
    () => sortedArchiveViews.slice(0, 4),
    [sortedArchiveViews]
  );
  const uiQuickActions = React.useMemo<UiQuickAction[]>(
    () => [
      {
        id: 'new_one_off',
        label: t('sparkery.inspectionAdmin.actions.oneOffTemplateGenerator', {
          defaultValue: 'One-off Template Generator',
        }),
        hint: 'Ctrl/Cmd+Shift+N',
        keywords: ['oneoff', 'template', 'create', 'new'],
      },
      {
        id: 'refresh_archive',
        label: t('sparkery.inspectionAdmin.actions.refreshArchives', {
          defaultValue: 'Refresh Archives',
        }),
        hint: 'Ctrl/Cmd+Shift+R',
        keywords: ['refresh', 'sync', 'reload'],
      },
      {
        id: 'focus_search',
        label: t('sparkery.inspectionAdmin.actions.focusSearch', {
          defaultValue: 'Focus Search',
        }),
        hint: 'Ctrl/Cmd+Shift+F',
        keywords: ['search', 'find'],
      },
      {
        id: 'save_snapshot',
        label: t('sparkery.inspectionAdmin.actions.saveSnapshot', {
          defaultValue: 'Save Snapshot',
        }),
        hint: '',
        keywords: ['snapshot', 'save', 'memory'],
      },
      {
        id: 'restore_session',
        label: t('sparkery.inspectionAdmin.actions.restoreSession', {
          defaultValue: 'Restore Last Session',
        }),
        hint: '',
        keywords: ['restore', 'session', 'memory'],
      },
      {
        id: 'open_shortcuts',
        label: t('sparkery.inspectionAdmin.actions.shortcuts', {
          defaultValue: 'Shortcuts',
        }),
        hint: '?',
        keywords: ['shortcut', 'keyboard', 'help'],
      },
      {
        id: 'open_filters_drawer',
        label: t('sparkery.inspectionAdmin.actions.openMobileFilters', {
          defaultValue: 'Open Filters Drawer',
        }),
        hint: 'Ctrl/Cmd+Shift+M',
        keywords: ['filter', 'drawer', 'mobile'],
      },
      {
        id: 'open_ops_inbox',
        label: t('sparkery.inspectionAdmin.logs.title', {
          defaultValue: 'Operation Center',
        }),
        hint: '',
        keywords: ['ops', 'logs', 'notification', 'error'],
      },
      {
        id: 'open_ui_tour',
        label: t('sparkery.inspectionAdmin.actions.uiTour', {
          defaultValue: 'UI Tour',
        }),
        hint: '',
        keywords: ['tour', 'guide', 'onboarding'],
      },
      {
        id: 'toggle_filter_collapse',
        label: isArchiveFiltersCollapsed
          ? t('sparkery.inspectionAdmin.actions.expandFilters', {
              defaultValue: 'Expand Filters',
            })
          : t('sparkery.inspectionAdmin.actions.collapseFilters', {
              defaultValue: 'Collapse Filters',
            }),
        hint: '',
        keywords: ['filter', 'collapse', 'expand'],
      },
      {
        id: 'export_filtered_csv',
        label: t('sparkery.inspectionAdmin.actions.exportFilteredCsv', {
          defaultValue: 'Export Filtered CSV',
        }),
        hint: '',
        keywords: ['export', 'csv', 'filtered'],
      },
      {
        id: 'export_logs_csv',
        label: t('sparkery.inspectionAdmin.actions.exportLogs', {
          defaultValue: 'Export Logs',
        }),
        hint: '',
        keywords: ['export', 'logs', 'csv'],
      },
      {
        id: 'copy_selected_links',
        label: t('sparkery.inspectionAdmin.actions.batchCopyLinks', {
          defaultValue: 'Copy Selected Links',
        }),
        hint: 'Ctrl/Cmd+Shift+L',
        keywords: ['copy', 'links', 'selected'],
      },
      {
        id: 'copy_selected_ids',
        label: t('sparkery.inspectionAdmin.actions.batchCopyIds', {
          defaultValue: 'Copy Selected IDs',
        }),
        hint: 'Ctrl/Cmd+Shift+D',
        keywords: ['copy', 'ids', 'selected'],
      },
      {
        id: 'select_visible',
        label: t('sparkery.inspectionAdmin.actions.selectVisible', {
          defaultValue: 'Select Visible',
        }),
        hint: 'Ctrl/Cmd+Shift+A',
        keywords: ['selection', 'visible', 'bulk'],
      },
      {
        id: 'invert_visible_selection',
        label: t('sparkery.inspectionAdmin.actions.invertVisibleSelection', {
          defaultValue: 'Invert Visible Selection',
        }),
        hint: 'Ctrl/Cmd+Shift+I',
        keywords: ['selection', 'invert', 'visible'],
      },
    ],
    [isArchiveFiltersCollapsed, t]
  );
  const quickActionMap = React.useMemo(
    () =>
      new Map<UiQuickActionId, UiQuickAction>(
        uiQuickActions.map(action => [action.id, action])
      ),
    [uiQuickActions]
  );
  const favoriteQuickActions = React.useMemo(
    () =>
      favoriteQuickActionIds
        .map(actionId => quickActionMap.get(actionId))
        .filter((action): action is UiQuickAction => Boolean(action)),
    [favoriteQuickActionIds, quickActionMap]
  );
  const executeUiQuickAction = React.useCallback(
    async (
      actionId: UiQuickActionId,
      source: 'panel' | 'command' = 'panel'
    ) => {
      if (actionId === 'new_one_off') {
        handleOpenOneOffGenerator();
      } else if (actionId === 'refresh_archive') {
        await handleManualRefreshArchives();
      } else if (actionId === 'focus_search') {
        archiveSearchInputRef.current?.focus();
      } else if (actionId === 'save_snapshot') {
        handleRememberCurrentFilterContext();
      } else if (actionId === 'restore_session') {
        handleRestoreLastSessionFilters();
      } else if (actionId === 'open_shortcuts') {
        setIsShortcutHelpOpen(true);
      } else if (actionId === 'open_filters_drawer') {
        setIsArchiveFiltersDrawerOpen(true);
      } else if (actionId === 'open_ops_inbox') {
        setIsOpsInboxOpen(true);
      } else if (actionId === 'open_ui_tour') {
        setIsUiTourOpen(true);
      } else if (actionId === 'toggle_filter_collapse') {
        setIsArchiveFiltersCollapsed(prev => !prev);
      } else if (actionId === 'export_filtered_csv') {
        handleExportFilteredArchivesCsv();
      } else if (actionId === 'export_logs_csv') {
        handleExportActionLogsCsv();
      } else if (actionId === 'copy_selected_links') {
        await handleCopySelectedLinks();
      } else if (actionId === 'copy_selected_ids') {
        await handleCopySelectedIds();
      } else if (actionId === 'select_visible') {
        toggleSelectAllVisible(true);
      } else if (actionId === 'invert_visible_selection') {
        handleInvertVisibleSelection();
      }
      appendArchiveActionLog(
        'quick_action.executed',
        `Executed quick action "${actionId}" from ${source}`
      );
    },
    [
      appendArchiveActionLog,
      handleCopySelectedIds,
      handleCopySelectedLinks,
      handleExportActionLogsCsv,
      handleExportFilteredArchivesCsv,
      handleInvertVisibleSelection,
      handleManualRefreshArchives,
      handleOpenOneOffGenerator,
      handleRememberCurrentFilterContext,
      handleRestoreLastSessionFilters,
      toggleSelectAllVisible,
    ]
  );
  const filteredCommandActions = React.useMemo(() => {
    const query = commandPaletteQuery.trim().toLowerCase();
    const favoriteSet = new Set(favoriteQuickActionIds);
    const scored = uiQuickActions
      .filter(action => {
        if (!query) {
          return true;
        }
        const haystack = [
          action.label.toLowerCase(),
          action.hint.toLowerCase(),
          ...action.keywords.map(keyword => keyword.toLowerCase()),
        ];
        return haystack.some(value => value.includes(query));
      })
      .sort((left, right) => {
        const leftFav = favoriteSet.has(left.id);
        const rightFav = favoriteSet.has(right.id);
        if (leftFav !== rightFav) {
          return leftFav ? -1 : 1;
        }
        return left.label.localeCompare(right.label);
      });
    return scored.slice(0, 24);
  }, [commandPaletteQuery, favoriteQuickActionIds, uiQuickActions]);
  const opsInboxItems = React.useMemo(
    () =>
      archiveActionLogs
        .filter(log =>
          ['failed', 'error', 'warn', 'warning'].some(keyword =>
            `${log.type} ${log.detail}`.toLowerCase().includes(keyword)
          )
        )
        .slice(0, 30),
    [archiveActionLogs]
  );
  const opsInboxUnreadCount = React.useMemo(() => {
    const readAtValue = parseArchiveDateValue(opsInboxReadAt);
    return opsInboxItems.filter(
      item => parseArchiveDateValue(item.at) > readAtValue
    ).length;
  }, [opsInboxItems, opsInboxReadAt]);
  const toggleFavoriteQuickAction = React.useCallback(
    (actionId: UiQuickActionId) => {
      setFavoriteQuickActionIds(prev =>
        prev.includes(actionId)
          ? prev.filter(item => item !== actionId)
          : [...prev, actionId].slice(-10)
      );
    },
    []
  );
  const mapLogTypeToQuickAction = React.useCallback(
    (logType: string): UiQuickActionId | null => {
      if (logType.includes('refresh')) return 'refresh_archive';
      if (logType.includes('view')) return 'save_snapshot';
      if (logType.includes('export.csv')) return 'export_filtered_csv';
      if (logType.includes('logs.export.csv')) return 'export_logs_csv';
      if (logType.includes('selection')) return 'select_visible';
      if (logType.includes('one_off')) return 'new_one_off';
      return null;
    },
    []
  );
  const archiveEnvironmentMeta = React.useMemo(() => {
    const modeValue = String(import.meta.env.MODE || '').toLowerCase();
    const host =
      typeof window !== 'undefined'
        ? window.location.hostname.toLowerCase()
        : '';
    if (
      modeValue.includes('prod') ||
      host.includes('wendeal') ||
      host.includes('vercel.app')
    ) {
      return {
        key: 'prod',
        label: t('sparkery.inspectionAdmin.labels.environmentProd', {
          defaultValue: 'PROD',
        }),
        color: 'red',
      } as const;
    }
    if (modeValue.includes('test') || host.includes('staging')) {
      return {
        key: 'staging',
        label: t('sparkery.inspectionAdmin.labels.environmentStaging', {
          defaultValue: 'STAGING',
        }),
        color: 'gold',
      } as const;
    }
    return {
      key: 'dev',
      label: t('sparkery.inspectionAdmin.labels.environmentDev', {
        defaultValue: 'DEV',
      }),
      color: 'blue',
    } as const;
  }, [t]);
  const archiveModuleLabelMap = React.useMemo<Record<ArchiveModuleId, string>>(
    () => ({
      workspace: t('sparkery.inspectionAdmin.labels.workspaceControl', {
        defaultValue: 'Workspace Control',
      }),
      system_health: t('sparkery.inspectionAdmin.labels.systemHealth', {
        defaultValue: 'System Health',
      }),
      quick_start: t('sparkery.inspectionAdmin.quick.title', {
        defaultValue: 'Quick Inspection Link',
      }),
      today_focus: t('sparkery.inspectionAdmin.labels.todayFocus', {
        defaultValue: 'Today Focus',
      }),
      overview: t('sparkery.inspectionAdmin.overview.title', {
        defaultValue: 'Inspection Overview',
      }),
      ui_preferences: t('sparkery.inspectionAdmin.labels.uiPreferences', {
        defaultValue: 'UI Preferences',
      }),
      quick_actions: t('sparkery.inspectionAdmin.labels.quickActions', {
        defaultValue: 'Quick Actions',
      }),
      search: t('sparkery.inspectionAdmin.labels.filterAndSearch', {
        defaultValue: 'Search & Filters',
      }),
      batch: t('sparkery.inspectionAdmin.labels.batchActions', {
        defaultValue: 'Batch Actions',
      }),
      results: t('sparkery.inspectionAdmin.labels.resultsList', {
        defaultValue: 'Results',
      }),
      logs: t('sparkery.inspectionAdmin.logs.title', {
        defaultValue: 'Operation Center',
      }),
    }),
    [t]
  );
  const isArchiveModuleVisible = React.useCallback(
    (moduleId: ArchiveModuleId) => !archiveHiddenModules.includes(moduleId),
    [archiveHiddenModules]
  );
  const archiveModuleOrderMap = React.useMemo(() => {
    const map: Record<ArchiveModuleId, number> = {
      workspace: ARCHIVE_MODULE_IDS.length,
      system_health: ARCHIVE_MODULE_IDS.length,
      quick_start: ARCHIVE_MODULE_IDS.length,
      today_focus: ARCHIVE_MODULE_IDS.length,
      overview: ARCHIVE_MODULE_IDS.length,
      ui_preferences: ARCHIVE_MODULE_IDS.length,
      quick_actions: ARCHIVE_MODULE_IDS.length,
      search: ARCHIVE_MODULE_IDS.length,
      batch: ARCHIVE_MODULE_IDS.length,
      results: ARCHIVE_MODULE_IDS.length,
      logs: ARCHIVE_MODULE_IDS.length,
    };
    archiveModuleOrder.forEach((moduleId, index) => {
      map[moduleId] = index;
    });
    return map;
  }, [archiveModuleOrder]);
  const getArchiveModuleOrderStyle = React.useCallback(
    (moduleId: ArchiveModuleId): React.CSSProperties => ({
      order: archiveModuleOrderMap[moduleId] ?? ARCHIVE_MODULE_IDS.length,
    }),
    [archiveModuleOrderMap]
  );
  const moveArchiveModule = React.useCallback(
    (moduleId: ArchiveModuleId, direction: 'up' | 'down') => {
      setArchiveModuleOrder(prev => {
        const index = prev.indexOf(moduleId);
        if (index < 0) {
          return prev;
        }
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= prev.length) {
          return prev;
        }
        return reorderList(prev, index, targetIndex);
      });
    },
    []
  );
  const toggleArchiveModuleVisibility = React.useCallback(
    (moduleId: ArchiveModuleId) => {
      if (moduleId === 'workspace') {
        return;
      }
      setArchiveHiddenModules(prev =>
        prev.includes(moduleId)
          ? prev.filter(item => item !== moduleId)
          : [...prev, moduleId]
      );
    },
    []
  );
  const toggleArchiveModuleFavorite = React.useCallback(
    (moduleId: ArchiveModuleId) => {
      setFavoriteArchiveModules(prev =>
        prev.includes(moduleId)
          ? prev.filter(item => item !== moduleId)
          : [...prev, moduleId].slice(-6)
      );
    },
    []
  );
  const jumpToArchiveModule = React.useCallback((moduleId: ArchiveModuleId) => {
    const el = document.getElementById(`inspection-module-${moduleId}`);
    if (!el) {
      return;
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);
  const saveArchiveLayoutPreset = React.useCallback(() => {
    const trimmed = archiveLayoutName.trim();
    if (!trimmed) {
      messageApi.warning(
        t('sparkery.inspectionAdmin.messages.layoutNameRequired', {
          defaultValue: 'Please input a layout preset name first.',
        })
      );
      return;
    }
    const now = new Date().toISOString();
    setArchiveLayoutPresets(prev => {
      const existing = prev.find(
        item => item.id === activeArchiveLayoutPresetId
      );
      if (existing) {
        return prev.map(item =>
          item.id === existing.id
            ? {
                ...item,
                name: trimmed,
                moduleOrder: archiveModuleOrder,
                hiddenModules: archiveHiddenModules,
                favoriteModules: favoriteArchiveModules,
                nightReviewMode: isNightReviewMode,
                updatedAt: now,
              }
            : item
        );
      }
      const next: ArchiveLayoutPreset = {
        id: `layout-${generateId()}`,
        name: trimmed,
        moduleOrder: archiveModuleOrder,
        hiddenModules: archiveHiddenModules,
        favoriteModules: favoriteArchiveModules,
        nightReviewMode: isNightReviewMode,
        updatedAt: now,
      };
      setActiveArchiveLayoutPresetId(next.id);
      return [next, ...prev].slice(0, MAX_ARCHIVE_LAYOUT_PRESETS);
    });
    setArchiveLayoutName('');
  }, [
    activeArchiveLayoutPresetId,
    archiveHiddenModules,
    archiveLayoutName,
    archiveModuleOrder,
    favoriteArchiveModules,
    isNightReviewMode,
    messageApi,
    t,
  ]);
  const applyArchiveLayoutPreset = React.useCallback(
    (presetId: string) => {
      const target = archiveLayoutPresets.find(item => item.id === presetId);
      if (!target) {
        return;
      }
      setArchiveModuleOrder(normalizeArchiveModuleOrder(target.moduleOrder));
      setArchiveHiddenModules(
        normalizeArchiveModuleList(target.hiddenModules).filter(
          item => item !== 'workspace'
        )
      );
      setFavoriteArchiveModules(
        normalizeArchiveModuleList(target.favoriteModules)
      );
      setIsNightReviewMode(Boolean(target.nightReviewMode));
      setActiveArchiveLayoutPresetId(target.id);
      appendArchiveActionLog(
        'workspace.layout.applied',
        `Applied workspace preset "${target.name}"`
      );
    },
    [appendArchiveActionLog, archiveLayoutPresets]
  );
  const deleteArchiveLayoutPreset = React.useCallback(
    (presetId: string) => {
      const target = archiveLayoutPresets.find(item => item.id === presetId);
      setArchiveLayoutPresets(prev =>
        prev.filter(item => item.id !== presetId)
      );
      if (activeArchiveLayoutPresetId === presetId) {
        setActiveArchiveLayoutPresetId('');
      }
      appendArchiveActionLog(
        'workspace.layout.deleted',
        `Deleted workspace preset "${target?.name || presetId}"`
      );
    },
    [activeArchiveLayoutPresetId, appendArchiveActionLog, archiveLayoutPresets]
  );
  const recentOpenedArchives = React.useMemo(
    () =>
      recentOpenedArchiveIds
        .map(archiveId => archives.find(item => item.id === archiveId))
        .filter((item): item is InspectionArchive => Boolean(item)),
    [archives, recentOpenedArchiveIds]
  );
  const archiveOperationalKpi = React.useMemo(() => {
    if (filteredArchives.length === 0) {
      return {
        overdueRate: 0,
        missingPhotoRate: 0,
        avgAgingHours: 0,
      };
    }
    const now = dayjs().valueOf();
    let overdue = 0;
    let missing = 0;
    let agingSum = 0;
    filteredArchives.forEach(item => {
      const checkOutDate = parseArchiveDateValue((item as any).checkOutDate);
      if (
        item.status !== 'submitted' &&
        checkOutDate > 0 &&
        checkOutDate < now
      ) {
        overdue += 1;
      }
      const sections = Array.isArray((item as any).sections)
        ? ((item as any).sections as any[])
        : [];
      const missingRequiredPhotoCount = sections.reduce((sum, section) => {
        const checklist = Array.isArray(section?.checklist)
          ? section.checklist
          : [];
        return (
          sum +
          checklist.filter(
            (checkItem: any) =>
              checkItem?.requiredPhoto === true && !checkItem?.photo
          ).length
        );
      }, 0);
      if (missingRequiredPhotoCount > 0) {
        missing += 1;
      }
      const createdTime =
        parseArchiveDateValue((item as any).submittedAt) ||
        parseArchiveDateValue((item as any).checkOutDate);
      if (createdTime > 0) {
        agingSum += (now - createdTime) / (1000 * 60 * 60);
      }
    });
    return {
      overdueRate: Number(
        ((overdue / filteredArchives.length) * 100).toFixed(1)
      ),
      missingPhotoRate: Number(
        ((missing / filteredArchives.length) * 100).toFixed(1)
      ),
      avgAgingHours: Number((agingSum / filteredArchives.length).toFixed(1)),
    };
  }, [filteredArchives]);
  const visibleArchiveModules = React.useMemo(
    () =>
      archiveModuleOrder.filter(moduleId => isArchiveModuleVisible(moduleId)),
    [archiveModuleOrder, isArchiveModuleVisible]
  );
  const todayFocusArchives = React.useMemo(() => {
    const now = dayjs().valueOf();
    const todayStart = dayjs().startOf('day').valueOf();
    return filteredArchives
      .filter(item => item.status !== 'submitted')
      .map(item => {
        const checkOutDateValue = parseArchiveDateValue(
          (item as any).checkOutDate
        );
        const sections = Array.isArray((item as any).sections)
          ? ((item as any).sections as any[])
          : [];
        const missingRequiredPhotoCount = sections.reduce((sum, section) => {
          const checklist = Array.isArray(section?.checklist)
            ? section.checklist
            : [];
          return (
            sum +
            checklist.filter(
              (checkItem: any) =>
                checkItem?.requiredPhoto === true && !checkItem?.photo
            ).length
          );
        }, 0);
        const assignedEmployees = (item as any).assignedEmployees as
          | Employee[]
          | undefined;
        const assignedEmployee = (item as any).assignedEmployee as
          | Employee
          | undefined;
        const noAssignee =
          !assignedEmployee &&
          (!assignedEmployees || assignedEmployees.length === 0);
        const isOverdue =
          checkOutDateValue > 0 && checkOutDateValue < todayStart;
        const isDueToday =
          checkOutDateValue >= todayStart && checkOutDateValue <= now;
        const score =
          (isOverdue ? 5 : 0) +
          (isDueToday ? 3 : 0) +
          (noAssignee ? 2 : 0) +
          (missingRequiredPhotoCount > 0 ? 2 : 0);
        return {
          item,
          score,
          isOverdue,
          isDueToday,
          noAssignee,
          missingRequiredPhotoCount,
        };
      })
      .filter(entry => entry.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 6);
  }, [filteredArchives]);
  const toggleArchiveBoardColumnCollapse = React.useCallback(
    (status: InspectionArchive['status']) => {
      setArchiveBoardCollapse(prev => ({
        ...prev,
        [status]: !prev[status],
      }));
    },
    []
  );
  const moveArchiveBoardStatusColumn = React.useCallback(
    (status: InspectionArchive['status'], direction: 'left' | 'right') => {
      setArchiveBoardStatusOrder(prev => {
        const currentIndex = prev.indexOf(status);
        if (currentIndex < 0) {
          return prev;
        }
        const targetIndex =
          direction === 'left' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= prev.length) {
          return prev;
        }
        return reorderList(prev, currentIndex, targetIndex);
      });
    },
    []
  );
  const toggleArchiveBoardStatusVisibility = React.useCallback(
    (status: InspectionArchive['status']) => {
      setArchiveBoardHiddenStatuses(prev =>
        prev.includes(status)
          ? prev.filter(item => item !== status)
          : [...prev, status]
      );
    },
    []
  );
  const handleBoardDropStatus = React.useCallback(
    async (targetStatus: InspectionArchive['status']) => {
      if (!draggingArchiveId) {
        return;
      }
      const current = archives.find(item => item.id === draggingArchiveId);
      if (!current || current.status === targetStatus) {
        setDraggingArchiveId('');
        return;
      }
      await handleUpdateSingleArchive(draggingArchiveId, {
        status: targetStatus,
        submittedAt:
          targetStatus === 'submitted'
            ? ((current as any).submittedAt as string) ||
              new Date().toISOString()
            : (current as any).submittedAt || '',
      });
      setDraggingArchiveId('');
    },
    [archives, draggingArchiveId, handleUpdateSingleArchive]
  );
  const archiveBoardColumns = React.useMemo(
    () =>
      archiveBoardStatusOrder
        .filter(status => !archiveBoardHiddenStatuses.includes(status))
        .map(status => {
          const items = filteredArchives.filter(item => item.status === status);
          const now = dayjs();
          const todayStart = now.startOf('day').valueOf();
          const dwellHours = items
            .map(item => {
              const primary =
                parseArchiveDateValue((item as any).checkOutDate) ||
                parseArchiveDateValue((item as any).submittedAt);
              return primary ? (now.valueOf() - primary) / (1000 * 60 * 60) : 0;
            })
            .filter(value => value > 0);
          const avgDwellHours =
            dwellHours.length > 0
              ? Number(
                  (
                    dwellHours.reduce((sum, value) => sum + value, 0) /
                    dwellHours.length
                  ).toFixed(1)
                )
              : 0;
          const todayAddedCount = items.filter(item => {
            const createdAt = parseArchiveDateValue((item as any).createdAt);
            return createdAt >= todayStart;
          }).length;
          const todayCompletedCount =
            status === 'submitted'
              ? items.filter(item => {
                  const submittedAt = parseArchiveDateValue(
                    (item as any).submittedAt
                  );
                  return submittedAt >= todayStart;
                }).length
              : 0;
          return {
            status,
            meta: getArchiveStatusMeta(status),
            wipLimit: ARCHIVE_BOARD_WIP_LIMITS[status],
            items,
            avgDwellHours,
            todayAddedCount,
            todayCompletedCount,
          };
        }),
    [
      archiveBoardHiddenStatuses,
      archiveBoardStatusOrder,
      filteredArchives,
      getArchiveStatusMeta,
    ]
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
  const detailArchiveDiffSummary = React.useMemo(() => {
    if (!detailArchive || detailArchiveIndex <= 0) {
      return null;
    }
    const previous = filteredArchives[detailArchiveIndex - 1];
    if (!previous) {
      return null;
    }
    const trackedKeys: Array<keyof InspectionArchive | string> = [
      'propertyId',
      'status',
      'checkOutDate',
      'propertyAddress',
      'propertyNotes',
    ];
    const changedKeys = trackedKeys.filter(key => {
      const currentValue = (detailArchive as any)[key];
      const previousValue = (previous as any)[key];
      return JSON.stringify(currentValue) !== JSON.stringify(previousValue);
    });
    return {
      previousId: previous.id,
      changedKeys,
    };
  }, [detailArchive, detailArchiveIndex, filteredArchives]);
  const handleOpenArchiveDetailDrawer = React.useCallback(
    (archiveId: string) => {
      setDetailArchiveId(archiveId);
      setRecentOpenedArchiveIds(prev =>
        [archiveId, ...prev.filter(item => item !== archiveId)].slice(
          0,
          MAX_ARCHIVE_RECENT_OPENED
        )
      );
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
      const hasAssignee = Boolean(
        assignedEmployee || (assignedEmployees && assignedEmployees.length > 0)
      );
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
      const missingRequiredPhotoCount = sectionItems.reduce(
        (total, section) => {
          const checklist = Array.isArray(section?.checklist)
            ? section.checklist
            : [];
          return (
            total +
            checklist.filter(
              (checklistItem: any) =>
                checklistItem?.requiredPhoto === true && !checklistItem?.photo
            ).length
          );
        },
        0
      );
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
      const checkOutDateValue = parseArchiveDateValue(
        (item as any).checkOutDate
      );
      const todayStart = dayjs().startOf('day').valueOf();
      const todayEnd = dayjs().endOf('day').valueOf();
      const isDueToday =
        item.status !== 'submitted' &&
        checkOutDateValue >= todayStart &&
        checkOutDateValue <= todayEnd;
      const isOverdue =
        item.status !== 'submitted' &&
        checkOutDateValue > 0 &&
        checkOutDateValue < todayStart;
      const isPinned = archiveCardMeta.pinnedIds.includes(item.id);
      const isStarred = archiveCardMeta.starredIds.includes(item.id);
      const isReviewed = archiveCardMeta.reviewedIds.includes(item.id);
      const archiveTags = archiveCardMeta.tagByArchiveId[item.id] || [];
      const slaHours = checkOutDateValue
        ? Number(
            (
              (checkOutDateValue - dayjs().valueOf()) /
              (1000 * 60 * 60)
            ).toFixed(1)
          )
        : 0;
      const slaPercent = checkOutDateValue
        ? Math.max(
            0,
            Math.min(
              100,
              Number(((1 - Math.max(0, slaHours) / 48) * 100).toFixed(1))
            )
          )
        : 0;
      return (
        <Card
          key={item.id}
          size='small'
          className={`sparkery-inspection-archive-card ${
            isSelected ? 'sparkery-inspection-archive-card-selected' : ''
          } ${isPinned ? 'sparkery-inspection-archive-card-pinned' : ''} ${
            isStarred ? 'sparkery-inspection-archive-card-starred' : ''
          } ${
            archiveFilters.density === 'dense'
              ? 'sparkery-inspection-archive-card-dense'
              : archiveFilters.density === 'compact'
                ? 'sparkery-inspection-archive-card-compact'
                : 'sparkery-inspection-archive-card-comfortable'
          } ${inBoard ? 'sparkery-inspection-archive-card-board' : ''}`}
          draggable={inBoard}
          onDragStart={() => setDraggingArchiveId(item.id)}
          onDragEnd={() => setDraggingArchiveId('')}
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
                  {renderHighlightedText(
                    item.propertyId ||
                      t('sparkery.inspectionAdmin.labels.unnamed', {
                        defaultValue: 'Unnamed',
                      }),
                    searchText
                  )}
                </Text>
                <Tag color={statusMeta.color} icon={statusMeta.icon}>
                  {statusMeta.label}
                </Tag>
                {isPinned ? (
                  <Tag color='processing' icon={<PushpinFilled />}>
                    {t('sparkery.inspectionAdmin.labels.pinned', {
                      defaultValue: 'Pinned',
                    })}
                  </Tag>
                ) : null}
                {isStarred ? (
                  <Tag color='gold' icon={<StarFilled />}>
                    {t('sparkery.inspectionAdmin.labels.starred', {
                      defaultValue: 'Starred',
                    })}
                  </Tag>
                ) : null}
                {isReviewed ? (
                  <Tag color='green' icon={<CheckOutlined />}>
                    {t('sparkery.inspectionAdmin.labels.reviewed', {
                      defaultValue: 'Reviewed',
                    })}
                  </Tag>
                ) : null}
                {isOneOff ? (
                  <Tag color='geekblue'>
                    {t('sparkery.inspectionAdmin.labels.oneOff', {
                      defaultValue: 'One-off',
                    })}
                  </Tag>
                ) : null}
                {isOverdue ? (
                  <Tag color='volcano'>
                    {t('sparkery.inspectionAdmin.labels.overdue', {
                      defaultValue: 'Overdue',
                    })}
                  </Tag>
                ) : null}
                {isDueToday ? (
                  <Tag color='orange'>
                    {t('sparkery.inspectionAdmin.labels.dueToday', {
                      defaultValue: 'Due Today',
                    })}
                  </Tag>
                ) : null}
                {missingRequiredPhotoCount > 0 ? (
                  <Tag color='red'>
                    {t('sparkery.inspectionAdmin.labels.missingPhotosShort', {
                      defaultValue: 'Missing Photo {{count}}',
                      count: missingRequiredPhotoCount,
                    })}
                  </Tag>
                ) : null}
                {!hasAssignee ? (
                  <Tag color='blue'>
                    {t('sparkery.inspectionAdmin.labels.noAssigneeShort', {
                      defaultValue: 'No Assignee',
                    })}
                  </Tag>
                ) : null}
                <Tag
                  color={isOverdue ? 'red' : isDueToday ? 'orange' : 'default'}
                >
                  {t('sparkery.inspectionAdmin.labels.priority', {
                    defaultValue: 'Priority',
                  })}
                  :{' '}
                  {isOverdue
                    ? t('sparkery.inspectionAdmin.labels.priorityHigh', {
                        defaultValue: 'High',
                      })
                    : isDueToday
                      ? t('sparkery.inspectionAdmin.labels.priorityMedium', {
                          defaultValue: 'Medium',
                        })
                      : t('sparkery.inspectionAdmin.labels.priorityLow', {
                          defaultValue: 'Low',
                        })}
                </Tag>
              </Space>
              {archiveFieldVisibility.showDates ? (
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
              ) : null}
              {archiveFieldVisibility.showAddress &&
              (item as any).propertyAddress ? (
                <Text
                  type='secondary'
                  className='sparkery-inspection-archive-meta-text'
                >
                  {renderHighlightedText(
                    (item as any).propertyAddress,
                    searchText
                  )}
                </Text>
              ) : null}
              {archiveFieldVisibility.showAssignee && assignedLabel ? (
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
              {archiveFieldVisibility.showId ? (
                <Text type='secondary' className='sparkery-inspection-id-text'>
                  {item.id}
                </Text>
              ) : null}
              {archiveTags.length > 0 ? (
                <Space size={[4, 4]} wrap>
                  {archiveTags.slice(0, 8).map(tag => (
                    <Tag key={`${item.id}-${tag}`} color='cyan'>
                      {renderHighlightedText(tag, searchText)}
                    </Tag>
                  ))}
                </Space>
              ) : null}
              {checkOutDateValue > 0 ? (
                <div className='sparkery-inspection-archive-sla'>
                  <Text
                    type='secondary'
                    className='sparkery-inspection-archive-meta-text'
                  >
                    {t('sparkery.inspectionAdmin.labels.slaCountdown', {
                      defaultValue: 'SLA',
                    })}
                    :{' '}
                    {slaHours >= 0
                      ? t('sparkery.inspectionAdmin.labels.hoursRemaining', {
                          defaultValue: '{{count}}h remaining',
                          count: slaHours,
                        })
                      : t('sparkery.inspectionAdmin.labels.hoursLate', {
                          defaultValue: '{{count}}h late',
                          count: Math.abs(slaHours),
                        })}
                  </Text>
                  <Progress
                    percent={slaPercent}
                    size='small'
                    showInfo={false}
                    status={isOverdue ? 'exception' : 'active'}
                  />
                </div>
              ) : null}
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
                <Tooltip
                  title={t('sparkery.inspectionAdmin.actions.togglePin', {
                    defaultValue: 'Pin / Unpin',
                  })}
                >
                  <Button
                    type='text'
                    icon={isPinned ? <PushpinFilled /> : <PushpinOutlined />}
                    onClick={() =>
                      toggleArchiveMetaId(item.id, 'pinnedIds', 'pin.toggled')
                    }
                    aria-label={t('sparkery.inspectionAdmin.aria.togglePin', {
                      defaultValue: 'Pin or unpin inspection {{id}}',
                      id: item.id,
                    })}
                  />
                </Tooltip>
                <Tooltip
                  title={t('sparkery.inspectionAdmin.actions.toggleStar', {
                    defaultValue: 'Star / Unstar',
                  })}
                >
                  <Button
                    type='text'
                    icon={isStarred ? <StarFilled /> : <StarOutlined />}
                    onClick={() =>
                      toggleArchiveMetaId(item.id, 'starredIds', 'star.toggled')
                    }
                    aria-label={t('sparkery.inspectionAdmin.aria.toggleStar', {
                      defaultValue: 'Star or unstar inspection {{id}}',
                      id: item.id,
                    })}
                  />
                </Tooltip>
                <Tooltip
                  title={t('sparkery.inspectionAdmin.actions.markReviewed', {
                    defaultValue: 'Mark Reviewed',
                  })}
                >
                  <Button
                    type='text'
                    icon={<CheckOutlined />}
                    onClick={() =>
                      toggleArchiveMetaId(
                        item.id,
                        'reviewedIds',
                        'reviewed.toggled'
                      )
                    }
                    aria-label={t(
                      'sparkery.inspectionAdmin.aria.toggleReviewed',
                      {
                        defaultValue:
                          'Mark inspection {{id}} reviewed or unreviewed',
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
                  <Button
                    type='text'
                    danger
                    icon={<DeleteOutlined />}
                    aria-label={t(
                      'sparkery.inspectionAdmin.aria.deleteInspection',
                      {
                        defaultValue: 'Delete inspection {{id}}',
                        id: item.id,
                      }
                    )}
                  />
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
              {missingRequiredPhotoCount > 0 ? (
                <Tag color='red'>
                  {t('sparkery.inspectionAdmin.labels.missingRequiredPhotos', {
                    defaultValue: 'Missing Required Photos',
                  })}
                  : {missingRequiredPhotoCount}
                </Tag>
              ) : null}
              <Tag>
                {t('sparkery.inspectionAdmin.labels.damageReports', {
                  defaultValue: 'Damage Reports',
                })}
                : {damageReportCount}
              </Tag>
              <Input
                size='small'
                prefix={<TagsOutlined />}
                placeholder={t('sparkery.inspectionAdmin.placeholders.addTag', {
                  defaultValue: 'Add tag',
                })}
                value={detailArchiveId === item.id ? archiveTagDraft : ''}
                onChange={event => {
                  if (detailArchiveId !== item.id) {
                    setDetailArchiveId(item.id);
                  }
                  setArchiveTagDraft(event.target.value);
                }}
                onPressEnter={event => {
                  const input = event.currentTarget as HTMLInputElement;
                  handleAddArchiveTag(item.id, input.value);
                  setArchiveTagDraft('');
                }}
                style={{ width: 180 }}
              />
              <Button
                size='small'
                onClick={() => {
                  handleAddArchiveTag(item.id, archiveTagDraft);
                  setArchiveTagDraft('');
                }}
              >
                {t('sparkery.inspectionAdmin.actions.addTag', {
                  defaultValue: 'Add Tag',
                })}
              </Button>
              {(archiveCardMeta.tagByArchiveId[item.id] || []).map(tag => (
                <Tag
                  key={`tag-remove-${item.id}-${tag}`}
                  closable
                  color='cyan'
                  onClose={event => {
                    event.preventDefault();
                    handleRemoveArchiveTag(item.id, tag);
                  }}
                >
                  {tag}
                </Tag>
              ))}
              <Input
                size='small'
                defaultValue={item.propertyId}
                placeholder={t(
                  'sparkery.inspectionAdmin.placeholders.inlinePropertyName',
                  {
                    defaultValue: 'Edit property name',
                  }
                )}
                onBlur={event => {
                  const nextValue = event.target.value.trim();
                  if (nextValue && nextValue !== item.propertyId) {
                    void handleUpdateSingleArchive(item.id, {
                      propertyId: nextValue,
                    });
                  }
                }}
                style={{ width: 200 }}
              />
              <Input
                size='small'
                defaultValue={notePreview}
                placeholder={t(
                  'sparkery.inspectionAdmin.placeholders.inlineNotes',
                  {
                    defaultValue: 'Edit notes',
                  }
                )}
                onBlur={event => {
                  const nextValue = event.target.value;
                  if (nextValue !== notePreview) {
                    void handleUpdateSingleArchive(item.id, {
                      propertyNotes: nextValue,
                    });
                  }
                }}
                style={{ width: 240 }}
              />
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
      archiveCardMeta,
      archiveFieldVisibility,
      archiveFilters.density,
      archiveTagDraft,
      detailArchiveId,
      expandedArchiveIds,
      getArchiveStatusMeta,
      handleAddArchiveTag,
      handleCopyLink,
      handleDelete,
      handleOpen,
      handleOpenArchiveDetailDrawer,
      handleRemoveArchiveTag,
      handleUpdateSingleArchive,
      searchText,
      selectedArchiveIds,
      toggleArchiveMetaId,
      t,
      toggleArchiveExpanded,
      toggleArchiveSelection,
    ]
  );

  return (
    <div
      className={`sparkery-tool-page sparkery-inspection-admin-page ${
        archiveUiPrefs.colorBlindMode
          ? 'sparkery-inspection-colorblind-mode'
          : ''
      } ${
        archiveUiPrefs.highContrastFocus
          ? 'sparkery-inspection-focus-strong'
          : ''
      } ${
        archiveUiPrefs.fontScale === 'large'
          ? 'sparkery-inspection-font-large'
          : ''
      } ${
        archiveUiPrefs.screenReaderCompact
          ? 'sparkery-inspection-screen-reader-compact'
          : ''
      } ${
        archiveUiPrefs.reduceMotion ? 'sparkery-inspection-reduce-motion' : ''
      } ${
        archiveUiPrefs.spacing === 'tight'
          ? 'sparkery-inspection-spacing-tight'
          : ''
      } ${isNightReviewMode ? 'sparkery-inspection-night-review' : ''}`}
    >
      <a
        href='#inspection-main-content'
        className='sparkery-inspection-skip-link'
      >
        {t('sparkery.inspectionAdmin.actions.skipToMainContent', {
          defaultValue: 'Skip to main content',
        })}
      </a>
      {contextHolder}
      <div className='sparkery-inspection-header'>
        <Breadcrumb
          className='sparkery-inspection-breadcrumb'
          items={[
            {
              title: t('sparkery.inspectionAdmin.breadcrumb.sparkery', {
                defaultValue: 'Sparkery',
              }),
            },
            {
              title: t('sparkery.inspectionAdmin.breadcrumb.inspectionAdmin', {
                defaultValue: 'Inspection Admin',
              }),
            },
          ]}
        />
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
          <Button
            icon={<ThunderboltOutlined />}
            onClick={() => {
              setCommandPaletteQuery('');
              setIsCommandPaletteOpen(true);
            }}
          >
            {t('sparkery.inspectionAdmin.actions.commandPalette', {
              defaultValue: 'Command Palette',
            })}
          </Button>
          <Button icon={<BulbOutlined />} onClick={() => setIsUiTourOpen(true)}>
            {t('sparkery.inspectionAdmin.actions.uiTour', {
              defaultValue: 'UI Tour',
            })}
          </Button>
          <Button
            icon={<ReadOutlined />}
            onClick={() =>
              window.open(
                'https://github.com/Wendealai/WendealDashboard/tree/master/docs',
                '_blank',
                'noopener,noreferrer'
              )
            }
          >
            {t('sparkery.inspectionAdmin.actions.openPlaybook', {
              defaultValue: 'Playbook',
            })}
          </Button>
          <Badge count={opsInboxUnreadCount} size='small' offset={[0, 4]}>
            <Button
              icon={<BellOutlined />}
              onClick={() => setIsOpsInboxOpen(true)}
            >
              {t('sparkery.inspectionAdmin.actions.opsInbox', {
                defaultValue: 'Ops Inbox',
              })}
            </Button>
          </Badge>
          <Badge
            count={recentOpenedArchives.length}
            size='small'
            offset={[0, 4]}
            color='geekblue'
          >
            <Button
              icon={<HistoryOutlined />}
              onClick={() => setIsRecentOpenedOpen(true)}
            >
              {t('sparkery.inspectionAdmin.actions.recentOpened', {
                defaultValue: 'Recent Opened',
              })}
            </Button>
          </Badge>
          <Tag color={archiveEnvironmentMeta.color}>
            {t('sparkery.inspectionAdmin.labels.environment', {
              defaultValue: 'Env',
            })}
            : {archiveEnvironmentMeta.label}
          </Tag>
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
          <Text type='secondary' className='sparkery-inspection-status-note'>
            {t('sparkery.inspectionAdmin.labels.lastRefreshSource', {
              defaultValue: 'Refresh source',
            })}
            :{' '}
            <Tag color={archiveRefreshSourceMeta.color}>
              {archiveRefreshSourceMeta.text}
            </Tag>
          </Text>
        </div>
        <div className='sparkery-inspection-module-directory'>
          <Text type='secondary'>
            {t('sparkery.inspectionAdmin.labels.moduleDirectory', {
              defaultValue: 'Module Directory',
            })}
            :
          </Text>
          <Space wrap>
            {visibleArchiveModules.map(moduleId => (
              <Button
                key={`module-dir-${moduleId}`}
                size='small'
                type='text'
                onClick={() => jumpToArchiveModule(moduleId)}
              >
                {archiveModuleLabelMap[moduleId]}
              </Button>
            ))}
          </Space>
        </div>
      </div>

      <div
        id='inspection-main-content'
        className='sparkery-inspection-module-stack'
        tabIndex={-1}
      >
        {isArchiveModuleVisible('workspace') ? (
          <Card
            id='inspection-module-workspace'
            size='small'
            className='sparkery-inspection-overview-card'
            style={getArchiveModuleOrderStyle('workspace')}
          >
            <Space
              direction='vertical'
              className='sparkery-inspection-full-width'
            >
              <Space wrap className='sparkery-inspection-full-width'>
                <Text strong>
                  {t('sparkery.inspectionAdmin.labels.workspaceControl', {
                    defaultValue: 'Workspace Control',
                  })}
                </Text>
                <Switch
                  checked={isNightReviewMode}
                  onChange={checked => setIsNightReviewMode(checked)}
                />
                <Text type='secondary'>
                  {t('sparkery.inspectionAdmin.labels.nightReviewMode', {
                    defaultValue: 'Night Review Mode',
                  })}
                </Text>
                <Tag color={archiveEnvironmentMeta.color}>
                  {archiveEnvironmentMeta.label}
                </Tag>
              </Space>
              <Space wrap className='sparkery-inspection-full-width'>
                {favoriteArchiveModules.map(moduleId => (
                  <Button
                    key={`favorite-module-${moduleId}`}
                    size='small'
                    type='default'
                    onClick={() => jumpToArchiveModule(moduleId)}
                  >
                    {archiveModuleLabelMap[moduleId]}
                  </Button>
                ))}
              </Space>
              <Space wrap className='sparkery-inspection-full-width'>
                <Select
                  size='small'
                  value={activeArchiveLayoutPresetId || undefined}
                  allowClear
                  style={{ minWidth: 220 }}
                  placeholder={t(
                    'sparkery.inspectionAdmin.placeholders.workspacePreset',
                    {
                      defaultValue: 'Workspace preset',
                    }
                  )}
                  onChange={(value?: string) => {
                    if (!value) {
                      setActiveArchiveLayoutPresetId('');
                      return;
                    }
                    applyArchiveLayoutPreset(value);
                  }}
                  options={archiveLayoutPresets.map(item => ({
                    value: item.id,
                    label: `${item.name} · ${dayjs(item.updatedAt).format('MM-DD HH:mm')}`,
                  }))}
                />
                <Input
                  size='small'
                  value={archiveLayoutName}
                  onChange={event => setArchiveLayoutName(event.target.value)}
                  placeholder={t(
                    'sparkery.inspectionAdmin.placeholders.layoutPresetName',
                    {
                      defaultValue: 'Save workspace as...',
                    }
                  )}
                  style={{ width: 220 }}
                />
                <Button size='small' onClick={saveArchiveLayoutPreset}>
                  {t('sparkery.inspectionAdmin.actions.saveWorkspace', {
                    defaultValue: 'Save Workspace',
                  })}
                </Button>
                <Button
                  size='small'
                  danger
                  disabled={!activeArchiveLayoutPresetId}
                  onClick={() =>
                    deleteArchiveLayoutPreset(activeArchiveLayoutPresetId)
                  }
                >
                  {t('sparkery.inspectionAdmin.actions.deleteWorkspace', {
                    defaultValue: 'Delete Workspace',
                  })}
                </Button>
              </Space>
              <div className='sparkery-inspection-module-control-grid'>
                {archiveModuleOrder.map((moduleId, index) => (
                  <div
                    key={`module-control-${moduleId}`}
                    className='sparkery-inspection-module-control-item'
                  >
                    <Text strong>{archiveModuleLabelMap[moduleId]}</Text>
                    <Space size={4}>
                      <Button
                        size='small'
                        icon={<VerticalAlignTopOutlined />}
                        disabled={index === 0}
                        onClick={() => moveArchiveModule(moduleId, 'up')}
                      />
                      <Button
                        size='small'
                        icon={<VerticalAlignBottomOutlined />}
                        disabled={index === archiveModuleOrder.length - 1}
                        onClick={() => moveArchiveModule(moduleId, 'down')}
                      />
                      <Button
                        size='small'
                        icon={
                          favoriteArchiveModules.includes(moduleId) ? (
                            <StarFilled />
                          ) : (
                            <StarOutlined />
                          )
                        }
                        onClick={() => toggleArchiveModuleFavorite(moduleId)}
                      />
                      <Button
                        size='small'
                        icon={<EyeOutlined />}
                        type={
                          isArchiveModuleVisible(moduleId)
                            ? 'default'
                            : 'dashed'
                        }
                        disabled={moduleId === 'workspace'}
                        onClick={() => toggleArchiveModuleVisibility(moduleId)}
                      >
                        {isArchiveModuleVisible(moduleId)
                          ? t('sparkery.inspectionAdmin.actions.visible', {
                              defaultValue: 'Visible',
                            })
                          : t('sparkery.inspectionAdmin.actions.hidden', {
                              defaultValue: 'Hidden',
                            })}
                      </Button>
                      <Button
                        size='small'
                        icon={<LinkOutlined />}
                        onClick={() => jumpToArchiveModule(moduleId)}
                      >
                        {t('sparkery.inspectionAdmin.actions.jump', {
                          defaultValue: 'Jump',
                        })}
                      </Button>
                    </Space>
                  </div>
                ))}
              </div>
            </Space>
          </Card>
        ) : null}

        {isArchiveModuleVisible('system_health') ? (
          <Card
            id='inspection-module-system_health'
            size='small'
            className='sparkery-inspection-overview-card'
            style={getArchiveModuleOrderStyle('system_health')}
          >
            <Space wrap className='sparkery-inspection-full-width'>
              <Tag color={supabaseTagColor}>
                {t('sparkery.inspectionAdmin.labels.systemHealth', {
                  defaultValue: 'System',
                })}
                : {supabaseTagText}
              </Tag>
              <Tag color={opsInboxUnreadCount > 0 ? 'red' : 'green'}>
                {t('sparkery.inspectionAdmin.labels.unreadOps', {
                  defaultValue: 'Unread Ops',
                })}
                : {opsInboxUnreadCount}
              </Tag>
              <Tag color={selectedArchiveIds.length > 0 ? 'blue' : 'default'}>
                {t('sparkery.inspectionAdmin.batch.selectedCount', {
                  defaultValue: '{{count}} selected',
                  count: selectedArchiveIds.length,
                })}
              </Tag>
              <Tag color='processing'>
                {t('sparkery.inspectionAdmin.overview.visibleSummary', {
                  defaultValue: 'Showing {{visible}} of {{total}} inspections',
                  visible: filteredArchives.length,
                  total: archiveStats.total,
                })}
              </Tag>
              <Tag color='volcano'>
                {t('sparkery.inspectionAdmin.labels.overdueRate', {
                  defaultValue: 'Overdue',
                })}
                : {archiveOperationalKpi.overdueRate}%
              </Tag>
              <Tag color='orange'>
                {t('sparkery.inspectionAdmin.labels.missingPhotoRate', {
                  defaultValue: 'Missing Photos',
                })}
                : {archiveOperationalKpi.missingPhotoRate}%
              </Tag>
              <Tag color='geekblue'>
                {t('sparkery.inspectionAdmin.labels.avgAgingHours', {
                  defaultValue: 'Avg Aging',
                })}
                : {archiveOperationalKpi.avgAgingHours}h
              </Tag>
            </Space>
          </Card>
        ) : null}

        {/* Quick Start Wizard: select property + date, then start inspection */}
        {isArchiveModuleVisible('quick_start') ? (
          <Card
            id='inspection-module-quick_start'
            size='small'
            className='sparkery-inspection-quick-card'
            style={getArchiveModuleOrderStyle('quick_start')}
          >
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
              <Text
                type='secondary'
                className='sparkery-inspection-shortcut-hint'
              >
                {t('sparkery.inspectionAdmin.hints.oneOffShortcut', {
                  defaultValue:
                    'Shortcuts: Ctrl/Cmd+K (command palette), Ctrl/Cmd+Shift+N (one-off), Ctrl/Cmd+Shift+R (refresh), Ctrl/Cmd+Shift+F (focus search), Ctrl/Cmd+Shift+G/H (next/prev match), Ctrl/Cmd+Shift+M (filters), Ctrl/Cmd+Shift+A (select visible), Ctrl/Cmd+Shift+I (invert), Ctrl/Cmd+Shift+L (copy links), Ctrl/Cmd+Shift+D (copy IDs), Ctrl/Cmd+Shift+E (expand details), Ctrl/Cmd+Shift+W (collapse details)',
                })}
              </Text>
            </Space>
          </Card>
        ) : null}

        {isArchiveModuleVisible('today_focus') ? (
          <Card
            id='inspection-module-today_focus'
            size='small'
            className='sparkery-inspection-overview-card'
            style={getArchiveModuleOrderStyle('today_focus')}
          >
            <Space
              direction='vertical'
              className='sparkery-inspection-full-width'
            >
              <div className='sparkery-inspection-overview-head'>
                <Text strong>
                  {t('sparkery.inspectionAdmin.labels.todayFocus', {
                    defaultValue: 'Today Focus',
                  })}
                </Text>
                <Space wrap>
                  <Tag color='volcano'>
                    {t('sparkery.inspectionAdmin.labels.overdue', {
                      defaultValue: 'Overdue',
                    })}
                    : {filteredArchiveRiskStats.overdue}
                  </Tag>
                  <Tag color='orange'>
                    {t('sparkery.inspectionAdmin.labels.dueToday', {
                      defaultValue: 'Due Today',
                    })}
                    : {filteredArchiveRiskStats.dueToday}
                  </Tag>
                  <Tag color='gold'>
                    {t('sparkery.inspectionAdmin.labels.noAssigneeShort', {
                      defaultValue: 'No Assignee',
                    })}
                    : {filteredArchiveRiskStats.noAssignee}
                  </Tag>
                </Space>
              </div>
              <Space wrap>
                <Button
                  size='small'
                  onClick={() => updateArchiveFilter({ quickChip: 'overdue' })}
                >
                  {t('sparkery.inspectionAdmin.actions.focusOverdue', {
                    defaultValue: 'Focus Overdue',
                  })}
                </Button>
                <Button
                  size='small'
                  onClick={() =>
                    updateArchiveFilter({ quickChip: 'due_today' })
                  }
                >
                  {t('sparkery.inspectionAdmin.actions.focusDueToday', {
                    defaultValue: 'Focus Due Today',
                  })}
                </Button>
                <Button
                  size='small'
                  onClick={() =>
                    updateArchiveFilter({
                      quickChip: 'missing_required_photos',
                    })
                  }
                >
                  {t('sparkery.inspectionAdmin.actions.focusMissingPhotos', {
                    defaultValue: 'Focus Missing Photos',
                  })}
                </Button>
              </Space>
              {todayFocusArchives.length > 0 ? (
                <div className='sparkery-inspection-focus-list'>
                  {todayFocusArchives.map(entry => (
                    <div
                      key={`focus-archive-${entry.item.id}`}
                      className='sparkery-inspection-focus-item'
                    >
                      <Space direction='vertical' size={2}>
                        <Text strong>
                          {renderHighlightedText(
                            (entry.item as any).propertyName ||
                              entry.item.propertyId ||
                              t('sparkery.inspectionAdmin.labels.unnamed', {
                                defaultValue: 'Unnamed',
                              }),
                            searchText
                          )}
                        </Text>
                        <Text type='secondary'>{entry.item.id}</Text>
                        <Space wrap size={4}>
                          {entry.isOverdue ? (
                            <Tag color='volcano'>
                              {t('sparkery.inspectionAdmin.labels.overdue', {
                                defaultValue: 'Overdue',
                              })}
                            </Tag>
                          ) : null}
                          {entry.isDueToday ? (
                            <Tag color='orange'>
                              {t('sparkery.inspectionAdmin.labels.dueToday', {
                                defaultValue: 'Due Today',
                              })}
                            </Tag>
                          ) : null}
                          {entry.noAssignee ? (
                            <Tag color='gold'>
                              {t(
                                'sparkery.inspectionAdmin.labels.noAssigneeShort',
                                {
                                  defaultValue: 'No Assignee',
                                }
                              )}
                            </Tag>
                          ) : null}
                          {entry.missingRequiredPhotoCount > 0 ? (
                            <Tag color='red'>
                              {t(
                                'sparkery.inspectionAdmin.labels.missingRequiredPhotos',
                                {
                                  defaultValue: 'Missing Required Photos',
                                }
                              )}
                              : {entry.missingRequiredPhotoCount}
                            </Tag>
                          ) : null}
                        </Space>
                      </Space>
                      <Space wrap size={6}>
                        <Button
                          size='small'
                          onClick={() =>
                            handleOpenArchiveDetailDrawer(entry.item.id)
                          }
                        >
                          {t('sparkery.inspectionAdmin.actions.details', {
                            defaultValue: 'Details',
                          })}
                        </Button>
                        <Button
                          size='small'
                          onClick={() => handleOpen(entry.item)}
                        >
                          {t(
                            'sparkery.inspectionAdmin.actions.openInspection',
                            {
                              defaultValue: 'Open inspection',
                            }
                          )}
                        </Button>
                      </Space>
                    </div>
                  ))}
                </div>
              ) : (
                <Text type='secondary'>
                  {t('sparkery.inspectionAdmin.labels.noFocusItems', {
                    defaultValue:
                      'No high-priority items in the current filtered scope.',
                  })}
                </Text>
              )}
            </Space>
          </Card>
        ) : null}

        {isArchiveModuleVisible('overview') ? (
          <Card
            id='inspection-module-overview'
            size='small'
            className='sparkery-inspection-overview-card'
            style={getArchiveModuleOrderStyle('overview')}
          >
            <div className='sparkery-inspection-overview-head'>
              <Text strong>
                {t('sparkery.inspectionAdmin.overview.title', {
                  defaultValue: 'Inspection Overview',
                })}
              </Text>
              <Space size={12} wrap>
                <Text type='secondary'>
                  {t('sparkery.inspectionAdmin.overview.visibleSummary', {
                    defaultValue:
                      'Showing {{visible}} of {{total}} inspections',
                    visible: filteredArchives.length,
                    total: archiveStats.total,
                  })}
                </Text>
                <Text type='secondary'>
                  {t('sparkery.inspectionAdmin.overview.lastRefresh', {
                    defaultValue: 'Last refresh: {{time}}',
                    time: lastArchiveRefreshAt
                      ? dayjs(lastArchiveRefreshAt).format(
                          'YYYY-MM-DD HH:mm:ss'
                        )
                      : t('sparkery.inspectionAdmin.labels.never', {
                          defaultValue: 'Never',
                        }),
                  })}
                </Text>
                <Space size={6} align='center'>
                  <Text type='secondary'>
                    {t('sparkery.inspectionAdmin.labels.autoRefresh', {
                      defaultValue: 'Auto-refresh',
                    })}
                  </Text>
                  <Select
                    size='small'
                    value={archiveRefreshIntervalSeconds}
                    style={{ width: 150 }}
                    onChange={(value: number) =>
                      setArchiveRefreshIntervalSeconds(value)
                    }
                    options={[
                      {
                        value: 0,
                        label: t('sparkery.inspectionAdmin.labels.refreshOff', {
                          defaultValue: 'Off',
                        }),
                      },
                      {
                        value: 15,
                        label: t('sparkery.inspectionAdmin.labels.refresh15s', {
                          defaultValue: '15s',
                        }),
                      },
                      {
                        value: 30,
                        label: t('sparkery.inspectionAdmin.labels.refresh30s', {
                          defaultValue: '30s',
                        }),
                      },
                      {
                        value: 60,
                        label: t('sparkery.inspectionAdmin.labels.refresh60s', {
                          defaultValue: '60s',
                        }),
                      },
                    ]}
                  />
                </Space>
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
        ) : null}

        {isArchiveModuleVisible('ui_preferences') ? (
          <Card
            id='inspection-module-ui_preferences'
            size='small'
            className='sparkery-inspection-overview-card'
            style={getArchiveModuleOrderStyle('ui_preferences')}
          >
            <Space wrap className='sparkery-inspection-full-width'>
              <Text strong>
                {t('sparkery.inspectionAdmin.labels.uiPreferences', {
                  defaultValue: 'UI Preferences',
                })}
              </Text>
              <Switch
                checked={archiveUiPrefs.colorBlindMode}
                onChange={checked =>
                  setArchiveUiPrefs(prev => ({
                    ...prev,
                    colorBlindMode: checked,
                  }))
                }
              />
              <Text type='secondary'>
                {t('sparkery.inspectionAdmin.labels.colorBlindMode', {
                  defaultValue: 'Color-blind mode',
                })}
              </Text>
              <Switch
                checked={archiveUiPrefs.highContrastFocus}
                onChange={checked =>
                  setArchiveUiPrefs(prev => ({
                    ...prev,
                    highContrastFocus: checked,
                  }))
                }
              />
              <Text type='secondary'>
                {t('sparkery.inspectionAdmin.labels.highContrastFocus', {
                  defaultValue: 'High contrast focus',
                })}
              </Text>
              <Switch
                checked={archiveUiPrefs.screenReaderCompact}
                onChange={checked =>
                  setArchiveUiPrefs(prev => ({
                    ...prev,
                    screenReaderCompact: checked,
                  }))
                }
              />
              <Text type='secondary'>
                {t('sparkery.inspectionAdmin.labels.screenReaderCompact', {
                  defaultValue: 'Screen-reader compact',
                })}
              </Text>
              <Switch
                checked={archiveUiPrefs.reduceMotion}
                onChange={checked =>
                  setArchiveUiPrefs(prev => ({
                    ...prev,
                    reduceMotion: checked,
                  }))
                }
              />
              <Text type='secondary'>
                {t('sparkery.inspectionAdmin.labels.reduceMotion', {
                  defaultValue: 'Reduce Motion',
                })}
              </Text>
              <Segmented
                value={archiveUiPrefs.fontScale}
                options={[
                  {
                    value: 'normal',
                    label: t('sparkery.inspectionAdmin.labels.fontNormal', {
                      defaultValue: 'Normal Font',
                    }),
                  },
                  {
                    value: 'large',
                    label: t('sparkery.inspectionAdmin.labels.fontLarge', {
                      defaultValue: 'Large Font',
                    }),
                  },
                ]}
                onChange={value =>
                  setArchiveUiPrefs(prev => ({
                    ...prev,
                    fontScale: value as ArchiveUiPrefsState['fontScale'],
                  }))
                }
              />
              <Segmented
                value={archiveUiPrefs.spacing}
                options={[
                  {
                    value: 'normal',
                    label: t('sparkery.inspectionAdmin.labels.spacingNormal', {
                      defaultValue: 'Normal Spacing',
                    }),
                  },
                  {
                    value: 'tight',
                    label: t('sparkery.inspectionAdmin.labels.spacingTight', {
                      defaultValue: 'Tight Spacing',
                    }),
                  },
                ]}
                onChange={value =>
                  setArchiveUiPrefs(prev => ({
                    ...prev,
                    spacing: value as ArchiveUiPrefsState['spacing'],
                  }))
                }
              />
              <Button
                icon={<FilterOutlined />}
                onClick={() => setIsArchiveFiltersDrawerOpen(true)}
              >
                {t('sparkery.inspectionAdmin.actions.openMobileFilters', {
                  defaultValue: 'Open Filters Drawer',
                })}
              </Button>
            </Space>
          </Card>
        ) : null}

        {isArchiveModuleVisible('quick_actions') ? (
          <Card
            id='inspection-module-quick_actions'
            size='small'
            className='sparkery-inspection-overview-card'
            style={getArchiveModuleOrderStyle('quick_actions')}
          >
            <Space
              direction='vertical'
              className='sparkery-inspection-full-width'
            >
              <Space wrap className='sparkery-inspection-full-width'>
                <Text strong>
                  {t('sparkery.inspectionAdmin.labels.quickActions', {
                    defaultValue: 'Quick Actions',
                  })}
                </Text>
                <Button
                  size='small'
                  icon={<ThunderboltOutlined />}
                  onClick={() => {
                    setCommandPaletteQuery('');
                    setIsCommandPaletteOpen(true);
                  }}
                >
                  {t('sparkery.inspectionAdmin.actions.commandPalette', {
                    defaultValue: 'Command Palette',
                  })}
                </Button>
                <Text type='secondary'>
                  {t('sparkery.inspectionAdmin.labels.commandPaletteHint', {
                    defaultValue: 'Ctrl/Cmd + K',
                  })}
                </Text>
              </Space>
              <Space wrap className='sparkery-inspection-full-width'>
                {(favoriteQuickActions.length > 0
                  ? favoriteQuickActions
                  : uiQuickActions.slice(0, 6)
                ).map(action => (
                  <Button
                    key={`fav-action-${action.id}`}
                    size='small'
                    icon={<PlayCircleOutlined />}
                    onClick={() =>
                      void executeUiQuickAction(action.id, 'panel')
                    }
                  >
                    {action.label}
                  </Button>
                ))}
              </Space>
              <Space wrap className='sparkery-inspection-full-width'>
                <Text type='secondary'>
                  {t('sparkery.inspectionAdmin.labels.recentViews', {
                    defaultValue: 'Recent Views',
                  })}
                  :
                </Text>
                {recentArchiveViews.length > 0 ? (
                  recentArchiveViews.map(view => (
                    <Button
                      key={`recent-view-${view.id}`}
                      size='small'
                      onClick={() => handleApplyArchiveView(view.id)}
                    >
                      {view.name}
                    </Button>
                  ))
                ) : (
                  <Text type='secondary'>
                    {t('sparkery.inspectionAdmin.labels.noneYet', {
                      defaultValue: 'None yet',
                    })}
                  </Text>
                )}
              </Space>
              <Space wrap className='sparkery-inspection-full-width'>
                <Text type='secondary'>
                  {t('sparkery.inspectionAdmin.labels.recentOpsReplay', {
                    defaultValue: 'Recent Ops Replay',
                  })}
                  :
                </Text>
                {archiveActionLogs.slice(0, 4).map(log => {
                  const mappedAction = mapLogTypeToQuickAction(log.type);
                  return mappedAction ? (
                    <Button
                      key={`recent-op-${log.id}`}
                      size='small'
                      onClick={() =>
                        void executeUiQuickAction(mappedAction, 'panel')
                      }
                    >
                      {log.type}
                    </Button>
                  ) : (
                    <Tag key={`recent-op-${log.id}`} color='blue'>
                      {log.type}
                    </Tag>
                  );
                })}
              </Space>
            </Space>
          </Card>
        ) : null}

        {isArchiveModuleVisible('search') ? (
          <Card
            id='inspection-module-search'
            size='small'
            className='sparkery-inspection-search-card'
            style={getArchiveModuleOrderStyle('search')}
          >
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
                  aria-label={t(
                    'sparkery.inspectionAdmin.aria.searchInspection',
                    {
                      defaultValue: 'Search inspection archives',
                    }
                  )}
                />
                <Space wrap className='sparkery-inspection-filter-actions'>
                  <Button
                    size='small'
                    onClick={() => focusSearchMatchByOffset(-1)}
                    disabled={searchableArchiveIds.length === 0}
                  >
                    {t('sparkery.inspectionAdmin.actions.prevMatch', {
                      defaultValue: 'Prev Match',
                    })}
                  </Button>
                  <Button
                    size='small'
                    onClick={() => focusSearchMatchByOffset(1)}
                    disabled={searchableArchiveIds.length === 0}
                  >
                    {t('sparkery.inspectionAdmin.actions.nextMatch', {
                      defaultValue: 'Next Match',
                    })}
                  </Button>
                  <Text type='secondary'>
                    {t('sparkery.inspectionAdmin.labels.matchIndex', {
                      defaultValue: '{{index}} / {{total}}',
                      index:
                        searchableArchiveIds.length > 0
                          ? searchMatchCursor + 1
                          : 0,
                      total: searchableArchiveIds.length,
                    })}
                  </Text>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={handleExportFilteredArchivesCsv}
                  >
                    {t('sparkery.inspectionAdmin.actions.exportCsv', {
                      defaultValue: 'Export CSV',
                    })}
                  </Button>
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
                  <Button
                    icon={<QuestionCircleOutlined />}
                    onClick={() => setIsShortcutHelpOpen(true)}
                  >
                    {t('sparkery.inspectionAdmin.actions.shortcuts', {
                      defaultValue: 'Shortcuts',
                    })}
                  </Button>
                  <Button
                    icon={<FilterOutlined />}
                    onClick={() => setIsArchiveFiltersCollapsed(prev => !prev)}
                  >
                    {isArchiveFiltersCollapsed
                      ? t('sparkery.inspectionAdmin.actions.expandFilters', {
                          defaultValue: 'Expand Filters',
                        })
                      : t('sparkery.inspectionAdmin.actions.collapseFilters', {
                          defaultValue: 'Collapse Filters',
                        })}
                  </Button>
                </Space>
              </div>
              <Text
                type='secondary'
                className='sparkery-inspection-search-syntax-hint'
              >
                {t('sparkery.inspectionAdmin.hints.searchSyntax', {
                  defaultValue:
                    'Tip: status:pending assignee:tom id:abc tag:urgent address:queen customer:brisbane oneoff:true',
                })}
              </Text>
              {archiveSearchHistory.length > 0 ? (
                <div className='sparkery-inspection-risk-strip'>
                  <Text
                    type='secondary'
                    className='sparkery-inspection-filter-item-label'
                  >
                    {t('sparkery.inspectionAdmin.labels.searchHistory', {
                      defaultValue: 'Search History',
                    })}
                  </Text>
                  <Space wrap>
                    <Select
                      size='small'
                      style={{ minWidth: 280 }}
                      value={null}
                      placeholder={t(
                        'sparkery.inspectionAdmin.placeholders.selectSearchHistory',
                        {
                          defaultValue: 'Select recent keyword',
                        }
                      )}
                      onChange={(value: string) => {
                        setSearchText(value);
                        setActiveArchiveViewId('');
                        archiveSearchInputRef.current?.focus();
                      }}
                      options={archiveSearchHistory.map(item => ({
                        value: item,
                        label: item,
                      }))}
                    />
                    <Button
                      size='small'
                      onClick={() => setArchiveSearchHistory([])}
                    >
                      {t(
                        'sparkery.inspectionAdmin.actions.clearSearchHistory',
                        {
                          defaultValue: 'Clear History',
                        }
                      )}
                    </Button>
                  </Space>
                </div>
              ) : null}

              <div className='sparkery-inspection-view-row'>
                <Select
                  value={activeArchiveViewId || undefined}
                  allowClear
                  className='sparkery-inspection-view-select'
                  placeholder={t(
                    'sparkery.inspectionAdmin.filters.savedViews',
                    {
                      defaultValue: 'Saved views',
                    }
                  )}
                  onChange={(value?: string) => {
                    if (!value) {
                      setActiveArchiveViewId('');
                      return;
                    }
                    handleApplyArchiveView(value);
                  }}
                  onClear={() => setActiveArchiveViewId('')}
                  options={sortedArchiveViews.map(view => ({
                    value: view.id,
                    label: `${pinnedArchiveViewIds.includes(view.id) ? '★ ' : ''}${view.name} · ${dayjs(view.updatedAt).format('MM-DD HH:mm')}`,
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
                <Button
                  disabled={!activeArchiveViewId}
                  onClick={() => toggleArchiveViewPinned(activeArchiveViewId)}
                  icon={
                    activeArchiveViewId &&
                    pinnedArchiveViewIds.includes(activeArchiveViewId) ? (
                      <StarFilled />
                    ) : (
                      <StarOutlined />
                    )
                  }
                >
                  {t('sparkery.inspectionAdmin.actions.pinView', {
                    defaultValue: 'Pin View',
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

              {!isArchiveFiltersCollapsed ? (
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
                          label: t(
                            'sparkery.inspectionAdmin.filters.statusAll',
                            {
                              defaultValue: 'All',
                            }
                          ),
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
                      {t('sparkery.inspectionAdmin.filters.resultsGrouping', {
                        defaultValue: 'Results Grouping',
                      })}
                    </Text>
                    <Segmented
                      value={archiveResultsGroupBy}
                      options={[
                        {
                          value: 'none',
                          label: t(
                            'sparkery.inspectionAdmin.filters.groupNone',
                            {
                              defaultValue: 'None',
                            }
                          ),
                        },
                        {
                          value: 'status',
                          label: t(
                            'sparkery.inspectionAdmin.filters.groupStatus',
                            {
                              defaultValue: 'Status',
                            }
                          ),
                        },
                        {
                          value: 'assignee',
                          label: t(
                            'sparkery.inspectionAdmin.filters.groupAssignee',
                            {
                              defaultValue: 'Assignee',
                            }
                          ),
                        },
                        {
                          value: 'date',
                          label: t(
                            'sparkery.inspectionAdmin.filters.groupDate',
                            {
                              defaultValue: 'Date',
                            }
                          ),
                        },
                      ]}
                      onChange={value =>
                        setArchiveResultsGroupBy(value as ArchiveResultsGroupBy)
                      }
                    />
                  </div>
                  <div className='sparkery-inspection-filter-item'>
                    <Text
                      type='secondary'
                      className='sparkery-inspection-filter-item-label'
                    >
                      {t('sparkery.inspectionAdmin.filters.searchMode', {
                        defaultValue: 'Search Mode',
                      })}
                    </Text>
                    <Segmented
                      value={archiveAdvancedFilters.searchMode}
                      options={[
                        {
                          value: 'smart',
                          label: t(
                            'sparkery.inspectionAdmin.filters.searchSmart',
                            {
                              defaultValue: 'Smart',
                            }
                          ),
                        },
                        {
                          value: 'and',
                          label: t(
                            'sparkery.inspectionAdmin.filters.searchAnd',
                            {
                              defaultValue: 'AND',
                            }
                          ),
                        },
                        {
                          value: 'or',
                          label: t(
                            'sparkery.inspectionAdmin.filters.searchOr',
                            {
                              defaultValue: 'OR',
                            }
                          ),
                        },
                      ]}
                      onChange={value =>
                        updateArchiveAdvancedFilter({
                          searchMode: value as ArchiveSearchMode,
                        })
                      }
                    />
                  </div>
                  <div className='sparkery-inspection-filter-item'>
                    <Text
                      type='secondary'
                      className='sparkery-inspection-filter-item-label'
                    >
                      {t('sparkery.inspectionAdmin.filters.advanced', {
                        defaultValue: 'Advanced',
                      })}
                    </Text>
                    <Space wrap>
                      <Checkbox
                        checked={archiveAdvancedFilters.myAssignmentsOnly}
                        onChange={event =>
                          updateArchiveAdvancedFilter({
                            myAssignmentsOnly: event.target.checked,
                          })
                        }
                      >
                        {t('sparkery.inspectionAdmin.filters.mineOnly', {
                          defaultValue: 'Mine only',
                        })}
                      </Checkbox>
                      <Checkbox
                        checked={archiveAdvancedFilters.missingAddressOnly}
                        onChange={event =>
                          updateArchiveAdvancedFilter({
                            missingAddressOnly: event.target.checked,
                          })
                        }
                      >
                        {t(
                          'sparkery.inspectionAdmin.filters.missingAddressOnly',
                          {
                            defaultValue: 'Missing address',
                          }
                        )}
                      </Checkbox>
                      <Checkbox
                        checked={archiveAdvancedFilters.missingDateOnly}
                        onChange={event =>
                          updateArchiveAdvancedFilter({
                            missingDateOnly: event.target.checked,
                          })
                        }
                      >
                        {t('sparkery.inspectionAdmin.filters.missingDateOnly', {
                          defaultValue: 'Missing date',
                        })}
                      </Checkbox>
                      <Checkbox
                        checked={archiveAdvancedFilters.missingAssigneeOnly}
                        onChange={event =>
                          updateArchiveAdvancedFilter({
                            missingAssigneeOnly: event.target.checked,
                          })
                        }
                      >
                        {t(
                          'sparkery.inspectionAdmin.filters.missingAssigneeOnly',
                          {
                            defaultValue: 'Missing assignee',
                          }
                        )}
                      </Checkbox>
                    </Space>
                    <Select
                      value={archiveAdvancedFilters.excludeStatus}
                      onChange={value =>
                        updateArchiveAdvancedFilter({
                          excludeStatus: value as ArchiveStatusFilter | 'none',
                        })
                      }
                      options={[
                        {
                          value: 'none',
                          label: t(
                            'sparkery.inspectionAdmin.filters.excludeNone',
                            {
                              defaultValue: 'Exclude: none',
                            }
                          ),
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
                    />
                    <Input
                      value={archiveAdvancedFilters.myAssignmentKeyword}
                      placeholder={t(
                        'sparkery.inspectionAdmin.placeholders.mineKeyword',
                        {
                          defaultValue: 'Mine keyword (name/id)',
                        }
                      )}
                      onChange={event =>
                        updateArchiveAdvancedFilter({
                          myAssignmentKeyword: event.target.value,
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
                          label: t(
                            'sparkery.inspectionAdmin.filters.sortLatest',
                            {
                              defaultValue: 'Latest activity first',
                            }
                          ),
                        },
                        {
                          value: 'oldest',
                          label: t(
                            'sparkery.inspectionAdmin.filters.sortOldest',
                            {
                              defaultValue: 'Oldest activity first',
                            }
                          ),
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
                      {t('sparkery.inspectionAdmin.filters.todayPriorityMode', {
                        defaultValue: 'Today Priority',
                      })}
                    </Text>
                    <Segmented
                      value={archivePriorityMode}
                      options={[
                        {
                          value: 'off',
                          label: t(
                            'sparkery.inspectionAdmin.filters.priorityOff',
                            {
                              defaultValue: 'Off',
                            }
                          ),
                        },
                        {
                          value: 'soft',
                          label: t(
                            'sparkery.inspectionAdmin.filters.prioritySoft',
                            {
                              defaultValue: 'Soft',
                            }
                          ),
                        },
                        {
                          value: 'hard',
                          label: t(
                            'sparkery.inspectionAdmin.filters.priorityHard',
                            {
                              defaultValue: 'Hard',
                            }
                          ),
                        },
                      ]}
                      onChange={value =>
                        setArchivePriorityMode(value as ArchivePriorityMode)
                      }
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
                      {t('sparkery.inspectionAdmin.filters.datePresets', {
                        defaultValue: 'Date Presets',
                      })}
                    </Text>
                    <Space size={6} wrap>
                      <Button
                        size='small'
                        type={
                          archiveDatePresetState.isClear ? 'primary' : 'default'
                        }
                        onClick={() => handleApplyArchiveDatePreset('clear')}
                      >
                        {t('sparkery.inspectionAdmin.actions.datePresetAll', {
                          defaultValue: 'All',
                        })}
                      </Button>
                      <Button
                        size='small'
                        type={
                          archiveDatePresetState.isToday ? 'primary' : 'default'
                        }
                        onClick={() => handleApplyArchiveDatePreset('today')}
                      >
                        {t('sparkery.inspectionAdmin.actions.datePresetToday', {
                          defaultValue: 'Today',
                        })}
                      </Button>
                      <Button
                        size='small'
                        type={
                          archiveDatePresetState.isLast7Days
                            ? 'primary'
                            : 'default'
                        }
                        onClick={() =>
                          handleApplyArchiveDatePreset('last_7_days')
                        }
                      >
                        {t('sparkery.inspectionAdmin.actions.datePresetLast7', {
                          defaultValue: 'Last 7d',
                        })}
                      </Button>
                      <Button
                        size='small'
                        type={
                          archiveDatePresetState.isLast30Days
                            ? 'primary'
                            : 'default'
                        }
                        onClick={() =>
                          handleApplyArchiveDatePreset('last_30_days')
                        }
                      >
                        {t(
                          'sparkery.inspectionAdmin.actions.datePresetLast30',
                          {
                            defaultValue: 'Last 30d',
                          }
                        )}
                      </Button>
                    </Space>
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
                          label: t(
                            'sparkery.inspectionAdmin.filters.layoutList',
                            {
                              defaultValue: 'List',
                            }
                          ),
                        },
                        {
                          value: 'board',
                          label: t(
                            'sparkery.inspectionAdmin.filters.layoutBoard',
                            {
                              defaultValue: 'Board',
                            }
                          ),
                        },
                      ]}
                      onChange={value =>
                        updateArchiveFilter({
                          layout: value as ArchiveLayoutMode,
                        })
                      }
                    />
                  </div>
                  <div className='sparkery-inspection-filter-item'>
                    <Text
                      type='secondary'
                      className='sparkery-inspection-filter-item-label'
                    >
                      {t('sparkery.inspectionAdmin.filters.visibleFields', {
                        defaultValue: 'Visible Fields',
                      })}
                    </Text>
                    <Checkbox.Group
                      value={[
                        archiveFieldVisibility.showDates ? 'dates' : null,
                        archiveFieldVisibility.showAddress ? 'address' : null,
                        archiveFieldVisibility.showAssignee ? 'assignee' : null,
                        archiveFieldVisibility.showId ? 'id' : null,
                      ].filter((value): value is string => Boolean(value))}
                      options={[
                        {
                          value: 'dates',
                          label: t(
                            'sparkery.inspectionAdmin.fields.checkOutDate',
                            {
                              defaultValue: 'Check-out Date',
                            }
                          ),
                        },
                        {
                          value: 'address',
                          label: t('sparkery.inspectionAdmin.fields.address', {
                            defaultValue: 'Address',
                          }),
                        },
                        {
                          value: 'assignee',
                          label: t(
                            'sparkery.inspectionAdmin.fields.assignedEmployees',
                            {
                              defaultValue: 'Assigned Employees',
                            }
                          ),
                        },
                        {
                          value: 'id',
                          label: t(
                            'sparkery.inspectionAdmin.labels.inspectionId',
                            {
                              defaultValue: 'Inspection ID',
                            }
                          ),
                        },
                      ]}
                      onChange={values =>
                        setArchiveFieldVisibility({
                          showDates: values.includes('dates'),
                          showAddress: values.includes('address'),
                          showAssignee: values.includes('assignee'),
                          showId: values.includes('id'),
                        })
                      }
                    />
                    <Space size={6} wrap>
                      <Button
                        size='small'
                        onClick={() =>
                          setArchiveFieldVisibility({
                            showDates: true,
                            showAddress: true,
                            showAssignee: true,
                            showId: true,
                          })
                        }
                      >
                        {t('sparkery.inspectionAdmin.actions.showAllFields', {
                          defaultValue: 'All Fields',
                        })}
                      </Button>
                      <Button
                        size='small'
                        onClick={() =>
                          setArchiveFieldVisibility({
                            showDates: true,
                            showAddress: false,
                            showAssignee: true,
                            showId: false,
                          })
                        }
                      >
                        {t('sparkery.inspectionAdmin.actions.showCoreFields', {
                          defaultValue: 'Core Fields',
                        })}
                      </Button>
                    </Space>
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
                          label: t(
                            'sparkery.inspectionAdmin.filters.quickAll',
                            {
                              defaultValue: 'All',
                            }
                          ),
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
                          label: t(
                            'sparkery.inspectionAdmin.filters.quickStale',
                            {
                              defaultValue: 'Stale 48h+',
                            }
                          ),
                        },
                        {
                          value: 'due_today',
                          label: t(
                            'sparkery.inspectionAdmin.filters.quickDueToday',
                            {
                              defaultValue: 'Due Today',
                            }
                          ),
                        },
                        {
                          value: 'overdue',
                          label: t(
                            'sparkery.inspectionAdmin.filters.quickOverdue',
                            {
                              defaultValue: 'Overdue',
                            }
                          ),
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
                        {
                          value: 'missing_required_photos',
                          label: t(
                            'sparkery.inspectionAdmin.filters.quickMissingPhotos',
                            {
                              defaultValue: 'Missing Required Photos',
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
                        {
                          value: 'dense',
                          label: t(
                            'sparkery.inspectionAdmin.filters.densityDense',
                            {
                              defaultValue: 'Dense',
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
                      onChange={event =>
                        toggleSelectAllVisible(event.target.checked)
                      }
                    >
                      {t('sparkery.inspectionAdmin.filters.selectVisible', {
                        defaultValue: 'Select visible',
                      })}
                    </Checkbox>
                  </div>
                </div>
              ) : null}
              {!isArchiveFiltersCollapsed ? (
                <div className='sparkery-inspection-risk-strip'>
                  <Text
                    type='secondary'
                    className='sparkery-inspection-filter-item-label'
                  >
                    {t('sparkery.inspectionAdmin.labels.operationalSignals', {
                      defaultValue: 'Operational Signals',
                    })}
                  </Text>
                  <Space wrap>
                    <Button
                      size='small'
                      type={
                        archiveFilters.quickChip === 'overdue'
                          ? 'primary'
                          : 'default'
                      }
                      onClick={() =>
                        updateArchiveFilter({ quickChip: 'overdue' })
                      }
                    >
                      {t('sparkery.inspectionAdmin.labels.overdue', {
                        defaultValue: 'Overdue',
                      })}
                      : {filteredArchiveRiskStats.overdue}
                    </Button>
                    <Button
                      size='small'
                      type={
                        archiveFilters.quickChip === 'due_today'
                          ? 'primary'
                          : 'default'
                      }
                      onClick={() =>
                        updateArchiveFilter({ quickChip: 'due_today' })
                      }
                    >
                      {t('sparkery.inspectionAdmin.labels.dueToday', {
                        defaultValue: 'Due Today',
                      })}
                      : {filteredArchiveRiskStats.dueToday}
                    </Button>
                    <Button
                      size='small'
                      type={
                        archiveFilters.quickChip === 'missing_required_photos'
                          ? 'primary'
                          : 'default'
                      }
                      onClick={() =>
                        updateArchiveFilter({
                          quickChip: 'missing_required_photos',
                        })
                      }
                    >
                      {t(
                        'sparkery.inspectionAdmin.labels.missingRequiredPhotos',
                        {
                          defaultValue: 'Missing Required Photos',
                        }
                      )}
                      : {filteredArchiveRiskStats.missingRequiredPhotos}
                    </Button>
                    <Button
                      size='small'
                      type={
                        archiveFilters.quickChip === 'no_assignee'
                          ? 'primary'
                          : 'default'
                      }
                      onClick={() =>
                        updateArchiveFilter({ quickChip: 'no_assignee' })
                      }
                    >
                      {t('sparkery.inspectionAdmin.labels.noAssigneeShort', {
                        defaultValue: 'No Assignee',
                      })}
                      : {filteredArchiveRiskStats.noAssignee}
                    </Button>
                    <Button
                      size='small'
                      type={
                        archiveFilters.quickChip === 'stale_48h'
                          ? 'primary'
                          : 'default'
                      }
                      onClick={() =>
                        updateArchiveFilter({ quickChip: 'stale_48h' })
                      }
                    >
                      {t('sparkery.inspectionAdmin.filters.quickStale', {
                        defaultValue: 'Stale 48h+',
                      })}
                      : {filteredArchiveRiskStats.stale48h}
                    </Button>
                    <Button
                      size='small'
                      onClick={() => updateArchiveFilter({ quickChip: 'all' })}
                    >
                      {t('sparkery.inspectionAdmin.actions.showAll', {
                        defaultValue: 'Show All',
                      })}
                    </Button>
                  </Space>
                </div>
              ) : null}
              {!isArchiveFiltersCollapsed ? (
                <div className='sparkery-inspection-risk-strip'>
                  <Text
                    type='secondary'
                    className='sparkery-inspection-filter-item-label'
                  >
                    {t('sparkery.inspectionAdmin.labels.quickSelection', {
                      defaultValue: 'Quick Selection',
                    })}
                  </Text>
                  <Space wrap>
                    <Button
                      size='small'
                      onClick={() => handleSelectVisibleByQuickChip('overdue')}
                    >
                      {t('sparkery.inspectionAdmin.actions.selectOverdue', {
                        defaultValue: 'Select Overdue',
                      })}
                    </Button>
                    <Button
                      size='small'
                      onClick={() =>
                        handleSelectVisibleByQuickChip('due_today')
                      }
                    >
                      {t('sparkery.inspectionAdmin.actions.selectDueToday', {
                        defaultValue: 'Select Due Today',
                      })}
                    </Button>
                    <Button
                      size='small'
                      onClick={() =>
                        handleSelectVisibleByQuickChip(
                          'missing_required_photos'
                        )
                      }
                    >
                      {t(
                        'sparkery.inspectionAdmin.actions.selectMissingPhotos',
                        {
                          defaultValue: 'Select Missing Photos',
                        }
                      )}
                    </Button>
                    <Button
                      size='small'
                      onClick={() =>
                        handleSelectVisibleByQuickChip('no_assignee')
                      }
                    >
                      {t('sparkery.inspectionAdmin.actions.selectNoAssignee', {
                        defaultValue: 'Select No Assignee',
                      })}
                    </Button>
                    <Button size='small' onClick={handleInvertVisibleSelection}>
                      {t(
                        'sparkery.inspectionAdmin.actions.invertVisibleSelection',
                        {
                          defaultValue: 'Invert Visible Selection',
                        }
                      )}
                    </Button>
                    <Button
                      size='small'
                      onClick={() => handleSetVisibleArchiveExpanded(true)}
                    >
                      {t(
                        'sparkery.inspectionAdmin.actions.expandVisibleDetails',
                        {
                          defaultValue: 'Expand Visible Details',
                        }
                      )}
                    </Button>
                    <Button
                      size='small'
                      onClick={() => handleSetVisibleArchiveExpanded(false)}
                    >
                      {t(
                        'sparkery.inspectionAdmin.actions.collapseVisibleDetails',
                        {
                          defaultValue: 'Collapse Visible Details',
                        }
                      )}
                    </Button>
                  </Space>
                </div>
              ) : null}
              {archiveFilterHints.length > 0 ? (
                <Space
                  direction='vertical'
                  className='sparkery-inspection-full-width'
                >
                  {archiveFilterHints.map((hint, index) => (
                    <Alert
                      key={`filter-hint-${index}`}
                      type='warning'
                      showIcon
                      message={hint}
                    />
                  ))}
                </Space>
              ) : null}
              <div className='sparkery-inspection-risk-strip'>
                <Text
                  type='secondary'
                  className='sparkery-inspection-filter-item-label'
                >
                  {t('sparkery.inspectionAdmin.labels.filterMemory', {
                    defaultValue: 'Filter Memory',
                  })}
                </Text>
                <Space wrap>
                  <Button
                    size='small'
                    icon={<HistoryOutlined />}
                    onClick={handleRememberCurrentFilterContext}
                  >
                    {t('sparkery.inspectionAdmin.actions.saveSnapshot', {
                      defaultValue: 'Save Snapshot',
                    })}
                  </Button>
                  <Button
                    size='small'
                    onClick={handleRestoreLastSessionFilters}
                  >
                    {t('sparkery.inspectionAdmin.actions.restoreSession', {
                      defaultValue: 'Restore Last Session',
                    })}
                  </Button>
                  <Select
                    size='small'
                    placeholder={t(
                      'sparkery.inspectionAdmin.placeholders.recentSnapshots',
                      {
                        defaultValue: 'Recent snapshots',
                      }
                    )}
                    style={{ minWidth: 220 }}
                    value={null}
                    onChange={(value: string) =>
                      handleApplyFilterHistoryEntry(value)
                    }
                    options={archiveFilterHistory.map(entry => ({
                      value: entry.id,
                      label: `${dayjs(entry.at).format('MM-DD HH:mm')} · ${
                        entry.searchText ||
                        t('sparkery.inspectionAdmin.labels.noSearch', {
                          defaultValue: 'No search',
                        })
                      }`,
                    }))}
                  />
                </Space>
              </div>
            </Space>
          </Card>
        ) : null}

        {isArchiveModuleVisible('batch') && selectedArchiveItems.length > 0 ? (
          <Card
            id='inspection-module-batch'
            size='small'
            className='sparkery-inspection-batch-card'
            style={getArchiveModuleOrderStyle('batch')}
          >
            <Space
              direction='vertical'
              size={10}
              className='sparkery-inspection-full-width'
            >
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
                    icon={<CopyOutlined />}
                    onClick={() => void handleCopySelectedIds()}
                  >
                    {t('sparkery.inspectionAdmin.actions.batchCopyIds', {
                      defaultValue: 'Copy IDs',
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
              <div className='sparkery-inspection-batch-row sparkery-inspection-batch-row-compact'>
                <Space wrap>
                  <Select
                    value={batchStatus || null}
                    placeholder={t(
                      'sparkery.inspectionAdmin.placeholders.batchStatus',
                      {
                        defaultValue: 'Batch status...',
                      }
                    )}
                    onChange={(value: InspectionArchive['status']) =>
                      setBatchStatus(value)
                    }
                    style={{ minWidth: 170 }}
                    options={[
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
                  />
                  <Button onClick={() => openBatchPreview('status')}>
                    {t('sparkery.inspectionAdmin.actions.applyBatchStatus', {
                      defaultValue: 'Apply Status',
                    })}
                  </Button>
                </Space>
                <Space wrap>
                  <Select
                    mode='multiple'
                    value={batchAssignEmployeeIds}
                    placeholder={t(
                      'sparkery.inspectionAdmin.placeholders.batchAssignEmployees',
                      {
                        defaultValue: 'Assign employees...',
                      }
                    )}
                    onChange={(values: string[]) =>
                      setBatchAssignEmployeeIds(values)
                    }
                    style={{ minWidth: 240 }}
                    options={employees.map(emp => ({
                      value: emp.id,
                      label: [emp.name, emp.nameEn].filter(Boolean).join(' '),
                    }))}
                  />
                  <Button onClick={() => openBatchPreview('assignees')}>
                    {t('sparkery.inspectionAdmin.actions.applyBatchAssignees', {
                      defaultValue: 'Apply Assignees',
                    })}
                  </Button>
                </Space>
                <Space wrap>
                  <Input
                    type='date'
                    value={batchCheckOutDate}
                    onChange={event => setBatchCheckOutDate(event.target.value)}
                    style={{ width: 160 }}
                  />
                  <Button onClick={() => openBatchPreview('date')}>
                    {t('sparkery.inspectionAdmin.actions.applyBatchDate', {
                      defaultValue: 'Apply Date',
                    })}
                  </Button>
                </Space>
                <Space wrap>
                  <Input
                    type='datetime-local'
                    value={batchScheduledAt}
                    onChange={event => setBatchScheduledAt(event.target.value)}
                    style={{ width: 220 }}
                  />
                  <Text type='secondary'>
                    {t('sparkery.inspectionAdmin.labels.scheduleBatchRun', {
                      defaultValue: 'Schedule run (optional)',
                    })}
                  </Text>
                </Space>
              </div>
              {batchProgress.total > 0 ? (
                <Space
                  direction='vertical'
                  className='sparkery-inspection-full-width'
                >
                  <Progress
                    percent={Number(
                      (
                        (batchProgress.completed /
                          Math.max(1, batchProgress.total)) *
                        100
                      ).toFixed(1)
                    )}
                    status={batchProgress.running ? 'active' : 'normal'}
                  />
                  <Space wrap>
                    <Text type='secondary'>
                      {t('sparkery.inspectionAdmin.labels.batchProgress', {
                        defaultValue: '{{done}} / {{total}}',
                        done: batchProgress.completed,
                        total: batchProgress.total,
                      })}
                    </Text>
                    {batchProgress.failedIds.length > 0 ? (
                      <Button
                        size='small'
                        onClick={() => void handleRetryFailedBatchItems()}
                      >
                        {t(
                          'sparkery.inspectionAdmin.actions.retryFailedSubset',
                          {
                            defaultValue: 'Retry Failed Subset',
                          }
                        )}
                      </Button>
                    ) : null}
                  </Space>
                </Space>
              ) : null}
            </Space>
          </Card>
        ) : null}

        {isArchiveModuleVisible('results') ? (
          <div
            id='inspection-module-results'
            style={getArchiveModuleOrderStyle('results')}
          >
            <div className='sparkery-inspection-results-toolbar'>
              <Space wrap>
                <Tag color='blue'>
                  {t('sparkery.inspectionAdmin.labels.visibleCount', {
                    defaultValue: 'Visible {{count}}',
                    count: filteredArchives.length,
                  })}
                </Tag>
                <Tag>
                  {t('sparkery.inspectionAdmin.labels.totalCount', {
                    defaultValue: 'Total {{count}}',
                    count: archives.length,
                  })}
                </Tag>
                {archiveResultsGroupBy !== 'none' ? (
                  <Tag color='purple'>
                    {t('sparkery.inspectionAdmin.labels.groupCount', {
                      defaultValue: 'Groups {{count}}',
                      count: groupedRenderedListArchives.length,
                    })}
                  </Tag>
                ) : null}
                {collapsedArchiveGroupKeys.length > 0 ? (
                  <Tag color='gold'>
                    {t('sparkery.inspectionAdmin.labels.collapsedGroups', {
                      defaultValue: 'Collapsed {{count}}',
                      count: collapsedArchiveGroupKeys.length,
                    })}
                  </Tag>
                ) : null}
                {archivePriorityMode !== 'off' ? (
                  <Tag color='volcano'>
                    {t('sparkery.inspectionAdmin.labels.todayPriorityModeTag', {
                      defaultValue: 'Today Priority: {{mode}}',
                      mode:
                        archivePriorityMode === 'hard'
                          ? t('sparkery.inspectionAdmin.filters.priorityHard', {
                              defaultValue: 'Hard',
                            })
                          : t('sparkery.inspectionAdmin.filters.prioritySoft', {
                              defaultValue: 'Soft',
                            }),
                    })}
                  </Tag>
                ) : null}
              </Space>
              <Space wrap>
                {archiveResultsGroupBy !== 'none' ? (
                  <>
                    <Button
                      size='small'
                      onClick={collapseAllArchiveGroups}
                      disabled={groupedRenderedListArchives.length === 0}
                    >
                      {t('sparkery.inspectionAdmin.actions.collapseGroups', {
                        defaultValue: 'Collapse Groups',
                      })}
                    </Button>
                    <Button
                      size='small'
                      onClick={expandAllArchiveGroups}
                      disabled={collapsedArchiveGroupKeys.length === 0}
                    >
                      {t('sparkery.inspectionAdmin.actions.expandGroups', {
                        defaultValue: 'Expand Groups',
                      })}
                    </Button>
                  </>
                ) : null}
                <Button
                  size='small'
                  onClick={() => jumpToArchiveModule('search')}
                >
                  {t('sparkery.inspectionAdmin.actions.goToFilters', {
                    defaultValue: 'Go to Filters',
                  })}
                </Button>
                <Button
                  size='small'
                  loading={isArchiveRefreshing}
                  onClick={() => void handleManualRefreshArchives()}
                >
                  {t('sparkery.inspectionAdmin.actions.refresh', {
                    defaultValue: 'Refresh',
                  })}
                </Button>
                <Button
                  size='small'
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                >
                  {t('sparkery.inspectionAdmin.actions.backToTop', {
                    defaultValue: 'Back to Top',
                  })}
                </Button>
              </Space>
            </div>
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
                        rows:
                          archiveFilters.density === 'comfortable'
                            ? 2
                            : archiveFilters.density === 'compact'
                              ? 1
                              : 1,
                      }}
                    />
                  </Card>
                ))}
              </div>
            ) : filteredArchives.length > 0 ? (
              archiveFilters.layout === 'board' ? (
                <>
                  {archiveBoardHiddenStatuses.length > 0 ? (
                    <Space wrap className='sparkery-inspection-risk-strip'>
                      <Text type='secondary'>
                        {t('sparkery.inspectionAdmin.labels.hiddenColumns', {
                          defaultValue: 'Hidden columns',
                        })}
                        :
                      </Text>
                      {archiveBoardHiddenStatuses.map(status => (
                        <Button
                          key={`hidden-col-${status}`}
                          size='small'
                          onClick={() =>
                            toggleArchiveBoardStatusVisibility(status)
                          }
                        >
                          {getArchiveStatusMeta(status).label}
                        </Button>
                      ))}
                    </Space>
                  ) : null}
                  <div className='sparkery-inspection-board'>
                    {archiveBoardColumns.map(column => {
                      const isCollapsed = archiveBoardCollapse[column.status];
                      return (
                        <Card
                          key={column.status}
                          size='small'
                          className={`sparkery-inspection-board-column ${
                            column.items.length > column.wipLimit
                              ? 'sparkery-inspection-board-column-overlimit'
                              : ''
                          }`}
                          onDragOver={event => event.preventDefault()}
                          onDrop={event => {
                            event.preventDefault();
                            void handleBoardDropStatus(column.status);
                          }}
                        >
                          <div className='sparkery-inspection-board-column-head'>
                            <Tag
                              color={column.meta.color}
                              icon={column.meta.icon}
                            >
                              {column.meta.label}
                            </Tag>
                            <Space size={8} wrap>
                              <Text type='secondary'>
                                {t('sparkery.inspectionAdmin.labels.count', {
                                  defaultValue: '{{count}} items',
                                  count: column.items.length,
                                })}
                              </Text>
                              <Tag
                                color={
                                  column.items.length > column.wipLimit
                                    ? 'red'
                                    : 'default'
                                }
                              >
                                {t('sparkery.inspectionAdmin.labels.wip', {
                                  defaultValue: 'WIP {{count}}',
                                  count: column.wipLimit,
                                })}
                              </Tag>
                              <Tag>
                                {t('sparkery.inspectionAdmin.labels.avgDwell', {
                                  defaultValue: 'Avg {{count}}h',
                                  count: column.avgDwellHours,
                                })}
                              </Tag>
                              <Tag>
                                {t(
                                  'sparkery.inspectionAdmin.labels.todayAdded',
                                  {
                                    defaultValue: '+{{count}} today',
                                    count: column.todayAddedCount,
                                  }
                                )}
                              </Tag>
                              {column.todayCompletedCount > 0 ? (
                                <Tag color='green'>
                                  {t(
                                    'sparkery.inspectionAdmin.labels.todayCompleted',
                                    {
                                      defaultValue: 'Done {{count}}',
                                      count: column.todayCompletedCount,
                                    }
                                  )}
                                </Tag>
                              ) : null}
                              <Button
                                size='small'
                                type='text'
                                onClick={() =>
                                  moveArchiveBoardStatusColumn(
                                    column.status,
                                    'left'
                                  )
                                }
                              >
                                {t(
                                  'sparkery.inspectionAdmin.actions.moveLeft',
                                  {
                                    defaultValue: 'Left',
                                  }
                                )}
                              </Button>
                              <Button
                                size='small'
                                type='text'
                                onClick={() =>
                                  moveArchiveBoardStatusColumn(
                                    column.status,
                                    'right'
                                  )
                                }
                              >
                                {t(
                                  'sparkery.inspectionAdmin.actions.moveRight',
                                  {
                                    defaultValue: 'Right',
                                  }
                                )}
                              </Button>
                              <Button
                                size='small'
                                type='text'
                                onClick={() =>
                                  toggleArchiveBoardStatusVisibility(
                                    column.status
                                  )
                                }
                              >
                                {t(
                                  'sparkery.inspectionAdmin.actions.hideColumn',
                                  {
                                    defaultValue: 'Hide',
                                  }
                                )}
                              </Button>
                              <Button
                                size='small'
                                type='text'
                                onClick={() =>
                                  toggleArchiveBoardColumnCollapse(
                                    column.status
                                  )
                                }
                              >
                                {isCollapsed
                                  ? t(
                                      'sparkery.inspectionAdmin.actions.expandColumn',
                                      {
                                        defaultValue: 'Expand',
                                      }
                                    )
                                  : t(
                                      'sparkery.inspectionAdmin.actions.collapseColumn',
                                      {
                                        defaultValue: 'Collapse',
                                      }
                                    )}
                              </Button>
                            </Space>
                          </div>
                          {isCollapsed ? (
                            <Text
                              type='secondary'
                              className='sparkery-inspection-board-empty'
                            >
                              {t(
                                'sparkery.inspectionAdmin.labels.columnCollapsed',
                                {
                                  defaultValue: 'Column collapsed.',
                                }
                              )}
                            </Text>
                          ) : column.items.length === 0 ? (
                            <Empty
                              image={Empty.PRESENTED_IMAGE_SIMPLE}
                              description={t(
                                'sparkery.inspectionAdmin.empty.noItemsInColumn',
                                {
                                  defaultValue:
                                    'No inspections in this status.',
                                }
                              )}
                              className='sparkery-inspection-board-empty'
                            />
                          ) : (
                            <div className='sparkery-inspection-board-list'>
                              {column.items.map(item =>
                                renderArchiveCard(item, true)
                              )}
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  {archiveResultsGroupBy === 'none' ? (
                    <div className='sparkery-inspection-archive-list'>
                      {renderedListArchives.map(item =>
                        renderArchiveCard(item)
                      )}
                    </div>
                  ) : (
                    <div className='sparkery-inspection-archive-grouped-list'>
                      {groupedRenderedListArchives.map(group => {
                        const isCollapsed = collapsedArchiveGroupKeys.includes(
                          group.key
                        );
                        return (
                          <div
                            key={`archive-group-${group.key}`}
                            className='sparkery-inspection-archive-group'
                          >
                            <div className='sparkery-inspection-archive-group-head'>
                              <Space wrap size={[8, 6]}>
                                <Text strong>{group.label}</Text>
                                <Tag>
                                  {t('sparkery.inspectionAdmin.labels.count', {
                                    defaultValue: '{{count}} items',
                                    count: group.items.length,
                                  })}
                                </Tag>
                              </Space>
                              <Button
                                size='small'
                                type='text'
                                onClick={() =>
                                  toggleArchiveGroupCollapse(group.key)
                                }
                              >
                                {isCollapsed
                                  ? t(
                                      'sparkery.inspectionAdmin.actions.expand',
                                      {
                                        defaultValue: 'Expand',
                                      }
                                    )
                                  : t(
                                      'sparkery.inspectionAdmin.actions.collapse',
                                      {
                                        defaultValue: 'Collapse',
                                      }
                                    )}
                              </Button>
                            </div>
                            {isCollapsed ? (
                              <Text
                                type='secondary'
                                className='sparkery-inspection-archive-group-collapsed-note'
                              >
                                {t(
                                  'sparkery.inspectionAdmin.labels.groupCollapsedHint',
                                  {
                                    defaultValue:
                                      'Group collapsed. Click expand to view items.',
                                  }
                                )}
                              </Text>
                            ) : (
                              <div className='sparkery-inspection-archive-list'>
                                {group.items.map(item =>
                                  renderArchiveCard(item)
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {renderedListArchives.length < filteredArchives.length ? (
                    <div className='sparkery-inspection-risk-strip'>
                      <Button
                        onClick={() =>
                          setArchiveListRenderCount(prev => prev + 60)
                        }
                      >
                        {t('sparkery.inspectionAdmin.actions.loadMore', {
                          defaultValue: 'Load More ({{count}} remaining)',
                          count:
                            filteredArchives.length -
                            renderedListArchives.length,
                        })}
                      </Button>
                    </div>
                  ) : null}
                </>
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
                    : t(
                        'sparkery.inspectionAdmin.empty.createFirstInspection',
                        {
                          defaultValue:
                            'Create one via Quick Inspection Link or One-off Template Generator.',
                        }
                      )}
                </Text>
                {archives.length > 0 && archiveEmptyStateSignals.length > 0 ? (
                  <Space
                    wrap
                    className='sparkery-inspection-empty-signal-list'
                    size={[6, 6]}
                  >
                    {archiveEmptyStateSignals.map((signal, index) => (
                      <Tag key={`empty-signal-${index}`} color='orange'>
                        {signal}
                      </Tag>
                    ))}
                  </Space>
                ) : null}
                <Space wrap className='sparkery-inspection-empty-actions'>
                  <Button onClick={resetArchiveFilters}>
                    {t(
                      'sparkery.inspectionAdmin.actions.clearSearchAndFilters',
                      {
                        defaultValue: 'Clear Search & Filters',
                      }
                    )}
                  </Button>
                  {searchText.trim() ? (
                    <Button
                      onClick={() => {
                        setSearchText('');
                        setActiveArchiveViewId('');
                      }}
                    >
                      {t('sparkery.inspectionAdmin.actions.clearSearchOnly', {
                        defaultValue: 'Clear Search',
                      })}
                    </Button>
                  ) : null}
                  {archiveFilters.quickChip !== 'all' ? (
                    <Button
                      onClick={() => updateArchiveFilter({ quickChip: 'all' })}
                    >
                      {t('sparkery.inspectionAdmin.actions.clearQuickFilter', {
                        defaultValue: 'Clear Quick Filter',
                      })}
                    </Button>
                  ) : null}
                  {archiveAdvancedFilters.excludeStatus !== 'none' ? (
                    <Button
                      onClick={() =>
                        setArchiveAdvancedFilters(prev => ({
                          ...prev,
                          excludeStatus: 'none',
                        }))
                      }
                    >
                      {t(
                        'sparkery.inspectionAdmin.actions.clearExcludeStatus',
                        {
                          defaultValue: 'Clear Exclude Status',
                        }
                      )}
                    </Button>
                  ) : null}
                  {archivePriorityMode !== 'off' ? (
                    <Button onClick={() => setArchivePriorityMode('off')}>
                      {t(
                        'sparkery.inspectionAdmin.actions.disableTodayPriority',
                        {
                          defaultValue: 'Disable Today Priority',
                        }
                      )}
                    </Button>
                  ) : null}
                  <Button
                    icon={<PlusCircleOutlined />}
                    onClick={handleOpenOneOffGenerator}
                  >
                    {t(
                      'sparkery.inspectionAdmin.actions.oneOffTemplateGenerator',
                      {
                        defaultValue: 'One-off Template Generator',
                      }
                    )}
                  </Button>
                </Space>
              </Card>
            )}
          </div>
        ) : null}
      </div>
      <div className='sparkery-inspection-mobile-action-bar'>
        <Button
          size='small'
          onClick={() => setIsArchiveFiltersDrawerOpen(true)}
        >
          {t('sparkery.inspectionAdmin.actions.filters', {
            defaultValue: 'Filters',
          })}
        </Button>
        <Button size='small' onClick={() => void handleManualRefreshArchives()}>
          {t('sparkery.inspectionAdmin.actions.refreshArchives', {
            defaultValue: 'Refresh',
          })}
        </Button>
        <Button size='small' onClick={handleOpenOneOffGenerator}>
          {t('sparkery.inspectionAdmin.actions.oneOff', {
            defaultValue: 'One-off',
          })}
        </Button>
        <Button
          size='small'
          onClick={() => toggleSelectAllVisible(!allVisibleSelected)}
        >
          {t('sparkery.inspectionAdmin.actions.selectVisible', {
            defaultValue: 'Select Visible',
          })}
        </Button>
      </div>
      <Drawer
        title={t('sparkery.inspectionAdmin.filters.mobileTitle', {
          defaultValue: 'Archive Filters',
        })}
        placement='bottom'
        height='80vh'
        open={isArchiveFiltersDrawerOpen}
        onClose={() => setIsArchiveFiltersDrawerOpen(false)}
      >
        <Space direction='vertical' className='sparkery-inspection-full-width'>
          <Input
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={event => setSearchText(event.target.value)}
            placeholder={t(
              'sparkery.inspectionAdmin.placeholders.searchInspection',
              {
                defaultValue: 'Search by property name or inspection ID',
              }
            )}
          />
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
              updateArchiveFilter({ status: value as ArchiveStatusFilter })
            }
          />
          <Segmented
            block
            value={archiveFilters.quickChip}
            options={[
              {
                value: 'all',
                label: t('sparkery.inspectionAdmin.filters.quickAll', {
                  defaultValue: 'All',
                }),
              },
              {
                value: 'overdue',
                label: t('sparkery.inspectionAdmin.filters.quickOverdue', {
                  defaultValue: 'Overdue',
                }),
              },
              {
                value: 'due_today',
                label: t('sparkery.inspectionAdmin.filters.quickDueToday', {
                  defaultValue: 'Due Today',
                }),
              },
              {
                value: 'missing_required_photos',
                label: t(
                  'sparkery.inspectionAdmin.filters.quickMissingPhotos',
                  {
                    defaultValue: 'Missing Photos',
                  }
                ),
              },
            ]}
            onChange={value =>
              updateArchiveFilter({ quickChip: value as ArchiveQuickChip })
            }
          />
          <Segmented
            block
            value={archivePriorityMode}
            options={[
              {
                value: 'off',
                label: t('sparkery.inspectionAdmin.filters.priorityOff', {
                  defaultValue: 'Priority Off',
                }),
              },
              {
                value: 'soft',
                label: t('sparkery.inspectionAdmin.filters.prioritySoft', {
                  defaultValue: 'Priority Soft',
                }),
              },
              {
                value: 'hard',
                label: t('sparkery.inspectionAdmin.filters.priorityHard', {
                  defaultValue: 'Priority Hard',
                }),
              },
            ]}
            onChange={value =>
              setArchivePriorityMode(value as ArchivePriorityMode)
            }
          />
          <Space wrap>
            <Button onClick={resetArchiveFilters}>
              {t('sparkery.inspectionAdmin.actions.resetFilters', {
                defaultValue: 'Reset Filters',
              })}
            </Button>
            <Button
              type='primary'
              onClick={() => setIsArchiveFiltersDrawerOpen(false)}
            >
              {t('sparkery.inspectionAdmin.actions.apply', {
                defaultValue: 'Apply',
              })}
            </Button>
          </Space>
        </Space>
      </Drawer>
      <Drawer
        title={t('sparkery.inspectionAdmin.drawer.title', {
          defaultValue: 'Inspection Detail',
        })}
        width={archiveDrawerWidth}
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
              <Tag>
                {t('sparkery.inspectionAdmin.labels.drawerIndex', {
                  defaultValue: '{{index}} / {{total}}',
                  index: detailArchiveIndex + 1,
                  total: filteredArchives.length,
                })}
              </Tag>
              <Button
                size='small'
                icon={<LeftOutlined />}
                disabled={detailArchiveIndex <= 0}
                onClick={focusPrevArchiveInDrawer}
              >
                {t('sparkery.inspectionAdmin.actions.previous', {
                  defaultValue: 'Previous',
                })}
              </Button>
              <Button
                size='small'
                icon={<RightOutlined />}
                disabled={
                  detailArchiveIndex < 0 ||
                  detailArchiveIndex >= filteredArchives.length - 1
                }
                onClick={focusNextArchiveInDrawer}
              >
                {t('sparkery.inspectionAdmin.actions.next', {
                  defaultValue: 'Next',
                })}
              </Button>
              <Button
                size='small'
                disabled={!hasNextUnsubmittedArchive}
                onClick={focusNextUnsubmittedArchiveInDrawer}
              >
                {t('sparkery.inspectionAdmin.actions.nextUnsubmitted', {
                  defaultValue: 'Next Unsubmitted',
                })}
              </Button>
              <Button
                size='small'
                disabled={!hasNextUncheckedArchive}
                onClick={focusNextUncheckedArchiveInDrawer}
              >
                {t('sparkery.inspectionAdmin.actions.nextUnchecked', {
                  defaultValue: 'Next Unchecked',
                })}
              </Button>
              <Button
                size='small'
                disabled={!hasNextMissingPhotoArchive}
                onClick={focusNextMissingPhotoArchiveInDrawer}
              >
                {t('sparkery.inspectionAdmin.actions.nextMissingPhoto', {
                  defaultValue: 'Next Missing Photo',
                })}
              </Button>
            </Space>

            <Card size='small' className='sparkery-inspection-drawer-card'>
              <Space
                className='sparkery-inspection-full-width'
                direction='vertical'
              >
                <Text type='secondary'>
                  {t('sparkery.inspectionAdmin.labels.drawerWidth', {
                    defaultValue: 'Drawer Width',
                  })}
                  : {archiveDrawerWidth}px
                </Text>
                <Input
                  type='range'
                  min={420}
                  max={860}
                  step={10}
                  value={archiveDrawerWidth}
                  onChange={event =>
                    setArchiveDrawerWidth(Number(event.target.value))
                  }
                />
              </Space>
            </Card>

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
            {detailArchiveDiffSummary ? (
              <Card size='small' className='sparkery-inspection-drawer-card'>
                <Text type='secondary'>
                  {t('sparkery.inspectionAdmin.labels.diffFromPrevious', {
                    defaultValue: 'Diff from previous ({{id}})',
                    id: detailArchiveDiffSummary.previousId,
                  })}
                </Text>
                <Space wrap className='sparkery-inspection-drawer-section-list'>
                  {detailArchiveDiffSummary.changedKeys.length > 0 ? (
                    detailArchiveDiffSummary.changedKeys.map(key => (
                      <Tag key={`diff-${String(key)}`}>{String(key)}</Tag>
                    ))
                  ) : (
                    <Text type='secondary'>
                      {t('sparkery.inspectionAdmin.labels.noDiff', {
                        defaultValue: 'No key field differences.',
                      })}
                    </Text>
                  )}
                </Space>
              </Card>
            ) : null}

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

            <Card size='small' className='sparkery-inspection-drawer-card'>
              <Space wrap>
                <Select
                  value={detailArchive.status}
                  style={{ minWidth: 170 }}
                  options={[
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
                  onChange={(value: InspectionArchive['status']) =>
                    void handleUpdateSingleArchive(detailArchive.id, {
                      status: value,
                      submittedAt:
                        value === 'submitted'
                          ? ((detailArchive as any).submittedAt as string) ||
                            new Date().toISOString()
                          : (detailArchive as any).submittedAt || '',
                    })
                  }
                />
                <Input
                  type='date'
                  value={(detailArchive as any).checkOutDate || ''}
                  onChange={event =>
                    void handleUpdateSingleArchive(detailArchive.id, {
                      checkOutDate: event.target.value,
                    })
                  }
                  style={{ width: 160 }}
                />
                <Select
                  mode='multiple'
                  value={(() => {
                    const assignedEmployees = (detailArchive as any)
                      .assignedEmployees as Employee[] | undefined;
                    if (assignedEmployees && assignedEmployees.length > 0) {
                      return assignedEmployees
                        .map(emp => emp?.id)
                        .filter((id): id is string => Boolean(id));
                    }
                    const assignedEmployee = (detailArchive as any)
                      .assignedEmployee as Employee | undefined;
                    return assignedEmployee?.id ? [assignedEmployee.id] : [];
                  })()}
                  style={{ minWidth: 240 }}
                  placeholder={t(
                    'sparkery.inspectionAdmin.placeholders.batchAssignEmployees',
                    {
                      defaultValue: 'Assign employees...',
                    }
                  )}
                  options={employees.map(emp => ({
                    value: emp.id,
                    label: [emp.name, emp.nameEn].filter(Boolean).join(' '),
                  }))}
                  onChange={(values: string[]) => {
                    const assignedEmployees = employees.filter(emp =>
                      values.includes(emp.id)
                    );
                    void handleUpdateSingleArchive(detailArchive.id, {
                      assignedEmployees,
                      assignedEmployee: assignedEmployees[0],
                    });
                  }}
                />
              </Space>
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
              <Button
                icon={<CopyOutlined />}
                onClick={() => void handleCopyArchiveJson(detailArchive)}
              >
                {t('sparkery.inspectionAdmin.actions.copyJson', {
                  defaultValue: 'Copy JSON',
                })}
              </Button>
            </Space>
          </Space>
        ) : null}
      </Drawer>
      <Modal
        title={t('sparkery.inspectionAdmin.batch.previewTitle', {
          defaultValue: 'Confirm Batch Update',
        })}
        open={isBatchPreviewOpen}
        onCancel={() => setIsBatchPreviewOpen(false)}
        onOk={handleConfirmBatchPreview}
      >
        <Space direction='vertical' className='sparkery-inspection-full-width'>
          <Text>
            {t('sparkery.inspectionAdmin.batch.previewSummary', {
              defaultValue:
                'You are about to apply "{{action}}" to {{count}} selected inspections.',
              action: batchPreviewAction || 'update',
              count: selectedArchiveItems.length,
            })}
          </Text>
          {batchScheduledAt ? (
            <Text type='secondary'>
              {t('sparkery.inspectionAdmin.batch.previewSchedule', {
                defaultValue: 'Scheduled at: {{time}}',
                time: dayjs(batchScheduledAt).format('YYYY-MM-DD HH:mm'),
              })}
            </Text>
          ) : null}
        </Space>
      </Modal>
      <Modal
        title={t('sparkery.inspectionAdmin.shortcuts.title', {
          defaultValue: 'Keyboard Shortcuts',
        })}
        open={isShortcutHelpOpen}
        onCancel={() => setIsShortcutHelpOpen(false)}
        footer={null}
      >
        <Space direction='vertical' className='sparkery-inspection-full-width'>
          <Text>
            <Text code>Ctrl/Cmd + K</Text> -{' '}
            {t('sparkery.inspectionAdmin.shortcuts.commandPalette', {
              defaultValue: 'Open command palette',
            })}
          </Text>
          <Text>
            <Text code>Ctrl/Cmd + Shift + N</Text> -{' '}
            {t('sparkery.inspectionAdmin.shortcuts.newOneOff', {
              defaultValue: 'Open one-off generator',
            })}
          </Text>
          <Text>
            <Text code>Ctrl/Cmd + Shift + R</Text> -{' '}
            {t('sparkery.inspectionAdmin.shortcuts.refresh', {
              defaultValue: 'Refresh archive',
            })}
          </Text>
          <Text>
            <Text code>Ctrl/Cmd + Shift + F</Text> -{' '}
            {t('sparkery.inspectionAdmin.shortcuts.focusSearch', {
              defaultValue: 'Focus search',
            })}
          </Text>
          <Text>
            <Text code>Ctrl/Cmd + Shift + G</Text> -{' '}
            {t('sparkery.inspectionAdmin.shortcuts.nextMatch', {
              defaultValue: 'Next search match',
            })}
          </Text>
          <Text>
            <Text code>Ctrl/Cmd + Shift + H</Text> -{' '}
            {t('sparkery.inspectionAdmin.shortcuts.prevMatch', {
              defaultValue: 'Previous search match',
            })}
          </Text>
          <Text>
            <Text code>Ctrl/Cmd + Shift + M</Text> -{' '}
            {t('sparkery.inspectionAdmin.shortcuts.mobileFilters', {
              defaultValue: 'Open filters drawer',
            })}
          </Text>
          <Text>
            <Text code>Ctrl/Cmd + Shift + A</Text> -{' '}
            {t('sparkery.inspectionAdmin.shortcuts.selectVisible', {
              defaultValue: 'Select all visible records',
            })}
          </Text>
          <Text>
            <Text code>Ctrl/Cmd + Shift + I</Text> -{' '}
            {t('sparkery.inspectionAdmin.shortcuts.invertSelection', {
              defaultValue: 'Invert visible selection',
            })}
          </Text>
          <Text>
            <Text code>Ctrl/Cmd + Shift + L</Text> -{' '}
            {t('sparkery.inspectionAdmin.shortcuts.copyLinks', {
              defaultValue: 'Copy selected links',
            })}
          </Text>
          <Text>
            <Text code>Ctrl/Cmd + Shift + D</Text> -{' '}
            {t('sparkery.inspectionAdmin.shortcuts.copyIds', {
              defaultValue: 'Copy selected IDs',
            })}
          </Text>
          <Text>
            <Text code>Ctrl/Cmd + Shift + E</Text> -{' '}
            {t('sparkery.inspectionAdmin.shortcuts.expandVisibleDetails', {
              defaultValue: 'Expand visible detail cards',
            })}
          </Text>
          <Text>
            <Text code>Ctrl/Cmd + Shift + W</Text> -{' '}
            {t('sparkery.inspectionAdmin.shortcuts.collapseVisibleDetails', {
              defaultValue: 'Collapse visible detail cards',
            })}
          </Text>
          <Text>
            <Text code>J / K</Text> -{' '}
            {t('sparkery.inspectionAdmin.shortcuts.navigateDrawer', {
              defaultValue: 'Next/previous record in detail drawer',
            })}
          </Text>
          <Text>
            <Text code>?</Text> -{' '}
            {t('sparkery.inspectionAdmin.shortcuts.help', {
              defaultValue: 'Open this shortcuts panel',
            })}
          </Text>
        </Space>
      </Modal>
      <Modal
        title={t('sparkery.inspectionAdmin.actions.commandPalette', {
          defaultValue: 'Command Palette',
        })}
        open={isCommandPaletteOpen}
        onCancel={() => setIsCommandPaletteOpen(false)}
        footer={null}
      >
        <Space direction='vertical' className='sparkery-inspection-full-width'>
          <Input
            autoFocus
            value={commandPaletteQuery}
            onChange={event => setCommandPaletteQuery(event.target.value)}
            prefix={<SearchOutlined />}
            placeholder={t(
              'sparkery.inspectionAdmin.placeholders.searchCommands',
              {
                defaultValue: 'Search actions or keywords',
              }
            )}
          />
          <div className='sparkery-inspection-command-list'>
            {filteredCommandActions.length > 0 ? (
              filteredCommandActions.map(action => (
                <div
                  key={`command-action-${action.id}`}
                  className='sparkery-inspection-command-item'
                >
                  <Space>
                    <Button
                      type='primary'
                      size='small'
                      icon={<PlayCircleOutlined />}
                      onClick={() => {
                        void executeUiQuickAction(action.id, 'command');
                        setIsCommandPaletteOpen(false);
                      }}
                    >
                      {action.label}
                    </Button>
                    {action.hint ? (
                      <Tag>{action.hint}</Tag>
                    ) : (
                      <Tag color='default'>
                        {t('sparkery.inspectionAdmin.labels.noShortcut', {
                          defaultValue: 'No shortcut',
                        })}
                      </Tag>
                    )}
                  </Space>
                  <Button
                    size='small'
                    type='text'
                    icon={
                      favoriteQuickActionIds.includes(action.id) ? (
                        <StarFilled />
                      ) : (
                        <StarOutlined />
                      )
                    }
                    onClick={() => toggleFavoriteQuickAction(action.id)}
                  />
                </div>
              ))
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={t(
                  'sparkery.inspectionAdmin.messages.noCommandMatches',
                  {
                    defaultValue: 'No command matches. Try broader keywords.',
                  }
                )}
              />
            )}
          </div>
        </Space>
      </Modal>
      <Modal
        title={t('sparkery.inspectionAdmin.actions.recentOpened', {
          defaultValue: 'Recent Opened',
        })}
        open={isRecentOpenedOpen}
        onCancel={() => setIsRecentOpenedOpen(false)}
        footer={
          <Space>
            <Button
              onClick={() => setRecentOpenedArchiveIds([])}
              disabled={recentOpenedArchives.length === 0}
            >
              {t('sparkery.inspectionAdmin.actions.clearHistory', {
                defaultValue: 'Clear History',
              })}
            </Button>
            <Button type='primary' onClick={() => setIsRecentOpenedOpen(false)}>
              {t('sparkery.inspectionAdmin.actions.close', {
                defaultValue: 'Close',
              })}
            </Button>
          </Space>
        }
      >
        <Space direction='vertical' className='sparkery-inspection-full-width'>
          {recentOpenedArchives.length > 0 ? (
            <div className='sparkery-inspection-command-list'>
              {recentOpenedArchives.map(item => {
                const statusMeta = getArchiveStatusMeta(item.status);
                return (
                  <div
                    key={`recent-opened-${item.id}`}
                    className='sparkery-inspection-command-item'
                  >
                    <Space direction='vertical' size={0}>
                      <Text strong>
                        {(item as any).propertyName ||
                          item.propertyId ||
                          t('sparkery.inspectionAdmin.labels.unnamed', {
                            defaultValue: 'Unnamed',
                          })}
                      </Text>
                      <Text type='secondary'>{item.id}</Text>
                      <Space size={6} wrap>
                        <Tag color={statusMeta.color}>{statusMeta.label}</Tag>
                        {(item as any).checkOutDate ? (
                          <Text type='secondary'>
                            {dayjs((item as any).checkOutDate).format(
                              'YYYY-MM-DD'
                            )}
                          </Text>
                        ) : null}
                      </Space>
                    </Space>
                    <Space size={6} wrap>
                      <Button
                        size='small'
                        onClick={() => {
                          setIsRecentOpenedOpen(false);
                          handleOpenArchiveDetailDrawer(item.id);
                        }}
                      >
                        {t('sparkery.inspectionAdmin.actions.details', {
                          defaultValue: 'Details',
                        })}
                      </Button>
                      <Button size='small' onClick={() => handleOpen(item)}>
                        {t('sparkery.inspectionAdmin.actions.openInspection', {
                          defaultValue: 'Open inspection',
                        })}
                      </Button>
                      <Button
                        size='small'
                        icon={<LinkOutlined />}
                        onClick={() => void handleCopyLink(item)}
                      >
                        {t('sparkery.inspectionAdmin.actions.copyLink', {
                          defaultValue: 'Copy link',
                        })}
                      </Button>
                    </Space>
                  </div>
                );
              })}
            </div>
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={t('sparkery.inspectionAdmin.empty.noRecentOpened', {
                defaultValue: 'No recently opened inspections yet.',
              })}
            />
          )}
        </Space>
      </Modal>
      <Modal
        title={t('sparkery.inspectionAdmin.actions.opsInbox', {
          defaultValue: 'Ops Inbox',
        })}
        open={isOpsInboxOpen}
        onCancel={() => setIsOpsInboxOpen(false)}
        footer={null}
      >
        <Space direction='vertical' className='sparkery-inspection-full-width'>
          <Text type='secondary'>
            {t('sparkery.inspectionAdmin.labels.unreadOps', {
              defaultValue: 'Unread Ops',
            })}
            : {opsInboxUnreadCount}
          </Text>
          {opsInboxItems.length > 0 ? (
            <div className='sparkery-inspection-command-list'>
              {opsInboxItems.map(item => (
                <div
                  key={`ops-inbox-${item.id}`}
                  className='sparkery-inspection-command-item'
                >
                  <Space direction='vertical' size={0}>
                    <Text strong>{item.type}</Text>
                    <Text type='secondary'>
                      {dayjs(item.at).format('YYYY-MM-DD HH:mm:ss')}
                    </Text>
                    <Text type='secondary'>{item.detail}</Text>
                  </Space>
                </div>
              ))}
            </div>
          ) : (
            <Alert
              type='success'
              showIcon
              message={t('sparkery.inspectionAdmin.messages.opsInboxClear', {
                defaultValue: 'No warning/error operations currently.',
              })}
            />
          )}
        </Space>
      </Modal>
      <Modal
        title={t('sparkery.inspectionAdmin.actions.uiTour', {
          defaultValue: 'UI Tour',
        })}
        open={isUiTourOpen}
        onCancel={() => setIsUiTourOpen(false)}
        footer={null}
      >
        <Space direction='vertical' className='sparkery-inspection-full-width'>
          <Alert
            type='info'
            showIcon
            message={t('sparkery.inspectionAdmin.tour.summary', {
              defaultValue:
                'Use this page as a control tower: quick actions, saved views, and detail drawer navigation.',
            })}
          />
          <Text>
            1.{' '}
            {t('sparkery.inspectionAdmin.tour.step1', {
              defaultValue:
                'Use Command Palette (Ctrl/Cmd+K) to run high-frequency actions.',
            })}
          </Text>
          <Text>
            2.{' '}
            {t('sparkery.inspectionAdmin.tour.step2', {
              defaultValue:
                'Pin favorite actions and saved views to reduce repeated clicks.',
            })}
          </Text>
          <Text>
            3.{' '}
            {t('sparkery.inspectionAdmin.tour.step3', {
              defaultValue:
                'Review errors in Ops Inbox, then retry failed batch subsets.',
            })}
          </Text>
          <Text>
            4.{' '}
            {t('sparkery.inspectionAdmin.tour.step4', {
              defaultValue:
                'Use drawer next/prev and quality navigators for rapid nightly checks.',
            })}
          </Text>
          <Button
            type='primary'
            onClick={() => {
              setIsUiTourOpen(false);
              setCommandPaletteQuery('');
              setIsCommandPaletteOpen(true);
            }}
          >
            {t('sparkery.inspectionAdmin.actions.openCommandPaletteNow', {
              defaultValue: 'Open Command Palette Now',
            })}
          </Button>
        </Space>
      </Modal>

      {isArchiveModuleVisible('logs') ? (
        <Card
          id='inspection-module-logs'
          size='small'
          className='sparkery-inspection-action-log-card'
          style={getArchiveModuleOrderStyle('logs')}
        >
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
                  count: filteredArchiveActionLogs.length,
                })}
              </Text>
              <Button size='small' onClick={handleExportActionLogsCsv}>
                {t('sparkery.inspectionAdmin.actions.exportLogs', {
                  defaultValue: 'Export Logs',
                })}
              </Button>
              <Button size='small' onClick={() => setArchiveActionLogs([])}>
                {t('sparkery.inspectionAdmin.actions.clearLogs', {
                  defaultValue: 'Clear',
                })}
              </Button>
              <Button
                size='small'
                onClick={() => setIsArchiveLogExpanded(prev => !prev)}
              >
                {isArchiveLogExpanded
                  ? t('sparkery.inspectionAdmin.actions.collapseLogs', {
                      defaultValue: 'Collapse',
                    })
                  : t('sparkery.inspectionAdmin.actions.expandLogs', {
                      defaultValue: 'Expand',
                    })}
              </Button>
            </Space>
          </div>
          {isArchiveLogExpanded ? (
            <>
              <Space wrap className='sparkery-inspection-full-width'>
                <Select
                  value={archiveLogFilterType}
                  style={{ minWidth: 180 }}
                  onChange={setArchiveLogFilterType}
                  options={archiveActionLogTypeOptions.map(type => ({
                    value: type,
                    label:
                      type === 'all'
                        ? t('sparkery.inspectionAdmin.logs.allTypes', {
                            defaultValue: 'All Types',
                          })
                        : type,
                  }))}
                />
                <Input
                  value={archiveLogSearchText}
                  onChange={event =>
                    setArchiveLogSearchText(event.target.value)
                  }
                  placeholder={t(
                    'sparkery.inspectionAdmin.logs.searchPlaceholder',
                    {
                      defaultValue: 'Search by type/id/detail',
                    }
                  )}
                  style={{ maxWidth: 320 }}
                />
                <Select
                  value={archiveLogRetentionDays}
                  style={{ width: 150 }}
                  onChange={(value: number) =>
                    setArchiveLogRetentionDays(value)
                  }
                  options={[
                    { value: 3, label: '3d' },
                    { value: 7, label: '7d' },
                    { value: 14, label: '14d' },
                    { value: 30, label: '30d' },
                  ]}
                />
              </Space>
              {archiveActionLogErrorSummary.length > 0 ? (
                <Space wrap className='sparkery-inspection-full-width'>
                  {archiveActionLogErrorSummary.map(([type, count]) => (
                    <Tag key={`log-error-${type}`} color='red'>
                      {type}: {count}
                    </Tag>
                  ))}
                </Space>
              ) : null}
              {filteredArchiveActionLogs.length === 0 ? (
                <Text type='secondary'>
                  {t('sparkery.inspectionAdmin.logs.empty', {
                    defaultValue:
                      'No operation logs yet. Refresh, copy/open links, or save a view to generate logs.',
                  })}
                </Text>
              ) : (
                <div className='sparkery-inspection-action-log-list'>
                  {filteredArchiveActionLogs.slice(0, 20).map(log => (
                    <div
                      key={log.id}
                      className='sparkery-inspection-action-log-item'
                    >
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
            </>
          ) : (
            <Text type='secondary'>
              {t('sparkery.inspectionAdmin.logs.collapsedHint', {
                defaultValue: 'Logs are collapsed to keep main workflow fast.',
              })}
            </Text>
          )}
        </Card>
      ) : null}

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
      <FloatButton.BackTop visibilityHeight={240} />
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
