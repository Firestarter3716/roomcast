## Phase 1 – Analyse & Bestandsaufnahme
Status: ✅ Abgeschlossen

---

### Tech-Stack

| Schicht | Technologie | Version |
|---------|-------------|---------|
| Framework | Next.js (App Router, Turbopack) | 16.1.6 |
| UI | React | 19.2.4 |
| Sprache | TypeScript (strict) | 5.9.3 |
| Datenbank | PostgreSQL | 16 (Alpine) |
| ORM | Prisma | 6.19.2 |
| Auth | NextAuth.js (v5 Beta) | 5.0.0-beta.30 |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix) | 4.1.18 |
| i18n | next-intl (de, en, fr) | 4.8.3 |
| Validierung | Zod + react-hook-form | 4.3.6 / 7.71.1 |
| Deployment | Docker (Multi-Stage) + Docker Compose | – |

### Projektstruktur (165 TS/TSX Dateien, 81 Verzeichnisse)

```
src/
├── app/           → Next.js App Router (Pages, API Routes, Layouts)
│   ├── (auth)/    → Login, Passwort-Reset
│   ├── admin/     → Kalender, Räume, Displays, Settings, Audit, Health
│   ├── api/       → REST API Endpunkte
│   └── display/   → Öffentliche Display-Ansicht
├── features/      → Feature-Module
│   ├── audit/     → Audit-Log Verwaltung
│   ├── calendars/ → Kalender-Integration (Exchange, Google, CalDAV, ICS)
│   ├── display/   → Display-Rendering (5 Layout-Views, SSE, Echtzeit)
│   ├── displays/  → Display-Konfiguration (Editor, Wizard, QR-Code)
│   ├── rooms/     → Raumverwaltung
│   ├── settings/  → Systemeinstellungen + Health Dashboard
│   └── users/     → Benutzerverwaltung + Passwort-Reset
├── i18n/          → Internationalisierung (de, en, fr)
├── server/        → Backend-Services
│   ├── auth/      → NextAuth Konfiguration + Middleware
│   ├── db/        → Prisma Singleton
│   ├── lib/       → Email, Encryption, Logger
│   ├── middleware/ → Audit, Authorization, Rate-Limit
│   ├── sse/       → Server-Sent Events Registry
│   └── sync/      → Kalender-Sync Dispatcher + Worker
├── shared/        → Geteilte Komponenten & Utilities
│   ├── components/→ UI (shadcn/Radix), Layout, Dialoge
│   ├── lib/       → API-Error, Fonts, IP-Utils, Sanitize, Utils
│   ├── styles/    → globals.css
│   └── types/     → API & Auth Types
└── proxy.ts       → Proxy-Konfiguration
```

### Datenbank-Schema (11 Modelle)

| Modell | Beschreibung |
|--------|-------------|
| User | Benutzer mit Rollen (ADMIN, EDITOR, VIEWER) |
| Account | OAuth-Accounts (NextAuth) |
| Session | Sitzungen (NextAuth) |
| VerificationToken | Verifizierungs-Tokens (NextAuth) |
| Calendar | Kalender-Quellen (Exchange, Google, CalDAV, ICS) |
| CalendarEvent | Synchronisierte Kalender-Events |
| Room | Konferenzräume mit Kalender-Zuordnung |
| Display | Digitale Anzeigen mit Token, Layout, Theme |
| DisplayCalendar | Join-Table Display↔Kalender |
| AuditLog | Audit-Protokoll aller Aktionen |
| SystemSettings | Singleton-Systemeinstellungen |

### API-Endpunkte (16 Routes)

| Endpunkt | Methode | Beschreibung |
|----------|---------|-------------|
| /api/auth/[...nextauth] | GET/POST | Auth-Handler |
| /api/auth/google-calendar | GET | Google OAuth Start |
| /api/auth/google-calendar/callback | GET | Google OAuth Callback |
| /api/display/[token]/events | GET | SSE-Stream für Display |
| /api/display/[token]/events/poll | GET | Polling-Fallback |
| /api/calendars/[id]/sync | POST | Manueller Sync |
| /api/calendars/[id]/test | POST | Verbindungstest |
| /api/sync/cron | POST/GET | Cron-Dispatcher |
| /api/admin/users | GET/POST | Benutzer CRUD |
| /api/admin/users/[id] | PUT/DELETE | Benutzer Update/Delete |
| /api/admin/audit | GET | Audit-Logs abfragen |
| /api/admin/audit/export | GET | Audit CSV-Export |
| /api/admin/health | GET | System-Health |
| /api/admin/settings | GET/PUT | Systemeinstellungen |

### Vorhandene Features (vollständige Liste)

1. **Authentifizierung**: Login (Credentials, Google, Microsoft Entra ID), Passwort-Reset per Email
2. **Benutzerverwaltung**: CRUD, Rollen (Admin/Editor/Viewer), Locale-Einstellung
3. **Kalender-Integration**: 4 Provider (Exchange, Google, CalDAV, ICS), verschlüsselte Credentials
4. **Kalender-Sync**: Background-Worker, Cron-Dispatcher, Retry-Logik, Fehler-Recovery
5. **Raumverwaltung**: CRUD, Kalender-Zuordnung, Equipment-Tags, Kapazität
6. **Display-System**: 5 Layout-Views, Echtzeit-Updates (SSE), Token-basierter Zugang
7. **Display-Konfiguration**: Theme, Branding, Hintergrund, Layout-Einstellungen, QR-Code
8. **Audit-Logging**: Alle CRUD-Operationen, Login, Token-Regenerierung, CSV-Export
9. **Systemeinstellungen**: Locale, Timezone, Font, SMTP, Session-Timeout
10. **Health-Dashboard**: DB-Status, Kalender-Counts, SSE-Verbindungen, Sync-Status
11. **Internationalisierung**: Deutsch, Englisch, Französisch
12. **Rate-Limiting**: Pro Endpunkt konfigurierbar
13. **IP-Whitelisting**: Pro Display
14. **Verschlüsselung**: AES-256-GCM für Credentials und SMTP-Passwörter

---

### Bestehende Tests

**Status: ❌ KEINE TESTS VORHANDEN**

- 0 Test-Dateien (.test.ts, .test.tsx, .spec.ts, .spec.tsx)
- Kein Testing-Framework installiert (kein Vitest, Jest, Playwright, Cypress)
- Keine Testing-Konfiguration (kein vitest.config, jest.config, playwright.config)
- Kein `npm test` Script
- Keine CI/CD Pipeline
- Vorhandene Seed-Scripts für Testdaten: `prisma/seed.ts`, `prisma/seed-testdata.ts`

---

### Vorgeschlagene Testing-Dependencies

**Unit & Integration Tests (Vitest):**
```
vitest                          – Test-Runner (schnell, TypeScript-nativ)
@testing-library/react          – React-Component Testing
@testing-library/jest-dom       – DOM-Assertions
@testing-library/user-event     – User-Interaktion Simulation
jsdom                           – DOM-Umgebung für Tests
```

**E2E Tests (Playwright):**
```
@playwright/test                – E2E-Framework
```

**Mocking:**
```
msw (Mock Service Worker)       – API-Mocking für Integration Tests (optional)
```

**Coverage:**
```
@vitest/coverage-v8             – Code-Coverage Reporting
```

---

### Erledigt
- [x] Projekt gescannt (Struktur, Dependencies, Config)
- [x] Tech-Stack identifiziert
- [x] Alle vorhandenen Features inventarisiert (14 Feature-Bereiche)
- [x] Bestehende Tests geprüft (keine vorhanden)
- [x] Testing-Dependencies vorgeschlagen
- [x] .testing/ Verzeichnisstruktur erstellt

### Gefundene Probleme
- ⚠️ [Warning] Keine Tests vorhanden – gesamte Codebase ungetestet
- ⚠️ [Warning] Kein CI/CD Pipeline konfiguriert
- ⚠️ [Warning] Duplizierte logger.ts Datei in src/server/lib/
