import { type CalendarProviderAdapter, type ConnectionTestResult, type DateRange, type ExternalEvent, type ExternalCalendarInfo, throwClassifiedHttpError } from "./types";
import { logger } from "@/server/lib/logger";

interface CalDAVCredentials {
  serverUrl: string;
  username: string;
  password: string;
  calendarPath?: string;
}

export class CalDAVProvider implements CalendarProviderAdapter {
  private getAuthHeader(creds: CalDAVCredentials): string {
    return "Basic " + Buffer.from(`${creds.username}:${creds.password}`).toString("base64");
  }

  private normalizeUrl(url: string): string {
    return url.endsWith("/") ? url : url + "/";
  }

  async testConnection(credentials: Record<string, string>): Promise<ConnectionTestResult> {
    const creds = credentials as unknown as CalDAVCredentials;
    try {
      const calendars = await this.discoverCalendars(creds);
      return { success: true, calendarCount: calendars.length };
    } catch (error) {
      logger.error("CalDAV connection test failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      if (error instanceof TypeError) {
        return { success: false, error: "Network error: Could not reach CalDAV server", errorType: "network" };
      }
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("401") || message.includes("403")) {
        return { success: false, error: "Authentication failed. Check username and password.", errorType: "auth" };
      }
      return { success: false, error: message, errorType: "unknown" };
    }
  }

  private async discoverCalendars(creds: CalDAVCredentials): Promise<ExternalCalendarInfo[]> {
    const baseUrl = this.normalizeUrl(creds.serverUrl);
    const authHeader = this.getAuthHeader(creds);

    // PROPFIND to discover calendars
    const propfindBody = `<?xml version="1.0" encoding="utf-8" ?>
<D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:CS="http://calendarserver.org/ns/">
  <D:prop>
    <D:displayname />
    <D:resourcetype />
    <CS:getctag />
  </D:prop>
</D:propfind>`;

    const response = await fetch(baseUrl, {
      method: "PROPFIND",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/xml; charset=utf-8",
        Depth: "1",
      },
      body: propfindBody,
    });

    if (!response.ok && response.status !== 207) {
      throw new Error(`CalDAV PROPFIND failed (${response.status}): ${await response.text()}`);
    }

    const xml = await response.text();
    const calendars: ExternalCalendarInfo[] = [];

    // Simple XML parsing for calendar resources
    const hrefRegex = /<D:href>([^<]+)<\/D:href>/g;
    const nameRegex = /<D:displayname>([^<]*)<\/D:displayname>/g;
    const calendarRegex = /<C:calendar\s*\/>/g;

    const responses = xml.split(/<D:response>/);
    for (const resp of responses.slice(1)) {
      if (resp.includes("<C:calendar") || resp.includes("urn:ietf:params:xml:ns:caldav")) {
        const hrefMatch = /<D:href>([^<]+)<\/D:href>/.exec(resp);
        const nameMatch = /<D:displayname>([^<]*)<\/D:displayname>/.exec(resp);
        if (hrefMatch) {
          calendars.push({
            id: hrefMatch[1],
            name: nameMatch?.[1] || hrefMatch[1].split("/").filter(Boolean).pop() || "Calendar",
          });
        }
      }
    }

    return calendars;
  }

  async fetchEvents(credentials: Record<string, string>, range: DateRange): Promise<ExternalEvent[]> {
    const creds = credentials as unknown as CalDAVCredentials;
    const baseUrl = this.normalizeUrl(creds.serverUrl);
    const calendarPath = creds.calendarPath || "";
    const calendarUrl = calendarPath ? this.normalizeUrl(baseUrl + calendarPath) : baseUrl;
    const authHeader = this.getAuthHeader(creds);

    const startStr = range.start.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const endStr = range.end.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    const reportBody = `<?xml version="1.0" encoding="utf-8" ?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:getetag />
    <C:calendar-data />
  </D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        <C:time-range start="${startStr}" end="${endStr}" />
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`;

    const response = await fetch(calendarUrl, {
      method: "REPORT",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/xml; charset=utf-8",
        Depth: "1",
      },
      body: reportBody,
    });

    if (!response.ok && response.status !== 207) {
      throwClassifiedHttpError(response, "CalDAV REPORT");
    }

    const xml = await response.text();
    const events: ExternalEvent[] = [];

    // Extract VCALENDAR data from multi-status response
    const calDataRegex = /<C:calendar-data[^>]*>([\s\S]*?)<\/C:calendar-data>/g;
    let match;

    while ((match = calDataRegex.exec(xml)) !== null) {
      const icalData = match[1]
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&");

      const parsed = this.parseICalEvent(icalData);
      if (parsed) {
        events.push(parsed);
      }
    }

    return events;
  }

  private parseICalEvent(icalData: string): ExternalEvent | null {
    try {
      const getField = (name: string): string | undefined => {
        const regex = new RegExp(`${name}[^:]*:(.+)`, "m");
        const match = regex.exec(icalData);
        return match?.[1]?.trim();
      };

      const uid = getField("UID");
      if (!uid) return null;

      const summary = getField("SUMMARY") || "Untitled";
      const description = getField("DESCRIPTION");
      const location = getField("LOCATION");
      const organizer = getField("ORGANIZER");
      const dtstart = getField("DTSTART");
      const dtend = getField("DTEND");

      if (!dtstart || !dtend) return null;

      const isAllDay = dtstart.length === 8; // YYYYMMDD format
      const startTime = this.parseICalDate(dtstart);
      const endTime = this.parseICalDate(dtend);

      if (!startTime || !endTime) return null;

      return {
        externalId: uid,
        title: summary,
        description,
        location,
        organizer: organizer?.replace(/mailto:/i, ""),
        startTime,
        endTime,
        isAllDay,
        isRecurring: icalData.includes("RRULE:"),
        rawData: icalData,
      };
    } catch {
      return null;
    }
  }

  private parseICalDate(dateStr: string): Date | null {
    try {
      if (dateStr.length === 8) {
        // All-day: YYYYMMDD
        return new Date(`${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}T00:00:00Z`);
      }
      // DateTime: YYYYMMDDTHHMMSSZ or YYYYMMDDTHHMMSS
      const clean = dateStr.replace(/[^0-9TZ]/g, "");
      const year = clean.slice(0, 4);
      const month = clean.slice(4, 6);
      const day = clean.slice(6, 8);
      const hour = clean.slice(9, 11) || "00";
      const minute = clean.slice(11, 13) || "00";
      const second = clean.slice(13, 15) || "00";
      const tz = dateStr.endsWith("Z") ? "Z" : "Z"; // Default to UTC
      return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}${tz}`);
    } catch {
      return null;
    }
  }

  async listCalendars(credentials: Record<string, string>): Promise<ExternalCalendarInfo[]> {
    const creds = credentials as unknown as CalDAVCredentials;
    return this.discoverCalendars(creds);
  }
}
