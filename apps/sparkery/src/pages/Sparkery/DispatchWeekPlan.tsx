import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Empty,
  List,
  Row,
  Space,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import dayjs from 'dayjs';
import {
  BASE_ROOM_SECTIONS,
  getActiveSections,
  getDefaultChecklistForSection,
  type CleaningInspection,
  type Employee as InspectionEmployee,
  type PropertyTemplate,
  type RoomSection,
} from '@/pages/CleaningInspection/types';
import { buildInspectionShareUrl } from '@/pages/CleaningInspection/shareLink';
import type {
  DispatchCustomerProfile,
  DispatchEmployee,
  DispatchJob,
} from './dispatch/types';
import { sparkeryDispatchService } from '@/services/sparkeryDispatchService';
import {
  buildGoogleNavigationUrl,
  estimateTravel,
  geocodeAddress,
} from '@/services/googleMapsService';
import {
  loadPropertyTemplates,
  submitInspection,
} from '@/services/inspectionService';
import { shortenUrlIfConfigured } from '@/services/urlShortenerService';
import { trackSparkeryEvent } from '@/services/sparkeryTelemetry';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import {
  buildDispatchJobLinkUrl,
  parseDispatchJobIdsFromParams,
  type DispatchJobIdsSource,
  type ParsedDispatchJobIds,
} from './dispatch/weeklyPlanLink';
import './sparkery.css';

const { Title, Text } = Typography;
const GEO_CACHE_STORAGE_KEY = 'sparkery_dispatch_geocode_cache_v1';
const INITIAL_JOB_RENDER_LIMIT = 8;
const JOB_RENDER_INCREMENT = 8;

interface RouteStep {
  jobId: string;
  distanceText: string;
  durationText: string;
  navigationUrl: string;
  fromAddress: string;
  toAddress: string;
}

interface RouteResult {
  steps: RouteStep[];
  totalDistanceKm: number;
  totalDurationMin: number;
  nextCommuteDistanceText: string;
  nextCommuteDurationText: string;
  overviewNavigationUrl: string;
}

type RouteResultByDate = Record<string, RouteResult>;
type RouteErrorByDate = Record<string, string>;

interface QueryPayload {
  employeeId: string;
  jobIds: string[];
  weekStart: string;
  weekEnd: string;
  source: DispatchJobIdsSource;
  compact: ParsedDispatchJobIds['compact'];
}

interface TemplateMatchResult {
  template?: PropertyTemplate;
  score: number;
  strategy: string;
  details: string;
  jobAddressKey: string | undefined;
  profileAddressKey: string | undefined;
  matchedTemplateAddressKey: string | undefined;
}

interface AddressCore {
  number: string;
  streetName: string;
  key: string;
}

interface AddressMatchScore {
  score: number;
  sourceKey: string | undefined;
  targetKey: string | undefined;
}

interface GeocodeCacheRecord {
  lat: number;
  lng: number;
  updatedAt: string;
}

type Translator = TFunction;

type GeoPoint = {
  lat: number;
  lng: number;
};

type WeekPlanRuntimeWindow = Window & {
  __WENDEAL_APP_VERSION__?: unknown;
  __WENDEAL_RUNTIME_CONFIG__?: {
    appVersion?: unknown;
    appCommit?: unknown;
  };
};

const toNonEmptyDisplayText = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const resolveWeekPlanBuildMeta = (
  fallbackValue: string
): { version: string; commit: string } | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const runtime = window as WeekPlanRuntimeWindow;
  const runtimeConfig = runtime.__WENDEAL_RUNTIME_CONFIG__;
  const version =
    toNonEmptyDisplayText(runtimeConfig?.appVersion) ||
    toNonEmptyDisplayText(runtime.__WENDEAL_APP_VERSION__) ||
    fallbackValue;
  const fullCommit =
    toNonEmptyDisplayText(runtimeConfig?.appCommit) || fallbackValue;
  const commit =
    fullCommit === fallbackValue ? fallbackValue : fullCommit.slice(0, 10);

  return {
    version,
    commit,
  };
};

const normalizeAddressKey = (value: string): string =>
  value.trim().toLowerCase();

const STREET_TYPE_TOKENS = new Set<string>([
  'street',
  'st',
  'road',
  'rd',
  'avenue',
  'ave',
  'av',
  'drive',
  'dr',
  'boulevard',
  'blvd',
  'court',
  'ct',
  'lane',
  'ln',
  'place',
  'pl',
  'terrace',
  'tce',
  'close',
  'cl',
  'crescent',
  'cres',
  'parade',
  'pde',
  'way',
  'highway',
  'hwy',
]);

const ADDRESS_TAIL_STOP_TOKENS = new Set<string>([
  'au',
  'australia',
  'qld',
  'nsw',
  'vic',
  'wa',
  'sa',
  'tas',
  'nt',
  'act',
]);

const UNIT_PREFIX_TOKENS = new Set<string>([
  'unit',
  'apt',
  'apartment',
  'suite',
  'flat',
  'level',
  'lvl',
  'u',
]);

const normalizeTextLoose = (value?: string): string =>
  (value || '')
    .trim()
    .toLowerCase()
    .replace(/[.,#]/g, ' ')
    .replace(/[^\S\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const toCompactText = (value: string): string => value.replace(/\s+/g, '');
const splitAddressTokens = (value?: string): string[] => {
  const normalized = normalizeTextLoose(value);
  if (!normalized) {
    return [];
  }
  return normalized.split(' ').filter(Boolean);
};
const normalizeWordToken = (value: string): string =>
  value.toLowerCase().replace(/[^a-z]/g, '');
const extractStreetNumber = (token: string): string | null => {
  if (!token) {
    return null;
  }
  let candidate = token.toLowerCase();
  if (candidate.includes('/')) {
    const segments = candidate.split('/').filter(Boolean);
    candidate = segments[segments.length - 1] || candidate;
  }
  if (candidate.includes('-')) {
    const segments = candidate.split('-').filter(Boolean);
    candidate = segments[0] || candidate;
  }
  candidate = candidate.replace(/[^a-z0-9]/g, '');
  if (!candidate) {
    return null;
  }
  const match = candidate.match(/^\d+[a-z]?/);
  if (match?.[0]) {
    return match[0];
  }
  const fallback = candidate.match(/\d+[a-z]?/);
  return fallback?.[0] || null;
};
const extractAddressCore = (value?: string): AddressCore | null => {
  const tokens = splitAddressTokens(value);
  if (tokens.length === 0) {
    return null;
  }
  let numberIndex = -1;
  let number = '';
  for (let index = 0; index < tokens.length; index += 1) {
    const currentTokenWord = normalizeWordToken(tokens[index]!);
    if (UNIT_PREFIX_TOKENS.has(currentTokenWord)) {
      continue;
    }

    const previousTokenWord =
      index > 0 ? normalizeWordToken(tokens[index - 1]!) : '';
    if (UNIT_PREFIX_TOKENS.has(previousTokenWord)) {
      continue;
    }

    const resolved = extractStreetNumber(tokens[index]!);
    if (resolved) {
      numberIndex = index;
      number = resolved;
      break;
    }
  }
  if (numberIndex < 0 || !number) {
    return null;
  }
  const streetNameTokens: string[] = [];
  for (let index = numberIndex + 1; index < tokens.length; index += 1) {
    const rawToken = tokens[index]!;
    if (extractStreetNumber(rawToken)) {
      break;
    }
    const token = normalizeWordToken(rawToken);
    if (!token) {
      continue;
    }
    if (ADDRESS_TAIL_STOP_TOKENS.has(token)) {
      break;
    }
    if (STREET_TYPE_TOKENS.has(token) && streetNameTokens.length > 0) {
      break;
    }
    streetNameTokens.push(token);
    if (streetNameTokens.length >= 4) {
      break;
    }
  }
  if (streetNameTokens.length === 0) {
    return null;
  }
  const streetName = streetNameTokens.join('-');
  return {
    number,
    streetName,
    key: `${number}-${streetName}`,
  };
};

const scoreAddressMatch = (
  sourceAddress?: string,
  targetAddress?: string
): AddressMatchScore => {
  const sourceCore = extractAddressCore(sourceAddress);
  const targetCore = extractAddressCore(targetAddress);
  if (!sourceCore || !targetCore) {
    return {
      score: 0,
      sourceKey: sourceCore?.key,
      targetKey: targetCore?.key,
    };
  }
  if (sourceCore.key === targetCore.key) {
    return {
      score: 1,
      sourceKey: sourceCore.key,
      targetKey: targetCore.key,
    };
  }
  if (
    sourceCore.number === targetCore.number &&
    (sourceCore.streetName.includes(targetCore.streetName) ||
      targetCore.streetName.includes(sourceCore.streetName))
  ) {
    return {
      score: 0.95,
      sourceKey: sourceCore.key,
      targetKey: targetCore.key,
    };
  }
  return {
    score: 0,
    sourceKey: sourceCore.key,
    targetKey: targetCore.key,
  };
};

const scoreNameMatch = (sourceName?: string, targetName?: string): number => {
  const source = toCompactText(normalizeTextLoose(sourceName));
  const target = toCompactText(normalizeTextLoose(targetName));
  if (!source || !target) {
    return 0;
  }
  if (source === target) {
    return 0.8;
  }
  const minLen = Math.min(source.length, target.length);
  if (minLen >= 4 && (source.includes(target) || target.includes(source))) {
    return 0.72;
  }
  return 0;
};

const parseQueryPayload = (): QueryPayload => {
  const params = new URLSearchParams(window.location.search);
  const employeeId = (params.get('employeeId') || '').trim();
  const weekStart =
    (params.get('weekStart') || '').trim() || dayjs().format('YYYY-MM-DD');
  const weekEnd =
    (params.get('weekEnd') || '').trim() ||
    dayjs(weekStart).add(6, 'day').format('YYYY-MM-DD');
  const parsedJobIds = parseDispatchJobIdsFromParams(params, {
    employeeId,
    weekStart,
    weekEnd,
  });

  return {
    employeeId,
    jobIds: parsedJobIds.jobIds,
    weekStart,
    weekEnd,
    source: parsedJobIds.source,
    compact: parsedJobIds.compact,
  };
};

const resolveMonday = (dateText: string): dayjs.Dayjs => {
  const parsed = dayjs(dateText);
  const base = parsed.isValid()
    ? parsed.startOf('day')
    : dayjs().startOf('day');
  const weekday = base.day();
  const offsetToMonday = weekday === 0 ? -6 : 1 - weekday;
  return base.add(offsetToMonday, 'day');
};

const compareJobsBySchedule = (a: DispatchJob, b: DispatchJob): number => {
  if (a.scheduledDate !== b.scheduledDate) {
    return a.scheduledDate.localeCompare(b.scheduledDate);
  }
  if (a.scheduledStartTime !== b.scheduledStartTime) {
    return a.scheduledStartTime.localeCompare(b.scheduledStartTime);
  }
  return a.id.localeCompare(b.id);
};

const isExecutableDispatchJob = (status: DispatchJob['status']): boolean =>
  status !== 'completed' && status !== 'cancelled';

const loadGeocodeCache = (): Record<string, GeocodeCacheRecord> => {
  const raw = localStorage.getItem(GEO_CACHE_STORAGE_KEY);
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, GeocodeCacheRecord>;
    const normalized: Record<string, GeocodeCacheRecord> = {};
    Object.entries(parsed).forEach(([address, value]) => {
      if (!value || typeof value !== 'object') {
        return;
      }
      const lat = Number(value.lat);
      const lng = Number(value.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
      }
      normalized[address] = {
        lat,
        lng,
        updatedAt: value.updatedAt || new Date().toISOString(),
      };
    });
    return normalized;
  } catch {
    return {};
  }
};

const saveGeocodeCache = (cache: Record<string, GeocodeCacheRecord>): void => {
  localStorage.setItem(GEO_CACHE_STORAGE_KEY, JSON.stringify(cache));
};

const toInspectionEmployee = (
  employee: DispatchEmployee
): InspectionEmployee => {
  const hasChineseName = Boolean(employee.nameCN?.trim());
  const result: InspectionEmployee = {
    id: employee.id,
    name: hasChineseName ? employee.nameCN!.trim() : employee.name,
  };
  if (hasChineseName) {
    result.nameEn = employee.name;
  }
  if (employee.phone?.trim()) {
    result.phone = employee.phone.trim();
  }
  return result;
};

const buildSectionsFromTemplate = (
  template: PropertyTemplate
): RoomSection[] => {
  const defaultSectionIds = BASE_ROOM_SECTIONS.map(section => section.id);
  const activeSectionIds =
    Array.isArray(template.sections) && template.sections.length > 0
      ? template.sections
      : defaultSectionIds;
  const sectionDefs = getActiveSections(activeSectionIds);

  return sectionDefs.map(sectionDef => {
    const sourceChecklist = template.checklists?.[sectionDef.id];
    const checklist =
      Array.isArray(sourceChecklist) && sourceChecklist.length > 0
        ? sourceChecklist.map((item, index) => {
            const checklistItem: {
              id: string;
              label: string;
              checked: boolean;
              requiredPhoto: boolean;
              labelEn?: string;
            } = {
              id: `${sectionDef.id}-item-${index}`,
              label: item.label,
              checked: false,
              requiredPhoto: item.requiredPhoto || false,
            };
            if (item.labelEn) {
              checklistItem.labelEn = item.labelEn;
            }
            return checklistItem;
          })
        : getDefaultChecklistForSection(sectionDef.id);

    return {
      ...sectionDef,
      referenceImages: template.referenceImages?.[sectionDef.id] || [],
      photos: [],
      notes: '',
      checklist,
    };
  });
};

const findMatchingTemplate = (
  job: DispatchJob,
  templates: PropertyTemplate[],
  t: Translator,
  profile?: DispatchCustomerProfile
): TemplateMatchResult => {
  const jobAddressKey = extractAddressCore(job.customerAddress)?.key;
  const profileAddressKey = extractAddressCore(profile?.address)?.key;
  const naText = t('sparkery.dispatch.weekPlan.common.na');

  if (templates.length === 0) {
    return {
      score: 0,
      strategy: t('sparkery.dispatch.weekPlan.templateMatch.strategy.none'),
      details: t(
        'sparkery.dispatch.weekPlan.templateMatch.details.noTemplates'
      ),
      jobAddressKey,
      profileAddressKey,
      matchedTemplateAddressKey: undefined,
    };
  }

  const candidates = templates
    .map(template => {
      const byJobAddress = scoreAddressMatch(
        job.customerAddress,
        template.address
      );
      const byProfileAddress = scoreAddressMatch(
        profile?.address,
        template.address
      );

      const addressChecks = [
        {
          score: byJobAddress.score,
          strategy: t(
            'sparkery.dispatch.weekPlan.templateMatch.strategy.jobAddressToTemplate'
          ),
          sourceKey: byJobAddress.sourceKey,
          targetKey: byJobAddress.targetKey,
        },
        {
          score: byProfileAddress.score,
          strategy: t(
            'sparkery.dispatch.weekPlan.templateMatch.strategy.profileAddressToTemplate'
          ),
          sourceKey: byProfileAddress.sourceKey,
          targetKey: byProfileAddress.targetKey,
        },
      ];

      const bestAddressCheck = addressChecks.reduce(
        (best, current) => (current.score > best.score ? current : best),
        {
          score: 0,
          strategy: t('sparkery.dispatch.weekPlan.templateMatch.strategy.none'),
          sourceKey: undefined as string | undefined,
          targetKey: undefined as string | undefined,
        }
      );

      const nameChecks = [
        {
          score: scoreNameMatch(job.customerName, template.name),
          strategy: t(
            'sparkery.dispatch.weekPlan.templateMatch.strategy.jobNameToTemplate'
          ),
        },
        {
          score: scoreNameMatch(profile?.name, template.name),
          strategy: t(
            'sparkery.dispatch.weekPlan.templateMatch.strategy.profileNameToTemplate'
          ),
        },
      ];

      const bestNameCheck = nameChecks.reduce(
        (best, current) => (current.score > best.score ? current : best),
        {
          score: 0,
          strategy: t('sparkery.dispatch.weekPlan.templateMatch.strategy.none'),
        }
      );

      const score =
        bestAddressCheck.score > 0
          ? 10 + bestAddressCheck.score
          : bestNameCheck.score;

      const templateAddressKey = extractAddressCore(template.address)?.key;

      return {
        template,
        score,
        strategy:
          bestAddressCheck.score > 0
            ? bestAddressCheck.strategy
            : bestNameCheck.strategy,
        addressScore: bestAddressCheck.score,
        nameScore: bestNameCheck.score,
        sourceKey: bestAddressCheck.sourceKey,
        targetKey: bestAddressCheck.targetKey,
        templateAddressKey,
      };
    })
    .sort((a, b) => b.score - a.score);

  const best = candidates[0];
  if (!best) {
    return {
      score: 0,
      strategy: t(
        'sparkery.dispatch.weekPlan.templateMatch.strategy.unmatched'
      ),
      details: t(
        'sparkery.dispatch.weekPlan.templateMatch.details.noTemplateMatch'
      ),
      jobAddressKey,
      profileAddressKey,
      matchedTemplateAddressKey: undefined,
    };
  }

  if (best.addressScore > 0) {
    const sameAddressMatches = candidates.filter(
      candidate => candidate.addressScore > 0
    );

    if (sameAddressMatches.length > 1) {
      return {
        score: best.score,
        strategy: t(
          'sparkery.dispatch.weekPlan.templateMatch.strategy.ambiguousAddressCore'
        ),
        details: t(
          'sparkery.dispatch.weekPlan.templateMatch.details.ambiguousAddressCore'
        ),
        jobAddressKey,
        profileAddressKey,
        matchedTemplateAddressKey: best.templateAddressKey,
      };
    }

    return {
      template: best.template,
      score: best.score,
      strategy: best.strategy,
      details: '',
      jobAddressKey,
      profileAddressKey,
      matchedTemplateAddressKey: best.targetKey || best.templateAddressKey,
    };
  }

  if (best.nameScore >= 0.8) {
    return {
      template: best.template,
      score: best.score,
      strategy: best.strategy,
      details: t(
        'sparkery.dispatch.weekPlan.templateMatch.details.fallbackByName'
      ),
      jobAddressKey,
      profileAddressKey,
      matchedTemplateAddressKey: best.templateAddressKey,
    };
  }

  const templateKeyPreview = templates
    .slice(0, 3)
    .map(template => {
      const key = extractAddressCore(template.address)?.key || naText;
      return t('sparkery.dispatch.weekPlan.templateMatch.previewItem', {
        name: template.name,
        key,
      });
    })
    .join(' | ');

  return {
    score: best.score,
    strategy: t('sparkery.dispatch.weekPlan.templateMatch.strategy.unmatched'),
    details: t(
      'sparkery.dispatch.weekPlan.templateMatch.details.noAddressCoreMatch',
      {
        jobKey: jobAddressKey || naText,
        profileKey: profileAddressKey || naText,
        templateKeys: templateKeyPreview,
      }
    ),
    jobAddressKey,
    profileAddressKey,
    matchedTemplateAddressKey: undefined,
  };
};

const DispatchWeekPlan: React.FC = () => {
  const { t, i18n } = useTranslation();
  const queryPayload = useMemo(() => parseQueryPayload(), []);
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(true);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [employee, setEmployee] = useState<DispatchEmployee | null>(null);
  const [jobs, setJobs] = useState<DispatchJob[]>([]);
  const [customerProfiles, setCustomerProfiles] = useState<
    DispatchCustomerProfile[]
  >([]);
  const [propertyTemplates, setPropertyTemplates] = useState<
    PropertyTemplate[]
  >([]);
  const [missingJobIds, setMissingJobIds] = useState<string[]>([]);
  const [routeResultByDate, setRouteResultByDate] = useState<RouteResultByDate>(
    {}
  );
  const [routeErrorByDate, setRouteErrorByDate] = useState<RouteErrorByDate>(
    {}
  );
  const [routeGeneralError, setRouteGeneralError] = useState('');
  const [creatingInspectionJobId, setCreatingInspectionJobId] = useState<
    string | null
  >(null);
  const [inspectionLinks, setInspectionLinks] = useState<
    Record<string, string>
  >({});
  const [visibleJobsByDate, setVisibleJobsByDate] = useState<
    Record<string, number>
  >({});
  const naText = t('sparkery.dispatch.weekPlan.common.na');
  const telemetryTrackedRef = useRef({
    expired: false,
    integrity: false,
    missing: false,
    autoRepaired: false,
  });
  const buildMeta = useMemo(() => resolveWeekPlanBuildMeta(naText), [naText]);
  const hasExpiredCompactLink =
    queryPayload.compact.present && queryPayload.compact.expired;
  const hasInvalidCompactLink =
    queryPayload.compact.present &&
    (!queryPayload.compact.payloadValid ||
      !queryPayload.compact.signatureValid ||
      !queryPayload.compact.versionValid);

  const formatWeekday = useCallback(
    (dateText: string, short = false): string => {
      const parsed = dayjs(dateText);
      if (!parsed.isValid()) {
        return dateText;
      }
      return parsed.toDate().toLocaleDateString(i18n.language || 'en-US', {
        weekday: short ? 'short' : 'long',
      });
    },
    [i18n.language]
  );

  const weekDates = useMemo(() => {
    const monday = resolveMonday(queryPayload.weekStart);
    return Array.from({ length: 7 }, (_, index) =>
      monday.add(index, 'day').format('YYYY-MM-DD')
    );
  }, [queryPayload.weekStart]);

  const sortedJobs = useMemo(
    () => [...jobs].sort(compareJobsBySchedule),
    [jobs]
  );
  const sortedJobIds = useMemo(
    () => sortedJobs.map(job => job.id),
    [sortedJobs]
  );

  const jobsByDate = useMemo(() => {
    const map = new Map<string, DispatchJob[]>();
    weekDates.forEach(date => {
      map.set(date, []);
    });
    sortedJobs.forEach(job => {
      const list = map.get(job.scheduledDate);
      if (list) {
        list.push(job);
        return;
      }
      map.set(job.scheduledDate, [job]);
    });
    return map;
  }, [sortedJobs, weekDates]);

  const daySections = useMemo(() => {
    const seen = new Set<string>();
    const sections: Array<{ date: string; jobs: DispatchJob[] }> = [];

    weekDates.forEach(date => {
      sections.push({
        date,
        jobs: jobsByDate.get(date) || [],
      });
      seen.add(date);
    });

    Array.from(jobsByDate.entries())
      .filter(([date]) => !seen.has(date))
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, dateJobs]) => {
        sections.push({ date, jobs: dateJobs });
      });

    return sections;
  }, [jobsByDate, weekDates]);

  useEffect(() => {
    setVisibleJobsByDate(prev => {
      const nextVisibleCounts: Record<string, number> = {};
      daySections.forEach(section => {
        const existing = prev[section.date];
        if (typeof existing === 'number' && existing > 0) {
          nextVisibleCounts[section.date] = Math.min(
            existing,
            section.jobs.length
          );
          return;
        }
        nextVisibleCounts[section.date] = Math.min(
          INITIAL_JOB_RENDER_LIMIT,
          section.jobs.length
        );
      });
      return nextVisibleCounts;
    });
  }, [daySections]);

  const routeErrorEntries = useMemo(
    () =>
      Object.entries(routeErrorByDate)
        .filter(([, value]) => Boolean(value))
        .sort(([a], [b]) => a.localeCompare(b)),
    [routeErrorByDate]
  );

  const weeklyRouteTotals = useMemo(() => {
    const values = Object.values(routeResultByDate);
    const distanceKm = values.reduce(
      (total, item) => total + item.totalDistanceKm,
      0
    );
    const durationMin = values.reduce(
      (total, item) => total + item.totalDurationMin,
      0
    );
    return {
      distanceKm,
      durationMin,
      dayCount: values.length,
    };
  }, [routeResultByDate]);

  const displayWeekStart = weekDates[0] || queryPayload.weekStart;
  const displayWeekEnd =
    weekDates[weekDates.length - 1] || queryPayload.weekEnd;
  const buildCurrentPlanUrl = useCallback(
    (sourceJobIds?: string[]): string => {
      const employeeId = (employee?.id || queryPayload.employeeId || '').trim();
      if (employeeId) {
        return buildDispatchJobLinkUrl({
          origin: window.location.origin,
          path: '/dispatch-week-plan',
          employeeId,
          weekStart: displayWeekStart,
          weekEnd: displayWeekEnd,
          jobIds: sourceJobIds || sortedJobIds,
        });
      }
      return buildDispatchJobLinkUrl({
        origin: window.location.origin,
        path: '/dispatch-week-plan',
        employeeId: '',
        weekStart: displayWeekStart,
        weekEnd: displayWeekEnd,
        jobIds: sourceJobIds || sortedJobIds,
      });
    },
    [
      displayWeekEnd,
      displayWeekStart,
      employee?.id,
      queryPayload.employeeId,
      sortedJobIds,
    ]
  );

  const buildEmployeeTasksUrl = useCallback(
    (sourceJobIds?: string[]): string =>
      buildDispatchJobLinkUrl({
        origin: window.location.origin,
        path: '/dispatch-employee-tasks',
        employeeId: (employee?.id || queryPayload.employeeId || '').trim(),
        weekStart: displayWeekStart,
        weekEnd: displayWeekEnd,
        jobIds: sourceJobIds || sortedJobIds,
      }),
    [
      displayWeekEnd,
      displayWeekStart,
      employee?.id,
      queryPayload.employeeId,
      sortedJobIds,
    ]
  );

  const customerProfileById = useMemo(() => {
    const map = new Map<string, DispatchCustomerProfile>();
    customerProfiles.forEach(profile => {
      map.set(profile.id, profile);
    });
    return map;
  }, [customerProfiles]);

  const templateMatchByJobId = useMemo(() => {
    const map = new Map<string, TemplateMatchResult>();
    jobs.forEach(job => {
      const profile = job.customerProfileId
        ? customerProfileById.get(job.customerProfileId)
        : undefined;
      map.set(job.id, findMatchingTemplate(job, propertyTemplates, t, profile));
    });
    return map;
  }, [customerProfileById, jobs, propertyTemplates, t]);

  const templateByJobId = useMemo(() => {
    const map = new Map<string, PropertyTemplate>();
    templateMatchByJobId.forEach((match, jobId) => {
      if (match.template) {
        map.set(jobId, match.template);
      }
    });
    return map;
  }, [templateMatchByJobId]);

  const getInspectionAvailability = useCallback(
    (job: DispatchJob): { enabled: boolean; reason?: string } => {
      const profile = job.customerProfileId
        ? customerProfileById.get(job.customerProfileId)
        : undefined;
      if (!profile?.recurringEnabled) {
        return {
          enabled: false,
          reason: t('sparkery.dispatch.weekPlan.errors.recurringNotEnabled'),
        };
      }
      const matchedTemplate = templateByJobId.get(job.id);
      if (!matchedTemplate) {
        const matchDetails = templateMatchByJobId.get(job.id);
        return {
          enabled: false,
          reason:
            matchDetails?.details ||
            t(
              'sparkery.dispatch.weekPlan.templateMatch.details.noTemplateMatch'
            ),
        };
      }
      return { enabled: true };
    },
    [customerProfileById, t, templateByJobId, templateMatchByJobId]
  );

  const inspectionAvailabilitySummary = useMemo(() => {
    let enabledCount = 0;
    jobs.forEach(job => {
      if (getInspectionAvailability(job).enabled) {
        enabledCount += 1;
      }
    });
    return {
      enabledCount,
      disabledCount: jobs.length - enabledCount,
    };
  }, [getInspectionAvailability, jobs]);

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      if (!queryPayload.employeeId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [employees, allJobs, profiles, templates] = await Promise.all([
          sparkeryDispatchService.getEmployees(),
          sparkeryDispatchService.getJobs({
            weekStart: queryPayload.weekStart,
            weekEnd: queryPayload.weekEnd,
          }),
          sparkeryDispatchService.getCustomerProfiles(),
          loadPropertyTemplates(),
        ]);

        if (cancelled) {
          return;
        }

        const foundEmployee =
          employees.find(item => item.id === queryPayload.employeeId) || null;
        setEmployee(foundEmployee);

        const jobById = new Map<string, DispatchJob>();
        allJobs.forEach(job => {
          jobById.set(job.id, job);
        });

        const orderedJobs = queryPayload.jobIds
          .map(jobId => jobById.get(jobId))
          .filter((job): job is DispatchJob => Boolean(job));

        const weeklyAssignedJobs = allJobs
          .filter(
            job =>
              job.scheduledDate >= queryPayload.weekStart &&
              job.scheduledDate <= queryPayload.weekEnd &&
              isExecutableDispatchJob(job.status) &&
              Boolean(
                job.assignedEmployeeIds?.includes(queryPayload.employeeId)
              )
          )
          .sort(compareJobsBySchedule);

        const orderedWeeklyJobIds = new Set(orderedJobs.map(job => job.id));
        const mergedJobs = [
          ...orderedJobs,
          ...weeklyAssignedJobs.filter(job => !orderedWeeklyJobIds.has(job.id)),
        ].sort(compareJobsBySchedule);

        const notFoundIds = queryPayload.jobIds.filter(
          jobId => !jobById.has(jobId)
        );
        setJobs(mergedJobs);
        setMissingJobIds(notFoundIds);
        if (notFoundIds.length > 0 && !telemetryTrackedRef.current.missing) {
          telemetryTrackedRef.current.missing = true;
          trackSparkeryEvent('dispatch.week_plan.jobs_missing', {
            success: false,
            data: {
              employeeId: queryPayload.employeeId,
              weekStart: queryPayload.weekStart,
              weekEnd: queryPayload.weekEnd,
              requestedCount: queryPayload.jobIds.length,
              missingCount: notFoundIds.length,
            },
          });
        }
        setCustomerProfiles(profiles);
        setPropertyTemplates(templates);
      } catch {
        if (!cancelled) {
          messageApi.error(
            t('sparkery.dispatch.weekPlan.messages.loadDataFailed')
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, [
    messageApi,
    queryPayload.employeeId,
    queryPayload.jobIds,
    queryPayload.weekEnd,
    queryPayload.weekStart,
    t,
  ]);

  useEffect(() => {
    let cancelled = false;
    const calculateRoute = async () => {
      if (!employee || sortedJobs.length === 0) {
        setRouteResultByDate({});
        setRouteErrorByDate({});
        setRouteGeneralError('');
        return;
      }

      const location = employee.currentLocation;
      if (!location) {
        setRouteResultByDate({});
        setRouteErrorByDate({});
        setRouteGeneralError(
          t('sparkery.dispatch.weekPlan.errors.employeeLocationMissing')
        );
        return;
      }

      setLoadingRoute(true);
      setRouteResultByDate({});
      setRouteErrorByDate({});
      setRouteGeneralError('');

      try {
        const cache = loadGeocodeCache();
        const nextResults: RouteResultByDate = {};
        const nextErrors: RouteErrorByDate = {};

        for (const section of daySections) {
          if (section.jobs.length === 0) {
            continue;
          }

          try {
            const pointsByJobId = new Map<string, GeoPoint>();

            for (const job of section.jobs) {
              const address = job.customerAddress?.trim();
              if (!address) {
                nextErrors[section.date] = t(
                  'sparkery.dispatch.weekPlan.errors.jobAddressMissing',
                  { id: job.id }
                );
                break;
              }

              const key = normalizeAddressKey(address);
              const cached = cache[key];
              if (cached) {
                pointsByJobId.set(job.id, {
                  lat: cached.lat,
                  lng: cached.lng,
                });
                continue;
              }

              const geocoded = await geocodeAddress(address);
              if (!geocoded) {
                nextErrors[section.date] = t(
                  'sparkery.dispatch.weekPlan.errors.addressGeocodeFailed',
                  {
                    id: job.id,
                    address,
                  }
                );
                break;
              }

              pointsByJobId.set(job.id, geocoded);
              cache[key] = {
                lat: geocoded.lat,
                lng: geocoded.lng,
                updatedAt: new Date().toISOString(),
              };
            }

            if (nextErrors[section.date]) {
              continue;
            }

            const steps: RouteStep[] = [];
            let totalDistanceKm = 0;
            let totalDurationMin = 0;
            let currentPoint: GeoPoint = {
              lat: location.lat,
              lng: location.lng,
            };

            for (let index = 0; index < section.jobs.length; index += 1) {
              const currentJob = section.jobs[index]!;
              const point = pointsByJobId.get(currentJob.id);
              if (!point) {
                continue;
              }

              const estimate = await estimateTravel(currentPoint, point);
              totalDistanceKm += estimate.distanceKm;
              totalDurationMin += estimate.durationMin;

              const previousJob =
                index > 0 ? section.jobs[index - 1] : undefined;
              const fromAddress = previousJob
                ? previousJob.customerAddress || previousJob.title
                : location.label ||
                  `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`;
              const toAddress = currentJob.customerAddress || currentJob.title;
              const navigationUrl = buildGoogleNavigationUrl(
                currentPoint,
                point
              );

              steps.push({
                jobId: currentJob.id,
                distanceText: estimate.distanceText,
                durationText: estimate.durationText,
                navigationUrl,
                fromAddress,
                toAddress,
              });

              currentPoint = point;
            }

            if (steps.length === 0) {
              nextErrors[section.date] = t(
                'sparkery.dispatch.weekPlan.errors.routeStepsEmpty'
              );
              continue;
            }

            const finalJob = section.jobs[section.jobs.length - 1];
            const finalPoint = finalJob ? pointsByJobId.get(finalJob.id) : null;
            if (!finalPoint) {
              nextErrors[section.date] = t(
                'sparkery.dispatch.weekPlan.errors.overviewNavigationFailed'
              );
              continue;
            }

            const waypointPoints = section.jobs
              .slice(0, -1)
              .map(job => pointsByJobId.get(job.id))
              .filter((point): point is GeoPoint => Boolean(point));
            const overviewNavigationUrl = buildGoogleNavigationUrl(
              { lat: location.lat, lng: location.lng },
              finalPoint,
              waypointPoints
            );

            nextResults[section.date] = {
              steps,
              totalDistanceKm,
              totalDurationMin,
              nextCommuteDistanceText: steps[0]?.distanceText || naText,
              nextCommuteDurationText: steps[0]?.durationText || naText,
              overviewNavigationUrl,
            };
          } catch {
            nextErrors[section.date] = t(
              'sparkery.dispatch.weekPlan.errors.routeCalculationFailed'
            );
          }
        }

        if (cancelled) {
          return;
        }

        saveGeocodeCache(cache);
        setRouteResultByDate(nextResults);
        setRouteErrorByDate(nextErrors);
      } catch {
        if (!cancelled) {
          setRouteGeneralError(
            t('sparkery.dispatch.weekPlan.errors.routeCalculationFailed')
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingRoute(false);
        }
      }
    };

    calculateRoute();
    return () => {
      cancelled = true;
    };
  }, [daySections, employee, naText, sortedJobs, t]);

  useEffect(() => {
    if (hasExpiredCompactLink && !telemetryTrackedRef.current.expired) {
      telemetryTrackedRef.current.expired = true;
      trackSparkeryEvent('dispatch.week_plan.link.expired', {
        success: false,
        data: {
          employeeId: queryPayload.employeeId,
          weekStart: queryPayload.weekStart,
          weekEnd: queryPayload.weekEnd,
          source: queryPayload.source,
          compactVersion: queryPayload.compact.version || '',
          expiresAtMs: queryPayload.compact.expiresAtMs,
        },
      });
    }
  }, [
    hasExpiredCompactLink,
    queryPayload.compact.expiresAtMs,
    queryPayload.compact.version,
    queryPayload.employeeId,
    queryPayload.source,
    queryPayload.weekEnd,
    queryPayload.weekStart,
  ]);

  useEffect(() => {
    if (hasInvalidCompactLink && !telemetryTrackedRef.current.integrity) {
      telemetryTrackedRef.current.integrity = true;
      trackSparkeryEvent('dispatch.week_plan.link.signature_invalid', {
        success: false,
        data: {
          employeeId: queryPayload.employeeId,
          weekStart: queryPayload.weekStart,
          weekEnd: queryPayload.weekEnd,
          source: queryPayload.source,
          compactVersion: queryPayload.compact.version || '',
          versionValid: queryPayload.compact.versionValid,
          signatureValid: queryPayload.compact.signatureValid,
          payloadValid: queryPayload.compact.payloadValid,
          expired: queryPayload.compact.expired,
        },
      });
    }
  }, [
    hasInvalidCompactLink,
    queryPayload.compact.expired,
    queryPayload.compact.payloadValid,
    queryPayload.compact.signatureValid,
    queryPayload.compact.version,
    queryPayload.compact.versionValid,
    queryPayload.employeeId,
    queryPayload.source,
    queryPayload.weekEnd,
    queryPayload.weekStart,
  ]);

  useEffect(() => {
    if (loading || !queryPayload.employeeId) {
      return;
    }
    const canonicalSearch = new URL(buildCurrentPlanUrl()).search;
    if (window.location.search !== canonicalSearch) {
      window.history.replaceState(
        {},
        '',
        `${window.location.pathname}${canonicalSearch}`
      );
      if (!telemetryTrackedRef.current.autoRepaired) {
        telemetryTrackedRef.current.autoRepaired = true;
        trackSparkeryEvent('dispatch.week_plan.link.auto_repaired', {
          success: true,
          data: {
            employeeId: queryPayload.employeeId,
            weekStart: queryPayload.weekStart,
            weekEnd: queryPayload.weekEnd,
            missingCount: missingJobIds.length,
            compactExpired: queryPayload.compact.expired,
            compactValid:
              queryPayload.compact.payloadValid &&
              queryPayload.compact.signatureValid &&
              queryPayload.compact.versionValid &&
              !queryPayload.compact.expired,
          },
        });
      }
    }
  }, [
    buildCurrentPlanUrl,
    loading,
    missingJobIds.length,
    queryPayload.compact.expired,
    queryPayload.compact.payloadValid,
    queryPayload.compact.signatureValid,
    queryPayload.compact.versionValid,
    queryPayload.employeeId,
    queryPayload.weekEnd,
    queryPayload.weekStart,
  ]);

  const handleCopyCurrentPlanLink = useCallback(async () => {
    const currentUrl = buildCurrentPlanUrl();
    try {
      if (!navigator.clipboard?.writeText) {
        messageApi.warning(
          t('sparkery.dispatch.weekPlan.messages.copyNotSupported', {
            url: currentUrl,
          })
        );
        return;
      }
      await navigator.clipboard.writeText(currentUrl);
      messageApi.success(
        t('sparkery.dispatch.weekPlan.messages.weeklyPlanLinkCopied')
      );
    } catch {
      messageApi.error(
        t('sparkery.dispatch.weekPlan.messages.copyWeeklyPlanLinkFailed')
      );
    }
  }, [buildCurrentPlanUrl, messageApi, t]);

  const handleRebuildCurrentPlanLink = useCallback(async () => {
    const rebuiltUrl = buildCurrentPlanUrl();
    const rebuiltSearch = new URL(rebuiltUrl).search;
    if (window.location.search !== rebuiltSearch) {
      window.history.replaceState(
        {},
        '',
        `${window.location.pathname}${rebuiltSearch}`
      );
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(rebuiltUrl);
      }
      messageApi.success(
        t('sparkery.dispatch.weekPlan.messages.planLinkRebuilt')
      );
    } catch {
      messageApi.error(
        t('sparkery.dispatch.weekPlan.messages.copyWeeklyPlanLinkFailed')
      );
    }
  }, [buildCurrentPlanUrl, messageApi, t]);

  const handleOpenEmployeeTasks = useCallback(() => {
    try {
      const url = buildEmployeeTasksUrl();
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      messageApi.error(
        t('sparkery.dispatch.weekPlan.messages.openEmployeeTasksFailed')
      );
    }
  }, [buildEmployeeTasksUrl, messageApi, t]);

  const handleGenerateInspectionLink = useCallback(
    async (jobId: string) => {
      if (!employee) {
        messageApi.warning(
          t('sparkery.dispatch.weekPlan.errors.employeeMissing')
        );
        return;
      }

      const job = jobs.find(item => item.id === jobId);
      if (!job) {
        messageApi.error(t('sparkery.dispatch.weekPlan.errors.jobNotFound'));
        return;
      }

      const profile = job.customerProfileId
        ? customerProfileById.get(job.customerProfileId)
        : undefined;
      const template = templateByJobId.get(job.id);

      if (!profile?.recurringEnabled || !template) {
        messageApi.warning(
          t('sparkery.dispatch.weekPlan.errors.inspectionLinkUnavailable')
        );
        return;
      }

      setCreatingInspectionJobId(job.id);
      try {
        const inspectionId = `insp-dispatch-${template.id}-${job.scheduledDate.replaceAll('-', '')}-${job.id}`;
        const assignedEmployee = toInspectionEmployee(employee);
        const inspectionDraft: CleaningInspection = {
          id: inspectionId,
          propertyTemplateId: template.id,
          propertyId: template.name,
          propertyAddress: template.address || job.customerAddress || '',
          propertyNotes: template.notes || '',
          ...(template.notesZh ? { propertyNotesZh: template.notesZh } : {}),
          ...(Array.isArray(template.noteImages) &&
          template.noteImages.length > 0
            ? { propertyNoteImages: [...template.noteImages] }
            : {}),
          checkOutDate: job.scheduledDate,
          submittedAt: '',
          sections: buildSectionsFromTemplate(template),
          submitterName: undefined,
          status: 'pending',
          templateName: template.name,
          checkIn: null,
          checkOut: null,
          damageReports: [],
          assignedEmployee,
          assignedEmployees: [assignedEmployee],
        };

        await submitInspection(inspectionDraft);

        const rawLink = buildInspectionShareUrl(window.location.origin, {
          id: inspectionId,
          propertyName: template.name,
          propertyAddress: template.address || job.customerAddress || '',
          checkOutDate: job.scheduledDate,
          employeeIds: [employee.id],
          templateId: template.id,
        });
        const link = await shortenUrlIfConfigured(rawLink, {
          description: `Inspection ${inspectionId}`,
        });

        setInspectionLinks(prev => ({
          ...prev,
          [job.id]: link,
        }));

        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(link);
        }
        window.open(link, '_blank', 'noopener,noreferrer');
        messageApi.success(
          t('sparkery.dispatch.weekPlan.messages.inspectionLinkGenerated')
        );
      } catch {
        messageApi.error(
          t('sparkery.dispatch.weekPlan.messages.generateInspectionLinkFailed')
        );
      } finally {
        setCreatingInspectionJobId(null);
      }
    },
    [customerProfileById, employee, jobs, messageApi, t, templateByJobId]
  );

  const handleLoadMoreJobs = useCallback((date: string) => {
    setVisibleJobsByDate(prev => ({
      ...prev,
      [date]: (prev[date] || INITIAL_JOB_RENDER_LIMIT) + JOB_RENDER_INCREMENT,
    }));
  }, []);

  const isInvalidQuery = !queryPayload.employeeId;

  return (
    <div className='dispatch-week-plan-page dispatch-week-plan-shell'>
      {contextHolder}
      <div className='dispatch-week-plan-container'>
        <Space
          direction='vertical'
          size={12}
          className='dispatch-week-plan-root-space'
        >
          <Card className='dispatch-week-plan-header-card'>
            <Space
              direction='vertical'
              size={10}
              className='dispatch-week-plan-header-space'
            >
              <Title level={4} className='dispatch-week-plan-title'>
                {t('sparkery.dispatch.weekPlan.title')}
              </Title>
              <Space wrap className='dispatch-week-plan-header-tags'>
                <Tag
                  color='blue'
                  className='dispatch-week-plan-pill dispatch-week-plan-pill-week'
                >
                  {t('sparkery.dispatch.weekPlan.tags.week', {
                    start: displayWeekStart,
                    end: displayWeekEnd,
                  })}
                </Tag>
                <Tag
                  color='geekblue'
                  className='dispatch-week-plan-pill dispatch-week-plan-pill-jobs'
                >
                  {t('sparkery.dispatch.weekPlan.tags.jobs', {
                    count: jobs.length,
                  })}
                </Tag>
                <Tag
                  color='cyan'
                  className='dispatch-week-plan-pill dispatch-week-plan-pill-route'
                >
                  {t('sparkery.dispatch.weekPlan.tags.routeDays', {
                    count: Object.keys(routeResultByDate).length,
                  })}
                </Tag>
                <Tag
                  color='green'
                  className='dispatch-week-plan-pill dispatch-week-plan-pill-enabled'
                >
                  {t('sparkery.dispatch.weekPlan.tags.inspectionEnabled', {
                    count: inspectionAvailabilitySummary.enabledCount,
                  })}
                </Tag>
                <Tag className='dispatch-week-plan-pill dispatch-week-plan-pill-disabled'>
                  {t('sparkery.dispatch.weekPlan.tags.inspectionDisabled', {
                    count: inspectionAvailabilitySummary.disabledCount,
                  })}
                </Tag>
                {buildMeta && (
                  <Tag className='dispatch-week-plan-pill'>
                    {t('sparkery.dispatch.weekPlan.labels.buildMeta', {
                      version: buildMeta.version,
                      commit: buildMeta.commit,
                    })}
                  </Tag>
                )}
              </Space>
              <Space wrap className='dispatch-week-plan-header-actions'>
                <Button onClick={handleCopyCurrentPlanLink}>
                  {t('sparkery.dispatch.weekPlan.actions.copyPlanLink')}
                </Button>
                <Button onClick={handleRebuildCurrentPlanLink}>
                  {t('sparkery.dispatch.weekPlan.actions.refreshPlanLink')}
                </Button>
                <Button
                  onClick={handleOpenEmployeeTasks}
                  disabled={isInvalidQuery}
                >
                  {t('sparkery.dispatch.weekPlan.actions.openEmployeeTasks')}
                </Button>
              </Space>
            </Space>
          </Card>

          {isInvalidQuery && (
            <Alert
              type='warning'
              showIcon
              className='dispatch-week-plan-alert dispatch-week-plan-alert-warning'
              message={t('sparkery.dispatch.weekPlan.alerts.invalidLink')}
              description={t(
                'sparkery.dispatch.weekPlan.alerts.regenerateFromMapPlanner'
              )}
            />
          )}

          {!isInvalidQuery && !loading && hasExpiredCompactLink && (
            <Alert
              type='warning'
              showIcon
              className='dispatch-week-plan-alert dispatch-week-plan-alert-warning'
              message={t('sparkery.dispatch.weekPlan.alerts.linkExpired')}
              description={t(
                'sparkery.dispatch.weekPlan.alerts.linkExpiredDesc'
              )}
            />
          )}

          {!isInvalidQuery && !loading && hasInvalidCompactLink && (
            <Alert
              type='warning'
              showIcon
              className='dispatch-week-plan-alert dispatch-week-plan-alert-warning'
              message={t(
                'sparkery.dispatch.weekPlan.alerts.linkIntegrityInvalid'
              )}
              description={t(
                'sparkery.dispatch.weekPlan.alerts.linkIntegrityInvalidDesc'
              )}
            />
          )}

          {!isInvalidQuery && loading && (
            <Alert
              type='info'
              showIcon
              className='dispatch-week-plan-alert dispatch-week-plan-alert-info'
              message={t('sparkery.dispatch.weekPlan.alerts.loading')}
            />
          )}

          {!isInvalidQuery && !loading && !employee && (
            <Alert
              type='error'
              showIcon
              className='dispatch-week-plan-alert dispatch-week-plan-alert-error'
              message={t('sparkery.dispatch.weekPlan.alerts.employeeNotFound')}
              description={t(
                'sparkery.dispatch.weekPlan.alerts.regenerateFromDispatchBoard'
              )}
            />
          )}

          {!isInvalidQuery && !loading && employee && (
            <Alert
              type='info'
              showIcon
              className='dispatch-week-plan-alert dispatch-week-plan-alert-info dispatch-week-plan-alert-employee'
              message={t('sparkery.dispatch.weekPlan.alerts.employee', {
                name: employee.name,
              })}
              description={
                employee.currentLocation
                  ? t('sparkery.dispatch.weekPlan.alerts.currentLocation', {
                      lat: employee.currentLocation.lat.toFixed(5),
                      lng: employee.currentLocation.lng.toFixed(5),
                    })
                  : t('sparkery.dispatch.weekPlan.alerts.locationNotReported')
              }
            />
          )}

          {!isInvalidQuery && !loading && missingJobIds.length > 0 && (
            <Alert
              type='warning'
              showIcon
              className='dispatch-week-plan-alert dispatch-week-plan-alert-warning'
              message={t('sparkery.dispatch.weekPlan.alerts.missingJobs', {
                count: missingJobIds.length,
              })}
              description={
                <Space direction='vertical' size={2}>
                  <Text type='secondary'>
                    {t('sparkery.dispatch.weekPlan.alerts.missingIds', {
                      ids: missingJobIds.join(', '),
                    })}
                  </Text>
                  <Text type='secondary'>
                    {t('sparkery.dispatch.weekPlan.alerts.staleJobsRemoved', {
                      count: missingJobIds.length,
                    })}
                  </Text>
                </Space>
              }
            />
          )}

          {!isInvalidQuery && !loading && routeGeneralError && (
            <Alert
              type='error'
              showIcon
              className='dispatch-week-plan-alert dispatch-week-plan-alert-error'
              message={routeGeneralError}
            />
          )}

          {!isInvalidQuery && !loading && routeErrorEntries.length > 0 && (
            <Alert
              type='warning'
              showIcon
              className='dispatch-week-plan-alert dispatch-week-plan-alert-warning'
              message={t(
                'sparkery.dispatch.weekPlan.alerts.dailyRouteUnavailable'
              )}
              description={
                <Space
                  direction='vertical'
                  size={2}
                  className='dispatch-week-plan-alert-list'
                >
                  {routeErrorEntries.map(([date, error]) => (
                    <Text
                      key={date}
                      type='secondary'
                      className='dispatch-week-plan-alert-item'
                    >
                      {t('sparkery.dispatch.weekPlan.labels.dayRouteError', {
                        day: formatWeekday(date),
                        date,
                        error,
                      })}
                    </Text>
                  ))}
                </Space>
              }
            />
          )}

          {!isInvalidQuery && !loading && jobs.length === 0 && (
            <Card>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={t('sparkery.dispatch.weekPlan.empty.noJobs')}
              />
            </Card>
          )}

          {!isInvalidQuery && !loading && jobs.length > 0 && (
            <Row gutter={[12, 12]}>
              <Col xs={24} xl={16}>
                <Card
                  title={t('sparkery.dispatch.weekPlan.sections.weeklyJobs')}
                  className='dispatch-week-plan-jobs-card'
                >
                  <Space
                    direction='vertical'
                    size={10}
                    className='dispatch-week-plan-jobs-space'
                  >
                    {daySections.map(section => {
                      const dayRoute = routeResultByDate[section.date];
                      const visibleCount =
                        visibleJobsByDate[section.date] ||
                        INITIAL_JOB_RENDER_LIMIT;
                      const visibleJobs = section.jobs.slice(0, visibleCount);
                      const hasMoreJobs =
                        visibleJobs.length < section.jobs.length;

                      return (
                        <Card
                          key={section.date}
                          size='small'
                          type='inner'
                          className='dispatch-week-plan-day-card'
                          title={
                            <Space size={6} wrap>
                              <Tag
                                color={
                                  section.date === dayjs().format('YYYY-MM-DD')
                                    ? 'volcano'
                                    : 'blue'
                                }
                                className='dispatch-week-plan-pill dispatch-week-plan-pill-day'
                              >
                                {formatWeekday(section.date)}
                              </Tag>
                              <Tag className='dispatch-week-plan-pill dispatch-week-plan-pill-date'>
                                {section.date}
                              </Tag>
                              <Tag
                                color='geekblue'
                                className='dispatch-week-plan-pill dispatch-week-plan-pill-count'
                              >
                                {t(
                                  'sparkery.dispatch.weekPlan.labels.jobsCount',
                                  {
                                    count: section.jobs.length,
                                  }
                                )}
                              </Tag>
                            </Space>
                          }
                          extra={
                            dayRoute?.overviewNavigationUrl ? (
                              <Button
                                size='small'
                                type='link'
                                href={dayRoute.overviewNavigationUrl}
                                target='_blank'
                                rel='noreferrer'
                                className='dispatch-link-button-inline'
                              >
                                {t(
                                  'sparkery.dispatch.weekPlan.actions.openDayNavigation'
                                )}
                              </Button>
                            ) : undefined
                          }
                        >
                          <List
                            loading={loadingRoute}
                            dataSource={visibleJobs}
                            locale={{
                              emptyText: t(
                                'sparkery.dispatch.weekPlan.empty.noJobsForDay'
                              ),
                            }}
                            loadMore={
                              hasMoreJobs ? (
                                <div className='dispatch-week-plan-load-more'>
                                  <Button
                                    size='small'
                                    onClick={() =>
                                      handleLoadMoreJobs(section.date)
                                    }
                                  >
                                    {t(
                                      'sparkery.dispatch.weekPlan.actions.loadMoreJobs',
                                      {
                                        defaultValue: 'Load more jobs',
                                      }
                                    )}
                                  </Button>
                                </div>
                              ) : null
                            }
                            renderItem={(job, index) => {
                              const step = dayRoute?.steps.find(
                                item => item.jobId === job.id
                              );
                              const profile = job.customerProfileId
                                ? customerProfileById.get(job.customerProfileId)
                                : undefined;
                              const template = templateByJobId.get(job.id);
                              const templateMatch = templateMatchByJobId.get(
                                job.id
                              );
                              const inspectionAvailability =
                                getInspectionAvailability(job);

                              const actionNodes: React.ReactNode[] = [
                                <Button
                                  key='navigate'
                                  size='small'
                                  className='dispatch-week-plan-action-btn dispatch-week-plan-action-btn-nav'
                                  disabled={!step?.navigationUrl}
                                  onClick={() => {
                                    if (!step?.navigationUrl) {
                                      return;
                                    }
                                    window.open(
                                      step.navigationUrl,
                                      '_blank',
                                      'noopener,noreferrer'
                                    );
                                  }}
                                >
                                  {t(
                                    'sparkery.dispatch.weekPlan.actions.navigate'
                                  )}
                                </Button>,
                                <Tooltip
                                  key='inspection-tip'
                                  title={
                                    inspectionAvailability.enabled
                                      ? ''
                                      : inspectionAvailability.reason
                                  }
                                >
                                  <span>
                                    <Button
                                      size='small'
                                      type='primary'
                                      className='dispatch-week-plan-action-btn dispatch-week-plan-action-btn-primary'
                                      disabled={!inspectionAvailability.enabled}
                                      loading={
                                        creatingInspectionJobId === job.id
                                      }
                                      onClick={() =>
                                        handleGenerateInspectionLink(job.id)
                                      }
                                    >
                                      {t(
                                        'sparkery.dispatch.weekPlan.actions.generateInspectionLink'
                                      )}
                                    </Button>
                                  </span>
                                </Tooltip>,
                              ];

                              const inspectionLink = inspectionLinks[job.id];
                              if (inspectionLink) {
                                actionNodes.push(
                                  <Button
                                    key='open-inspection'
                                    type='link'
                                    className='dispatch-week-plan-action-link'
                                    href={inspectionLink}
                                    target='_blank'
                                    rel='noreferrer'
                                  >
                                    {t(
                                      'sparkery.dispatch.weekPlan.actions.openInspection'
                                    )}
                                  </Button>
                                );
                              }

                              return (
                                <List.Item
                                  actions={actionNodes}
                                  className='dispatch-week-plan-job-item'
                                >
                                  <List.Item.Meta
                                    title={
                                      <div className='dispatch-week-plan-job-title'>
                                        <div className='dispatch-week-plan-job-title-row'>
                                          <Tag
                                            color='geekblue'
                                            className='dispatch-week-plan-pill dispatch-week-plan-pill-order'
                                          >
                                            #{index + 1}
                                          </Tag>
                                          <Text
                                            strong
                                            ellipsis={{ tooltip: job.title }}
                                            className='dispatch-week-plan-job-title-text'
                                          >
                                            {job.title ||
                                              t(
                                                'sparkery.dispatch.weekPlan.labels.untitledJob'
                                              )}
                                          </Text>
                                        </div>
                                        <Space
                                          size={[6, 6]}
                                          wrap
                                          className='dispatch-week-plan-job-title-meta'
                                        >
                                          <Tag className='dispatch-week-plan-pill dispatch-week-plan-pill-service'>
                                            {t(
                                              `sparkery.dispatch.common.serviceType.${job.serviceType}`
                                            )}
                                          </Tag>
                                          <Tag
                                            color='blue'
                                            className='dispatch-week-plan-pill dispatch-week-plan-pill-time'
                                          >
                                            {job.scheduledStartTime}-
                                            {job.scheduledEndTime}
                                          </Tag>
                                          {profile?.recurringEnabled ? (
                                            <Tag
                                              color='green'
                                              className='dispatch-week-plan-pill dispatch-week-plan-pill-recurring'
                                            >
                                              {t(
                                                'sparkery.dispatch.weekPlan.labels.recurring'
                                              )}
                                            </Tag>
                                          ) : (
                                            <Tag className='dispatch-week-plan-pill dispatch-week-plan-pill-oneoff'>
                                              {t(
                                                'sparkery.dispatch.weekPlan.labels.oneOff'
                                              )}
                                            </Tag>
                                          )}
                                        </Space>
                                      </div>
                                    }
                                    description={
                                      <div className='dispatch-week-plan-meta'>
                                        <div className='dispatch-week-plan-customer-line'>
                                          <Text
                                            type='secondary'
                                            className='dispatch-week-plan-meta-label'
                                          >
                                            {t(
                                              'sparkery.dispatch.weekPlan.labels.customer'
                                            )}
                                          </Text>
                                          <Text className='dispatch-week-plan-meta-value'>
                                            {job.customerName ||
                                              t(
                                                'sparkery.dispatch.common.customer'
                                              )}
                                          </Text>
                                        </div>
                                        <Text
                                          type='secondary'
                                          className='dispatch-week-plan-meta-address'
                                        >
                                          {job.customerAddress ||
                                            t(
                                              'sparkery.dispatch.common.noAddress'
                                            )}
                                        </Text>

                                        {step && (
                                          <div className='dispatch-week-plan-route-block'>
                                            <Text
                                              type='secondary'
                                              className='dispatch-week-plan-route-line'
                                            >
                                              {t(
                                                'sparkery.dispatch.weekPlan.labels.from',
                                                {
                                                  value: step.fromAddress,
                                                }
                                              )}
                                            </Text>
                                            <Text
                                              type='secondary'
                                              className='dispatch-week-plan-route-line'
                                            >
                                              {t(
                                                'sparkery.dispatch.weekPlan.labels.to',
                                                {
                                                  value: step.toAddress,
                                                }
                                              )}
                                            </Text>
                                            <Text className='dispatch-week-plan-commute-line'>
                                              {t(
                                                'sparkery.dispatch.weekPlan.labels.commute',
                                                {
                                                  distance: step.distanceText,
                                                  duration: step.durationText,
                                                }
                                              )}
                                            </Text>
                                          </div>
                                        )}

                                        {!inspectionAvailability.enabled && (
                                          <Text
                                            type='secondary'
                                            className='dispatch-week-plan-meta-warning'
                                          >
                                            {t(
                                              'sparkery.dispatch.weekPlan.labels.inspectionLinkUnavailable',
                                              {
                                                reason:
                                                  inspectionAvailability.reason ||
                                                  '',
                                              }
                                            )}
                                          </Text>
                                        )}

                                        {!template && (
                                          <Text
                                            type='secondary'
                                            className='dispatch-week-plan-meta-hint'
                                          >
                                            {t(
                                              'sparkery.dispatch.weekPlan.labels.templateMatchNotFound',
                                              {
                                                details:
                                                  templateMatch?.details ||
                                                  t(
                                                    'sparkery.dispatch.weekPlan.templateMatch.details.keepAddressConsistent'
                                                  ),
                                              }
                                            )}
                                          </Text>
                                        )}

                                        {templateMatch && (
                                          <Space
                                            size={[6, 6]}
                                            wrap
                                            className='dispatch-week-plan-address-keys'
                                          >
                                            <Text
                                              type='secondary'
                                              className='dispatch-week-plan-meta-label'
                                            >
                                              {t(
                                                'sparkery.dispatch.weekPlan.labels.addressKeys'
                                              )}
                                            </Text>
                                            <Tag className='dispatch-week-plan-key-tag'>
                                              {t(
                                                'sparkery.dispatch.weekPlan.labels.addressKeyJob',
                                                {
                                                  value:
                                                    templateMatch.jobAddressKey ||
                                                    naText,
                                                }
                                              )}
                                            </Tag>
                                            <Tag className='dispatch-week-plan-key-tag'>
                                              {t(
                                                'sparkery.dispatch.weekPlan.labels.addressKeyProfile',
                                                {
                                                  value:
                                                    templateMatch.profileAddressKey ||
                                                    naText,
                                                }
                                              )}
                                            </Tag>
                                            <Tag className='dispatch-week-plan-key-tag'>
                                              {t(
                                                'sparkery.dispatch.weekPlan.labels.addressKeyTemplate',
                                                {
                                                  value:
                                                    templateMatch.matchedTemplateAddressKey ||
                                                    naText,
                                                }
                                              )}
                                            </Tag>
                                          </Space>
                                        )}

                                        {template && templateMatch && (
                                          <Text
                                            type='secondary'
                                            className='dispatch-week-plan-meta-success'
                                          >
                                            {t(
                                              'sparkery.dispatch.weekPlan.labels.templateMatchSuccess',
                                              {
                                                name: template.name,
                                                strategy:
                                                  templateMatch.strategy,
                                                score:
                                                  templateMatch.score.toFixed(
                                                    2
                                                  ),
                                              }
                                            )}
                                          </Text>
                                        )}
                                      </div>
                                    }
                                  />
                                </List.Item>
                              );
                            }}
                          />
                        </Card>
                      );
                    })}
                  </Space>
                </Card>
              </Col>
              <Col xs={24} xl={8}>
                <Space
                  direction='vertical'
                  size={12}
                  className='dispatch-week-plan-side'
                >
                  <Card
                    size='small'
                    title={t(
                      'sparkery.dispatch.weekPlan.sections.dailyRouteSummary'
                    )}
                    className='dispatch-week-plan-summary-card'
                  >
                    <Space
                      direction='vertical'
                      size={8}
                      className='dispatch-week-plan-summary-space'
                    >
                      {daySections.map(section => {
                        const dayRoute = routeResultByDate[section.date];
                        return (
                          <Card
                            key={`summary-${section.date}`}
                            size='small'
                            className='dispatch-week-plan-summary-day-card'
                          >
                            <Space
                              direction='vertical'
                              size={2}
                              className='dispatch-week-plan-summary-day-space'
                            >
                              <Space
                                size={6}
                                wrap
                                className='dispatch-week-plan-summary-head'
                              >
                                <Tag
                                  color={
                                    section.date ===
                                    dayjs().format('YYYY-MM-DD')
                                      ? 'volcano'
                                      : 'default'
                                  }
                                  className='dispatch-week-plan-pill dispatch-week-plan-pill-summary-day'
                                >
                                  {formatWeekday(section.date, true)}
                                </Tag>
                                <Text
                                  strong
                                  className='dispatch-week-plan-summary-date'
                                >
                                  {section.date}
                                </Text>
                                <Tag className='dispatch-week-plan-summary-jobs-tag'>
                                  {t(
                                    'sparkery.dispatch.weekPlan.labels.jobsCompact',
                                    {
                                      count: section.jobs.length,
                                    }
                                  )}
                                </Tag>
                              </Space>
                              {section.jobs.length === 0 && (
                                <Text
                                  type='secondary'
                                  className='dispatch-week-plan-summary-empty'
                                >
                                  {t(
                                    'sparkery.dispatch.weekPlan.labels.noJobsDot'
                                  )}
                                </Text>
                              )}
                              {section.jobs.length > 0 && dayRoute && (
                                <div className='dispatch-week-plan-summary-metrics'>
                                  <div className='dispatch-week-plan-summary-metric-row'>
                                    <Text
                                      type='secondary'
                                      className='dispatch-week-plan-summary-metric-label'
                                    >
                                      {t(
                                        'sparkery.dispatch.weekPlan.labels.next'
                                      )}
                                    </Text>
                                    <Text className='dispatch-week-plan-summary-next'>
                                      {dayRoute.nextCommuteDistanceText} /{' '}
                                      {dayRoute.nextCommuteDurationText}
                                    </Text>
                                  </div>
                                  <div className='dispatch-week-plan-summary-metric-row'>
                                    <Text
                                      type='secondary'
                                      className='dispatch-week-plan-summary-metric-label'
                                    >
                                      {t(
                                        'sparkery.dispatch.weekPlan.labels.total'
                                      )}
                                    </Text>
                                    <Text
                                      type='secondary'
                                      className='dispatch-week-plan-summary-total'
                                    >
                                      {t(
                                        'sparkery.dispatch.weekPlan.labels.summaryTotal',
                                        {
                                          distance:
                                            dayRoute.totalDistanceKm.toFixed(1),
                                          duration: Math.round(
                                            dayRoute.totalDurationMin
                                          ),
                                        }
                                      )}
                                    </Text>
                                  </div>
                                </div>
                              )}
                              {section.jobs.length > 0 &&
                                !dayRoute &&
                                routeErrorByDate[section.date] && (
                                  <Text
                                    type='secondary'
                                    className='dispatch-week-plan-summary-error'
                                  >
                                    {routeErrorByDate[section.date]}
                                  </Text>
                                )}
                              {section.jobs.length > 0 &&
                                !dayRoute &&
                                !routeErrorByDate[section.date] &&
                                loadingRoute && (
                                  <Text
                                    type='secondary'
                                    className='dispatch-week-plan-summary-loading'
                                  >
                                    {t(
                                      'sparkery.dispatch.weekPlan.labels.calculatingRoute'
                                    )}
                                  </Text>
                                )}
                              {section.jobs.length > 0 &&
                                !dayRoute &&
                                !routeErrorByDate[section.date] &&
                                !loadingRoute && (
                                  <Text
                                    type='secondary'
                                    className='dispatch-week-plan-summary-unavailable'
                                  >
                                    {t(
                                      'sparkery.dispatch.weekPlan.labels.routeUnavailable'
                                    )}
                                  </Text>
                                )}
                              {dayRoute?.overviewNavigationUrl && (
                                <div className='dispatch-week-plan-summary-link-wrap'>
                                  <Button
                                    type='link'
                                    href={dayRoute.overviewNavigationUrl}
                                    target='_blank'
                                    rel='noreferrer'
                                    className='dispatch-link-button-inline dispatch-week-plan-summary-link'
                                  >
                                    {t(
                                      'sparkery.dispatch.weekPlan.actions.openDayRoute'
                                    )}
                                  </Button>
                                </div>
                              )}
                            </Space>
                          </Card>
                        );
                      })}
                      <Divider className='dispatch-divider-tight' />
                      <div className='dispatch-week-plan-weekly-total'>
                        <Text
                          strong
                          className='dispatch-week-plan-weekly-total-title'
                        >
                          {t(
                            'sparkery.dispatch.weekPlan.labels.weeklyRouteTotal'
                          )}
                        </Text>
                        {weeklyRouteTotals.dayCount > 0 ? (
                          <Space
                            size={[6, 6]}
                            wrap
                            className='dispatch-week-plan-weekly-total-metrics'
                          >
                            <Tag className='dispatch-week-plan-weekly-total-tag'>
                              {t('sparkery.dispatch.weekPlan.labels.distance', {
                                value: weeklyRouteTotals.distanceKm.toFixed(1),
                              })}
                            </Tag>
                            <Tag className='dispatch-week-plan-weekly-total-tag'>
                              {t('sparkery.dispatch.weekPlan.labels.duration', {
                                value: Math.round(
                                  weeklyRouteTotals.durationMin
                                ),
                              })}
                            </Tag>
                            <Tag className='dispatch-week-plan-weekly-total-tag'>
                              {t('sparkery.dispatch.weekPlan.labels.days', {
                                count: weeklyRouteTotals.dayCount,
                              })}
                            </Tag>
                          </Space>
                        ) : (
                          <Text
                            type='secondary'
                            className='dispatch-week-plan-weekly-total-empty'
                          >
                            {t(
                              'sparkery.dispatch.weekPlan.labels.routeTotalsUnavailable'
                            )}
                          </Text>
                        )}
                      </div>
                    </Space>
                  </Card>
                  <Card
                    size='small'
                    title={t(
                      'sparkery.dispatch.weekPlan.sections.inspectionRule'
                    )}
                    className='dispatch-week-plan-rule-card'
                  >
                    <Space
                      direction='vertical'
                      size={6}
                      className='dispatch-week-plan-rule-space'
                    >
                      <div className='dispatch-week-plan-rule-row'>
                        <Tag className='dispatch-week-plan-rule-index'>1</Tag>
                        <Text
                          type='secondary'
                          className='dispatch-week-plan-rule-text'
                        >
                          {t('sparkery.dispatch.weekPlan.rules.recurring')}
                        </Text>
                      </div>
                      <div className='dispatch-week-plan-rule-row'>
                        <Tag className='dispatch-week-plan-rule-index'>2</Tag>
                        <Text
                          type='secondary'
                          className='dispatch-week-plan-rule-text'
                        >
                          {t(
                            'sparkery.dispatch.weekPlan.rules.templateRequired'
                          )}
                        </Text>
                      </div>
                      <div className='dispatch-week-plan-rule-row'>
                        <Tag className='dispatch-week-plan-rule-index'>3</Tag>
                        <Text
                          type='secondary'
                          className='dispatch-week-plan-rule-text'
                        >
                          {t('sparkery.dispatch.weekPlan.rules.addressMatch')}
                        </Text>
                      </div>
                      <div className='dispatch-week-plan-rule-row'>
                        <Tag className='dispatch-week-plan-rule-index'>4</Tag>
                        <Text
                          type='secondary'
                          className='dispatch-week-plan-rule-text'
                        >
                          {t('sparkery.dispatch.weekPlan.rules.recommended')}
                        </Text>
                      </div>
                      <Divider className='dispatch-divider-compact dispatch-week-plan-rule-divider' />
                      <Text
                        type='secondary'
                        className='dispatch-week-plan-rule-footnote'
                      >
                        {t(
                          'sparkery.dispatch.weekPlan.rules.oneOffNoInspection'
                        )}
                      </Text>
                    </Space>
                  </Card>
                </Space>
              </Col>
            </Row>
          )}
        </Space>
      </div>
    </div>
  );
};

export default DispatchWeekPlan;
