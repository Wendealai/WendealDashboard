import type {
  CleaningInspection,
  Employee,
  PropertyTemplate,
  ReferenceImage,
} from '@/pages/CleaningInspection/types';

interface SupabaseConfig {
  url: string;
  anonKey: string;
}

type SupabaseRuntime = typeof globalThis & {
  __WENDEAL_SUPABASE_CONFIG__?: {
    url?: string;
    anonKey?: string;
  };
};

interface SupabaseInspectionRow {
  id: string;
  property_id: string;
  status: CleaningInspection['status'];
  check_out_date: string;
  submitted_at: string | null;
  updated_at: string | null;
  payload: CleaningInspection;
}

interface SupabasePropertyRow {
  id: string;
  name: string;
  updated_at: string | null;
  payload: PropertyTemplate;
}

interface SupabaseEmployeeRow {
  id: string;
  name: string;
  updated_at: string | null;
  payload: Employee;
}

interface SubmitInspectionResult {
  success: boolean;
  source: 'supabase' | 'local';
}

interface NormalizeResult<T> {
  value: T;
  changed: boolean;
  uploadedCount: number;
}

export interface InspectionSupabaseConnectionStatus {
  configured: boolean;
  connected: boolean;
  message?: string;
}

export interface InspectionAssetMigrationOptions {
  includeTemplates?: boolean;
  includeInspections?: boolean;
  inspectionLimit?: number;
}

export interface InspectionAssetMigrationResult {
  templatesProcessed: number;
  templatesUpdated: number;
  inspectionsProcessed: number;
  inspectionsUpdated: number;
  uploadedAssets: number;
  failedInspections: number;
}

const LOCAL_INSPECTIONS_KEY = 'archived-cleaning-inspections';
const LOCAL_PROPERTIES_KEY = 'cleaning-inspection-properties';
const LOCAL_EMPLOYEES_KEY = 'cleaning-inspection-employees';
const LAST_CLOUD_WRITE_KEY = 'inspection-last-cloud-write-at';
const INSPECTION_ASSET_BATCH_SIZE = 20;
const INSPECTION_STORAGE_BUCKET = 'inspection-assets';
const IMAGE_DATA_URL_RE = /^data:image\/([a-zA-Z0-9+.-]+);base64,/i;

const uploadedAssetUrlCache = new Map<string, string>();

const readLastCloudWriteAt = (): string | null => {
  try {
    return localStorage.getItem(LAST_CLOUD_WRITE_KEY);
  } catch {
    return null;
  }
};

let lastCloudWriteAtCache: string | null = readLastCloudWriteAt();

const hasSupabaseConfig = (): boolean => {
  const runtime = globalThis as SupabaseRuntime;
  const url = runtime.__WENDEAL_SUPABASE_CONFIG__?.url?.trim();
  const anonKey = runtime.__WENDEAL_SUPABASE_CONFIG__?.anonKey?.trim();
  return Boolean(url && anonKey);
};

const getSupabaseConfig = (): SupabaseConfig => {
  const runtime = globalThis as SupabaseRuntime;
  const url = runtime.__WENDEAL_SUPABASE_CONFIG__?.url?.trim();
  const anonKey = runtime.__WENDEAL_SUPABASE_CONFIG__?.anonKey?.trim();
  if (!url || !anonKey) {
    throw new Error('Supabase is not configured');
  }

  return { url, anonKey };
};

export const isInspectionSupabaseConfigured = (): boolean =>
  hasSupabaseConfig();

export const getInspectionSupabaseUrl = (): string => {
  const runtime = globalThis as SupabaseRuntime;
  return runtime.__WENDEAL_SUPABASE_CONFIG__?.url?.trim() || '';
};

export const getInspectionStorageBucket = (): string =>
  INSPECTION_STORAGE_BUCKET;

const markInspectionCloudWrite = (): string => {
  const timestamp = new Date().toISOString();
  lastCloudWriteAtCache = timestamp;
  try {
    localStorage.setItem(LAST_CLOUD_WRITE_KEY, timestamp);
  } catch {
    // ignore local write failures
  }
  return timestamp;
};

export const getInspectionLastCloudWriteAt = (): string | null => {
  if (lastCloudWriteAtCache) {
    return lastCloudWriteAtCache;
  }
  lastCloudWriteAtCache = readLastCloudWriteAt();
  return lastCloudWriteAtCache;
};

const parseLocalJson = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const readLocalStore = <T>(key: string, fallback: T): T => {
  try {
    return parseLocalJson<T>(localStorage.getItem(key), fallback);
  } catch {
    return fallback;
  }
};

const writeLocalStore = (key: string, value: unknown): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

const stripInspectionForLocalStorage = (
  inspection: CleaningInspection
): CleaningInspection => {
  const light = { ...inspection } as any;
  delete light.propertyNoteImages;

  if (Array.isArray(light.sections)) {
    light.sections = light.sections.map((section: any) => {
      const item = { ...section };
      if (Array.isArray(item.photos) && item.photos.length > 0) {
        item._photoCount = item.photos.length;
        item.photos = [];
      }
      if (Array.isArray(item.checklist)) {
        item.checklist = item.checklist.map((checkItem: any) =>
          checkItem?.photo
            ? { ...checkItem, photo: undefined, _hasPhoto: true }
            : checkItem
        );
      }
      if (Array.isArray(item.referenceImages) && item.referenceImages.length) {
        item._refImageCount = item.referenceImages.length;
        item.referenceImages = [];
      }
      return item;
    });
  }

  if (Array.isArray(light.damageReports)) {
    light.damageReports = light.damageReports.map((report: any) =>
      report?.photo ? { ...report, photo: undefined, _hasPhoto: true } : report
    );
  }

  if (light.checkIn?.photo) {
    light.checkIn = { ...light.checkIn, photo: undefined, _hasPhoto: true };
  }
  if (light.checkOut?.photo) {
    light.checkOut = { ...light.checkOut, photo: undefined, _hasPhoto: true };
  }

  return light as CleaningInspection;
};

const getInspectionSortTs = (inspection: CleaningInspection): number => {
  const submittedAt =
    typeof inspection.submittedAt === 'string'
      ? inspection.submittedAt
      : inspection.submittedAt?.toISOString();
  const fromSubmitted = submittedAt ? new Date(submittedAt).getTime() : 0;
  const fromCheckout = inspection.checkOutDate
    ? new Date(inspection.checkOutDate).getTime()
    : 0;
  return Number.isFinite(fromSubmitted) && fromSubmitted > 0
    ? fromSubmitted
    : fromCheckout;
};

const sortInspectionsDesc = (
  inspections: CleaningInspection[]
): CleaningInspection[] => {
  return [...inspections].sort(
    (a, b) => getInspectionSortTs(b) - getInspectionSortTs(a)
  );
};

const loadLocalInspections = (): CleaningInspection[] => {
  return readLocalStore<CleaningInspection[]>(LOCAL_INSPECTIONS_KEY, []);
};

const saveLocalInspections = (inspections: CleaningInspection[]): boolean => {
  const sorted = sortInspectionsDesc(inspections);
  if (writeLocalStore(LOCAL_INSPECTIONS_KEY, sorted)) {
    return true;
  }

  // Quota fallback: keep only recent 10 records.
  return writeLocalStore(LOCAL_INSPECTIONS_KEY, sorted.slice(0, 10));
};

const upsertLocalInspection = (inspection: CleaningInspection): boolean => {
  const list = loadLocalInspections();
  const light = stripInspectionForLocalStorage(inspection);
  const index = list.findIndex(item => item.id === inspection.id);
  if (index >= 0) {
    list[index] = light;
  } else {
    list.unshift(light);
  }
  return saveLocalInspections(list);
};

const deleteLocalInspection = (id: string): boolean => {
  const list = loadLocalInspections().filter(item => item.id !== id);
  return writeLocalStore(LOCAL_INSPECTIONS_KEY, list);
};

const mergeInspections = (
  cloud: CleaningInspection[],
  local: CleaningInspection[]
): CleaningInspection[] => {
  const map = new Map<string, CleaningInspection>();
  local.forEach(item => map.set(item.id, item));
  cloud.forEach(item => map.set(item.id, item));
  return sortInspectionsDesc(Array.from(map.values()));
};

const supabaseFetch = async <T>(
  path: string,
  options: RequestInit = {}
): Promise<T> => {
  const config = getSupabaseConfig();
  const requestUrl = `${config.url.replace(/\/$/, '')}${path}`;
  const response = await fetch(requestUrl, {
    cache: options.cache || 'no-store',
    ...options,
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Supabase request failed (${response.status}): ${details || 'No details'}`
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    return [] as T;
  }
};

const toInspectionRow = (
  inspection: CleaningInspection
): SupabaseInspectionRow => ({
  id: inspection.id,
  property_id: inspection.propertyId,
  status: inspection.status,
  check_out_date: inspection.checkOutDate,
  submitted_at:
    typeof inspection.submittedAt === 'string'
      ? inspection.submittedAt || null
      : inspection.submittedAt?.toISOString() || null,
  updated_at: new Date().toISOString(),
  payload: inspection,
});

const toPropertyRow = (property: PropertyTemplate): SupabasePropertyRow => ({
  id: property.id,
  name: property.name,
  updated_at: new Date().toISOString(),
  payload: property,
});

const toEmployeeRow = (employee: Employee): SupabaseEmployeeRow => ({
  id: employee.id,
  name: employee.name,
  updated_at: new Date().toISOString(),
  payload: employee,
});

const chunkArray = <T>(items: T[], chunkSize: number): T[][] => {
  if (items.length === 0) return [];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    out.push(items.slice(i, i + chunkSize));
  }
  return out;
};

const upsertInspectionRows = async (
  rows: SupabaseInspectionRow[]
): Promise<void> => {
  for (const batch of chunkArray(rows, INSPECTION_ASSET_BATCH_SIZE)) {
    await supabaseFetch<SupabaseInspectionRow[]>(
      '/rest/v1/cleaning_inspections?on_conflict=id',
      {
        method: 'POST',
        headers: {
          Prefer: 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify(batch),
      }
    );
  }
};

const upsertPropertyRows = async (
  rows: SupabasePropertyRow[]
): Promise<void> => {
  for (const batch of chunkArray(rows, INSPECTION_ASSET_BATCH_SIZE)) {
    await supabaseFetch<SupabasePropertyRow[]>(
      '/rest/v1/cleaning_inspection_properties?on_conflict=id',
      {
        method: 'POST',
        headers: {
          Prefer: 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify(batch),
      }
    );
  }
};

const deletePropertyRows = async (ids: string[]): Promise<void> => {
  for (const id of ids) {
    await supabaseFetch<SupabasePropertyRow[]>(
      `/rest/v1/cleaning_inspection_properties?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: {
          Prefer: 'return=minimal',
        },
      }
    );
  }
};

const deleteEmployeeRows = async (ids: string[]): Promise<void> => {
  for (const id of ids) {
    await supabaseFetch<SupabaseEmployeeRow[]>(
      `/rest/v1/cleaning_inspection_employees?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: {
          Prefer: 'return=minimal',
        },
      }
    );
  }
};

const sanitizeStorageSegment = (input: string): string => {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'item';
};

const encodeStoragePath = (path: string): string => {
  return path
    .split('/')
    .filter(Boolean)
    .map(part => encodeURIComponent(part))
    .join('/');
};

const isImageDataUrl = (value: unknown): value is string => {
  return typeof value === 'string' && IMAGE_DATA_URL_RE.test(value);
};

const inferImageExtension = (dataUrl: string): string => {
  const match = dataUrl.match(IMAGE_DATA_URL_RE);
  const subType = (match?.[1] || 'jpeg').toLowerCase();
  if (subType === 'jpg' || subType === 'jpeg') return 'jpg';
  if (subType === 'png') return 'png';
  if (subType === 'webp') return 'webp';
  if (subType === 'gif') return 'gif';
  return 'jpg';
};

const inferImageMimeType = (dataUrl: string): string => {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/i);
  return match?.[1] || 'image/jpeg';
};

const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
  const response = await fetch(dataUrl);
  if (!response.ok) {
    throw new Error('Failed to read image data URL for upload');
  }
  return await response.blob();
};

const buildStoragePublicUrl = (objectPath: string): string => {
  const config = getSupabaseConfig();
  return `${config.url.replace(/\/$/, '')}/storage/v1/object/public/${INSPECTION_STORAGE_BUCKET}/${encodeStoragePath(objectPath)}`;
};

const uploadImageDataUrlToStorage = async (
  dataUrl: string,
  scope: string,
  index = 0
): Promise<string> => {
  if (!isImageDataUrl(dataUrl)) {
    return dataUrl;
  }

  const cachedUrl = uploadedAssetUrlCache.get(dataUrl);
  if (cachedUrl) {
    return cachedUrl;
  }

  const config = getSupabaseConfig();
  const ext = inferImageExtension(dataUrl);
  const random = Math.random().toString(36).slice(2, 8);
  const objectPath = `${scope}/${Date.now()}-${index}-${random}.${ext}`
    .split('/')
    .map(sanitizeStorageSegment)
    .join('/');

  const uploadUrl = `${config.url.replace(/\/$/, '')}/storage/v1/object/${INSPECTION_STORAGE_BUCKET}/${encodeStoragePath(objectPath)}`;
  const blob = await dataUrlToBlob(dataUrl);
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      'x-upsert': 'true',
      'Content-Type': inferImageMimeType(dataUrl),
    },
    body: blob,
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Supabase storage upload failed (${response.status}): ${details || 'No details'}`
    );
  }

  const publicUrl = buildStoragePublicUrl(objectPath);
  uploadedAssetUrlCache.set(dataUrl, publicUrl);
  return publicUrl;
};

const normalizeReferenceImageList = async (
  images: ReferenceImage[] | undefined,
  scope: string
): Promise<NormalizeResult<ReferenceImage[]>> => {
  if (!Array.isArray(images) || images.length === 0 || !hasSupabaseConfig()) {
    return {
      value: images || [],
      changed: false,
      uploadedCount: 0,
    };
  }

  let changed = false;
  let uploadedCount = 0;
  const next = await Promise.all(
    images.map(async (img, index) => {
      if (!img || !isImageDataUrl(img.image)) {
        return img;
      }
      const uploadedUrl = await uploadImageDataUrlToStorage(
        img.image,
        scope,
        index
      );
      if (uploadedUrl !== img.image) {
        changed = true;
        uploadedCount += 1;
        return { ...img, image: uploadedUrl };
      }
      return img;
    })
  );

  return { value: next, changed, uploadedCount };
};

const normalizePropertyTemplateAssets = async (
  template: PropertyTemplate
): Promise<NormalizeResult<PropertyTemplate>> => {
  if (!hasSupabaseConfig()) {
    return { value: template, changed: false, uploadedCount: 0 };
  }

  const safePropertyId = sanitizeStorageSegment(template.id || 'property');
  let changed = false;
  let uploadedCount = 0;

  let nextNoteImages = template.noteImages;
  if (Array.isArray(template.noteImages) && template.noteImages.length > 0) {
    nextNoteImages = await Promise.all(
      template.noteImages.map(async (image, index) => {
        if (!isImageDataUrl(image)) return image;
        const uploadedUrl = await uploadImageDataUrlToStorage(
          image,
          `properties/${safePropertyId}/notes`,
          index
        );
        if (uploadedUrl !== image) {
          changed = true;
          uploadedCount += 1;
        }
        return uploadedUrl;
      })
    );
  }

  const sourceReferences = template.referenceImages || {};
  let nextReferenceImages: Record<string, ReferenceImage[]> = sourceReferences;
  const referenceEntries = Object.entries(sourceReferences);
  if (referenceEntries.length > 0) {
    const candidate: Record<string, ReferenceImage[]> = {};
    for (const [sectionId, images] of referenceEntries) {
      const normalized = await normalizeReferenceImageList(
        images,
        `properties/${safePropertyId}/sections/${sectionId}/reference`
      );
      candidate[sectionId] = normalized.value;
      if (normalized.changed) {
        changed = true;
        uploadedCount += normalized.uploadedCount;
      }
    }
    if (changed) {
      nextReferenceImages = candidate;
    }
  }

  if (!changed) {
    return { value: template, changed: false, uploadedCount: 0 };
  }

  return {
    value: {
      ...template,
      ...(nextNoteImages ? { noteImages: nextNoteImages } : {}),
      referenceImages: nextReferenceImages,
    },
    changed: true,
    uploadedCount,
  };
};

const normalizeInspectionAssets = async (
  inspection: CleaningInspection
): Promise<NormalizeResult<CleaningInspection>> => {
  if (!hasSupabaseConfig()) {
    return { value: inspection, changed: false, uploadedCount: 0 };
  }

  const safeInspectionId = sanitizeStorageSegment(
    inspection.id || 'inspection'
  );
  let changed = false;
  let uploadedCount = 0;

  let nextPropertyNoteImages = inspection.propertyNoteImages;
  if (
    Array.isArray(inspection.propertyNoteImages) &&
    inspection.propertyNoteImages.length > 0
  ) {
    nextPropertyNoteImages = await Promise.all(
      inspection.propertyNoteImages.map(async (image, index) => {
        if (!isImageDataUrl(image)) return image;
        const uploadedUrl = await uploadImageDataUrlToStorage(
          image,
          `inspections/${safeInspectionId}/property-notes`,
          index
        );
        if (uploadedUrl !== image) {
          changed = true;
          uploadedCount += 1;
        }
        return uploadedUrl;
      })
    );
  }

  const nextSections = await Promise.all(
    (inspection.sections || []).map(
      async (section: any, sectionIndex: number) => {
        let sectionChanged = false;
        let sectionUploaded = 0;

        const safeSectionId = sanitizeStorageSegment(
          section?.id || `section-${sectionIndex + 1}`
        );

        const normalizedRefImages = await normalizeReferenceImageList(
          section?.referenceImages,
          `inspections/${safeInspectionId}/sections/${safeSectionId}/reference`
        );
        if (normalizedRefImages.changed) {
          sectionChanged = true;
          sectionUploaded += normalizedRefImages.uploadedCount;
        }

        const originalPhotos: any[] = Array.isArray(section?.photos)
          ? section.photos
          : [];
        const normalizedPhotos = await Promise.all(
          originalPhotos.map(async (photo: any, photoIndex: number) => {
            if (!photo || typeof photo !== 'object') {
              return photo;
            }

            const sourceDataUrl = isImageDataUrl(photo.url)
              ? photo.url
              : isImageDataUrl(photo.thumbUrl)
                ? photo.thumbUrl
                : null;

            if (!sourceDataUrl) {
              return photo;
            }

            const uploadedUrl = await uploadImageDataUrlToStorage(
              sourceDataUrl,
              `inspections/${safeInspectionId}/sections/${safeSectionId}/photos`,
              photoIndex
            );

            if (uploadedUrl === sourceDataUrl) {
              return photo;
            }

            sectionChanged = true;
            sectionUploaded += 1;

            const nextPhoto = { ...photo, url: uploadedUrl };
            if (isImageDataUrl(nextPhoto.thumbUrl)) {
              nextPhoto.thumbUrl = uploadedUrl;
            }
            return nextPhoto;
          })
        );

        const originalChecklist: any[] = Array.isArray(section?.checklist)
          ? section.checklist
          : [];
        const normalizedChecklist = await Promise.all(
          originalChecklist.map(async (item: any, itemIndex: number) => {
            if (!item || !isImageDataUrl(item.photo)) {
              return item;
            }
            const safeItemId = sanitizeStorageSegment(
              item.id || `item-${itemIndex + 1}`
            );
            const uploadedUrl = await uploadImageDataUrlToStorage(
              item.photo,
              `inspections/${safeInspectionId}/sections/${safeSectionId}/checklist/${safeItemId}`,
              itemIndex
            );

            if (uploadedUrl === item.photo) {
              return item;
            }

            sectionChanged = true;
            sectionUploaded += 1;
            return { ...item, photo: uploadedUrl };
          })
        );

        if (!sectionChanged) {
          return { value: section, changed: false, uploadedCount: 0 };
        }

        return {
          value: {
            ...section,
            referenceImages: normalizedRefImages.value,
            photos: normalizedPhotos,
            checklist: normalizedChecklist,
          },
          changed: true,
          uploadedCount: sectionUploaded,
        };
      }
    )
  );

  let nextDamageReports = inspection.damageReports;
  if (
    Array.isArray(inspection.damageReports) &&
    inspection.damageReports.length
  ) {
    nextDamageReports = await Promise.all(
      inspection.damageReports.map(async (report: any, index: number) => {
        if (!report || !isImageDataUrl(report.photo)) {
          return report;
        }
        const safeReportId = sanitizeStorageSegment(
          report.id || `damage-${index + 1}`
        );
        const uploadedUrl = await uploadImageDataUrlToStorage(
          report.photo,
          `inspections/${safeInspectionId}/damage/${safeReportId}`,
          index
        );
        if (uploadedUrl !== report.photo) {
          changed = true;
          uploadedCount += 1;
          return { ...report, photo: uploadedUrl };
        }
        return report;
      })
    );
  }

  let nextCheckIn = inspection.checkIn;
  if (inspection.checkIn?.photo && isImageDataUrl(inspection.checkIn.photo)) {
    const uploadedUrl = await uploadImageDataUrlToStorage(
      inspection.checkIn.photo,
      `inspections/${safeInspectionId}/checkin`,
      0
    );
    if (uploadedUrl !== inspection.checkIn.photo) {
      changed = true;
      uploadedCount += 1;
      nextCheckIn = { ...inspection.checkIn, photo: uploadedUrl };
    }
  }

  let nextCheckOut = inspection.checkOut;
  if (inspection.checkOut?.photo && isImageDataUrl(inspection.checkOut.photo)) {
    const uploadedUrl = await uploadImageDataUrlToStorage(
      inspection.checkOut.photo,
      `inspections/${safeInspectionId}/checkout`,
      0
    );
    if (uploadedUrl !== inspection.checkOut.photo) {
      changed = true;
      uploadedCount += 1;
      nextCheckOut = { ...inspection.checkOut, photo: uploadedUrl };
    }
  }

  let sectionChanged = false;
  let sectionUploads = 0;
  const rebuiltSections = nextSections.map(result => {
    if (result.changed) {
      sectionChanged = true;
      sectionUploads += result.uploadedCount;
    }
    return result.value;
  });

  if (sectionChanged) {
    changed = true;
    uploadedCount += sectionUploads;
  }

  if (!changed) {
    return { value: inspection, changed: false, uploadedCount: 0 };
  }

  const next: CleaningInspection = {
    ...inspection,
    sections: rebuiltSections,
    ...(nextDamageReports ? { damageReports: nextDamageReports } : {}),
    ...(nextCheckIn
      ? { checkIn: nextCheckIn }
      : { checkIn: inspection.checkIn }),
    ...(nextCheckOut
      ? { checkOut: nextCheckOut }
      : { checkOut: inspection.checkOut }),
  };

  if (nextPropertyNoteImages) {
    next.propertyNoteImages = nextPropertyNoteImages;
  }

  return { value: next, changed: true, uploadedCount };
};

const syncArrayReference = <T>(target: T[], source: T[]): void => {
  target.splice(0, target.length, ...source);
};

export async function submitInspection(
  inspection: CleaningInspection
): Promise<SubmitInspectionResult> {
  const localSaved = upsertLocalInspection(inspection);

  if (!hasSupabaseConfig()) {
    if (localSaved) {
      return { success: true, source: 'local' };
    }
    throw new Error('Supabase is not configured and local cache save failed');
  }

  let inspectionForCloud = inspection;

  try {
    const normalized = await normalizeInspectionAssets(inspection);
    inspectionForCloud = normalized.value;

    const row = toInspectionRow(inspectionForCloud);
    await upsertInspectionRows([row]);

    upsertLocalInspection(inspectionForCloud);
    markInspectionCloudWrite();
    return { success: true, source: 'supabase' };
  } catch (error) {
    if (localSaved) {
      console.warn(
        '[inspectionService] Supabase upsert failed, used local cache',
        error
      );
      return { success: true, source: 'local' };
    }
    throw error;
  }
}

export async function loadInspection(
  id: string
): Promise<CleaningInspection | null> {
  const localCached =
    loadLocalInspections().find(item => item.id === id) || null;
  try {
    const rows = await supabaseFetch<SupabaseInspectionRow[]>(
      `/rest/v1/cleaning_inspections?select=*&id=eq.${id}`
    );
    const cloud = rows[0]?.payload || null;
    if (cloud) {
      upsertLocalInspection(cloud);
      return cloud;
    }
    return localCached;
  } catch {
    return localCached;
  }
}

export async function loadAllInspections(): Promise<CleaningInspection[]> {
  const localCached = loadLocalInspections();
  try {
    const rows = await supabaseFetch<SupabaseInspectionRow[]>(
      '/rest/v1/cleaning_inspections?select=*&order=updated_at.desc.nullslast,id.desc'
    );
    const cloud = rows.map(row => row.payload);
    const merged = mergeInspections(cloud, localCached);
    saveLocalInspections(merged);
    return merged;
  } catch {
    return localCached;
  }
}

export async function deleteInspection(id: string): Promise<void> {
  const localDeleted = deleteLocalInspection(id);
  try {
    await supabaseFetch<SupabaseInspectionRow[]>(
      `/rest/v1/cleaning_inspections?id=eq.${id}`,
      {
        method: 'DELETE',
        headers: {
          Prefer: 'return=representation',
        },
      }
    );
    markInspectionCloudWrite();
  } catch (error) {
    if (!localDeleted) {
      throw error;
    }
    console.warn(
      '[inspectionService] Supabase delete failed, local cache updated only',
      error
    );
  }
}

export async function loadPropertyTemplates(): Promise<PropertyTemplate[]> {
  const localCached = readLocalStore<PropertyTemplate[]>(
    LOCAL_PROPERTIES_KEY,
    []
  );
  if (!hasSupabaseConfig()) {
    return localCached;
  }

  try {
    const rows = await supabaseFetch<SupabasePropertyRow[]>(
      '/rest/v1/cleaning_inspection_properties?select=*&order=updated_at.desc.nullslast,id.asc'
    );
    const cloud = rows.map(row => row.payload);
    writeLocalStore(LOCAL_PROPERTIES_KEY, cloud);
    return cloud;
  } catch (error) {
    // Supabase is configured but cloud read failed: surface the error instead of
    // silently using stale local templates.
    throw error;
  }
}

export async function savePropertyTemplates(
  templates: PropertyTemplate[]
): Promise<PropertyTemplate[]> {
  if (!hasSupabaseConfig()) {
    const localSaved = writeLocalStore(LOCAL_PROPERTIES_KEY, templates);
    if (!localSaved) {
      throw new Error(
        'Supabase is not configured and local template cache write failed'
      );
    }
    return templates;
  }

  const normalizedResults = await Promise.all(
    templates.map(template => normalizePropertyTemplateAssets(template))
  );
  const normalizedTemplates = normalizedResults.map(result => result.value);

  const localSaved = writeLocalStore(LOCAL_PROPERTIES_KEY, normalizedTemplates);
  const rows = normalizedTemplates.map(toPropertyRow);

  try {
    const existingRows = await supabaseFetch<Array<{ id: string }>>(
      '/rest/v1/cleaning_inspection_properties?select=id'
    );
    const nextIdSet = new Set(normalizedTemplates.map(item => item.id));
    const staleIds = existingRows
      .map(item => item.id)
      .filter(id => !nextIdSet.has(id));

    if (rows.length > 0) {
      await upsertPropertyRows(rows);
    }
    if (staleIds.length > 0) {
      await deletePropertyRows(staleIds);
    }

    syncArrayReference(templates, normalizedTemplates);
    if (rows.length > 0 || staleIds.length > 0) {
      markInspectionCloudWrite();
    }
    return normalizedTemplates;
  } catch (error) {
    // Supabase is configured: treat cloud save failure as an error so UI can
    // show sync failure instead of silently diverging local/cloud data.
    if (!localSaved) {
      throw error;
    }
    throw error;
  }
}

export function clearInspectionTemplateLocalCache(): void {
  try {
    localStorage.removeItem(LOCAL_PROPERTIES_KEY);
  } catch {
    // ignore cache clear failures
  }
}

export async function checkInspectionSupabaseConnection(): Promise<InspectionSupabaseConnectionStatus> {
  if (!hasSupabaseConfig()) {
    return {
      configured: false,
      connected: false,
      message: 'Supabase is not configured',
    };
  }

  try {
    await Promise.all([
      supabaseFetch<SupabasePropertyRow[]>(
        '/rest/v1/cleaning_inspection_properties?select=id&limit=1'
      ),
      supabaseFetch<SupabaseInspectionRow[]>(
        '/rest/v1/cleaning_inspections?select=id&limit=1'
      ),
      supabaseFetch<SupabaseEmployeeRow[]>(
        '/rest/v1/cleaning_inspection_employees?select=id&limit=1'
      ),
    ]);
    return { configured: true, connected: true };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      message: error instanceof Error ? error.message : 'Unknown cloud error',
    };
  }
}

export async function migrateInspectionAssetsToStorage(
  options: InspectionAssetMigrationOptions = {}
): Promise<InspectionAssetMigrationResult> {
  if (!hasSupabaseConfig()) {
    throw new Error('Supabase is not configured');
  }

  const includeTemplates = options.includeTemplates !== false;
  const includeInspections = options.includeInspections !== false;
  const inspectionLimit =
    typeof options.inspectionLimit === 'number' && options.inspectionLimit > 0
      ? Math.floor(options.inspectionLimit)
      : undefined;

  const result: InspectionAssetMigrationResult = {
    templatesProcessed: 0,
    templatesUpdated: 0,
    inspectionsProcessed: 0,
    inspectionsUpdated: 0,
    uploadedAssets: 0,
    failedInspections: 0,
  };

  if (includeTemplates) {
    const templateRows = await supabaseFetch<SupabasePropertyRow[]>(
      '/rest/v1/cleaning_inspection_properties?select=*&order=updated_at.desc.nullslast,id.asc'
    );
    const updates: SupabasePropertyRow[] = [];

    for (const row of templateRows) {
      result.templatesProcessed += 1;
      const normalized = await normalizePropertyTemplateAssets(row.payload);
      result.uploadedAssets += normalized.uploadedCount;
      if (!normalized.changed) {
        continue;
      }
      result.templatesUpdated += 1;
      updates.push(toPropertyRow(normalized.value));
    }

    if (updates.length > 0) {
      await upsertPropertyRows(updates);
    }
  }

  if (includeInspections) {
    const inspectionPath = inspectionLimit
      ? `/rest/v1/cleaning_inspections?select=*&order=updated_at.desc.nullslast,id.desc&limit=${inspectionLimit}`
      : '/rest/v1/cleaning_inspections?select=*&order=updated_at.desc.nullslast,id.desc';

    const inspectionRows =
      await supabaseFetch<SupabaseInspectionRow[]>(inspectionPath);
    const updates: SupabaseInspectionRow[] = [];

    for (const row of inspectionRows) {
      result.inspectionsProcessed += 1;
      try {
        const normalized = await normalizeInspectionAssets(row.payload);
        result.uploadedAssets += normalized.uploadedCount;
        if (!normalized.changed) {
          continue;
        }
        result.inspectionsUpdated += 1;
        updates.push(toInspectionRow(normalized.value));
      } catch (error) {
        result.failedInspections += 1;
        console.warn(
          '[inspectionService] Failed to migrate inspection assets',
          row.id,
          error
        );
      }
    }

    if (updates.length > 0) {
      await upsertInspectionRows(updates);
    }
  }

  if (result.templatesUpdated > 0 || result.inspectionsUpdated > 0) {
    markInspectionCloudWrite();
  }

  return result;
}

export async function loadEmployees(): Promise<Employee[]> {
  const localCached = readLocalStore<Employee[]>(LOCAL_EMPLOYEES_KEY, []);
  try {
    const rows = await supabaseFetch<SupabaseEmployeeRow[]>(
      '/rest/v1/cleaning_inspection_employees?select=*&order=updated_at.desc.nullslast,id.asc'
    );
    const cloud = rows.map(row => row.payload);
    writeLocalStore(LOCAL_EMPLOYEES_KEY, cloud);
    return cloud;
  } catch {
    return localCached;
  }
}

export async function saveEmployees(employees: Employee[]): Promise<void> {
  const localSaved = writeLocalStore(LOCAL_EMPLOYEES_KEY, employees);
  const rows = employees.map(toEmployeeRow);
  try {
    const existingRows = await supabaseFetch<Array<{ id: string }>>(
      '/rest/v1/cleaning_inspection_employees?select=id'
    );
    const nextIdSet = new Set(employees.map(item => item.id));
    const staleIds = existingRows
      .map(item => item.id)
      .filter(id => !nextIdSet.has(id));

    if (rows.length > 0) {
      await supabaseFetch<SupabaseEmployeeRow[]>(
        '/rest/v1/cleaning_inspection_employees?on_conflict=id',
        {
          method: 'POST',
          headers: {
            Prefer: 'resolution=merge-duplicates,return=representation',
          },
          body: JSON.stringify(rows),
        }
      );
    }
    if (staleIds.length > 0) {
      await deleteEmployeeRows(staleIds);
    }

    if (rows.length > 0 || staleIds.length > 0) {
      markInspectionCloudWrite();
    }
  } catch (error) {
    if (!localSaved) {
      throw error;
    }
    console.warn(
      '[inspectionService] Supabase save employees failed, local cache updated only',
      error
    );
  }
}
