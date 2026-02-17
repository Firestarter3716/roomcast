import { type CalendarProvider } from "@prisma/client";
import { type CalendarProviderAdapter } from "./types";
import { ExchangeProvider } from "./exchange-provider";
import { GoogleProvider } from "./google-provider";
import { CalDAVProvider } from "./caldav-provider";
import { ICSProvider } from "./ics-provider";

export function getProviderAdapter(provider: CalendarProvider): CalendarProviderAdapter {
  switch (provider) {
    case "EXCHANGE":
      return new ExchangeProvider();
    case "GOOGLE":
      return new GoogleProvider();
    case "CALDAV":
      return new CalDAVProvider();
    case "ICS":
      return new ICSProvider();
    default:
      throw new Error(`Unknown calendar provider: ${provider}`);
  }
}
