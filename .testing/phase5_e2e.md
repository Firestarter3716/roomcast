## Phase 5 – E2E Tests (Playwright)
Status: ✅ Abgeschlossen

### Testergebnisse
- **5 Test-Suiten**, **13 Tests**, **alle bestanden** ✅
- Setup: 1 Auth-Setup (storageState-Persistenz)
- Laufzeit: ~60s (inkl. Auth-Setup, seriell mit 1 Worker)
- Framework: Playwright + Chromium, Page Object Pattern

### Architektur-Entscheidungen
- **StorageState**: Einmaliger Login in `auth.setup.ts`, Session wird für alle Tests wiederverwendet → vermeidet Rate-Limiting (60 Req/60s auf `/api/auth`)
- **Page Object Pattern**: 5 POM-Klassen in `e2e/pages/` für Wartbarkeit
- **Serieller Ablauf**: `workers: 1`, `fullyParallel: false` — Tests bauen aufeinander auf (CRUD-Zyklen)
- **i18n-aware Selektoren**: Regex-Patterns für DE/EN (`/Löschen|Delete/`)

### Kritische User Flows

#### 01 — Auth Flow (5 Tests)
- `e2e/01-auth.e2e.spec.ts`
- Redirect unauthenticated → Login-Seite
- Fehlermeldung bei falschen Credentials
- Erfolgreicher Login → Admin-Bereich
- Navigation zwischen Admin-Sektionen
- Logout → Redirect zu Login

#### 02 — Calendar CRUD (3 Tests)
- `e2e/02-calendar-crud.e2e.spec.ts`
- ICS-Kalender erstellen (Name + Feed-URL)
- Kalender-Name bearbeiten
- Kalender löschen (ConfirmDialog)

#### 03 — Room CRUD (1 konsolidierter Test)
- `e2e/03-room-crud.e2e.spec.ts`
- Vollständiger Lebenszyklus: Kalender erstellen → Raum erstellen → Raum editieren → Raum löschen → Kalender aufräumen
- Konsolidiert in einen Test, um Rate-Limiting zu vermeiden

#### 04 — Display Wizard (2 Tests)
- `e2e/04-display-wizard.e2e.spec.ts`
- Display über 3-Schritt-Wizard erstellen (Name → Layout → Erfolg)
- Public-Access-Verifizierung (unauthentifizierter Zugriff auf `/display/{token}`)
- Token-Generierung prüfen
- Display löschen via ConfirmDialog

#### 05 — User Management (2 Tests)
- `e2e/05-user-management.e2e.spec.ts`
- Vollständiger Lebenszyklus: User erstellen → Bug B1 verifizieren → Rolle ändern → User löschen
- Neuer User kann sich einloggen (frischer Browser-Kontext)
- Bug B1/B2 Workarounds integriert

### Page Objects
| Datei | Beschreibung |
|-------|-------------|
| `e2e/pages/login.page.ts` | Login mit Retry-Logik (Rate-Limit-Schutz) |
| `e2e/pages/calendar.page.ts` | Kalender-CRUD Aktionen |
| `e2e/pages/room.page.ts` | Raum-Formular & Liste |
| `e2e/pages/display.page.ts` | Display-Wizard Schritte |
| `e2e/pages/user.page.ts` | User-Verwaltung |

### Gefundene Bugs
| ID | Schwere | Beschreibung |
|----|---------|-------------|
| B1 | 🔴 Kritisch | UserList Edit-Link zeigt auf nicht-existierende `/edit`-Route → 404 |
| B2 | 🟡 Mittel | UserForm verwendet `createUserSchema` im Edit-Modus → Passwort-Pflicht beim Editieren |

### Gefundene Warnings
| ID | Priorität | Beschreibung |
|----|-----------|-------------|
| W2 | 🟡 Mittel | Rate-Limit IP-Extraktion liefert "unknown" ohne Reverse-Proxy |

### Konfiguration
- `playwright.config.ts` — Hauptkonfiguration mit Auth-Projekt
- `e2e/auth.setup.ts` — Einmaliger Admin-Login
- `e2e/.auth/admin.json` — Persistierte Session (gitignored)
- `BASE_URL=http://192.168.178.92:3000` — Matching NEXTAUTH_URL
