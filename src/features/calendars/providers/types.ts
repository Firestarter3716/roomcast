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
