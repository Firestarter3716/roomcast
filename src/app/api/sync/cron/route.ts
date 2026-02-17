import { NextRequest, NextResponse } from "next/server";
import { dispatchSync } from "@/server/sync/dispatcher";

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dispatchSync();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cron sync dispatch error:", error);
    return NextResponse.json(
      { error: "Sync dispatch failed" },
      { status: 500 }
    );
  }
}

// Also support GET for simple cron job tools
export async function GET(request: NextRequest) {
  return POST(request);
}
