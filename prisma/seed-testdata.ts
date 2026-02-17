import { PrismaClient } from "@prisma/client";
import { createCipheriv, randomBytes, scryptSync } from "node:crypto";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function encryptCredentials(credentials: Record<string, unknown>): Uint8Array<ArrayBuffer> {
  const secret = process.env.ENCRYPTION_SECRET || "dev-encryption-secret-change-in-production";
  const key = scryptSync(secret, "roomcast-credential-salt", 32);
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = JSON.stringify(credentials);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const buf = Buffer.concat([iv, authTag, encrypted]);
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength) as Uint8Array<ArrayBuffer>;
}

function today(hour: number, minute = 0): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

function daysFromNow(days: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  console.log("Seeding test data...\n");

  // --- Users ---
  const passwordHash = await bcrypt.hash("changeme", 12);
  const editor = await prisma.user.upsert({
    where: { email: "editor@roomcast.local" },
    update: {},
    create: { email: "editor@roomcast.local", name: "Emma Editor", passwordHash, role: "EDITOR" },
  });
  const viewer = await prisma.user.upsert({
    where: { email: "viewer@roomcast.local" },
    update: {},
    create: { email: "viewer@roomcast.local", name: "Victor Viewer", passwordHash, role: "VIEWER" },
  });
  console.log(`Users: ${editor.email}, ${viewer.email}`);

  // --- Calendars ---
  const dummyCreds = encryptCredentials({ type: "test", note: "Test calendar - no real provider" });

  const calMarketing = await prisma.calendar.upsert({
    where: { id: "cal-marketing" },
    update: {},
    create: {
      id: "cal-marketing",
      name: "Marketing Team",
      provider: "ICS",
      color: "#EF4444",
      credentialsEncrypted: dummyCreds,
      syncStatus: "IDLE",
      lastSyncAt: new Date(),
      syncIntervalSeconds: 300,
    },
  });

  const calEngineering = await prisma.calendar.upsert({
    where: { id: "cal-engineering" },
    update: {},
    create: {
      id: "cal-engineering",
      name: "Engineering Team",
      provider: "GOOGLE",
      color: "#3B82F6",
      credentialsEncrypted: dummyCreds,
      syncStatus: "IDLE",
      lastSyncAt: new Date(),
      syncIntervalSeconds: 300,
    },
  });

  const calExec = await prisma.calendar.upsert({
    where: { id: "cal-executive" },
    update: {},
    create: {
      id: "cal-executive",
      name: "Executive Board",
      provider: "EXCHANGE",
      color: "#8B5CF6",
      credentialsEncrypted: dummyCreds,
      syncStatus: "IDLE",
      lastSyncAt: new Date(),
      syncIntervalSeconds: 600,
    },
  });

  const calHR = await prisma.calendar.upsert({
    where: { id: "cal-hr" },
    update: {},
    create: {
      id: "cal-hr",
      name: "HR & People Ops",
      provider: "CALDAV",
      color: "#10B981",
      credentialsEncrypted: dummyCreds,
      syncStatus: "ERROR",
      lastSyncAt: daysFromNow(-1, 14),
      lastSyncError: "Connection timeout after 30s - CalDAV server unreachable",
      consecutiveErrors: 3,
      syncIntervalSeconds: 300,
    },
  });

  console.log(`Calendars: ${calMarketing.name}, ${calEngineering.name}, ${calExec.name}, ${calHR.name}`);

  // --- Rooms ---
  const roomAlpha = await prisma.room.upsert({
    where: { id: "room-alpha" },
    update: {},
    create: {
      id: "room-alpha",
      name: "Alpha (Large)",
      location: "Building A, Floor 2",
      capacity: 20,
      equipment: ["Projector", "Whiteboard", "Video Conferencing", "Microphone"],
      calendarId: calEngineering.id,
    },
  });

  const roomBeta = await prisma.room.upsert({
    where: { id: "room-beta" },
    update: {},
    create: {
      id: "room-beta",
      name: "Beta (Medium)",
      location: "Building A, Floor 2",
      capacity: 10,
      equipment: ["TV Display", "Whiteboard", "Video Conferencing"],
      calendarId: calMarketing.id,
    },
  });

  const roomGamma = await prisma.room.upsert({
    where: { id: "room-gamma" },
    update: {},
    create: {
      id: "room-gamma",
      name: "Gamma (Huddle)",
      location: "Building A, Floor 1",
      capacity: 4,
      equipment: ["TV Display"],
      calendarId: calExec.id,
    },
  });

  const roomDelta = await prisma.room.upsert({
    where: { id: "room-delta" },
    update: {},
    create: {
      id: "room-delta",
      name: "Delta (Board Room)",
      location: "Building B, Floor 3",
      capacity: 16,
      equipment: ["Projector", "Video Conferencing", "Microphone", "Whiteboard", "Phone"],
      calendarId: calExec.id,
    },
  });

  console.log(`Rooms: ${roomAlpha.name}, ${roomBeta.name}, ${roomGamma.name}, ${roomDelta.name}`);

  // --- Events (today + this week) ---
  // Delete existing test events first
  await prisma.calendarEvent.deleteMany({
    where: { externalId: { startsWith: "test-" } },
  });

  const events = [
    // Engineering (today) - room Alpha
    { calendarId: calEngineering.id, externalId: "test-eng-1", title: "Daily Standup", startTime: today(9, 0), endTime: today(9, 15), organizer: "Sarah Chen", attendeeCount: 8 },
    { calendarId: calEngineering.id, externalId: "test-eng-2", title: "Sprint Planning", startTime: today(10, 0), endTime: today(11, 30), organizer: "Mike Johnson", attendeeCount: 12, location: "Room Alpha" },
    { calendarId: calEngineering.id, externalId: "test-eng-3", title: "Architecture Review", startTime: today(13, 0), endTime: today(14, 0), organizer: "Sarah Chen", attendeeCount: 6, description: "Review microservice migration plan" },
    { calendarId: calEngineering.id, externalId: "test-eng-4", title: "1:1 with Manager", startTime: today(14, 30), endTime: today(15, 0), organizer: "David Kim", attendeeCount: 2 },
    { calendarId: calEngineering.id, externalId: "test-eng-5", title: "Code Review Session", startTime: today(15, 30), endTime: today(16, 30), organizer: "Lisa Wang", attendeeCount: 5 },
    { calendarId: calEngineering.id, externalId: "test-eng-6", title: "Demo Prep", startTime: today(17, 0), endTime: today(17, 30), organizer: "Mike Johnson", attendeeCount: 4 },

    // Marketing (today) - room Beta
    { calendarId: calMarketing.id, externalId: "test-mkt-1", title: "Campaign Review", startTime: today(9, 30), endTime: today(10, 30), organizer: "Anna Schmidt", attendeeCount: 6, location: "Room Beta" },
    { calendarId: calMarketing.id, externalId: "test-mkt-2", title: "Content Strategy", startTime: today(11, 0), endTime: today(12, 0), organizer: "Tom Brown", attendeeCount: 4 },
    { calendarId: calMarketing.id, externalId: "test-mkt-3", title: "Social Media Sync", startTime: today(13, 30), endTime: today(14, 0), organizer: "Anna Schmidt", attendeeCount: 3 },
    { calendarId: calMarketing.id, externalId: "test-mkt-4", title: "Brand Workshop", startTime: today(14, 30), endTime: today(16, 0), organizer: "Jessica Lee", attendeeCount: 8, description: "Q2 brand refresh discussion" },

    // Executive (today) - room Gamma & Delta
    { calendarId: calExec.id, externalId: "test-exec-1", title: "Leadership Sync", startTime: today(8, 30), endTime: today(9, 30), organizer: "CEO Office", attendeeCount: 5, location: "Delta (Board Room)" },
    { calendarId: calExec.id, externalId: "test-exec-2", title: "Budget Review Q2", startTime: today(10, 0), endTime: today(11, 0), organizer: "CFO Office", attendeeCount: 4, location: "Delta (Board Room)" },
    { calendarId: calExec.id, externalId: "test-exec-3", title: "Quick Sync: Product", startTime: today(11, 30), endTime: today(12, 0), organizer: "VP Product", attendeeCount: 3, location: "Gamma (Huddle)" },
    { calendarId: calExec.id, externalId: "test-exec-4", title: "Investor Update Prep", startTime: today(14, 0), endTime: today(15, 30), organizer: "CEO Office", attendeeCount: 6, location: "Delta (Board Room)" },
    { calendarId: calExec.id, externalId: "test-exec-5", title: "Board Pre-Read Review", startTime: today(16, 0), endTime: today(17, 0), organizer: "CEO Office", attendeeCount: 3 },

    // HR (today)
    { calendarId: calHR.id, externalId: "test-hr-1", title: "Interview: Senior Dev", startTime: today(10, 0), endTime: today(11, 0), organizer: "HR Team", attendeeCount: 3 },
    { calendarId: calHR.id, externalId: "test-hr-2", title: "Onboarding: New Hires", startTime: today(13, 0), endTime: today(14, 30), organizer: "HR Team", attendeeCount: 5, description: "Welcome session for 3 new team members" },
    { calendarId: calHR.id, externalId: "test-hr-3", title: "Benefits Review Meeting", startTime: today(15, 0), endTime: today(16, 0), organizer: "HR Team", attendeeCount: 2 },

    // Tomorrow
    { calendarId: calEngineering.id, externalId: "test-eng-t1", title: "Daily Standup", startTime: daysFromNow(1, 9, 0), endTime: daysFromNow(1, 9, 15), organizer: "Sarah Chen", attendeeCount: 8 },
    { calendarId: calEngineering.id, externalId: "test-eng-t2", title: "Tech Debt Review", startTime: daysFromNow(1, 10, 0), endTime: daysFromNow(1, 11, 0), organizer: "Lisa Wang", attendeeCount: 6 },
    { calendarId: calEngineering.id, externalId: "test-eng-t3", title: "Deployment Window", startTime: daysFromNow(1, 14, 0), endTime: daysFromNow(1, 15, 0), organizer: "DevOps", attendeeCount: 4 },
    { calendarId: calMarketing.id, externalId: "test-mkt-t1", title: "Newsletter Review", startTime: daysFromNow(1, 11, 0), endTime: daysFromNow(1, 12, 0), organizer: "Tom Brown", attendeeCount: 3 },
    { calendarId: calExec.id, externalId: "test-exec-t1", title: "All-Hands Meeting", startTime: daysFromNow(1, 15, 0), endTime: daysFromNow(1, 16, 0), organizer: "CEO Office", attendeeCount: 50, location: "Main Auditorium" },

    // Day after tomorrow
    { calendarId: calEngineering.id, externalId: "test-eng-d2-1", title: "Daily Standup", startTime: daysFromNow(2, 9, 0), endTime: daysFromNow(2, 9, 15), organizer: "Sarah Chen", attendeeCount: 8 },
    { calendarId: calEngineering.id, externalId: "test-eng-d2-2", title: "Sprint Retro", startTime: daysFromNow(2, 11, 0), endTime: daysFromNow(2, 12, 0), organizer: "Mike Johnson", attendeeCount: 10 },
    { calendarId: calMarketing.id, externalId: "test-mkt-d2-1", title: "Product Launch Sync", startTime: daysFromNow(2, 10, 0), endTime: daysFromNow(2, 11, 30), organizer: "Anna Schmidt", attendeeCount: 8 },
    { calendarId: calExec.id, externalId: "test-exec-d2-1", title: "Board Meeting", startTime: daysFromNow(2, 9, 0), endTime: daysFromNow(2, 12, 0), organizer: "CEO Office", attendeeCount: 12, location: "Delta (Board Room)" },

    // Day +3
    { calendarId: calEngineering.id, externalId: "test-eng-d3-1", title: "Daily Standup", startTime: daysFromNow(3, 9, 0), endTime: daysFromNow(3, 9, 15), organizer: "Sarah Chen", attendeeCount: 8 },
    { calendarId: calEngineering.id, externalId: "test-eng-d3-2", title: "Hackathon Kickoff", startTime: daysFromNow(3, 10, 0), endTime: daysFromNow(3, 17, 0), organizer: "Engineering", attendeeCount: 20, description: "Quarterly hackathon - build something cool!" },
    { calendarId: calHR.id, externalId: "test-hr-d3-1", title: "Team Building Event", startTime: daysFromNow(3, 14, 0), endTime: daysFromNow(3, 17, 0), organizer: "HR Team", attendeeCount: 30, location: "Rooftop Terrace" },

    // Day +4
    { calendarId: calEngineering.id, externalId: "test-eng-d4-1", title: "Hackathon Demos", startTime: daysFromNow(4, 14, 0), endTime: daysFromNow(4, 16, 0), organizer: "Engineering", attendeeCount: 25, location: "Main Auditorium" },
    { calendarId: calMarketing.id, externalId: "test-mkt-d4-1", title: "Q2 Planning", startTime: daysFromNow(4, 10, 0), endTime: daysFromNow(4, 12, 0), organizer: "Marketing Lead", attendeeCount: 8 },
  ];

  await prisma.calendarEvent.createMany({ data: events });
  console.log(`Events: ${events.length} created`);

  // --- Displays ---
  const displayLobby = await prisma.display.upsert({
    where: { id: "display-lobby" },
    update: {},
    create: {
      id: "display-lobby",
      name: "Lobby Info Screen",
      token: "lobby-info-display-token",
      orientation: "LANDSCAPE",
      layoutType: "INFO_DISPLAY",
      config: {
        theme: { background: "#0f172a", foreground: "#f8fafc", primary: "#3b82f6", secondary: "#1e293b", free: "#22c55e", busy: "#ef4444", muted: "#64748b" },
        branding: { logoUrl: "", position: "top-left", size: "medium", showPoweredBy: true },
        background: { type: "solid", color: "#0f172a" },
        layout: { showClock: true, clockFormat: "24h", showDate: true, showTodayEvents: true, upcomingDays: 3, showTicker: true, tickerMessages: ["Welcome to RoomCast HQ", "Free Wi-Fi: RoomCast-Guest", "Cafeteria open until 14:00"], tickerSpeed: 60 },
      },
      enabled: true,
    },
  });

  const displayAlpha = await prisma.display.upsert({
    where: { id: "display-alpha" },
    update: {},
    create: {
      id: "display-alpha",
      name: "Room Alpha Display",
      token: "room-alpha-display-token",
      orientation: "LANDSCAPE",
      layoutType: "ROOM_BOOKING",
      roomId: roomAlpha.id,
      config: {
        theme: { background: "#0a0a0a", foreground: "#fafafa", primary: "#3b82f6", secondary: "#1a1a2e", free: "#22c55e", busy: "#ef4444", muted: "#737373" },
        branding: { logoUrl: "", position: "top-left", size: "small", showPoweredBy: false },
        background: { type: "solid", color: "#0a0a0a" },
        layout: { showOrganizer: true, showAttendeeCount: true, showProgressBar: true, futureEventCount: 3, showFreeSlots: true, clockFormat: "24h" },
      },
      enabled: true,
    },
  });

  const displayBeta = await prisma.display.upsert({
    where: { id: "display-beta" },
    update: {},
    create: {
      id: "display-beta",
      name: "Room Beta Display",
      token: "room-beta-display-token",
      orientation: "LANDSCAPE",
      layoutType: "ROOM_BOOKING",
      roomId: roomBeta.id,
      config: {
        theme: { background: "#ffffff", foreground: "#0f172a", primary: "#6366f1", secondary: "#f1f5f9", free: "#22c55e", busy: "#ef4444", muted: "#94a3b8" },
        branding: { logoUrl: "", position: "top-right", size: "small", showPoweredBy: false },
        background: { type: "solid", color: "#ffffff" },
        layout: { showOrganizer: true, showAttendeeCount: false, showProgressBar: true, futureEventCount: 2, showFreeSlots: true, clockFormat: "24h" },
      },
      enabled: true,
    },
  });

  const displayAgenda = await prisma.display.upsert({
    where: { id: "display-agenda" },
    update: {},
    create: {
      id: "display-agenda",
      name: "Floor 2 Agenda",
      token: "floor2-agenda-display-token",
      orientation: "PORTRAIT",
      layoutType: "AGENDA",
      config: {
        theme: { background: "#1e1b4b", foreground: "#e0e7ff", primary: "#818cf8", secondary: "#312e81", free: "#34d399", busy: "#f87171", muted: "#6366f1" },
        branding: { logoUrl: "", position: "top-center", size: "medium", showPoweredBy: true },
        background: { type: "gradient", startColor: "#1e1b4b", endColor: "#0f172a", angle: 180 },
        layout: { timeRange: "08:00-18:00", showRoomName: true, highlightCurrent: true, maxEvents: 10, autoScroll: true, scrollSpeed: 30 },
      },
      enabled: true,
    },
  });

  const displayWeek = await prisma.display.upsert({
    where: { id: "display-week" },
    update: {},
    create: {
      id: "display-week",
      name: "Reception Week View",
      token: "reception-week-display-token",
      orientation: "LANDSCAPE",
      layoutType: "WEEK_GRID",
      config: {
        theme: { background: "#fafaf9", foreground: "#1c1917", primary: "#d97706", secondary: "#fef3c7", free: "#16a34a", busy: "#dc2626", muted: "#a8a29e" },
        branding: { logoUrl: "", position: "top-left", size: "small", showPoweredBy: false },
        background: { type: "solid", color: "#fafaf9" },
        layout: { showWeekends: false, showCurrentDayHighlight: true },
      },
      enabled: true,
    },
  });

  console.log(`Displays: ${displayLobby.name}, ${displayAlpha.name}, ${displayBeta.name}, ${displayAgenda.name}, ${displayWeek.name}`);

  // --- Display-Calendar associations ---
  const displayCalendars = [
    { displayId: displayLobby.id, calendarId: calEngineering.id },
    { displayId: displayLobby.id, calendarId: calMarketing.id },
    { displayId: displayLobby.id, calendarId: calExec.id },
    { displayId: displayAgenda.id, calendarId: calEngineering.id },
    { displayId: displayAgenda.id, calendarId: calMarketing.id },
    { displayId: displayWeek.id, calendarId: calEngineering.id },
    { displayId: displayWeek.id, calendarId: calMarketing.id },
    { displayId: displayWeek.id, calendarId: calExec.id },
    { displayId: displayWeek.id, calendarId: calHR.id },
  ];

  for (const dc of displayCalendars) {
    await prisma.displayCalendar.upsert({
      where: { displayId_calendarId: dc },
      update: {},
      create: dc,
    });
  }
  console.log(`Display-Calendar links: ${displayCalendars.length}`);

  // --- Audit logs (sample history) ---
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  const auditEntries = [
    { userId: admin?.id, action: "CREATE" as const, entityType: "Calendar", entityId: calEngineering.id, entityName: "Engineering Team", createdAt: daysFromNow(-5, 10) },
    { userId: admin?.id, action: "CREATE" as const, entityType: "Calendar", entityId: calMarketing.id, entityName: "Marketing Team", createdAt: daysFromNow(-5, 10, 5) },
    { userId: admin?.id, action: "CREATE" as const, entityType: "Calendar", entityId: calExec.id, entityName: "Executive Board", createdAt: daysFromNow(-5, 10, 10) },
    { userId: admin?.id, action: "CREATE" as const, entityType: "Calendar", entityId: calHR.id, entityName: "HR & People Ops", createdAt: daysFromNow(-5, 10, 15) },
    { userId: admin?.id, action: "CREATE" as const, entityType: "Room", entityId: roomAlpha.id, entityName: "Alpha (Large)", createdAt: daysFromNow(-4, 9) },
    { userId: admin?.id, action: "CREATE" as const, entityType: "Room", entityId: roomBeta.id, entityName: "Beta (Medium)", createdAt: daysFromNow(-4, 9, 5) },
    { userId: admin?.id, action: "CREATE" as const, entityType: "Room", entityId: roomGamma.id, entityName: "Gamma (Huddle)", createdAt: daysFromNow(-4, 9, 10) },
    { userId: admin?.id, action: "CREATE" as const, entityType: "Room", entityId: roomDelta.id, entityName: "Delta (Board Room)", createdAt: daysFromNow(-4, 9, 15) },
    { userId: admin?.id, action: "CREATE" as const, entityType: "Display", entityId: displayLobby.id, entityName: "Lobby Info Screen", createdAt: daysFromNow(-3, 14) },
    { userId: admin?.id, action: "CREATE" as const, entityType: "Display", entityId: displayAlpha.id, entityName: "Room Alpha Display", createdAt: daysFromNow(-3, 14, 5) },
    { userId: admin?.id, action: "UPDATE" as const, entityType: "Display", entityId: displayAlpha.id, entityName: "Room Alpha Display", createdAt: daysFromNow(-2, 11) },
    { userId: admin?.id, action: "CREATE" as const, entityType: "User", entityId: editor.id, entityName: "Emma Editor", createdAt: daysFromNow(-2, 15) },
    { userId: admin?.id, action: "SYNC" as const, entityType: "Calendar", entityId: calEngineering.id, entityName: "Engineering Team", createdAt: daysFromNow(-1, 8) },
    { userId: admin?.id, action: "SYNC" as const, entityType: "Calendar", entityId: calMarketing.id, entityName: "Marketing Team", createdAt: daysFromNow(-1, 8, 1) },
    { userId: admin?.id, action: "UPDATE" as const, entityType: "SystemSettings", entityId: "singleton", entityName: "System Settings", createdAt: daysFromNow(-1, 16) },
    { userId: admin?.id, action: "LOGIN" as const, entityType: "User", entityId: admin?.id, entityName: "Administrator", createdAt: today(8, 0) },
  ];

  await prisma.auditLog.createMany({ data: auditEntries });
  console.log(`Audit logs: ${auditEntries.length} entries`);

  console.log("\n--- Test Data Summary ---");
  console.log("Users:      3 (admin + editor + viewer, all password: changeme)");
  console.log("Calendars:  4 (Engineering, Marketing, Executive, HR)");
  console.log("Rooms:      4 (Alpha, Beta, Gamma, Delta)");
  console.log(`Events:     ${events.length} (today + next 4 days)`);
  console.log("Displays:   5 (Lobby Info, Room Alpha, Room Beta, Floor 2 Agenda, Week View)");
  console.log("Audit logs: 16 sample entries");
  console.log("\n--- Display URLs ---");
  console.log("http://localhost:3000/display/lobby-info-display-token");
  console.log("http://localhost:3000/display/room-alpha-display-token");
  console.log("http://localhost:3000/display/room-beta-display-token");
  console.log("http://localhost:3000/display/floor2-agenda-display-token");
  console.log("http://localhost:3000/display/reception-week-display-token");
  console.log("\nDone!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
