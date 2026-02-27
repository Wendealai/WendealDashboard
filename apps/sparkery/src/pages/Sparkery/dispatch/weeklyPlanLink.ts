export const WEEKLY_PLAN_LINK_VERSION = '2';
export const WEEKLY_PLAN_LINK_DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const SIGNATURE_NAMESPACE = 'wendeal.dispatch.weekly-plan.v2';

export type DispatchJobIdsSource = 'compact' | 'legacy' | 'none';

export interface DispatchJobLinkContext {
  employeeId: string;
  weekStart: string;
  weekEnd: string;
}

export interface ParsedDispatchJobIds {
  jobIds: string[];
  source: DispatchJobIdsSource;
  compact: {
    present: boolean;
    version: string;
    versionValid: boolean;
    expiresAtMs: number | null;
    expired: boolean;
    signatureValid: boolean;
    payloadValid: boolean;
  };
}

interface BuildDispatchJobLinkUrlArgs extends DispatchJobLinkContext {
  origin: string;
  path: string;
  jobIds: string[];
  nowMs?: number;
  ttlMs?: number;
  includeLegacyJobIds?: boolean;
}

const normalizeBase64 = (value: string): string => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const paddingLength = (4 - (base64.length % 4)) % 4;
  return `${base64}${'='.repeat(paddingLength)}`;
};

const toBase64Url = (value: string): string => {
  const bytes = new TextEncoder().encode(value);
  let base64 = '';

  if (typeof Buffer !== 'undefined') {
    base64 = Buffer.from(bytes).toString('base64');
  } else if (typeof btoa === 'function') {
    let binary = '';
    bytes.forEach(byte => {
      binary += String.fromCharCode(byte);
    });
    base64 = btoa(binary);
  } else {
    return '';
  }

  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const fromBase64Url = (value: string): string | null => {
  if (!value) {
    return null;
  }

  const normalized = normalizeBase64(value);
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(normalized, 'base64').toString('utf-8');
    }
    if (typeof atob !== 'function') {
      return null;
    }
    const binary = atob(normalized);
    const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
};

const normalizeJobIds = (jobIds: string[]): string[] => {
  const seen = new Set<string>();
  const ordered: string[] = [];
  jobIds.forEach(rawId => {
    const id = rawId.trim();
    if (!id || seen.has(id)) {
      return;
    }
    seen.add(id);
    ordered.push(id);
  });
  return ordered;
};

const decodeLegacyJobIds = (value: string | null): string[] =>
  normalizeJobIds(
    (value || '')
      .split(',')
      .map(id => id.trim())
      .filter(Boolean)
  );

const encodeCompactJobIds = (jobIds: string[]): string =>
  toBase64Url(JSON.stringify(normalizeJobIds(jobIds)));

const decodeCompactJobIds = (encoded: string): string[] | null => {
  const decoded = fromBase64Url(encoded);
  if (!decoded) {
    return null;
  }

  try {
    const parsed = JSON.parse(decoded);
    if (!Array.isArray(parsed)) {
      return null;
    }
    return normalizeJobIds(parsed.map(value => String(value)));
  } catch {
    return null;
  }
};

const computeChecksum = (value: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

const buildSignatureInput = (
  context: DispatchJobLinkContext,
  version: string,
  exp: string,
  encodedJobIds: string
): string =>
  [
    SIGNATURE_NAMESPACE,
    version,
    context.employeeId.trim(),
    context.weekStart.trim(),
    context.weekEnd.trim(),
    exp.trim(),
    encodedJobIds.trim(),
  ].join('|');

const buildSignature = (
  context: DispatchJobLinkContext,
  version: string,
  exp: string,
  encodedJobIds: string
): string =>
  computeChecksum(buildSignatureInput(context, version, exp, encodedJobIds));

export const parseDispatchJobIdsFromParams = (
  params: URLSearchParams,
  context: DispatchJobLinkContext,
  nowMs = Date.now()
): ParsedDispatchJobIds => {
  const compactEncoded = (params.get('j') || '').trim();
  const compactVersion = (params.get('v') || '').trim();
  const compactExpRaw = (params.get('exp') || '').trim();
  const compactSig = (params.get('sig') || '').trim();
  const legacyJobIds = decodeLegacyJobIds(params.get('jobIds'));

  if (!compactEncoded) {
    return {
      jobIds: legacyJobIds,
      source: legacyJobIds.length > 0 ? 'legacy' : 'none',
      compact: {
        present: false,
        version: '',
        versionValid: true,
        expiresAtMs: null,
        expired: false,
        signatureValid: true,
        payloadValid: true,
      },
    };
  }

  const decodedCompactJobIds = decodeCompactJobIds(compactEncoded);
  const expiresAtMs = Number.parseInt(compactExpRaw, 10);
  const hasExpires = Number.isFinite(expiresAtMs) && expiresAtMs > 0;
  const versionValid = compactVersion === WEEKLY_PLAN_LINK_VERSION;
  const signatureValid =
    Boolean(compactSig) &&
    compactSig ===
      buildSignature(context, compactVersion, compactExpRaw, compactEncoded);
  const payloadValid = Array.isArray(decodedCompactJobIds);
  const expired = hasExpires ? nowMs > expiresAtMs : true;
  const compactUsable =
    payloadValid && versionValid && signatureValid && hasExpires && !expired;

  if (compactUsable) {
    return {
      jobIds: decodedCompactJobIds!,
      source: 'compact',
      compact: {
        present: true,
        version: compactVersion,
        versionValid,
        expiresAtMs,
        expired,
        signatureValid,
        payloadValid,
      },
    };
  }

  const fallbackJobIds = legacyJobIds;
  return {
    jobIds: fallbackJobIds,
    source: fallbackJobIds.length > 0 ? 'legacy' : 'none',
    compact: {
      present: true,
      version: compactVersion,
      versionValid,
      expiresAtMs: hasExpires ? expiresAtMs : null,
      expired,
      signatureValid,
      payloadValid,
    },
  };
};

export const buildDispatchJobLinkUrl = (
  args: BuildDispatchJobLinkUrlArgs
): string => {
  const {
    origin,
    path,
    employeeId,
    weekStart,
    weekEnd,
    jobIds,
    nowMs = Date.now(),
    ttlMs = WEEKLY_PLAN_LINK_DEFAULT_TTL_MS,
    includeLegacyJobIds = false,
  } = args;

  const normalizedContext: DispatchJobLinkContext = {
    employeeId: employeeId.trim(),
    weekStart: weekStart.trim(),
    weekEnd: weekEnd.trim(),
  };
  const normalizedJobIds = normalizeJobIds(jobIds);
  const params = new URLSearchParams();

  if (normalizedContext.employeeId) {
    params.set('employeeId', normalizedContext.employeeId);
  }
  if (normalizedContext.weekStart) {
    params.set('weekStart', normalizedContext.weekStart);
  }
  if (normalizedContext.weekEnd) {
    params.set('weekEnd', normalizedContext.weekEnd);
  }

  if (normalizedJobIds.length > 0) {
    const compactValue = encodeCompactJobIds(normalizedJobIds);
    const exp = String(Math.max(0, Math.trunc(nowMs + Math.max(0, ttlMs))));
    const version = WEEKLY_PLAN_LINK_VERSION;
    const signature = buildSignature(
      normalizedContext,
      version,
      exp,
      compactValue
    );

    params.set('v', version);
    params.set('exp', exp);
    params.set('j', compactValue);
    params.set('sig', signature);

    if (includeLegacyJobIds) {
      params.set('jobIds', normalizedJobIds.join(','));
    }
  }

  const query = params.toString();
  const normalizedOrigin = origin.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return query
    ? `${normalizedOrigin}${normalizedPath}?${query}`
    : `${normalizedOrigin}${normalizedPath}`;
};
