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

export type BondQuoteFormType =
  | 'bond_clean_quote_request'
  | 'bond_clean_quote_request_cn';

export type BondQuoteFormLinkStatus = 'active' | 'used' | 'disabled';

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
  formLinkId?: string;
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

interface SupabaseBondQuoteFormLinkRow {
  id: string;
  form_type: BondQuoteFormType;
  token: string;
  status: BondQuoteFormLinkStatus;
  created_at: string;
  used_at: string | null;
  used_submission_id: string | null;
  payload: Record<string, unknown> | null;
}

export interface BondQuoteFormLink {
  id: string;
  formType: BondQuoteFormType;
  token: string;
  status: BondQuoteFormLinkStatus;
  createdAt: string;
  usedAt: string | null;
  usedSubmissionId: string | null;
  payload: Record<string, unknown> | null;
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
const createFormShareLinkId = (): string =>
  `BQL-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createRandomToken = (length = 32): string => {
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(length);
  const runtimeCrypto = (
    globalThis as typeof globalThis & {
      crypto?: { getRandomValues?: (array: Uint8Array) => Uint8Array };
    }
  ).crypto;

  if (runtimeCrypto?.getRandomValues) {
    runtimeCrypto.getRandomValues(bytes);
    return Array.from(bytes, value => alphabet[value % alphabet.length]).join(
      ''
    );
  }

  return Array.from(
    { length },
    () => alphabet[Math.floor(Math.random() * alphabet.length)]
  ).join('');
};

const encodePostgrestValue = (value: string): string =>
  encodeURIComponent(value);

const toFormLink = (row: SupabaseBondQuoteFormLinkRow): BondQuoteFormLink => ({
  id: row.id,
  formType: row.form_type,
  token: row.token,
  status: row.status,
  createdAt: row.created_at,
  usedAt: row.used_at,
  usedSubmissionId: row.used_submission_id,
  payload: row.payload,
});

const toFormLinkRow = (
  link: BondQuoteFormLink
): SupabaseBondQuoteFormLinkRow => ({
  id: link.id,
  form_type: link.formType,
  token: link.token,
  status: link.status,
  created_at: link.createdAt,
  used_at: link.usedAt,
  used_submission_id: link.usedSubmissionId,
  payload: link.payload,
});

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

export async function createFormShareLink(
  formType: BondQuoteFormType,
  payload: Record<string, unknown> | null = null
): Promise<BondQuoteFormLink> {
  const link: BondQuoteFormLink = {
    id: createFormShareLinkId(),
    formType,
    token: createRandomToken(36),
    status: 'active',
    createdAt: new Date().toISOString(),
    usedAt: null,
    usedSubmissionId: null,
    payload,
  };

  const result = await supabaseFetch<SupabaseBondQuoteFormLinkRow[]>(
    '/rest/v1/bond_clean_quote_form_links?on_conflict=id',
    {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify([toFormLinkRow(link)]),
    }
  );

  const first = result[0];
  if (!first) {
    throw new Error('Form link creation returned no rows');
  }

  return toFormLink(first);
}

export async function getActiveFormShareLink(
  formType: BondQuoteFormType,
  id: string,
  token: string
): Promise<BondQuoteFormLink | null> {
  const rows = await supabaseFetch<SupabaseBondQuoteFormLinkRow[]>(
    `/rest/v1/bond_clean_quote_form_links?select=*&id=eq.${encodePostgrestValue(id)}&token=eq.${encodePostgrestValue(token)}&form_type=eq.${encodePostgrestValue(formType)}&status=eq.active&limit=1`
  );

  return rows[0] ? toFormLink(rows[0]) : null;
}

export async function markFormShareLinkUsed(
  id: string,
  token: string,
  submissionId: string
): Promise<BondQuoteFormLink> {
  const existingRows = await supabaseFetch<SupabaseBondQuoteFormLinkRow[]>(
    `/rest/v1/bond_clean_quote_form_links?select=*&id=eq.${encodePostgrestValue(id)}&token=eq.${encodePostgrestValue(token)}&limit=1`
  );
  const existing = existingRows[0];
  if (!existing) {
    throw new Error('Form share link not found');
  }
  if (existing.status === 'used') {
    return toFormLink(existing);
  }
  if (existing.status !== 'active') {
    throw new Error(`Form share link is not active: ${existing.status}`);
  }

  const result = await supabaseFetch<SupabaseBondQuoteFormLinkRow[]>(
    `/rest/v1/bond_clean_quote_form_links?id=eq.${encodePostgrestValue(id)}&token=eq.${encodePostgrestValue(token)}&status=eq.active`,
    {
      method: 'PATCH',
      headers: {
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        status: 'used',
        used_at: new Date().toISOString(),
        used_submission_id: submissionId,
      }),
    }
  );

  const first = result[0];
  if (!first) {
    throw new Error('Form share link update returned no rows');
  }

  return toFormLink(first);
}
