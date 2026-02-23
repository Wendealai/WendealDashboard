import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

type JsonObject = Record<string, unknown>;
type DispatchServiceType = 'bond' | 'airbnb' | 'regular' | 'commercial';

type DispatchEmployeeRow = {
  id: string;
  name: string;
  name_cn: string | null;
  phone: string | null;
};

type InspectionPropertyRow = {
  id: string;
  name: string;
  payload: JsonObject;
};

type DispatchCustomerProfileRow = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  default_job_title: string | null;
  default_description: string | null;
  default_notes: string | null;
  recurring_enabled: boolean | null;
  recurring_weekday: number | null;
  recurring_weekdays: number[] | null;
  recurring_start_time: string | null;
  recurring_end_time: string | null;
  recurring_service_type: DispatchServiceType | null;
  recurring_priority: number | null;
};

const FUNCTION_NAME = 'sparkery-api';
const SERVICE_TYPES = new Set<DispatchServiceType>([
  'bond',
  'airbnb',
  'regular',
  'commercial',
]);
const DEFAULT_SECTION_IDS = [
  'kitchen',
  'living-room',
  'bedroom-1',
  'bathroom-1',
  'balcony',
];
const SECTION_NAMES: Record<string, string> = {
  kitchen: 'Kitchen',
  'living-room': 'Living Room',
  'bedroom-1': 'Bedroom 1',
  'bedroom-2': 'Bedroom 2',
  'bedroom-3': 'Bedroom 3',
  'bathroom-1': 'Bathroom 1',
  'bathroom-2': 'Bathroom 2',
  'bathroom-3': 'Bathroom 3',
  balcony: 'Balcony',
  'meeting-room': 'Meeting Room',
  'office-area-1': 'Office Area 1',
  'office-area-2': 'Office Area 2',
  'archive-room': 'Archive Room',
  pantry: 'Pantry',
  restroom: 'Restroom',
  'print-area': 'Print Area',
};

const IDEMPOTENCY_TABLE = 'sparkery_api_idempotency';
const AUDIT_TABLE = 'sparkery_api_audit_logs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

const json = (
  body: unknown,
  status = 200,
  extraHeaders?: HeadersInit
): Response => {
  const headers = new Headers(corsHeaders);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  if (extraHeaders) {
    const merged = new Headers(extraHeaders);
    merged.forEach((value, key) => headers.set(key, value));
  }
  return new Response(JSON.stringify(body), { status, headers });
};

const fail = (status: number, error: string, details?: unknown): Response =>
  json({ error, ...(details ? { details } : {}) }, status);

const withResponseHeaders = (
  response: Response,
  extraHeaders: HeadersInit
): Response => {
  const headers = new Headers(response.headers);
  const injected = new Headers(extraHeaders);
  injected.forEach((value, key) => headers.set(key, value));
  return new Response(response.body, {
    status: response.status,
    headers,
  });
};

const readString = (v: unknown): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  return s || undefined;
};

const readStringArray = (v: unknown): string[] =>
  Array.isArray(v)
    ? v
        .map(item => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
    : [];

const dedupeStrings = (items: string[]): string[] =>
  Array.from(new Set(items.map(item => item.trim()).filter(Boolean)));

const readEmployeeIdCandidate = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return readString(value);
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  const obj = value as JsonObject;
  const direct = readString(obj.id);
  if (direct) {
    return direct;
  }
  const nested = obj.employee;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return readString((nested as JsonObject).id);
  }
  return undefined;
};

const readEmployeeIdsFromObjects = (value: unknown): string[] =>
  Array.isArray(value)
    ? dedupeStrings(
        value
          .map(item => readEmployeeIdCandidate(item))
          .filter((item): item is string => Boolean(item))
      )
    : [];

const readEmployeeIdsFromResolutionObject = (value: unknown): string[] => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }
  const obj = value as JsonObject;
  return dedupeStrings([
    ...readEmployeeIdsFromObjects(obj.uniqueResolvedEmployees),
    ...readEmployeeIdsFromObjects(obj.resolvedAssignees),
    ...readEmployeeIdsFromObjects(obj.resolvedEmployees),
    ...readEmployeeIdsFromObjects(obj.employees),
    ...readEmployeeIdsFromObjects(obj.resolved),
  ]);
};

const resolveEmployeeInputPayload = (
  body: JsonObject,
  fallbackEmployeeIds?: string[]
): {
  employeeIds: string[];
  givenNames: string[];
} => {
  const directEmployeeIds = readStringArray(
    body.employeeIds || body.assignedEmployeeIds
  );
  const directGivenNames = readStringArray(
    body.assignees || body.employeeGivenNames || body.assignedEmployeeGivenNames
  );

  const idsFromObjectArrays = dedupeStrings([
    ...readEmployeeIdsFromObjects(body.uniqueResolvedEmployees),
    ...readEmployeeIdsFromObjects(body.resolvedAssignees),
    ...readEmployeeIdsFromObjects(body.resolvedEmployees),
    ...readEmployeeIdsFromObjects(body.assignedEmployees),
    ...readEmployeeIdsFromObjects(body.resolved),
  ]);

  const idsFromResolutionObjects = dedupeStrings([
    ...readEmployeeIdsFromResolutionObject(body.employeeResolution),
    ...readEmployeeIdsFromResolutionObject(body.resolveResult),
    ...readEmployeeIdsFromResolutionObject(body.assigneeResolution),
  ]);

  const mergedIds = dedupeStrings([
    ...directEmployeeIds,
    ...idsFromObjectArrays,
    ...idsFromResolutionObjects,
    ...(fallbackEmployeeIds || []),
  ]);

  return {
    employeeIds: mergedIds,
    givenNames: dedupeStrings(directGivenNames),
  };
};

const parseBody = async (req: Request): Promise<JsonObject> => {
  try {
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new Error('Body must be a JSON object');
    }
    return body as JsonObject;
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Invalid JSON body: ${error.message}`
        : 'Invalid JSON body'
    );
  }
};

const assertDate = (v: string, name: string): void => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    throw new Error(`${name} must be YYYY-MM-DD`);
  }
};

const assertTime = (v: string, name: string): void => {
  if (!/^\d{2}:\d{2}$/.test(v)) {
    throw new Error(`${name} must be HH:mm`);
  }
};

const normalizeName = (v: string): string =>
  v
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const firstToken = (v: string): string =>
  normalizeName(v).split(/[ -]+/)[0] || '';

const compact = (v: string): string => normalizeName(v).replace(/\s+/g, '');

const sanitize = (v: string): string =>
  v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

const genId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;

const routeOf = (pathname: string): string => {
  const seg = pathname.split('/').filter(Boolean);
  if (seg[0] === FUNCTION_NAME) seg.shift();
  return `/${seg.join('/')}`;
};

const parseDateKey = (dateText: string): Date => {
  const [yearText, monthText, dayText] = dateText.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    throw new Error(`Invalid date value: ${dateText}`);
  }
  return new Date(Date.UTC(year, month - 1, day));
};

const formatDateKey = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDaysToDateKey = (dateText: string, days: number): string => {
  const date = parseDateKey(dateText);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateKey(date);
};

const currentWeekStart = (): string => {
  const now = new Date();
  const utcDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const day = utcDate.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  utcDate.setUTCDate(utcDate.getUTCDate() + mondayOffset);
  return formatDateKey(utcDate);
};

const resolveWeekEnd = (weekStart: string): string =>
  addDaysToDateKey(weekStart, 6);

const listDatesInRange = (weekStart: string, weekEnd: string): string[] => {
  const start = parseDateKey(weekStart);
  const end = parseDateKey(weekEnd);
  const output: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    output.push(formatDateKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return output;
};

const isExecutableJobStatus = (status: string): boolean =>
  status !== 'completed' && status !== 'cancelled';

const normalizeRecurringWeekdays = (
  recurringWeekdays: unknown,
  recurringWeekday?: unknown
): number[] => {
  const values = Array.isArray(recurringWeekdays)
    ? recurringWeekdays
    : recurringWeekday
      ? [recurringWeekday]
      : [];
  const unique = new Set<number>();
  values.forEach(value => {
    const numeric = Number(value);
    if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 7) {
      unique.add(numeric);
    }
  });
  return Array.from(unique).sort((a, b) => a - b);
};

const tokenFromEnv = (): string | null =>
  readString(Deno.env.get('SPARKERY_API_TOKEN')) ||
  readString(Deno.env.get('SPARKERY_SINGLE_TOKEN')) ||
  null;

const authorized = (req: Request): boolean => {
  const token = tokenFromEnv();
  if (!token) return false;
  const auth = req.headers.get('authorization') || '';
  const bearer = auth.toLowerCase().startsWith('bearer ')
    ? auth.slice(7).trim()
    : '';
  const xKey = (req.headers.get('x-api-key') || '').trim();
  return bearer === token || xKey === token;
};

const supabaseClient = () => {
  const url = readString(Deno.env.get('SUPABASE_URL'));
  const key =
    readString(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) ||
    readString(Deno.env.get('SUPABASE_ANON_KEY'));
  if (!url) throw new Error('SUPABASE_URL is missing');
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing');
  return createClient(url, key);
};

const isMissingRelationError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const candidate = error as {
    code?: string;
    message?: string;
    details?: string;
  };
  const text =
    `${candidate.message || ''} ${candidate.details || ''}`.toLowerCase();
  return (
    candidate.code === '42P01' ||
    candidate.code === 'PGRST205' ||
    text.includes('does not exist') ||
    text.includes('relation')
  );
};

const normalizeForHash = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(item => normalizeForHash(item));
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  const source = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  Object.keys(source)
    .sort()
    .forEach(key => {
      output[key] = normalizeForHash(source[key]);
    });
  return output;
};

const sha256Hex = async (input: string): Promise<string> => {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
};

type IdempotencyContext = {
  endpoint: string;
  key: string;
  requestHash: string;
};

const buildIdempotencyContext = async (
  req: Request,
  endpoint: string,
  body: JsonObject
): Promise<IdempotencyContext | null> => {
  const key =
    readString(req.headers.get('idempotency-key')) ||
    readString(body.idempotencyKey);
  if (!key) {
    return null;
  }

  const bodyForHash: JsonObject = { ...body };
  delete bodyForHash.idempotencyKey;
  const canonical = JSON.stringify(
    normalizeForHash({
      endpoint,
      body: bodyForHash,
    })
  );

  return {
    endpoint,
    key,
    requestHash: await sha256Hex(canonical),
  };
};

const loadIdempotencyReplay = async (
  supabase: ReturnType<typeof createClient>,
  context: IdempotencyContext | null
): Promise<Response | null> => {
  if (!context) {
    return null;
  }

  const { data, error } = await supabase
    .from(IDEMPOTENCY_TABLE)
    .select('request_hash,status_code,response_payload')
    .eq('endpoint', context.endpoint)
    .eq('idempotency_key', context.key)
    .limit(1);

  if (error) {
    if (isMissingRelationError(error)) {
      return null;
    }
    return fail(500, 'Failed to read idempotency store', error.message);
  }

  const row = (data || [])[0] as
    | {
        request_hash: string;
        status_code: number;
        response_payload: unknown;
      }
    | undefined;

  if (!row) {
    return null;
  }

  if (row.request_hash !== context.requestHash) {
    return fail(409, 'Idempotency-Key conflict: request payload mismatch', {
      endpoint: context.endpoint,
      idempotencyKey: context.key,
    });
  }

  return json(
    row.response_payload || { ok: true },
    Number(row.status_code) || 200,
    {
      'x-idempotency-hit': 'true',
      'x-idempotency-key': context.key,
    }
  );
};

const storeIdempotencyResult = async (
  supabase: ReturnType<typeof createClient>,
  context: IdempotencyContext | null,
  statusCode: number,
  responsePayload: unknown
): Promise<void> => {
  if (!context || statusCode >= 500) {
    return;
  }

  const { error } = await supabase.from(IDEMPOTENCY_TABLE).upsert(
    {
      endpoint: context.endpoint,
      idempotency_key: context.key,
      request_hash: context.requestHash,
      status_code: statusCode,
      response_payload: responsePayload,
    },
    {
      onConflict: 'endpoint,idempotency_key',
    }
  );

  if (error && !isMissingRelationError(error)) {
    console.warn('[sparkery-api] Failed to persist idempotency result', error);
  }
};

const callerIpFromRequest = (req: Request): string | null => {
  const forwarded = readString(req.headers.get('x-forwarded-for'));
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || null;
  }
  return (
    readString(req.headers.get('cf-connecting-ip')) ||
    readString(req.headers.get('x-real-ip')) ||
    null
  );
};

const writeAuditLog = async (
  supabase: ReturnType<typeof createClient>,
  payload: {
    requestId: string;
    endpoint: string;
    method: string;
    statusCode: number;
    durationMs: number;
    idempotencyKey?: string | null;
    userAgent?: string | null;
    callerIp?: string | null;
    errorMessage?: string | null;
  }
): Promise<void> => {
  const { error } = await supabase.from(AUDIT_TABLE).insert({
    request_id: payload.requestId,
    endpoint: payload.endpoint,
    method: payload.method,
    status_code: payload.statusCode,
    duration_ms: payload.durationMs,
    idempotency_key: payload.idempotencyKey || null,
    user_agent: payload.userAgent || null,
    caller_ip: payload.callerIp || null,
    error_message: payload.errorMessage || null,
  });

  if (error && !isMissingRelationError(error)) {
    console.warn('[sparkery-api] Failed to write audit log', error);
  }
};

const addrCore = (v?: string): string | null => {
  const s = (v || '')
    .trim()
    .toLowerCase()
    .replace(/[.,#]/g, ' ')
    .replace(/\s+/g, ' ');
  if (!s) return null;
  const tokens = s.split(' ').filter(Boolean);
  let num = '';
  let idx = -1;
  for (let i = 0; i < tokens.length; i += 1) {
    const m = tokens[i]?.match(/\d+[a-z]?/i);
    if (m?.[0]) {
      num = m[0].toLowerCase();
      idx = i;
      break;
    }
  }
  if (!num || idx < 0) return null;
  const street = tokens
    .slice(idx + 1)
    .map(t => t.replace(/[^a-z]/g, ''))
    .filter(Boolean)
    .slice(0, 3)
    .join('-');
  if (!street) return null;
  return `${num}-${street}`;
};

const sectionTypeId = (id: string): string => id.replace(/__([1-9]\d*)$/, '');

const toReferences = (v: unknown): JsonObject[] =>
  Array.isArray(v)
    ? v
        .map(item => {
          if (!item || typeof item !== 'object' || Array.isArray(item))
            return null;
          const o = item as JsonObject;
          const image = readString(o.image);
          if (!image) return null;
          const out: JsonObject = { image };
          const desc = readString(o.description);
          if (desc) out.description = desc;
          return out;
        })
        .filter((item): item is JsonObject => Boolean(item))
    : [];

const toChecklist = (v: unknown, sectionId: string): JsonObject[] =>
  Array.isArray(v)
    ? v
        .map((item, i) => {
          if (!item || typeof item !== 'object' || Array.isArray(item))
            return null;
          const o = item as JsonObject;
          const label = readString(o.label);
          if (!label) return null;
          const out: JsonObject = {
            id: `${sectionId}-item-${i}`,
            label,
            checked: false,
            requiredPhoto: Boolean(o.requiredPhoto),
          };
          const labelEn = readString(o.labelEn);
          if (labelEn) out.labelEn = labelEn;
          return out;
        })
        .filter((item): item is JsonObject => Boolean(item))
    : [];

const templateName = (tpl: InspectionPropertyRow): string =>
  readString(tpl.payload.name) || tpl.name;
const templateAddr = (tpl: InspectionPropertyRow): string =>
  readString(tpl.payload.address) || '';

const appOrigin = (req: Request): string => {
  const sources = [
    readString(Deno.env.get('SPARKERY_APP_ORIGIN')),
    readString(Deno.env.get('PUBLIC_APP_ORIGIN')),
    readString(req.headers.get('origin')),
    readString(req.headers.get('referer')),
  ].filter(Boolean) as string[];
  for (const src of sources) {
    try {
      return new URL(src).origin;
    } catch {
      continue;
    }
  }
  return '';
};

const inspectionUrl = (
  origin: string,
  payload: {
    id: string;
    propertyName?: string;
    propertyAddress?: string;
    checkOutDate?: string;
    employeeIds?: string[];
    templateId?: string;
  }
): string => {
  const params = new URLSearchParams();
  params.set('id', payload.id);
  if (payload.propertyName) params.set('property', payload.propertyName);
  if (payload.propertyAddress) params.set('addr', payload.propertyAddress);
  if (payload.checkOutDate) params.set('date', payload.checkOutDate);
  if (payload.employeeIds?.length)
    params.set('employees', payload.employeeIds.join(','));
  if (payload.templateId) params.set('templateId', payload.templateId);
  const path = `/cleaning-inspection?${params.toString()}`;
  return origin ? `${origin.replace(/\/$/, '')}${path}` : path;
};

const matchGivenName = (emp: DispatchEmployeeRow, given: string): boolean => {
  const target = normalizeName(given);
  if (!target) return false;
  const full = normalizeName(emp.name);
  const fullCn = normalizeName(emp.name_cn || '');
  if (target === full || target === fullCn) return true;
  const first = firstToken(emp.name);
  const firstCn = firstToken(emp.name_cn || '');
  return target === first || target === firstCn;
};

const resolveEmployees = (
  rows: DispatchEmployeeRow[],
  employeeIds: string[],
  givenNames: string[]
): {
  selected: DispatchEmployeeRow[];
  missingIds: string[];
  unmatched: string[];
  ambiguous: Array<{ input: string; candidates: DispatchEmployeeRow[] }>;
} => {
  const byId = new Map(rows.map(row => [row.id, row]));
  const byIdFolded = new Map(rows.map(row => [row.id.toLowerCase(), row]));
  const selected = new Map<string, DispatchEmployeeRow>();
  const missingIds: string[] = [];
  for (const id of employeeIds) {
    const found = byId.get(id) || byIdFolded.get(id.toLowerCase());
    if (!found) {
      missingIds.push(id);
      continue;
    }
    selected.set(found.id, found);
  }

  const unmatched: string[] = [];
  const ambiguous: Array<{ input: string; candidates: DispatchEmployeeRow[] }> =
    [];
  for (const name of givenNames) {
    const idHit = byId.get(name) || byIdFolded.get(name.toLowerCase());
    if (idHit) {
      selected.set(idHit.id, idHit);
      continue;
    }
    const hit = rows.filter(row => matchGivenName(row, name));
    if (hit.length === 0) {
      unmatched.push(name);
      continue;
    }
    if (hit.length > 1) {
      ambiguous.push({ input: name, candidates: hit });
      continue;
    }
    selected.set(hit[0]!.id, hit[0]!);
  }

  return {
    selected: Array.from(selected.values()),
    missingIds,
    unmatched,
    ambiguous,
  };
};

const employeeView = (row: DispatchEmployeeRow): JsonObject => ({
  id: row.id,
  name: row.name,
  nameCn: row.name_cn,
  phone: row.phone,
  givenName: firstToken(row.name),
  givenNameCn: firstToken(row.name_cn || ''),
});

const resolveEmployeeInput = (
  rows: DispatchEmployeeRow[],
  input: string
):
  | {
      status: 'resolved';
      input: string;
      matchType: 'id' | 'given_name';
      employee: DispatchEmployeeRow;
    }
  | {
      status: 'unmatched';
      input: string;
    }
  | {
      status: 'ambiguous';
      input: string;
      candidates: DispatchEmployeeRow[];
    } => {
  const byId = new Map(rows.map(row => [row.id, row]));
  const byIdFolded = new Map(rows.map(row => [row.id.toLowerCase(), row]));
  const idHit = byId.get(input) || byIdFolded.get(input.toLowerCase());
  if (idHit) {
    return {
      status: 'resolved',
      input,
      matchType: 'id',
      employee: idHit,
    };
  }

  const hit = rows.filter(row => matchGivenName(row, input));
  if (hit.length === 0) {
    return { status: 'unmatched', input };
  }
  if (hit.length > 1) {
    return { status: 'ambiguous', input, candidates: hit };
  }
  return {
    status: 'resolved',
    input,
    matchType: 'given_name',
    employee: hit[0]!,
  };
};

const findTemplate = (
  templates: InspectionPropertyRow[],
  input: {
    templateId?: string;
    propertyName?: string;
    propertyAddress?: string;
  }
): {
  template: InspectionPropertyRow | null;
  strategy: string;
  candidates?: InspectionPropertyRow[];
} => {
  if (input.templateId) {
    return {
      template: templates.find(item => item.id === input.templateId) || null,
      strategy: 'template_id',
    };
  }

  const addr = addrCore(input.propertyAddress);
  if (addr) {
    const matched = templates.filter(
      item => addrCore(templateAddr(item)) === addr
    );
    if (matched.length === 1) {
      return { template: matched[0]!, strategy: 'address_core' };
    }
    if (matched.length > 1) {
      return {
        template: null,
        strategy: 'address_core_ambiguous',
        candidates: matched,
      };
    }
  }

  const name = compact(input.propertyName || '');
  if (name) {
    const matched = templates.filter(
      item => compact(templateName(item)) === name
    );
    if (matched.length === 1) {
      return { template: matched[0]!, strategy: 'property_name' };
    }
    if (matched.length > 1) {
      return {
        template: null,
        strategy: 'property_name_ambiguous',
        candidates: matched,
      };
    }
  }

  return { template: null, strategy: 'unmatched' };
};

const buildSections = (payload: JsonObject): JsonObject[] => {
  const sectionsRaw = Array.isArray(payload.sections) ? payload.sections : [];
  const sectionIds = sectionsRaw
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
  const activeIds = sectionIds.length > 0 ? sectionIds : DEFAULT_SECTION_IDS;

  const checklists =
    payload.checklists &&
    typeof payload.checklists === 'object' &&
    !Array.isArray(payload.checklists)
      ? (payload.checklists as JsonObject)
      : {};
  const refs =
    payload.referenceImages &&
    typeof payload.referenceImages === 'object' &&
    !Array.isArray(payload.referenceImages)
      ? (payload.referenceImages as JsonObject)
      : {};

  return activeIds.map(id => {
    const typeId = sectionTypeId(id);
    const checklistRaw = checklists[id] ?? checklists[typeId] ?? [];
    const refsRaw = refs[id] ?? refs[typeId] ?? [];
    return {
      id,
      name: SECTION_NAMES[typeId] || id,
      description: '',
      referenceImages: toReferences(refsRaw),
      photos: [],
      notes: '',
      checklist: toChecklist(checklistRaw, id),
    } as JsonObject;
  });
};

const toInspectionEmployee = (row: DispatchEmployeeRow): JsonObject => {
  const cn = readString(row.name_cn || undefined);
  const out: JsonObject = {
    id: row.id,
    name: cn || row.name,
  };
  if (cn) out.nameEn = row.name;
  if (row.phone) out.phone = row.phone;
  return out;
};

const handleCreateDispatchJob = async (
  req: Request,
  supabase: ReturnType<typeof createClient>
): Promise<Response> => {
  const endpoint = '/sparkery/v1/dispatch/jobs';
  let body: JsonObject;
  try {
    body = await parseBody(req);
  } catch (error) {
    return fail(
      400,
      error instanceof Error ? error.message : 'Invalid request body'
    );
  }

  const idempotency = await buildIdempotencyContext(req, endpoint, body);
  const replay = await loadIdempotencyReplay(supabase, idempotency);
  if (replay) {
    return replay;
  }

  const title = readString(body.title) || readString(body.taskContent);
  const scheduledDate = readString(body.scheduledDate) || readString(body.date);
  const startTime =
    readString(body.startTime) || readString(body.scheduledStartTime);
  const endTime = readString(body.endTime) || readString(body.scheduledEndTime);
  const customerAddress =
    readString(body.customerAddress) || readString(body.address);
  const customerName =
    readString(body.customerName) || readString(body.propertyName);

  if (!title || !scheduledDate || !startTime || !endTime || !customerAddress) {
    return fail(
      400,
      'Missing required fields: title, scheduledDate, startTime, endTime, customerAddress'
    );
  }

  try {
    assertDate(scheduledDate, 'scheduledDate');
    assertTime(startTime, 'startTime');
    assertTime(endTime, 'endTime');
  } catch (error) {
    return fail(
      400,
      error instanceof Error ? error.message : 'Invalid date/time format'
    );
  }

  const serviceTypeRaw = readString(body.serviceType) || 'regular';
  const serviceType = SERVICE_TYPES.has(serviceTypeRaw as DispatchServiceType)
    ? (serviceTypeRaw as DispatchServiceType)
    : 'regular';

  const priorityRaw = Number(body.priority);
  const priority =
    Number.isFinite(priorityRaw) && priorityRaw >= 1 && priorityRaw <= 5
      ? Math.round(priorityRaw)
      : 3;

  const { employeeIds, givenNames } = resolveEmployeeInputPayload(body);

  const { data: rows, error: employeeErr } = await supabase
    .from('dispatch_employees')
    .select('id,name,name_cn,phone')
    .order('id', { ascending: true });

  if (employeeErr) {
    return fail(500, 'Failed to query employees', employeeErr.message);
  }

  const resolved = resolveEmployees(
    (rows || []) as DispatchEmployeeRow[],
    employeeIds,
    givenNames
  );

  if (resolved.missingIds.length > 0) {
    return fail(400, 'Some employeeIds do not exist', {
      missingIds: resolved.missingIds,
    });
  }
  if (resolved.unmatched.length > 0) {
    return fail(400, 'Some employee given names did not match', {
      unmatchedGivenNames: resolved.unmatched,
    });
  }
  if (resolved.ambiguous.length > 0) {
    return fail(
      409,
      'Some employee given names are ambiguous',
      resolved.ambiguous.map(item => ({
        input: item.input,
        candidates: item.candidates.map(c => ({
          id: c.id,
          name: c.name,
          nameCn: c.name_cn,
        })),
      }))
    );
  }

  const assignedIds = resolved.selected.map(item => item.id);
  const now = new Date().toISOString();
  const jobId = readString(body.jobId) || genId('job-api');

  const { data: inserted, error: insertErr } = await supabase
    .from('dispatch_jobs')
    .insert({
      id: jobId,
      title,
      description: readString(body.description) || null,
      notes: readString(body.notes) || null,
      image_urls: null,
      customer_profile_id: readString(body.customerProfileId) || null,
      customer_name: customerName || null,
      customer_address: customerAddress,
      customer_phone: readString(body.customerPhone) || null,
      service_type: serviceType,
      property_type: readString(body.propertyType) || null,
      estimated_duration_hours: Number(body.estimatedDurationHours) || null,
      status: assignedIds.length > 0 ? 'assigned' : 'pending',
      priority,
      scheduled_date: scheduledDate,
      scheduled_start_time: startTime,
      scheduled_end_time: endTime,
      assigned_employee_ids: assignedIds,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single();

  if (insertErr) {
    return fail(
      insertErr.code === '23505' ? 409 : 500,
      'Failed to create dispatch job',
      insertErr.message
    );
  }

  const responsePayload = {
    ok: true,
    endpoint,
    job: inserted,
    matchedEmployees: resolved.selected.map(item => ({
      id: item.id,
      name: item.name,
      nameCn: item.name_cn,
    })),
  };

  await storeIdempotencyResult(supabase, idempotency, 201, responsePayload);
  return json(
    responsePayload,
    201,
    idempotency ? { 'x-idempotency-key': idempotency.key } : undefined
  );
};

const handleCreateInspectionLink = async (
  req: Request,
  supabase: ReturnType<typeof createClient>
): Promise<Response> => {
  const endpoint = '/sparkery/v1/inspection-links';
  let body: JsonObject;
  try {
    body = await parseBody(req);
  } catch (error) {
    return fail(
      400,
      error instanceof Error ? error.message : 'Invalid request body'
    );
  }

  const idempotency = await buildIdempotencyContext(req, endpoint, body);
  const replay = await loadIdempotencyReplay(supabase, idempotency);
  if (replay) {
    return replay;
  }

  const jobId = readString(body.jobId);
  let job: JsonObject | null = null;

  if (jobId) {
    const { data: jobRow, error: jobErr } = await supabase
      .from('dispatch_jobs')
      .select('*')
      .eq('id', jobId)
      .maybeSingle();

    if (jobErr) {
      return fail(500, 'Failed to query dispatch job', jobErr.message);
    }
    if (!jobRow) {
      return fail(404, `Dispatch job not found: ${jobId}`);
    }
    job = jobRow as JsonObject;
  }

  const checkOutDate =
    readString(body.checkOutDate) ||
    readString(body.date) ||
    readString(job?.scheduled_date);

  if (!checkOutDate) {
    return fail(
      400,
      'Missing required field: checkOutDate (or pass jobId with date)'
    );
  }

  try {
    assertDate(checkOutDate, 'checkOutDate');
  } catch (error) {
    return fail(
      400,
      error instanceof Error ? error.message : 'Invalid checkOutDate'
    );
  }

  const propertyTemplateId =
    readString(body.propertyTemplateId) || readString(body.templateId);
  const propertyName =
    readString(body.propertyName) ||
    readString(body.property) ||
    readString(job?.customer_name);
  const propertyAddress =
    readString(body.propertyAddress) ||
    readString(body.address) ||
    readString(job?.customer_address);

  const { data: templateRows, error: templateErr } = await supabase
    .from('cleaning_inspection_properties')
    .select('id,name,payload');

  if (templateErr) {
    return fail(
      500,
      'Failed to query inspection property templates',
      templateErr.message
    );
  }

  const match = findTemplate((templateRows || []) as InspectionPropertyRow[], {
    templateId: propertyTemplateId,
    propertyName,
    propertyAddress,
  });

  if (!match.template && match.candidates) {
    return fail(
      409,
      'Property template match is ambiguous',
      match.candidates.map(item => ({
        id: item.id,
        name: templateName(item),
        address: templateAddr(item),
      }))
    );
  }

  const tpl = match.template;
  if (!tpl) {
    return fail(
      404,
      'Could not match property template. Provide propertyTemplateId, or align Number + Street Name.',
      {
        strategy: match.strategy,
        propertyName: propertyName || null,
        propertyAddress: propertyAddress || null,
      }
    );
  }

  const employeeIdsFromJob = readStringArray(job?.assigned_employee_ids);
  const { employeeIds, givenNames } = resolveEmployeeInputPayload(
    body,
    employeeIdsFromJob
  );

  const { data: employeeRows, error: employeeErr } = await supabase
    .from('dispatch_employees')
    .select('id,name,name_cn,phone')
    .order('id', { ascending: true });

  if (employeeErr) {
    return fail(500, 'Failed to query employees', employeeErr.message);
  }

  const resolved = resolveEmployees(
    (employeeRows || []) as DispatchEmployeeRow[],
    employeeIds,
    givenNames
  );

  if (resolved.missingIds.length > 0) {
    return fail(400, 'Some employeeIds do not exist', {
      missingIds: resolved.missingIds,
    });
  }
  if (resolved.unmatched.length > 0) {
    return fail(400, 'Some employee given names did not match', {
      unmatchedGivenNames: resolved.unmatched,
    });
  }
  if (resolved.ambiguous.length > 0) {
    return fail(
      409,
      'Some employee given names are ambiguous',
      resolved.ambiguous.map(item => ({
        input: item.input,
        candidates: item.candidates.map(c => ({
          id: c.id,
          name: c.name,
          nameCn: c.name_cn,
        })),
      }))
    );
  }

  const tplPayload = tpl.payload || {};
  const assignedEmployees = resolved.selected.map(toInspectionEmployee);
  const assignedEmployeeIds = resolved.selected.map(item => item.id).sort();

  const inspectionId =
    readString(body.inspectionId) ||
    `insp-api-${sanitize(tpl.id || tpl.name || 'property')}-${checkOutDate.replaceAll('-', '')}-${
      assignedEmployeeIds.length > 0
        ? sanitize(assignedEmployeeIds.join('-')).slice(0, 42)
        : 'na'
    }`;

  const notes = readString(tplPayload.notes) || '';
  const notesZh = readString(tplPayload.notesZh);
  const noteImages = Array.isArray(tplPayload.noteImages)
    ? tplPayload.noteImages.filter(item => typeof item === 'string')
    : [];

  const inspectionPayload: JsonObject = {
    id: inspectionId,
    propertyTemplateId: tpl.id,
    templateName: templateName(tpl),
    propertyId: propertyName || templateName(tpl),
    propertyAddress: propertyAddress || templateAddr(tpl),
    propertyNotes: notes,
    checkOutDate,
    submittedAt: '',
    status: 'pending',
    sections: buildSections(tplPayload),
    checkIn: null,
    checkOut: null,
    damageReports: [],
  };

  if (notesZh) inspectionPayload.propertyNotesZh = notesZh;
  if (noteImages.length > 0) inspectionPayload.propertyNoteImages = noteImages;
  if (assignedEmployees.length > 0) {
    inspectionPayload.assignedEmployees = assignedEmployees;
    inspectionPayload.assignedEmployee = assignedEmployees[0];
  }

  const { error: upsertErr } = await supabase
    .from('cleaning_inspections')
    .upsert(
      {
        id: inspectionId,
        property_id: String(inspectionPayload.propertyId || templateName(tpl)),
        status: 'pending',
        check_out_date: checkOutDate,
        submitted_at: null,
        payload: inspectionPayload,
      },
      { onConflict: 'id' }
    );

  if (upsertErr) {
    return fail(500, 'Failed to create inspection record', upsertErr.message);
  }

  if (assignedEmployees.length > 0) {
    const { error: mirrorErr } = await supabase
      .from('cleaning_inspection_employees')
      .upsert(
        assignedEmployees.map(item => ({
          id: String(item.id || ''),
          name: String(item.name || ''),
          payload: item,
        })),
        { onConflict: 'id' }
      );

    if (mirrorErr) {
      return fail(
        500,
        'Failed to sync inspection employee mirror',
        mirrorErr.message
      );
    }
  }

  const shareUrl = inspectionUrl(appOrigin(req), {
    id: inspectionId,
    propertyName: String(inspectionPayload.propertyId || ''),
    propertyAddress: String(inspectionPayload.propertyAddress || ''),
    checkOutDate,
    employeeIds: assignedEmployeeIds,
    templateId: tpl.id,
  });

  const responsePayload = {
    ok: true,
    endpoint,
    inspectionId,
    shareUrl,
    matchStrategy: match.strategy,
    template: {
      id: tpl.id,
      name: templateName(tpl),
      address: templateAddr(tpl),
    },
    employees: resolved.selected.map(item => ({
      id: item.id,
      name: item.name,
      nameCn: item.name_cn,
    })),
    fromJobId: jobId || null,
  };

  await storeIdempotencyResult(supabase, idempotency, 201, responsePayload);
  return json(
    responsePayload,
    201,
    idempotency ? { 'x-idempotency-key': idempotency.key } : undefined
  );
};

const handleListEmployees = async (
  req: Request,
  supabase: ReturnType<typeof createClient>
): Promise<Response> => {
  const endpoint = '/sparkery/v1/employees';
  const url = new URL(req.url);
  const q = readString(url.searchParams.get('q'));

  const { data: rows, error } = await supabase
    .from('dispatch_employees')
    .select('id,name,name_cn,phone')
    .order('name', { ascending: true })
    .order('id', { ascending: true });

  if (error) {
    return fail(500, 'Failed to query employees', error.message);
  }

  const list = ((rows || []) as DispatchEmployeeRow[])
    .filter(row => {
      if (!q) return true;
      const target = normalizeName(q);
      if (!target) return true;
      return (
        normalizeName(row.name).includes(target) ||
        normalizeName(row.name_cn || '').includes(target) ||
        normalizeName(row.id).includes(target) ||
        firstToken(row.name) === target ||
        firstToken(row.name_cn || '') === target
      );
    })
    .map(employeeView);

  return json({
    ok: true,
    endpoint,
    total: list.length,
    employees: list,
  });
};

const handleResolveEmployees = async (
  req: Request,
  supabase: ReturnType<typeof createClient>
): Promise<Response> => {
  const endpoint = '/sparkery/v1/employees/resolve';
  let body: JsonObject;
  try {
    body = await parseBody(req);
  } catch (error) {
    return fail(
      400,
      error instanceof Error ? error.message : 'Invalid request body'
    );
  }

  const inputs = readStringArray(
    body.assignees ||
      body.inputs ||
      body.names ||
      body.employeeGivenNames ||
      body.employeeIds
  );
  if (inputs.length === 0) {
    return fail(
      400,
      'Provide assignees (or inputs/names/employeeGivenNames/employeeIds) as a non-empty string array'
    );
  }
  if (inputs.length > 200) {
    return fail(400, 'Input array length cannot exceed 200');
  }

  const { data: rows, error } = await supabase
    .from('dispatch_employees')
    .select('id,name,name_cn,phone')
    .order('name', { ascending: true })
    .order('id', { ascending: true });

  if (error) {
    return fail(500, 'Failed to query employees', error.message);
  }

  const employees = (rows || []) as DispatchEmployeeRow[];
  const resolved: Array<{
    input: string;
    matchType: 'id' | 'given_name';
    employee: JsonObject;
  }> = [];
  const ambiguous: Array<{
    input: string;
    candidates: JsonObject[];
  }> = [];
  const unmatched: string[] = [];

  for (const input of inputs) {
    const item = resolveEmployeeInput(employees, input);
    if (item.status === 'resolved') {
      resolved.push({
        input: item.input,
        matchType: item.matchType,
        employee: employeeView(item.employee),
      });
      continue;
    }
    if (item.status === 'ambiguous') {
      ambiguous.push({
        input: item.input,
        candidates: item.candidates.map(employeeView),
      });
      continue;
    }
    unmatched.push(item.input);
  }

  const uniqueResolved = Array.from(
    new Map(
      resolved.map(item => [String(item.employee.id), item.employee])
    ).values()
  );

  return json({
    ok: true,
    endpoint,
    totalInputs: inputs.length,
    resolvedCount: resolved.length,
    unresolvedCount: ambiguous.length + unmatched.length,
    canAutoAssign: ambiguous.length === 0 && unmatched.length === 0,
    resolved,
    uniqueResolvedEmployees: uniqueResolved,
    ambiguous,
    unmatched,
  });
};

const handleGenerateWeeklyPlanLink = async (
  req: Request,
  supabase: ReturnType<typeof createClient>
): Promise<Response> => {
  const endpoint = '/sparkery/v1/dispatch/weekly-plan-links';
  let body: JsonObject;
  try {
    body = await parseBody(req);
  } catch (error) {
    return fail(
      400,
      error instanceof Error ? error.message : 'Invalid request body'
    );
  }

  const idempotency = await buildIdempotencyContext(req, endpoint, body);
  const replay = await loadIdempotencyReplay(supabase, idempotency);
  if (replay) {
    return replay;
  }

  const weekStart = readString(body.weekStart) || currentWeekStart();
  const weekEnd = readString(body.weekEnd) || resolveWeekEnd(weekStart);
  const employeeIdInput = readString(body.employeeId);
  const employeeGivenName =
    readString(body.employeeGivenName) || readString(body.assignee);
  const includeCompleted = Boolean(body.includeCompleted);

  try {
    assertDate(weekStart, 'weekStart');
    assertDate(weekEnd, 'weekEnd');
  } catch (error) {
    return fail(400, error instanceof Error ? error.message : 'Invalid week');
  }

  if (weekEnd < weekStart) {
    return fail(400, 'weekEnd cannot be earlier than weekStart');
  }

  if (!employeeIdInput && !employeeGivenName) {
    return fail(400, 'Provide employeeId or employeeGivenName');
  }

  const { data: employeeRows, error: employeeErr } = await supabase
    .from('dispatch_employees')
    .select('id,name,name_cn,phone')
    .order('id', { ascending: true });

  if (employeeErr) {
    return fail(500, 'Failed to query employees', employeeErr.message);
  }

  const resolved = resolveEmployees(
    (employeeRows || []) as DispatchEmployeeRow[],
    employeeIdInput ? [employeeIdInput] : [],
    employeeGivenName ? [employeeGivenName] : []
  );

  if (resolved.missingIds.length > 0) {
    return fail(404, 'Employee not found', { missingIds: resolved.missingIds });
  }
  if (resolved.unmatched.length > 0) {
    return fail(404, 'Employee given name not found', {
      unmatchedGivenNames: resolved.unmatched,
    });
  }
  if (resolved.ambiguous.length > 0) {
    return fail(
      409,
      'Employee given name is ambiguous',
      resolved.ambiguous.map(item => ({
        input: item.input,
        candidates: item.candidates.map(candidate => ({
          id: candidate.id,
          name: candidate.name,
          nameCn: candidate.name_cn,
        })),
      }))
    );
  }
  if (resolved.selected.length === 0) {
    return fail(404, 'Employee not found');
  }
  if (resolved.selected.length > 1) {
    return fail(400, 'Please resolve to exactly one employee');
  }

  const employee = resolved.selected[0]!;

  const { data: rows, error: jobsErr } = await supabase
    .from('dispatch_jobs')
    .select('id,scheduled_date,scheduled_start_time,status')
    .gte('scheduled_date', weekStart)
    .lte('scheduled_date', weekEnd)
    .contains('assigned_employee_ids', [employee.id])
    .order('scheduled_date', { ascending: true })
    .order('scheduled_start_time', { ascending: true });

  if (jobsErr) {
    return fail(500, 'Failed to query dispatch jobs', jobsErr.message);
  }

  const filteredJobs = (
    (rows || []) as Array<{
      id: string;
      scheduled_date: string;
      scheduled_start_time: string;
      status: string;
    }>
  ).filter(job => includeCompleted || isExecutableJobStatus(job.status));

  const jobIds = filteredJobs.map(job => job.id);
  const countsByDate: Record<string, number> = {};
  listDatesInRange(weekStart, weekEnd).forEach(date => {
    countsByDate[date] = 0;
  });
  filteredJobs.forEach(job => {
    countsByDate[job.scheduled_date] =
      (countsByDate[job.scheduled_date] || 0) + 1;
  });

  const params = new URLSearchParams({
    employeeId: employee.id,
    weekStart,
    weekEnd,
  });
  if (jobIds.length > 0) {
    params.set('jobIds', jobIds.join(','));
  }
  const path = `/dispatch-week-plan?${params.toString()}`;
  const origin = appOrigin(req);
  const planUrl = origin ? `${origin.replace(/\/$/, '')}${path}` : path;

  const responsePayload = {
    ok: true,
    endpoint,
    employee: {
      id: employee.id,
      name: employee.name,
      nameCn: employee.name_cn,
    },
    weekStart,
    weekEnd,
    includeCompleted,
    totalJobs: jobIds.length,
    jobCountByDate: countsByDate,
    jobIds,
    planUrl,
  };

  await storeIdempotencyResult(supabase, idempotency, 200, responsePayload);
  return json(
    responsePayload,
    200,
    idempotency ? { 'x-idempotency-key': idempotency.key } : undefined
  );
};

const handleImportRecurringJobs = async (
  req: Request,
  supabase: ReturnType<typeof createClient>
): Promise<Response> => {
  const endpoint = '/sparkery/v1/dispatch/recurring/import';
  let body: JsonObject;
  try {
    body = await parseBody(req);
  } catch (error) {
    return fail(
      400,
      error instanceof Error ? error.message : 'Invalid request body'
    );
  }

  const idempotency = await buildIdempotencyContext(req, endpoint, body);
  const replay = await loadIdempotencyReplay(supabase, idempotency);
  if (replay) {
    return replay;
  }

  const weekStart = readString(body.weekStart) || currentWeekStart();
  const weekEnd = readString(body.weekEnd) || resolveWeekEnd(weekStart);

  try {
    assertDate(weekStart, 'weekStart');
    assertDate(weekEnd, 'weekEnd');
  } catch (error) {
    return fail(400, error instanceof Error ? error.message : 'Invalid week');
  }

  if (weekEnd < weekStart) {
    return fail(400, 'weekEnd cannot be earlier than weekStart');
  }

  const { data: profileRows, error: profilesErr } = await supabase
    .from('dispatch_customer_profiles')
    .select(
      'id,name,address,phone,default_job_title,default_description,default_notes,recurring_enabled,recurring_weekday,recurring_weekdays,recurring_start_time,recurring_end_time,recurring_service_type,recurring_priority'
    )
    .eq('recurring_enabled', true);

  if (profilesErr) {
    return fail(
      500,
      'Failed to query recurring customer profiles',
      profilesErr.message
    );
  }

  const { data: existingRows, error: existingErr } = await supabase
    .from('dispatch_jobs')
    .select('id,customer_profile_id,scheduled_date,scheduled_start_time')
    .gte('scheduled_date', weekStart)
    .lte('scheduled_date', weekEnd);

  if (existingErr) {
    return fail(
      500,
      'Failed to query existing dispatch jobs',
      existingErr.message
    );
  }

  const existingKeySet = new Set<string>();
  (
    (existingRows || []) as Array<{
      customer_profile_id: string | null;
      scheduled_date: string;
      scheduled_start_time: string;
    }>
  ).forEach(job => {
    if (!job.customer_profile_id) {
      return;
    }
    existingKeySet.add(
      `${job.customer_profile_id}|${job.scheduled_date}|${job.scheduled_start_time}`
    );
  });

  const createdRows: Array<Record<string, unknown>> = [];
  const createdPreview: Array<{
    profileId: string;
    profileName: string;
    scheduledDate: string;
    scheduledStartTime: string;
    scheduledEndTime: string;
    title: string;
  }> = [];
  let skippedExisting = 0;
  let skippedInvalidConfig = 0;
  let skippedNoWeekday = 0;

  (profileRows as DispatchCustomerProfileRow[] | null)?.forEach(profile => {
    if (!profile.recurring_start_time || !profile.recurring_end_time) {
      skippedInvalidConfig += 1;
      return;
    }

    const effectiveDays = normalizeRecurringWeekdays(
      profile.recurring_weekdays,
      profile.recurring_weekday
    );
    if (effectiveDays.length === 0) {
      skippedNoWeekday += 1;
      return;
    }

    effectiveDays.forEach(weekday => {
      const scheduledDate = addDaysToDateKey(weekStart, weekday - 1);
      if (scheduledDate < weekStart || scheduledDate > weekEnd) {
        return;
      }

      const dedupKey = `${profile.id}|${scheduledDate}|${profile.recurring_start_time}`;
      if (existingKeySet.has(dedupKey)) {
        skippedExisting += 1;
        return;
      }

      existingKeySet.add(dedupKey);

      const serviceType = SERVICE_TYPES.has(
        profile.recurring_service_type as DispatchServiceType
      )
        ? profile.recurring_service_type
        : 'regular';
      const priority =
        typeof profile.recurring_priority === 'number' &&
        profile.recurring_priority >= 1 &&
        profile.recurring_priority <= 5
          ? Math.round(profile.recurring_priority)
          : 3;

      const title =
        readString(profile.default_job_title) ||
        `${profile.name} Recurring Service`;
      const now = new Date().toISOString();

      createdRows.push({
        id: genId('job-api-recurring'),
        title,
        description: readString(profile.default_description) || null,
        notes: readString(profile.default_notes) || null,
        image_urls: null,
        customer_profile_id: profile.id,
        customer_name: profile.name,
        customer_address: readString(profile.address) || null,
        customer_phone: readString(profile.phone) || null,
        service_type: serviceType,
        property_type: null,
        estimated_duration_hours: null,
        status: 'pending',
        priority,
        scheduled_date: scheduledDate,
        scheduled_start_time: profile.recurring_start_time,
        scheduled_end_time: profile.recurring_end_time,
        assigned_employee_ids: [],
        created_at: now,
        updated_at: now,
      });

      createdPreview.push({
        profileId: profile.id,
        profileName: profile.name,
        scheduledDate,
        scheduledStartTime: profile.recurring_start_time,
        scheduledEndTime: profile.recurring_end_time,
        title,
      });
    });
  });

  let insertedRows: Array<{ id: string; scheduled_date: string }> = [];
  if (createdRows.length > 0) {
    const { data: inserted, error: insertErr } = await supabase
      .from('dispatch_jobs')
      .insert(createdRows)
      .select('id,scheduled_date');

    if (insertErr) {
      return fail(
        500,
        'Failed to insert recurring dispatch jobs',
        insertErr.message
      );
    }
    insertedRows = (inserted || []) as Array<{
      id: string;
      scheduled_date: string;
    }>;
  }

  const createdCountByDate: Record<string, number> = {};
  insertedRows.forEach(item => {
    createdCountByDate[item.scheduled_date] =
      (createdCountByDate[item.scheduled_date] || 0) + 1;
  });

  const responsePayload = {
    ok: true,
    endpoint,
    weekStart,
    weekEnd,
    scannedProfiles: (profileRows || []).length,
    createdCount: insertedRows.length,
    skippedExistingCount: skippedExisting,
    skippedInvalidConfigCount: skippedInvalidConfig,
    skippedNoWeekdayCount: skippedNoWeekday,
    createdCountByDate,
    createdJobsPreview: createdPreview.slice(0, 60),
  };

  await storeIdempotencyResult(supabase, idempotency, 200, responsePayload);
  return json(
    responsePayload,
    200,
    idempotency ? { 'x-idempotency-key': idempotency.key } : undefined
  );
};

const handleBatchCreateDispatchJobs = async (
  req: Request,
  supabase: ReturnType<typeof createClient>
): Promise<Response> => {
  const endpoint = '/sparkery/v1/dispatch/jobs/batch';
  let body: JsonObject;
  try {
    body = await parseBody(req);
  } catch (error) {
    return fail(
      400,
      error instanceof Error ? error.message : 'Invalid request body'
    );
  }

  const idempotency = await buildIdempotencyContext(req, endpoint, body);
  const replay = await loadIdempotencyReplay(supabase, idempotency);
  if (replay) {
    return replay;
  }

  const jobs = Array.isArray(body.jobs) ? body.jobs : [];
  const continueOnError = Boolean(body.continueOnError);
  if (jobs.length === 0) {
    return fail(400, 'jobs must be a non-empty array');
  }
  if (jobs.length > 100) {
    return fail(400, 'jobs length cannot exceed 100');
  }

  const internalHeaders = new Headers({
    'content-type': 'application/json',
  });
  const created: unknown[] = [];
  const errors: Array<{
    index: number;
    status: number;
    error: string;
    details?: unknown;
  }> = [];

  for (let index = 0; index < jobs.length; index += 1) {
    const payload = jobs[index];
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      errors.push({
        index,
        status: 400,
        error: 'Each jobs item must be a JSON object',
      });
      if (!continueOnError) {
        break;
      }
      continue;
    }

    const internalPayload = { ...(payload as JsonObject) };
    delete internalPayload.idempotencyKey;

    const internalReq = new Request(req.url, {
      method: 'POST',
      headers: internalHeaders,
      body: JSON.stringify(internalPayload),
    });
    const result = await handleCreateDispatchJob(internalReq, supabase);
    const resultBody = (await result
      .clone()
      .json()
      .catch(() => ({}))) as {
      error?: string;
      details?: unknown;
      job?: unknown;
    };

    if (result.status >= 400) {
      errors.push({
        index,
        status: result.status,
        error: resultBody.error || 'Batch item failed',
        details: resultBody.details,
      });
      if (!continueOnError) {
        break;
      }
      continue;
    }

    if (resultBody.job) {
      created.push(resultBody.job);
    }
  }

  const ok = errors.length === 0;
  const statusCode = ok
    ? 201
    : continueOnError
      ? 200
      : errors[0]?.status || 400;

  const responsePayload = {
    ok,
    endpoint,
    continueOnError,
    requestedCount: jobs.length,
    createdCount: created.length,
    failedCount: errors.length,
    createdJobs: created,
    errors,
  };

  await storeIdempotencyResult(
    supabase,
    idempotency,
    statusCode,
    responsePayload
  );
  return json(
    responsePayload,
    statusCode,
    idempotency ? { 'x-idempotency-key': idempotency.key } : undefined
  );
};

const handleDeleteDispatchJobs = async (
  req: Request,
  supabase: ReturnType<typeof createClient>
): Promise<Response> => {
  const endpoint = '/sparkery/v1/dispatch/jobs/delete';
  let body: JsonObject;
  try {
    body = await parseBody(req);
  } catch (error) {
    return fail(
      400,
      error instanceof Error ? error.message : 'Invalid request body'
    );
  }

  const idempotency = await buildIdempotencyContext(req, endpoint, body);
  const replay = await loadIdempotencyReplay(supabase, idempotency);
  if (replay) {
    return replay;
  }

  const ids = Array.from(
    new Set([
      ...(readString(body.jobId) ? [readString(body.jobId)!] : []),
      ...readStringArray(body.jobIds || body.ids),
    ])
  );
  if (ids.length === 0) {
    return fail(400, 'Provide jobId or jobIds');
  }
  if (ids.length > 200) {
    return fail(400, 'jobIds length cannot exceed 200');
  }

  const { data: existingRows, error: existingErr } = await supabase
    .from('dispatch_jobs')
    .select('id,title,scheduled_date')
    .in('id', ids);

  if (existingErr) {
    return fail(500, 'Failed to query jobs for deletion', existingErr.message);
  }

  const existing = (existingRows || []) as Array<{
    id: string;
    title: string;
    scheduled_date: string;
  }>;
  const existingIdSet = new Set(existing.map(item => item.id));
  const missingIds = ids.filter(id => !existingIdSet.has(id));

  let deleted: Array<{ id: string; title: string; scheduled_date: string }> =
    [];
  if (existing.length > 0) {
    const { data: deletedRows, error: deleteErr } = await supabase
      .from('dispatch_jobs')
      .delete()
      .in(
        'id',
        existing.map(item => item.id)
      )
      .select('id,title,scheduled_date');

    if (deleteErr) {
      return fail(500, 'Failed to delete dispatch jobs', deleteErr.message);
    }
    deleted = (deletedRows || []) as Array<{
      id: string;
      title: string;
      scheduled_date: string;
    }>;
  }

  const responsePayload = {
    ok: true,
    endpoint,
    requestedCount: ids.length,
    deletedCount: deleted.length,
    missingCount: missingIds.length,
    deletedJobs: deleted,
    missingIds,
  };

  await storeIdempotencyResult(supabase, idempotency, 200, responsePayload);
  return json(
    responsePayload,
    200,
    idempotency ? { 'x-idempotency-key': idempotency.key } : undefined
  );
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const idempotencyKeyHeader = readString(req.headers.get('idempotency-key'));
  const userAgent = readString(req.headers.get('user-agent'));
  const callerIp = callerIpFromRequest(req);

  const route = routeOf(new URL(req.url).pathname);
  let response: Response | null = null;
  let auditEnabled = false;
  let auditSupabase: ReturnType<typeof createClient> | null = null;

  if (
    req.method === 'GET' &&
    (route === '/health' || route === '/sparkery/v1/health')
  ) {
    response = json({
      ok: true,
      service: FUNCTION_NAME,
      time: new Date().toISOString(),
      endpoints: [
        'GET /sparkery/v1/employees',
        'POST /sparkery/v1/employees/resolve',
        'POST /sparkery/v1/dispatch/jobs',
        'POST /sparkery/v1/dispatch/jobs/batch',
        'POST /sparkery/v1/dispatch/jobs/delete',
        'POST /sparkery/v1/inspection-links',
        'POST /sparkery/v1/dispatch/weekly-plan-links',
        'POST /sparkery/v1/dispatch/recurring/import',
      ],
    });
  } else if (!authorized(req)) {
    response = fail(
      401,
      'Unauthorized. Use Authorization: Bearer <SPARKERY_API_TOKEN>.'
    );
  } else {
    auditEnabled = true;
    try {
      auditSupabase = supabaseClient();
    } catch (error) {
      response = fail(
        500,
        'Supabase environment is not configured',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  if (auditEnabled && auditSupabase) {
    try {
      if (req.method === 'GET' && route === '/sparkery/v1/employees') {
        response = await handleListEmployees(req, auditSupabase);
      } else if (
        req.method === 'POST' &&
        route === '/sparkery/v1/employees/resolve'
      ) {
        response = await handleResolveEmployees(req, auditSupabase);
      } else if (
        req.method === 'POST' &&
        route === '/sparkery/v1/dispatch/jobs'
      ) {
        response = await handleCreateDispatchJob(req, auditSupabase);
      } else if (
        req.method === 'POST' &&
        route === '/sparkery/v1/dispatch/jobs/batch'
      ) {
        response = await handleBatchCreateDispatchJobs(req, auditSupabase);
      } else if (
        req.method === 'POST' &&
        route === '/sparkery/v1/dispatch/jobs/delete'
      ) {
        response = await handleDeleteDispatchJobs(req, auditSupabase);
      } else if (
        req.method === 'POST' &&
        route === '/sparkery/v1/inspection-links'
      ) {
        response = await handleCreateInspectionLink(req, auditSupabase);
      } else if (
        req.method === 'POST' &&
        route === '/sparkery/v1/dispatch/weekly-plan-links'
      ) {
        response = await handleGenerateWeeklyPlanLink(req, auditSupabase);
      } else if (
        req.method === 'POST' &&
        route === '/sparkery/v1/dispatch/recurring/import'
      ) {
        response = await handleImportRecurringJobs(req, auditSupabase);
      } else {
        response = fail(404, `Route not found: ${req.method} ${route}`);
      }
    } catch (error) {
      response = fail(
        500,
        'Unhandled sparkery-api error',
        error instanceof Error ? error.message : String(error)
      );
    }

    const durationMs = Date.now() - startedAt;
    let errorMessage: string | null = null;
    if (response.status >= 400) {
      const preview = (await response
        .clone()
        .json()
        .catch(() => null)) as JsonObject | null;
      errorMessage = preview ? readString(preview.error) || null : null;
    }
    await writeAuditLog(auditSupabase, {
      requestId,
      endpoint: route,
      method: req.method,
      statusCode: response.status,
      durationMs,
      idempotencyKey: idempotencyKeyHeader,
      userAgent,
      callerIp,
      errorMessage,
    });
  }

  if (!response) {
    response = fail(
      500,
      'Unhandled sparkery-api response state',
      `${req.method} ${route}`
    );
  }
  return withResponseHeaders(response, {
    'x-request-id': requestId,
  });
});
