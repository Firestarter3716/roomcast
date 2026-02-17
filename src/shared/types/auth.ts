import { type Role } from "@prisma/client";

export type { Role } from "@prisma/client";

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: Role;
  locale: string;
}
