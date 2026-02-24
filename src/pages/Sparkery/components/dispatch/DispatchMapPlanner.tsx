import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Divider,
  Empty,
  List,
  Row,
  Segmented,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import dayjs from 'dayjs';
import type { DispatchEmployee, DispatchJob } from '../../dispatch/types';
import {
  buildGoogleNavigationUrl,
  estimateTravelBatch,
  geocodeAddress,
  isGoogleMapsConfigured,
  loadGoogleMapsSdk,
  type GeoPoint,
} from '@/services/googleMapsService';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

const DEFAULT_MAP_CENTER: GeoPoint = { lat: -27.4698, lng: 153.0251 };
const GEO_CACHE_STORAGE_KEY = 'sparkery_dispatch_geocode_cache_v1';

interface DispatchMapPlannerProps {
  jobs: DispatchJob[];
  employees: DispatchEmployee[];
  weekStart: string;
  onAssignJobsToEmployee: (
    jobIds: string[],
    employeeId: string
  ) => Promise<void>;
}

interface RouteStep {
  jobId: string;
  title: string;
  customerName: string;
  customerAddress: string;
  fromAddress: string;
  toAddress: string;
  scheduledTime: string;
  serviceType: DispatchJob['serviceType'];
  distanceKm: number;
  durationMin: number;
  distanceText: string;
  durationText: string;
  navigationUrl: string;
}

interface RoutePlanResult {
  orderedJobIds: string[];
  steps: RouteStep[];
  totalDistanceKm: number;
  totalDurationMin: number;
  nextCommuteDistanceText: string;
  nextCommuteDurationText: string;
  overviewNavigationUrl: string;
}

interface GeocodeCacheRecord {
  lat: number;
  lng: number;
  updatedAt: string;
}

type MapScope = 'today' | 'week';

interface MapLike {
  setCenter: (center: GeoPoint) => void;
  setZoom: (zoom: number) => void;
  fitBounds: (bounds: LatLngBoundsLike, padding?: number) => void;
}

interface InfoWindowLike {
  setContent: (content: string) => void;
  open: (options: { anchor: MarkerLike; map: MapLike }) => void;
}

interface MarkerLike {
  setMap: (map: MapLike | null) => void;
  addListener: (eventName: string, handler: () => void) => void;
}

interface LatLngBoundsLike {
  extend: (point: unknown) => void;
}

interface GoogleMapsRuntimeLike {
  Map: new (container: HTMLDivElement, options: unknown) => MapLike;
  InfoWindow: new () => InfoWindowLike;
  Marker: new (options: unknown) => MarkerLike;
  LatLngBounds: new () => LatLngBoundsLike;
  LatLng: new (lat: number, lng: number) => unknown;
  SymbolPath: {
    CIRCLE: unknown;
    BACKWARD_CLOSED_ARROW: unknown;
  };
}

const compareJobsBySchedule = (a: DispatchJob, b: DispatchJob): number => {
  if (a.scheduledDate !== b.scheduledDate) {
    return a.scheduledDate.localeCompare(b.scheduledDate);
  }
  if (a.scheduledStartTime !== b.scheduledStartTime) {
    return a.scheduledStartTime.localeCompare(b.scheduledStartTime);
  }
  return a.id.localeCompare(b.id);
};

const normalizeAddressKey = (value: string): string =>
  value.trim().toLowerCase();

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

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

const mapJobStatusForExecution = (status: DispatchJob['status']): boolean =>
  status !== 'completed' && status !== 'cancelled';

const areStringSetsEqual = (
  source: string[],
  targetSet: Set<string>
): boolean =>
  source.length === targetSet.size && source.every(item => targetSet.has(item));

const getLocationReportLink = (employeeId?: string): string => {
  const params = new URLSearchParams();
  if (employeeId) {
    params.set('employeeId', employeeId);
  }
  const query = params.toString();
  const basePath = `${window.location.origin}/dispatch-location-report`;
  return query ? `${basePath}?${query}` : basePath;
};

const DispatchMapPlanner: React.FC<DispatchMapPlannerProps> = ({
  jobs,
  employees,
  weekStart,
  onAssignJobsToEmployee,
}) => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLike | null>(null);
  const infoWindowRef = useRef<InfoWindowLike | null>(null);
  const taskMarkersRef = useRef<MarkerLike[]>([]);
  const employeeMarkersRef = useRef<MarkerLike[]>([]);

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState('');
  const [jobCoords, setJobCoords] = useState<Record<string, GeoPoint>>({});
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodeFailedJobIds, setGeocodeFailedJobIds] = useState<string[]>([]);
  const [geocodeRetryVersion, setGeocodeRetryVersion] = useState(0);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>();
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [planningRoute, setPlanningRoute] = useState(false);
  const [routeError, setRouteError] = useState('');
  const [routeResult, setRouteResult] = useState<RoutePlanResult | null>(null);
  const [mapScope, setMapScope] = useState<MapScope>('today');

  const todayText = dayjs().format('YYYY-MM-DD');
  const weekEnd = useMemo(
    () => dayjs(weekStart).add(6, 'day').format('YYYY-MM-DD'),
    [weekStart]
  );

  const executableJobs = useMemo(
    () => jobs.filter(job => mapJobStatusForExecution(job.status)),
    [jobs]
  );

  const executableJobsWithAddress = useMemo(
    () => executableJobs.filter(job => Boolean(job.customerAddress?.trim())),
    [executableJobs]
  );

  const executableJobsWithoutAddress = useMemo(
    () => executableJobs.filter(job => !job.customerAddress?.trim()),
    [executableJobs]
  );

  const scopedExecutableJobs = useMemo(() => {
    if (mapScope === 'week') {
      return executableJobsWithAddress;
    }
    return executableJobsWithAddress.filter(
      job => job.scheduledDate === todayText
    );
  }, [executableJobsWithAddress, mapScope, todayText]);

  const dateFilteredOutJobs = useMemo(() => {
    if (mapScope !== 'today') {
      return [];
    }
    return executableJobsWithAddress.filter(
      job => job.scheduledDate !== todayText
    );
  }, [executableJobsWithAddress, mapScope, todayText]);

  const jobsWithCoords = useMemo(
    () => scopedExecutableJobs.filter(job => Boolean(jobCoords[job.id])),
    [jobCoords, scopedExecutableJobs]
  );

  const jobsWithoutCoords = useMemo(
    () => scopedExecutableJobs.filter(job => !jobCoords[job.id]),
    [jobCoords, scopedExecutableJobs]
  );

  const geocodeFailedJobs = useMemo(
    () => jobsWithoutCoords.filter(job => geocodeFailedJobIds.includes(job.id)),
    [geocodeFailedJobIds, jobsWithoutCoords]
  );

  const employeesWithLocation = useMemo(
    () => employees.filter(employee => Boolean(employee.currentLocation)),
    [employees]
  );

  const employeesWithoutLocation = useMemo(
    () => employees.filter(employee => !employee.currentLocation),
    [employees]
  );

  const selectedEmployee = useMemo(
    () => employees.find(employee => employee.id === selectedEmployeeId),
    [employees, selectedEmployeeId]
  );

  const selectedJobs = useMemo(
    () =>
      selectedJobIds
        .map(jobId => scopedExecutableJobs.find(job => job.id === jobId))
        .filter((job): job is DispatchJob => Boolean(job)),
    [selectedJobIds, scopedExecutableJobs]
  );

  const selectedEmployeeLocationUrl = useMemo(
    () => getLocationReportLink(selectedEmployeeId),
    [selectedEmployeeId]
  );

  const weeklyAssignedJobsForEmployee = useMemo(() => {
    if (!selectedEmployeeId) {
      return [] as DispatchJob[];
    }
    return jobs
      .filter(
        job =>
          job.scheduledDate >= weekStart &&
          job.scheduledDate <= weekEnd &&
          mapJobStatusForExecution(job.status) &&
          Boolean(job.assignedEmployeeIds?.includes(selectedEmployeeId))
      )
      .sort(compareJobsBySchedule);
  }, [jobs, selectedEmployeeId, weekEnd, weekStart]);

  useEffect(() => {
    if (!isGoogleMapsConfigured()) {
      setMapError(
        t('sparkery.dispatch.mapPlanner.errors.googleMapsApiKeyMissing')
      );
      return;
    }

    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    let cancelled = false;
    loadGoogleMapsSdk()
      .then(() => {
        if (cancelled) {
          return;
        }

        const runtime = globalThis as typeof globalThis & {
          google?: { maps?: unknown };
        };
        const maps = runtime.google?.maps as GoogleMapsRuntimeLike | undefined;
        if (!maps) {
          setMapError(
            t('sparkery.dispatch.mapPlanner.errors.googleMapsObjectUnavailable')
          );
          return;
        }

        const mapContainer = mapContainerRef.current;
        if (!mapContainer) {
          return;
        }

        mapRef.current = new maps.Map(mapContainer, {
          center: DEFAULT_MAP_CENTER,
          zoom: 10,
          mapTypeControl: false,
          streetViewControl: false,
        });
        infoWindowRef.current = new maps.InfoWindow();
        setMapReady(true);
      })
      .catch(error => {
        setMapError(
          error instanceof Error
            ? error.message
            : t('sparkery.dispatch.mapPlanner.errors.initializeMapFailed')
        );
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    const validJobIds = new Set(scopedExecutableJobs.map(job => job.id));

    setSelectedJobIds(prev => {
      const next = prev.filter(jobId => validJobIds.has(jobId));
      return next.length === prev.length ? prev : next;
    });

    setGeocodeFailedJobIds(prev => {
      const next = prev.filter(jobId => validJobIds.has(jobId));
      return next.length === prev.length ? prev : next;
    });

    setRouteResult(null);
    setRouteError('');
  }, [scopedExecutableJobs]);

  useEffect(() => {
    if (!mapReady || scopedExecutableJobs.length === 0) {
      return;
    }

    const pendingJobs = scopedExecutableJobs.filter(job => !jobCoords[job.id]);
    if (pendingJobs.length === 0) {
      return;
    }

    let cancelled = false;
    setGeocodeLoading(true);

    const run = async () => {
      const cache = loadGeocodeCache();
      const nextCoords: Record<string, GeoPoint> = {};
      const unresolvedJobs: DispatchJob[] = [];

      pendingJobs.forEach(job => {
        const addressKey = normalizeAddressKey(job.customerAddress || '');
        const cached = cache[addressKey];
        if (cached) {
          nextCoords[job.id] = { lat: cached.lat, lng: cached.lng };
          return;
        }
        unresolvedJobs.push(job);
      });

      if (Object.keys(nextCoords).length > 0) {
        setJobCoords(prev => ({ ...prev, ...nextCoords }));
      }

      if (unresolvedJobs.length === 0) {
        return;
      }

      const updates: Record<string, GeoPoint> = {};
      const succeededJobIds = new Set<string>();
      const failedJobIds = new Set<string>();

      for (const job of unresolvedJobs) {
        if (cancelled) {
          return;
        }

        const address = job.customerAddress?.trim();
        if (!address) {
          failedJobIds.add(job.id);
          continue;
        }

        const point = await geocodeAddress(address);
        if (!point) {
          failedJobIds.add(job.id);
          continue;
        }

        succeededJobIds.add(job.id);
        updates[job.id] = point;
        cache[normalizeAddressKey(address)] = {
          lat: point.lat,
          lng: point.lng,
          updatedAt: new Date().toISOString(),
        };
      }

      if (cancelled) {
        return;
      }

      if (Object.keys(updates).length > 0) {
        setJobCoords(prev => ({ ...prev, ...updates }));
        saveGeocodeCache(cache);
      }

      setGeocodeFailedJobIds(prev => {
        const next = new Set(prev);
        unresolvedJobs.forEach(job => {
          if (succeededJobIds.has(job.id)) {
            next.delete(job.id);
          }
          if (failedJobIds.has(job.id)) {
            next.add(job.id);
          }
        });
        if (areStringSetsEqual(prev, next)) {
          return prev;
        }
        return Array.from(next);
      });
    };

    run()
      .catch(() => {
        setMapError(
          t('sparkery.dispatch.mapPlanner.errors.geocodeAddressesFailed')
        );
      })
      .finally(() => {
        if (!cancelled) {
          setGeocodeLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [geocodeRetryVersion, jobCoords, mapReady, scopedExecutableJobs, t]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) {
      return;
    }

    const runtime = globalThis as typeof globalThis & {
      google?: { maps?: unknown };
    };
    const maps = runtime.google?.maps as GoogleMapsRuntimeLike | undefined;
    if (!maps) {
      return;
    }

    taskMarkersRef.current.forEach(marker => marker.setMap(null));
    employeeMarkersRef.current.forEach(marker => marker.setMap(null));
    taskMarkersRef.current = [];
    employeeMarkersRef.current = [];

    const map = mapRef.current;
    const bounds = new maps.LatLngBounds();
    let hasMarker = false;

    scopedExecutableJobs.forEach(job => {
      const point = jobCoords[job.id];
      if (!point) {
        return;
      }

      const isSelected = selectedJobIds.includes(job.id);
      const marker = new maps.Marker({
        map,
        position: point,
        title: job.title,
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: isSelected ? 8 : 7,
          fillColor: isSelected ? '#ff7a45' : '#1677ff',
          fillOpacity: 0.95,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      marker.addListener('click', () => {
        if (!infoWindowRef.current) {
          return;
        }
        const html = `
          <div class="dispatch-map-infowindow">
            <div class="dispatch-map-infowindow-title">${escapeHtml(job.title)}</div>
            <div><strong>${escapeHtml(t('sparkery.dispatch.mapPlanner.infoWindow.customer'))}:</strong> ${escapeHtml(job.customerName || t('sparkery.dispatch.common.noCustomer'))}</div>
            <div><strong>${escapeHtml(t('sparkery.dispatch.mapPlanner.infoWindow.time'))}:</strong> ${escapeHtml(job.scheduledStartTime)} - ${escapeHtml(job.scheduledEndTime)}</div>
            <div><strong>${escapeHtml(t('sparkery.dispatch.mapPlanner.infoWindow.type'))}:</strong> ${escapeHtml(t(`sparkery.dispatch.common.serviceType.${job.serviceType}`))}</div>
            <div class="dispatch-map-infowindow-row-top"><strong>${escapeHtml(t('sparkery.dispatch.mapPlanner.infoWindow.address'))}:</strong> ${escapeHtml(job.customerAddress || '')}</div>
          </div>
        `;
        infoWindowRef.current.setContent(html);
        infoWindowRef.current.open({
          anchor: marker,
          map,
        });
      });

      taskMarkersRef.current.push(marker);
      bounds.extend(new maps.LatLng(point.lat, point.lng));
      hasMarker = true;
    });

    employeesWithLocation.forEach(employee => {
      const location = employee.currentLocation;
      if (!location) {
        return;
      }

      const marker = new maps.Marker({
        map,
        position: { lat: location.lat, lng: location.lng },
        title: employee.name,
        label: {
          text: employee.name
            .split(' ')
            .filter(Boolean)
            .map(part => part[0])
            .join(''),
          color: '#0b7a0b',
          fontWeight: '700',
          fontSize: '11px',
        },
        icon: {
          path: maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: '#52c41a',
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 1.5,
        },
      });

      marker.addListener('click', () => {
        if (!infoWindowRef.current) {
          return;
        }
        const html = `
          <div class="dispatch-map-infowindow">
            <div class="dispatch-map-infowindow-title">${escapeHtml(employee.name)}</div>
            <div><strong>${escapeHtml(t('sparkery.dispatch.mapPlanner.infoWindow.status'))}:</strong> ${escapeHtml(t(`sparkery.dispatch.adminSetup.employeeStatus.${employee.status}`))}</div>
            <div><strong>${escapeHtml(t('sparkery.dispatch.mapPlanner.infoWindow.updated'))}:</strong> ${escapeHtml(dayjs(location.updatedAt).format('YYYY-MM-DD HH:mm:ss'))}</div>
            <div><strong>${escapeHtml(t('sparkery.dispatch.mapPlanner.infoWindow.source'))}:</strong> ${escapeHtml(location.source)}</div>
            <div class="dispatch-map-infowindow-row-top"><strong>${escapeHtml(t('sparkery.dispatch.mapPlanner.infoWindow.coordinate'))}:</strong> ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}</div>
          </div>
        `;
        infoWindowRef.current.setContent(html);
        infoWindowRef.current.open({
          anchor: marker,
          map,
        });
      });

      employeeMarkersRef.current.push(marker);
      bounds.extend(new maps.LatLng(location.lat, location.lng));
      hasMarker = true;
    });

    if (!hasMarker) {
      map.setCenter(DEFAULT_MAP_CENTER);
      map.setZoom(10);
      return;
    }

    map.fitBounds(bounds, 48);
    if (scopedExecutableJobs.length + employeesWithLocation.length <= 1) {
      map.setZoom(13);
    }
  }, [
    employeesWithLocation,
    jobCoords,
    mapReady,
    scopedExecutableJobs,
    selectedJobIds,
    t,
  ]);

  const handleCopyLocationLink = async (employeeId?: string) => {
    const url = getLocationReportLink(employeeId);
    try {
      if (!navigator.clipboard?.writeText) {
        messageApi.warning(
          t('sparkery.dispatch.mapPlanner.messages.copyNotSupported', { url })
        );
        return;
      }
      await navigator.clipboard.writeText(url);
      messageApi.success(
        t('sparkery.dispatch.mapPlanner.messages.locationLinkCopied')
      );
    } catch {
      messageApi.error(
        t('sparkery.dispatch.mapPlanner.messages.copyLocationLinkFailed')
      );
    }
  };

  const handleCalculateRoute = async () => {
    if (!selectedEmployeeId) {
      setRouteError(
        t('sparkery.dispatch.mapPlanner.messages.selectEmployeeFirst')
      );
      return;
    }
    if (selectedJobIds.length === 0) {
      setRouteError(
        t('sparkery.dispatch.mapPlanner.messages.selectAtLeastOneJob')
      );
      return;
    }

    const employee = employees.find(item => item.id === selectedEmployeeId);
    const employeeLocation = employee?.currentLocation;
    if (!employeeLocation) {
      setRouteError(
        t('sparkery.dispatch.mapPlanner.messages.employeeLocationMissing')
      );
      return;
    }

    const selectedScopedJobs = selectedJobIds
      .map(jobId => scopedExecutableJobs.find(job => job.id === jobId))
      .filter((job): job is DispatchJob => Boolean(job));

    if (selectedScopedJobs.length !== selectedJobIds.length) {
      setRouteError(
        t('sparkery.dispatch.mapPlanner.messages.selectedJobsOutOfScope')
      );
      return;
    }

    setPlanningRoute(true);
    setRouteError('');
    setRouteResult(null);

    try {
      const resolvedPoints: Record<string, GeoPoint> = {};
      const updates: Record<string, GeoPoint> = {};
      const failedJobIds = new Set<string>();
      const resolvedJobIds = new Set<string>();
      const cache = loadGeocodeCache();

      for (const job of selectedScopedJobs) {
        const existingPoint = jobCoords[job.id];
        if (existingPoint) {
          resolvedPoints[job.id] = existingPoint;
          resolvedJobIds.add(job.id);
          continue;
        }

        const address = job.customerAddress?.trim();
        if (!address) {
          failedJobIds.add(job.id);
          continue;
        }

        const addressKey = normalizeAddressKey(address);
        const cached = cache[addressKey];
        if (cached) {
          const point = { lat: cached.lat, lng: cached.lng };
          resolvedPoints[job.id] = point;
          updates[job.id] = point;
          resolvedJobIds.add(job.id);
          continue;
        }

        const point = await geocodeAddress(address);
        if (!point) {
          failedJobIds.add(job.id);
          continue;
        }

        resolvedPoints[job.id] = point;
        updates[job.id] = point;
        resolvedJobIds.add(job.id);
        cache[addressKey] = {
          lat: point.lat,
          lng: point.lng,
          updatedAt: new Date().toISOString(),
        };
      }

      if (Object.keys(updates).length > 0) {
        setJobCoords(prev => ({ ...prev, ...updates }));
        saveGeocodeCache(cache);
      }

      setGeocodeFailedJobIds(prev => {
        const next = new Set(prev);
        selectedScopedJobs.forEach(job => {
          if (resolvedJobIds.has(job.id)) {
            next.delete(job.id);
          }
          if (failedJobIds.has(job.id)) {
            next.add(job.id);
          }
        });
        if (areStringSetsEqual(prev, next)) {
          return prev;
        }
        return Array.from(next);
      });

      if (failedJobIds.size > 0) {
        setRouteError(
          t(
            'sparkery.dispatch.mapPlanner.messages.selectedJobsAddressUnresolved'
          )
        );
        return;
      }

      const candidateJobs = selectedScopedJobs
        .map(job => {
          const point = resolvedPoints[job.id];
          return point ? { job, point } : null;
        })
        .filter((item): item is { job: DispatchJob; point: GeoPoint } =>
          Boolean(item)
        );

      const remaining = [...candidateJobs];
      const ordered: Array<{
        job: DispatchJob;
        point: GeoPoint;
        distanceKm: number;
        durationMin: number;
        distanceText: string;
        durationText: string;
      }> = [];

      let currentPoint: GeoPoint = {
        lat: employeeLocation.lat,
        lng: employeeLocation.lng,
      };

      while (remaining.length > 0) {
        const estimates = await estimateTravelBatch(
          currentPoint,
          remaining.map(item => item.point)
        );
        let bestIndex = 0;
        let bestDuration = Number.POSITIVE_INFINITY;

        estimates.forEach((estimate, index) => {
          if (estimate.durationMin < bestDuration) {
            bestDuration = estimate.durationMin;
            bestIndex = index;
          }
        });

        const next = remaining[bestIndex];
        const nextEstimate = estimates[bestIndex];
        if (!next || !nextEstimate) {
          break;
        }

        ordered.push({
          job: next.job,
          point: next.point,
          distanceKm: nextEstimate.distanceKm,
          durationMin: nextEstimate.durationMin,
          distanceText: nextEstimate.distanceText,
          durationText: nextEstimate.durationText,
        });

        currentPoint = next.point;
        remaining.splice(bestIndex, 1);
      }

      if (ordered.length === 0) {
        setRouteError(
          t('sparkery.dispatch.mapPlanner.messages.buildRouteOrderFailed')
        );
        return;
      }

      const steps: RouteStep[] = ordered.map((item, index) => {
        const stepOrigin =
          index === 0
            ? { lat: employeeLocation.lat, lng: employeeLocation.lng }
            : ordered[index - 1]!.point;
        const stepOriginLabel =
          index === 0
            ? employeeLocation.label ||
              t(
                'sparkery.dispatch.mapPlanner.messages.employeeLocationCoordinates',
                {
                  lat: employeeLocation.lat.toFixed(5),
                  lng: employeeLocation.lng.toFixed(5),
                }
              )
            : ordered[index - 1]!.job.customerAddress ||
              ordered[index - 1]!.job.title;
        const stepDestinationLabel = item.job.customerAddress || item.job.title;
        const navigationUrl = buildGoogleNavigationUrl(stepOrigin, item.point);
        return {
          jobId: item.job.id,
          title: item.job.title,
          customerName:
            item.job.customerName ||
            t('sparkery.dispatch.mapPlanner.common.na'),
          customerAddress: item.job.customerAddress || '',
          fromAddress: stepOriginLabel,
          toAddress: stepDestinationLabel,
          scheduledTime: `${item.job.scheduledStartTime} - ${item.job.scheduledEndTime}`,
          serviceType: item.job.serviceType,
          distanceKm: item.distanceKm,
          durationMin: item.durationMin,
          distanceText: item.distanceText,
          durationText: item.durationText,
          navigationUrl,
        };
      });

      const totalDistanceKm = steps.reduce(
        (sum, step) => sum + step.distanceKm,
        0
      );
      const totalDurationMin = steps.reduce(
        (sum, step) => sum + step.durationMin,
        0
      );

      const routePoints = ordered.map(item => item.point);
      const destination = routePoints[routePoints.length - 1];
      if (!destination) {
        setRouteError(
          t('sparkery.dispatch.mapPlanner.messages.buildNavigationUrlFailed')
        );
        return;
      }
      const waypoints = routePoints.slice(0, -1);
      const overviewNavigationUrl = buildGoogleNavigationUrl(
        {
          lat: employeeLocation.lat,
          lng: employeeLocation.lng,
        },
        destination,
        waypoints
      );

      setSelectedJobIds(ordered.map(item => item.job.id));
      setRouteResult({
        orderedJobIds: ordered.map(item => item.job.id),
        steps,
        totalDistanceKm,
        totalDurationMin,
        nextCommuteDistanceText:
          steps[0]?.distanceText || t('sparkery.dispatch.mapPlanner.common.na'),
        nextCommuteDurationText:
          steps[0]?.durationText || t('sparkery.dispatch.mapPlanner.common.na'),
        overviewNavigationUrl,
      });
    } catch {
      setRouteError(
        t('sparkery.dispatch.mapPlanner.messages.routeCalculationFailed')
      );
    } finally {
      setPlanningRoute(false);
    }
  };

  const handleAssignWithRoute = async () => {
    if (!selectedEmployeeId || !routeResult) {
      return;
    }

    await onAssignJobsToEmployee(routeResult.orderedJobIds, selectedEmployeeId);
    messageApi.success(
      t('sparkery.dispatch.mapPlanner.messages.assignedJobsToEmployee', {
        count: routeResult.orderedJobIds.length,
        employee:
          selectedEmployee?.name ||
          t('sparkery.dispatch.mapPlanner.common.employee'),
      })
    );
  };

  const handleGenerateWeeklyPlanLink = async () => {
    if (!selectedEmployeeId) {
      messageApi.warning(
        t('sparkery.dispatch.mapPlanner.messages.selectEmployeeFirst')
      );
      return;
    }

    const assignedIds = weeklyAssignedJobsForEmployee.map(job => job.id);
    const assignedIdSet = new Set(assignedIds);

    const routeOrderedAssignedIds = (routeResult?.orderedJobIds || []).filter(
      id => assignedIdSet.has(id)
    );
    const selectedAssignedIds = selectedJobIds.filter(id =>
      assignedIdSet.has(id)
    );

    let orderedJobIds = Array.from(
      new Set([
        ...routeOrderedAssignedIds,
        ...selectedAssignedIds,
        ...assignedIds,
      ])
    );

    if (orderedJobIds.length === 0) {
      const fallbackSelectedIds =
        routeResult?.orderedJobIds && routeResult.orderedJobIds.length > 0
          ? routeResult.orderedJobIds
          : selectedJobIds;
      orderedJobIds = Array.from(new Set(fallbackSelectedIds));
      if (orderedJobIds.length > 0) {
        messageApi.info(
          t(
            'sparkery.dispatch.mapPlanner.messages.noAssignedWeeklyJobsFallback'
          )
        );
      }
    }

    if (orderedJobIds.length === 0) {
      messageApi.warning(
        t('sparkery.dispatch.mapPlanner.messages.selectAtLeastOneJob')
      );
      return;
    }

    const params = new URLSearchParams({
      employeeId: selectedEmployeeId,
      jobIds: orderedJobIds.join(','),
      weekStart,
      weekEnd,
    });

    const url = `${window.location.origin}/dispatch-week-plan?${params.toString()}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      // Ignore clipboard failures; still open link.
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    messageApi.success(
      t('sparkery.dispatch.mapPlanner.messages.weeklyPlanLinkGenerated')
    );
  };

  const handleGenerateEmployeeTasksLink = async () => {
    if (!selectedEmployeeId) {
      messageApi.warning(
        t('sparkery.dispatch.mapPlanner.messages.selectEmployeeFirst')
      );
      return;
    }

    const orderedJobIds = Array.from(
      new Set([
        ...(routeResult?.orderedJobIds || []),
        ...selectedJobIds,
        ...weeklyAssignedJobsForEmployee.map(job => job.id),
      ])
    );

    const params = new URLSearchParams({
      employeeId: selectedEmployeeId,
      weekStart,
      weekEnd,
    });
    if (orderedJobIds.length > 0) {
      params.set('jobIds', orderedJobIds.join(','));
    }

    const url = `${window.location.origin}/dispatch-employee-tasks?${params.toString()}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      // Ignore clipboard failures; still open link.
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    messageApi.success(
      t('sparkery.dispatch.mapPlanner.messages.employeeTasksLinkGenerated')
    );
  };

  const geocodeFailurePreview = geocodeFailedJobs
    .slice(0, 2)
    .map(job => job.customerAddress)
    .filter(Boolean)
    .join(' | ');

  const toggleSelectedJob = (jobId: string, checked: boolean): void => {
    setSelectedJobIds(prev => {
      if (checked) {
        if (prev.includes(jobId)) {
          return prev;
        }
        return [...prev, jobId];
      }
      return prev.filter(item => item !== jobId);
    });
    setRouteResult(null);
    setRouteError('');
  };

  return (
    <Card
      size='small'
      className='dispatch-map-planner-card'
      title={t('sparkery.dispatch.mapPlanner.title')}
      extra={
        <Space size={8} wrap className='dispatch-map-planner-top-tags'>
          <Segmented
            size='small'
            className='dispatch-map-planner-scope-toggle'
            value={mapScope}
            options={[
              {
                label: t('sparkery.dispatch.mapPlanner.scope.today'),
                value: 'today',
              },
              {
                label: t('sparkery.dispatch.mapPlanner.scope.week'),
                value: 'week',
              },
            ]}
            onChange={value => setMapScope(value as MapScope)}
          />
          <Tag color='blue' className='dispatch-map-planner-top-tag'>
            {t('sparkery.dispatch.mapPlanner.tags.jobsInScope', {
              count: scopedExecutableJobs.length,
            })}
          </Tag>
          <Tag color='green' className='dispatch-map-planner-top-tag'>
            {t('sparkery.dispatch.mapPlanner.tags.employeesLocated', {
              count: employeesWithLocation.length,
            })}
          </Tag>
        </Space>
      }
    >
      {contextHolder}
      {!isGoogleMapsConfigured() && (
        <Alert
          className='dispatch-map-planner-alert dispatch-map-planner-alert-warning'
          type='warning'
          showIcon
          message={t(
            'sparkery.dispatch.mapPlanner.alerts.googleMapsNotConfigured'
          )}
          description={t(
            'sparkery.dispatch.mapPlanner.alerts.googleMapsNotConfiguredDesc'
          )}
        />
      )}
      {mapError && (
        <Alert
          className='dispatch-map-planner-alert dispatch-map-planner-alert-error'
          type='error'
          showIcon
          message={mapError}
        />
      )}
      {mapScope === 'today' && dateFilteredOutJobs.length > 0 && (
        <Alert
          className='dispatch-map-planner-alert dispatch-map-planner-alert-info'
          type='info'
          showIcon
          message={t('sparkery.dispatch.mapPlanner.alerts.todayHidesJobs', {
            count: dateFilteredOutJobs.length,
          })}
          action={
            <Button size='small' onClick={() => setMapScope('week')}>
              {t('sparkery.dispatch.mapPlanner.actions.showWeek')}
            </Button>
          }
        />
      )}
      {executableJobsWithoutAddress.length > 0 && (
        <Alert
          className='dispatch-map-planner-alert dispatch-map-planner-alert-warning'
          type='warning'
          showIcon
          message={t('sparkery.dispatch.mapPlanner.alerts.jobsMissingAddress', {
            count: executableJobsWithoutAddress.length,
          })}
          description={t(
            'sparkery.dispatch.mapPlanner.alerts.jobsMissingAddressDesc'
          )}
        />
      )}
      {geocodeFailedJobs.length > 0 && (
        <Alert
          className='dispatch-map-planner-alert dispatch-map-planner-alert-error'
          type='error'
          showIcon
          message={t('sparkery.dispatch.mapPlanner.alerts.jobsGeocodeFailed', {
            count: geocodeFailedJobs.length,
          })}
          description={
            <Space direction='vertical' size={6}>
              {geocodeFailurePreview && (
                <Text type='secondary'>
                  {t('sparkery.dispatch.mapPlanner.alerts.addressSample', {
                    value: geocodeFailurePreview,
                  })}
                </Text>
              )}
              <Button
                size='small'
                onClick={() => setGeocodeRetryVersion(version => version + 1)}
              >
                {t('sparkery.dispatch.mapPlanner.actions.retryGeocoding')}
              </Button>
            </Space>
          }
        />
      )}
      <Row gutter={12} className='dispatch-map-planner-row'>
        <Col xs={24} xl={15}>
          <div ref={mapContainerRef} className='dispatch-map-planner-canvas' />
          <div className='dispatch-map-planner-stats'>
            <Text type='secondary' className='dispatch-map-planner-stats-text'>
              {t('sparkery.dispatch.mapPlanner.stats.summary', {
                scope: scopedExecutableJobs.length,
                pinned: jobsWithCoords.length,
                waiting: jobsWithoutCoords.length,
              })}
            </Text>
            {geocodeLoading && (
              <Text type='secondary' className='dispatch-map-planner-geocode'>
                {t('sparkery.dispatch.mapPlanner.stats.geocodingAddresses')}
              </Text>
            )}
          </div>
        </Col>
        <Col xs={24} xl={9}>
          <Space
            direction='vertical'
            size={10}
            className='dispatch-map-planner-side'
          >
            <Alert
              type='info'
              showIcon
              className='dispatch-map-planner-onboarding-alert'
              message={t('sparkery.dispatch.mapPlanner.onboarding.title')}
              description={
                <Space
                  direction='vertical'
                  size={6}
                  className='dispatch-map-planner-side-content'
                >
                  <Text
                    type='secondary'
                    className='dispatch-map-planner-onboarding-step'
                  >
                    {t('sparkery.dispatch.mapPlanner.onboarding.step1')}
                  </Text>
                  <Text
                    type='secondary'
                    className='dispatch-map-planner-onboarding-step'
                  >
                    {t('sparkery.dispatch.mapPlanner.onboarding.step2')}
                  </Text>
                  <Text
                    type='secondary'
                    className='dispatch-map-planner-onboarding-step'
                  >
                    {t('sparkery.dispatch.mapPlanner.onboarding.step3')}
                  </Text>
                  <Space wrap>
                    <Button
                      size='small'
                      className='dispatch-map-planner-link-btn'
                      onClick={() => handleCopyLocationLink(selectedEmployeeId)}
                    >
                      {t(
                        'sparkery.dispatch.mapPlanner.actions.copyLocationLink'
                      )}
                    </Button>
                    <Button
                      size='small'
                      type='link'
                      href={selectedEmployeeLocationUrl}
                      target='_blank'
                      rel='noreferrer'
                      className='dispatch-map-planner-link-open'
                    >
                      {t(
                        'sparkery.dispatch.mapPlanner.actions.openLocationPage'
                      )}
                    </Button>
                  </Space>
                </Space>
              }
            />

            {employeesWithoutLocation.length > 0 && (
              <Card
                size='small'
                title={t(
                  'sparkery.dispatch.mapPlanner.employeesWithoutLocation.title'
                )}
                className='dispatch-map-planner-unlocated-card'
              >
                <List
                  size='small'
                  className='dispatch-map-planner-unlocated-list'
                  dataSource={employeesWithoutLocation}
                  renderItem={employee => (
                    <List.Item
                      className='dispatch-map-planner-unlocated-item'
                      actions={[
                        <Button
                          key='copy'
                          size='small'
                          className='dispatch-map-planner-link-btn'
                          onClick={() => handleCopyLocationLink(employee.id)}
                        >
                          {t('sparkery.dispatch.mapPlanner.actions.copyLink')}
                        </Button>,
                      ]}
                    >
                      <Text>{employee.name}</Text>
                    </List.Item>
                  )}
                />
              </Card>
            )}

            <Select
              className='dispatch-map-planner-select dispatch-map-planner-full-width dispatch-map-planner-employee-select'
              classNames={{
                popup: { root: 'dispatch-map-planner-select-popup' },
              }}
              placeholder={t(
                'sparkery.dispatch.mapPlanner.placeholders.selectEmployee'
              )}
              value={selectedEmployeeId}
              onChange={value => {
                setSelectedEmployeeId(value);
                setRouteResult(null);
                setRouteError('');
              }}
              options={employees.map(employee => ({
                value: employee.id,
                label: `${employee.name}${
                  employee.currentLocation
                    ? t(
                        'sparkery.dispatch.mapPlanner.employeeLocationSuffix.located'
                      )
                    : t(
                        'sparkery.dispatch.mapPlanner.employeeLocationSuffix.noLocation'
                      )
                }`,
              }))}
            />
            <Select
              className='dispatch-map-planner-job-select dispatch-map-planner-full-width dispatch-map-planner-job-picker'
              classNames={{
                popup: { root: 'dispatch-map-planner-job-select-popup' },
              }}
              mode='multiple'
              placeholder={t(
                'sparkery.dispatch.mapPlanner.placeholders.selectJobs'
              )}
              value={selectedJobIds}
              onChange={values => {
                setSelectedJobIds(values);
                setRouteResult(null);
                setRouteError('');
              }}
              popupMatchSelectWidth={false}
              maxTagCount='responsive'
              options={scopedExecutableJobs.map(job => ({
                value: job.id,
                label: `${job.scheduledDate} ${job.scheduledStartTime} | ${
                  job.customerName || t('sparkery.dispatch.common.customer')
                } | ${job.customerAddress}${
                  jobCoords[job.id]
                    ? ''
                    : t('sparkery.dispatch.mapPlanner.jobSuffix.waitingGeocode')
                }`,
              }))}
            />
            <Card
              size='small'
              title={t('sparkery.dispatch.mapPlanner.selectableJobsTitle')}
              className='dispatch-map-planner-jobs-card'
            >
              {scopedExecutableJobs.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={t('sparkery.dispatch.mapPlanner.noJobsInScope')}
                />
              ) : (
                <div className='dispatch-map-planner-job-scroll'>
                  <Space
                    direction='vertical'
                    size={6}
                    className='dispatch-map-planner-job-list'
                  >
                    {scopedExecutableJobs.map(job => (
                      <div
                        key={job.id}
                        className='dispatch-map-planner-job-item'
                      >
                        <Space
                          align='start'
                          className='dispatch-map-planner-job-line'
                        >
                          <Checkbox
                            checked={selectedJobIds.includes(job.id)}
                            onChange={event =>
                              toggleSelectedJob(job.id, event.target.checked)
                            }
                          />
                          <div>
                            <Space size={6} wrap>
                              <Text
                                strong
                                className='dispatch-map-planner-job-title'
                              >
                                {job.title}
                              </Text>
                              <Tag
                                color='blue'
                                className='dispatch-map-planner-job-tag'
                              >
                                {job.scheduledDate}
                              </Tag>
                              <Tag
                                color='cyan'
                                className='dispatch-map-planner-job-tag'
                              >
                                {job.scheduledStartTime}
                              </Tag>
                              <Tag
                                color={jobCoords[job.id] ? 'green' : 'orange'}
                                className='dispatch-map-planner-job-tag'
                              >
                                {jobCoords[job.id]
                                  ? t('sparkery.dispatch.mapPlanner.jobPinned')
                                  : t(
                                      'sparkery.dispatch.mapPlanner.jobWaitingGeocode'
                                    )}
                              </Tag>
                            </Space>
                            <div>
                              <Text
                                type='secondary'
                                className='dispatch-map-planner-job-meta'
                              >
                                {job.customerName ||
                                  t('sparkery.dispatch.common.customer')}{' '}
                                | {job.customerAddress}
                              </Text>
                            </div>
                          </div>
                        </Space>
                      </div>
                    ))}
                  </Space>
                </div>
              )}
            </Card>
            <Button
              type='primary'
              className='dispatch-map-planner-action-btn dispatch-map-planner-action-btn-primary'
              onClick={handleCalculateRoute}
              loading={planningRoute}
              disabled={!isGoogleMapsConfigured()}
            >
              {t(
                'sparkery.dispatch.mapPlanner.actions.calculateRecommendedRoute'
              )}
            </Button>
            <Button
              className='dispatch-map-planner-action-btn'
              onClick={handleAssignWithRoute}
              disabled={!routeResult || !selectedEmployeeId}
            >
              {t('sparkery.dispatch.mapPlanner.actions.assignJobsByRoute')}
            </Button>
            <Button
              className='dispatch-map-planner-action-btn'
              onClick={handleGenerateWeeklyPlanLink}
              disabled={!selectedEmployeeId}
            >
              {t('sparkery.dispatch.mapPlanner.actions.generateWeeklyPlanLink')}
            </Button>
            <Button
              className='dispatch-map-planner-action-btn'
              onClick={handleGenerateEmployeeTasksLink}
              disabled={!selectedEmployeeId}
            >
              {t(
                'sparkery.dispatch.mapPlanner.actions.generateEmployeeTasksLink'
              )}
            </Button>
            {routeError && (
              <Alert
                type='error'
                showIcon
                className='dispatch-map-planner-route-alert dispatch-map-planner-route-alert-error'
                message={routeError}
              />
            )}
            {routeResult && (
              <>
                <Alert
                  type='info'
                  showIcon
                  className='dispatch-map-planner-route-alert dispatch-map-planner-route-alert-info'
                  message={t('sparkery.dispatch.mapPlanner.route.nextCommute', {
                    distance: routeResult.nextCommuteDistanceText,
                    duration: routeResult.nextCommuteDurationText,
                  })}
                  description={t(
                    'sparkery.dispatch.mapPlanner.route.totalRoute',
                    {
                      distance: routeResult.totalDistanceKm.toFixed(1),
                      duration: Math.round(routeResult.totalDurationMin),
                    }
                  )}
                />
                <Space size={8} wrap>
                  <Button
                    type='link'
                    href={routeResult.overviewNavigationUrl}
                    target='_blank'
                    rel='noreferrer'
                    className='dispatch-link-button-inline'
                  >
                    {t(
                      'sparkery.dispatch.mapPlanner.actions.openFullNavigation'
                    )}
                  </Button>
                </Space>
                <Divider className='dispatch-divider-compact' />
                <List
                  size='small'
                  className='dispatch-map-planner-route-list'
                  dataSource={routeResult.steps}
                  renderItem={(step, index) => (
                    <List.Item
                      className='dispatch-map-planner-route-item'
                      actions={[
                        <a
                          key='nav'
                          href={step.navigationUrl}
                          target='_blank'
                          rel='noreferrer'
                        >
                          {t('sparkery.dispatch.mapPlanner.actions.navigate')}
                        </a>,
                      ]}
                    >
                      <List.Item.Meta
                        title={
                          <Space
                            size={6}
                            className='dispatch-map-planner-route-item-title'
                          >
                            <Tag
                              color='geekblue'
                              className='dispatch-map-planner-route-step-tag'
                            >
                              #{index + 1}
                            </Tag>
                            <span className='dispatch-map-planner-route-item-name'>
                              {step.title}
                            </span>
                          </Space>
                        }
                        description={
                          <div className='dispatch-map-planner-route-item-desc'>
                            <Space
                              size={[6, 4]}
                              wrap
                              className='dispatch-map-planner-route-item-meta'
                            >
                              <Text className='dispatch-map-planner-route-item-customer'>
                                {step.customerName}
                              </Text>
                              <Tag className='dispatch-map-planner-route-item-service-tag'>
                                {t(
                                  `sparkery.dispatch.common.serviceType.${step.serviceType}`
                                )}
                              </Tag>
                              <Tag className='dispatch-map-planner-route-item-time-tag'>
                                {step.scheduledTime}
                              </Tag>
                            </Space>
                            <Text
                              type='secondary'
                              className='dispatch-map-planner-route-item-address'
                            >
                              {step.customerAddress}
                            </Text>
                            <div className='dispatch-map-planner-route-item-leg'>
                              <Text
                                type='secondary'
                                className='dispatch-map-planner-route-item-leg-from'
                              >
                                {t('sparkery.dispatch.mapPlanner.route.from', {
                                  value: step.fromAddress,
                                })}
                              </Text>
                              <Text
                                type='secondary'
                                className='dispatch-map-planner-route-item-leg-to'
                              >
                                {t('sparkery.dispatch.mapPlanner.route.to', {
                                  value: step.toAddress,
                                })}
                              </Text>
                            </div>
                            <Text className='dispatch-map-planner-route-item-commute'>
                              {t('sparkery.dispatch.mapPlanner.route.commute', {
                                distance: step.distanceText,
                                duration: step.durationText,
                              })}
                            </Text>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              </>
            )}
            {!routeResult && selectedJobs.length > 0 && (
              <Text
                type='secondary'
                className='dispatch-map-planner-selection-hint'
              >
                {t('sparkery.dispatch.mapPlanner.selectionHint', {
                  count: selectedJobs.length,
                })}
              </Text>
            )}
          </Space>
        </Col>
      </Row>
    </Card>
  );
};

export default DispatchMapPlanner;
