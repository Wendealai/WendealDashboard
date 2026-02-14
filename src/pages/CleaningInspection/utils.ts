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
 * Add a professional 3-line watermark strip to the bottom of a canvas.
 *
 * Layout:
 *   Line 1: SPARKERY CLEANING INSPECTION
 *   Line 2: 2026-02-14 09:35:22 | GPS: -27.4689, 153.0235
 *   Line 3: 52 Wecker Road, Mansfield QLD 4122
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
  const gpsStr = options.gps
    ? `GPS: ${options.gps.lat.toFixed(6)}, ${options.gps.lng.toFixed(6)}`
    : 'GPS: N/A';
  const addressStr = options.address || '';

  // Calculate font sizes relative to image width
  const baseFontSize = Math.max(12, Math.round(w * 0.018));
  const lineHeight = baseFontSize * 1.4;
  const lines = [label, `${timestamp}  |  ${gpsStr}`];
  if (addressStr) lines.push(addressStr);

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
 * Save an inspection to the localStorage archive
 */
export function saveArchivedInspection(inspection: any): void {
  const archives = loadArchivedInspections();
  const existingIndex = archives.findIndex((a: any) => a.id === inspection.id);
  if (existingIndex >= 0) archives[existingIndex] = inspection;
  else archives.unshift(inspection);
  localStorage.setItem(ARCHIVED_KEY, JSON.stringify(archives));
}

/**
 * Delete an inspection from the localStorage archive
 */
export function deleteArchivedInspection(id: string): void {
  const archives = loadArchivedInspections().filter((a: any) => a.id !== id);
  localStorage.setItem(ARCHIVED_KEY, JSON.stringify(archives));
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
