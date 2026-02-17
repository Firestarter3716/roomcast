import nodemailer from "nodemailer";
import prisma from "@/server/db/prisma";
import { decrypt } from "@/server/lib/encryption";

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const settings = await prisma.systemSettings.findUnique({ where: { id: "singleton" } });

  if (!settings?.smtpHost) {
    console.warn("[email] SMTP not configured, skipping email send");
    return false;
  }

  let smtpPass: string | undefined;
  if (settings.smtpPasswordEncrypted) {
    try {
      smtpPass = decrypt(Buffer.from(settings.smtpPasswordEncrypted));
    } catch {
      console.error("[email] Failed to decrypt SMTP password");
      return false;
    }
  }

  const transport = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort || 587,
    secure: settings.smtpPort === 465,
    auth: settings.smtpUser ? {
      user: settings.smtpUser,
      pass: smtpPass || "",
    } : undefined,
  });

  try {
    await transport.sendMail({
      from: settings.smtpFromAddress || `RoomCast <noreply@${settings.smtpHost}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error("[email] Failed to send:", error instanceof Error ? error.message : error);
    return false;
  }
}
