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

const getSupabaseConfig = (): SupabaseConfig => {
  const runtime = globalThis as SupabaseRuntime;
  const url = runtime.__WENDEAL_SUPABASE_CONFIG__?.url?.trim();
  const anonKey = runtime.__WENDEAL_SUPABASE_CONFIG__?.anonKey?.trim();
  if (!url || !anonKey) {
    throw new Error('Supabase is not configured');
  }

  return { url, anonKey };
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
): Promise<{ success: boolean; source: 'supabase' }> {
  const row = toInspectionRow(inspection);
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

  return { success: true, source: 'supabase' };
}

export async function loadInspection(
  id: string
): Promise<CleaningInspection | null> {
  const rows = await supabaseFetch<SupabaseInspectionRow[]>(
    `/rest/v1/cleaning_inspections?select=*&id=eq.${id}`
  );
  return rows[0]?.payload || null;
}

export async function loadAllInspections(): Promise<CleaningInspection[]> {
  const rows = await supabaseFetch<SupabaseInspectionRow[]>(
    '/rest/v1/cleaning_inspections?select=*&order=updated_at.desc.nullslast,id.desc'
  );
  return rows.map(row => row.payload);
}

export async function deleteInspection(id: string): Promise<void> {
  await supabaseFetch<SupabaseInspectionRow[]>(
    `/rest/v1/cleaning_inspections?id=eq.${id}`,
    {
      method: 'DELETE',
      headers: {
        Prefer: 'return=representation',
      },
    }
  );
}

export async function loadPropertyTemplates(): Promise<PropertyTemplate[]> {
  const rows = await supabaseFetch<SupabasePropertyRow[]>(
    '/rest/v1/cleaning_inspection_properties?select=*&order=updated_at.desc.nullslast,id.asc'
  );
  return rows.map(row => row.payload);
}

export async function savePropertyTemplates(
  templates: PropertyTemplate[]
): Promise<void> {
  if (templates.length === 0) {
    return;
  }

  const rows = templates.map(toPropertyRow);
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
}

export async function loadEmployees(): Promise<Employee[]> {
  const rows = await supabaseFetch<SupabaseEmployeeRow[]>(
    '/rest/v1/cleaning_inspection_employees?select=*&order=updated_at.desc.nullslast,id.asc'
  );
  return rows.map(row => row.payload);
}

export async function saveEmployees(employees: Employee[]): Promise<void> {
  if (employees.length === 0) {
    return;
  }

  const rows = employees.map(toEmployeeRow);
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
