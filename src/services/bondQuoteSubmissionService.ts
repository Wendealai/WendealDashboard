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

export type BondQuoteStatus =
  | 'new'
  | 'contacted'
  | 'quoted'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

export interface BondQuoteSubmissionPayload {
  submittedAt: string;
  formType: string;
  customerName: string;
  email: string;
  phone: string;
  propertyAddress: string;
  propertyType: string;
  houseLevel?: 'single' | 'double';
  roomType: string;
  customRoomType?: string;
  hasCarpet: boolean;
  carpetRooms: number;
  garage: boolean;
  glassDoorWindowCount: number;
  oven: boolean;
  fridge: boolean;
  wallStainsCount: number;
  acFilterCount: number;
  blindsCount: number;
  moldCount: number;
  heavySoiling: boolean;
  rubbishRemoval: boolean;
  rubbishRemovalNotes?: string;
  preferredDate: string;
  additionalNotes: string;
  isSparkeryNewCustomer?: boolean;
  status: BondQuoteStatus;
}

export interface BondQuoteSubmission extends BondQuoteSubmissionPayload {
  id: string;
}

interface SupabaseBondQuoteSubmissionRow {
  id: string;
  submitted_at: string;
  status: BondQuoteStatus;
  payload: BondQuoteSubmission;
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

const toRow = (
  submission: BondQuoteSubmission
): SupabaseBondQuoteSubmissionRow => ({
  id: submission.id,
  submitted_at: submission.submittedAt,
  status: submission.status,
  payload: submission,
});

const toSubmission = (
  row: SupabaseBondQuoteSubmissionRow
): BondQuoteSubmission => ({
  ...row.payload,
  id: row.id,
  status: row.status,
  submittedAt: row.submitted_at,
});

const createSubmissionId = (): string => `BCQ-${Date.now()}`;

export async function createSubmission(
  payload: BondQuoteSubmissionPayload
): Promise<BondQuoteSubmission> {
  const submission: BondQuoteSubmission = {
    ...payload,
    id: createSubmissionId(),
  };

  const result = await supabaseFetch<SupabaseBondQuoteSubmissionRow[]>(
    '/rest/v1/bond_clean_quote_submissions?on_conflict=id',
    {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify([toRow(submission)]),
    }
  );

  const first = result[0];
  if (!first) {
    throw new Error('Submission creation returned no rows');
  }
  return toSubmission(first);
}

export async function listSubmissions(): Promise<BondQuoteSubmission[]> {
  const rows = await supabaseFetch<SupabaseBondQuoteSubmissionRow[]>(
    '/rest/v1/bond_clean_quote_submissions?select=*&order=submitted_at.desc.nullslast,id.desc'
  );
  return rows.map(toSubmission);
}

export async function updateSubmissionStatus(
  id: string,
  status: BondQuoteStatus
): Promise<BondQuoteSubmission> {
  const existingRows = await supabaseFetch<SupabaseBondQuoteSubmissionRow[]>(
    `/rest/v1/bond_clean_quote_submissions?select=*&id=eq.${id}`
  );
  const existing = existingRows[0];
  if (!existing) {
    throw new Error('Submission not found');
  }

  const merged = {
    ...toSubmission(existing),
    status,
  };
  const row = toRow(merged);

  const result = await supabaseFetch<SupabaseBondQuoteSubmissionRow[]>(
    `/rest/v1/bond_clean_quote_submissions?id=eq.${id}`,
    {
      method: 'PATCH',
      headers: {
        Prefer: 'return=representation',
      },
      body: JSON.stringify(row),
    }
  );

  const first = result[0];
  if (!first) {
    throw new Error('Submission update returned no rows');
  }
  return toSubmission(first);
}

export async function deleteSubmission(id: string): Promise<void> {
  await supabaseFetch<SupabaseBondQuoteSubmissionRow[]>(
    `/rest/v1/bond_clean_quote_submissions?id=eq.${id}`,
    {
      method: 'DELETE',
      headers: {
        Prefer: 'return=representation',
      },
    }
  );
}
