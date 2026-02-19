## 🎯 Fix-Reihenfolge

### 🔴 Sofort (Blocker)

- [x] **B1** – UserList Edit-Link zeigt auf nicht-existierende Route → 404
  - **Datei:** `src/features/users/components/UserList.tsx:132`
  - **Problem:** `href={/admin/settings/users/${user.id}/edit}` — die Route `/edit` existiert nicht, die Edit-Seite liegt unter `/admin/settings/users/[id]`
  - **Fix:** `/edit` aus dem href entfernen → `href={/admin/settings/users/${user.id}}`
  - **Impact:** Kritisch — Admin kann keinen User bearbeiten ohne manuell URL anzupassen

### 🟡 Diese Session

- [x] **B2** – UserForm verwendet falsches Schema im Edit-Modus
  - **Datei:** `src/features/users/components/UserForm.tsx:33-34`
  - **Problem:** Nutzt `createUserSchema` (Passwort Pflichtfeld) auch wenn `mode === "edit"`. Das korrekte `updateUserSchema` (Passwort optional) existiert bereits, wird aber nicht verwendet.
  - **Fix:** Schema + Type abhängig von `mode` setzen:
    - `mode === "create"` → `createUserSchema` / `CreateUserInput`
    - `mode === "edit"` → `updateUserSchema` / `UpdateUserInput`
  - **Impact:** Mittel — Admin muss beim Bearbeiten immer ein neues Passwort setzen, auch wenn er nur die Rolle ändern will

- [x] **W2** – Rate-Limit IP-Extraktion liefert "unknown"
  - **Datei:** `src/server/middleware/rate-limit.ts:27-33`
  - **Problem:** `getIpFromRequest()` prüft nur `x-forwarded-for` und `x-real-ip` Header. Ohne Reverse-Proxy (lokale Entwicklung, Docker) sind beide leer → Fallback `"unknown"` → alle Clients teilen ein Bucket.
  - **Fix:** `request.ip` als zusätzlichen Fallback vor `"unknown"` einfügen (Next.js stellt `request.ip` in Middleware/Edge bereit)
  - **Impact:** Mittel — In Produktion mit Reverse-Proxy kein Problem, aber in lokaler Entwicklung oder Docker-Deployments teilen alle Nutzer ein Rate-Limit

### 🟢 Später / Nice-to-have

- Keine offenen Punkte — W1 (Flaky Timer-Test) wurde bereits in Phase 4 behoben.
