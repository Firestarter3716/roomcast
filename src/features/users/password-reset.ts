"use server";

import { randomBytes } from "node:crypto";
import prisma from "@/server/db/prisma";
import bcrypt from "bcryptjs";
import { sendEmail } from "@/server/lib/email";

export async function requestPasswordReset(email: string): Promise<{ success: boolean }> {
  // Always return success to prevent email enumeration
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { success: true };

  // Generate token
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Store token (upsert to handle duplicate requests)
  await prisma.verificationToken.upsert({
    where: { identifier_token: { identifier: email, token } },
    create: { identifier: email, token, expires },
    update: { expires },
  });

  // Send email
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
  await sendEmail(
    email,
    "RoomCast — Password Reset",
    `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">Password Reset</h2>
      <p>You requested a password reset for your RoomCast account.</p>
      <p><a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">Reset Password</a></p>
      <p style="color: #737373; font-size: 14px;">This link expires in 1 hour. If you did not request this, ignore this email.</p>
    </div>`
  );

  return { success: true };
}

export async function resetPasswordWithToken(
  email: string,
  token: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  // Find valid token
  const verificationToken = await prisma.verificationToken.findFirst({
    where: { identifier: email, token, expires: { gt: new Date() } },
  });

  if (!verificationToken) {
    return { success: false, error: "Invalid or expired reset link" };
  }

  // Update password
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { email },
    data: { passwordHash },
  });

  // Delete used token
  await prisma.verificationToken.delete({
    where: { identifier_token: { identifier: email, token } },
  });

  return { success: true };
}
