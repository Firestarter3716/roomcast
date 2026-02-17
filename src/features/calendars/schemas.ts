import { z } from "zod";

// Provider-specific credential schemas
const exchangeCredentialsSchema = z.object({
  provider: z.literal("EXCHANGE"),
  tenantId: z.string().min(1, "Tenant ID ist erforderlich"),
  clientId: z.string().min(1, "Client ID ist erforderlich"),
  clientSecret: z.string().min(1, "Client Secret ist erforderlich"),
  userEmail: z.string().email("Ungültige E-Mail-Adresse"),
  resourceEmail: z.string().email("Ungültige E-Mail-Adresse").optional().or(z.literal("")),
});

const googleCredentialsSchema = z.object({
  provider: z.literal("GOOGLE"),
  clientId: z.string().min(1, "Client ID ist erforderlich"),
  clientSecret: z.string().min(1, "Client Secret ist erforderlich"),
  refreshToken: z.string().min(1, "Refresh Token ist erforderlich"),
  calendarId: z.string().min(1, "Kalender-ID ist erforderlich"),
});

const caldavCredentialsSchema = z.object({
  provider: z.literal("CALDAV"),
  serverUrl: z.string().url("Ungültige Server-URL"),
  username: z.string().min(1, "Benutzername ist erforderlich"),
  password: z.string().min(1, "Passwort ist erforderlich"),
  calendarPath: z.string().optional().or(z.literal("")),
});

const icsCredentialsSchema = z.object({
  provider: z.literal("ICS"),
  feedUrl: z.string().url("Ungültige Feed-URL"),
  authHeader: z.string().optional().or(z.literal("")),
});

export const calendarCredentialsSchema = z.discriminatedUnion("provider", [
  exchangeCredentialsSchema,
  googleCredentialsSchema,
  caldavCredentialsSchema,
  icsCredentialsSchema,
]);

export type CalendarCredentialsInput = z.infer<typeof calendarCredentialsSchema>;

export const createCalendarSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich").max(200),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Ungültiger Farbcode"),
  syncIntervalSeconds: z.number().int().min(30).max(86400),
  credentials: calendarCredentialsSchema,
});

export type CreateCalendarInput = z.infer<typeof createCalendarSchema>;

export const updateCalendarSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  syncIntervalSeconds: z.number().int().min(30).max(86400).optional(),
  enabled: z.boolean().optional(),
  credentials: calendarCredentialsSchema.optional(),
});

export type UpdateCalendarInput = z.infer<typeof updateCalendarSchema>;
