# CLAUDE.md – Digital Signage Calendar Platform

> Primäre Entwicklungsanleitung für Claude Code.
> Fokus: Was die App tun soll, wie sie sich verhalten soll, welche Regeln gelten.
> Architektur, Dateistruktur und Styling entscheidest du selbst nach Best Practices.

---

## Was diese App ist

Eine **Digital Signage Web-App** zur Anzeige von Kalender-Inhalten auf Bildschirmen jeder Größe.
Betreiber verbinden externe Kalender (Exchange, Google, CalDAV, ICS), erstellen Display-Konfigurationen und erhalten einen einzigen URL-Token, den sie in jedem Digital Signage CMS als Webpage-Quelle eintragen – fertig.

**Zwei klar getrennte Welten:**
- **Admin-Bereich** (`/admin/*`) → Auth-geschützt, für Konfiguration
- **Display-Endpunkt** (`/display/[token]`) → Vollständig öffentlich, läuft autonom

---

## Navigation (Admin)

Exakt vier Bereiche:

```
Calendars | Rooms | Displays | Admin
```

---

## Feature-Specs

---

### 1. Calendars

#### Kalender hinzufügen

Es gibt vier Provider-Typen. Das Formular wechselt die Felder je nach Auswahl:

**Microsoft Exchange / Outlook (Graph API)**
- Felder: Tenant ID, Client ID, Client Secret, Benutzer-E-Mail (UPN), optionale Ressource-E-Mail
- Auth-Flow: OAuth 2.0 Client Credentials – kein interaktiver User-Login nötig
- Scope: `Calendar.Read`
- Besonderheit: Unterstützt Raumressourcen über die Ressource-E-Mail

**Google Calendar**
- Felder: Client ID, Client Secret + OAuth-Button (startet interaktiven OAuth-Flow)
- Nach OAuth: Refresh Token wird gespeichert, kein erneuter Login nötig
- Calendar-Auswahl nach Verbindung: Dropdown aus allen verfügbaren Kalendern des Nutzers

**CalDAV (Nextcloud, Apple, Baikal, Radicale)**
- Felder: Server-URL, Benutzername, Passwort
- Nach Verbindung: Automatische Kalenderentdeckung via PROPFIND
- Kalender-Auswahl aus gefundener Liste

**ICS-Feed**
- Felder: Feed-URL, optionaler Auth-Header (z.B. `Bearer token` für private Feeds)
- Schreibgeschützt – keine Buchungs-Funktionen möglich

#### Verbindungstest
- Immer vor dem Speichern: Button „Verbindung testen"
- Test führt echten API-Call durch (nicht nur Ping)
- Zeigt: ✅ Verbindung OK + Kalenderanzahl / ❌ Fehlermeldung mit Ursache (Auth, Netzwerk, Zertifikat)

#### Sync-Verhalten
- Sync-Intervall pro Kalender: 30 Sekunden bis 24 Stunden (Slider oder Dropdown)
- Letzter Sync-Zeitpunkt wird angezeigt
- Manueller Sync-Button jederzeit verfügbar
- Sync-Status: `IDLE` / `SYNCING` / `ERROR` als sichtbarer Indikator auf der Karte
- Bei `ERROR`: Fehlermeldung im Klartext + „Erneut versuchen"-Button

#### Kalenderfarbe
- Jeder Kalender hat eine zuweisbare Farbe (Colorpicker)
- Farbe erscheint in allen Display-Views bei Events dieses Kalenders

---

### 2. Rooms

#### Raum erstellen
- Felder: Name, Standort/Gebäude, Kapazität (Personen), Ausstattung (Tags: Beamer, Whiteboard, Videokonferenz etc.)
- Einem Raum wird genau ein Kalender zugewiesen (aus den verbundenen Kalendern)
- Optional: Ressource-E-Mail für automatische Buchungserkennung bei Exchange
- Optional: Ressource-ID für Google-Ressourcen

#### Raumübersicht
- Jede Raumkarte zeigt in Echtzeit:
  - **Frei** (grün): Nächste Buchung mit Startzeit
  - **Belegt** (rot): Aktuelles Meeting mit Endzeit + Fortschrittsbalken
  - Nächste Buchung direkt darunter

#### Verknüpfung zu Displays
- Jede Raumkarte hat einen Direktlink zum zugehörigen Display (falls vorhanden)
- Kein Display verknüpft → Button „Display erstellen" der direkt in den Display-Wizard springt, Raum vorausgewählt

---

### 3. Displays

#### Display-Erstellungs-Wizard (3 Schritte)

**Schritt 1: Grundeinstellungen**
- Name, Orientierung (Landscape / Portrait / Auto)
- Zuordnung: Raum (für Room Booking) oder freie Kalender-Auswahl (für andere Views)
- Mehrere Kalender gleichzeitig wählbar (außer bei Room Booking: genau ein Raum)

**Schritt 2: Layout wählen**
- Visuelle Auswahl mit Vorschau-Screenshot je Layout
- 5 Layouts: Room Booking, Agenda, Day Grid, Week Grid, Info Display
- Je nach Orientierung werden nur passende Layouts angeboten (z.B. Room Booking in Portrait empfohlen)

**Schritt 3: Theme konfigurieren**
- Direkt im Editor (siehe Display-Editor & Theme weiter unten)
- Live-Vorschau rechts neben der Konfiguration

**Nach dem Wizard:**
- Token wird generiert, Display-URL angezeigt
- QR-Code des Links direkt sichtbar + Download-Button
- Copy-to-clipboard für die URL

#### Display-Link
```
https://yourdomain.com/display/[TOKEN]
```

Optionale Query-Parameter (werden im Admin als Toggles angeboten):
- `theme=light|dark` – Theme-Override
- `lang=de|en|fr` – Sprache/Datumsformat
- `refresh=30` – Reload-Intervall in Sekunden
- `scale=fit|fill` – Skalierungsmodus

Token-Sicherheit:
- Token ist kryptographisch zufällig (nicht erratbar)
- Kein Auth auf dem Display-Endpunkt
- Token kann jederzeit neu generiert werden → alter Token sofort ungültig
- Optional: IP-Whitelist pro Display (CIDR-Notierung)

---

### 4. Display-Editor & Theme

Der Editor ist der Kern der Konfiguration. Er öffnet sich beim Erstellen und ist danach jederzeit erreichbar.

#### Layout: Editor + Live-Vorschau
- **Links (40%):** Konfigurations-Panel mit Tabs
- **Rechts (60%):** Live-Vorschau des Displays, skaliert auf Vorschaugröße
- Jede Änderung spiegelt sich sofort in der Vorschau wider (kein „Speichern zum Vorschauen")
- Vorschau zeigt echte Daten aus dem zugewiesenen Kalender (oder Beispiel-Events wenn leer)

#### Tab 1: Layout-Optionen
Jedes Layout hat eigene Optionen. Beispiele:

*Room Booking:*
- Organisator anzeigen: Ja/Nein
- Anzahl Teilnehmer anzeigen: Ja/Nein
- Fortschrittsbalken anzeigen: Ja/Nein
- Anzahl zukünftiger Termine: 1–5
- Freizeiten anzeigen: Ja/Nein
- Uhrformat: 12h / 24h

*Agenda:*
- Zeitbereich: Von/Bis (Uhrzeit)
- Raumname anzeigen: Ja/Nein
- Aktuellen Termin hervorheben: Ja/Nein
- Maximale Events: 5–30
- Auto-Scroll: Ja/Nein + Geschwindigkeit

*Info Display:*
- Uhr anzeigen: Ja/Nein + Format
- Datum anzeigen: Ja/Nein
- Heutige Events anzeigen: Ja/Nein
- Kommende Tage: 1–7
- Ticker aktiv: Ja/Nein
- Ticker-Nachrichten: Freitext-Liste (add/remove)
- Ticker-Geschwindigkeit: Langsam / Mittel / Schnell

#### Tab 2: Theme (Farben & Typografie)

**Farbschema:**
- Hintergrundfarbe
- Textfarbe (Vordergrund)
- Primärfarbe (Akzente, Buttons, Hervorhebungen)
- Sekundärfarbe (zweite Ebene, Hintergründe von Sektionen)
- „Frei"-Farbe (Standard: Grün) – erscheint überall wo ein Raum/Slot frei ist
- „Belegt"-Farbe (Standard: Rot) – erscheint überall wo ein Raum/Slot belegt ist
- Gedämpfte Farbe (Muted) – für Zeitstempel, Nebeninformationen

**Vorgefertigte Paletten:**
- Dark Professional (dunkelblau/weiß)
- Light Clean (weiß/dunkelgrau)
- Corporate (anpassbar auf Firmenfarben)
- High Contrast (für schlechte Lichtverhältnisse)

**Typografie:**
- Schriftart: Auswahl aus 6–8 selbst-gehosteten Fonts (Inter, Roboto, DM Sans, Geist etc.)
- Basisgröße: Slider (wird automatisch auf Viewport skaliert)

#### Tab 3: Branding

- **Logo:** Upload (SVG, PNG) oder URL-Eingabe
- Position: Oben links / Oben rechts / Oben Mitte
- Größe: Klein / Mittel / Groß
- „Powered by"-Branding: Ja/Nein (eigenes Branding deaktivierbar)

#### Tab 4: Hintergrund

- Typ: Einfarbig / Verlauf / Hintergrundbild
- Bei Verlauf: Startfarbe, Endfarbe, Winkel
- Bei Bild: Upload oder URL + Deckkraft-Slider (für Text-Lesbarkeit)

---

### 5. Display-Views (Öffentlicher Endpunkt)

#### Gemeinsame Regeln für ALLE Views

- `width: 100vw`, `height: 100vh`, `overflow: hidden` – kein Scroll, kein Overflow, kein Zoom
- Schriftgrößen mit `clamp()` – automatische Skalierung von kleinen bis großen Screens
- Kein Nutzereingriff nötig – alles läuft autonom
- Bei Datenverlust/Fehler: saubere Fehler-View statt weißem Screen
- Animierte Übergänge bei Terminwechseln (Fade oder Slide, keine abrupten Cuts)
- Meta-Tag `<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">`

#### View 1: Room Booking

*Zweck:* Beschilderung neben Konferenzraum-Türen (typisch 10"–24", Portrait & Landscape)

**Portrait-Verhalten:**
- Obere Hälfte: Raumname, Standort, aktueller Status (FREI / BELEGT als großes farbiges Banner)
- Mitte: Aktueller Termin – Titel, Zeitraum, Organisator, Fortschrittsbalken
- Untere Hälfte: Nächste 1–2 Termine, dann „Frei ab HH:MM"
- Ganz unten: Uhrzeit + Datum

**Landscape-Verhalten:**
- Linke Spalte (60%): Aktueller Termin mit Status-Banner oben
- Rechte Spalte (40%): Nächster Termin + Danach-Info
- Header-Zeile: Logo + Raumname + aktuelle Uhrzeit

**Status-Logik:**
- Termin läuft: „BELEGT" in `busyColor`, Fortschrittsbalken zeigt % der abgelaufenen Zeit
- Termin endet in ≤ 15 Minuten: Zusätzlicher Hinweis „Endet bald"
- Kein Termin: „FREI" in `freeColor`, nächster Termin unten
- Ganztägige Termine: Werden als „Gesamten Tag belegt" angezeigt, kein Fortschrittsbalken

**Buchungsende-Übergang:**
- Wenn Termin endet: View wechselt automatisch auf „FREI" mit Fade-Animation (nicht auf Reload warten)

#### View 2: Agenda

*Zweck:* Empfangsbereiche, Lobbys, Flure – Tagesübersicht aller Termine

**Layout:**
- Header: Logo + Datum (ausgeschrieben)
- Timeline: Uhrzeiten links (Stundenlinie), Events rechts als Zeilen
- Aktueller Termin: Farblich hervorgehoben + linke Randmarkierung
- Vergangene Termine: Abgedunkelt (50% Opacity)
- Zwischen-Zeilen: „MITTAGSPAUSE" oder „Keine weiteren Termine" wenn Lücken > 2h

**Auto-Scroll:**
- Falls mehr Events als Platz: Automatischer, sanfter Scroll (Pixel-by-Pixel, kein Seitensprung)
- Scrollgeschwindigkeit konfigurierbar
- Am Ende: Pause + zurück zum Anfang

**Mitternachts-Verhalten:**
- Um 00:00 Uhr: Automatischer Wechsel auf nächsten Tag ohne Reload

#### View 3: Day Grid

*Zweck:* Tagesansicht mit Stunden-Raster, Meeting-Übersichten (40"+)

**Layout:**
- Stunden-Spalte links (feste Breite), Kalender-Spalten rechts
- Events als farbige Blöcke (Farbe aus Kalender-Einstellung)
- Überlappende Events: Nebeneinander, Breite geteilt
- Aktuelle Zeit: Horizontale Linie in Primärfarbe
- Zeitraum konfigurierbar (Standard: 07:00 – 22:00)

**Scrolling:**
- Wenn Zeitraum nicht auf Screen passt: Automatisches Scrollen zum aktuellen Zeitpunkt
- Kein manuelles Scrollen möglich (Display-View!)

#### View 4: Week Grid

*Zweck:* Wochenübersicht, Executive Displays, Team-Kalender

**Layout:**
- Spalten: Mo–Fr (Standard) oder Mo–So (konfigurierbar)
- Zeilen: Stunden
- Events als kompakte Blöcke mit Farbe des Kalenders
- Aktueller Tag: Spalte hervorgehoben (hellerer Hintergrund)
- Aktuelle Zeit: Punkt in der aktuellen Tagesspalte

**Wochenwechsel:**
- Zeigt immer die aktuelle Woche
- Um 00:00 Montag: Automatischer Wechsel zur neuen Woche

#### View 5: Info Display

*Zweck:* Wartebereiche, Kantinen, Eingangsbereiche – Überblick + Uhr + Ticker

**Layout (Landscape, typisch 55"+):**
- Header: Logo + Datum
- Großuhr: Zentriert oder oben rechts, prominente Darstellung
- Linker Bereich: Heutige Termine (nächste 3–5)
- Rechter Bereich: Kommende Termine der nächsten X Tage
- Footer: Ticker-Leiste (horizontaler Lauftext)

**Ticker:**
- Konfigurierbare Nachrichten (z.B. WLAN-Passwort, Willkommenstext, Hinweise)
- Läuft in Endlosschleife
- Geschwindigkeit: Langsam / Mittel / Schnell
- Trennzeichen zwischen Nachrichten: konfigurierbar (z.B. `·` oder `|`)

**Uhr:**
- Sekundenanzeige: optional
- Format: 12h / 24h
- Animiert (kein Flackern, kein Springen)

---

### 6. Kalender-Sync & Fehlerbehandlung

#### Sync-Ablauf

1. Background-Job läuft je Kalender im konfigurierten Intervall
2. Holt Events vom externen Provider (Exchange/Google/CalDAV/ICS)
3. Vergleicht mit gecachtem Stand (Upsert-Logik, keine Duplikate)
4. Löscht Events die extern nicht mehr existieren
5. Schreibt Diff in `CalendarEvent`-Tabelle
6. Benachrichtigt alle verbundenen Display-Clients via SSE

**Event-Cache:**
- Events werden lokal in der DB gecacht (nicht live vom Provider beim Display-Aufruf)
- Das Display zeigt immer den gecachten Stand – auch wenn Provider gerade nicht erreichbar
- Cache-Horizon: 30 Tage in der Vergangenheit, 90 Tage in der Zukunft (konfigurierbar)

#### Fehlerbehandlung Sync

**Verbindungsfehler (Netzwerk/DNS):**
- Status → `ERROR`, Fehlermeldung speichern
- Retry mit exponentiellem Backoff: 1min → 2min → 4min → 8min → max 30min
- Nach 3 aufeinanderfolgenden Fehlern: Admin-UI zeigt Warnung prominent
- Display läuft weiter mit gecachten Daten (keine Unterbrechung)

**Auth-Fehler (Token abgelaufen):**
- Bei OAuth: Automatischer Token-Refresh via Refresh Token
- Wenn Refresh fehlschlägt: Status → `ERROR`, Meldung: „Re-Authentifizierung erforderlich"
- Admin bekommt deutlichen Hinweis mit Link zur Neu-Verbindung

**Ungültige/geänderte Events:**
- Einzelne kaputte Events werden übersprungen (kein Sync-Abbruch)
- Fehlerhafte Event-IDs werden geloggt, Sync läuft weiter

**Provider-seitige Fehler (Rate Limit, 500 etc.):**
- HTTP 429: Backoff nach `Retry-After`-Header, sonst 5min
- HTTP 5xx: Standard-Backoff
- HTTP 403/401: Direkt als Auth-Fehler behandeln (kein Retry)

#### Fehlerbehandlung Display-Endpunkt

**Kein Internet / SSE unterbrochen:**
- Client erkennt SSE-Verbindungsabbruch
- Fallback: HTTP-Polling alle `refreshRate` Sekunden
- Keine sichtbare Fehlermeldung für Betrachter – Display zeigt weiter gecachte Daten

**Token ungültig / nicht gefunden:**
- Zeigt saubere Fehlerseite: „Display nicht gefunden" (kein Stack Trace, kein weißer Screen)

**Datenbank nicht erreichbar:**
- Zeigt saubere Fehlerseite: „Wartung" o.ä.
- Kein Absturz, kein React Error Boundary Fallback ohne Styling

**Event-Rendering-Fehler:**
- Einzelne Events die nicht gerendert werden können: überspringen, Rest anzeigen
- Niemals die gesamte View crashen wegen eines einzelnen Events

---

### 7. Realtime-Updates (SSE)

- Jeder Display-Client verbindet sich beim Start mit dem SSE-Endpunkt
- Server sendet bei jeder Sync-Änderung neue Event-Daten
- Client updatet View ohne Reload (keine Seitenneuladung, keine Flackern)
- SSE-Verbindung wird alle 30 Sekunden mit Heartbeat aufrechterhalten
- Bei Verbindungsabbruch: Auto-Reconnect nach 5 Sekunden (exponentielles Backoff bis 60s)
- Verbindungsstatus ist unsichtbar für Display-Betrachter

---

### 8. Auth & Rollen

**Rollen:**
- `ADMIN`: Vollzugriff inkl. Benutzerverwaltung, Systemeinstellungen
- `EDITOR`: Kann Kalender, Räume, Displays erstellen/bearbeiten. Kein Benutzermanagement.
- `VIEWER`: Nur Lesezugriff auf Admin-Bereich (kein Erstellen/Bearbeiten/Löschen)

**Login:**
- Credentials (E-Mail + Passwort)
- Optional: OAuth-Provider (Google, Microsoft) – konfigurierbar
- Optional: LDAP-Anbindung – konfigurierbar

**Session:**
- Display-Endpunkt ist vollständig öffentlich – kein Auth, kein Cookie
- Admin-Bereich: Middleware schützt alle `/admin/*`-Routen
- Inaktivitäts-Timeout: konfigurierbar (Standard: 8h)

---

### 9. Admin-Bereich: System & Einstellungen

**Benutzerverwaltung:**
- Benutzer anlegen, bearbeiten, löschen
- Rolle ändern (nur ADMIN)
- Passwort-Reset per E-Mail (optional, wenn SMTP konfiguriert)

**System-Health:**
- Sync-Status aller Kalender auf einen Blick
- Datenbankverbindung: OK / Fehler
- Anzahl aktiver Display-Verbindungen (SSE)
- Letzter Sync-Zeitpunkt je Kalender

**Globale Einstellungen:**
- Standard-Sprache (DE / EN / FR)
- Standard-Zeitzone
- Standard-Schriftart für neue Displays
- Logo für neue Displays (Fallback)

**Audit-Log:**
- Wer hat was wann geändert (Kalender, Räume, Displays, Benutzer)
- Nicht löschbar, nur lesbar (auch für ADMIN)
- Export als CSV

---

## Verhalten & UX-Regeln

### Admin-Bereich
- Alle Formulare: Client-seitige Validierung sofort, Server-seitige Validierung beim Submit
- Destructive Actions (Löschen, Token neu generieren): Immer Bestätigungs-Dialog mit explizitem Text was passiert
- Laden-Zustände: Alle async Aktionen zeigen Spinner/Skeleton, nie leeren Screen
- Fehler-Feedback: Toast-Notifications für Erfolg/Fehler bei jeder Aktion

### Display-Endpunkt
- Kein Cursor sichtbar (CSS: `cursor: none` auf Body)
- Kein Text-Selection möglich (`user-select: none`)
- Keine Scrollbars (`overflow: hidden`)
- Kein Context-Menu (für Touchscreens: `onContextMenu` verhindert)
- Screen-Wake-Lock API nutzen (verhindert Bildschirmabschaltung wo unterstützt)

---

## Mehrsprachigkeit

Zwei Sprachen: `de` (Standard), `en`, 

Was übersetzt wird:
- Alle UI-Labels im Admin-Bereich
- Alle sichtbaren Texte in Display-Views (FREI/BELEGT, Uhr, Datumsformate)
- Fehlermeldungen

Was NICHT übersetzt wird:
- Event-Titel und -Beschreibungen (kommen vom Kalender-Provider)
- Raumname, Standort (Freitexteingabe)

Datumsformate je Sprache:
- `de`: `Dienstag, 17. Juni 2025`, `15:42 Uhr`
- `en`: `Tuesday, June 17, 2025`, `3:42 PM` (12h default) / `15:42` (24h)
- `fr`: `mardi 17 juin 2025`, `15h42`

---

## Was bewusst NICHT implementiert wird

- Keine direkte Buchungsfunktion vom Display aus (nur Anzeige)
- Kein Mobile-App (nur Web)
- Kein eigener Kalender-Server (nur Integration externer Provider)
- Keine Push-Notifications
- Kein Video-Content in Displays
