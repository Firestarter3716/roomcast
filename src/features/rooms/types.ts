import { type Room, type Calendar, type CalendarEvent } from "@prisma/client";

export interface RoomWithCalendar extends Room {
  calendar: Pick<Calendar, "id" | "name" | "color">;
}

export interface RoomStatus {
  isFree: boolean;
  currentEvent: CalendarEvent | null;
  nextEvent: CalendarEvent | null;
  isEndingSoon: boolean;
  progressPercent: number;
}

export const EQUIPMENT_OPTIONS = [
  { value: "beamer", label: "Projector" },
  { value: "whiteboard", label: "Whiteboard" },
  { value: "videoconference", label: "Video Conference" },
  { value: "phone", label: "Phone" },
  { value: "tv", label: "TV" },
  { value: "webcam", label: "Webcam" },
  { value: "microphone", label: "Microphone" },
] as const;
