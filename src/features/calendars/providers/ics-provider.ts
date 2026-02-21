import { type CalendarProviderAdapter, type ConnectionTestResult, type DateRange, type ExternalEvent, throwClassifiedHttpError } from "./types";
import { logger } from "@/server/lib/logger";
import { RRule } from "rrule";

interface ICSCredentials {
  feedUrl: string;
  authHeader?: string;
}

/** Map common Windows timezone IDs to IANA timezone names. */
const WINDOWS_TZ_MAP: Record<string, string> = {
  "W. Europe Standard Time": "Europe/Berlin",
  "Central European Standard Time": "Europe/Budapest",
  "Romance Standard Time": "Europe/Paris",
  "Central Europe Standard Time": "Europe/Prague",
  "GMT Standard Time": "Europe/London",
  "Greenwich Standard Time": "Atlantic/Reykjavik",
  "E. Europe Standard Time": "Europe/Chisinau",
  "FLE Standard Time": "Europe/Helsinki",
  "GTB Standard Time": "Europe/Bucharest",
  "Russian Standard Time": "Europe/Moscow",
  "Eastern Standard Time": "America/New_York",
  "Central Standard Time": "America/Chicago",
  "Mountain Standard Time": "America/Denver",
  "Pacific Standard Time": "America/Los_Angeles",
  "US Mountain Standard Time": "America/Phoenix",
  "Atlantic Standard Time": "America/Halifax",
  "Alaskan Standard Time": "America/Anchorage",
  "Hawaiian Standard Time": "Pacific/Honolulu",
  "China Standard Time": "Asia/Shanghai",
  "Tokyo Standard Time": "Asia/Tokyo",
  "Korea Standard Time": "Asia/Seoul",
  "India Standard Time": "Asia/Kolkata",
  "AUS Eastern Standard Time": "Australia/Sydney",
  "New Zealand Standard Time": "Pacific/Auckland",
  "UTC": "UTC",
};

/** Resolve a TZID (Windows or IANA) to an IANA timezone name. */
function resolveTimezone(tzid: string): string | undefined {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tzid });
    return tzid;
  } catch {
    // Not a valid IANA timezone, try Windows mapping
  }
  return WINDOWS_TZ_MAP[tzid];
}

/**
 * Convert a local date/time in a given IANA timezone to a UTC Date.
 * Uses Intl.DateTimeFormat to compute the UTC offset.
 */
function localToUTC(
  year: number, month: number, day: number,
  hour: number, minute: number, second: number,
  timezone: string,
): Date {
  const asUTC = Date.UTC(year, month - 1, day, hour, minute, second);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", second: "numeric",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(new Date(asUTC));
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || "0");

  const tzMs = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  const offsetMs = tzMs - asUTC;

  return new Date(asUTC - offsetMs);
}

interface DateField {
  value: string;
  tzid?: string;
}

/** Parsed VEVENT data before recurrence expansion. */
interface ParsedVEvent {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  organizer?: string;
  attendeeCount?: number;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  rruleString?: string;
  status?: string;
  exdates: Date[];
  rawData: string;
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
      if (!parsed) continue;

      // Skip cancelled events
      if (parsed.status === "CANCELLED") continue;

      const durationMs = parsed.endTime.getTime() - parsed.startTime.getTime();

      if (parsed.rruleString) {
        // Expand recurring event into occurrences within range
        try {
          const rule = RRule.fromString(`DTSTART:${this.toRRuleDateStr(parsed.startTime)}\nRRULE:${parsed.rruleString}`);
          const occurrences = rule.between(range.start, range.end, true);

          for (const occStart of occurrences) {
            // Skip occurrences that fall on an EXDATE (cancelled instance)
            if (parsed.exdates.some((exd) => Math.abs(exd.getTime() - occStart.getTime()) < 86_400_000)) continue;

            const occEnd = new Date(occStart.getTime() + durationMs);
            events.push({
              externalId: `${parsed.uid}_${occStart.toISOString()}`,
              title: parsed.title,
              description: parsed.description,
              location: parsed.location,
              organizer: parsed.organizer,
              attendeeCount: parsed.attendeeCount,
              startTime: occStart,
              endTime: occEnd,
              isAllDay: parsed.isAllDay,
              isRecurring: true,
              recurrenceId: parsed.uid,
              rawData: parsed.rawData,
            });
          }
        } catch (e) {
          logger.warn("Failed to expand RRULE, using single occurrence", {
            uid: parsed.uid,
            error: e instanceof Error ? e.message : String(e),
          });
          // Fallback: use single occurrence
          if (parsed.endTime >= range.start && parsed.startTime <= range.end) {
            events.push(this.toExternalEvent(parsed));
          }
        }
      } else {
        // Non-recurring event: simple range check
        if (parsed.endTime >= range.start && parsed.startTime <= range.end) {
          events.push(this.toExternalEvent(parsed));
        }
      }
    }

    return events;
  }

  private toExternalEvent(parsed: ParsedVEvent): ExternalEvent {
    return {
      externalId: parsed.uid,
      title: parsed.title,
      description: parsed.description,
      location: parsed.location,
      organizer: parsed.organizer,
      attendeeCount: parsed.attendeeCount,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      isAllDay: parsed.isAllDay,
      isRecurring: false,
      rawData: parsed.rawData,
    };
  }

  /** Convert a UTC Date to RRULE-compatible YYYYMMDDTHHMMSSZ string. */
  private toRRuleDateStr(date: Date): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    const h = String(date.getUTCHours()).padStart(2, "0");
    const min = String(date.getUTCMinutes()).padStart(2, "0");
    const s = String(date.getUTCSeconds()).padStart(2, "0");
    return `${y}${m}${d}T${h}${min}${s}Z`;
  }

  private parseVEvent(eventText: string): ParsedVEvent | null {
    try {
      const unfolded = eventText.replace(/\r?\n[ \t]/g, "");

      const getField = (name: string): string | undefined => {
        const regex = new RegExp(`^${name}[^:]*:(.+)$`, "m");
        const match = regex.exec(unfolded);
        return match?.[1]?.trim();
      };

      const getDateField = (name: string): DateField | undefined => {
        const regex = new RegExp(`^${name}([^:]*):(.+)$`, "m");
        const match = regex.exec(unfolded);
        if (!match) return undefined;
        const params = match[1];
        const value = match[2].trim();
        const tzidMatch = /TZID=([^;:]+)/.exec(params);
        return { value, tzid: tzidMatch?.[1] };
      };

      const uid = getField("UID");
      if (!uid) return null;

      const summary = getField("SUMMARY") || "Untitled";
      const description = getField("DESCRIPTION");
      const location = getField("LOCATION");
      const organizer = getField("ORGANIZER");
      const attendeeCount = (unfolded.match(/^ATTENDEE[;:]/gm) || []).length || undefined;
      const dtstartField = getDateField("DTSTART");
      const dtendField = getDateField("DTEND");
      const durationStr = getField("DURATION");
      const rruleString = getField("RRULE");
      const status = getField("STATUS")?.toUpperCase();

      // Parse EXDATE lines (cancelled recurring instances)
      const exdates: Date[] = [];
      const exdateRegex = /^EXDATE([^:]*):(.+)$/gm;
      let exdateMatch;
      while ((exdateMatch = exdateRegex.exec(unfolded)) !== null) {
        const params = exdateMatch[1];
        const tzidMatch = /TZID=([^;:]+)/.exec(params);
        const tzid = tzidMatch?.[1];
        const values = exdateMatch[2].split(",");
        for (const val of values) {
          const d = this.parseDate(val.trim(), tzid);
          if (d) exdates.push(d);
        }
      }

      if (!dtstartField) return null;

      const isAllDay = !dtstartField.value.includes("T");
      const startTime = this.parseDate(dtstartField.value, dtstartField.tzid);
      let endTime: Date | null = null;

      if (dtendField) {
        endTime = this.parseDate(dtendField.value, dtendField.tzid);
      } else if (durationStr?.startsWith("P")) {
        endTime = this.addDuration(startTime!, durationStr);
      } else {
        endTime = startTime ? new Date(startTime.getTime() + 3600000) : null;
      }

      if (!startTime || !endTime) return null;

      return {
        uid,
        title: this.unescapeIcal(summary),
        description: description ? this.unescapeIcal(description) : undefined,
        location: location ? this.unescapeIcal(location) : undefined,
        organizer: organizer?.replace(/mailto:/i, "").replace(/^.*CN=([^;:]+).*$/, "$1") || undefined,
        attendeeCount,
        startTime,
        endTime,
        isAllDay,
        rruleString: rruleString || undefined,
        status,
        exdates,
        rawData: eventText.slice(0, 500),
      };
    } catch {
      return null;
    }
  }

  private parseDate(dateStr: string, tzid?: string): Date | null {
    try {
      if (!dateStr) return null;
      const clean = dateStr.replace(/^.*:/, "").trim();

      if (clean.length === 8) {
        return new Date(`${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}T00:00:00Z`);
      }

      const year = parseInt(clean.slice(0, 4));
      const month = parseInt(clean.slice(4, 6));
      const day = parseInt(clean.slice(6, 8));
      const hour = parseInt(clean.slice(9, 11) || "0");
      const minute = parseInt(clean.slice(11, 13) || "0");
      const second = parseInt(clean.slice(13, 15) || "0");
      const isUTC = clean.endsWith("Z");

      if (isUTC) {
        return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
      }

      if (tzid) {
        const ianaZone = resolveTimezone(tzid);
        if (ianaZone) {
          return localToUTC(year, month, day, hour, minute, second, ianaZone);
        }
        logger.warn("Unknown TZID, treating as UTC", { tzid });
      }

      return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
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
