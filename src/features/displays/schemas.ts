import { z } from "zod";
import { sanitizeString, sanitizeObject } from "@/shared/lib/sanitize";

export const createDisplaySchema = z.object({
  name: z.string().min(1, "Name is required").max(200).transform(sanitizeString),
  orientation: z.enum(["LANDSCAPE", "PORTRAIT", "AUTO"]),
  layoutType: z.enum(["ROOM_BOOKING", "AGENDA", "DAY_GRID", "WEEK_GRID", "INFO_DISPLAY"]),
  roomId: z.string().optional().or(z.literal("")),
  calendarIds: z.array(z.string()).optional(),
});

export type CreateDisplayInput = z.input<typeof createDisplaySchema>;

export const updateDisplaySchema = z.object({
  name: z.string().min(1).max(200).transform(sanitizeString).optional(),
  orientation: z.enum(["LANDSCAPE", "PORTRAIT", "AUTO"]).optional(),
  layoutType: z.enum(["ROOM_BOOKING", "AGENDA", "DAY_GRID", "WEEK_GRID", "INFO_DISPLAY"]).optional(),
  roomId: z.string().optional().nullable(),
  config: z.record(z.string(), z.unknown()).transform(sanitizeObject).optional(),
  ipWhitelist: z.array(z.string()).optional(),
  defaultTheme: z.string().optional().nullable(),
  defaultLang: z.string().optional().nullable(),
  refreshRate: z.number().int().min(5).max(300).optional(),
  enabled: z.boolean().optional(),
});

export type UpdateDisplayInput = z.input<typeof updateDisplaySchema>;
