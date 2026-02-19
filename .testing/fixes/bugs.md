## 🐛 Bug-Liste

| ID | Gefunden in Phase | Beschreibung | Datei/Zeile | Schwere | Status |
|----|-------------------|--------------|-------------|---------|--------|
| B1 | Phase 5 | UserList Edit-Link zeigt auf `/admin/settings/users/{id}/edit` — Route existiert nicht (nur `/admin/settings/users/[id]`). Ergibt 404. | src/features/users/components/UserList.tsx:132 | 🔴 Kritisch | ✅ Behoben |
| B2 | Phase 5 | UserForm verwendet `createUserSchema` (Passwort Pflicht) auch im Edit-Modus statt `updateUserSchema` (Passwort optional). Passwort-Änderung beim Editieren erzwungen. | src/features/users/components/UserForm.tsx:33-34 | 🟡 Mittel | ✅ Behoben |
