import { type ThemeConfig } from "./types";

export { FONT_OPTIONS } from "@/shared/lib/fonts";

export interface ThemePalette {
  id: string;
  name: string;
  description: string;
  theme: ThemeConfig;
}

export const THEME_PALETTES: ThemePalette[] = [
  {
    id: "dark",
    name: "Dark Professional",
    description: "Dark background with crisp contrast",
    theme: {
      preset: "dark",
      background: "#0F172A",
      foreground: "#F8FAFC",
      primary: "#3B82F6",
      secondary: "#64748B",
      free: "#22C55E",
      busy: "#EF4444",
      endingSoon: "#F59E0B",
      muted: "#94A3B8",
      fontFamily: "inter",
      baseFontSize: 16,
      statusBackground: false,
    },
  },
  {
    id: "light",
    name: "Light Clean",
    description: "Bright and minimal for well-lit rooms",
    theme: {
      preset: "light",
      background: "#FFFFFF",
      foreground: "#0F172A",
      primary: "#2563EB",
      secondary: "#475569",
      free: "#16A34A",
      busy: "#DC2626",
      endingSoon: "#D97706",
      muted: "#64748B",
      fontFamily: "inter",
      baseFontSize: 16,
      statusBackground: false,
    },
  },
  {
    id: "corporate",
    name: "Corporate",
    description: "Professional blue theme",
    theme: {
      preset: "corporate",
      background: "#1E293B",
      foreground: "#E2E8F0",
      primary: "#0EA5E9",
      secondary: "#475569",
      free: "#34D399",
      busy: "#F87171",
      endingSoon: "#FBBF24",
      muted: "#94A3B8",
      fontFamily: "roboto",
      baseFontSize: 16,
      statusBackground: false,
    },
  },
  {
    id: "high-contrast",
    name: "High Contrast",
    description: "Maximum readability from distance",
    theme: {
      preset: "high-contrast",
      background: "#000000",
      foreground: "#FFFFFF",
      primary: "#FACC15",
      secondary: "#A3A3A3",
      free: "#4ADE80",
      busy: "#FF0000",
      endingSoon: "#FF8C00",
      muted: "#D4D4D4",
      fontFamily: "dm-sans",
      baseFontSize: 18,
      statusBackground: false,
    },
  },
  {
    id: "room-status",
    name: "Room Status",
    description: "Full-screen status colors like industry panels",
    theme: {
      preset: "room-status",
      background: "#1A1A2E",
      foreground: "#FFFFFF",
      primary: "#E2E8F0",
      secondary: "#CBD5E1",
      free: "#15803D",
      busy: "#B91C1C",
      endingSoon: "#B45309",
      muted: "#E2E8F0",
      fontFamily: "inter",
      baseFontSize: 18,
      statusBackground: true,
    },
  },
];
