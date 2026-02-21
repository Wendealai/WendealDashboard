import type { DispatchJob } from '@/pages/Sparkery/dispatch/types';

type GoogleCalendarRuntimeConfig = {
  clientId?: string;
  calendarId?: string;
};

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

interface GoogleCalendarEvent {
  id: string;
  status?: string;
  summary?: string;
  extendedProperties?: {
    private?: Record<string, string>;
  };
}

interface GoogleCalendarEventsListResponse {
  items?: GoogleCalendarEvent[];
  nextPageToken?: string;
}

interface GoogleCalendarSyncInput {
  jobs: DispatchJob[];
  weekStart: string;
  weekEnd: string;
}

export interface GoogleCalendarSyncResult {
  created: number;
  updated: number;
  deleted: number;
  syncedJobs: number;
  calendarId: string;
}

type GoogleIdentityRuntime = typeof globalThis & {
  __WENDEAL_GOOGLE_CALENDAR_CONFIG__?: GoogleCalendarRuntimeConfig;
  google?: {
    accounts?: {
      oauth2?: {
        initTokenClient: (options: {
          client_id: string;
          scope: string;
          callback: (response: GoogleTokenResponse) => void;
        }) => {
          requestAccessToken: (options?: { prompt?: string }) => void;
        };
      };
    };
  };
};

const GOOGLE_GIS_SCRIPT_ID = 'wendeal-google-gis-sdk';
const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const DISPATCH_SOURCE_TAG = 'sparkeryDispatch';
let gisLoadPromise: Promise<void> | null = null;
let accessToken: string | null = null;
let accessTokenExpiresAt = 0;

const getGoogleCalendarConfig =
  (): Required<GoogleCalendarRuntimeConfig> | null => {
    const runtime = globalThis as GoogleIdentityRuntime;
    const clientId =
      runtime.__WENDEAL_GOOGLE_CALENDAR_CONFIG__?.clientId?.trim();
    if (!clientId) {
      return null;
    }
    const calendarId =
      runtime.__WENDEAL_GOOGLE_CALENDAR_CONFIG__?.calendarId?.trim() ||
      'primary';
    return {
      clientId,
      calendarId,
    };
  };

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateKey = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year || 1970, (month || 1) - 1, day || 1);
};

const addDays = (dateKey: string, days: number): string => {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return formatDateKey(date);
};

const toRfc3339Local = (dateKey: string, timeText: string): string => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const [hour, minute] = timeText.split(':').map(Number);
  const local = new Date(
    year || 1970,
    (month || 1) - 1,
    day || 1,
    hour || 0,
    minute || 0,
    0
  );
  const offsetMinutes = -local.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absolute = Math.abs(offsetMinutes);
  const offsetHours = String(Math.floor(absolute / 60)).padStart(2, '0');
  const offsetMins = String(absolute % 60).padStart(2, '0');
  const datePart = formatDateKey(local);
  const timePart = `${String(local.getHours()).padStart(2, '0')}:${String(
    local.getMinutes()
  ).padStart(2, '0')}:00`;
  return `${datePart}T${timePart}${sign}${offsetHours}:${offsetMins}`;
};

const getBrowserTimeZone = (): string => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone) {
      return timezone;
    }
  } catch {
    // fallback below
  }
  return 'UTC';
};

const ensureGisLoaded = async (): Promise<void> => {
  const runtime = globalThis as GoogleIdentityRuntime;
  if (runtime.google?.accounts?.oauth2?.initTokenClient) {
    return;
  }
  if (gisLoadPromise) {
    return gisLoadPromise;
  }

  gisLoadPromise = new Promise<void>((resolve, reject) => {
    const resolveWhenReady = () => {
      const checker = () => {
        const client = runtime.google?.accounts?.oauth2?.initTokenClient;
        if (client) {
          resolve();
          return true;
        }
        return false;
      };

      if (checker()) {
        return;
      }

      // GIS can attach to window slightly after script load in slower environments.
      const pollLimit = 20;
      let pollCount = 0;
      const timer = window.setInterval(() => {
        pollCount += 1;
        if (checker() || pollCount >= pollLimit) {
          window.clearInterval(timer);
          if (!runtime.google?.accounts?.oauth2?.initTokenClient) {
            reject(
              new Error('Google OAuth client is unavailable after script load')
            );
          }
        }
      }, 50);
    };

    const existingScript = document.getElementById(
      GOOGLE_GIS_SCRIPT_ID
    ) as HTMLScriptElement | null;
    if (existingScript) {
      if (existingScript.getAttribute('data-loaded') === 'true') {
        resolveWhenReady();
        return;
      }
      existingScript.addEventListener('load', resolveWhenReady, { once: true });
      existingScript.addEventListener(
        'error',
        () => reject(new Error('Failed to load Google Identity script')),
        { once: true }
      );
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_GIS_SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.setAttribute('data-loaded', 'true');
      resolveWhenReady();
    };
    script.onerror = () =>
      reject(new Error('Failed to load Google Identity script'));
    document.head.appendChild(script);
  }).catch(error => {
    gisLoadPromise = null;
    throw error;
  });

  return gisLoadPromise;
};

const requestGoogleAccessToken = async (clientId: string): Promise<string> => {
  await ensureGisLoaded();
  const runtime = globalThis as GoogleIdentityRuntime;
  const initTokenClient = runtime.google?.accounts?.oauth2?.initTokenClient;
  if (!initTokenClient) {
    throw new Error('Google OAuth client is unavailable');
  }

  if (accessToken && Date.now() < accessTokenExpiresAt - 60_000) {
    return accessToken;
  }

  return new Promise<string>((resolve, reject) => {
    const tokenClient = initTokenClient({
      client_id: clientId,
      scope: GOOGLE_CALENDAR_SCOPE,
      callback: response => {
        if (response.error || !response.access_token) {
          reject(
            new Error(
              response.error_description ||
                response.error ||
                'Google authorization failed'
            )
          );
          return;
        }
        accessToken = response.access_token;
        const expiresIn = response.expires_in || 3600;
        accessTokenExpiresAt = Date.now() + expiresIn * 1000;
        resolve(response.access_token);
      },
    });

    tokenClient.requestAccessToken({
      prompt: accessToken ? '' : 'consent',
    });
  });
};

const googleCalendarFetch = async <T>(
  accessTokenValue: string,
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  body?: unknown
): Promise<T> => {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${accessTokenValue}`,
        ...(method === 'POST' || method === 'PATCH'
          ? { 'Content-Type': 'application/json' }
          : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Google Calendar request failed (${response.status}): ${details || 'No details'}`
    );
  }

  if (method === 'DELETE') {
    return {} as T;
  }
  return (await response.json()) as T;
};

const listDispatchManagedEvents = async (
  accessTokenValue: string,
  calendarId: string,
  weekStart: string,
  weekEnd: string
): Promise<GoogleCalendarEvent[]> => {
  const timeMin = toRfc3339Local(weekStart, '00:00');
  const timeMax = toRfc3339Local(addDays(weekEnd, 1), '00:00');
  const events: GoogleCalendarEvent[] = [];
  let pageToken: string | undefined;

  do {
    const query = new URLSearchParams();
    query.set('timeMin', timeMin);
    query.set('timeMax', timeMax);
    query.set('singleEvents', 'true');
    query.set('showDeleted', 'false');
    query.set('maxResults', '2500');
    query.append(
      'privateExtendedProperty',
      `dispatchSource=${DISPATCH_SOURCE_TAG}`
    );
    if (pageToken) {
      query.set('pageToken', pageToken);
    }

    const response =
      await googleCalendarFetch<GoogleCalendarEventsListResponse>(
        accessTokenValue,
        `/calendars/${encodeURIComponent(calendarId)}/events?${query.toString()}`
      );

    events.push(...(response.items || []));
    pageToken = response.nextPageToken;
  } while (pageToken);

  return events;
};

const buildEventPayload = (job: DispatchJob): Record<string, unknown> => {
  const timezone = getBrowserTimeZone();
  const descriptionLines: string[] = [
    `Dispatch Job ID: ${job.id}`,
    `Status: ${job.status}`,
    `Service Type: ${job.serviceType}`,
  ];
  if (job.customerName) descriptionLines.push(`Customer: ${job.customerName}`);
  if (job.customerPhone) descriptionLines.push(`Phone: ${job.customerPhone}`);
  if (job.customerAddress)
    descriptionLines.push(`Address: ${job.customerAddress}`);
  if (job.notes) descriptionLines.push(`Notes: ${job.notes}`);
  if (job.description) descriptionLines.push(`Description: ${job.description}`);

  const summarySegments = [job.title];
  if (job.customerName) {
    summarySegments.push(`- ${job.customerName}`);
  }

  const payload: Record<string, unknown> = {
    summary: summarySegments.join(' '),
    description: descriptionLines.join('\n'),
    start: {
      dateTime: toRfc3339Local(job.scheduledDate, job.scheduledStartTime),
      timeZone: timezone,
    },
    end: {
      dateTime: toRfc3339Local(job.scheduledDate, job.scheduledEndTime),
      timeZone: timezone,
    },
    extendedProperties: {
      private: {
        dispatchSource: DISPATCH_SOURCE_TAG,
        dispatchJobId: job.id,
      },
    },
  };

  if (job.customerAddress) {
    payload.location = job.customerAddress;
  }

  return payload;
};

export const isGoogleCalendarConfigured = (): boolean =>
  Boolean(getGoogleCalendarConfig());

export const syncDispatchWeekToGoogleCalendar = async (
  input: GoogleCalendarSyncInput
): Promise<GoogleCalendarSyncResult> => {
  const config = getGoogleCalendarConfig();
  if (!config) {
    throw new Error(
      'Google Calendar is not configured. Set VITE_GOOGLE_CALENDAR_CLIENT_ID first.'
    );
  }

  const token = await requestGoogleAccessToken(config.clientId);
  const existingEvents = await listDispatchManagedEvents(
    token,
    config.calendarId,
    input.weekStart,
    input.weekEnd
  );

  const existingByJobId = new Map<
    string,
    {
      eventId: string;
    }
  >();

  existingEvents.forEach(event => {
    const dispatchJobId = event.extendedProperties?.private?.dispatchJobId;
    if (!dispatchJobId || !event.id) {
      return;
    }
    existingByJobId.set(dispatchJobId, { eventId: event.id });
  });

  const syncJobs = input.jobs.filter(job => job.status !== 'cancelled');
  const syncJobIds = new Set(syncJobs.map(job => job.id));

  let created = 0;
  let updated = 0;
  let deleted = 0;

  for (const job of syncJobs) {
    const existing = existingByJobId.get(job.id);
    const payload = buildEventPayload(job);

    if (existing?.eventId) {
      await googleCalendarFetch(
        token,
        `/calendars/${encodeURIComponent(config.calendarId)}/events/${encodeURIComponent(existing.eventId)}`,
        'PATCH',
        payload
      );
      updated += 1;
      continue;
    }

    await googleCalendarFetch(
      token,
      `/calendars/${encodeURIComponent(config.calendarId)}/events`,
      'POST',
      payload
    );
    created += 1;
  }

  for (const [dispatchJobId, existing] of existingByJobId.entries()) {
    if (syncJobIds.has(dispatchJobId)) {
      continue;
    }
    await googleCalendarFetch(
      token,
      `/calendars/${encodeURIComponent(config.calendarId)}/events/${encodeURIComponent(existing.eventId)}`,
      'DELETE'
    );
    deleted += 1;
  }

  return {
    created,
    updated,
    deleted,
    syncedJobs: syncJobs.length,
    calendarId: config.calendarId,
  };
};
