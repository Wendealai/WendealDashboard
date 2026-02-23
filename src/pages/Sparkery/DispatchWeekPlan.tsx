import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import './sparkery.css';

const { Title, Text } = Typography;
const GEO_CACHE_STORAGE_KEY = 'sparkery_dispatch_geocode_cache_v1';

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

type GeoPoint = {
  lat: number;
  lng: number;
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
  const rawIds = (params.get('jobIds') || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const jobIds: string[] = [];
  rawIds.forEach(id => {
    if (!seen.has(id)) {
      seen.add(id);
      jobIds.push(id);
    }
  });

  return {
    employeeId,
    jobIds,
    weekStart,
    weekEnd,
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
  profile?: DispatchCustomerProfile
): TemplateMatchResult => {
  const jobAddressKey = extractAddressCore(job.customerAddress)?.key;
  const profileAddressKey = extractAddressCore(profile?.address)?.key;

  if (templates.length === 0) {
    return {
      score: 0,
      strategy: 'none',
      details: 'No inspection property templates found.',
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
          strategy: 'job address core -> template address core',
          sourceKey: byJobAddress.sourceKey,
          targetKey: byJobAddress.targetKey,
        },
        {
          score: byProfileAddress.score,
          strategy: 'customer profile address core -> template address core',
          sourceKey: byProfileAddress.sourceKey,
          targetKey: byProfileAddress.targetKey,
        },
      ];

      const bestAddressCheck = addressChecks.reduce(
        (best, current) => (current.score > best.score ? current : best),
        {
          score: 0,
          strategy: 'none',
          sourceKey: undefined as string | undefined,
          targetKey: undefined as string | undefined,
        }
      );

      const nameChecks = [
        {
          score: scoreNameMatch(job.customerName, template.name),
          strategy: 'job customer name -> template name',
        },
        {
          score: scoreNameMatch(profile?.name, template.name),
          strategy: 'customer profile name -> template name',
        },
      ];

      const bestNameCheck = nameChecks.reduce(
        (best, current) => (current.score > best.score ? current : best),
        { score: 0, strategy: 'none' }
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
      strategy: 'unmatched',
      details: 'No matching inspection property template found.',
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
        strategy: 'ambiguous-address-core',
        details:
          'More than one template has the same Number + Street Name key. Please make template address more specific.',
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
      details:
        'Address core did not match; fell back to name matching. Recommended to align Number + Street Name between Dispatch and Inspection template.',
      jobAddressKey,
      profileAddressKey,
      matchedTemplateAddressKey: best.templateAddressKey,
    };
  }

  const templateKeyPreview = templates
    .slice(0, 3)
    .map(template => {
      const key = extractAddressCore(template.address)?.key || 'N/A';
      return `${template.name}: ${key}`;
    })
    .join(' | ');

  return {
    score: best.score,
    strategy: 'unmatched',
    details: `No Number + Street Name match. Job key: ${jobAddressKey || 'N/A'}, Profile key: ${profileAddressKey || 'N/A'}. Template keys: ${templateKeyPreview}`,
    jobAddressKey,
    profileAddressKey,
    matchedTemplateAddressKey: undefined,
  };
};

const DispatchWeekPlan: React.FC = () => {
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
      map.set(job.id, findMatchingTemplate(job, propertyTemplates, profile));
    });
    return map;
  }, [customerProfileById, jobs, propertyTemplates]);

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
          reason: 'One-off task or recurring template is not enabled.',
        };
      }
      const matchedTemplate = templateByJobId.get(job.id);
      if (!matchedTemplate) {
        const matchDetails = templateMatchByJobId.get(job.id);
        return {
          enabled: false,
          reason:
            matchDetails?.details ||
            'No matching inspection property template found.',
        };
      }
      return { enabled: true };
    },
    [customerProfileById, templateByJobId, templateMatchByJobId]
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
          sparkeryDispatchService.getJobs(),
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
        setCustomerProfiles(profiles);
        setPropertyTemplates(templates);
      } catch {
        if (!cancelled) {
          messageApi.error('Failed to load weekly plan data');
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
          'Employee location is missing. Ask employee to report GPS first.'
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
                nextErrors[section.date] = `Job ${job.id} has no address.`;
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
                nextErrors[section.date] =
                  `Address geocoding failed for job ${job.id}: ${address}`;
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
              nextErrors[section.date] = 'No route steps generated.';
              continue;
            }

            const finalJob = section.jobs[section.jobs.length - 1];
            const finalPoint = finalJob ? pointsByJobId.get(finalJob.id) : null;
            if (!finalPoint) {
              nextErrors[section.date] =
                'Failed to build overview navigation URL.';
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
              nextCommuteDistanceText: steps[0]?.distanceText || 'N/A',
              nextCommuteDurationText: steps[0]?.durationText || 'N/A',
              overviewNavigationUrl,
            };
          } catch {
            nextErrors[section.date] =
              'Route calculation failed. Please verify map setup.';
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
            'Route calculation failed. Please verify map setup.'
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
  }, [daySections, employee, sortedJobs]);

  const handleCopyCurrentPlanLink = useCallback(async () => {
    const currentUrl = window.location.href;
    try {
      if (!navigator.clipboard?.writeText) {
        messageApi.warning(`Copy not supported. URL: ${currentUrl}`);
        return;
      }
      await navigator.clipboard.writeText(currentUrl);
      messageApi.success('Weekly plan link copied');
    } catch {
      messageApi.error('Failed to copy weekly plan link');
    }
  }, [messageApi]);

  const handleGenerateInspectionLink = useCallback(
    async (jobId: string) => {
      if (!employee) {
        messageApi.warning('Employee info is missing');
        return;
      }

      const job = jobs.find(item => item.id === jobId);
      if (!job) {
        messageApi.error('Job not found');
        return;
      }

      const profile = job.customerProfileId
        ? customerProfileById.get(job.customerProfileId)
        : undefined;
      const template = templateByJobId.get(job.id);

      if (!profile?.recurringEnabled || !template) {
        messageApi.warning(
          'Inspection link is only available for recurring jobs with an existing property template.'
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

        const link = buildInspectionShareUrl(window.location.origin, {
          id: inspectionId,
          propertyName: template.name,
          propertyAddress: template.address || job.customerAddress || '',
          checkOutDate: job.scheduledDate,
          employeeIds: [employee.id],
          templateId: template.id,
        });

        setInspectionLinks(prev => ({
          ...prev,
          [job.id]: link,
        }));

        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(link);
        }
        window.open(link, '_blank', 'noopener,noreferrer');
        messageApi.success('Inspection link generated and opened');
      } catch {
        messageApi.error('Failed to generate inspection link');
      } finally {
        setCreatingInspectionJobId(null);
      }
    },
    [customerProfileById, employee, jobs, messageApi, templateByJobId]
  );

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
                Dispatch Weekly Plan
              </Title>
              <Space wrap className='dispatch-week-plan-header-tags'>
                <Tag
                  color='blue'
                  className='dispatch-week-plan-pill dispatch-week-plan-pill-week'
                >
                  Week: {displayWeekStart} to {displayWeekEnd}
                </Tag>
                <Tag
                  color='geekblue'
                  className='dispatch-week-plan-pill dispatch-week-plan-pill-jobs'
                >
                  Jobs: {jobs.length}
                </Tag>
                <Tag
                  color='cyan'
                  className='dispatch-week-plan-pill dispatch-week-plan-pill-route'
                >
                  Route days: {Object.keys(routeResultByDate).length}
                </Tag>
                <Tag
                  color='green'
                  className='dispatch-week-plan-pill dispatch-week-plan-pill-enabled'
                >
                  Inspection enabled:{' '}
                  {inspectionAvailabilitySummary.enabledCount}
                </Tag>
                <Tag className='dispatch-week-plan-pill dispatch-week-plan-pill-disabled'>
                  Inspection disabled:{' '}
                  {inspectionAvailabilitySummary.disabledCount}
                </Tag>
              </Space>
              <Space wrap>
                <Button onClick={handleCopyCurrentPlanLink}>
                  Copy Plan Link
                </Button>
              </Space>
            </Space>
          </Card>

          {isInvalidQuery && (
            <Alert
              type='warning'
              showIcon
              className='dispatch-week-plan-alert dispatch-week-plan-alert-warning'
              message='Invalid weekly plan link'
              description='Please regenerate the link from Dispatch Map Planner.'
            />
          )}

          {!isInvalidQuery && loading && (
            <Alert
              type='info'
              showIcon
              className='dispatch-week-plan-alert dispatch-week-plan-alert-info'
              message='Loading weekly plan...'
            />
          )}

          {!isInvalidQuery && !loading && !employee && (
            <Alert
              type='error'
              showIcon
              className='dispatch-week-plan-alert dispatch-week-plan-alert-error'
              message='Employee not found'
              description='Please regenerate the weekly plan link from dispatch board.'
            />
          )}

          {!isInvalidQuery && !loading && employee && (
            <Alert
              type='info'
              showIcon
              className='dispatch-week-plan-alert dispatch-week-plan-alert-info dispatch-week-plan-alert-employee'
              message={`Employee: ${employee.name}`}
              description={
                employee.currentLocation
                  ? `Current location: ${employee.currentLocation.lat.toFixed(5)}, ${employee.currentLocation.lng.toFixed(5)}`
                  : 'Current location not reported yet'
              }
            />
          )}

          {!isInvalidQuery && !loading && missingJobIds.length > 0 && (
            <Alert
              type='warning'
              showIcon
              className='dispatch-week-plan-alert dispatch-week-plan-alert-warning'
              message={`${missingJobIds.length} jobs are missing`}
              description={`Missing IDs: ${missingJobIds.join(', ')}`}
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
              message='Some daily routes are unavailable'
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
                      {dayjs(date).format('dddd')} ({date}): {error}
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
                description='No jobs found in this weekly plan'
              />
            </Card>
          )}

          {!isInvalidQuery && !loading && jobs.length > 0 && (
            <Row gutter={[12, 12]}>
              <Col xs={24} xl={16}>
                <Card
                  title='Weekly Jobs (Mon-Sun)'
                  className='dispatch-week-plan-jobs-card'
                >
                  <Space
                    direction='vertical'
                    size={10}
                    className='dispatch-week-plan-jobs-space'
                  >
                    {daySections.map(section => {
                      const dayRoute = routeResultByDate[section.date];

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
                                {dayjs(section.date).format('dddd')}
                              </Tag>
                              <Tag className='dispatch-week-plan-pill dispatch-week-plan-pill-date'>
                                {section.date}
                              </Tag>
                              <Tag
                                color='geekblue'
                                className='dispatch-week-plan-pill dispatch-week-plan-pill-count'
                              >
                                Jobs: {section.jobs.length}
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
                                Open Day Navigation
                              </Button>
                            ) : undefined
                          }
                        >
                          <List
                            loading={loadingRoute}
                            dataSource={section.jobs}
                            locale={{ emptyText: 'No jobs for this day' }}
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
                                  Navigate
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
                                      Generate Inspection Link
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
                                    Open Inspection
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
                                            {job.title || 'Untitled job'}
                                          </Text>
                                        </div>
                                        <Space
                                          size={[6, 6]}
                                          wrap
                                          className='dispatch-week-plan-job-title-meta'
                                        >
                                          <Tag className='dispatch-week-plan-pill dispatch-week-plan-pill-service'>
                                            {job.serviceType}
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
                                              Recurring
                                            </Tag>
                                          ) : (
                                            <Tag className='dispatch-week-plan-pill dispatch-week-plan-pill-oneoff'>
                                              One-off
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
                                            Customer:
                                          </Text>
                                          <Text className='dispatch-week-plan-meta-value'>
                                            {job.customerName || 'Customer'}
                                          </Text>
                                        </div>
                                        <Text
                                          type='secondary'
                                          className='dispatch-week-plan-meta-address'
                                        >
                                          {job.customerAddress || 'No address'}
                                        </Text>

                                        {step && (
                                          <div className='dispatch-week-plan-route-block'>
                                            <Text
                                              type='secondary'
                                              className='dispatch-week-plan-route-line'
                                            >
                                              From: {step.fromAddress}
                                            </Text>
                                            <Text
                                              type='secondary'
                                              className='dispatch-week-plan-route-line'
                                            >
                                              To: {step.toAddress}
                                            </Text>
                                            <Text className='dispatch-week-plan-commute-line'>
                                              Commute: {step.distanceText} /{' '}
                                              {step.durationText}
                                            </Text>
                                          </div>
                                        )}

                                        {!inspectionAvailability.enabled && (
                                          <Text
                                            type='secondary'
                                            className='dispatch-week-plan-meta-warning'
                                          >
                                            Inspection link unavailable:{' '}
                                            {inspectionAvailability.reason}
                                          </Text>
                                        )}

                                        {!template && (
                                          <Text
                                            type='secondary'
                                            className='dispatch-week-plan-meta-hint'
                                          >
                                            Template match: not found.{' '}
                                            {templateMatch?.details ||
                                              'Keep customer address and template address consistent.'}
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
                                              Address keys:
                                            </Text>
                                            <Tag className='dispatch-week-plan-key-tag'>
                                              Job{' '}
                                              {templateMatch.jobAddressKey ||
                                                'N/A'}
                                            </Tag>
                                            <Tag className='dispatch-week-plan-key-tag'>
                                              Profile{' '}
                                              {templateMatch.profileAddressKey ||
                                                'N/A'}
                                            </Tag>
                                            <Tag className='dispatch-week-plan-key-tag'>
                                              Template{' '}
                                              {templateMatch.matchedTemplateAddressKey ||
                                                'N/A'}
                                            </Tag>
                                          </Space>
                                        )}

                                        {template && templateMatch && (
                                          <Text
                                            type='secondary'
                                            className='dispatch-week-plan-meta-success'
                                          >
                                            Template match: {template.name} (
                                            {templateMatch.strategy}, score{' '}
                                            {templateMatch.score.toFixed(2)})
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
                    title='Daily Route Summary'
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
                                  {dayjs(section.date).format('ddd')}
                                </Tag>
                                <Text
                                  strong
                                  className='dispatch-week-plan-summary-date'
                                >
                                  {section.date}
                                </Text>
                                <Tag className='dispatch-week-plan-summary-jobs-tag'>
                                  Jobs {section.jobs.length}
                                </Tag>
                              </Space>
                              {section.jobs.length === 0 && (
                                <Text
                                  type='secondary'
                                  className='dispatch-week-plan-summary-empty'
                                >
                                  No jobs.
                                </Text>
                              )}
                              {section.jobs.length > 0 && dayRoute && (
                                <div className='dispatch-week-plan-summary-metrics'>
                                  <div className='dispatch-week-plan-summary-metric-row'>
                                    <Text
                                      type='secondary'
                                      className='dispatch-week-plan-summary-metric-label'
                                    >
                                      Next
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
                                      Total
                                    </Text>
                                    <Text
                                      type='secondary'
                                      className='dispatch-week-plan-summary-total'
                                    >
                                      {dayRoute.totalDistanceKm.toFixed(1)} km /{' '}
                                      {Math.round(dayRoute.totalDurationMin)}{' '}
                                      mins
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
                                    Calculating route...
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
                                    Route unavailable.
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
                                    Open Day Route
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
                          Weekly route total
                        </Text>
                        {weeklyRouteTotals.dayCount > 0 ? (
                          <Space
                            size={[6, 6]}
                            wrap
                            className='dispatch-week-plan-weekly-total-metrics'
                          >
                            <Tag className='dispatch-week-plan-weekly-total-tag'>
                              Distance {weeklyRouteTotals.distanceKm.toFixed(1)}{' '}
                              km
                            </Tag>
                            <Tag className='dispatch-week-plan-weekly-total-tag'>
                              Duration{' '}
                              {Math.round(weeklyRouteTotals.durationMin)} mins
                            </Tag>
                            <Tag className='dispatch-week-plan-weekly-total-tag'>
                              Days {weeklyRouteTotals.dayCount}
                            </Tag>
                          </Space>
                        ) : (
                          <Text
                            type='secondary'
                            className='dispatch-week-plan-weekly-total-empty'
                          >
                            Route totals are unavailable right now.
                          </Text>
                        )}
                      </div>
                    </Space>
                  </Card>
                  <Card
                    size='small'
                    title='Inspection Rule'
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
                          Task must be recurring.
                        </Text>
                      </div>
                      <div className='dispatch-week-plan-rule-row'>
                        <Tag className='dispatch-week-plan-rule-index'>2</Tag>
                        <Text
                          type='secondary'
                          className='dispatch-week-plan-rule-text'
                        >
                          Property template must already exist.
                        </Text>
                      </div>
                      <div className='dispatch-week-plan-rule-row'>
                        <Tag className='dispatch-week-plan-rule-index'>3</Tag>
                        <Text
                          type='secondary'
                          className='dispatch-week-plan-rule-text'
                        >
                          Address match uses Number + Street Name
                          (case-insensitive), then falls back to name.
                        </Text>
                      </div>
                      <div className='dispatch-week-plan-rule-row'>
                        <Tag className='dispatch-week-plan-rule-index'>4</Tag>
                        <Text
                          type='secondary'
                          className='dispatch-week-plan-rule-text'
                        >
                          Recommended: keep Number + Street Name aligned across
                          Dispatch customer address and Inspection template
                          address.
                        </Text>
                      </div>
                      <Divider className='dispatch-divider-compact dispatch-week-plan-rule-divider' />
                      <Text
                        type='secondary'
                        className='dispatch-week-plan-rule-footnote'
                      >
                        One-off jobs will not show inspection generation.
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
