import type {
  CleaningInspection,
  Employee,
  PropertyTemplate,
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

const LOCAL_INSPECTIONS_KEY = 'archived-cleaning-inspections';
const LOCAL_PROPERTIES_KEY = 'cleaning-inspection-properties';
const LOCAL_EMPLOYEES_KEY = 'cleaning-inspection-employees';

const getSupabaseConfig = (): SupabaseConfig => {
  const runtime = globalThis as SupabaseRuntime;
  const url = runtime.__WENDEAL_SUPABASE_CONFIG__?.url?.trim();
  const anonKey = runtime.__WENDEAL_SUPABASE_CONFIG__?.anonKey?.trim();
  if (!url || !anonKey) {
    throw new Error('Supabase is not configured');
  }

  return { url, anonKey };
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

export async function submitInspection(
  inspection: CleaningInspection
): Promise<SubmitInspectionResult> {
  const localSaved = upsertLocalInspection(inspection);
  const row = toInspectionRow(inspection);
  try {
    const result = await supabaseFetch<SupabaseInspectionRow[]>(
      '/rest/v1/cleaning_inspections?on_conflict=id',
      {
        method: 'POST',
        headers: {
          Prefer: 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify([row]),
      }
    );

    if (!result[0]) {
      throw new Error('Supabase inspection upsert returned no rows');
    }

    upsertLocalInspection(inspection);
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
  try {
    const rows = await supabaseFetch<SupabasePropertyRow[]>(
      '/rest/v1/cleaning_inspection_properties?select=*&order=updated_at.desc.nullslast,id.asc'
    );
    const cloud = rows.map(row => row.payload);
    writeLocalStore(LOCAL_PROPERTIES_KEY, cloud);
    return cloud;
  } catch {
    return localCached;
  }
}

export async function savePropertyTemplates(
  templates: PropertyTemplate[]
): Promise<void> {
  if (templates.length === 0) {
    return;
  }

  const localSaved = writeLocalStore(LOCAL_PROPERTIES_KEY, templates);
  const rows = templates.map(toPropertyRow);
  try {
    await supabaseFetch<SupabasePropertyRow[]>(
      '/rest/v1/cleaning_inspection_properties?on_conflict=id',
      {
        method: 'POST',
        headers: {
          Prefer: 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify(rows),
      }
    );
  } catch (error) {
    if (!localSaved) {
      throw error;
    }
    console.warn(
      '[inspectionService] Supabase save property templates failed, local cache updated only',
      error
    );
  }
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
  if (employees.length === 0) {
    return;
  }

  const localSaved = writeLocalStore(LOCAL_EMPLOYEES_KEY, employees);
  const rows = employees.map(toEmployeeRow);
  try {
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
