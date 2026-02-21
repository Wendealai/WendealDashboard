export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface TravelEstimate {
  distanceKm: number;
  durationMin: number;
  distanceText: string;
  durationText: string;
  source: 'google' | 'fallback';
}

type GoogleMapsRuntime = typeof globalThis & {
  google?: {
    maps?: any;
  };
  __WENDEAL_GOOGLE_MAPS_CONFIG__?: {
    apiKey?: string;
  };
  __WENDEAL_GOOGLE_MAPS_API_KEY__?: string;
};

const GOOGLE_MAPS_SCRIPT_ID = 'wendeal-google-maps-sdk';
let googleMapsLoadPromise: Promise<void> | null = null;

const round = (value: number, digits = 2): number =>
  Number(value.toFixed(digits));

const formatDistance = (km: number): string =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${round(km, 1)} km`;

const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${Math.max(1, Math.round(minutes))} mins`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
};

const toEstimate = (
  distanceKm: number,
  durationMin: number,
  source: TravelEstimate['source']
): TravelEstimate => ({
  distanceKm: round(distanceKm, 3),
  durationMin: round(durationMin, 1),
  distanceText: formatDistance(distanceKm),
  durationText: formatDuration(durationMin),
  source,
});

export const getGoogleMapsApiKey = (): string => {
  const runtime = globalThis as GoogleMapsRuntime;
  const runtimeKey = runtime.__WENDEAL_GOOGLE_MAPS_CONFIG__?.apiKey?.trim();
  if (runtimeKey) {
    return runtimeKey;
  }
  return runtime.__WENDEAL_GOOGLE_MAPS_API_KEY__?.trim() || '';
};

export const isGoogleMapsConfigured = (): boolean =>
  Boolean(getGoogleMapsApiKey());

export const loadGoogleMapsSdk = async (): Promise<void> => {
  const runtime = globalThis as GoogleMapsRuntime;
  if (runtime.google?.maps) {
    return;
  }

  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    throw new Error('Google Maps API key is missing');
  }

  if (googleMapsLoadPromise) {
    return googleMapsLoadPromise;
  }

  googleMapsLoadPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(
      GOOGLE_MAPS_SCRIPT_ID
    ) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), {
        once: true,
      });
      existingScript.addEventListener(
        'error',
        () => reject(new Error('Failed to load Google Maps SDK')),
        { once: true }
      );
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps SDK'));
    document.head.appendChild(script);
  })
    .catch(error => {
      googleMapsLoadPromise = null;
      throw error;
    })
    .then(() => undefined);

  return googleMapsLoadPromise;
};

const getMapsSdk = async (): Promise<any> => {
  await loadGoogleMapsSdk();
  const runtime = globalThis as GoogleMapsRuntime;
  const maps = runtime.google?.maps;
  if (!maps) {
    throw new Error('Google Maps SDK is unavailable');
  }
  return maps;
};

export const haversineDistanceKm = (
  origin: GeoPoint,
  destination: GeoPoint
): number => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(destination.lat - origin.lat);
  const dLng = toRad(destination.lng - origin.lng);
  const lat1 = toRad(origin.lat);
  const lat2 = toRad(destination.lat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

const fallbackTravelEstimate = (
  origin: GeoPoint,
  destination: GeoPoint
): TravelEstimate => {
  const distanceKm = haversineDistanceKm(origin, destination);
  const assumedAverageKmh = 35;
  const durationMin = (distanceKm / assumedAverageKmh) * 60;
  return toEstimate(distanceKm, durationMin, 'fallback');
};

export const geocodeAddress = async (
  address: string
): Promise<GeoPoint | null> => {
  const trimmed = address.trim();
  if (!trimmed) {
    return null;
  }

  const maps = await getMapsSdk();
  const geocoder = new maps.Geocoder();
  return new Promise<GeoPoint | null>(resolve => {
    geocoder.geocode({ address: trimmed }, (results: any[], status: string) => {
      if (
        status !== 'OK' ||
        !Array.isArray(results) ||
        !results[0]?.geometry?.location
      ) {
        resolve(null);
        return;
      }
      const location = results[0].geometry.location;
      resolve({
        lat: Number(location.lat()),
        lng: Number(location.lng()),
      });
    });
  });
};

export const estimateTravel = async (
  origin: GeoPoint,
  destination: GeoPoint
): Promise<TravelEstimate> => {
  try {
    const maps = await getMapsSdk();
    const distanceMatrixService = new maps.DistanceMatrixService();
    const response = await new Promise<any>((resolve, reject) => {
      distanceMatrixService.getDistanceMatrix(
        {
          origins: [new maps.LatLng(origin.lat, origin.lng)],
          destinations: [new maps.LatLng(destination.lat, destination.lng)],
          travelMode: maps.TravelMode.DRIVING,
          unitSystem: maps.UnitSystem.METRIC,
        },
        (result: any, status: string) => {
          if (status !== 'OK') {
            reject(new Error(`Distance matrix failed: ${status}`));
            return;
          }
          resolve(result);
        }
      );
    });

    const element = response?.rows?.[0]?.elements?.[0];
    if (!element || element.status !== 'OK') {
      return fallbackTravelEstimate(origin, destination);
    }

    const distanceKm = Number(element.distance?.value || 0) / 1000;
    const durationMin = Number(element.duration?.value || 0) / 60;
    return toEstimate(distanceKm, durationMin, 'google');
  } catch {
    return fallbackTravelEstimate(origin, destination);
  }
};

export const estimateTravelBatch = async (
  origin: GeoPoint,
  destinations: GeoPoint[]
): Promise<TravelEstimate[]> => {
  if (destinations.length === 0) {
    return [];
  }

  try {
    const maps = await getMapsSdk();
    const distanceMatrixService = new maps.DistanceMatrixService();
    const response = await new Promise<any>((resolve, reject) => {
      distanceMatrixService.getDistanceMatrix(
        {
          origins: [new maps.LatLng(origin.lat, origin.lng)],
          destinations: destinations.map(
            destination => new maps.LatLng(destination.lat, destination.lng)
          ),
          travelMode: maps.TravelMode.DRIVING,
          unitSystem: maps.UnitSystem.METRIC,
        },
        (result: any, status: string) => {
          if (status !== 'OK') {
            reject(new Error(`Distance matrix failed: ${status}`));
            return;
          }
          resolve(result);
        }
      );
    });

    const elements = response?.rows?.[0]?.elements || [];
    return destinations.map((destination, index) => {
      const element = elements[index];
      if (!element || element.status !== 'OK') {
        return fallbackTravelEstimate(origin, destination);
      }
      const distanceKm = Number(element.distance?.value || 0) / 1000;
      const durationMin = Number(element.duration?.value || 0) / 60;
      return toEstimate(distanceKm, durationMin, 'google');
    });
  } catch {
    return destinations.map(destination =>
      fallbackTravelEstimate(origin, destination)
    );
  }
};

export const buildGoogleNavigationUrl = (
  origin: GeoPoint,
  destination: GeoPoint,
  waypoints: GeoPoint[] = []
): string => {
  const toParam = (point: GeoPoint): string => `${point.lat},${point.lng}`;
  const params = new URLSearchParams({
    api: '1',
    origin: toParam(origin),
    destination: toParam(destination),
    travelmode: 'driving',
  });

  if (waypoints.length > 0) {
    params.set('waypoints', waypoints.map(point => toParam(point)).join('|'));
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
};
