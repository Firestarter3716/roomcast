import { type CalendarProviderAdapter, type ConnectionTestResult, type DateRange, type ExternalEvent, throwClassifiedHttpError } from "./types";
import { logger } from "@/server/lib/logger";

interface ICSCredentials {
  feedUrl: string;
  authHeader?: string;
}

export class ICSProvider implements CalendarProviderAdapter {
  private async fetchFeed(creds: ICSCredentials): Promise<string> {
    const headers: Record<string, string> = {};
    if (creds.authHeader) {
      headers["Authorization"] = creds.authHeader;
    }

    const response = await fetch(creds.feedUrl, { headers });

    if (!response.ok) {
      throwClassifiedHttpError(response, "ICS feed");
    }

    return response.text();
  }

  async testConnection(credentials: Record<string, string>): Promise<ConnectionTestResult> {
    const creds = credentials as unknown as ICSCredentials;
    try {
      const icalText = await this.fetchFeed(creds);

      if (!icalText.includes("BEGIN:VCALENDAR")) {
        return { success: false, error: "Response is not a valid iCalendar feed", errorType: "unknown" };
      }

      const eventCount = (icalText.match(/BEGIN:VEVENT/g) || []).length;
      return { success: true, calendarCount: 1, info: `${eventCount} events found` };
    } catch (error) {
      logger.error("ICS connection test failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      if (error instanceof TypeError) {
        return { success: false, error: "Network error: Could not reach feed URL", errorType: "network" };
      }
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("401") || message.includes("403")) {
        return { success: false, error: "Authentication failed. Check auth header.", errorType: "auth" };
      }
      return { success: false, error: message, errorType: "unknown" };
    }
  }

  async fetchEvents(credentials: Record<string, string>, range: DateRange): Promise<ExternalEvent[]> {
    const creds = credentials as unknown as ICSCredentials;
    const icalText = await this.fetchFeed(creds);

    const events: ExternalEvent[] = [];
    const vevents = icalText.split("BEGIN:VEVENT");

    for (const vevent of vevents.slice(1)) {
      const eventText = vevent.split("END:VEVENT")[0];
      const parsed = this.parseVEvent(eventText);

      if (parsed && parsed.endTime >= range.start && parsed.startTime <= range.end) {
        events.push(parsed);
      }
    }

    return events;
  }

  private parseVEvent(eventText: string): ExternalEvent | null {
    try {
      const getField = (name: string): string | undefined => {
        // Handle folded lines (continuation lines start with space or tab)
        const unfolded = eventText.replace(/\r?\n[ \t]/g, "");
        const regex = new RegExp(`^${name}[^:]*:(.+)$`, "m");
        const match = regex.exec(unfolded);
        return match?.[1]?.trim();
      };

      const uid = getField("UID");
      if (!uid) return null;

      const summary = getField("SUMMARY") || "Untitled";
      const description = getField("DESCRIPTION");
      const location = getField("LOCATION");
      const organizer = getField("ORGANIZER");
      const dtstart = getField("DTSTART");
      const dtend = getField("DTEND") || getField("DURATION");

      if (!dtstart) return null;

      const isAllDay = !dtstart.includes("T");
      const startTime = this.parseDate(dtstart);
      let endTime: Date | null = null;

      if (dtend) {
        if (dtend.startsWith("P")) {
          // Duration format (e.g., PT1H, P1D)
          endTime = this.addDuration(startTime!, dtend);
        } else {
          endTime = this.parseDate(dtend);
        }
      } else {
        // Default: 1 hour duration
        endTime = startTime ? new Date(startTime.getTime() + 3600000) : null;
      }

      if (!startTime || !endTime) return null;

      return {
        externalId: uid,
        title: this.unescapeIcal(summary),
        description: description ? this.unescapeIcal(description) : undefined,
        location: location ? this.unescapeIcal(location) : undefined,
        organizer: organizer?.replace(/mailto:/i, "").replace(/^.*CN=([^;:]+).*$/, "$1") || undefined,
        startTime,
        endTime,
        isAllDay,
        isRecurring: eventText.includes("RRULE:"),
        rawData: eventText.slice(0, 500),
      };
    } catch {
      return null;
    }
  }

  private parseDate(dateStr: string): Date | null {
    try {
      if (!dateStr) return null;
      // Remove VALUE=DATE: or similar prefixes that might slip through
      const clean = dateStr.replace(/^.*:/, "").trim();

      if (clean.length === 8) {
        return new Date(`${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}T00:00:00Z`);
      }

      // YYYYMMDDTHHMMSSZ or YYYYMMDDTHHMMSS
      const year = clean.slice(0, 4);
      const month = clean.slice(4, 6);
      const day = clean.slice(6, 8);
      const hour = clean.slice(9, 11) || "00";
      const minute = clean.slice(11, 13) || "00";
      const second = clean.slice(13, 15) || "00";
      const isUTC = clean.endsWith("Z");
      return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}${isUTC ? "Z" : "Z"}`);
    } catch {
      return null;
    }
  }

  private addDuration(date: Date, duration: string): Date | null {
    try {
      const result = new Date(date);
      const daysMatch = duration.match(/(\d+)D/);
      const hoursMatch = duration.match(/(\d+)H/);
      const minutesMatch = duration.match(/(\d+)M/);

      if (daysMatch) result.setDate(result.getDate() + parseInt(daysMatch[1]));
      if (hoursMatch) result.setHours(result.getHours() + parseInt(hoursMatch[1]));
      if (minutesMatch) result.setMinutes(result.getMinutes() + parseInt(minutesMatch[1]));

      return result;
    } catch {
      return null;
    }
  }

  private unescapeIcal(text: string): string {
    return text
      .replace(/\\n/g, "\n")
      .replace(/\\,/g, ",")
      .replace(/\;/g, ";")
      .replace(/\\\\/g, "\\");
  }
}
