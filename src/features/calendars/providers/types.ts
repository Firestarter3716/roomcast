export interface DateRange {
  start: Date;
  end: Date;
}

export type ConnectionTestResult =
  | { success: true; calendarCount: number; info?: string }
  | { success: false; error: string; errorType: "auth" | "network" | "certificate" | "unknown" };

export interface ExternalCalendarInfo {
  id: string;
  name: string;
  color?: string;
}

export interface ExternalEvent {
  externalId: string;
  title: string;
  description?: string;
  location?: string;
  organizer?: string;
  attendeeCount?: number;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  isRecurring: boolean;
  recurrenceId?: string;
  rawData?: unknown;
}

export interface CalendarProviderAdapter {
  testConnection(credentials: Record<string, string>): Promise<ConnectionTestResult>;
  fetchEvents(credentials: Record<string, string>, range: DateRange): Promise<ExternalEvent[]>;
  listCalendars?(credentials: Record<string, string>): Promise<ExternalCalendarInfo[]>;
}

// Provider-specific credential shapes
export interface ExchangeCredentials {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  userEmail: string;
  resourceEmail?: string;
}

export interface GoogleCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  calendarId: string;
}

export interface CalDAVCredentials {
  serverUrl: string;
  username: string;
  password: string;
  calendarPath?: string;
}

export interface ICSCredentials {
  feedUrl: string;
  authHeader?: string;
}

export type ProviderCredentials =
  | ExchangeCredentials
  | GoogleCredentials
  | CalDAVCredentials
  | ICSCredentials;

export class SyncAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SyncAuthError";
  }
}

export class SyncRateLimitError extends Error {
  retryAfterSeconds: number;
  constructor(message: string, retryAfterSeconds: number) {
    super(message);
    this.name = "SyncRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Parse the Retry-After header value into seconds.
 * Supports both delta-seconds (e.g. "120") and HTTP-date (e.g. "Fri, 31 Dec 1999 23:59:59 GMT").
 * Returns the default value if the header is missing or unparseable.
 */
function parseRetryAfterSeconds(headerValue: string | null, defaultSeconds: number = 300): number {
  if (!headerValue) return defaultSeconds;

  // Try parsing as integer (delta-seconds)
  const asNumber = parseInt(headerValue, 10);
  if (!isNaN(asNumber) && asNumber > 0) return asNumber;

  // Try parsing as HTTP-date
  const asDate = new Date(headerValue);
  if (!isNaN(asDate.getTime())) {
    const deltaMs = asDate.getTime() - Date.now();
    return deltaMs > 0 ? Math.ceil(deltaMs / 1000) : defaultSeconds;
  }

  return defaultSeconds;
}

/**
 * Check an HTTP response for common error status codes and throw
 * the appropriate classified error. Call this in provider fetchEvents
 * methods when `response.ok` is false.
 */
export function throwClassifiedHttpError(response: Response, contextLabel: string): never {
  const status = response.status;

  if (status === 401 || status === 403) {
    throw new SyncAuthError(
      `Authentication failed - re-authentication may be required (${contextLabel} ${status})`
    );
  }

  if (status === 429) {
    const retryAfter = parseRetryAfterSeconds(response.headers.get("Retry-After"));
    throw new SyncRateLimitError(
      `Rate limited by ${contextLabel} (429). Retry after ${retryAfter}s`,
      retryAfter
    );
  }

  // For 5xx and all other errors, throw a regular Error (standard backoff applies)
  throw new Error(`${contextLabel} error (${status})`);
}
