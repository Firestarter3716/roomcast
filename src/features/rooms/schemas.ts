import { z } from "zod";
import { sanitizeString } from "@/shared/lib/sanitize";

export const createRoomSchema = z.object({
  name: z.string().min(1, "Name is required").max(200).transform(sanitizeString),
  location: z.string().max(200).transform(sanitizeString).optional().or(z.literal("")),
  capacity: z.number().int().min(1).max(10000).optional().nullable(),
  equipment: z.array(z.string().transform(sanitizeString)).default([]),
  calendarId: z.string().min(1, "Calendar is required"),
  resourceEmail: z.string().email().optional().or(z.literal("")),
  resourceId: z.string().optional().or(z.literal("")),
});

export type CreateRoomInput = z.input<typeof createRoomSchema>;

export const updateRoomSchema = createRoomSchema.partial();
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
