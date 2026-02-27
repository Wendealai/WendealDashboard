const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object';

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value === 'undefined') {
    return 'null';
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(item => stableStringify(item)).join(',')}]`;
  }

  if (isRecord(value)) {
    const keys = Object.keys(value).sort((a, b) => a.localeCompare(b));
    const pairs = keys.map(
      key => `${JSON.stringify(key)}:${stableStringify(value[key])}`
    );
    return `{${pairs.join(',')}}`;
  }

  return JSON.stringify(String(value));
};

const hashFNV1a = (input: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
};

export const createSparkeryIdempotencyKey = (
  scope: string,
  payload: unknown
): string => {
  const normalizedScope =
    typeof scope === 'string' && scope.trim().length > 0
      ? scope.trim()
      : 'sparkery';
  const normalizedPayload = stableStringify(payload);
  const hash = hashFNV1a(`${normalizedScope}:${normalizedPayload}`);
  return `${normalizedScope}:${hash}`;
};
