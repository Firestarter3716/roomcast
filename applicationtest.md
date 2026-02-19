# 🧪 Test-Session: Vollständige Testdurchführung

## Deine Aufgabe
Führe mit mir eine strukturierte, vollständige Testdurchführung meiner Webanwendung durch.
Arbeite dich von Unit Tests bis zu E2E Tests vor – Schritt für Schritt.
Nach den Tests folgt eine dedizierte Fix-Phase, in der alle gefundenen Probleme behoben werden.

---

## ⚠️ Wichtigste Regel: Feature-Schutz
Bevor du irgendetwas änderst, analysiere zuerst:
1. Lies alle relevanten Dateien (package.json, README, Konfigurationsdateien, bestehende Tests)
2. Erstelle eine vollständige Liste aller vorhandenen Features und Funktionen
3. Bestätige diese Liste mit mir, bevor du irgendetwas anfasst
4. Jede Änderung darf KEIN bestehendes Feature entfernen oder brechen
5. Bei Unsicherheit: FRAG MICH, handle nicht eigenmächtig

---

## 📁 Dateistruktur

Erstelle zu Beginn folgende Dateien unter `.testing/`:

### Test-Fortschritt (wird während der Tests befüllt)
- `.testing/phase1_analyse.md`
- `.testing/phase2_unit.md`
- `.testing/phase3_integration.md`
- `.testing/phase4_ui.md`
- `.testing/phase5_e2e.md`
- `.testing/phase6_abschluss.md`

### Fix-Tracking (wird parallel zu den Tests befüllt)
- `.testing/fixes/bugs.md` – Fehler die behoben werden müssen
- `.testing/fixes/warnings.md` – Warnungen & Code-Smells
- `.testing/fixes/priorities.md` – Priorisierte Fix-Reihenfolge (wird am Ende von dir erstellt)

---

## 📋 Format der Test-Phasen-Dateien
```
## Phase X – [Name]
Status: 🔄 In Arbeit

### TODOs
- [ ] Aufgabe 1
- [ ] Aufgabe 2

### Erledigt
- [x] Aufgabe (Datum/Uhrzeit)

### Gefundene Probleme → werden automatisch in .testing/fixes/ eingetragen
- 🐛 [Bug] Beschreibung – Datei:Zeile
- ⚠️ [Warning] Beschreibung
```

---

## 📋 Format der Fix-Dateien

### bugs.md
```
## 🐛 Bug-Liste

| ID | Gefunden in Phase | Beschreibung | Datei/Zeile | Schwere | Status |
|----|-------------------|--------------|-------------|---------|--------|
| B001 | Phase 2 | Login schlägt bei Sonderzeichen fehl | auth.service.ts:42 | 🔴 Kritisch | ⏳ Offen |
| B002 | Phase 3 | API gibt 500 statt 404 zurück | users.controller.ts:87 | 🟡 Mittel | ⏳ Offen |
```

### warnings.md
```
## ⚠️ Warnings & Code-Smells

| ID | Gefunden in Phase | Beschreibung | Datei | Priorität | Status |
|----|-------------------|--------------|-------|-----------|--------|
| W001 | Phase 2 | Funktion hat keine Fehlerbehandlung | helper.ts:12 | 🟡 Mittel | ⏳ Offen |
```

### priorities.md (wird erst nach allen Test-Phasen erstellt)
```
## 🎯 Fix-Reihenfolge

### Sofort (Blocker)
- [ ] B001 – Login schlägt bei Sonderzeichen fehl

### Diese Session
- [ ] B002 – API gibt 500 statt 404 zurück
- [ ] W001 – Fehlende Fehlerbehandlung in helper.ts

### Später / Nice-to-have
- [ ] ...
```

---

## 🧠 Context-Management (WICHTIG)
Überwache kontinuierlich den genutzten Context:

- Bei **~40% Context-Auslastung**: Weise mich aktiv darauf hin
- Bei **~60% Context-Auslastung**: Fordere mich auf, einen `/compact` durchzuführen, BEVOR wir weitermachen
- Vor jedem `/compact`: Stelle sicher, dass alle `.testing/` Dateien vollständig aktualisiert sind
- Nach einem `/compact`: Lies zuerst ALLE `.testing/` Dateien um den Stand wiederherzustellen

Format der Warnung:
```
⚠️ CONTEXT-WARNUNG: Wir sind bei ca. [X]% Context-Auslastung.
Bitte führe jetzt `/compact` aus, bevor wir mit [nächster Schritt] weitermachen.
Alle .testing/ Dateien sind aktuell – wir können danach nahtlos weitermachen.
```

---

## Phase 1: Analyse & Bestandsaufnahme
1. Scanne das gesamte Projekt (Struktur, Abhängigkeiten, bestehende Tests)
2. Identifiziere das Tech-Stack (Framework, Testing-Tools, CI/CD)
3. Erstelle einen Bericht:
   - Welche Tests existieren bereits?
   - Welche Features sind noch ungetestet?
   - Welche Testing-Tools sind bereits installiert?
4. Schlage fehlende Testing-Dependencies vor, OHNE sie sofort zu installieren
5. Befülle `.testing/phase1_analyse.md` vollständig
6. Warte auf meine Freigabe

---

## Phase 2: Unit Tests
- Teste alle Utility-Funktionen, Helper, Services isoliert
- Teste alle Komponenten (falls Frontend) in Isolation
- Ziel: Jede Funktion hat mindestens einen Happy-Path und einen Error-Case Test
- Jeden gefundenen Bug → sofort in `.testing/fixes/bugs.md` eintragen
- Jede Warning → sofort in `.testing/fixes/warnings.md` eintragen
- Aktualisiere `.testing/phase2_unit.md` nach jedem erledigten Test
- Führe die Tests aus und zeige mir die Ergebnisse

---

## Phase 3: Integration Tests
- Teste das Zusammenspiel von Modulen (z.B. Service + DB, API Routes + Auth)
- Nutze Mocks nur wo absolut nötig – bevorzuge echte Integrationen
- Teste alle API-Endpunkte mit echten HTTP-Calls
- Jeden gefundenen Bug → sofort in `.testing/fixes/bugs.md` eintragen
- Jede Warning → sofort in `.testing/fixes/warnings.md` eintragen
- Aktualisiere `.testing/phase3_integration.md` nach jedem erledigten Test
- Führe die Tests aus und zeige mir die Ergebnisse

---

## Phase 4: UI / Component Tests (falls Frontend vorhanden)
- Teste kritische UI-Komponenten gerendert (nicht nur gemockt)
- Prüfe: Werden Props korrekt dargestellt? Reagieren Events korrekt?
- Falls Storybook vorhanden: Stories für untestete Komponenten erstellen
- Jeden gefundenen Bug → sofort in `.testing/fixes/bugs.md` eintragen
- Jede Warning → sofort in `.testing/fixes/warnings.md` eintragen
- Aktualisiere `.testing/phase4_ui.md` nach jedem erledigten Test
- Führe die Tests aus und zeige mir die Ergebnisse

---

## Phase 5: E2E Tests
- Definiere mit mir gemeinsam die 3–5 kritischsten User Flows
- Implementiere diese als E2E Tests (bevorzugt Playwright, alternativ Cypress)
- Nutze Page Object Pattern für Wiederverwendbarkeit
- Jeden gefundenen Bug → sofort in `.testing/fixes/bugs.md` eintragen
- Jede Warning → sofort in `.testing/fixes/warnings.md` eintragen
- Aktualisiere `.testing/phase5_e2e.md` nach jedem erledigten Flow
- Führe die Tests aus und zeige mir die Ergebnisse

---

## Phase 6: Priorisierung & Fix-Plan
1. Lies alle Einträge aus `.testing/fixes/bugs.md` und `.testing/fixes/warnings.md`
2. Erstelle `.testing/fixes/priorities.md` mit priorisierter Fix-Reihenfolge:
   - 🔴 Blocker (kritische Bugs, Sicherheitsprobleme)
   - 🟡 Diese Session (wichtige Bugs, fehlende Fehlerbehandlung)
   - 🟢 Später (Code-Smells, Nice-to-haves)
3. Präsentiere mir den Plan und warte auf Freigabe bevor du anfängst zu fixen

---

## Phase 7: Fix-Session
- Arbeite die `priorities.md` von oben nach unten ab
- Pro Fix:
  1. Erkläre was du änderst und warum
  2. Zeige den Code-Diff bevor du ihn schreibst
  3. Warte auf meine Freigabe
  4. Führe danach die betroffenen Tests erneut aus
  5. Markiere den Eintrag in `bugs.md` / `warnings.md` als ✅ Erledigt
- NIEMALS ein Feature entfernen oder refactoren ohne explizite Freigabe

---

## Phase 8: Abschlussbericht
Erstelle `.testing/phase6_abschluss.md` mit:
- Testabdeckung vorher vs. nachher
- Alle behobenen Bugs und Warnings
- Noch offene Punkte
- Empfehlungen für CI/CD Integration
- Bestätigung: Alle ursprünglichen Features sind noch intakt ✅

---

## Arbeitsweise
- Arbeite Phase für Phase – starte die nächste Phase erst nach meiner Freigabe
- Zeige mir immer den Code bevor du ihn schreibst
- Bei fehlschlagenden Tests: erkläre Ursache und Lösungsvorschlag, fixe nicht blind
- Kommuniziere auf Deutsch
- Die `.testing/` Dateien sind dein einziges Gedächtnis über Context-Grenzen hinweg – halte sie immer aktuell
