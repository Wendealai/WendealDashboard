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

const { Text } = Typography;

const DEFAULT_MAP_CENTER: GeoPoint = { lat: -27.4698, lng: 153.0251 };
const GEO_CACHE_STORAGE_KEY = 'sparkery_dispatch_geocode_cache_v1';

interface DispatchMapPlannerProps {
  jobs: DispatchJob[];
  employees: DispatchEmployee[];
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
  onAssignJobsToEmployee,
}) => {
  const [messageApi, contextHolder] = message.useMessage();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const infoWindowRef = useRef<any | null>(null);
  const taskMarkersRef = useRef<any[]>([]);
  const employeeMarkersRef = useRef<any[]>([]);

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

  useEffect(() => {
    if (!isGoogleMapsConfigured()) {
      setMapError(
        'Google Maps API key is missing. Please configure VITE_GOOGLE_MAPS_API_KEY.'
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
          google?: { maps?: any };
        };
        const maps = runtime.google?.maps;
        if (!maps) {
          setMapError('Google Maps SDK loaded but maps object is unavailable.');
          return;
        }

        mapRef.current = new maps.Map(mapContainerRef.current, {
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
          error instanceof Error ? error.message : 'Failed to initialize map.'
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
          'Failed to geocode addresses. Please verify Google Maps setup and customer addresses.'
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
  }, [geocodeRetryVersion, jobCoords, mapReady, scopedExecutableJobs]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) {
      return;
    }

    const runtime = globalThis as typeof globalThis & {
      google?: { maps?: any };
    };
    const maps = runtime.google?.maps;
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
          <div style="min-width:220px">
            <div style="font-weight:600;margin-bottom:4px">${escapeHtml(job.title)}</div>
            <div><strong>Customer:</strong> ${escapeHtml(job.customerName || 'N/A')}</div>
            <div><strong>Time:</strong> ${escapeHtml(job.scheduledStartTime)} - ${escapeHtml(job.scheduledEndTime)}</div>
            <div><strong>Type:</strong> ${escapeHtml(job.serviceType)}</div>
            <div style="margin-top:4px"><strong>Address:</strong> ${escapeHtml(job.customerAddress || '')}</div>
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
          <div style="min-width:220px">
            <div style="font-weight:600;margin-bottom:4px">${escapeHtml(employee.name)}</div>
            <div><strong>Status:</strong> ${escapeHtml(employee.status)}</div>
            <div><strong>Updated:</strong> ${escapeHtml(dayjs(location.updatedAt).format('YYYY-MM-DD HH:mm:ss'))}</div>
            <div><strong>Source:</strong> ${escapeHtml(location.source)}</div>
            <div style="margin-top:4px"><strong>Coordinate:</strong> ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}</div>
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
  ]);

  const handleCopyLocationLink = async (employeeId?: string) => {
    const url = getLocationReportLink(employeeId);
    try {
      if (!navigator.clipboard?.writeText) {
        messageApi.warning(`Copy not supported. Open this link: ${url}`);
        return;
      }
      await navigator.clipboard.writeText(url);
      messageApi.success('Location report link copied');
    } catch {
      messageApi.error('Failed to copy location report link');
    }
  };

  const handleCalculateRoute = async () => {
    if (!selectedEmployeeId) {
      setRouteError('Please select an employee first');
      return;
    }
    if (selectedJobIds.length === 0) {
      setRouteError(
        'Please select at least one job from the "Selectable Jobs" list'
      );
      return;
    }

    const employee = employees.find(item => item.id === selectedEmployeeId);
    const employeeLocation = employee?.currentLocation;
    if (!employeeLocation) {
      setRouteError(
        'Employee location is missing. Ask the employee to report location first.'
      );
      return;
    }

    const selectedScopedJobs = selectedJobIds
      .map(jobId => scopedExecutableJobs.find(job => job.id === jobId))
      .filter((job): job is DispatchJob => Boolean(job));

    if (selectedScopedJobs.length !== selectedJobIds.length) {
      setRouteError(
        'Some selected jobs are not in current map scope anymore. Please reselect.'
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
          'Some selected jobs still cannot resolve address. Please fix address and retry.'
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
        setRouteError('Failed to build route order');
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
              `Employee location (${employeeLocation.lat.toFixed(5)}, ${employeeLocation.lng.toFixed(5)})`
            : ordered[index - 1]!.job.customerAddress ||
              ordered[index - 1]!.job.title;
        const stepDestinationLabel = item.job.customerAddress || item.job.title;
        const navigationUrl = buildGoogleNavigationUrl(stepOrigin, item.point);
        return {
          jobId: item.job.id,
          title: item.job.title,
          customerName: item.job.customerName || 'N/A',
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
        setRouteError('Failed to build navigation URL');
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
        nextCommuteDistanceText: steps[0]?.distanceText || 'N/A',
        nextCommuteDurationText: steps[0]?.durationText || 'N/A',
        overviewNavigationUrl,
      });
    } catch {
      setRouteError('Route calculation failed. Please retry.');
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
      `Assigned ${routeResult.orderedJobIds.length} jobs to ${
        selectedEmployee?.name || 'employee'
      }`
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
      title='Dispatch Map Planner (MVP)'
      extra={
        <Space size={8} wrap>
          <Segmented
            size='small'
            value={mapScope}
            options={[
              { label: 'Today', value: 'today' },
              { label: 'Week', value: 'week' },
            ]}
            onChange={value => setMapScope(value as MapScope)}
          />
          <Tag color='blue'>Jobs in scope: {scopedExecutableJobs.length}</Tag>
          <Tag color='green'>
            Employees located: {employeesWithLocation.length}
          </Tag>
        </Space>
      }
    >
      {contextHolder}
      {!isGoogleMapsConfigured() && (
        <Alert
          type='warning'
          showIcon
          message='Google Maps is not configured'
          description='Set VITE_GOOGLE_MAPS_API_KEY, then refresh the page to enable map pins and routing.'
          style={{ marginBottom: 12 }}
        />
      )}
      {mapError && (
        <Alert
          type='error'
          showIcon
          message={mapError}
          style={{ marginBottom: 12 }}
        />
      )}
      {mapScope === 'today' && dateFilteredOutJobs.length > 0 && (
        <Alert
          type='info'
          showIcon
          message={`Today view hides ${dateFilteredOutJobs.length} jobs scheduled on other dates`}
          action={
            <Button size='small' onClick={() => setMapScope('week')}>
              Show Week
            </Button>
          }
          style={{ marginBottom: 12 }}
        />
      )}
      {executableJobsWithoutAddress.length > 0 && (
        <Alert
          type='warning'
          showIcon
          message={`${executableJobsWithoutAddress.length} executable jobs do not have customer address`}
          description='Jobs without an address cannot be pinned on the map.'
          style={{ marginBottom: 12 }}
        />
      )}
      {geocodeFailedJobs.length > 0 && (
        <Alert
          type='error'
          showIcon
          message={`${geocodeFailedJobs.length} jobs failed geocoding`}
          description={
            <Space direction='vertical' size={6}>
              {geocodeFailurePreview && (
                <Text type='secondary'>
                  Address sample: {geocodeFailurePreview}
                </Text>
              )}
              <Button
                size='small'
                onClick={() => setGeocodeRetryVersion(version => version + 1)}
              >
                Retry Geocoding
              </Button>
            </Space>
          }
          style={{ marginBottom: 12 }}
        />
      )}
      <Row gutter={12}>
        <Col xs={24} xl={15}>
          <div
            ref={mapContainerRef}
            style={{
              minHeight: 420,
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              background:
                'linear-gradient(135deg, rgba(249,250,251,1) 0%, rgba(243,244,246,1) 100%)',
            }}
          />
          <div style={{ marginTop: 8 }}>
            <Text type='secondary'>
              Scope jobs: {scopedExecutableJobs.length} | Pinned:{' '}
              {jobsWithCoords.length} | Waiting geocode:{' '}
              {jobsWithoutCoords.length}
            </Text>
            {geocodeLoading && (
              <Text type='secondary' style={{ marginLeft: 8 }}>
                Geocoding addresses...
              </Text>
            )}
          </div>
        </Col>
        <Col xs={24} xl={9}>
          <Space direction='vertical' size={10} style={{ width: '100%' }}>
            <Alert
              type='info'
              showIcon
              message='Employee location onboarding'
              description={
                <Space direction='vertical' size={6} style={{ width: '100%' }}>
                  <Text type='secondary'>
                    1) Send the location-report link to employee phone.
                  </Text>
                  <Text type='secondary'>
                    2) Employee opens the page and taps Report Current Location.
                  </Text>
                  <Text type='secondary'>
                    3) Refresh employees to see real-time map marker.
                  </Text>
                  <Space wrap>
                    <Button
                      size='small'
                      onClick={() => handleCopyLocationLink(selectedEmployeeId)}
                    >
                      Copy Location Link
                    </Button>
                    <Button
                      size='small'
                      type='link'
                      href={selectedEmployeeLocationUrl}
                      target='_blank'
                      rel='noreferrer'
                    >
                      Open Location Page
                    </Button>
                  </Space>
                </Space>
              }
            />

            {employeesWithoutLocation.length > 0 && (
              <Card size='small' title='Employees without location'>
                <List
                  size='small'
                  dataSource={employeesWithoutLocation}
                  renderItem={employee => (
                    <List.Item
                      actions={[
                        <Button
                          key='copy'
                          size='small'
                          onClick={() => handleCopyLocationLink(employee.id)}
                        >
                          Copy Link
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
              placeholder='Select employee (location required for route)'
              value={selectedEmployeeId}
              onChange={value => {
                setSelectedEmployeeId(value);
                setRouteResult(null);
                setRouteError('');
              }}
              options={employees.map(employee => ({
                value: employee.id,
                label: `${employee.name}${employee.currentLocation ? ' (located)' : ' (no location)'}`,
              }))}
            />
            <Select
              mode='multiple'
              placeholder='Select jobs to assign and route'
              value={selectedJobIds}
              onChange={values => {
                setSelectedJobIds(values);
                setRouteResult(null);
                setRouteError('');
              }}
              maxTagCount='responsive'
              options={scopedExecutableJobs.map(job => ({
                value: job.id,
                label: `${job.scheduledDate} ${job.scheduledStartTime} | ${
                  job.customerName || 'Customer'
                } | ${job.customerAddress}${jobCoords[job.id] ? '' : ' (waiting geocode)'}`,
              }))}
            />
            <Card size='small' title='Selectable Jobs'>
              {scopedExecutableJobs.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description='No jobs in current scope'
                />
              ) : (
                <div style={{ maxHeight: 220, overflow: 'auto' }}>
                  <Space
                    direction='vertical'
                    size={6}
                    style={{ width: '100%' }}
                  >
                    {scopedExecutableJobs.map(job => (
                      <div
                        key={job.id}
                        style={{
                          border: '1px solid #f0f0f0',
                          borderRadius: 6,
                          padding: '6px 8px',
                        }}
                      >
                        <Space align='start'>
                          <Checkbox
                            checked={selectedJobIds.includes(job.id)}
                            onChange={event =>
                              toggleSelectedJob(job.id, event.target.checked)
                            }
                          />
                          <div>
                            <Space size={6} wrap>
                              <Text strong>{job.title}</Text>
                              <Tag color='blue'>{job.scheduledDate}</Tag>
                              <Tag color='cyan'>{job.scheduledStartTime}</Tag>
                              <Tag
                                color={jobCoords[job.id] ? 'green' : 'orange'}
                              >
                                {jobCoords[job.id]
                                  ? 'Pinned'
                                  : 'Waiting Geocode'}
                              </Tag>
                            </Space>
                            <div>
                              <Text type='secondary'>
                                {job.customerName || 'Customer'} |{' '}
                                {job.customerAddress}
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
              onClick={handleCalculateRoute}
              loading={planningRoute}
              disabled={!isGoogleMapsConfigured()}
            >
              Calculate Recommended Route
            </Button>
            <Button
              onClick={handleAssignWithRoute}
              disabled={!routeResult || !selectedEmployeeId}
            >
              Assign Jobs by Route
            </Button>
            {routeError && <Alert type='error' showIcon message={routeError} />}
            {routeResult && (
              <>
                <Alert
                  type='info'
                  showIcon
                  message={`Next commute: ${routeResult.nextCommuteDistanceText} / ${routeResult.nextCommuteDurationText}`}
                  description={`Total route: ${routeResult.totalDistanceKm.toFixed(1)} km, around ${Math.round(routeResult.totalDurationMin)} mins`}
                />
                <Space size={8} wrap>
                  <Button
                    type='link'
                    href={routeResult.overviewNavigationUrl}
                    target='_blank'
                    rel='noreferrer'
                    style={{ paddingInline: 0 }}
                  >
                    Open Full Navigation
                  </Button>
                </Space>
                <Divider style={{ margin: '8px 0' }} />
                <List
                  size='small'
                  dataSource={routeResult.steps}
                  renderItem={(step, index) => (
                    <List.Item
                      actions={[
                        <a
                          key='nav'
                          href={step.navigationUrl}
                          target='_blank'
                          rel='noreferrer'
                        >
                          Navigate
                        </a>,
                      ]}
                    >
                      <List.Item.Meta
                        title={
                          <Space size={6}>
                            <Tag color='geekblue'>#{index + 1}</Tag>
                            <span>{step.title}</span>
                          </Space>
                        }
                        description={
                          <Space direction='vertical' size={0}>
                            <Text type='secondary'>
                              {step.customerName} | {step.serviceType} |{' '}
                              {step.scheduledTime}
                            </Text>
                            <Text type='secondary'>{step.customerAddress}</Text>
                            <Text type='secondary'>
                              From: {step.fromAddress}
                            </Text>
                            <Text type='secondary'>To: {step.toAddress}</Text>
                            <Text>
                              Commute: {step.distanceText} / {step.durationText}
                            </Text>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              </>
            )}
            {!routeResult && selectedJobs.length > 0 && (
              <Text type='secondary'>
                Selected {selectedJobs.length} jobs for route planning.
              </Text>
            )}
          </Space>
        </Col>
      </Row>
    </Card>
  );
};

export default DispatchMapPlanner;
