/**
 * Cleaning Inspection Wizard - Utility Functions
 * GPS capture, image compression, watermark rendering
 */

import dayjs from 'dayjs';

// ──────────────────────── GPS Capture ───────────────────────────

export interface GpsCoords {
  lat: number;
  lng: number;
}

/**
 * Capture current GPS position.
 * Returns null if geolocation is unavailable or denied.
 */
export async function captureGPS(): Promise<GpsCoords | null> {
  return new Promise(resolve => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

/**
 * Format GPS coordinates for display
 */
export function formatGPS(lat: number | null, lng: number | null): string {
  if (lat === null || lng === null) return 'N/A';
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/**
 * Reverse geocode GPS coordinates to a human-readable address.
 * Uses OpenStreetMap Nominatim API (free, no key required).
 * Returns a formatted string like: "52 Wecker Road, Mansfield QLD 4122"
 * Falls back to raw coordinates if the API fails.
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=en`,
      {
        headers: { 'User-Agent': 'SparkeryCleaningApp/1.0' },
      }
    );
    if (!response.ok) return formatGPS(lat, lng);

    const data = await response.json();
    const addr = data.address || {};

    // Build a clean address string: street, suburb, state, postcode
    const parts: string[] = [];

    // House number + road
    const road = addr.road || addr.street || '';
    const houseNum = addr.house_number || '';
    if (road) {
      parts.push(houseNum ? `${houseNum} ${road}` : road);
    }

    // Suburb / neighbourhood
    const suburb =
      addr.suburb || addr.neighbourhood || addr.hamlet || addr.town || '';
    if (suburb) parts.push(suburb);

    // State abbreviation + postcode
    const state = addr.state || '';
    const postcode = addr.postcode || '';
    if (state || postcode) {
      const stateAbbr = abbreviateState(state);
      parts.push([stateAbbr, postcode].filter(Boolean).join(' '));
    }

    const result = parts.filter(Boolean).join(', ');
    return result || data.display_name || formatGPS(lat, lng);
  } catch {
    return formatGPS(lat, lng);
  }
}

/**
 * Abbreviate Australian state names to standard codes
 */
function abbreviateState(state: string): string {
  const map: Record<string, string> = {
    queensland: 'QLD',
    'new south wales': 'NSW',
    victoria: 'VIC',
    'western australia': 'WA',
    'south australia': 'SA',
    tasmania: 'TAS',
    'northern territory': 'NT',
    'australian capital territory': 'ACT',
  };
  return map[state.toLowerCase()] || state;
}

/**
 * Capture GPS and immediately reverse geocode to a street address.
 * Returns both coordinates and the formatted address string.
 */
export async function captureGPSWithAddress(): Promise<{
  coords: GpsCoords | null;
  address: string;
}> {
  const coords = await captureGPS();
  if (!coords) return { coords: null, address: '' };

  const address = await reverseGeocode(coords.lat, coords.lng);
  return { coords, address };
}

// ──────────────────────── Image Compression ─────────────────────

/**
 * Compress an image data URL to a target max width and JPEG quality.
 * Reduces typical phone photos from 5-10MB to ~300-500KB.
 */
export function compressImage(
  dataUrl: string,
  maxWidth = 1080,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl); // Fallback to original
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () =>
      reject(new Error('Failed to load image for compression'));
    img.src = dataUrl;
  });
}

// ──────────────────────── Photo Watermark ───────────────────────

export interface WatermarkOptions {
  /** GPS coordinates (optional) */
  gps?: GpsCoords | null;
  /** Property address (optional) */
  address?: string;
  /** Custom label line (defaults to "SPARKERY CLEANING INSPECTION") */
  label?: string;
}

/**
 * Add a professional watermark strip to the bottom of a canvas.
 *
 * When address is available:
 *   Line 1: SPARKERY CLEANING INSPECTION
 *   Line 2: 2026-02-14 09:35:22
 *   Line 3: 📍 52 Wecker Road, Mansfield QLD 4122
 *
 * When only GPS coords are available:
 *   Line 1: SPARKERY CLEANING INSPECTION
 *   Line 2: 2026-02-14 09:35:22 | GPS: -27.4689, 153.0235
 */
export function addWatermark(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  options: WatermarkOptions = {}
): void {
  const w = canvas.width;
  const h = canvas.height;
  const timestamp = dayjs().format('YYYY-MM-DD HH:mm:ss');

  const label = options.label || 'SPARKERY CLEANING INSPECTION';
  const addressStr = options.address || '';

  // Calculate font sizes relative to image width
  const baseFontSize = Math.max(12, Math.round(w * 0.018));
  const lineHeight = baseFontSize * 1.4;

  const lines: string[] = [label];

  if (addressStr) {
    // Has street address → show timestamp on line 2, address on line 3
    lines.push(timestamp);
    lines.push(`📍 ${addressStr}`);
  } else if (options.gps) {
    // No address but has raw coords → show on same line as timestamp
    const gpsStr = `GPS: ${options.gps.lat.toFixed(6)}, ${options.gps.lng.toFixed(6)}`;
    lines.push(`${timestamp}  |  ${gpsStr}`);
  } else {
    lines.push(timestamp);
  }

  const stripHeight = lines.length * lineHeight + baseFontSize;
  const stripY = h - stripHeight;

  // Semi-transparent background strip
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(0, stripY, w, stripHeight);

  // Draw text lines
  ctx.font = `bold ${baseFontSize}px Arial, sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.textAlign = 'left';

  lines.forEach((line, idx) => {
    const y = stripY + baseFontSize * 0.8 + idx * lineHeight;
    ctx.fillText(line, baseFontSize * 0.8, y);
  });
}

/**
 * Capture a photo from a video element, apply watermark, and compress.
 * Returns a JPEG data URL.
 */
export async function capturePhotoFromVideo(
  video: HTMLVideoElement,
  watermarkOptions?: WatermarkOptions
): Promise<string> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);

  if (watermarkOptions) {
    addWatermark(canvas, ctx, watermarkOptions);
  }

  // Compress to ~500KB
  return canvas.toDataURL('image/jpeg', 0.75);
}

/**
 * Add watermark to an existing image (from file upload).
 * Compresses to maxWidth at the same time.
 */
export function addWatermarkToImage(
  dataUrl: string,
  options: WatermarkOptions = {},
  maxWidth = 1080,
  quality = 0.7
): Promise<string> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      addWatermark(canvas, ctx, options);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// ──────────────────────── localStorage Helpers ──────────────────

const ARCHIVED_KEY = 'archived-cleaning-inspections';
const PROPERTIES_KEY = 'cleaning-inspection-properties';

/**
 * Load all archived inspections from localStorage
 */
export function loadArchivedInspections(): any[] {
  try {
    const data = localStorage.getItem(ARCHIVED_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Strip ALL heavy base64 image data from inspection before localStorage save.
 * Photos are synced to the n8n server; localStorage only keeps lightweight metadata.
 * A marker `_hasPhoto: true` replaces stripped photos so the UI knows data exists on server.
 */
function stripHeavyDataForStorage(inspection: any): any {
  const light = { ...inspection };

  // 1. Remove propertyNoteImages (static admin images, not per-inspection)
  delete light.propertyNoteImages;

  // 2. Strip section photos and checklist photos
  if (light.sections) {
    light.sections = light.sections.map((section: any) => {
      const s = { ...section };
      // Strip room additional photos (UploadFile[] with base64 thumbUrl/url)
      if (s.photos && s.photos.length > 0) {
        s._photoCount = s.photos.length;
        s.photos = [];
      }
      // Strip checklist item photos
      if (s.checklist) {
        s.checklist = s.checklist.map((item: any) => {
          if (item.photo) {
            return { ...item, photo: undefined, _hasPhoto: true };
          }
          return item;
        });
      }
      // Strip reference images (admin images, can be reloaded)
      if (s.referenceImages && s.referenceImages.length > 0) {
        s._refImageCount = s.referenceImages.length;
        s.referenceImages = [];
      }
      return s;
    });
  }

  // 3. Strip damage report photos
  if (light.damageReports) {
    light.damageReports = light.damageReports.map((d: any) => {
      if (d.photo) {
        return { ...d, photo: undefined, _hasPhoto: true };
      }
      return d;
    });
  }

  // 4. Strip check-in/out photos
  if (light.checkIn && light.checkIn.photo) {
    light.checkIn = { ...light.checkIn, photo: undefined, _hasPhoto: true };
  }
  if (light.checkOut && light.checkOut.photo) {
    light.checkOut = { ...light.checkOut, photo: undefined, _hasPhoto: true };
  }

  return light;
}

/**
 * Save an inspection to the localStorage archive.
 * Strips heavy image data to avoid QuotaExceededError.
 */
export function saveArchivedInspection(inspection: any): void {
  try {
    const archives = loadArchivedInspections();
    const lightInspection = stripHeavyDataForStorage(inspection);
    const existingIndex = archives.findIndex(
      (a: any) => a.id === inspection.id
    );
    if (existingIndex >= 0) archives[existingIndex] = lightInspection;
    else archives.unshift(lightInspection);
    localStorage.setItem(ARCHIVED_KEY, JSON.stringify(archives));
  } catch (e) {
    // QuotaExceededError: try trimming old archives
    console.warn(
      '[Inspection] localStorage quota exceeded, trimming old archives',
      e
    );
    try {
      const archives = loadArchivedInspections();
      // Keep only the current inspection + up to 5 most recent
      const currentId = inspection.id;
      const others = archives
        .filter((a: any) => a.id !== currentId)
        .slice(0, 5);
      const lightInspection = stripHeavyDataForStorage(inspection);
      const trimmed = [lightInspection, ...others];
      localStorage.setItem(ARCHIVED_KEY, JSON.stringify(trimmed));
    } catch {
      // Last resort: only save the current inspection
      try {
        const lightInspection = stripHeavyDataForStorage(inspection);
        localStorage.setItem(ARCHIVED_KEY, JSON.stringify([lightInspection]));
      } catch {
        console.error('[Inspection] localStorage completely full, cannot save');
      }
    }
  }
}

/**
 * Delete an inspection from the localStorage archive
 */
export function deleteArchivedInspection(id: string): void {
  try {
    const archives = loadArchivedInspections().filter((a: any) => a.id !== id);
    localStorage.setItem(ARCHIVED_KEY, JSON.stringify(archives));
  } catch {
    console.warn(
      '[Inspection] Failed to delete archived inspection from localStorage'
    );
  }
}

/**
 * Load property templates from localStorage
 */
export function loadPropertyTemplates(): any[] {
  try {
    const data = localStorage.getItem(PROPERTIES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// ──────────────────────── Duration ──────────────────────────────

/**
 * Calculate duration between two ISO timestamp strings in human-readable form
 */
export function calculateDuration(start: string, end: string): string {
  const s = dayjs(start);
  const e = dayjs(end);
  const diffMin = e.diff(s, 'minute');
  if (diffMin < 60) return `${diffMin} min`;
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  return `${hours}h ${mins}m`;
}
