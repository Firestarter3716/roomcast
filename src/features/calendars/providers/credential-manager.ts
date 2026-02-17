import { type CalendarProvider } from "@prisma/client";
import { encrypt, decrypt } from "@/server/lib/encryption";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function encryptProviderCredentials(credentials: Record<string, unknown>): any {
  return encrypt(JSON.stringify(credentials));
}

export function decryptProviderCredentials<T extends Record<string, string>>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any,
  _provider: CalendarProvider
): T {
  const buf = Buffer.from(data);
  const json = decrypt(buf);
  return JSON.parse(json) as T;
}
