import { type CalendarProviderAdapter, type ConnectionTestResult, type DateRange, type ExternalEvent, type ExternalCalendarInfo, throwClassifiedHttpError } from "./types";
import { logger } from "@/server/lib/logger";

interface ExchangeCredentials {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  userEmail: string;
  resourceEmail?: string;
}

interface GraphTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface GraphEvent {
  id: string;
  subject: string;
  bodyPreview?: string;
  location?: { displayName?: string };
  organizer?: { emailAddress?: { name?: string; address?: string } };
  attendees?: Array<{ emailAddress?: { name?: string } }>;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  isAllDay?: boolean;
  type?: string;
  seriesMasterId?: string;
}

export class ExchangeProvider implements CalendarProviderAdapter {
  private async getAccessToken(creds: ExchangeCredentials): Promise<string> {
    const tokenUrl = `https://login.microsoftonline.com/${creds.tenantId}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    });

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token request failed (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as GraphTokenResponse;
    return data.access_token;
  }

  private getCalendarUser(creds: ExchangeCredentials): string {
    return creds.resourceEmail || creds.userEmail;
  }

  async testConnection(credentials: Record<string, string>): Promise<ConnectionTestResult> {
    const creds = credentials as unknown as ExchangeCredentials;
    try {
      const token = await this.getAccessToken(creds);
      const userPrincipal = this.getCalendarUser(creds);
      const url = `https://graph.microsoft.com/v1.0/users/${userPrincipal}/calendars`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 401 || response.status === 403) {
          return { success: false, error: `Authentication failed: ${errorText}`, errorType: "auth" };
        }
        return { success: false, error: `Graph API error (${response.status}): ${errorText}`, errorType: "unknown" };
      }

      const data = await response.json();
      const calendars = data.value || [];
      return { success: true, calendarCount: calendars.length };
    } catch (error) {
      logger.error("Exchange connection test failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      if (error instanceof TypeError) {
        return { success: false, error: "Network error: Could not reach Microsoft servers", errorType: "network" };
      }
      return { success: false, error: error instanceof Error ? error.message : String(error), errorType: "unknown" };
    }
  }

  async fetchEvents(credentials: Record<string, string>, range: DateRange): Promise<ExternalEvent[]> {
    const creds = credentials as unknown as ExchangeCredentials;
    const token = await this.getAccessToken(creds);
    const userPrincipal = this.getCalendarUser(creds);

    const startISO = range.start.toISOString();
    const endISO = range.end.toISOString();
    const url = `https://graph.microsoft.com/v1.0/users/${userPrincipal}/calendarView?startDateTime=${startISO}&endDateTime=${endISO}&$top=500&$select=id,subject,bodyPreview,location,organizer,attendees,start,end,isAllDay,type,seriesMasterId`;

    const events: ExternalEvent[] = [];
    let nextLink: string | null = url;

    while (nextLink) {
      const currentUrl: string = nextLink;
      const response: Response = await fetch(currentUrl, {
        headers: { Authorization: `Bearer ${token}`, Prefer: 'outlook.timezone="UTC"' },
      });

      if (!response.ok) {
        throwClassifiedHttpError(response, "Graph API");
      }

      const data: { value?: GraphEvent[]; "@odata.nextLink"?: string } = await response.json();
      const graphEvents: GraphEvent[] = data.value || [];

      for (const ev of graphEvents) {
        events.push({
          externalId: ev.id,
          title: ev.subject || "Untitled",
          description: ev.bodyPreview || undefined,
          location: ev.location?.displayName || undefined,
          organizer: ev.organizer?.emailAddress?.name || ev.organizer?.emailAddress?.address || undefined,
          attendeeCount: ev.attendees?.length,
          startTime: new Date(ev.start.dateTime + "Z"),
          endTime: new Date(ev.end.dateTime + "Z"),
          isAllDay: ev.isAllDay || false,
          isRecurring: ev.type === "occurrence" || ev.type === "exception",
          recurrenceId: ev.seriesMasterId || undefined,
          rawData: ev,
        });
      }

      nextLink = data["@odata.nextLink"] || null;
    }

    return events;
  }

  async listCalendars(credentials: Record<string, string>): Promise<ExternalCalendarInfo[]> {
    const creds = credentials as unknown as ExchangeCredentials;
    const token = await this.getAccessToken(creds);
    const userPrincipal = this.getCalendarUser(creds);
    const url = `https://graph.microsoft.com/v1.0/users/${userPrincipal}/calendars`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`Graph API error (${response.status}): ${await response.text()}`);
    }

    const data = await response.json();
    return (data.value || []).map((cal: { id: string; name: string; hexColor?: string }) => ({
      id: cal.id,
      name: cal.name,
      color: cal.hexColor || undefined,
    }));
  }
}
