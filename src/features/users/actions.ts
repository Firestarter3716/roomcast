"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/server/db/prisma";
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
} from "./schemas";
import { createAuditLog } from "@/server/middleware/audit";
import bcrypt from "bcryptjs";

export async function getUsers() {
  return prisma.user.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
}

export async function getUser(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
}

export async function createUser(input: CreateUserInput) {
  const validated = createUserSchema.parse(input);
  const passwordHash = await bcrypt.hash(validated.password, 12);

  const user = await prisma.user.create({
    data: {
      email: validated.email,
      name: validated.name,
      passwordHash,
      role: validated.role,
    },
  });

  await createAuditLog({
    action: "CREATE",
    entityType: "User",
    entityId: user.id,
    entityName: user.name,
  });

  revalidatePath("/admin/settings");
  return user;
}

export async function updateUser(id: string, input: UpdateUserInput) {
  const validated = updateUserSchema.parse(input);

  const data: Record<string, unknown> = {};
  if (validated.email !== undefined) data.email = validated.email;
  if (validated.name !== undefined) data.name = validated.name;
  if (validated.role !== undefined) data.role = validated.role;
  if (validated.password && validated.password.length > 0) {
    data.passwordHash = await bcrypt.hash(validated.password, 12);
  }

  const user = await prisma.user.update({
    where: { id },
    data,
  });

  await createAuditLog({
    action: "UPDATE",
    entityType: "User",
    entityId: user.id,
    entityName: user.name,
  });

  revalidatePath("/admin/settings");
  return user;
}

export async function deleteUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error("User not found");

  await prisma.user.delete({ where: { id } });

  await createAuditLog({
    action: "DELETE",
    entityType: "User",
    entityId: id,
    entityName: user.name,
  });

  revalidatePath("/admin/settings");
}

export async function resetPassword(id: string, newPassword: string) {
  const passwordHash = await bcrypt.hash(newPassword, 12);

  const user = await prisma.user.update({
    where: { id },
    data: { passwordHash },
  });

  await createAuditLog({
    action: "UPDATE",
    entityType: "User",
    entityId: user.id,
    entityName: user.name,
    details: { reason: "password_reset" },
  });

  revalidatePath("/admin/settings");
  return user;
}
