import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@roomcast.local";
  const password = process.env.ADMIN_PASSWORD || "changeme123";

  console.log(`Seeding database...`);

  // Create default admin user
  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: "ADMIN" },
    create: {
      email,
      name: "Administrator",
      passwordHash,
      role: "ADMIN",
    },
  });
  console.log(`Admin user: ${admin.email} (${admin.id})`);

  // Create default system settings
  const settings = await prisma.systemSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      defaultLocale: "de",
      defaultTimezone: "Europe/Berlin",
      defaultFont: "inter",
      sessionTimeoutHours: 8,
    },
  });
  console.log(`System settings: locale=${settings.defaultLocale}, tz=${settings.defaultTimezone}`);

  console.log(`Seeding complete.`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
