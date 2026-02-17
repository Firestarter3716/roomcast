import { dispatchSync } from "./dispatcher";

const INTERVAL_MS = 30_000; // 30 seconds

async function main() {
  console.log("[sync-worker] Starting RoomCast sync worker...");
  console.log(`[sync-worker] Dispatch interval: ${INTERVAL_MS / 1000}s`);

  // Initial run
  await runDispatch();

  // Schedule recurring runs
  setInterval(runDispatch, INTERVAL_MS);
}

async function runDispatch() {
  try {
    await dispatchSync();
  } catch (error) {
    console.error("[sync-worker] Dispatch error:", error);
  }
}

main().catch((error) => {
  console.error("[sync-worker] Fatal error:", error);
  process.exit(1);
});
