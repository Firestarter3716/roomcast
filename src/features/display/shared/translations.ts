/**
 * Lightweight display translations for client-side display views.
 *
 * Since display views are client components rendered outside of
 * NextIntlClientProvider we cannot use useTranslations(). Instead we
 * provide a simple utility that returns a typed translations object
 * based on the locale string the display receives.
 *
 * Translations are hardcoded inline to keep the client bundle small
 * (no need to ship the full JSON files).
 */

export interface DisplayTranslations {
  status: {
    free: string;
    busy: string;
    endingSoon: string;
    allDay: string;
    /** Template string with {time} placeholder, e.g. "Free from {time}" */
    freeFrom: string;
  };
  noEvents: string;
  noEventsToday: string;
  noFurtherEvents: string;
  noUpcomingEvents: string;
  lunchBreak: string;
  free: string;
  comingUp: string;
  today: string;
  upcoming: string;
  agenda: string;
  attendees: string;
}

const de: DisplayTranslations = {
  status: {
    free: "FREI",
    busy: "BELEGT",
    endingSoon: "Endet bald",
    allDay: "Gesamten Tag belegt",
    freeFrom: "Frei ab {time}",
  },
  noEvents: "Keine weiteren Termine",
  noEventsToday: "Keine Termine heute",
  noFurtherEvents: "Keine weiteren Termine heute",
  noUpcomingEvents: "Keine kommenden Termine",
  lunchBreak: "Mittagspause",
  free: "Frei",
  comingUp: "Demnächst",
  today: "Heute",
  upcoming: "Bevorstehend",
  agenda: "Agenda",
  attendees: "Teilnehmer",
};

const en: DisplayTranslations = {
  status: {
    free: "FREE",
    busy: "OCCUPIED",
    endingSoon: "Ending soon",
    allDay: "Occupied all day",
    freeFrom: "Free from {time}",
  },
  noEvents: "No more events",
  noEventsToday: "No events today",
  noFurtherEvents: "No further events today",
  noUpcomingEvents: "No upcoming events",
  lunchBreak: "Lunch break",
  free: "Free",
  comingUp: "Coming up",
  today: "Today",
  upcoming: "Upcoming",
  agenda: "Agenda",
  attendees: "attendees",
};

const fr: DisplayTranslations = {
  status: {
    free: "LIBRE",
    busy: "OCCUP\u00c9",
    endingSoon: "Se termine bient\u00f4t",
    allDay: "Occup\u00e9 toute la journ\u00e9e",
    freeFrom: "Libre \u00e0 partir de {time}",
  },
  noEvents: "Plus d'\u00e9v\u00e9nements",
  noEventsToday: "Aucun \u00e9v\u00e9nement aujourd'hui",
  noFurtherEvents: "Plus d'\u00e9v\u00e9nements aujourd'hui",
  noUpcomingEvents: "Aucun \u00e9v\u00e9nement \u00e0 venir",
  lunchBreak: "Pause d\u00e9jeuner",
  free: "Libre",
  comingUp: "Prochainement",
  today: "Aujourd'hui",
  upcoming: "\u00c0 venir",
  agenda: "Agenda",
  attendees: "participants",
};

const translations: Record<string, DisplayTranslations> = { de, en, fr };

/**
 * Extract the base language code from a locale string.
 * e.g. "de-DE" -> "de", "en-US" -> "en", "fr-FR" -> "fr"
 */
function getLanguageCode(locale: string): string {
  return locale.split("-")[0].toLowerCase();
}

/**
 * Returns display-relevant translations for the given locale.
 * Falls back to German (de) if the locale is not supported.
 */
export function getDisplayTranslations(locale: string): DisplayTranslations {
  const lang = getLanguageCode(locale);
  return translations[lang] ?? de;
}
