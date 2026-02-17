import { type CalendarProviderAdapter, type ConnectionTestResult, type DateRange, type ExternalEvent, type ExternalCalendarInfo, throwClassifiedHttpError } from "./types";
import { logger } from "@/server/lib/logger";

interface GoogleCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  calendarId: string;
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface GoogleEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  organizer?: { displayName?: string; email?: string };
  attendees?: Array<{ displayName?: string; email?: string }>;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  recurringEventId?: string;
  status?: string;
}

export class GoogleProvider implements CalendarProviderAdapter {
  private async getAccessToken(creds: GoogleCredentials): Promise<string> {
    const body = new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: creds.refreshToken,
      grant_type: "refresh_token",
    });

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google token refresh failed (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as GoogleTokenResponse;
    return data.access_token;
  }

  async testConnection(credentials: Record<string, string>): Promise<ConnectionTestResult> {
    const creds = credentials as unknown as GoogleCredentials;
    try {
      const token = await this.getAccessToken(creds);
      const url = `https://www.googleapis.com/calendar/v3/users/me/calendarList`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return { success: false, error: "Authentication failed. Please re-authorize.", errorType: "auth" };
        }
        return { success: false, error: `Google API error (${response.status})`, errorType: "unknown" };
      }

      const data = await response.json();
      const calendars = data.items || [];
      return { success: true, calendarCount: calendars.length };
    } catch (error) {
      logger.error("Google connection test failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      if (error instanceof TypeError) {
        return { success: false, error: "Network error: Could not reach Google servers", errorType: "network" };
      }
      return { success: false, error: error instanceof Error ? error.message : String(error), errorType: "unknown" };
    }
  }

  async fetchEvents(credentials: Record<string, string>, range: DateRange): Promise<ExternalEvent[]> {
    const creds = credentials as unknown as GoogleCredentials;
    const token = await this.getAccessToken(creds);

    const events: ExternalEvent[] = [];
    let pageToken: string | null = null;

    do {
      const params = new URLSearchParams({
        timeMin: range.start.toISOString(),
        timeMax: range.end.toISOString(),
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "250",
      });
      if (pageToken) params.set("pageToken", pageToken);

      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(creds.calendarId)}/events?${params}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throwClassifiedHttpError(response, "Google Calendar API");
      }

      const data = await response.json();
      const googleEvents: GoogleEvent[] = data.items || [];

      for (const ev of googleEvents) {
        if (ev.status === "cancelled") continue;

        const isAllDay = !ev.start.dateTime;
        const startTime = isAllDay
          ? new Date(ev.start.date + "T00:00:00Z")
          : new Date(ev.start.dateTime!);
        const endTime = isAllDay
          ? new Date(ev.end.date + "T23:59:59Z")
          : new Date(ev.end.dateTime!);

        events.push({
          externalId: ev.id,
          title: ev.summary || "Untitled",
          description: ev.description || undefined,
          location: ev.location || undefined,
          organizer: ev.organizer?.displayName || ev.organizer?.email || undefined,
          attendeeCount: ev.attendees?.length,
          startTime,
          endTime,
          isAllDay,
          isRecurring: !!ev.recurringEventId,
          recurrenceId: ev.recurringEventId || undefined,
          rawData: ev,
        });
      }

      pageToken = data.nextPageToken || null;
    } while (pageToken);

    return events;
  }

  async listCalendars(credentials: Record<string, string>): Promise<ExternalCalendarInfo[]> {
    const creds = credentials as unknown as GoogleCredentials;
    const token = await this.getAccessToken(creds);
    const url = `https://www.googleapis.com/calendar/v3/users/me/calendarList`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`Google API error (${response.status}): ${await response.text()}`);
    }

    const data = await response.json();
    return (data.items || []).map((cal: { id: string; summary: string; backgroundColor?: string }) => ({
      id: cal.id,
      name: cal.summary,
      color: cal.backgroundColor || undefined,
    }));
  }
}
