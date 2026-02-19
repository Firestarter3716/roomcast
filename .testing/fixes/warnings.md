## ⚠️ Warnings & Code-Smells

| ID | Gefunden in Phase | Beschreibung | Datei | Priorität | Status |
|----|-------------------|--------------|-------|-----------|--------|
| W1 | Phase 4 | Flaky Timer-Test: `sleep` nutzte `Date.now()` statt Fake Timers — unzuverlässig in jsdom | src/shared/lib/utils.test.ts | Niedrig | ✅ Behoben |
| W2 | Phase 5 | Rate-Limit IP-Extraktion: `getIpFromRequest()` liefert "unknown" ohne Reverse-Proxy → alle lokalen Clients teilen ein Rate-Limit-Bucket | src/server/middleware/rate-limit.ts:27-33 | 🟡 Mittel | ✅ Behoben |
