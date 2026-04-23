import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertOutlined,
  AppstoreOutlined,
  CalculatorOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  DollarOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  GlobalOutlined,
  HomeOutlined,
  HistoryOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoreOutlined,
  PushpinFilled,
  PushpinOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  RiseOutlined,
  SearchOutlined,
  RetweetOutlined,
  ScheduleOutlined,
  ShoppingCartOutlined,
  StarFilled,
  StarOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import {
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Drawer,
  Dropdown,
  Input,
  Layout,
  List,
  Menu,
  Modal,
  notification,
  Progress,
  Segmented,
  Select,
  Space,
  Tag,
  Timeline,
  Tooltip,
  Typography,
  type MenuProps,
} from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { changeLanguage } from '@/locales';
import SparkeryEmptyState from '@/components/sparkery/SparkeryEmptyState';
import { logout, selectAuth } from '@/store/slices/authSlice';

const { Header, Sider, Content } = Layout;
const { Text, Title } = Typography;

interface NavItem {
  key: string;
  label: string;
  parentKey: string;
  parentLabel: string;
  description: string;
}

interface NavGroup {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  children: Array<{
    key: string;
    label: string;
    description: string;
    icon: React.ReactNode;
  }>;
}

interface CommandAction {
  key: string;
  section: 'module' | 'action';
  label: string;
  hint: string;
  keywords: string[];
  onSelect: () => void | Promise<void>;
}

interface WorkspaceOption {
  id: string;
  label: string;
  hint: string;
}

type DensityMode = 'comfortable' | 'compact' | 'dense';
type ThemeMode = 'light' | 'dark-neutral';
type AlertFilterMode = 'all' | 'unread' | 'warning' | 'error';

interface ShellAlertItem {
  id: string;
  moduleKey: string;
  severity: 'warning' | 'error' | 'info';
  title: string;
  details: string;
  createdAt: string;
  isRead: boolean;
}

interface ShellTaskItem {
  id: string;
  title: string;
  moduleKey: string;
  dueLabel: string;
  priority: 'high' | 'medium' | 'low';
  done: boolean;
}

interface ShellActivityItem {
  id: string;
  moduleKey: string;
  summary: string;
  createdAt: string;
}

interface ShellReleaseNoteItem {
  id: string;
  version: string;
  publishedAt: string;
  title: string;
  summary: string;
}

interface ModuleKpiItem {
  id: string;
  label: string;
  value: string;
  delta: number;
}

interface QuickCreateItem {
  id: string;
  label: string;
  targetPath: string;
}

const FAVORITE_MODULES_STORAGE_KEY = 'sparkery_saas_favorite_modules';
const PINNED_MODULES_STORAGE_KEY = 'sparkery_saas_pinned_modules';
const NAV_HINTS_STORAGE_KEY = 'sparkery_saas_nav_hints_seen_modules';
const NAV_CHANGES_STORAGE_KEY = 'sparkery_saas_nav_changes_seen_modules';
const RECENT_MODULES_STORAGE_KEY = 'sparkery_saas_recent_modules';
const DENSITY_MODE_STORAGE_KEY = 'sparkery_saas_density_mode';
const THEME_MODE_STORAGE_KEY = 'sparkery_saas_theme_mode';
const WORKSPACE_STORAGE_KEY = 'sparkery_saas_workspace_id';
const NAV_UNREAD_STORAGE_KEY = 'sparkery_saas_nav_unread_counts';
const MAX_RECENT_MODULES = 6;
const MAX_FAVORITE_MODULES = 6;
const DEFAULT_WORKSPACE_ID = 'sparkery-main';
const MODULE_SLA_BY_KEY: Record<string, 'P1' | 'P2' | 'P3'> = {
  '/sparkery/dispatch': 'P1',
  '/sparkery/finance': 'P1',
  '/sparkery/cleaning-inspection': 'P1',
  '/sparkery/quote-submissions': 'P2',
  '/sparkery/content-creator': 'P2',
  '/sparkery/users': 'P2',
  '/sparkery/quote-calculator': 'P3',
  '/sparkery/quote-form-en': 'P3',
  '/sparkery/quote-form-cn': 'P3',
  '/sparkery/china-procurement': 'P2',
  '/sparkery/recurring': 'P2',
};
const MODULE_CHANGELOG_BY_KEY: Record<string, string> = {
  '/sparkery/finance': 'Receivable workflow update',
  '/sparkery/users': 'Role and access policy update',
};
const WORKSPACE_OPTIONS: WorkspaceOption[] = [
  {
    id: 'sparkery-main',
    label: 'Sparkery Main',
    hint: 'Prod',
  },
  {
    id: 'sparkery-ops',
    label: 'Sparkery Ops',
    hint: 'Operations',
  },
  {
    id: 'sparkery-labs',
    label: 'Sparkery Labs',
    hint: 'DEV',
  },
];
const DENSITY_OPTIONS: Array<{ value: DensityMode; label: string }> = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'compact', label: 'Compact' },
  { value: 'dense', label: 'Dense' },
];
const THEME_OPTIONS: Array<{ value: ThemeMode; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark-neutral', label: 'Dark Neutral' },
];
const MODULE_FRESHNESS_MINUTES_BY_KEY: Record<string, number> = {
  '/sparkery/dispatch': 4,
  '/sparkery/finance': 6,
  '/sparkery/cleaning-inspection': 8,
  '/sparkery/quote-submissions': 12,
  '/sparkery/quote-calculator': 18,
  '/sparkery/china-procurement': 20,
  '/sparkery/recurring': 10,
  '/sparkery/content-creator': 9,
  '/sparkery/users': 14,
};
const MODULE_KPI_BY_KEY: Record<string, ModuleKpiItem[]> = {
  '/sparkery/dispatch': [
    { id: 'dispatch-open', label: 'Open Jobs', value: '42', delta: 7.4 },
    { id: 'dispatch-on-time', label: 'On-Time %', value: '96.3%', delta: 1.2 },
  ],
  '/sparkery/finance': [
    { id: 'finance-receivable', label: 'Receivable', value: '$18.4k', delta: -2.8 },
    { id: 'finance-overdue', label: 'Overdue', value: '11', delta: -9.1 },
  ],
  '/sparkery/cleaning-inspection': [
    { id: 'inspection-today', label: 'Inspections Today', value: '23', delta: 4.3 },
    { id: 'inspection-pass', label: 'Pass Rate', value: '93.1%', delta: 1.6 },
  ],
  '/sparkery/quote-submissions': [
    { id: 'quote-new', label: 'New Leads', value: '18', delta: 12.2 },
    { id: 'quote-conversion', label: 'Conversion', value: '39%', delta: 2.4 },
  ],
  '/sparkery/content-creator': [
    { id: 'creator-runs', label: 'Runs (24h)', value: '14', delta: 16.1 },
    { id: 'creator-published', label: 'Published', value: '9', delta: 11.3 },
  ],
};
const MODULE_QUICK_CREATE_BY_KEY: Record<string, QuickCreateItem[]> = {
  '/sparkery/dispatch': [
    { id: 'qc-dispatch-job', label: 'New Dispatch Job', targetPath: '/sparkery/dispatch' },
    { id: 'qc-dispatch-template', label: 'New Recurring Template', targetPath: '/sparkery/recurring' },
  ],
  '/sparkery/finance': [
    { id: 'qc-finance-confirm', label: 'Confirm Finance Batch', targetPath: '/sparkery/finance' },
  ],
  '/sparkery/quote-calculator': [
    { id: 'qc-quote-en', label: 'Create EN Quote', targetPath: '/sparkery/quote-form-en' },
    { id: 'qc-quote-cn', label: 'Create CN Quote', targetPath: '/sparkery/quote-form-cn' },
  ],
  '/sparkery/content-creator': [
    {
      id: 'qc-content-creator',
      label: 'Open Content Creator',
      targetPath: '/sparkery/content-creator',
    },
  ],
  '/sparkery/users': [
    { id: 'qc-user-manage', label: 'Manage Workspace Users', targetPath: '/sparkery/users' },
  ],
};
const DEFAULT_MODULE_KPIS: ModuleKpiItem[] = [
  { id: 'global-throughput', label: 'Throughput', value: '127', delta: 3.1 },
  { id: 'global-backlog', label: 'Backlog', value: '24', delta: -4.7 },
];
const WORKLOAD_HEATMAP = [
  { day: 'Mon', load: 0.42 },
  { day: 'Tue', load: 0.56 },
  { day: 'Wed', load: 0.61 },
  { day: 'Thu', load: 0.74 },
  { day: 'Fri', load: 0.83 },
  { day: 'Sat', load: 0.47 },
  { day: 'Sun', load: 0.31 },
];
const INITIAL_ALERTS: ShellAlertItem[] = [
  {
    id: 'alert-dispatch-overdue',
    moduleKey: '/sparkery/dispatch',
    severity: 'warning',
    title: 'Dispatch retries increased',
    details: 'Retry queue exceeded threshold (12) in last 30 minutes.',
    createdAt: new Date(Date.now() - 27 * 60 * 1000).toISOString(),
    isRead: false,
  },
  {
    id: 'alert-finance-sync',
    moduleKey: '/sparkery/finance',
    severity: 'error',
    title: 'Finance sync failed',
    details: 'Xero sync request timed out for batch FIN-2026-02-27-03.',
    createdAt: new Date(Date.now() - 54 * 60 * 1000).toISOString(),
    isRead: false,
  },
  {
    id: 'alert-users-role',
    moduleKey: '/sparkery/users',
    severity: 'info',
    title: 'Role policy updated',
    details: 'Workspace role bootstrap policy rolled out successfully.',
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    isRead: true,
  },
];
const INITIAL_TASKS: ShellTaskItem[] = [
  {
    id: 'task-approve-quote',
    title: 'Review high-value quote submissions',
    moduleKey: '/sparkery/quote-submissions',
    dueLabel: 'Today',
    priority: 'high',
    done: false,
  },
  {
    id: 'task-dispatch-balance',
    title: 'Balance tomorrow dispatch workload',
    moduleKey: '/sparkery/dispatch',
    dueLabel: 'Today',
    priority: 'medium',
    done: false,
  },
  {
    id: 'task-finance-confirm',
    title: 'Confirm receivable reconciliation',
    moduleKey: '/sparkery/finance',
    dueLabel: 'Tomorrow',
    priority: 'high',
    done: false,
  },
];
const INITIAL_ACTIVITIES: ShellActivityItem[] = [
  {
    id: 'activity-1',
    moduleKey: '/sparkery/dispatch',
    summary: 'Dispatch board refreshed and allocations updated.',
    createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  },
  {
    id: 'activity-2',
    moduleKey: '/sparkery/quote-submissions',
    summary: 'New quote submission accepted and assigned.',
    createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
  },
];
const RELEASE_NOTES: ShellReleaseNoteItem[] = [
  {
    id: 'rn-1',
    version: '2026.02.27',
    publishedAt: '2026-02-27',
    title: 'SaaS shell upgrade',
    summary: 'Navigation IA, command palette, favorites, pinned modules and unread indicators.',
  },
  {
    id: 'rn-2',
    version: '2026.02.26',
    publishedAt: '2026-02-26',
    title: 'Finance workflow hardening',
    summary: 'Dispatch finance consistency checks and safer migration execution updates.',
  },
];

const safeReadStoredList = (key: string): string[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
};

const safeWriteStoredList = (key: string, value: string[]) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage failures to keep UI usable
  }
};

const safeReadStoredRecord = (key: string): Record<string, number> => {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return Object.entries(parsed).reduce<Record<string, number>>(
      (acc, [recordKey, recordValue]) => {
        const normalized =
          typeof recordValue === 'number' && Number.isFinite(recordValue)
            ? Math.max(0, Math.floor(recordValue))
            : 0;
        if (normalized > 0) {
          acc[recordKey] = normalized;
        }
        return acc;
      },
      {}
    );
  } catch {
    return {};
  }
};

const safeWriteStoredRecord = (key: string, value: Record<string, number>) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage failures to keep UI usable
  }
};

const getRoleTagColor = (role: string | undefined): string => {
  switch ((role || '').toLowerCase()) {
    case 'admin':
      return 'gold';
    case 'manager':
      return 'blue';
    case 'employee':
      return 'green';
    default:
      return 'default';
  }
};

const formatMinutesAgo = (timestamp: string): string => {
  const elapsedMs = Date.now() - new Date(timestamp).getTime();
  const elapsedMin = Math.max(0, Math.round(elapsedMs / 60000));
  if (elapsedMin < 1) {
    return 'just now';
  }
  if (elapsedMin < 60) {
    return `${elapsedMin}m ago`;
  }
  const elapsedHour = Math.round(elapsedMin / 60);
  if (elapsedHour < 24) {
    return `${elapsedHour}h ago`;
  }
  const elapsedDay = Math.round(elapsedHour / 24);
  return `${elapsedDay}d ago`;
};

const SparkerySaasLayout: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const auth = useAppSelector(selectAuth);
  const [collapsed, setCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [moduleSearchQuery, setModuleSearchQuery] = useState('');
  const [densityMode, setDensityMode] = useState<DensityMode>(() => {
    if (typeof window === 'undefined') {
      return 'comfortable';
    }
    const stored = window.localStorage.getItem(DENSITY_MODE_STORAGE_KEY);
    if (stored === 'compact' || stored === 'dense' || stored === 'comfortable') {
      return stored;
    }
    return 'comfortable';
  });
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') {
      return 'light';
    }
    return window.localStorage.getItem(THEME_MODE_STORAGE_KEY) === 'dark-neutral'
      ? 'dark-neutral'
      : 'light';
  });
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_WORKSPACE_ID;
    }
    return (
      window.localStorage.getItem(WORKSPACE_STORAGE_KEY) || DEFAULT_WORKSPACE_ID
    );
  });
  const [navUnreadByModule, setNavUnreadByModule] = useState<Record<string, number>>(
    () => safeReadStoredRecord(NAV_UNREAD_STORAGE_KEY)
  );
  const [pinnedModuleKeys, setPinnedModuleKeys] = useState<string[]>(() =>
    safeReadStoredList(PINNED_MODULES_STORAGE_KEY)
  );
  const [hintedModuleKeys, setHintedModuleKeys] = useState<string[]>(() =>
    safeReadStoredList(NAV_HINTS_STORAGE_KEY)
  );
  const [acknowledgedChangeModuleKeys, setAcknowledgedChangeModuleKeys] = useState<string[]>(() =>
    safeReadStoredList(NAV_CHANGES_STORAGE_KEY)
  );
  const [favoriteModuleKeys, setFavoriteModuleKeys] = useState<string[]>(() =>
    safeReadStoredList(FAVORITE_MODULES_STORAGE_KEY)
  );
  const [recentModuleKeys, setRecentModuleKeys] = useState<string[]>(() =>
    safeReadStoredList(RECENT_MODULES_STORAGE_KEY)
  );
  const [alertCenterOpen, setAlertCenterOpen] = useState(false);
  const [activityDrawerOpen, setActivityDrawerOpen] = useState(false);
  const [releaseNotesOpen, setReleaseNotesOpen] = useState(false);
  const [alertFilterMode, setAlertFilterMode] = useState<AlertFilterMode>('all');
  const [alerts, setAlerts] = useState<ShellAlertItem[]>(INITIAL_ALERTS);
  const [tasks, setTasks] = useState<ShellTaskItem[]>(INITIAL_TASKS);
  const [activities, setActivities] = useState<ShellActivityItem[]>(INITIAL_ACTIVITIES);
  const [lastSyncAt, setLastSyncAt] = useState<string>(() => new Date().toISOString());
  const [scheduledJobs, setScheduledJobs] = useState({
    running: 2,
    queued: 5,
    failed: 1,
    successRate: 96.8,
  });
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator === 'undefined') {
      return true;
    }
    return navigator.onLine;
  });
  const [reconnectedAt, setReconnectedAt] = useState<string | null>(null);
  const latestErrorFingerprintRef = useRef<string>('');

  const openGlobalErrorToast = useCallback(
    (title: string, details: string) => {
      const fingerprint = `${title}::${details}`.slice(0, 500);
      if (latestErrorFingerprintRef.current === fingerprint) {
        return;
      }
      latestErrorFingerprintRef.current = fingerprint;
      notification.error({
        message: title,
        duration: 0,
        description: (
          <Space direction='vertical' size={8}>
            <Text type='secondary' className='sparkery-saas-error-toast-details'>
              {details}
            </Text>
            <Button
              size='small'
              icon={<CopyOutlined />}
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                  void navigator.clipboard.writeText(details);
                }
              }}
            >
              {t('sparkery.saas.actions.copyTechnicalDetails', {
                defaultValue: 'Copy technical details',
              })}
            </Button>
          </Space>
        ),
      });
      window.setTimeout(() => {
        if (latestErrorFingerprintRef.current === fingerprint) {
          latestErrorFingerprintRef.current = '';
        }
      }, 5000);
    },
    [t]
  );

  const navGroups = useMemo<NavGroup[]>(
    () => [
      {
        key: 'quotes',
        icon: <AppstoreOutlined />,
        label: t('sparkery.saas.nav.quotes', {
          defaultValue: 'Quotes',
        }),
        description: t('sparkery.saas.nav.quotesDesc', {
          defaultValue: 'Quote intake, forms and submissions',
        }),
        children: [
          {
            key: '/sparkery/quote-calculator',
            icon: <CalculatorOutlined />,
            label: t('sparkery.tabs.quoteCalculator', {
              defaultValue: 'Quote Calculator',
            }),
            description: t('sparkery.saas.module.quoteCalculatorDesc', {
              defaultValue: 'Build and review cleaning quotes',
            }),
          },
          {
            key: '/sparkery/quote-form-en',
            icon: <FileTextOutlined />,
            label: t('sparkery.tabs.quoteFormEn', {
              defaultValue: 'Quote Form (English)',
            }),
            description: t('sparkery.saas.module.quoteFormEnDesc', {
              defaultValue: 'Public quote request form (English)',
            }),
          },
          {
            key: '/sparkery/quote-form-cn',
            icon: <GlobalOutlined />,
            label: t('sparkery.tabs.quoteFormCn', {
              defaultValue: 'Quote Form (Chinese)',
            }),
            description: t('sparkery.saas.module.quoteFormCnDesc', {
              defaultValue: 'Public quote request form (Chinese)',
            }),
          },
          {
            key: '/sparkery/quote-submissions',
            icon: <UnorderedListOutlined />,
            label: t('sparkery.tabs.quoteSubmissions', {
              defaultValue: 'Quote Submissions',
            }),
            description: t('sparkery.saas.module.quoteSubmissionsDesc', {
              defaultValue: 'Track and follow up quote requests',
            }),
          },
        ],
      },
      {
        key: 'inspection',
        icon: <HomeOutlined />,
        label: t('sparkery.saas.nav.inspection', {
          defaultValue: 'Inspection & Procurement',
        }),
        description: t('sparkery.saas.nav.inspectionDesc', {
          defaultValue: 'Inspection operations and procurement workflow',
        }),
        children: [
          {
            key: '/sparkery/cleaning-inspection',
            icon: <HomeOutlined />,
            label: t('sparkery.tabs.cleaningInspection', {
              defaultValue: 'Cleaning Inspection',
            }),
            description: t('sparkery.saas.module.cleaningInspectionDesc', {
              defaultValue: 'Inspection control tower and archive',
            }),
          },
          {
            key: '/sparkery/china-procurement',
            icon: <ShoppingCartOutlined />,
            label: t('sparkery.tabs.chinaProcurement', {
              defaultValue: 'China Procurement',
            }),
            description: t('sparkery.saas.module.chinaProcurementDesc', {
              defaultValue: 'Procurement report and sourcing tracker',
            }),
          },
        ],
      },
      {
        key: 'dispatch',
        icon: <UnorderedListOutlined />,
        label: t('sparkery.saas.nav.dispatchOps', {
          defaultValue: 'Dispatch & Finance',
        }),
        description: t('sparkery.saas.nav.dispatchOpsDesc', {
          defaultValue: 'Scheduling, recurring plans and finance',
        }),
        children: [
          {
            key: '/sparkery/dispatch',
            icon: <ScheduleOutlined />,
            label: t('sparkery.tabs.dispatchDashboard', {
              defaultValue: 'Dispatch Board',
            }),
            description: t('sparkery.saas.module.dispatchBoardDesc', {
              defaultValue: 'Daily dispatch board and allocation',
            }),
          },
          {
            key: '/sparkery/recurring',
            icon: <RetweetOutlined />,
            label: t('sparkery.tabs.recurringTemplates', {
              defaultValue: 'Recurring Templates',
            }),
            description: t('sparkery.saas.module.recurringTemplatesDesc', {
              defaultValue: 'Reusable recurring dispatch templates',
            }),
          },
          {
            key: '/sparkery/finance',
            icon: <DollarOutlined />,
            label: t('sparkery.tabs.financeDashboard', {
              defaultValue: 'Finance Dashboard',
            }),
            description: t('sparkery.saas.module.financeDashboardDesc', {
              defaultValue: 'Receivables and finance tracking',
            }),
          },
        ],
      },
      {
        key: 'workspace',
        icon: <TeamOutlined />,
        label: t('sparkery.saas.nav.workspace', {
          defaultValue: 'Workspace',
        }),
        description: t('sparkery.saas.nav.workspaceDesc', {
          defaultValue: 'Users, permissions and workspace settings',
        }),
        children: [
          {
            key: '/sparkery/users',
            icon: <TeamOutlined />,
            label: t('sparkery.saas.nav.users', {
              defaultValue: 'User Management',
            }),
            description: t('sparkery.saas.module.userManagementDesc', {
              defaultValue: 'Manage workspace members and roles',
            }),
          },
        ],
      },
      {
        key: 'tools',
        icon: <ToolOutlined />,
        label: t('sparkery.saas.nav.tools', {
          defaultValue: 'Tools',
        }),
        description: t('sparkery.saas.nav.toolsDesc', {
          defaultValue: 'Automation and growth utilities',
        }),
        children: [
          {
            key: '/sparkery/content-creator',
            icon: <ThunderboltOutlined />,
            label: t('sparkery.saas.nav.contentCreator', {
              defaultValue: 'Content Creator',
            }),
            description: t('sparkery.saas.module.contentCreatorDesc', {
              defaultValue: 'GUI control tower for n8n content workflows',
            }),
          },
        ],
      },
    ],
    [t]
  );

  const navItems = useMemo<NavItem[]>(
    () =>
      navGroups.flatMap(group =>
        group.children.map(item => ({
          key: item.key,
          label: item.label,
          parentKey: group.key,
          parentLabel: group.label,
          description: item.description,
        }))
      ),
    [navGroups]
  );
  const navOrderedKeys = useMemo(
    () => navItems.map(item => item.key),
    [navItems]
  );

  const selectedKey =
    navItems
      .map(item => item.key)
      .sort((a, b) => b.length - a.length)
      .find(key => location.pathname.startsWith(key)) || '/sparkery/quote-calculator';

  const selectedParentKey = navItems.find(item => item.key === selectedKey)?.parentKey;
  const selectedItem = navItems.find(item => item.key === selectedKey);
  const [openKeys, setOpenKeys] = useState<string[]>(
    navGroups.map(group => group.key)
  );

  useEffect(() => {
    if (!selectedParentKey) {
      return;
    }
    setOpenKeys(prev => (prev.includes(selectedParentKey) ? prev : [...prev, selectedParentKey]));
  }, [selectedParentKey]);

  useEffect(() => {
    setRecentModuleKeys(prev => {
      const next = [selectedKey, ...prev.filter(key => key !== selectedKey)].slice(
        0,
        MAX_RECENT_MODULES
      );
      safeWriteStoredList(RECENT_MODULES_STORAGE_KEY, next);
      return next;
    });
  }, [selectedKey]);

  useEffect(() => {
    safeWriteStoredList(FAVORITE_MODULES_STORAGE_KEY, favoriteModuleKeys);
  }, [favoriteModuleKeys]);

  useEffect(() => {
    safeWriteStoredList(PINNED_MODULES_STORAGE_KEY, pinnedModuleKeys);
  }, [pinnedModuleKeys]);

  useEffect(() => {
    safeWriteStoredList(NAV_HINTS_STORAGE_KEY, hintedModuleKeys);
  }, [hintedModuleKeys]);

  useEffect(() => {
    safeWriteStoredList(NAV_CHANGES_STORAGE_KEY, acknowledgedChangeModuleKeys);
  }, [acknowledgedChangeModuleKeys]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, activeWorkspaceId);
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(DENSITY_MODE_STORAGE_KEY, densityMode);
    document.documentElement.setAttribute('data-sparkery-density', densityMode);
  }, [densityMode]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode);
    document.documentElement.setAttribute('data-sparkery-theme', themeMode);
  }, [themeMode]);

  useEffect(() => {
    safeWriteStoredRecord(NAV_UNREAD_STORAGE_KEY, navUnreadByModule);
  }, [navUnreadByModule]);

  useEffect(() => {
    setNavUnreadByModule(prev => {
      if (!prev[selectedKey]) {
        return prev;
      }
      const next = { ...prev };
      delete next[selectedKey];
      return next;
    });
    setHintedModuleKeys(prev => {
      if (prev.includes(selectedKey)) {
        return prev;
      }
      return [...prev, selectedKey];
    });
    setAcknowledgedChangeModuleKeys(prev => {
      if (!MODULE_CHANGELOG_BY_KEY[selectedKey] || prev.includes(selectedKey)) {
        return prev;
      }
      return [...prev, selectedKey];
    });
  }, [selectedKey]);

  useEffect(() => {
    if (!selectedItem) {
      return;
    }
    setActivities(prev => {
      const next: ShellActivityItem = {
        id: `activity-${Date.now()}`,
        moduleKey: selectedKey,
        summary: `Opened module: ${selectedItem.label}`,
        createdAt: new Date().toISOString(),
      };
      return [next, ...prev].slice(0, 40);
    });
  }, [selectedItem, selectedKey]);

  useEffect(() => {
    if (location.pathname.startsWith('/sparkery/cleaning-inspection')) {
      return;
    }
    const handler = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === 'k' &&
        !event.shiftKey &&
        !event.altKey
      ) {
        event.preventDefault();
        setCommandPaletteOpen(true);
        setCommandQuery('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [location.pathname]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setReconnectedAt(new Date().toISOString());
    };
    const handleOffline = () => {
      setIsOnline(false);
      setReconnectedAt(null);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!reconnectedAt) {
      return;
    }
    const timer = window.setTimeout(() => setReconnectedAt(null), 6000);
    return () => window.clearTimeout(timer);
  }, [reconnectedAt]);

  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      const details = [event.message, event.filename, event.lineno, event.colno]
        .filter(Boolean)
        .join(' | ');
      if (!details || details.includes('ResizeObserver loop limit exceeded')) {
        return;
      }
      openGlobalErrorToast(
        t('sparkery.saas.errors.unexpectedError', {
          defaultValue: 'Unexpected UI Error',
        }),
        details
      );
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const details =
        reason instanceof Error
          ? `${reason.name}: ${reason.message}`
          : typeof reason === 'string'
            ? reason
            : JSON.stringify(reason);
      openGlobalErrorToast(
        t('sparkery.saas.errors.unhandledRejection', {
          defaultValue: 'Unhandled Promise Rejection',
        }),
        details
      );
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [openGlobalErrorToast, t]);

  const toggleFavoriteModule = (moduleKey: string) => {
    setFavoriteModuleKeys(prev =>
      prev.includes(moduleKey)
        ? prev.filter(key => key !== moduleKey)
        : [moduleKey, ...prev.filter(key => key !== moduleKey)].slice(
            0,
            MAX_FAVORITE_MODULES
          )
    );
  };

  const togglePinnedModule = (moduleKey: string) => {
    setPinnedModuleKeys(prev =>
      prev.includes(moduleKey)
        ? prev.filter(key => key !== moduleKey)
        : [moduleKey, ...prev.filter(key => key !== moduleKey)].slice(
            0,
            MAX_FAVORITE_MODULES
          )
    );
  };

  const favoriteModules = useMemo(
    () =>
      favoriteModuleKeys
        .map(key => navItems.find(item => item.key === key))
        .filter((item): item is NavItem => Boolean(item)),
    [favoriteModuleKeys, navItems]
  );

  const pinnedModules = useMemo(
    () =>
      pinnedModuleKeys
        .map(key => navItems.find(item => item.key === key))
        .filter((item): item is NavItem => Boolean(item)),
    [navItems, pinnedModuleKeys]
  );

  const recentModules = useMemo(
    () =>
      recentModuleKeys
        .map(key => navItems.find(item => item.key === key))
        .filter((item): item is NavItem => Boolean(item)),
    [navItems, recentModuleKeys]
  );

  const navNodeByKey = useMemo(() => {
    const map = new Map<
      string,
      { key: string; label: string; description: string; icon: React.ReactNode }
    >();
    navGroups.forEach(group => {
      group.children.forEach(child => {
        map.set(child.key, child);
      });
    });
    return map;
  }, [navGroups]);

  const menuGroups = useMemo<NavGroup[]>(() => {
    if (pinnedModules.length === 0) {
      return navGroups;
    }
    const pinnedSet = new Set(pinnedModules.map(item => item.key));
    const pinnedChildren = pinnedModules.map(item => {
      const node = navNodeByKey.get(item.key);
      return {
        key: item.key,
        label: item.label,
        description: item.description,
        icon: node?.icon || <PushpinOutlined />,
      };
    });
    const remainingGroups = navGroups
      .map(group => ({
        ...group,
        children: group.children.filter(child => !pinnedSet.has(child.key)),
      }))
      .filter(group => group.children.length > 0);
    return [
      {
        key: 'pinned',
        icon: <PushpinOutlined />,
        label: t('sparkery.saas.nav.pinned', {
          defaultValue: 'Pinned',
        }),
        description: t('sparkery.saas.nav.pinnedDesc', {
          defaultValue: 'Pinned modules for quick access',
        }),
        children: pinnedChildren,
      },
      ...remainingGroups,
    ];
  }, [navGroups, navNodeByKey, pinnedModules, t]);

  const roleScope = (auth.user?.role || 'user').toLowerCase();
  const moduleFreshnessMinutes = MODULE_FRESHNESS_MINUTES_BY_KEY[selectedKey] || 15;
  const freshnessScore = Math.max(5, Math.min(100, 100 - moduleFreshnessMinutes * 3));
  const moduleKpis = MODULE_KPI_BY_KEY[selectedKey] || DEFAULT_MODULE_KPIS;
  const quickCreateItems =
    MODULE_QUICK_CREATE_BY_KEY[selectedKey] || MODULE_QUICK_CREATE_BY_KEY['/sparkery/quote-calculator'] || [];
  const unreadAlertCount = alerts.filter(alert => !alert.isRead).length;
  const pendingApprovals = [
    { id: 'approval-quote', label: 'Quote approval', count: 3 },
    { id: 'approval-finance', label: 'Finance confirmation', count: 2 },
  ];

  const filteredAlerts = useMemo(() => {
    switch (alertFilterMode) {
      case 'unread':
        return alerts.filter(alert => !alert.isRead);
      case 'warning':
        return alerts.filter(alert => alert.severity === 'warning');
      case 'error':
        return alerts.filter(alert => alert.severity === 'error');
      case 'all':
      default:
        return alerts;
    }
  }, [alertFilterMode, alerts]);

  const outstandingTasks = tasks.filter(task => !task.done);
  const todayFocusCount =
    unreadAlertCount +
    outstandingTasks.filter(task => task.priority === 'high' || task.dueLabel === 'Today').length;

  const systemHealth = useMemo(() => {
    const hasError = alerts.some(alert => !alert.isRead && alert.severity === 'error');
    const hasWarning = alerts.some(alert => !alert.isRead && alert.severity === 'warning');
    if (hasError) {
      return {
        tone: 'danger',
        label: t('sparkery.saas.health.degraded', {
          defaultValue: 'Degraded',
        }),
      };
    }
    if (hasWarning) {
      return {
        tone: 'warning',
        label: t('sparkery.saas.health.watch', {
          defaultValue: 'Watch',
        }),
      };
    }
    return {
      tone: 'success',
      label: t('sparkery.saas.health.healthy', {
        defaultValue: 'Healthy',
      }),
    };
  }, [alerts, t]);

  const showOpsKpi = roleScope === 'admin' || roleScope === 'manager' || roleScope === 'employee';
  const showApprovals = roleScope === 'admin' || roleScope === 'manager';
  const showWorkloadHeatmap = roleScope === 'admin' || roleScope === 'manager';

  const refreshModuleData = useCallback(() => {
    setLastSyncAt(new Date().toISOString());
    setActivities(prev => {
      const next: ShellActivityItem = {
        id: `activity-refresh-${Date.now()}`,
        moduleKey: selectedKey,
        summary: `Manual refresh triggered for ${selectedItem?.label || selectedKey}`,
        createdAt: new Date().toISOString(),
      };
      return [next, ...prev].slice(0, 40);
    });
  }, [selectedItem?.label, selectedKey]);

  const retryFailedJobs = useCallback(() => {
    setScheduledJobs(prev => ({
      ...prev,
      failed: Math.max(0, prev.failed - 1),
      running: prev.running + 1,
    }));
    setLastSyncAt(new Date().toISOString());
    setActivities(prev => {
      const next: ShellActivityItem = {
        id: `activity-retry-${Date.now()}`,
        moduleKey: '/sparkery/dispatch',
        summary: 'Triggered retry for failed scheduled jobs.',
        createdAt: new Date().toISOString(),
      };
      return [next, ...prev].slice(0, 40);
    });
  }, []);

  const markAlertRead = useCallback((id: string) => {
    setAlerts(prev =>
      prev.map(alert => (alert.id === id ? { ...alert, isRead: true } : alert))
    );
  }, []);

  const markAllAlertsRead = useCallback(() => {
    setAlerts(prev => prev.map(alert => ({ ...alert, isRead: true })));
  }, []);

  const copyAlertDetails = useCallback(async (alert: ShellAlertItem) => {
    const payload = [
      `Alert: ${alert.title}`,
      `Severity: ${alert.severity}`,
      `Module: ${alert.moduleKey}`,
      `CreatedAt: ${alert.createdAt}`,
      `Details: ${alert.details}`,
    ].join('\n');
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(payload);
    }
    setActivities(prev => {
      const next: ShellActivityItem = {
        id: `activity-copy-alert-${Date.now()}`,
        moduleKey: alert.moduleKey,
        summary: `Copied alert details: ${alert.title}`,
        createdAt: new Date().toISOString(),
      };
      return [next, ...prev].slice(0, 40);
    });
  }, []);

  const toggleTaskDone = useCallback((taskId: string) => {
    setTasks(prev =>
      prev.map(task => (task.id === taskId ? { ...task, done: !task.done } : task))
    );
  }, []);

  const handleLogout = useCallback(async () => {
    await dispatch(logout());
    navigate('/login', { replace: true });
  }, [dispatch, navigate]);

  const executeModuleNavigation = useCallback((targetPath: string) => {
    navigate(targetPath);
    setCommandPaletteOpen(false);
    setCommandQuery('');
    setModuleSearchQuery('');
  }, [navigate]);

  useEffect(() => {
    const isTypingContext = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }
      return (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      );
    };

    const handler = (event: KeyboardEvent) => {
      if (isTypingContext(event.target)) {
        return;
      }
      if (!(event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey)) {
        return;
      }
      const index = navOrderedKeys.indexOf(selectedKey);
      if (index < 0) {
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const nextIndex = (index + 1) % navOrderedKeys.length;
        const nextKey = navOrderedKeys[nextIndex];
        if (nextKey) {
          executeModuleNavigation(nextKey);
        }
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        const prevIndex = (index - 1 + navOrderedKeys.length) % navOrderedKeys.length;
        const prevKey = navOrderedKeys[prevIndex];
        if (prevKey) {
          executeModuleNavigation(prevKey);
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [executeModuleNavigation, navOrderedKeys, selectedKey]);

  const activeWorkspace = useMemo<WorkspaceOption>(
    () =>
      WORKSPACE_OPTIONS.find(workspace => workspace.id === activeWorkspaceId) || {
        id: DEFAULT_WORKSPACE_ID,
        label: 'Sparkery Main',
        hint: 'Prod',
      },
    [activeWorkspaceId]
  );

  const pageSummary =
    selectedItem?.description ||
    t('sparkery.saas.pageSubtitle', {
      defaultValue: 'Traditional SaaS workspace shell',
    });

  const modulePrimaryAction = useMemo(() => {
    switch (selectedKey) {
      case '/sparkery/quote-calculator':
        return {
          label: t('sparkery.saas.actions.newQuote', {
            defaultValue: 'New Quote',
          }),
          icon: <FileTextOutlined />,
          onClick: () => executeModuleNavigation('/sparkery/quote-form-en'),
        };
      case '/sparkery/quote-submissions':
        return {
          label: t('sparkery.saas.actions.openCalculator', {
            defaultValue: 'Open Calculator',
          }),
          icon: <CalculatorOutlined />,
          onClick: () => executeModuleNavigation('/sparkery/quote-calculator'),
        };
      case '/sparkery/dispatch':
        return {
          label: t('sparkery.saas.actions.openRecurringTemplates', {
            defaultValue: 'Open Recurring',
          }),
          icon: <RetweetOutlined />,
          onClick: () => executeModuleNavigation('/sparkery/recurring'),
        };
      case '/sparkery/recurring':
        return {
          label: t('sparkery.saas.actions.openDispatchBoard', {
            defaultValue: 'Open Dispatch',
          }),
          icon: <ScheduleOutlined />,
          onClick: () => executeModuleNavigation('/sparkery/dispatch'),
        };
      case '/sparkery/finance':
        return {
          label: t('sparkery.saas.actions.openDispatchBoard', {
            defaultValue: 'Open Dispatch',
          }),
          icon: <ScheduleOutlined />,
          onClick: () => executeModuleNavigation('/sparkery/dispatch'),
        };
      case '/sparkery/users':
        return {
          label: t('sparkery.saas.actions.manageUsers', {
            defaultValue: 'Manage Users',
          }),
          icon: <TeamOutlined />,
          onClick: () => executeModuleNavigation('/sparkery/users'),
        };
      case '/sparkery/content-creator':
        return {
          label: t('sparkery.saas.actions.openContentCreator', {
            defaultValue: 'Open Creator',
          }),
          icon: <ThunderboltOutlined />,
          onClick: () => executeModuleNavigation('/sparkery/content-creator'),
        };
      default:
        return {
          label: t('sparkery.saas.actions.commandPalette', {
            defaultValue: 'Command',
          }),
          icon: <ThunderboltOutlined />,
          onClick: () => {
            setCommandPaletteOpen(true);
            setCommandQuery('');
          },
        };
    }
  }, [executeModuleNavigation, selectedKey, t]);

  const menuItems: MenuProps['items'] = useMemo(
    () =>
      menuGroups.map(group => ({
        key: group.key,
        icon: group.icon,
        label: (
          <div className='sparkery-saas-group-label'>
            <span>{group.label}</span>
            {!collapsed ? (
              <span className='sparkery-saas-group-description'>
                {group.description}
              </span>
            ) : null}
          </div>
        ),
        children: group.children.map(item => ({
          key: item.key,
          icon: item.icon,
          label: (() => {
            const unreadCount = navUnreadByModule[item.key] || 0;
            const slaLevel = MODULE_SLA_BY_KEY[item.key] || 'P3';
            const hasChangeNotice =
              Boolean(MODULE_CHANGELOG_BY_KEY[item.key]) &&
              !acknowledgedChangeModuleKeys.includes(item.key);
            const showHint = !hintedModuleKeys.includes(item.key);
            const hintText = t('sparkery.saas.nav.guideHint', {
              defaultValue:
                'Open this module once to initialize quick actions and default filters.',
            });
            if (collapsed) {
              return (
                <Tooltip
                  placement='right'
                  title={
                    <div>
                      <div>{item.label}</div>
                      <div className='sparkery-saas-tooltip-description'>
                        {item.description}
                      </div>
                      <div className='sparkery-saas-tooltip-description'>
                        SLA: {slaLevel}
                      </div>
                      {hasChangeNotice ? (
                        <div className='sparkery-saas-tooltip-description'>
                          Updated: {MODULE_CHANGELOG_BY_KEY[item.key]}
                        </div>
                      ) : null}
                    </div>
                  }
                >
                  <div className='sparkery-saas-menu-entry sparkery-saas-menu-entry-compact'>
                    <div className='sparkery-saas-menu-label sparkery-saas-menu-label-compact'>
                      <span>{item.label}</span>
                    </div>
                    {unreadCount > 0 ? (
                      <Badge
                        dot
                        color='#1677ff'
                        className='sparkery-saas-menu-unread-dot'
                      />
                    ) : null}
                  </div>
                </Tooltip>
              );
            }
            return (
              <div className='sparkery-saas-menu-entry'>
                <div className='sparkery-saas-menu-label'>
                  <span>{item.label}</span>
                  <span className='sparkery-saas-menu-description'>
                    {item.description}
                  </span>
                  <Space size={6} wrap className='sparkery-saas-menu-meta'>
                    <span className={`sparkery-saas-sla-badge sparkery-saas-sla-${slaLevel.toLowerCase()}`}>
                      {slaLevel}
                    </span>
                    {hasChangeNotice ? (
                      <Tag color='processing' className='sparkery-saas-menu-change-tag'>
                        {t('sparkery.saas.nav.updated', {
                          defaultValue: 'Updated',
                        })}
                      </Tag>
                    ) : null}
                    {showHint ? (
                      <Tooltip title={hintText}>
                        <Tag
                          icon={<QuestionCircleOutlined />}
                          color='purple'
                          className='sparkery-saas-menu-hint-tag'
                        >
                          {t('sparkery.saas.nav.guide', {
                            defaultValue: 'Guide',
                          })}
                        </Tag>
                      </Tooltip>
                    ) : null}
                  </Space>
                </div>
                {unreadCount > 0 ? (
                  <Badge
                    count={unreadCount}
                    size='small'
                    overflowCount={99}
                    className='sparkery-saas-menu-unread-count'
                  />
                ) : null}
              </div>
            );
          })(),
          onClick: () => executeModuleNavigation(item.key),
        })),
      })),
    [
      acknowledgedChangeModuleKeys,
      collapsed,
      executeModuleNavigation,
      hintedModuleKeys,
      menuGroups,
      navUnreadByModule,
      t,
    ]
  );

  const commandActions = useMemo<CommandAction[]>(
    () => [
      ...navItems.map(item => ({
        key: `navigate:${item.key}`,
        section: 'module' as const,
        label: item.label,
        hint: item.parentLabel,
        keywords: [item.label, item.parentLabel, item.description, item.key],
        onSelect: () => executeModuleNavigation(item.key),
      })),
      ...WORKSPACE_OPTIONS.map(workspace => ({
        key: `workspace:${workspace.id}`,
        section: 'action' as const,
        label: t('sparkery.saas.actions.switchWorkspace', {
          defaultValue: 'Switch Workspace',
        }),
        hint: `${workspace.label} (${workspace.hint})`,
        keywords: ['workspace', 'tenant', workspace.label, workspace.hint],
        onSelect: () => setActiveWorkspaceId(workspace.id),
      })),
      ...DENSITY_OPTIONS.map(option => ({
        key: `density:${option.value}`,
        section: 'action' as const,
        label: t('sparkery.saas.actions.setDensity', {
          defaultValue: 'Set Density',
        }),
        hint: option.label,
        keywords: ['density', 'spacing', 'compact', option.label],
        onSelect: () => setDensityMode(option.value),
      })),
      ...THEME_OPTIONS.map(option => ({
        key: `theme:${option.value}`,
        section: 'action' as const,
        label: t('sparkery.saas.actions.setTheme', {
          defaultValue: 'Set Theme',
        }),
        hint: option.label,
        keywords: ['theme', 'color', 'appearance', option.label],
        onSelect: () => setThemeMode(option.value),
      })),
      {
        key: 'demo-unread-current',
        section: 'action',
        label: t('sparkery.saas.actions.simulateUnread', {
          defaultValue: 'Simulate Unread +1',
        }),
        hint: selectedItem?.label || selectedKey,
        keywords: ['unread', 'badge', 'notification', 'count'],
        onSelect: () => {
          setNavUnreadByModule(prev => ({
            ...prev,
            [selectedKey]: (prev[selectedKey] || 0) + 1,
          }));
        },
      },
      {
        key: 'clear-unread',
        section: 'action',
        label: t('sparkery.saas.actions.clearUnread', {
          defaultValue: 'Clear All Unread',
        }),
        hint: 'Unread',
        keywords: ['unread', 'clear', 'badge', 'reset'],
        onSelect: () => setNavUnreadByModule({}),
      },
      {
        key: 'open-alert-center',
        section: 'action',
        label: t('sparkery.saas.actions.alertCenter', {
          defaultValue: 'Alert Center',
        }),
        hint: `${unreadAlertCount} unread`,
        keywords: ['alert', 'warning', 'error', 'blocker'],
        onSelect: () => setAlertCenterOpen(true),
      },
      {
        key: 'open-activity-timeline',
        section: 'action',
        label: t('sparkery.saas.actions.activityTimeline', {
          defaultValue: 'Activity Timeline',
        }),
        hint: t('sparkery.saas.labels.recentUpdates', {
          defaultValue: 'Recent updates',
        }),
        keywords: ['activity', 'timeline', 'recent', 'history'],
        onSelect: () => setActivityDrawerOpen(true),
      },
      {
        key: 'open-release-notes',
        section: 'action',
        label: t('sparkery.saas.actions.releaseNotes', {
          defaultValue: 'Release Notes',
        }),
        hint: RELEASE_NOTES[0]?.version || 'latest',
        keywords: ['release', 'notes', 'changelog', 'updates'],
        onSelect: () => setReleaseNotesOpen(true),
      },
      {
        key: 'mark-all-alerts-read',
        section: 'action',
        label: t('sparkery.saas.actions.markAllAlertsRead', {
          defaultValue: 'Mark All Alerts Read',
        }),
        hint: 'Alert Center',
        keywords: ['alerts', 'read', 'ack', 'clear'],
        onSelect: () => markAllAlertsRead(),
      },
      {
        key: 'switch-language',
        section: 'action',
        label: t('sparkery.saas.actions.switchLanguage', {
          defaultValue: 'Switch Language',
        }),
        hint: i18n.language.startsWith('zh') ? 'EN' : '中文',
        keywords: ['language', 'switch', 'locale', '中文', 'english'],
        onSelect: () =>
          changeLanguage(i18n.language.startsWith('zh') ? 'en-US' : 'zh-CN'),
      },
      {
        key: 'logout',
        section: 'action',
        label: t('sparkery.saas.logout', {
          defaultValue: 'Sign out',
        }),
        hint: 'Auth',
        keywords: ['logout', 'sign out', 'auth'],
        onSelect: () => handleLogout(),
      },
    ],
    [
      executeModuleNavigation,
      handleLogout,
      i18n.language,
      markAllAlertsRead,
      navItems,
      selectedItem?.label,
      selectedKey,
      t,
      unreadAlertCount,
    ]
  );

  const filteredCommandActions = useMemo(() => {
    const query = commandQuery.trim().toLowerCase();
    if (!query) {
      return commandActions.slice(0, 18);
    }
    return commandActions
      .filter(action =>
        [action.label, action.hint, ...action.keywords].some(value =>
          value.toLowerCase().includes(query)
        )
      )
      .slice(0, 24);
  }, [commandActions, commandQuery]);

  const commandSections = useMemo(
    () => [
      {
        key: 'module',
        label: t('sparkery.saas.command.modules', {
          defaultValue: 'Modules',
        }),
        items: filteredCommandActions.filter(action => action.section === 'module'),
      },
      {
        key: 'action',
        label: t('sparkery.saas.command.actions', {
          defaultValue: 'Actions',
        }),
        items: filteredCommandActions.filter(action => action.section === 'action'),
      },
    ],
    [filteredCommandActions, t]
  );

  const pageTitle =
    navItems.find(item => item.key === selectedKey)?.label ||
    t('sparkery.saas.title', { defaultValue: 'Sparkery' });

  const initials = (auth.user?.username || auth.user?.email || 'U')
    .slice(0, 2)
    .toUpperCase();

  const breadcrumbItems = useMemo(
    () =>
      selectedItem
        ? [
            {
              title: selectedItem.parentLabel,
            },
            {
              title: selectedItem.label,
            },
          ]
        : [],
    [selectedItem]
  );

  const filteredModuleQuickSwitch = useMemo(() => {
    const query = moduleSearchQuery.trim().toLowerCase();
    const source =
      query.length === 0
        ? navItems
        : navItems.filter(item =>
            [item.label, item.parentLabel, item.description].some(value =>
              value.toLowerCase().includes(query)
            )
          );
    return source.slice(0, 10);
  }, [moduleSearchQuery, navItems]);

  const runCommandAction = useCallback(
    async (action: CommandAction) => {
      await action.onSelect();
      setCommandPaletteOpen(false);
      setCommandQuery('');
    },
    []
  );

  return (
    <Layout className='sparkery-saas-layout'>
      <Sider
        className='sparkery-saas-sider'
        width={240}
        collapsed={collapsed}
        collapsedWidth={80}
        trigger={null}
      >
        <div className='sparkery-saas-brand'>
          <div className='sparkery-saas-brand-mark'>S</div>
          {!collapsed && (
            <div>
              <Title level={5} className='sparkery-saas-brand-title'>
                Sparkery
              </Title>
              <Text type='secondary' className='sparkery-saas-brand-subtitle'>
                {t('sparkery.saas.brandSubtitle', {
                  defaultValue: 'Operations SaaS',
                })}
              </Text>
            </div>
          )}
        </div>
        <Menu
          mode='inline'
          selectedKeys={[selectedKey]}
          openKeys={openKeys}
          onOpenChange={keys => setOpenKeys(keys as string[])}
          className='sparkery-saas-menu'
          items={menuItems}
        />
      </Sider>

      <Layout className='sparkery-saas-main'>
        <Header className='sparkery-saas-header'>
          <Space size={12} className='sparkery-saas-header-left' wrap>
            <Button
              type='text'
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(value => !value)}
              aria-label='Toggle navigation'
            />
            <div className='sparkery-saas-title-wrap'>
              <Title level={4} className='sparkery-saas-page-title'>
                {pageTitle}
              </Title>
              {breadcrumbItems.length > 0 ? (
                <Breadcrumb
                  className='sparkery-saas-breadcrumb'
                  items={breadcrumbItems}
                />
              ) : null}
              <Text type='secondary'>
                {pageSummary}
              </Text>
            </div>
            <Select<string>
              showSearch
              value={null}
              className='sparkery-saas-module-switch'
              placeholder={t('sparkery.saas.placeholders.jumpToModule', {
                defaultValue: 'Jump to module',
              })}
              filterOption={false}
              onSearch={setModuleSearchQuery}
              onClear={() => setModuleSearchQuery('')}
              onBlur={() => setModuleSearchQuery('')}
              onSelect={value => {
                if (typeof value === 'string') {
                  executeModuleNavigation(value);
                }
              }}
              allowClear
              options={filteredModuleQuickSwitch.map(item => ({
                value: item.key,
                label: `${item.label} · ${item.parentLabel}`,
                title: item.description,
              }))}
              notFoundContent={t('sparkery.saas.empty.noModulesFound', {
                defaultValue: 'No modules found',
              })}
              suffixIcon={<SearchOutlined />}
            />
            {selectedItem ? (
              <Tooltip
                title={
                  favoriteModuleKeys.includes(selectedItem.key)
                    ? t('sparkery.saas.actions.removeFavorite', {
                        defaultValue: 'Remove from favorites',
                      })
                    : t('sparkery.saas.actions.addFavorite', {
                        defaultValue: 'Add to favorites',
                      })
                }
              >
                <Button
                  type='text'
                  icon={
                    favoriteModuleKeys.includes(selectedItem.key) ? (
                      <StarFilled />
                    ) : (
                      <StarOutlined />
                    )
                  }
                  onClick={() => toggleFavoriteModule(selectedItem.key)}
                />
              </Tooltip>
            ) : null}
            {selectedItem ? (
              <Tooltip
                title={
                  pinnedModuleKeys.includes(selectedItem.key)
                    ? t('sparkery.saas.actions.unpinModule', {
                        defaultValue: 'Unpin module',
                      })
                    : t('sparkery.saas.actions.pinModule', {
                        defaultValue: 'Pin module',
                      })
                }
              >
                <Button
                  type='text'
                  icon={
                    pinnedModuleKeys.includes(selectedItem.key) ? (
                      <PushpinFilled />
                    ) : (
                      <PushpinOutlined />
                    )
                  }
                  onClick={() => togglePinnedModule(selectedItem.key)}
                />
              </Tooltip>
            ) : null}
            <Button
              icon={<ThunderboltOutlined />}
              onClick={() => {
                setCommandPaletteOpen(true);
                setCommandQuery('');
              }}
            >
              {t('sparkery.saas.actions.commandPalette', {
                defaultValue: 'Command',
              })}
            </Button>
            <Button
              type='primary'
              icon={modulePrimaryAction.icon}
              onClick={modulePrimaryAction.onClick}
              className='sparkery-saas-header-primary-action'
            >
              {modulePrimaryAction.label}
            </Button>
          </Space>

          <Space size={12} className='sparkery-saas-header-right' wrap>
            <Badge count={unreadAlertCount} size='small' overflowCount={99}>
              <Button
                icon={<AlertOutlined />}
                onClick={() => setAlertCenterOpen(true)}
              >
                {t('sparkery.saas.actions.alertCenter', {
                  defaultValue: 'Alerts',
                })}
              </Button>
            </Badge>
            <Button icon={<HistoryOutlined />} onClick={() => setActivityDrawerOpen(true)}>
              {t('sparkery.saas.actions.activityTimeline', {
                defaultValue: 'Activity',
              })}
            </Button>
            <Select<string>
              value={activeWorkspace.id}
              className='sparkery-saas-workspace-switch'
              options={WORKSPACE_OPTIONS.map(workspace => ({
                value: workspace.id,
                label: `${workspace.label} · ${workspace.hint}`,
              }))}
              onChange={value => setActiveWorkspaceId(value)}
            />
            <Select<DensityMode>
              value={densityMode}
              className='sparkery-saas-density-switch'
              options={DENSITY_OPTIONS.map(option => ({
                value: option.value,
                label: option.label,
              }))}
              onChange={value => setDensityMode(value)}
            />
            <Select<ThemeMode>
              value={themeMode}
              className='sparkery-saas-theme-switch'
              options={THEME_OPTIONS.map(option => ({
                value: option.value,
                label: option.label,
              }))}
              onChange={value => setThemeMode(value)}
            />
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'switch-language',
                    icon: <GlobalOutlined />,
                    label: t('sparkery.saas.actions.switchLanguage', {
                      defaultValue: 'Switch Language',
                    }),
                    onClick: () =>
                      changeLanguage(
                        i18n.language.startsWith('zh') ? 'en-US' : 'zh-CN'
                      ),
                  },
                  {
                    key: 'open-command',
                    icon: <ThunderboltOutlined />,
                    label: t('sparkery.saas.actions.commandPalette', {
                      defaultValue: 'Command Palette',
                    }),
                    onClick: () => {
                      setCommandPaletteOpen(true);
                      setCommandQuery('');
                    },
                  },
                  {
                    key: 'open-release-notes',
                    icon: <FileTextOutlined />,
                    label: t('sparkery.saas.actions.releaseNotes', {
                      defaultValue: 'Release Notes',
                    }),
                    onClick: () => setReleaseNotesOpen(true),
                  },
                  {
                    key: 'mark-alerts-read',
                    icon: <CheckCircleOutlined />,
                    label: t('sparkery.saas.actions.markAllAlertsRead', {
                      defaultValue: 'Mark All Alerts Read',
                    }),
                    onClick: () => markAllAlertsRead(),
                  },
                ],
              }}
              trigger={['click']}
            >
              <Button icon={<MoreOutlined />}>
                {t('sparkery.saas.actions.more', {
                  defaultValue: 'More',
                })}
              </Button>
            </Dropdown>

            <Dropdown
              menu={{
                items: [
                  {
                    key: 'logout',
                    icon: <LogoutOutlined />,
                    label: t('sparkery.saas.logout', {
                      defaultValue: 'Sign out',
                    }),
                    onClick: () => {
                      void handleLogout();
                    },
                  },
                ],
              }}
            >
              <Button className='sparkery-saas-user-trigger'>
                <Space>
                  <Avatar size='small'>{initials}</Avatar>
                  <span>{auth.user?.username || auth.user?.email}</span>
                </Space>
              </Button>
            </Dropdown>

            <Tag
              color={getRoleTagColor(auth.user?.role)}
              className='sparkery-saas-chip sparkery-saas-chip--neutral'
            >
              {(auth.user?.role || 'user').toUpperCase()}
            </Tag>
          </Space>
        </Header>

        {!isOnline ? (
          <div className='sparkery-saas-connection-banner sparkery-saas-connection-banner-offline' role='status' aria-live='polite'>
            {t('sparkery.saas.connection.offline', {
              defaultValue: 'Offline mode: changes may not sync until connection is restored.',
            })}
          </div>
        ) : reconnectedAt ? (
          <div className='sparkery-saas-connection-banner sparkery-saas-connection-banner-online' role='status' aria-live='polite'>
            {t('sparkery.saas.connection.reconnected', {
              defaultValue: 'Connection restored. Sync resumed.',
            })}
          </div>
        ) : null}

        <Content className='sparkery-saas-content'>
          <Outlet />
        </Content>
      </Layout>
      <Modal
        title={t('sparkery.saas.actions.commandPalette', {
          defaultValue: 'Command Palette',
        })}
        open={commandPaletteOpen}
        onCancel={() => setCommandPaletteOpen(false)}
        footer={null}
      >
        <Space direction='vertical' className='sparkery-saas-command-panel'>
          <Input
            autoFocus
            prefix={<SearchOutlined />}
            value={commandQuery}
            placeholder={t('sparkery.saas.placeholders.searchCommand', {
              defaultValue: 'Search command...',
            })}
            onChange={event => setCommandQuery(event.target.value)}
          />
          <div className='sparkery-saas-command-list'>
            {filteredCommandActions.length > 0 ? (
              commandSections.map(section =>
                section.items.length > 0 ? (
                  <div key={section.key} className='sparkery-saas-command-section'>
                    <Text className='sparkery-saas-command-section-title'>
                      {section.label}
                    </Text>
                    {section.items.map(action => (
                      <Button
                        key={action.key}
                        type='text'
                        className='sparkery-saas-command-item'
                        onClick={() => {
                          void runCommandAction(action);
                        }}
                      >
                        <span>{action.label}</span>
                        <span className='sparkery-saas-command-hint'>
                          {action.hint}
                        </span>
                      </Button>
                    ))}
                  </div>
                ) : null
              )
            ) : (
              <SparkeryEmptyState
                title={t('sparkery.saas.empty.noCommandsTitle', {
                  defaultValue: 'No commands found',
                })}
                description={t('sparkery.saas.empty.noCommands', {
                  defaultValue: 'Try another keyword or switch section.',
                })}
                actionLabel={t('sparkery.saas.actions.clearSearch', {
                  defaultValue: 'Clear Search',
                })}
                onAction={() => setCommandQuery('')}
              />
            )}
          </div>
        </Space>
      </Modal>
      <Drawer
        title={t('sparkery.saas.actions.alertCenter', {
          defaultValue: 'Alert Center',
        })}
        width={460}
        open={alertCenterOpen}
        onClose={() => setAlertCenterOpen(false)}
        extra={
          <Button type='link' size='small' onClick={markAllAlertsRead}>
            {t('sparkery.saas.actions.markAllAlertsRead', {
              defaultValue: 'Mark All Read',
            })}
          </Button>
        }
      >
        <Space direction='vertical' className='sparkery-saas-drawer-stack'>
          <Segmented<AlertFilterMode>
            block
            value={alertFilterMode}
            options={[
              {
                label: t('sparkery.saas.filters.all', { defaultValue: 'All' }),
                value: 'all',
              },
              {
                label: t('sparkery.saas.filters.unread', { defaultValue: 'Unread' }),
                value: 'unread',
              },
              {
                label: t('sparkery.saas.filters.warning', { defaultValue: 'Warning' }),
                value: 'warning',
              },
              {
                label: t('sparkery.saas.filters.error', { defaultValue: 'Error' }),
                value: 'error',
              },
            ]}
            onChange={value => setAlertFilterMode(value as AlertFilterMode)}
          />

          <List
            dataSource={filteredAlerts}
            locale={{
              emptyText: t('sparkery.saas.empty.noAlerts', {
                defaultValue: 'No alerts in this filter',
              }),
            }}
            renderItem={alert => (
              <List.Item
                actions={[
                  <Button key={`alert-read-${alert.id}`} size='small' type='link' onClick={() => markAlertRead(alert.id)}>
                    {t('sparkery.saas.actions.markRead', { defaultValue: 'Mark Read' })}
                  </Button>,
                  <Button
                    key={`alert-copy-${alert.id}`}
                    size='small'
                    type='link'
                    icon={<CopyOutlined />}
                    onClick={() => {
                      void copyAlertDetails(alert);
                    }}
                  >
                    {t('sparkery.saas.actions.copyDetails', { defaultValue: 'Copy Details' })}
                  </Button>,
                ]}
              >
                <Space direction='vertical' size={2}>
                  <Space size={8}>
                    {alert.severity === 'error' ? (
                      <ExclamationCircleOutlined className='sparkery-saas-alert-icon sparkery-saas-alert-icon-error' />
                    ) : alert.severity === 'warning' ? (
                      <ExclamationCircleOutlined className='sparkery-saas-alert-icon sparkery-saas-alert-icon-warning' />
                    ) : (
                      <CheckCircleOutlined className='sparkery-saas-alert-icon sparkery-saas-alert-icon-info' />
                    )}
                    <Text strong={!alert.isRead}>{alert.title}</Text>
                    {!alert.isRead ? (
                      <Tag color='blue'>
                        {t('sparkery.saas.labels.unread', { defaultValue: 'Unread' })}
                      </Tag>
                    ) : null}
                  </Space>
                  <Text type='secondary'>{alert.details}</Text>
                  <Text type='secondary'>{formatMinutesAgo(alert.createdAt)}</Text>
                </Space>
              </List.Item>
            )}
          />
        </Space>
      </Drawer>

      <Drawer
        title={t('sparkery.saas.actions.activityTimeline', {
          defaultValue: 'Activity Timeline',
        })}
        width={460}
        open={activityDrawerOpen}
        onClose={() => setActivityDrawerOpen(false)}
      >
        <Timeline
          items={activities.slice(0, 30).map(activity => ({
            dot: <ClockCircleOutlined />,
            children: (
              <Space direction='vertical' size={0}>
                <Text>{activity.summary}</Text>
                <Text type='secondary'>{formatMinutesAgo(activity.createdAt)}</Text>
              </Space>
            ),
          }))}
        />
      </Drawer>

      <Drawer
        title={t('sparkery.saas.actions.releaseNotes', {
          defaultValue: 'Release Notes',
        })}
        width={460}
        open={releaseNotesOpen}
        onClose={() => setReleaseNotesOpen(false)}
      >
        <List
          dataSource={RELEASE_NOTES}
          renderItem={release => (
            <List.Item>
              <Space direction='vertical' size={2}>
                <Space>
                  <Tag color='processing'>{release.version}</Tag>
                  <Text type='secondary'>{release.publishedAt}</Text>
                </Space>
                <Text strong>{release.title}</Text>
                <Text type='secondary'>{release.summary}</Text>
              </Space>
            </List.Item>
          )}
        />
      </Drawer>
    </Layout>
  );
};

export default SparkerySaasLayout;
