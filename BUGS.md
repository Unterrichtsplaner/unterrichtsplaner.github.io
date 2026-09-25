# Bekannte Fehler & Aufgaben

Stand: Code-Review vom 23.09.2026, neue Befunde aus dem Review vom 25.09.2026 in K–O, aus dem fünften Review (25.09.2026, nachmittags) in P–S. Zeilennummern beziehen sich auf diesen Stand und verrutschen mit der Zeit – im Zweifel nach dem Funktionsnamen suchen.

**Arbeitsweise:** Ein Block pro Sitzung. Für jeden Fix zuerst einen Test schreiben, der den Fehler zeigt, dann reparieren und hier abhaken (`[x]` + Commit-Hash).

Priorität: 🔴 Datenverlust / App kaputt · 🟠 falsche Anzeige / nervig · 🟢 Kleinkram

---

## A. Cloud-Sync

> Behoben. Tests: `tests/sync.test.js`. Cloud-Format v2 (Feld `format: 2`): gzip → AES-256-GCM, Schlüssel per PBKDF2-SHA256 (300 000 Runden). Alte Cloud-Daten (v1, CryptoJS) bleiben lesbar und werden beim ersten Sync still umgeschrieben (gleicher Inhalt, gleiche Versionskennung → andere Geräte merken nichts). Geräte mit **alter App-Version** können v2 nicht lesen (Fehlermeldung, kein Datenverlust), bis sich die App aktualisiert hat. Cloud-Dokument über 1 000 000 Byte → nichts wird hochgeladen, Hinweis; ab 75 % Warnung. Konflikt-Dialog nur noch, wenn sich die Inhalte wirklich unterscheiden.

- [x] **A1** 🔴 `saveDB(true)` setzt `lastModified` neu, auch direkt nach Upload/Pull/„no_change“ (`saveDB`, `triggerSyncInternal`, `resolveConflict`). Folge: Gerät gilt immer als „lokal geändert“ → falsche Konflikte, sobald ein zweites Gerät synct.
- [x] **A2** 🔴 Neues Gerät (leere DB, `lastSynced = 0`) → immer Konflikt, leere lokale Version wird als „(aktueller)“ angezeigt. „Hochladen“ überschreibt die Cloud mit nichts. (`triggerSyncInternal`, Konflikt-Modal ~Z. 4067)
- [x] **A3** 🔴 Master-Passwort wird nie gegen die Cloud geprüft und per `oninput` bei jedem Tastendruck übernommen (index.html ~Z. 912). Tippfehler → Autosave verschlüsselt die Cloud mit falschem Passwort, andere Geräte kommen nicht mehr ran.
- [x] **A4** 🔴 Keine Sperre gegen parallele Syncs; ein Pull überschreibt `db` ohne zu prüfen, ob während des `await` lokal etwas eingetragen wurde → Eingaben gehen verloren.
- [x] **A5** 🔴 `clearAllData()` (~Z. 2459): Reste von Export-Code (`a`, `url` undefiniert) → ReferenceError. Leere DB geht beim nächsten Speichern als „neuester Stand“ in die Cloud.
- [x] **A6** 🟠 Konflikt-Modal öffnet sich bei jeder Eingabe neu (Autosave läuft weiter, während ein Konflikt offen ist).
- [x] **A7** 🟠 Schwache Verschlüsselung: CryptoJS-Passphrase-Modus = MD5, 1 Iteration (`crypto-helper.js`). Ersetzen durch WebCrypto (PBKDF2 ≥ 200k + AES-GCM) – mit Migration der bestehenden Cloud-Daten!
- [x] **A9** 🔴 Firestore-Dokumente dürfen max. 1 MB groß sein; die ganze DB liegt verschlüsselt (≈ +37 %) in EINEM Dokument. Schätzung für 8 Klassen × 25 Schüler × 1 Schuljahr: ≈ 1,9 MB → Sync scheitert im Laufe des Schuljahres. Fix: vor dem Verschlüsseln komprimieren (`CompressionStream('gzip')`, ~10×), zusammen mit A7 als neues Format v2 (Kennung im Dokument, alte Daten weiter lesbar). Zusätzlich Größe vor dem Upload prüfen und verständlich warnen.
- [x] **A10** 🔴 **Vor dem Live-Gang:** Andere Lehrkräfte nutzen die App bereits. Nach dem Update fehlt deren Daten `syncSettings.syncedLocalModified` → jedes Gerät zeigt einmal den Konflikt-Dialog, und Fremdnutzer wissen nicht, was sie wählen sollen. Übernahme in `migrateDB()`: Alt-Stand gilt als synchron, wenn `lastModified === lastSyncedCloudTimestamp` (Gerät hat zuletzt heruntergeladen) oder `0 ≤ lastModified − lastSyncedCloudTimestamp < 10 s` (altes `saveDB(true)` direkt nach dem Upload). Sonst bleibt „lokal geändert“ (sicherer Fall). Mit Tests für beide Fälle.
- [x] **A8** 🟠 Konflikterkennung vergleicht Uhrzeiten verschiedener Geräte (`Date.now()`); Firestore-Schreiben ohne Transaktion.

## B. Noten

> Behoben. Tests: `tests/grades-ui.test.js`. Noteneingabe: „2,5“ → 2.5; „2-“/„2+“ bleiben als Tendenz stehen und zählen als 2 (Wunsch des Nutzers); Text wie „+“ bleibt stehen und zählt nicht; Zahlen außerhalb 1–6 werden abgelehnt. CSV-Spalten jetzt „Schularbeiten;Sonstige;Gesamtnote“ wie die Gewichtung.

- [x] **B1** 🔴 `saveGradeFromForm` / `deleteGradeFromForm` (~Z. 3453, 3475) greifen auf `#view-overview` zu, das es nicht gibt → TypeError, Listen werden nicht aktualisiert, danach kann die falsche Note bearbeitet werden.
- [x] **B2** 🔴 „2,5“ wird als 2.0 gespeichert (`parseFloat` ohne Komma-Ersetzung, ~Z. 3437). Ebenso „2-“ → 2.0.
- [x] **B3** 🟠 Drei verschiedene Durchschnitte: Liste (gewichtet, `calculateStudentAverage`) vs. Schülerdetail ~Z. 1925, Sitzplan ~Z. 2804, Klassenkarte ~Z. 1019 (alle ungewichtet). Alles über `calculateStudentAverage`.
- [x] **B4** 🟠 CSV-Export ~Z. 2406: „Schriftlich“ = schularbeit+test, Gewichtung = schularbeit+klausur. Notentypen zentral definieren.
- [x] **B5** 🟠 Gewichtung nicht auf 0–100 begrenzt (~Z. 1108) → 150 % ergibt Schnitt < 1.
- [x] **B6** 🟠 Feld-Chaos `label` vs. `note` bei Noten: `addGradeEntry` schreibt `label`, Übersicht liest `note` (~Z. 1970 / 1253). `addGradeEntry` ist außerdem toter Code (Formular-IDs `new-grade-*` existieren nicht).
- [x] **B7** 🟢 `g.note ?? …` zeigt bei leerer Bemerkung einen leeren Titel statt des Typs (~Z. 3343) → `||`.

## C. Schüler & Klassen

> Behoben. Tests: `tests/students.test.js`. Klasse löschen entfernt jetzt auch ihre Stunden im Stundenplan (die Rückfrage nennt die Anzahl). Warnschwelle 0 = Warnung aus. Übersicht Anwesenheit: F / E / Z (zu spät). Import aus Excel: Spalten Vorname | Nachname.

- [x] **C1** 🔴 Löschen trifft den falschen Eintrag bei Anmerkungen/Anwesenheit/Mitarbeit (~Z. 1987, 2016, 2060): Index aus sortierter Kopie wird auf das unsortierte Original angewendet.
- [x] **C2** 🔴 Schüler mit nur einem Namen (Import „Max“) → `AVATAR_COLORS[NaN]` → ganze Schülerliste stürzt ab (~Z. 1665, 1831). Import trennt außerdem nicht an Tabs (Excel).
- [x] **C3** 🟠 `renderClasses()` existiert nicht (~Z. 1138) → ReferenceError nach jedem Speichern einer Klasse.
- [x] **C4** 🟠 Klasse löschen: zugehörige Stunden bleiben verwaist, Ansicht bleibt auf gelöschter Klasse stehen (`deleteGroup`).
- [x] **C5** 🟠 Hausaufgaben-Spalte umbenennen entkoppelt alle Einträge (~Z. 1605: nur `date` geändert, nicht `note`).
- [x] **C6** 🟠 Schülerakten-Export schreibt „undefined“ (~~`g.label`~~ in Block B erledigt, `a.label`, `n.label`) und stürzt bei Einträgen ohne `date` ab (~Z. 2152–2191).
- [x] **C7** 🟢 Zähler in der Schülerliste veralten nach `deleteAttendance`/`deleteParticipation`.
- [x] **C8** 🟢 „zu spät“ erscheint in der Übersicht als leere Zelle; „F“ tippen überschreibt es (~Z. 1476).
- [x] **C9** 🟢 Warnschwellen lassen sich nicht auf 0 setzen (`parseInt(...) || 3`, ~Z. 2369).
- [x] **C10** 🟢 Dashboard-Warnung „Hausaufgaben“ öffnet Tab `notes` statt `homework` (~Z. 3902).

## D. Stundenplan

> Behoben. Tests: `tests/timetable.test.js`. Zweiwöchige Stunden speichern jetzt ein Startdatum (`startDate`) statt der KW; alte Daten werden beim Laden auf den Rhythmus von 2026 umgerechnet. Eine einmalige Stunde (Vertretung) ersetzt an ihrem Tag die regelmäßige Stunde im selben Platz. Blöcke mit Stunden lassen sich nicht löschen. Schon früher durch D4 verrutschte Stunden lassen sich nicht automatisch zurückschieben, die muss man bei Bedarf von Hand korrigieren.

- [x] **D1** 🔴 A/B-Woche über `Kalenderwoche % 2` (~Z. 275, 654, 2510). 2026 hat KW 53 → **ab 04.01.2027 sind alle zweiwöchigen Stunden vertauscht.** Parität über Wochen seit festem Referenz-Montag berechnen.
- [x] **D2** 🔴 Einmalige Stunde bekommt den Montag der Woche statt des gewählten Tages (~Z. 578–594) → unsichtbar, nicht mehr lösch-/editierbar, blockiert den Block.
- [x] **D3** 🔴 Überschneidungsprüfung ignoriert Datum und A/B-Woche (~Z. 555) → Vertretung sperrt Block für immer; A- und B-Woche im selben Block unmöglich.
- [x] **D4** 🔴 Zeitblock löschen nummeriert Blöcke neu, Stunden behalten alte Nummer → alles rutscht (~Z. 2356).
- [x] **D5** 🟠 `getBlocks()` gibt die Konstante `DEFAULT_BLOCKS` selbst zurück → Einstellungen „Abbrechen“ verwirft nichts (~Z. 87).
- [x] **D6** 🟠 Stunde auf anderen Wochentag verschieben → alte Notizen/HA (`lessonData[slotId_Datum]`) nicht mehr erreichbar.
- [x] **D7** 🟢 Titel zeigt alten Fachnamen nach Umbenennen der Klasse (~Z. 725).
- [x] **D8** 🟢 Bei > 6 Blöcken wird der Plan abgeschnitten (`overflow:hidden`, ~Z. 227).
- [x] **D9** 🟢 Nicht per „+“ übernommene HA/Test-Eingaben gehen beim Speichern still verloren (~Z. 898).
- [x] **D10** 🟢 `new Date('YYYY-MM-DD')` wird als UTC geparst (~Z. 177, 2627) – in AT/DE harmlos.

## E. Sitzplan

- [x] **E1** 🟠 „Sitzplan öffnen“ zeigt während laufender Stunde die falsche Klasse (`initSeatingPlan` überschreibt gewählte Gruppe).
- [x] **E2** 🟠 Datum bleibt über Nacht stehen (App offen) → Einträge landen am Vortag (~Z. 2521).
- [x] **E3** 🟠 Lehrerpult springt beim Ziehen eine Spalte nach rechts (~Z. 3270).
- [x] **E4** 🟠 „Hinweis für nächste Stunde“ ignoriert A/B-Woche; Entfernen sucht anders als Eintragen; nur Vorname → zwei „Anna“ kollidieren (~Z. 3108–3164).
- [x] **E5** 🟠 `currentGradeFormCtx` wird nach Schließen nicht zurückgesetzt → altes Modal öffnet sich später erneut.
- [x] **E6** 🟢 Zufallsauswahl: Doppelklick startet zwei Animationen; Gruppenbildung mischt ungleichmäßig, letzte Gruppe kann 1 Person haben.

## F. Sicherheit (XSS)

- [x] **F1** 🟠 `escHtml` escaped keine `'` und `"` → Spaltennamen wie „Peter's Test“ zerstören `onclick`-Handler; mit präparierten Namen läuft fremdes JavaScript. Außerdem ungeschützt: `g.value` (~Z. 1952, 3347), `participation.value` (~Z. 2865), `desc` (~Z. 2058). Über Import/Sync können solche Werte auf andere Geräte kommen.
- [x] **F2** 🟠 (Regression aus F1, beim Testen mit echten Daten aufgefallen) Sitzplan: Die Mitarbeit-Markierung zeigte den Quelltext `<span style="color:var(--success)">+</span>` statt eines farbigen „+“, weil das fertige HTML aus `valLabels` zusätzlich durch `escHtml` lief. Jetzt wird nur ein unbekannter Rohwert escaped. Test: `tests/seating.test.js`.

## G. PWA, Oberfläche, Aufräumen

- [x] **G1** 🟠 Versionsnummern an drei Stellen von Hand → jetzt `npm run bump` + Test `tests/pwa-cache.test.js`.
- [x] **G2** 🟠 `index.html` wird cache-first ausgeliefert → Updates nur über neue SW-Version. Besser: Navigation network-first mit Cache-Fallback.
- [x] **G3** 🟠 Undefinierte CSS-Variablen: `--border-color`, `--radius`, `--bg-hover`, `--accent-rgb`, `--success-soft`, `--warning-soft`.
- [x] **G4** 🟠 Zoom gesperrt (`user-scalable=no`, `touch-action`) – Barrierefreiheit.
- [x] **G5** 🟠 iOS-Icon ist SVG (wird nicht unterstützt) → PNG 180×180. Manifest: PNG 192/512, Farben/Namen angleichen.
- [x] **G6** 🟢 Timer zählt Ticks statt Uhrzeit → geht nach, wenn iPad gesperrt war (~Z. 3948).
- [x] **G7** 🟢 Escape schließt nicht alle Modals; Icon-Buttons ohne `aria-label`.
- [x] **G8** 🟢 `tools.js` ist toter Code (Duplikat, nirgends eingebunden) → löschen. `app.js.bak` löschen.
- [x] **G9** 🟠 (in der Generalprobe aufgefallen: endloser Lade-Kreisel, DevTools-„Offline“ wirkungslos) SW-`fetch` fängt auch POST/Fremd-Domains ab; `forceAppUpdate` wartet nicht auf `caches.delete`.
- [x] **G10** 🟢 Kommentar „HIER BITTE DEINE E-MAIL-ADRESSE EINTRAGEN“ in index.html ~Z. 949.
- [x] **G11** 🟢 `server.js`: Pfadprüfung per `startsWith` unsauber, liefert `.git/` aus (nur Dev-Server).
- [x] **G12** 🔴 `loadDB()` verschluckt JSON-Fehler und startet mit leerer DB → nächstes Speichern überschreibt die kaputten (evtl. rettbaren) Daten.
- [x] **G13** 🟠 (bei G7 aufgefallen) Tippen neben das Stunden-Fenster (`closeModalOnOverlay`) schließt es **ohne** zu speichern: eingetippte Notizen/„Was wurde behandelt“ sind weg. „Schließen“ und Escape speichern (`saveLessonDataAndClose`). Entweder beim Tippen daneben auch speichern oder gar nicht schließen.

## H. Design & Funktionen (Review mit Beispieldaten, 24.09.2026)

> Zielgruppe: Lehrkräfte in **Deutschland**, Noten 1–6, Begriff **„Klassenarbeit“**. Die Reihenfolge entspricht der Priorität des Autors.

- [x] **H1** 🔴 **Datenschutz im Unterricht:** Der Sitzplan zeigt bei jedem Schüler groß und farbig den Notenschnitt. Wenn das iPad am Pult liegt oder projiziert wird, sieht die Klasse alle Noten. Noten standardmäßig ausblenden und per Augen-Knopf einblenden (Zustand nicht speichern, bei jedem Öffnen wieder aus).
- [x] **H2** 🟠 **Handy: Tagesansicht Stundenplan.** Heute ist nur ein 5-Tage-Raster sichtbar, in dem man nur 2 Tage sieht; der Rest ist seitlich verschoben, die KW-Anzeige abgeschnitten, die Seite scrollt horizontal. Unter ~700 px eine Tagesansicht: heute groß, Wischen/Pfeile zum nächsten Tag.
- [x] **H3** 🟠 **„Heute“-Dashboard** statt reiner Warnliste (mit Beispieldaten 35 Warnungen untereinander → wird ignoriert). Oben: Stunden heute, nächste Stunde mit ihren Notizen/Hinweisen („… hat letzte Stunde gefehlt“), fällige Hausaufgaben/Tests. Darunter die Warnungen **nach Klasse gruppiert**, zusammenklappbar.
- [x] **H4** 🟠 **Stundenplan-Kacheln (iPad/Desktop):** Kacheln nutzen die volle Breite statt quadratisch (heute leere Fläche rechts/oben); Klasse groß, Fach klein mit „…“ statt hartem Abschneiden („Mathemat“); laufende Stunde hervorheben („läuft noch 23 min“), nächste Stunde dezent; Status-Symbole für Inhalt / Hausaufgabe / Test angekündigt.
- [x] **H5** 🟠 **Notentabelle: Spaltentyp sichtbar machen.** Der Kopf zeigt nur Datum und Titel; ob eine Spalte Klassenarbeit (gewichtet) oder Mitarbeit ist, sieht man nicht. Mitarbeit-Spalten haben gar keinen Titel. Typ-Markierung (Farbe/Kürzel) im Spaltenkopf; ohne Titel den Typ anzeigen.
- [x] **H6** 🟠 **Begriffe für Deutschland:** „Schularbeit“ → „Klassenarbeit“ in allen Texten (index.html, app.js, Exporte). Der interne Typ-Schlüssel `schularbeit` bleibt (Datenmodell!), nur die Anzeige ändert sich.
- [x] **H7** 🟠 **Notenskala pro Klasse:** Es gibt **keine** app-weite Einstellung. Jede Klasse hat ihre eigene Skala (`group.gradeScale`), Standard für neue und bestehende Klassen ist 1–6. Wählbar im Klassen-Dialog: **1–6** (Standard) oder **0–15 Punkte** (Oberstufe, **gewünscht**). Eine Oberstufenklasse ändert nichts an den anderen Klassen.
  Zu beachten: Bei Punkten gilt „höher = besser“. Das betrifft Eingabeprüfung (`parseGradeInput`, 0–15 ganzzahlig, keine Tendenzen), Farben (`gradeColor`), Warnschwelle „schlechter Schnitt“ (eigene Schwelle für Punkte, z. B. < 5 Punkte), Anzeige des Schnitts (Punkte mit 1 Nachkomma) und Exporte. Dashboard und Sitzplan zeigen Klassen mit verschiedenen Skalen gemischt an, deshalb muss jede Stelle die Skala der jeweiligen Klasse verwenden. Skalenwechsel bei einer Klasse, die schon Noten hat: nur mit Warnung, die Noten werden nicht umgerechnet.
- [x] **H8** 🟢 **„Zu spät“ in der Schnellbewertung** im Sitzplan (gibt es bisher nur in der Schülerakte).
- [x] **H9** 🟢 **Keine Wochenenden:** Die Datumsleiste im Sitzplan zeigt Samstag/Sonntag. Überall nur Mo–Fr (Datumsleiste, Sprünge „nächster Tag“).
- [x] **H10** 🟢 **Symbole vereinheitlichen.** Emojis (🎓📅🙋…) sind heute mit Linien-Icons gemischt. Vorschlag: überall die Linien-Icons wie im Menü, keine Emojis in Knöpfen/Reitern; Ausnahme 😊😐☹️ bei der Mitarbeit, weil sie dort die Information selbst sind.
- [x] **H11** 🟢 Schülerliste: Zähler „MITARBEIT 1 0 0 · FEHLT 3 0“ sind nur über die Farben verständlich. Kleine Erklärung beim Antippen/Darüberfahren (niedrige Priorität, Farben bleiben).
- [x] **H12** 🟠 (bei H11 aufgefallen) Schülerliste: Die Zeile bricht nicht um. Auf dem iPad hochkant (768 px) liegen „Fehlt“-Zähler und Notenschnitt rechts außerhalb des Bildes (Zähler endet bei ~860 px), auf dem Handy auch „Mitarbeit“. Zähler/Schnitt unter den Namen umbrechen oder verkleinern.
- [x] **H13** 🟢 (bei H12 aufgefallen) Sitzplan auf schmalen Bildschirmen: `#main-content` behält dort die 800 px Mindestbreite, weil die Werkzeugleiste (Timer, Stoppuhr, Zufall, Gruppen) nicht umbricht; auf dem iPad hochkant muss man seitlich schieben. Werkzeugleiste umbrechen lassen, dann `#view-seating` in die `:has`-Ausnahme aufnehmen.

## I. Design-Review (alle Ansichten, 24.09.2026)

> Mit Beispieldaten (4 Klassen, eine davon 0–15 Punkte) bei 375, 768, 1024 und 1440 px, dunkel und hell durchgeklickt.

- [x] **I1** 🔴 **Dashboard scrollt nicht.** `.view` hat `overflow:hidden`, `#dashboard-content` (`.view-content`, index.html ~Z. 121) hat gar kein CSS. Aufgeklappte Warngruppe → Warnungen darunter unerreichbar; auf dem Handy fehlen schon zugeklappt die letzten Klassen (Q1, 9c).
- [x] **I2** 🔴 **Klassenkarten schneiden Inhalt ab** (`.subject-group-card`: `aspect-ratio:1/1` + `overflow:hidden`, style.css ~Z. 234). Alle Karten verlieren unten ~10 px, bei zweizeiligem Namen („Q1 Leistungskurs“) ist der Sitzplan-Knopf halb verdeckt. Auf dem Handy (`1fr`) werden die Karten ~340 px hoch mit großem Loch in der Mitte. *Nachtrag (auf dem iPad aufgefallen): Ohne `overflow:hidden` lief die starre Zahlenreihe („NOTEN“) bei breiterer Systemschrift rechts aus der Karte; jetzt drei gleich breite Spalten (`minmax(0,1fr)`), lange Beschriftungen brechen um.*
- [x] **I3** 🟢 **Jeder Klick in den Inhalt klappte die Seitenleiste zu** (`onclick="collapseSidebar()"` an `#main-content`), der Inhalt sprang dabei nach links. Jetzt nur noch per ☰; zwischen 601 und 1023 px (iPad hochkant) startet die Leiste zugeklappt (`applyInitialSidebar`). Auf dem Handy bleibt die Leiste oben auch zugeklappt volle Breite. *(Korrektur zum Review: Der erste Tipp ging nicht verloren, der Eindruck entstand, weil gerade noch ein Fenster zuging. Deshalb 🟢 statt 🔴.)*
- [x] **I4** 🟠 **Heller Modus: zu wenig Kontrast** bei farbigen Klassennamen und Notenfarben (Orange, Hellgrün, Gelbgrün, z. B. „Q1“, „2.9“, „10.0“) auf hellblauem Grund (geschätzt ~2:1). → Heller Modus: eigene Notenfarben (700er-Töne, ≥ 3,9:1 statt 1,5–2,9:1). Klassenfarben als Text (Kachel, Klassenkarte) per `color-mix` 50 % mit Schwarz, dazu keine Transparenz in der Fachzeile: für alle 14 Klassenfarben auf allen hellen Hintergründen ≥ 4,8:1 (vorher 1,4:1). Kachel setzt `color` nicht mehr inline, nur `--lesson-color`. *Rest (fest eingetragene Farben, Statusfarben) in J2 erledigt.*
- [x] **I5** 🟠 **Gestrichelter Rahmen doppelt belegt:** markiert „als Nächstes“ und (Desktop, Hover) „hier Stunde anlegen (+)“. Bei roter Klassenfarbe (9c) wirkt die nächste Stunde wie ein Fehler; ebenso der rote Balken der Dashboard-Karte „Nächste Stunde“. → Nächste Stunde: dezenter durchgezogener Rahmen (halbe Deckkraft), gestrichelt heißt nur noch „hier anlegen“. Dashboard „Nächste Stunde“: Farbbalken links wie bei den übrigen Stunden statt oben.
- [x] **I6** 🟠 **iPad hochkant, Stundenplan:** Offene Seitenleiste nimmt ~160 px, Kacheln zeigen nur „Mathema…“ / „Q1 Lei…“, Raum fehlt ganz. Schon bei 1024 px wird der Raum abgeschnitten („Informatik · R …“), obwohl die Kachel darunter leer ist. → Raum steht in ganzen Stunden in eigener Zeile unter dem Fach, in halben weiter „Fach · Raum“. Mit der zugeklappten Leiste (I3) passen bei 768 px Fach und Raum ganz; lange Klassennamen enden weiter mit „…“.
- [x] **I7** 🟠 **Handy/iPad, Klassenansicht:** Reiterleiste abgeschnitten („Anwesenheit“, „Hausaufgaben“ unsichtbar, kein Hinweis aufs Wischen). Notentabelle: Namensspalte ~60 % breit, auf dem Handy nur eine (angeschnittene) Notenspalte sichtbar. → Reiter brechen in zwei Zeilen um. Namensspalte per Klasse (`.ov-name-col`) statt Inline-Stil; unter 520 px Tabellenbreite werden Namen auf 110 px gekürzt (voller Name als Tooltip), Handy: Namensspalte 131 statt ~210 px.
- [x] **I8** 🟠 **Summen in der Klassenansicht:** Hausaufgaben: alle Nullen rot. Anwesenheit: „Summe“ zählt F und E, aber nicht Z, ohne Erklärung; „E“ ist dort weiß, in der Schülerliste grün. → Anwesenheit: Spalte „Fehltage“ mit Erklärung (F + E, ohne Z), 0 grau, „E“ grün wie in der Schülerliste. Hausaufgaben: Spalte „Vergessen“, nur Werte > 0 rot.
- [x] **I9** 🟠 **Schnellbewertungs-Fenster:** Neben „Bisherige Noten“ steht ein „0:0:0“-Kästchen, das ist aber die Mitarbeit-Bilanz. → Bilanz steht als „Mitarbeit bisher: 😊 n · 😐 n · ☹️ n“ unter den Smileys; neben „Bisherige Noten“ nichts mehr.
- [x] **I10** 🟠 **„Zum Profil“ verliert den Reiter:** Aus „Hausaufgaben“ ein Profil öffnen und schließen → Klassenansicht steht auf „Schüler“. → `jumpToStudentDetailFromSeating` öffnet die Klasse nur neu, wenn man nicht schon in ihrer Klassenansicht ist; der Reiter bleibt.
- [x] **I11** 🟠 **Kein Menüpunkt aktiv**, wenn man eine Klasse aus dem Stunden-Fenster öffnet (`openClassOverview` → `openGroupStudents` ohne `switchView('classes')`). → `switchView("students")` markiert „Klassen“.
- [x] **I12** 🟢 **Namensformat wechselt:** „Anna Müller“ (Schüler, Noten, Schnellbewertung) vs. „Müller, Anna“ (Mitarbeit, Anwesenheit, HA, Profil). → Listen und alle Tabellen über `studentListName(s)`: folgt der Einstellung „Schüler sortieren nach“ (Vorname → „Anna Müller“, Nachname → „Müller, Anna“), ohne Nachnamen kein „, Max“. Überschriften (Profil, Schnellbewertung) immer „Vorname Nachname“.
- [x] **I13** 🟢 **Rangfolge Klasse/Fach wechselt:** Stundenplan und Klassenkarten zeigen Klasse groß, Fach klein; Klassenansicht und Stunden-Fenster umgekehrt („Mathematik / Klasse 7b“, „Physik 10a“). → Klassenansicht: Titel = Klasse, Unterzeile = Fach · Schuljahr. Stunden-Fenster: Titel = Klasse, Unterzeile beginnt mit dem Fach. *Dabei aufgefallen und behoben: Datumsformat war `de-AT`, im Stunden-Fenster hätte im Januar „Jänner“ gestanden; jetzt überall `de-DE`.*
- [x] **I14** 🟢 **Texte:** Dezimalpunkt statt Komma („2.9“, „10.0“, „steht aktuell auf 4.25“); „hat 1-mal die Hausaufgaben vergessen“; „3 Note(n)“. → Anzeige mit Komma über `formatGradeAverage` und neu `gradeText` (Schnitte, Notenwerte in Tabelle/Profil/Sitzplan, Warnungen, Schülerakte). Gespeichert wird weiter mit Punkt. „einmal“ statt „1-mal“, „eine unentschuldigte Fehlzeit“, „1 Note“/„3 Noten“, „… Punkten“.
- [x] **I15** 🟢 **„Heute“ doppelt im Dashboard** (Seitentitel und Abschnitt direkt darunter); in der Navigation heißt es „Dashboard“. → Kopf heißt „Dashboard“ wie der Menüpunkt; „Heute“ nur noch als Abschnitt.
- [x] **I16** 🟢 **„Mitarbeit“ doppeldeutig:** Notentyp „Mitarbeit (MA)“ und Smiley-Reiter „Mitarbeit“ stehen im Profil nebeneinander. → Notentyp heißt in der Anzeige „Mitarbeitsnote“ (neu `gradeTypeName`). `gradeTypeLabel` bleibt unverändert, weil es Noten ohne Titel ihrer Spalte zuordnet (Umbenennen hätte bestehende Noten aus der Tabelle geworfen).
- [x] **I17** 🟢 **Mehrere gleich starke Hauptknöpfe:** Stundenplan „Heute“ und KW-Pille identisch; Klassenkopf „+ Neue Spalte“ + „Zum Sitzplan“; Profil „+ Neue Note eintragen“ + „Fertig“; Stunden-Fenster „Notenübersicht“ + „Speichern & Schließen“. → Gefüllt ist je Bereich nur noch der Hauptknopf: KW-Anzeige dezent (nur „Heute“ gefüllt), „Zum Sitzplan“, „Fertig“ (Profil) und „Notenübersicht“ (Stunden-Fenster) als Nebenknöpfe.
- [x] **I18** 🟢 **Stunden-Fenster:** Kasten „Fehlend / Entschuldigt“ läuft bis an den Rand (anders als alle anderen Abschnitte), sitzt zwischen HA und Test und unterscheidet unentschuldigt nicht von entschuldigt. → „Heute fehlen“ ist ein normaler Abschnitt ganz oben im Stunden-Fenster (vor „Unterrichtsinhalt“), je Name „unentschuldigt“ (rot) oder „entschuldigt“ (grau).
- [x] **I19** 🟢 **Handy-Navigation:** aktive Pille höher als die Leiste; ☰ neben „Planer“ ohne Zweck; Trennlinie unter dem Logo endet auf halber Breite. → Inline-`display:flex` an `.sidebar-header` entfernt (überstimmte `display:none`), Fußbereich auf dem Handy ohne feste 80 px: Leiste 57 px hoch, Pille 40 px.
- [x] **I20** 🟢 **Sitzplan:** Tag-Kürzel (DI/MI) in der Datumsleiste winzig; Timer-Knöpfe „−/+“ klein; auf dem Handy abgekürzte Namen („Quen…“) trotz viel leerem Platz darüber/darunter; „Zufall“ im hellen Modus weiß, „Gruppen“ nicht. → Tag-Kürzel 10 px, Timer „−/+“ als echte Zeichen in 18 px mit `aria-label`, winzige Karten mit 2 px statt ~5 px Abstand („Quentin“ passt, „Valentina“ noch „Valenti…“). *„Zufall“ weiß war ein Fehlalarm: Die Maus stand darauf (Hover).*
- [x] **I21** 🟢 **Toasts** („Einstellungen gespeichert“) verdecken unten rechts Knöpfe („Gruppen“) und Stundenkacheln. → Toasts oben mittig unter dem Kopf, `pointer-events:none` (Klicks gehen durch), `aria-live="polite"`.
- [x] **I22** 🟢 **Einstellungen:** gewählte Akzentfarbe nicht markiert; Versionsnummer fehlt; „Exportieren“ (Backup!) ganz unten; unklar, was sofort wirkt und was erst mit „Speichern“; Beschriftungen gemischt („Theme“, „Google Login“, „App Version“, „Klicke hier“ auf einem Knopf). → Standard-Akzent Indigo als Farbe wählbar (vorher fehlte er, deshalb war nichts markiert). App-Version sichtbar („Version N“ aus `app.js?v=N`). „Datenverwaltung“ direkt nach „Anzeige“ mit Hinweis zur Sicherung. Texte: „Darstellung“, „Anmelden“, „Mit Google anmelden“, „App-Version“, kein „Klicke hier“. Fußzeile erklärt, was erst mit „Speichern“ gilt.
- [x] **I23** 🟢 **„Stunde hinzufügen“:** Von 14 Farbkreisen rutscht einer allein in eine zweite Zeile; Standard „Freie Eingabe“ statt einer Klasse; Feld „Wiederholung?“ mit Fragezeichen. → Farben in zwei Reihen à 7 (auch im Klassen-Dialog), „Wiederholung“ ohne Fragezeichen. *Standard „Freie Eingabe“ bewusst gelassen: Eine vorausgewählte Klasse wäre oft die falsche, und die Verknüpfung ist optional.*

## J. Nachzügler aus dem Design-Review (25.09.2026)

- [x] **J1** 🟢 Schülerliste: Der Notenschnitt rechts sollte leicht getönt hinterlegt sein, bleibt aber durchsichtig. `hexToRgba(gradeColor(…))` bekommt `var(--grade-3)` statt einer Hex-Farbe und liefert `rgba(10,NaN,NaN,0.15)`, das der Browser verwirft. → Hintergrund per CSS aus der Notenfarbe selbst (`color-mix(in srgb, currentColor 15%, transparent)`), `hexToRgba(gradeColor(…))` entfernt.
- [x] **J2** 🟠 Heller Modus, Rest aus I4: fest eingetragene Farben (`#f59e0b`/`#ef4444`: HA-/Test-Symbole in Kacheln, Dashboard-Badges, „Nächste Stunde“) und die Statusfarben `--success`/`--warning`/`--danger` (Toasts, Knöpfe, „Keine HA“) haben auf hellem Grund nur 1,7–3:1 Kontrast; `--text-muted` (graue Nebenschrift) 2,6:1. → Heller Modus: `--success #166534`, `--warning #92400e`, `--danger #b91c1c` (≥ 5:1 auf allen hellen Hintergründen), `--text-muted #64748b` (4,8:1 auf Weiß). Fest eingetragene `#f59e0b`/`#ef4444`/`#94a3b8` in Kachel-Symbolen, Dashboard-Badges und „Nächste Stunde“ durch diese Variablen ersetzt. Dunkler Modus unverändert.

## K. Review 25.09.2026: Datenverlust & Sync

> Behoben (v215). Tests: `tests/block-k.test.js`, Sync-Fälle in `tests/sync.test.js`. K7: Das Master-Passwort bleibt jetzt dauerhaft auf dem Gerät (`localStorage`, Entscheidung des Autors: die Schülerdaten liegen dort ohnehin unverschlüsselt), bis zum Abmelden oder einem falschen Passwort. Dazu ein roter Punkt am Menüpunkt „Einstellungen“ plus Hinweis beim Start, solange angemeldet, aber ohne Passwort.
>
> Viertes Review: Code in vier Bereichen (Sync, Stundenplan, Klassen/Noten, Sitzplan/Fenster) plus Durchklicken mit Beispieldaten bei 375/1024 px, dunkel und hell. „Test“ = mit Vitest nachgestellt. Zeilennummern Stand `5f261aa`.

- [x] **K1** 🔴 **„Alles löschen“ während eines Uploads leert später die Cloud** (`triggerSyncInternal` → `markSynced` nach dem `await`; `decideSync` prüft `localIsEmpty` nur bei geänderter Cloud). Ablauf: Eingabe → Sync läuft → „Alles löschen“ → `markSynced` schreibt den Sync-Stand in die **neue, leere** `db` → nächster Sync = `upload` der leeren DB → andere Geräte laden „leer“ herunter. *Test.* → Vor `markSynced` prüfen, ob `db` noch dasselbe Objekt ist; `decideSync` lädt bei leerer lokaler DB nie hoch, wenn die Cloud Daten hat (gilt auch für `resolveConflict`).
- [x] **K2** 🔴 **Stunden-Fenster: drei Knöpfe verwerfen eingetippte Notizen** (Rest von G13): Stift (`openEditLesson` ~Z. 788), „Sitzplan öffnen“ (`openSeatingForGroup` ~Z. 254), „Notenübersicht“ (`openClassOverviewFromLesson` ~Z. 4077) schließen per `closeModal('modal-lesson')`. Inhalt/Notizen tippen → Knopf → weg. *Test.* → Vorher speichern wie `saveLessonDataAndClose` (ohne Toast).
- [x] **K3** 🔴 **Spalte/Note bearbeiten löscht den Notentyp** (`openEditColumnModal`/`saveOverviewColumn` ~Z. 1889/1934, `openGradeForm`/`saveGradeFromForm` ~Z. 3967/4029): Steht der Typ nicht in der Auswahl (Spalten-Dialog kennt nur „test“/„schularbeit“, Notenformular kein Alt-„klausur“), liest das Feld `''` und speichert das. Spalte „Mündlich“ umbenennen → alle Noten `type:''`; alte „klausur“-Note nur öffnen+speichern → zählt nicht mehr als KA (Schnitt 1,8 → 3,0). *Test.* → Unbekannten Typ als Option ergänzen bzw. alten Typ behalten.
- [x] **K4** 🔴 **Notentabelle: zwei Noten am selben Tag ohne Titel = eine Spalte** (`renderOverviewTable` ~Z. 1602, Schlüssel `datum_titel` ohne Typ; `updateInlineGrade` ~Z. 1774). KA von Anna + mündliche Note von Ben am 10.09. → eine KA-Spalte; Bens Zelle ändern macht seine Note zur KA. Zwei Noten eines Schülers am selben Tag → eine unsichtbar, zählt aber, Eingabe überschreibt die erste. Gleiches beim Umbenennen auf eine bestehende Spalte. *Test.* → Typ in Schlüssel + Zellsuche, gleiche Kombination beim Anlegen/Umbenennen ablehnen.
- [x] **K5** 🔴 **Anwesenheitstabelle: Tippfehler löscht Eintrag samt Grund** (`updateInlineAttendance` ~Z. 1830): „E“ mit Grund „Arztattest“, man tippt „U“ → Eintrag weg, ohne Meldung. *Test.* → Nur leeres Feld löscht; unbekannte Eingabe wie bei Noten ablehnen.
- [x] **K6** 🟠 **Kein Sync beim Zurückkommen/Wiederverbinden** (nur `saveDB`, Login, Passwort lösen aus). iPad über Nacht im Hintergrund, abends am Laptop geändert, morgens Fehlzeit eintragen → Konflikt-Dialog statt stillem Pull. Offline-Eingaben gehen erst mit der nächsten Eingabe hoch. *Test.* → `triggerSyncInternal()` bei `visibilitychange` (sichtbar) und `online`.
- [x] **K7** 🟠 **Nach Kaltstart synct die App still nicht**, bis das Master-Passwort neu eingegeben ist (nur `sessionStorage`, `initSync` ~Z. 4836). Kein Hinweis außerhalb der Einstellungen → Konflikte wie K6. *Nur Code; auf dem iPad prüfen, ob iOS `sessionStorage` der Home-Bildschirm-App beim Beenden leert.* → Sichtbarer Hinweis / Abfrage beim Start, oder bewusst dauerhaft speichern.
- [x] **K8** 🟠 **Tippfehler beim ersten Master-Passwort sperrt die Cloud** (`updateMasterPassword` ~Z. 4993): Cloud leer, `onchange` lädt sofort mit dem vertippten Passwort hoch; danach „Falsches Master-Passwort“ auf allen Geräten, kein Weg zum Zurücksetzen. *Nur Code.* → Beim ersten Festlegen zweimal abfragen.
- [x] **K9** 🟠 **Import ersetzt alles ohne Rückfrage**, und das Backup bringt alte `syncSettings` mit → 3 s später Konflikt-Dialog, dessen Hauptknopf den Import wieder verwirft (`importData` ~Z. 2900). *Test.* → Rückfrage („ersetzt N Klassen …“), `syncSettings` beim Import verwerfen, Import zählt als Nutzeränderung.
- [x] **K10** 🟠 **Speicher voll → Eingabe still verloren** (`persistDB` ~Z. 198, `setItem` ohne try/catch): Handler bricht ab, Änderung nur im Arbeitsspeicher. *Test (Wurf).* → Abfangen, deutlich melden („Nicht gespeichert – bitte exportieren“), alte `lehrerapp_v3_defekt_*` zum Aufräumen anbieten.
- [x] **K11** 🟠 **Konflikt-Dialog:** grüner Hauptknopf „Cloud-Version laden (lokale Änderungen verwerfen)“ wirkt wie der empfohlene Weg; „Neuere Version in der Cloud“ stimmt nicht (Uhren nicht vergleichbar) (index.html ~Z. 1128/1136). → „Version in der Cloud“; Hauptknopf „Sicherung exportieren und Cloud laden“, die anderen neutral.
- [x] **K12** 🟠 **„App jetzt aktualisieren“ offline** löscht Service Worker + Caches und lädt neu → Browser-Fehlerseite, bis wieder WLAN da ist (`forceAppUpdate` ~Z. 4439). *Nur Code.* → Offline abbrechen mit Hinweis.
- [x] **K13** 🟢 **Export zählt als Datenänderung** (`exportData` ~Z. 2894: `lastBackupTimestamp` per `saveDB()`) → Upload, evtl. Konflikt auf anderen Geräten. Der Wert wird nirgends gelesen (Backup-Erinnerung in 7d114a7 bewusst entfernt). *Test.* → `persistDB()` oder Feld weglassen.
- [x] **K14** 🟢 Alte iPads (< iOS 16.4, kein `DecompressionStream`) melden „neuere App-Version, bitte aktualisieren“ – hilft dort nicht (crypto-helper.js ~Z. 104). → Eigene Meldung „Gerät zu alt für den Cloud-Sync“.
- [x] **K15** 🟢 `clearAllData` lässt Rettungskopien `lehrerapp_v3_defekt_*` (Schülerdaten!) auf dem Gerät. *Nur Code.*

## L. Review 25.09.2026: Noten, Anwesenheit, Klassen

> Behoben (v217). Tests: `tests/block-l.test.js`.

- [x] **L1** 🟠 **Tabellen veralten nach Schnellbewertung/Profil:** `setSeatingAbsence`, `setSeatingLate`, `setSeatingHomework`, `addParticipationSmiley` zeichnen nur den Sitzplan; `addAttendanceEntry`, `deleteAttendance`, `deleteParticipation`, `deleteCurrentStudent` nur die Schülerliste. Reiter „Anwesenheit“ → Name antippen → „Unentschuldigt“ → Tabelle zeigt weiter 0. *Test.* → Gemeinsame Auffrischung wie `refreshGradeViews`, inkl. `renderOverviewTable()`.
- [x] **L2** 🟠 **Anwesenheitsspalte mit Bezeichnung doppelt** (`renderOverviewTable` ~Z. 1706): Spalte „10.09. Wandertag“ + „F“ → zwei Spalten „10.09. Wandertag“ und „10.09.“. *Test.* → Nach Datum zusammenführen, Bezeichnung als Zusatz.
- [x] **L3** 🟠 **Fehlzeit in der Tabelle ändern pflegt den Hinweis „… hat letzte Stunde gefehlt“ nicht** (Regel 25, `updateInlineAttendance`): „F“ aus dem Sitzplan in „E“/leer ändern → Hinweis bleibt; „F“ in der Tabelle → kein Hinweis. *Test.* → `addAbsenceNote`/`removeAbsenceNote` aufrufen.
- [x] **L4** 🟠 **Hinweis bei Schülern mit nur einem Namen wird nie entfernt** (`absenceNoteText` ~Z. 3633: „ Max hat …“ mit führendem Leerzeichen, `removeAbsenceNote` vergleicht getrimmt). *Test.* → `[first,last].filter(Boolean).join(' ')`.
- [x] **L5** 🟠 **Noten-/Anwesenheitsspalten lassen sich nicht löschen** (`editOverviewColumns` wird nie aufgerufen, kein Knopf im Spalten-Dialog). Versehentliche Spalte bleibt für immer. → „Spalte löschen“ mit Rückfrage (Anzahl Einträge), per Referenz.
- [x] **L6** 🟠 **Notentabelle: Enter springt nicht nach unten.** Eine Klassenarbeit für 25 Schüler eintragen: Tab geht seitlich in die nächste Spalte, Enter tut nichts (auch „Return“ auf der iPad-Tastatur). *Browser.* → Enter/Return = nächster Schüler in derselben Spalte (Shift+Enter hoch).
- [x] **L7** 🟢 **Klasse bearbeiten dreht den Kopf der Klassenansicht um** (Rest von I13, `saveSubjectGroup` ~Z. 1455): danach „Mathe | Klasse 7b“ statt „7b | Mathe · 2026/27“. *Test.* → Wie `openGroupStudents`.
- [x] **L8** 🟢 **Schüler mit nur einem Namen (Import „Max“) nicht mehr bearbeitbar** (`saveStudent` verlangt beide Namen) → Notiz „LRS“ lässt sich nicht speichern. *Test.* → Mindestens einen Namen verlangen.
- [x] **L9** 🟢 **Vertretung erscheint als fester Tag auf der Klassenkarte** (`renderSubjectGroups` ~Z. 1331 filtert `s.recurring`, `'none'` ist truthy). *Test.* → `!isOneOffSlot(s)`.
- [x] **L10** 🟢 **Schülerakte (Export):** „Note: 2.5“ mit Punkt, bei 0–15 „Note“ statt „Punkte“, Hausaufgaben fehlen ganz (`exportCurrentStudent` ~Z. 2586, Rest von I14). *Test.* → `gradeText`, Beschriftung nach Skala, Abschnitt „Hausaufgaben vergessen“.
- [x] **L11** 🟢 **CSV-Export:** `"` im Namen wird nicht verdoppelt → Zeile zerfällt (`exportGradesCSV` ~Z. 2872). *Nur Code.*
- [x] **L12** 🟢 **Avatare in der Schülerliste:** Initialen in Akzentfarbe auf dunkler Variante derselben Farbe, ~2,5:1 (z. B. `#6366f1` auf `#312e81`), in beiden Modi (`AVATAR_COLORS`). *Browser.* → Hellere Schrift bzw. im hellen Modus helle Fläche + dunkle Schrift.

## M. Review 25.09.2026: Stundenplan, Stunden-Fenster, Dashboard

> Behoben (v218). Tests: `tests/block-m.test.js`. M6: Eine Vertretung darf jetzt eine regelmäßige Stunde an ihrem Tag ersetzen (Hinweis „ersetzt 7b an diesem Tag“); der D3-Test ist entsprechend angepasst. M7: Stunden haben optional `validFrom`/`validUntil`. Ändern (Tag, Block, Hälfte, Rhythmus) oder Löschen einer Stunde mit Einträgen aus früheren Wochen fragt „ab der Woche vom … / alle Stunden“; ohne frühere Einträge bleibt alles wie bisher. Ältere App-Versionen kennen die Felder nicht und zeigen beendete Stunden weiter an (nur Anzeige, kein Datenverlust).

- [x] **M1** 🟠 **Dashboard wird nicht neu gezeichnet** nach Speichern/„Stunde entfällt“ (`saveLessonDataAndClose`, `toggleAusfall`), nach Cloud-Übernahme (`applyCloudData`), nach Einstellungen (`saveSettings`) und nie per Timer (anders als `refreshTimetableClock`). Ausgefallene Stunde bleibt „nächste Stunde“; über Mitternacht bleibt „Heute“ stehen. *Test (Ausfall).* → Gemeinsames `refreshActiveView()`, Dashboard in den Minuten-Timer.
- [x] **M2** 🟠 *(mit K15 erledigt: `resetViewSelection()`)* **Nach Pull/Import/Löschen wird die aktive Ansicht nicht neu gezeichnet**, ungültige Auswahl bleibt (`applyCloudData` ~Z. 5078 zeichnet nur Stundenplan+Klassen; `importData`/`clearAllData` setzen `currentGroupId`/`currentSeatingGroupId` nicht zurück, Regel 10). Neues Gerät: Login → Dashboard bleibt leer. *Test.*
- [x] **M3** 🟠 **HA für freie Stunden (ohne Klasse) mit mehreren Terminen landet nirgends:** `findUpcomingLessonDates` (~Z. 941) sucht über den Fachnamen, `getIncomingItems` (~Z. 664) nur über dieselbe `slotId`. „AG Robotik“ Mo+Mi: HA für Mi erscheint weder Mi noch im Dashboard. *Test.* → Eine gemeinsame „Geschwister-Stunden“-Regel.
- [x] **M4** 🟠 **Datumsvorschläge für HA/Test bieten ausgefallene oder vertretene Stunden an** (`findUpcomingLessonDates` ~Z. 956 nur `slotOccursOn`). Eingetragene HA ist dann unsichtbar. *Test.* → Über `lessonsOnDate`, `!ausfall`.
- [x] **M5** 🟠 **HA-Schalter aus → HA bleibt in der Zielstunde „fällig“** (`getIncomingItems`/`dueItemsFor` ignorieren `hwEnabled`/`testEnabled`), dort nicht löschbar. *Test.*
- [x] **M6** 🟠 **Vertretung auf dem Platz einer regulären Stunde nicht anlegbar** („Block ist bereits belegt!“, `saveLessonSlot` ~Z. 876), obwohl `lessonsAt` das Ersetzen kann – geht nur, wenn die Vertretung älter ist als die reguläre Stunde. *Test; Designfrage, bestehender Test legt das heutige Verhalten fest.* → Einmalige Stunde darf eine reguläre überlagern (mit Hinweis „ersetzt 7b an diesem Tag“).
- [x] **M7** 🟠 **Stundenplanwechsel zum Halbjahr verändert die Vergangenheit:** Tag ändern verschiebt *alle* alten Notizen/HA auf den neuen Tag (`moveLessonData`); auf einmalig/zweiwöchentlich stellen blendet alte Notizen aus; Löschen löscht alle Notizen des Jahres, die Rückfrage sagt das nicht. *Nur Code.* → „Ab diesem Datum ändern/beenden“ (Enddatum an der Stunde); mindestens Anzahl Notizen in der Rückfrage.
- [x] **M8** 🟢 Freie Stunde: „Notenübersicht“ und „Schüler bewerten“ sichtbar, tun nichts. *Test.* → Ausblenden wie den Sitzplan-Link.
- [x] **M9** 🟢 „Schüler bewerten“ zeigt fest „Nachname, Vorname“ („, Max“ ohne Nachnamen), Rest von I12 (~Z. 4096). *Test.* → `studentListName(s)`.
- [x] **M10** 🟢 „Schüler bewerten“ → jemanden als fehlend markieren: „Heute fehlen“ im offenen Stunden-Fenster bleibt leer. *Test.*
- [x] **M11** 🟢 Tagesansicht: Sprung auf einen Samstag zeigt den **Montag davor** statt danach (`jumpToDate`/`timetableDayDate` ~Z. 404). *Test.*
- [x] **M12** 🟢 Wochenkopf über Neujahr: „KW 53 · 28.12. – 01.01. 2026“ (~Z. 428). *Test.* → Jahr vom Freitag bzw. beide Jahre.
- [x] **M13** 🟢 Stunde ohne `color` (Alt-/Fremddaten) → `hexToRgba(undefined)` wirft, ganzer Stundenplan leer (`buildTimetableCell`). *Test.* → Ersatzfarbe bzw. `migrateDB`.
- [x] **M14** 🟢 Datums-Picker (KW-Anzeige, Sitzplan-Kalender) wird nie auf das aktuelle Datum gesetzt → dasselbe Datum ein zweites Mal wählen löst kein `change` aus, nichts passiert. *Nur Code.*
- [x] **M15** 🟢 HA/Test im Stunden-Fenster per Index gelöscht (`removeItem(type, ${i})`, Regel 9). *Nur Code.*

## N. Review 25.09.2026: Sitzplan

> Behoben (v220). Tests: `tests/block-n.test.js`. Sitzplätze werden beim Zeichnen nur noch berechnet, nicht gespeichert; gespeichert wird erst, wenn jemand im Bearbeiten-Modus umordnet. Rasterbreite 2–20, Reihen 2–6. Tippflächen im Sitzplan auf Touch-Geräten 44 px (bei 375/1024 px nachgemessen, kein seitliches Scrollen).

- [x] **N1** 🟠 **Raster verkleinern verschiebt Schüler dauerhaft** – `renderSeatingPlan` (~Z. 3322) schreibt Ausweichplätze in `s.gridX/Y`. 6 → 3 → 6 Spalten: Anna sitzt woanders (und das geht in die Cloud). Mehr Schüler als Plätze → Überzählige alle auf (0,0), nach dem Vergrößern übereinander, nur einer antippbar. *Test.* → Ausweichplätze nur für die Anzeige, Warnung „Raster zu klein“.
- [x] **N2** 🟠 **Negative Spaltenzahl legt den Sitzplan lahm** (`saveSeatingGrid` ~Z. 3186): `-3` → `RangeError`, Sitzplan leer, wird synchronisiert; `0` wird still zu 10. *Test.* → 1…N erzwingen.
- [x] **N3** 🟠 **Lehrerpult verschwindet nach dem Verkleinern** (außerhalb der Fläche, nicht mehr zurückziehbar). *Test.* → Beim Zeichnen ins Raster klemmen.
- [x] **N4** 🟠 **Schüler lässt sich unter das Lehrerpult ziehen** (und umgekehrt) → Karte im Unterricht nicht antippbar (`makeDraggable` dragEnd). *Test.* → Drop ablehnen oder tauschen.
- [x] **N5** 🟠 **Abgebrochene Touch-Geste** (Mitteilung, Systemgeste) lässt die Listener auf `document` hängen: nächstes Wischen irgendwo verschiebt die Karte und speichert einen Zufallsplatz (kein `touchcancel`). *Test.*
- [x] **N6** 🟠 **Schnellbewertung zeigt nicht, was heute schon gesetzt ist**; zweites Tippen auf 😊 oder „Unentschuldigt“ *löscht* den Eintrag (nur Toast „Eintrag entfernt“, kein Rückgängig). Zweiter guter Beitrag → erster weg. *Browser.* → Aktiven Knopf markieren (`aria-pressed`), Toast mit „Rückgängig“.
- [x] **N7** 🟢 „Neue Note“ aus der Schnellbewertung nimmt immer heute, Anwesenheit/Mitarbeit das gewählte Sitzplan-Datum (`openGradeFormForCurrentStudent` ~Z. 3932).
- [x] **N8** 🟢 Gleiche Vornamen im Sitzplan nicht unterscheidbar (auch Tooltip). → Bei Doppel „Anna M.“.
- [x] **N9** 🟢 Klassenwahl zeigt nur „7b“ – bei 7b in zwei Fächern unklar, welcher Plan offen ist.
- [x] **N10** 🟢 Datumsleiste zeigt auch Tage, an denen die Klasse keinen Unterricht hat (7b am Mittwoch). *Browser.* → Unterrichtstage der Klasse hervorheben oder nur diese zeigen.
- [x] **N11** 🟢 Tippflächen 32–34 px (Datums-Chips, Werkzeug- und Timer-Knöpfe), Raster-Felder 32×26 px; Datums-Chips und Klassenmenü sind `div`s ohne Tastatur-/Screenreader-Zugang. → ≥ 44 px, `button`.
- [x] **N12** 🟢 Timer-Ende: nur 2,5-s-Toast, kein Ton, keine bleibende Markierung; Start bei 00:00 ohne Rückmeldung.
- [x] **N13** 🟢 Toter Code: `window.currentRandomStudent` (gesetzt, nie gelesen – der gezogene Schüler hat keine Aktion), `.sc-absent-toggle` in CSS/`makeDraggable`; Noten-Bearbeiten im Schüler-Fenster per `g._origIdx` (Regel 9).

## O. Review 25.09.2026: Fenster, Einstellungen, Navigation

> Behoben (v222). Tests: `tests/block-o.test.js`. O4 war schon mit M1 erledigt. O7 bei 375 und 768 px nachgemessen (kein seitliches Scrollen; Kopf der Klassenansicht auf dem Handy 113 statt ~260 px).

- [x] **O1** 🟠 **Markieren in einem Feld und neben dem Fenster loslassen schließt es, Eingaben weg** (`closeModalOnOverlay`: `click` landet auf dem Overlay). Betrifft alle Formulare außer Stunde/Note (Klasse, Schüler, Import, Spalte …), verletzt Regel 27. *Browser.* → Nur schließen, wenn auch `pointerdown` auf dem Overlay begann.
- [x] **O2** 🟠 **Farbvorschau bleibt nach Schließen ohne Speichern** (✕/Escape/daneben): App bleibt rosa, nach Neuladen wieder weg. *Test.* → `modal-settings` in `MODAL_CLOSE_ACTIONS` mit `updateAppliedThemeFromDB()`.
- [x] **O3** 🟠 **Gespeicherter Kanten-Radius wirkt nach Neuladen nicht** (`applyThemePreview` liest den Regler, der beim Start auf 8 steht). *Test.*
- [x] **O4** 🟢 Nach „Speichern“ in den Einstellungen wird nur der Stundenplan neu gezeichnet (Sortierung, Namensformat, Warnschwellen erst nach Ansichtswechsel). *Test.* → Siehe M1.
- [x] **O5** 🟢 Sitzplan-Vorlauf leer → 0 statt 5 (`parseInt('') || 0`); Blockzeiten ungeprüft (Ende vor Beginn, neuer Block immer 08:00–09:30).
- [x] **O6** 🟢 Tipp auf das Logo „Planer“ lädt die Seite neu – im Unterricht sind Timer, Stoppuhr und Gruppen weg.
- [x] **O7** 🟢 Handy-Navigation: nur Symbole ohne Beschriftung; aktive Pille breiter → ungleiche Abstände. Kopf der Klassenansicht belegt auf dem Handy ~⅓ des Bildschirms (Titel, zwei Knopfreihen, Reiter in zwei Zeilen). *Browser.*
- [x] **O8** 🟢 Fenster ohne `role="dialog"`, ohne Fokus-Übergabe beim Öffnen und Rückgabe beim Schließen.


## P. Review 25.09.2026 (2): Datenverlust & Sync

> Behoben (v223). Tests: `tests/block-p.test.js`. P1/P2: Solange ein Eingabefenster offen ist (alles außer Einstellungen und Konflikt-Dialog), übernimmt der Sync keinen Cloud-Stand und zeigt keinen Konflikt, sondern holt das nach dem Schließen nach (`inputModalOpen`, `syncAfterModalClose`); offene Einstellungen werden nach einem Pull neu befüllt (`fillSettingsForm`). P3: Block-Migration ganz entfernt (lief schon seit Juni bei allen Geräten). P4: Konflikt-Dialog nur noch aus `triggerSyncInternal` nach der `dbAtStart`-Prüfung; „Dieses Gerät hochladen“ verweigert eine frisch geleerte DB. P5: Kein Abbruch mehr nach 30 s, nur ein Hinweis; die Sperre hält bis zum Ende. P6: „Leer“ heißt nur noch leer **und** ohne Sync-Stand (`isFreshEmptyDB`). P7: `syncSettings.uid`; anderes Konto = nie synchronisiert (`syncBaseline`). P9: „Master-Passwort vergessen oder ändern?“ überschreibt die Cloud mit den Daten dieses Geräts und einem zweimal eingegebenen neuen Passwort (`SyncManager.overwriteCloud`); „Passwort vergessen?“ beim Login schickt die Firebase-Mail. P10: `syncSettings.lastSyncCheck`. P11: Eine gleiche Rettungskopie wird wiederverwendet, gleichzeitig angelegte bekommen eigene Schlüssel; ist Speichern gesperrt, bietet `persistDB` höchstens einmal pro Minute den Download an. **Nicht im Test prüfbar:** der Mail-Versand von Firebase (`sendPasswordResetEmail`) und das echte Verhalten von iOS beim Zuklappen (P8) – beim nächsten iPad-Test ansehen.
>
> Fünftes Review: Code in vier Bereichen (Sync, Stundenplan, Klassen/Noten, Sitzplan/Fenster) plus Durchklicken mit Beispieldaten bei 375/768/1024 px, dunkel und hell. „Test“ = mit Vitest nachgestellt (Tests danach wieder gelöscht, beim Fixen neu schreiben), „Browser“ = im Browser nachgemessen, „Code“ = nur gelesen. Zeilennummern Stand `a20b1c8`.

- [x] **P1** 🔴 **Offenes Stunden-Fenster überschreibt nach einem Pull die Notizen des anderen Geräts** (`storeLessonForm` ~Z. 1351, `applyCloudData` ~Z. 5733): Fenster auf dem iPad offen, iPad gesperrt; am Laptop Inhalt/Notizen eintragen, hochladen; iPad entsperren → stiller Pull (K6) ersetzt `db`, das Fenster zeigt noch die leeren Felder; Schließen vergleicht sie mit der neuen `db`, sieht eine Änderung und speichert leer → auch in der Cloud weg. Gleiches Muster bei allen Formularen, die über einen Pull offen bleiben (Stunde bearbeiten, Klasse, Schüler). *Test.* → `applyCloudData` schließt offene Eingabefenster bzw. befüllt sie neu, oder `storeLessonForm` vergleicht mit dem Stand beim Öffnen.
- [x] **P2** 🔴 **Einstellungen offen während eines Pulls: „Speichern“ schreibt den alten Stand zurück** (`openSettings` ~Z. 3005/3018 füllt Felder + `blocksDraft`, `saveSettings` ~Z. 3152/3177; `applyCloudData` frischt nur die Farben auf). Typischer Einrichtungsweg auf einem neuen Gerät: Einstellungen öffnen, anmelden, Master-Passwort → Pull holt Klassen, Blöcke, Namen → „Speichern“ → Name/Schule/Warnschwellen leer, `settings.blocks` = Standard; Stunden in Block 5 werden unsichtbar (Regel 12). Geht per Upload auf alle Geräte. Ein danach angelegter „+ Block“ bekommt wieder Nummer 5, die fremde Stunde landet in falschen Zeiten. Außerdem setzt der Pull die noch nicht gespeicherte Farbwahl im offenen Fenster zurück. *Test.* → Offenes Einstellungsfenster nach dem Pull neu befüllen (inkl. `blocksDraft`) oder schließen; beim Speichern `dbAtStart` prüfen (Regel 32).
- [x] **P3** 🔴 **Selbst eingestellte Blockzeiten werden bei jedem Start auf den Standard zurückgesetzt** (`migrateDB` ~Z. 166–171): Block 1 auf 08:00–09:30, „+ Block“ (5 Blöcke), speichern → nach Neustart/Pull/Import wieder 4 Standard-Blöcke ab 07:45, solange Block 5 keine Stunde hat. Mit der nächsten Eingabe geht der falsche Stand in die Cloud. Für Schulen mit 08:00-Beginn naheliegend. *Test.* → Nur ersetzen, wenn alle Blöcke exakt den alten Standardwerten entsprechen, oder die Migration einmalig mit Kennung in `settings`.
- [x] **P4** 🔴 **K1 unvollständig: „Alles löschen“ während eines Syncs, der im Konflikt endet → „Dieses Gerät hochladen“ leert die Cloud** (Konflikt-Callback in `SyncManager.sync` öffnet den Dialog, bevor `triggerSyncInternal` den K1-Fall erkennt ~Z. 5783; `resolveConflict('push')` ~Z. 5858 lädt ungeprüft hoch). Andere Geräte holen den leeren Stand still ab. *Test.* → `resolveConflict('push')` lehnt `isLocalDBEmpty()` ab; Konflikt nur übernehmen, wenn `db === dbAtStart`.
- [x] **P5** 🟠 **Nach „Zeitüberschreitung“ läuft der Upload weiter, danach Konflikt mit den eigenen Daten** (`withTimeout` ~Z. 5753 bricht nur das Warten ab): Transaktion schreibt trotzdem, `markSynced` fehlt → nächste Eingabe = beidseitig geändert → Konflikt-Dialog; der Hauptknopf verwirft lokale Eingaben nach dem ersten Upload. Nach dem Timeout können außerdem zwei Syncs parallel laufen (gegen A4). *Test.* → Sperre erst lösen, wenn die Sync-Promise wirklich fertig ist, und ihr Ergebnis noch auswerten; nur die Meldung kommt nach 30 s.
- [x] **P6** 🟠 **Alle Klassen einzeln gelöscht: Löschung erreicht die Cloud nie, die Schülerdaten kommen zurück** (`decideSync` sync-manager.js ~Z. 62, `localIsEmpty`; `no_change` markiert den leeren Stand sogar als synchron): Zum neuen Schuljahr alles löschen → nichts wird hochgeladen, „bereits auf dem neuesten Stand“; sobald ein anderes Gerät etwas ändert, kommen die alten Klassen still zurück. Auch ein Datenschutzproblem. *Test.* → Nur „nie synchronisiert“ bzw. „direkt nach Alles löschen“ als leer behandeln (Kennzeichen), nicht jede leere DB.
- [x] **P7** 🟠 **Sync-Stand hängt nicht am Konto** (`logoutSync` ~Z. 5587, `markSynced`; keine `uid` in `syncSettings`): Mit Konto A synchron, abmelden, mit Konto B anmelden (versehentliches Zweitkonto, Google statt E-Mail) → Cloud B gilt als geändert, lokal als unverändert → stiller Pull, lokale Daten durch B ersetzt. *Test.* → `uid` in `syncSettings` merken; anderes Konto = nie synchronisiert → Konflikt-Dialog statt stillem Pull.
- [x] **P8** 🟠 **Kein Sync beim Verlassen der App** (`saveDB` ~Z. 184 wartet 3 s, `initSync` synct nur bei `!document.hidden`): Fehlzeit eintragen, iPad-Hülle sofort schließen → Timer läuft im Hintergrund nicht; abends am Laptop ändern → morgens Konflikt, Hauptknopf verwirft die Eingabe (nur noch in der Download-Datei). *Code.* → Bei `visibilitychange` → hidden / `pagehide` einen offenen `syncTimeout` sofort ausführen.
- [x] **P9** 🟠 **Master-Passwort vergessen/ändern: Sackgasse.** Es gibt weder „Cloud-Daten zurücksetzen/neu verschlüsseln“ noch „Passwort vergessen“ (`sendPasswordResetEmail`) für das Konto. Vergessenes Master-Passwort = Sync für immer tot. *Code.* → „Cloud zurücksetzen“ mit deutlicher Rückfrage (danach Upload über den K8-Weg mit bestätigtem neuen Passwort) und „Passwort vergessen“ beim Login.
- [x] **P10** 🟢 „Zuletzt synchronisiert“ zeigt die Versionskennung der Cloud (Uhr des Geräts, das zuletzt hochgeladen hat), nicht den letzten Abgleich: gerade abgeglichen, Anzeige „vor 10 Tagen“ (`updateSyncUI` ~Z. 5522). *Test.* → Eigenes Feld `lastSyncCheck` (per `persistDB`) oder Beschriftung „Cloud-Stand vom …“.
- [x] **P11** 🟢 Unlesbare Daten: Jeder Start legt eine weitere Rettungskopie `lehrerapp_v3_defekt_<Zeit>` an (`rescueUnreadableDB` ~Z. 112) → Speicher läuft voll, `persistDB` gesperrt; die Meldung bietet keinen „Herunterladen“-Knopf. *Test.* → Keine Kopie, wenn eine inhaltsgleiche existiert; Knopf im Hinweis.
- [x] **P12** 🟢 **`npm test` ist rot** (Exit-Code 1, alle 561 Tests grün, aber „1 unhandled error“): `tests/block-o.test.js` Z. 43 feuert `click` auf das Overlay, dessen Inline-`onclick="closeModalOnOverlay(…)"` in jsdom ins Leere läuft (Regel 18). *Test.* → Im Test nur `app('closeModalOnOverlay')(…)` aufrufen bzw. das Inline-Attribut vorher entfernen.
- **Unsicher, auf dem iPad prüfen:** (a) Google-Login per `signInWithPopup` (sync-manager.js ~Z. 157) in der installierten iOS-App – Popups scheitern dort oft, evtl. `signInWithRedirect`. (b) Konflikt-Hauptknopf „Sicherheitskopie … dann Cloud laden“ übernimmt die Cloud direkt nach `exportData()`; kommt der Download in der Home-Bildschirm-App nicht an, sind die lokalen Änderungen weg, der Toast sagt trotzdem „Backup gespeichert“. (c) Alte App-Version (main, v174) zeigt nach jedem Upload eines neuen Geräts einen Konflikt, „Lokal hochladen“ dort überschreibt den v2-Stand – nur Hinweis für den Live-Gang.

## Q. Review 25.09.2026 (2): Klassen, Noten, Anwesenheit

- [ ] **Q1** 🟠 **XSS über den Notentyp im Schülerprofil** (`renderGradesList` ~Z. 2684/2701): `gradeTypeName(g.type)` landet ohne `escHtml` in `innerHTML` (Typ-Schild und Zusammenfassung). Eine Note mit Typ `<img onerror=…>` über Import/Sync wird beim Öffnen ausgeführt. `tests/xss.test.js` nutzt nur Typ `'test'`. *Test.* → `escHtml(gradeTypeName(…))`, präparierten Typ in den XSS-Test.
- [ ] **Q2** 🟠 **Entschuldigung im Profil nachtragen ergibt zwei Einträge am selben Tag** (`addAttendanceEntry` ~Z. 2760): Im Sitzplan „Unentschuldigt“, später im Profil denselben Tag als „Entschuldigt – Attest“ → F und E am selben Tag, Tabelle zeigt weiter F, Fehltage 2, Hinweis „… hat unentschuldigt gefehlt“ bleibt, Warnung zählt weiter. Das Profil ist der einzige Ort für einen Grund, also normaler Ablauf. *Test.* → Vorhandenen Eintrag des Tages ersetzen wie `setSeatingAbsence`, mit `removeAbsenceNote`/`addAbsenceNote`.
- [ ] **Q3** 🟠 **Notentabelle: Nach einer Eingabe ist der Fokus weg** (`updateInlineGrade` zeichnet die ganze Tabelle neu): Note tippen, Tab (oder auf dem iPad die nächste Zelle antippen) → `document.activeElement` = `body`, Tastatur geht zu, man muss erneut tippen. Nur Enter springt (L-Fix) weiter. *Browser.* → Zelle gezielt aktualisieren statt neu zeichnen, oder den Fokus nach dem Zeichnen auf die Zielzelle zurücksetzen (gilt auch für Anwesenheit/HA).
- [ ] **Q4** 🟠 **Klasse bearbeiten bei offener Tabelle: Schnitte/Farben veraltet** (`saveSubjectGroup` ~Z. 1583 ruft nur `renderStudents()`): Gewichtung 50 → 100 → Tabelle zeigt weiter die alten Schnitte; ebenso Farben nach Skalenwechsel. Gleiches beim Umbenennen eines Schülers (`saveStudent` ~Z. 2602). *Test.* → `refreshStudentViews(groupId)` (Regel 38).
- [ ] **Q5** 🟠 **Profil-Notenliste öffnet nach einem Pull die falsche Note** (`renderGradesList` ~Z. 2692 merkt `originalIdx` beim Zeichnen; `applyCloudData` zeichnet das offene Profil nicht neu): Neue Note aus der Cloud steht vorne → „Vokabeltest“ antippen öffnet „KA 1“. *Test.* → Per Referenz (`s.grades.indexOf(g)`, `-1` = Hinweis) wie N13; Profil nach Pull neu zeichnen oder schließen.
- [ ] **Q6** 🟠 **Spalte auf ein vorhandenes Datum verschieben verschmilzt Einträge** (`saveOverviewColumn` ~Z. 2136): HA-Spalte 23.09. → 21.09., wo schon eine ist → zwei Einträge am 21.09., Leeren entfernt nur einen, „Vergessen“ zählt doppelt. Gilt für HA, Mitarbeit, Anwesenheit; Kollisionsprüfung gibt es nur bei Noten. *Test.* → Prüfung auf alle Reiter ausweiten.
- [ ] **Q7** 🟠 **Import „Nachname, Vorname“ vertauscht die Namen** (`importStudentsFromText` ~Z. 2552): „Müller, Anna“ (übliches Format in Schullisten) → Vorname „Müller,“, Nachname „Anna“. *Test.* → Zeilen mit Komma als „Nachname, Vorname“ lesen.
- [ ] **Q8** 🟠 **Sitzplan-Smiley überschreibt/löscht eine benannte Mitarbeit-Spalte** (`addParticipationSmiley` ~Z. 4566 sucht nur per Datum, ebenso `setSeatingHomework`): Anna hat am 21.09. 😊 in „Referat“; im Sitzplan ☹️ → Referat wird ☹️; 😊 → Referat gelöscht. Karte und `markSeatingStudentState` zeigen ebenfalls den benannten Eintrag. *Test.* → Im Sitzplan nur Einträge ohne `label` anfassen.
- [ ] **Q9** 🟢 HA-Tabelle: Tippfehler löscht still (`updateInlineHomework` ~Z. 2019): „v“ in eine Zelle mit „X“ → Eintrag weg (Regel 36, K5 hat nur Anwesenheit repariert). *Test.*
- [ ] **Q10** 🟢 Fehl-Hinweise: Schüler löschen (`deleteCurrentStudent` ~Z. 2859, `deleteSelectedStudents` ~Z. 2486) lässt „… hat letzte Stunde unentschuldigt gefehlt“ und `acknowledgedWarnings` stehen (Regel 10); nach Umbenennen entfernt `removeAbsenceNote` den Hinweis mit altem Namen nicht; bei zwei gleichnamigen Schülern entfernt die Rücknahme bei einem den gemeinsamen Hinweis. *Test.*
- [ ] **Q11** 🟢 Wechsel E → F im Sitzplan (`setSeatingAbsence` ~Z. 4118) verwirft den Grund („Arztattest“), ohne Rückgängig. *Test.* → Eintrag umtypen statt ersetzen.
- [ ] **Q12** 🟢 Notenformular speichert ohne Datum (`saveGradeFromForm` ~Z. 4463) → Spalte mit leerem Kopf. *Test.* → Datum verlangen.
- [ ] **Q13** 🟢 „+“: Formular nimmt es an, Tabelle lehnt es mit „Bitte eine Note zwischen 1 und 6“ ab (`updateInlineGrade` ~Z. 1946). *Test.* Evtl. Absicht → dann Meldung „Text nur im Formular“.
- [ ] **Q14** 🟢 Import: Mit „Vorhandene Namen überspringen“ (Standard an) wird der zweite „Lukas Meier“ **aus derselben Liste** verworfen (~Z. 2574). *Test.* → Nur gegen Schüler prüfen, die schon vorher in der Klasse waren.
- [ ] **Q15** 🟢 HA-Bemerkung im Profil („Heft vergessen“) ist Teil des Spaltenschlüssels `datum_note` → jede Bemerkung wird eine eigene Tabellenspalte (`renderOverviewTable` ~Z. 1878, `addStudentHomework`). *Code.* → Im Profil vorhandene Spalten zur Auswahl anbieten oder Feld als „Spalte“ beschriften.

## R. Review 25.09.2026 (2): Stundenplan, Stunden-Fenster, Dashboard

- [ ] **R1** 🔴 **„Ab der Woche vom …“ verändert Stunden, die diese Woche schon stattgefunden haben** (`deleteLessonSlotFromEdit` ~Z. 1054, `splitSlotFrom` ~Z. 1003): Am Donnerstag die Montagsstunde „ab der Woche vom 21.09. beenden“ → Inhalt/Notizen der schon gehaltenen Stunde gelöscht; die Rückfrage nennt nur „1 aus früheren Wochen“. Tag Mo→Mi „ab der Woche“ am Donnerstag → Mo 21.09. leer, Montagsnotizen stehen am Mi 23.09. *Test.* → Ab heute (bzw. ab der geöffneten Stunde) teilen statt ab Montag; in der Rückfrage die Zahl der Einträge nennen, die verloren gehen.
- [ ] **R2** 🟠 **Zieldatum von HA/Test wandert beim Verschieben nicht mit** (`moveLessonData` ~Z. 1019, `splitSlotFrom`; Regel 13 unvollständig): HA am Mo 21.09. für Mo 28.09., Stunde auf Dienstag → Eintrag zieht auf 22.09., `hwItems[].targetDate` bleibt 28.09. → nirgends fällig. *Test.* → `targetDate` aller HA/Tests der Klasse mit umrechnen, die auf verschobene Termine zeigen.
- [ ] **R3** 🟠 **Alte Stunde nach „Wechsel ab Woche“ nicht mehr bearbeitbar** (`saveLessonSlot`, Kollisionsprüfung ~Z. 945–957): Ganzer Block → „1. Hälfte ab 21.09.“; danach die alte Stunde (Woche 14.09.) öffnen, nur den Raum ändern → „Block ist bereits belegt!“. `candidate` übernimmt `validFrom`/`validUntil` nicht. Ebenso bei wöchentlich → zweiwöchentlich. *Test.*
- [ ] **R4** 🟠 **HA/Test bleiben in einer ausgefallenen oder vertretenen Stunde hängen** (`getIncomingItems` ~Z. 716, `dueItemsFor`): HA für 28.09., dann „Stunde entfällt“ am 28.09. → nur dort fällig (Dashboard: HA + „Entfällt“), am 05.10. nicht; ersetzt eine Vertretung die Stunde, ist die HA unsichtbar. *Test.* → Beim Ausfall hinweisen und anbieten, auf die nächste Stunde zu verschieben (Designfrage).
- [ ] **R5** 🟠 **Blöcke nicht nach Uhrzeit sortiert** (`lessonsOnDate` ~Z. 5027, `findNextLesson` ~Z. 5051, `addBlockRow`): Neuer Block „0. Stunde 07:00“ landet am Ende; um 06:30 meldet „Nächste Stunde“ 07:45, Dashboard und Stundenplan in falscher Reihenfolge; umsortieren unmöglich. *Test.* → Für Anzeige/`lessonsOnDate` nach `start` sortieren, `num` bleibt (Regel 12).
- [ ] **R6** 🟠 **Wochen-Versatz springt über Nacht; Tag- und Wochenansicht zeigen verschiedene Wochen** (`getWeekDates` ~Z. 302, `setTimetableDay` ~Z. 422; Regel 24): Fr 25.09. auf „nächste Woche“ → am Sa steht KW 41, weil `currentWeekOffset` relativ zu „jetzt“ gilt. Handy: Fr 25.09. gewählt, am Sa Tagesansicht 25.09., nach Drehen Wochenansicht KW 40. *Test.* → Angezeigten Montag absolut speichern; an einem neuen Tag auf „heute“ zurücksetzen.
- [ ] **R7** 🟢 Stunden-Fenster nur öffnen und schließen zählt als Änderung (`openLessonDetail` ~Z. 1183, `storeLessonForm`): Ist eine HA fällig, wird der HA-Schalter eingeschaltet angezeigt; Schließen speichert `hwEnabled:true` → `lastModified`, Upload, evtl. Konflikt auf anderen Geräten. *Test.* → Mit dem beim Öffnen angezeigten Stand vergleichen.
- [ ] **R8** 🟢 Eine künftige Vertretung blockiert das Anlegen einer regelmäßigen Stunde im selben Platz („Block ist bereits belegt!“); umgekehrt geht es seit M6. *Test.*
- [ ] **R9** 🟢 Eine vergangene halbe Vertretung sperrt beim Bearbeiten der regulären Stunde für immer „Ganzer Block“/„1. Hälfte“ (`openEditLesson` ~Z. 865, `partner`-Suche ohne Datum). *Test.*
- [ ] **R10** 🟢 Rhythmuswechsel (wöchentlich → zweiwöchentlich) versteckt **künftige** Einträge ohne Rückfrage (Notiz für 28.09. = jetzt B-Woche, verwaist). *Test.* → Auch künftige Einträge ohne Termin nennen.
- [ ] **R11** 🟢 HA am Doppelstunden-Tag zählt doppelt (1. und 3. Block, Dashboard zweimal „HA 1“); `getIncomingItems` vergleicht nur das Datum. *Test.*
- [ ] **R12** 🟢 HA ohne Zieldatum: Symbol in der Kachel (`buildTimetableCell` ~Z. 604), im Dashboard nicht (`dueItemsFor` ~Z. 5043). *Test.* → Ohne Datum nicht speichern oder Regel vereinheitlichen.
- [ ] **R13** 🟢 „Stunde hinzufügen“ zeigt nicht, auf welches Datum „Nur einmalig“ fällt bzw. welche Woche die A-Woche ist; HA-Datum auf einen Tag ohne Stunde der Klasse wird ohne Warnung angenommen (dann nirgends fällig). *Code.* → „Findet statt am Mi, 30.09.“ / „A-Woche: Woche vom …“ anzeigen.
- [ ] **R14** 🟢 Warnung quittieren hängt nur an der Anzahl (`acknowledgeWarning`): Eintrag löschen + neuen anlegen → neue Fehlzeit bleibt unsichtbar. *Code.*
- **Nicht gezählt (fehlende Funktion):** Ferien kennt die App nicht; Dashboard, „Nächste Stunde“ und HA-Vorschläge laufen in den Ferien weiter.

## S. Review 25.09.2026 (2): Sitzplan, Fenster, Einstellungen, Design

- [ ] **S1** 🟠 **Noten bleiben beim Klassenwechsel im Sitzplan sichtbar** (Regel 16; Klassenmenü `renderSeatingGroupSelect` ~Z. 3429, `seatingShowGrades` nur in `initSeatingPlan` zurückgesetzt): Am Ende der 7b Noten einblenden, 9c wählen → alle Schnitte der 9c auf dem Beamer. Ebenso beim Datumswechsel und über Nacht. *Test.* → Bei jedem Klassen-/Datumswechsel `seatingShowGrades = false`.
- [ ] **S2** 🟠 **Nach einem Pull springt der Sitzplan auf die Klasse der laufenden Stunde** (Rückfall von E1; `applyCloudData` → `resetViewSelection` ~Z. 2294/2305 → `switchView('seating')` → `initSeatingPlan` → `getSuggestedSeatingGroupId`): Bewusst 9c offen, während 7b-Zeit ist; kurz andere App, Pull → Sitzplan zeigt 7b, nächste Einträge landen in der falschen Klasse. Durch K6 jetzt häufig. *Test.* → Gültige `currentSeatingGroupId` behalten, nur neu zeichnen.
- [ ] **S3** 🟠 **Vorschlag „laufende Stunde“ beachtet halbe Blöcke und Ausfall nicht** (`getSuggestedSeatingGroupId` ~Z. 3335 nimmt `lessonsAt(…)[0]`): 1. Hälfte 7b, 2. Hälfte 9c → um 09:00 öffnet 7b; ausgefallene Stunde wird vorgeschlagen. *Test.* → Über `lessonsOnDate(today)` mit `range` und `!ausfall` wie `findNextLesson`.
- [ ] **S4** 🟠 **Klassentabelle: Datum für die Schnellbewertung beim Zeichnen festgeschrieben** (`renderOverviewTable` ~Z. 1787/1835/1884/1912, `openSeatingStudentModal(…, jsArg(formatDate(new Date())))`; Regeln 17, 24): Tabelle über Nacht offen → „Unentschuldigt“ landet beim Vortag (mit Hinweis); samstags geöffnet → Samstag. *Test.* → Datum erst beim Tippen bestimmen.
- [ ] **S5** 🟠 **„Zum Profil“ aus dem Stunden-Fenster lässt das Stunden-Fenster offen** (`jumpToStudentDetailFromSeating` ~Z. 5239; Regel 35): Stunde → Schüler → Name → Zum Profil → Profil liegt über dem Stunden-Fenster, nach dem Schließen steht das Stunden-Fenster über der Klassenansicht. *Test.* → Vorher `leaveLessonModal()`.
- [ ] **S6** 🟠 **Einmal „Speichern“ in den Einstellungen verändert das Standard-Design dauerhaft** (`loadThemeSelection` ~Z. 5889 setzt `#0f1117`/`#1e2130` als Vorgabe, `saveSettings` speichert sie als `themeBg`/`themeCard`): Nur den Namen ändern, speichern, neu starten → Kopfzeilen, Seitenleiste und hervorgehobene Flächen heben sich nicht mehr ab; zurück zum Standard geht nicht (kein Farbfeld dafür). *Test.* → Nur speichern, wenn wirklich ein Farbfeld gewählt ist; Feld „Standard“.
- [ ] **S7** 🟠 **Escape/Daneben-Tippen verwirft Eingaben in Einstellungen und Notenformular ohne Rückfrage** (`MODAL_CLOSE_ACTIONS`: `cancelSettings`, `closeGradeForm`; Regel 27 „Schließen darf nie eingetippte Daten verwerfen“). Der ✕ macht dasselbe, also konsequent, aber gegen die Regel. *Test* (Einstellungen), *Code* (Note). → Bei geänderten Feldern nachfragen oder Escape/Daneben dort wirkungslos.
- [ ] **S8** 🟠 **Handy: Eingabefelder zu schmal.** Stunden-Fenster: HA-Text 92 px, Datum daneben 158 px, Platzhalter „Aufgabe (…“ abgeschnitten. Einstellungen → Stundenzeiten: Blockname 47 px („1. B“, „2. E“), nicht lesbar/bearbeitbar. *Browser (375 px).* → HA: Text über volle Breite, Datum + „+“ darunter; Blöcke: Name in eigene Zeile.
- [ ] **S9** 🟠 **Hover-Effekte bleiben auf dem iPad nach dem Tippen hängen**: Nur `.subject-group-card:hover` steht in `@media (hover: hover)` (style.css ~Z. 249); `.student-row` (verschiebt sich 3 px), `.seating-card` (hebt sich an), `.tt-lesson`, `.dash-lesson`, Tabellenzeilen usw. bleiben nach einem Tipp „angehoben“, bis woanders getippt wird. Dazu nutzen `.btn-secondary:hover`/`.student-row:hover` einen weißen `rgba`-Rand, im hellen Modus unsichtbar. *Browser.* → Alle `:hover` mit Bewegung/Hintergrund in `@media (hover: hover)`; Ränder über Variablen.
- [ ] **S10** 🟢 Timer: Jede Pause rundet die Restzeit auf volle Sekunden auf (`toggleTimer`/`timerTick` `Math.ceil` ~Z. 5314): 10× nach 0,9 s pausieren → 9 s vergangen, Anzeige unverändert. *Test.* → Beim Pausieren Millisekunden merken.
- [ ] **S11** 🟢 Zufall-Fenster öffnet ohne `openModal` (`startSeatingRandomizer` ~Z. 3879; Regel 46) → keine Fokus-Rückgabe; die Hervorhebung der Karten läuft unter dem abgedunkelten, unscharfen Overlay und ist unsichtbar. *Test/Code.*
- [ ] **S12** 🟢 Barrierefreiheit: Sitzplan-Karten, alle Farbfelder (Einstellungen, Stunde, Klasse), Schülerzeilen in der Stunden-Schülerauswahl und Tabellenzellen mit `td onclick` sind `div`/`td` ohne Tastatur/VoiceOver; `btn-seating-edit` ohne `aria-pressed`; Timer und Stoppuhr haben je einen „Zurücksetzen“ mit gleichem Namen. *Code.*
- [ ] **S13** 🟢 Tippflächen: `.modal-close` 34 px (jedes Fenster), in der Schnellbewertung „Anzeigen“ ~26 px und Stift „Note bearbeiten“ ~24 px. *Code.* → Unter `pointer: coarse` 44 px wie N11.
- [ ] **S14** 🟢 Kontrast: `.sc-hw-note` („Keine HA“) weiß auf `--warning` im dunklen Modus ~2,2:1 (J2 hat nur hell repariert); `.seating-group-badge` 9 px weiß auf hellen Gruppenfarben (Gelb, Limette, Türkis). *Code.*
- [ ] **S15** 🟢 Kleinigkeiten aus dem Durchklicken (*Browser*): Wochenansicht-Badge „läuft noch 87 min“ abgeschnitten („läuft noch 87 …“, 104/100 px); Schülerprofil auf dem Handy: „Fertig“ klebt am rechten Rand (Abstand links 27 px, rechts 1 px), Reiter „Hausaufgaben/Notizen“ außerhalb ohne Scroll-Hinweis; Farbwahl mit zwei kaum unterscheidbaren Rot- und zwei Gelb/Orange-Tönen; „Ganzer Block“ bricht auf dem Handy zweizeilig um; Klassenkopf: „Aktionen“ (Schüler hinzufügen/Import) hat ein Stift-Symbol, sieht aus wie „Klasse bearbeiten“; Sitzplan mit 24 Schülern auf dem Handy im Hochformat „A…“, „Cl…“ bei viel leerem Platz darüber/darunter (Raster 10 Spalten passt sich nicht an); Einstellungen: gerade Anführungszeichen "Sportzeug vergessen", „Sitzplan: Auto-Vorschlag Vorlauf“ steht unter Name und Schule statt bei den Sitzplan-Einstellungen.
---

## Erledigt

| ID | Was | Commit |
|----|-----|--------|
| G1 | Versions-Skript + Cache-Test | Phase 1 |
| A1 | `persistDB()` für Sync-Metadaten; „lokal geändert“ = `lastModified !== syncedLocalModified` | Block A |
| A2 | Leeres Gerät lädt immer, lädt nie hoch (`decideSync`, `isLocalDBEmpty`) | Block A |
| A3 | Passwort-Probe: Cloud wird vor jedem Upload entschlüsselt; Feld `onchange`; falsches Passwort wird verworfen | Block A |
| A4 | Sync-Sperre + Warteschlange; Pull verworfen, wenn währenddessen eingetippt wurde; 30-s-Timeout | Block A |
| A5 | `clearAllData` repariert, Hinweis auf Cloud | Block A |
| A6 | Kein Auto-Sync, solange Konflikt offen | Block A |
| A8 | Nur Gleichheitsvergleich der Versionskennung; Upload per Firestore-Transaktion | Block A |
| A7 | Format v2 (`CryptoHelper.encryptPayload`/`decryptPayload`, WebCrypto PBKDF2 + AES-GCM); v1 lesbar, still umgeschrieben (`upgradeCloudFormat`); unbekanntes Format ≠ falsches Passwort | Block A |
| A9 | gzip vor dem Verschlüsseln; `CloudTooLargeError` vor dem Schreiben, Warnung ab 75 % | Block A |
| A10 | `migrateDB()` übernimmt alten Sync-Stand; inhaltsgleiche Stände sind kein Konflikt (`cloudMatchesLocal`) | Block A |
| B1 | Notenformular merkt sich die Note per Referenz; `refreshGradeViews()` statt `#view-overview` | Block B |
| B2 | `parseGradeInput()` (Komma, Tendenz, 1–6) für Formular und Tabelle; `gradeNumber()` zum Lesen | Block B |
| B3 | Klassenkarte, Schülerdetail, Sitzplan über `calculateStudentAverage` / `calculateGroupAverage` | Block B |
| B4 | `gradeCategory()` zentral; CSV-Spalten wie Gewichtung | Block B |
| B5 | Gewichtung außerhalb 0–100 wird abgelehnt, gespeicherte Werte werden begrenzt (`getSchularbeitWeight`) | Block B |
| B6 | `migrateDB()`: `label` → `note` (auch bei Import/Cloud); `addGradeEntry`/`deleteGrade` entfernt | Block B |
| B7 | Sitzplan-Schülerfenster: `g.note \|\| Typ` | Block B |
| C1 | Anmerkungen/Anwesenheit/Mitarbeit per Objekt-Referenz löschen (`deleteStudentNote`, `deleteAttendance(entry)`, `deleteParticipation(entry)`) | Block C |
| C2 | Avatar-Farbe mit leeren Namensteilen; Text-Import trennt an Tabs | Block C |
| C3 | `renderClasses()`-Aufruf entfernt | Block C |
| C4 | `deleteGroup` löscht Stunden + `lessonData` der Klasse, verlässt die Klassenansicht, Sitzplan-Auswahl zurückgesetzt | Block C |
| C5 | HA-Spalte umbenennen: Suche nach Datum + Beschriftung, setzt beides | Block C |
| C6 | Schülerakte: `a.note` statt `a.label`, kein `n.label`, „zu spät“, Einträge ohne Datum | Block C |
| C7 | Schülerliste nach Löschen von Anwesenheit/Mitarbeit neu gerendert | Block C |
| C8 | `ATTENDANCE_SHORT`: „Z“ für zu spät in Anzeige und Eingabe | Block C |
| C9 | `parseWarnThreshold()`: 0 = aus, leer = Standard | Block C |
| C10 | Dashboard-Warnung öffnet Tab `homework` | Block C |
| D1 | A/B-Woche über fortlaufende Wochen seit Referenz-Montag (`weekIndex`, `slotOccursOn`); `startDate` statt `startWeek`, Migration | Block D |
| D2 | Einmalige Stunde: Datum = Woche der angeklickten Stunde + gewählter Tag; Migration für verirrte Stunden | Block D |
| D3 | Überschneidung über `slotsShareDate` (Datum, A/B-Woche); vergangene Vertretung sperrt nicht; Vertretung hat an ihrem Tag Vorrang (`lessonsAt`) | Block D |
| D4 | Block-Nummern sind feste Kennungen, kein Umnummerieren; Block mit Stunden nicht löschbar | Block D |
| D5 | `getBlocks()` gibt Kopie; Einstellungsfenster arbeitet auf `blocksDraft` | Block D |
| D6 | `moveLessonData()`: Notizen/HA wandern beim Tageswechsel mit | Block D |
| D7 | Titel aus der Klasse; Umbenennen aktualisiert `slot.subject` | Block D |
| D8 | Plan scrollt, wenn er nicht passt | Block D |
| D9 | Nicht übernommene HA/Test-Eingaben werden beim Speichern übernommen | Block D |
| D10 | `parseDate()` in `jumpToDate` und Sitzplan-Datumsleiste | Block D |
| H1 | Sitzplan: Noten standardmäßig verborgen, Augen-Knopf (nicht gespeichert); Nachtrag: auch das Schüler-Fenster zeigt Einzelnoten erst nach „Anzeigen“ | Block H |
| H6 | „Klassenarbeit“ statt „Schularbeit“ in Oberfläche und CSV-Export | Block H |
| H8 | „Zu spät“ in der Sitzplan-Schnellbewertung | Block H |
| H9 | Sitzplan-Datumsleiste und Datumswahl nur Mo–Fr | Block H |
| H3 | Dashboard „Heute“: Stunden des Tages (vorbei/läuft/nächste), Karte „Nächste Stunde“ mit Notizen + fälligen HA/Tests, Warnungen pro Klasse zuklappbar (`lessonsOnDate`, `findNextLesson`, `dueItemsFor`) | Block H |
| H2 | Stundenplan unter 700 px als Tagesansicht (Pfeile/Wischen = Schultag vor/zurück, „Heute“, KW im Kopf); kein seitliches Scrollen mehr (`#main-content` min-width) | Block H |
| H5 | Notentabelle: Typ-Kürzel im Spaltenkopf (KA hervorgehoben, Tooltip mit Gewichtung), Spalten ohne Titel zeigen den Typ | Block H |
| H4 | Stundenplan-Kacheln teilen sich Breite/Höhe (iPad hochkant ohne seitliches Scrollen); Klasse groß, Fach + Raum klein mit „…“; laufende Stunde mit Rahmen + „läuft noch n min“ (jede Minute neu), nächste Stunde gestrichelt; Linien-Symbole für Inhalt/HA/Test/Notiz (`timetableClock`, `refreshTimetableClock`) | Block H |
| H7 | Notenskala pro Klasse (`group.gradeScale`, fehlt = 1–6; `gradeScale()`, `GRADE_SCALES`): Auswahl im Klassen-Dialog, Wechsel mit Rückfrage ohne Umrechnung; Punkte 0–15 ganzzahlig ohne Tendenz (`parseGradeInput(v, scale)`), Farben „hoch = gut“ (`gradeColor(v, scale)`), eigene Warnschwelle `warnPoints` (Standard: unter 5 Punkten), CSV/Schülerakte in Punkten. Alte App-Versionen ignorieren das Feld (zeigen Punkte bis zum Update wie Noten an, kein Datenverlust) | Block H |
| H10 | Linien-Icons statt Emojis in Reitern, Knöpfen, Überschriften (`ICONS`, `icon()`, `data-icon`-Platzhalter + `fillIcons()`); Stunden-Status-Symbole nutzen dieselben Icons; Mitarbeit-Smileys bleiben; `alert`/Toasts unverändert | Block H |
| E1 | „Sitzplan“ aus Klasse/Stunde zeigt diese Klasse (aus einer Stunde auch deren Datum) statt der laufenden Stunde (`openSeatingForGroup(groupId, dateStr)` → `seatingRequest`) | Block E |
| E2 | Sitzplan-Datum gilt nur für den Tag, an dem es gewählt wurde; springt über Nacht auf heute (`setSeatingDate`, `refreshSeatingDate`: beim Öffnen, Antippen, Zufall/Gruppen, Timer, `visibilitychange`) | Block E |
| E3 | Lehrerpult (2 Zellen breit) rastet in seiner Spalte ein (`makeDraggable`: halbe Überbreite abziehen) | Block E |
| E4 | Hinweis „… hat letzte Stunde unentschuldigt gefehlt“ mit vollem Namen, in der nächsten Stunde, die wirklich stattfindet (`nextLessonOfGroup` über `lessonsOnDate`: A/B, Vertretung, Ausfall); Entfernen zeilenweise in allen Stunden der Klasse 4 Wochen danach, alter Vorname-Hinweis nur bei eindeutigem Vornamen (`addAbsenceNote`/`removeAbsenceNote`); Schülerdetail nutzt `currentGroupId` | Block E |
| E5 | `closeGradeForm()` setzt `currentGradeFormCtx` zurück | Block E |
| E6 | Zufallsauswahl gesperrt, solange sie läuft; Gruppen gleichmäßig (`seatingGroupSizes`: max. Wunschgröße, Unterschied ≤ 1, niemand allein), Mischen per Fisher-Yates (`shuffled`) | Block E |
| G2 | Seite (Navigation) network-first mit 3-s-Zeitlimit, offline/Serverfehler aus dem Cache; frische index.html wird nicht in den alten Cache gelegt; alle eigenen Skripte mit `?v=` (Test) | Block G |
| G3 | Undefinierte CSS-Variablen ersetzt (`--border`, `--radius-md`, `--bg-card-hover`, `--accent-glow`), `--success-soft`/`--warning-soft` definiert; Test prüft alle `var(--…)` | Block G |
| G4 | Zoom erlaubt (viewport ohne `maximum-scale`/`user-scalable`, `touch-action: manipulation`); Eingabefelder auf Touch-Geräten 16 px, damit iOS nicht bei jedem Feld hineinzoomt | Block G |
| G5 | Neues Icon (Linien-Kalender statt Apple-Emoji, randlos): `icon-180.png` (iOS), `icon-192/512.png` (Manifest, auch maskable); Manifest-Name „Unterrichtsplaner“, Farben = App-Hintergrund | Block G |
| G6 | Timer/Stoppuhr rechnen mit `Date.now()` (Endzeitpunkt), sofort richtig nach `visibilitychange`; Start/Pause-Knopf mit wechselndem `aria-label` | Block G |
| G7 | Escape schließt nur das oberste Fenster über dessen eigenen Weg (`closeTopModal`, `MODAL_CLOSE_ACTIONS`: Stunde speichert, Notenformular kehrt zurück, Sync-Konflikt bleibt); Knöpfe ohne Text mit `aria-label` (Test über alle Ansichten) | Block G |
| G8 | `tools.js`, `app.js.bak` gelöscht | Block G |
| G10 | Kommentar entfernt | Block G |
| G11 | `server.js`: Pfad dekodiert + `path.relative`-Prüfung, keine versteckten Dateien (`.git`); `createServer()` testbar, Port per `PORT` | Block G |
| G13 | Tippen neben ein Fenster nimmt denselben Weg wie Escape und der Schließen-Knopf (`closeModalLikeButton`): Stunden-Fenster speichert Notizen, Notenformular kehrt zurück | Block G |
| H11 | Zähler in der Schülerliste: Tooltip/`aria-label` mit den echten Zahlen („Fehltage: 3 unentschuldigt, 1 entschuldigt“); ohne Maus (`(hover: hover)`) zeigt Antippen eine Erklärung in den Zählerfarben mit „Einträge ansehen“, mit Maus öffnet Klick wie bisher die Schülerakte | Block H |
| H12 | Ursache: `#main-content{min-width:800px}` (war nur für den Stundenplan aufgehoben). Jetzt auch für Dashboard, Klassen und Klassenansicht aufgehoben; Schülerzeile bricht bei schmaler Liste um (Container-Query 520 px, Rückfall Media-Query 600 px), lange Namen mit „…“; Kopf der Klassenansicht bricht um; Dashboard füllt die Breite (`width:100%`). Nachgemessen bei 375/640/768 px | Block H |
| H13 | Sitzplan ohne 800-px-Mindestbreite (nur wo Container-Queries gehen, `@supports`; ältere iPads wie bisher). Stufen nach Breite der Ansicht: ≤ 1000 px untere Leiste kompakt + Umbruch (lief vorher schon bei iPad quer über beide Ränder), ≤ 820 px Titel aus/obere Leiste im Fluss, ≤ 520 px Datums-Chips in eigener Zeile. Kartennamen: Inline-`font-size` entfernt (Kompakt-Stufe wirkte nie), Silbentrennung statt harter Trennung, winzige Karten (< 64 px) kürzen mit „…“ + Tooltip. Nachgemessen bei 1024/768/640/375 px | Block H |
| K1 | Sync-Ergebnis nur übernehmen, wenn `db` noch dasselbe Objekt ist (`dbAtStart`, auch „Lokal hochladen“ im Konflikt); `decideSync` lädt ein leeres Gerät auch bei unveränderter Cloud nie hoch | Block K |
| K2 | `leaveLessonModal()`/`storeLessonForm()`: Stift, „Sitzplan öffnen“, „Notenübersicht“ übernehmen vorher die Eingaben; ohne Änderung kein `saveDB` | Block K |
| K3 | `setGradeTypeSelect()`: fehlender Notentyp wird als Option ergänzt statt `''` zu speichern; Note ohne Titel bleibt ohne Titel | Block K |
| K4 | Notenspalte = Datum + Titel + Typ (+ `nth` bei mehreren Noten eines Schülers): `gradeColumns`, `findColumnGrade`; gleiche Spalte anlegen/umbenennen wird abgelehnt; Migration: angelegte Spalten ohne Typ bekommen den ihrer Noten | Block K |
| K5 | Anwesenheitstabelle: nur leeres Feld löscht, sonst Hinweis „F, E oder Z“ | Block K |
| K6 | Sync bei `visibilitychange` (sichtbar) und `online` | Block K |
| K7 | Master-Passwort dauerhaft im `localStorage` (`loadSavedMasterPassword`/`storeMasterPassword`, übernimmt alten `sessionStorage`-Wert); roter Punkt an „Einstellungen“ + Tooltip (`updateSyncAttention`), Hinweis beim Start, wenn angemeldet ohne Master-Passwort | Block K |
| K8 | Leere Cloud: Upload erst nach Wiederholung des Passworts (`confirmNewMasterPassword`, `canCreateCloud`, Status `confirm_password`) | Block K |
| K9 | `importBackup()`: Rückfrage mit Anzahl Klassen/Schüler, Sync-Stand des Geräts bleibt, Import geht als Änderung in die Cloud | Block K |
| K10 | `persistDB` fängt Fehler ab (`reportSaveFailure`: Toast, einmal Hinweisfenster mit „Exportieren“) | Block K |
| K11 | Konflikt-Fenster: Hauptknopf = Sicherung + Cloud laden, „Version in der Cloud“ statt „Neuere …“ | Block K |
| K12 | `forceAppUpdate` bricht offline ab (`serverReachable`) | Block K |
| K13 | Export: `persistDB()` statt `saveDB()` | Block K |
| K14 | `UnsupportedFormatError(format, 'device')`: eigene Meldung „Gerät zu alt“ | Block K |
| K15 | `clearAllData` entfernt auch `lehrerapp_v3_defekt_*`; `resetViewSelection()` nach Import/Löschen/Cloud-Übernahme (auch M2) | Block K |
| L1 | `refreshStudentViews(groupId)`: Schnellbewertung, Profil (Anwesenheit, Mitarbeit, HA, Schüler löschen) zeichnen Tabelle/Schülerliste/Sitzplan/Dashboard der Klasse neu; `refreshGradeViews` nutzt es | Block L |
| L2 | Anwesenheitstabelle: eine Spalte pro Tag, Bezeichnung der angelegten Spalte steht dabei | Block L |
| L3 | `updateInlineAttendance` und `addAttendanceEntry` pflegen den Hinweis für die nächste Stunde (`addAbsenceNote`/`removeAbsenceNote`) | Block L |
| L4 | `absenceNoteText` ohne führendes Leerzeichen bei nur einem Namen | Block L |
| L5 | „Spalte löschen“ im Spalten-Dialog (`deleteOverviewColumn`) für alle vier Reiter, Rückfrage mit Anzahl, per Referenz; toter Code `editOverviewColumns` entfernt | Block L |
| L6 | Enter/Return in den Tabellen = nächster Schüler in derselben Spalte (Shift = hoch), `enterkeyhint="next"`; unveränderte Zelle speichert nicht | Block L |
| L7 | `setClassViewHeader(g)` auch nach dem Bearbeiten der Klasse | Block L |
| L8 | `saveStudent`: ein Name genügt | Block L |
| L9 | Klassenkarte: Wochentage nur aus regelmäßigen Stunden (`!isOneOffSlot`) | Block L |
| L10 | Schülerakte: `gradeText`, „Punkte“ bei 0–15, Abschnitt „Hausaufgaben vergessen“; Klasse aus `currentGroupId` statt `currentOverviewGroupId` | Block L |
| L11 | CSV über `csvCell()` (Anführungszeichen verdoppelt) | Block L |
| L12 | Avatar: nur Grundfarbe `--avatar` inline, helle/dunkle Töne per `color-mix` in style.css (≥ 6,3:1 statt ~2,5:1) | Block L |
| M1 | `renderScheduleViews()` (Stundenplan + Dashboard) nach Speichern, Ausfall, HA, Stunde ändern/löschen, Einstellungen; Minuten-Timer auch fürs Dashboard; `data-slot` an der Karte „Nächste Stunde“ | Block M |
| M3 | `relatedSlots(slot)`: eine Regel für Vorschläge und Fälligkeit (freie Stunden über den Fachnamen) | Block M |
| M4 | `findUpcomingLessonDates` über `lessonsOnDate`, ohne Ausfall und ersetzte Stunden | Block M |
| M5 | `getIncomingItems`/`dueItemsFor` nur bei eingeschaltetem HA-/Test-Schalter | Block M |
| M6 | Vertretung darf regelmäßige Stunde überlagern, Toast „ersetzt … an diesem Tag“ | Block M |
| M7 | `validFrom`/`validUntil` (`slotValidOn`, `slotRangesOverlap`), `splitSlotFrom`, Auswahl-Fenster `askChoice`; Löschen „ab der Woche beenden“ oder komplett mit Anzahl; beendete Stunden geben ihren Platz frei und fehlen auf der Klassenkarte | Block M |
| M8 | Freie Stunde: „Notenübersicht“/„Schüler bewerten“ ausgeblendet | Block M |
| M9 | „Schüler bewerten“ über `studentListName` | Block M |
| M10 | `renderLessonAbsent()`, auch aus `refreshStudentViews` bei offenem Stunden-Fenster | Block M |
| M11 | `jumpToDate` über `setTimetableDay` (Wochenende → Montag danach) | Block M |
| M12 | Wochenkopf nennt über Neujahr beide Jahre | Block M |
| M13 | `safeColor()`: fehlende/kaputte Farbe → Standardfarbe | Block M |
| M14 | Datums-Picker (Stundenplan, Sitzplan) stehen auf dem angezeigten Datum | Block M |
| M15 | HA/Test im Stunden-Fenster per Referenz löschen | Block M |
| N1 | `seatingLayout()`: Plätze nur für die Anzeige, Überzählige mit Hinweis `#seating-overflow-hint`; `materializeSeatingLayout` erst beim Umordnen | Block N |
| N2 | `saveSeatingGrid`: nur ganze Zahlen 2–20 / 2–6, sonst Hinweis; `seatingGridSize()` für gespeicherte Werte | Block N |
| N3 | `seatingDesk()`: Pult immer ganz im Raster | Block N |
| N4 | Schüler aufs Pult ziehen abgelehnt; Pult auf Schüler: diese bekommen freie Plätze | Block N |
| N5 | `touchcancel` setzt die Karte zurück und entfernt die Listener | Block N |
| N6 | Schnellbewertung markiert den heutigen Stand (`aria-pressed`, `.is-set`); Entfernen per zweitem Tippen mit „Rückgängig“ (`showUndoToast`, `restoreSeatingEntry`, stellt auch den Hinweis für die nächste Stunde wieder her) | Block N |
| N7 | „Neue Note“ mit dem Sitzplan-Datum | Block N |
| N8 | Doppelte Vornamen: „Anna M.“; Tooltip mit vollem Namen | Block N |
| N9 | Klassenwahl: Fach dabei, wenn die Klasse mehrfach vorkommt | Block N |
| N10 | Datums-Chips: Unterrichtstage der Klasse umrandet, andere abgeschwächt | Block N |
| N11 | Datums-Chips und Klassenmenü als `button` mit `aria-label`; Inline-Größen in Klassen, `@media (pointer: coarse)` 44 px | Block N |
| N12 | Timer-Ende: blinkende Anzeige bis „Zurücksetzen“, kurzer Ton (beim Start freigeschaltet); Start bei 00:00 mit Hinweis | Block N |
| N13 | `currentRandomStudent`, `.sc-absent-toggle` entfernt; Note bearbeiten per Referenz; Gruppen „nach Sitznähe“ über `seatOf()` | Block N |
| O1 | `closeModalOnOverlay` schließt nur, wenn auch das Drücken (`pointerdown`/`mousedown`) auf dem Overlay begann | Block O |
| O2 | `cancelSettings()` über `MODAL_CLOSE_ACTIONS` und ✕: Farb-/Radius-Vorschau wird verworfen | Block O |
| O3 | `loadThemeSelection()`: Radius aus db statt vom Regler; Start über `updateAppliedThemeFromDB()` (auch nach Import/Löschen) | Block O |
| O4 | mit M1: Speichern zeichnet Dashboard/Klassenansicht neu | Block M |
| O5 | Sitzplan-Vorlauf leer → 5; Blockzeiten geprüft (Ende nach Beginn, sonst nichts gespeichert); neuer Block nach dem letzten mit gleicher Länge | Block O |
| O6 | Logo öffnet das Dashboard statt neu zu laden | Block O |
| O7 | Handy: Navigation mit gleich breiten Feldern und Beschriftung; Klassenkopf kompakt (Symbol-Knöpfe, Reiter in einer Zeile mit Kurztext) | Block O |
| O8 | Fenster mit `role="dialog"`, `aria-modal`, `aria-labelledby` (`labelModals`); Fokus ins Fenster und zurück (`openModal`/`closeModal`) | Block O |
| P1 | Kein Pull/Konflikt, solange ein Eingabefenster offen ist; danach nachholen (`inputModalOpen`, `syncAfterModalClose`) | Block P |
| P2 | Offene Einstellungen nach Pull neu befüllen (`fillSettingsForm`) | Block P |
| P3 | Block-Migration entfernt | Block P |
| P4 | Konflikt nur nach `dbAtStart`-Prüfung (`showSyncConflict`); Push einer frisch geleerten DB verweigert | Block P |
| P5 | Kein Sync-Abbruch nach 30 s, nur Hinweis (`noticeSlowSync`) | Block P |
| P6 | Leer = leer und ohne Sync-Stand (`isFreshEmptyDB`) | Block P |
| P7 | Sync-Stand mit Konto (`syncSettings.uid`, `syncBaseline`) | Block P |
| P8 | Ausstehender Autosave beim Verlassen sofort (`flushPendingSync`) | Block P |
| P9 | Master-Passwort neu festlegen (`startCloudPasswordReset`, `SyncManager.overwriteCloud`), Login-Passwort vergessen (`resetLoginPassword`) | Block P |
| P10 | „Zuletzt synchronisiert“ aus `lastSyncCheck` | Block P |
| P11 | Rettungskopie wiederverwenden, Download-Angebot bei gesperrtem Speichern | Block P |
| P12 | `block-o.test.js` feuert kein Inline-`onclick` mehr | Block P |
