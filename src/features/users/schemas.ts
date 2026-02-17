import { z } from "zod";
import { sanitizeString } from "@/shared/lib/sanitize";

export const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required").max(200).transform(sanitizeString),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]),
});

export type CreateUserInput = z.input<typeof createUserSchema>;

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(200).transform(sanitizeString).optional(),
  password: z.string().min(8).optional().or(z.literal("")),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]).optional(),
});

export type UpdateUserInput = z.input<typeof updateUserSchema>;
