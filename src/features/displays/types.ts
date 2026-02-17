export const LAYOUT_OPTIONS = [
  { value: "ROOM_BOOKING", label: "Room Booking", description: "Status display for a single room" },
  { value: "AGENDA", label: "Agenda", description: "Timeline view of events" },
  { value: "DAY_GRID", label: "Day Grid", description: "Hourly grid for a single day" },
  { value: "WEEK_GRID", label: "Week Grid", description: "Weekly overview grid" },
  { value: "INFO_DISPLAY", label: "Info Display", description: "Clock, events, and ticker" },
] as const;

export const ORIENTATION_OPTIONS = [
  { value: "LANDSCAPE", label: "Landscape" },
  { value: "PORTRAIT", label: "Portrait" },
  { value: "AUTO", label: "Auto" },
] as const;

export interface ThemeConfig {
  preset: "dark" | "light" | "corporate" | "high-contrast" | "custom";
  background: string;
  foreground: string;
  primary: string;
  secondary: string;
  free: string;
  busy: string;
  muted: string;
  fontFamily: string;
  baseFontSize: number;
}

export interface BrandingConfig {
  logoUrl: string;
  logoPosition: "top-left" | "top-center" | "top-right";
  logoSize: "small" | "medium" | "large";
  showPoweredBy: boolean;
}

export interface BackgroundConfig {
  type: "solid" | "gradient" | "image";
  color: string;
  gradientStart: string;
  gradientEnd: string;
  gradientAngle: number;
  imageUrl: string;
  imageOpacity: number;
}

export interface RoomBookingConfig {
  showOrganizer: boolean;
  showAttendeeCount: boolean;
  showProgressBar: boolean;
  futureEventCount: number;
  showFreeSlots: boolean;
  clockFormat: "12h" | "24h";
}

export interface AgendaConfig {
  timeRangeStart: number;
  timeRangeEnd: number;
  showRoomName: boolean;
  highlightCurrent: boolean;
  maxEvents: number;
  autoScroll: boolean;
  autoScrollSpeed: number;
}

export interface DayGridConfig {
  timeRangeStart: number;
  timeRangeEnd: number;
  showCurrentTimeLine: boolean;
}

export interface WeekGridConfig {
  showWeekends: boolean;
  showCurrentDayHighlight: boolean;
}

export interface InfoDisplayConfig {
  showClock: boolean;
  clockFormat: "12h" | "24h";
  showDate: boolean;
  showTodayEvents: boolean;
  upcomingDaysCount: number;
  tickerEnabled: boolean;
  tickerMessages: string[];
  tickerSpeed: number;
}

export interface DisplayConfig {
  theme: ThemeConfig;
  branding: BrandingConfig;
  background: BackgroundConfig;
  layout: RoomBookingConfig | AgendaConfig | DayGridConfig | WeekGridConfig | InfoDisplayConfig;
}

export const DEFAULT_THEME: ThemeConfig = {
  preset: "dark",
  background: "#0F172A",
  foreground: "#F8FAFC",
  primary: "#3B82F6",
  secondary: "#64748B",
  free: "#22C55E",
  busy: "#EF4444",
  muted: "#94A3B8",
  fontFamily: "Inter",
  baseFontSize: 16,
};

export const DEFAULT_BRANDING: BrandingConfig = {
  logoUrl: "",
  logoPosition: "top-left",
  logoSize: "medium",
  showPoweredBy: true,
};

export const DEFAULT_BACKGROUND: BackgroundConfig = {
  type: "solid",
  color: "#0F172A",
  gradientStart: "#0F172A",
  gradientEnd: "#1E293B",
  gradientAngle: 135,
  imageUrl: "",
  imageOpacity: 0.3,
};

export const DEFAULT_ROOM_BOOKING: RoomBookingConfig = {
  showOrganizer: true,
  showAttendeeCount: true,
  showProgressBar: true,
  futureEventCount: 3,
  showFreeSlots: true,
  clockFormat: "24h",
};

export const DEFAULT_AGENDA: AgendaConfig = {
  timeRangeStart: 7,
  timeRangeEnd: 22,
  showRoomName: true,
  highlightCurrent: true,
  maxEvents: 20,
  autoScroll: true,
  autoScrollSpeed: 1,
};

export const DEFAULT_DAY_GRID: DayGridConfig = {
  timeRangeStart: 7,
  timeRangeEnd: 22,
  showCurrentTimeLine: true,
};

export const DEFAULT_WEEK_GRID: WeekGridConfig = {
  showWeekends: false,
  showCurrentDayHighlight: true,
};

export const DEFAULT_INFO_DISPLAY: InfoDisplayConfig = {
  showClock: true,
  clockFormat: "24h",
  showDate: true,
  showTodayEvents: true,
  upcomingDaysCount: 3,
  tickerEnabled: false,
  tickerMessages: [],
  tickerSpeed: 50,
};

export function getDefaultLayoutConfig(layoutType: string) {
  switch (layoutType) {
    case "ROOM_BOOKING": return { ...DEFAULT_ROOM_BOOKING };
    case "AGENDA": return { ...DEFAULT_AGENDA };
    case "DAY_GRID": return { ...DEFAULT_DAY_GRID };
    case "WEEK_GRID": return { ...DEFAULT_WEEK_GRID };
    case "INFO_DISPLAY": return { ...DEFAULT_INFO_DISPLAY };
    default: return { ...DEFAULT_ROOM_BOOKING };
  }
}
