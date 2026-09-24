# Bekannte Fehler & Aufgaben

Stand: Code-Review vom 23.09.2026. Zeilennummern beziehen sich auf diesen Stand und verrutschen mit der Zeit – im Zweifel nach dem Funktionsnamen suchen.

**Arbeitsweise:** Ein Block pro Sitzung. Für jeden Fix zuerst einen Test schreiben, der den Fehler zeigt, dann reparieren und hier abhaken (`[x]` + Commit-Hash).

Priorität: 🔴 Datenverlust / App kaputt · 🟠 falsche Anzeige / nervig · 🟢 Kleinkram

---

## A. Cloud-Sync

> Behoben bis auf A7 und A9 (gemeinsam angehen: ein neues Cloud-Format statt zwei Migrationen). Tests: `tests/sync.test.js`. Einmaliger Effekt nach dem Update: Geräte mit altem Sync-Stand melden beim ersten Sync evtl. einmal einen Konflikt (alte Daten kennen `syncedLocalModified` noch nicht).

- [x] **A1** 🔴 `saveDB(true)` setzt `lastModified` neu, auch direkt nach Upload/Pull/„no_change“ (`saveDB`, `triggerSyncInternal`, `resolveConflict`). Folge: Gerät gilt immer als „lokal geändert“ → falsche Konflikte, sobald ein zweites Gerät synct.
- [x] **A2** 🔴 Neues Gerät (leere DB, `lastSynced = 0`) → immer Konflikt, leere lokale Version wird als „(aktueller)“ angezeigt. „Hochladen“ überschreibt die Cloud mit nichts. (`triggerSyncInternal`, Konflikt-Modal ~Z. 4067)
- [x] **A3** 🔴 Master-Passwort wird nie gegen die Cloud geprüft und per `oninput` bei jedem Tastendruck übernommen (index.html ~Z. 912). Tippfehler → Autosave verschlüsselt die Cloud mit falschem Passwort, andere Geräte kommen nicht mehr ran.
- [x] **A4** 🔴 Keine Sperre gegen parallele Syncs; ein Pull überschreibt `db` ohne zu prüfen, ob während des `await` lokal etwas eingetragen wurde → Eingaben gehen verloren.
- [x] **A5** 🔴 `clearAllData()` (~Z. 2459): Reste von Export-Code (`a`, `url` undefiniert) → ReferenceError. Leere DB geht beim nächsten Speichern als „neuester Stand“ in die Cloud.
- [x] **A6** 🟠 Konflikt-Modal öffnet sich bei jeder Eingabe neu (Autosave läuft weiter, während ein Konflikt offen ist).
- [ ] **A7** 🟠 Schwache Verschlüsselung: CryptoJS-Passphrase-Modus = MD5, 1 Iteration (`crypto-helper.js`). Ersetzen durch WebCrypto (PBKDF2 ≥ 200k + AES-GCM) – mit Migration der bestehenden Cloud-Daten!
- [ ] **A9** 🔴 Firestore-Dokumente dürfen max. 1 MB groß sein; die ganze DB liegt verschlüsselt (≈ +37 %) in EINEM Dokument. Schätzung für 8 Klassen × 25 Schüler × 1 Schuljahr: ≈ 1,9 MB → Sync scheitert im Laufe des Schuljahres. Fix: vor dem Verschlüsseln komprimieren (`CompressionStream('gzip')`, ~10×), zusammen mit A7 als neues Format v2 (Kennung im Dokument, alte Daten weiter lesbar). Zusätzlich Größe vor dem Upload prüfen und verständlich warnen.
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

- [ ] **D1** 🔴 A/B-Woche über `Kalenderwoche % 2` (~Z. 275, 654, 2510). 2026 hat KW 53 → **ab 04.01.2027 sind alle zweiwöchigen Stunden vertauscht.** Parität über Wochen seit festem Referenz-Montag berechnen.
- [ ] **D2** 🔴 Einmalige Stunde bekommt den Montag der Woche statt des gewählten Tages (~Z. 578–594) → unsichtbar, nicht mehr lösch-/editierbar, blockiert den Block.
- [ ] **D3** 🔴 Überschneidungsprüfung ignoriert Datum und A/B-Woche (~Z. 555) → Vertretung sperrt Block für immer; A- und B-Woche im selben Block unmöglich.
- [ ] **D4** 🔴 Zeitblock löschen nummeriert Blöcke neu, Stunden behalten alte Nummer → alles rutscht (~Z. 2356).
- [ ] **D5** 🟠 `getBlocks()` gibt die Konstante `DEFAULT_BLOCKS` selbst zurück → Einstellungen „Abbrechen“ verwirft nichts (~Z. 87).
- [ ] **D6** 🟠 Stunde auf anderen Wochentag verschieben → alte Notizen/HA (`lessonData[slotId_Datum]`) nicht mehr erreichbar.
- [ ] **D7** 🟢 Titel zeigt alten Fachnamen nach Umbenennen der Klasse (~Z. 725).
- [ ] **D8** 🟢 Bei > 6 Blöcken wird der Plan abgeschnitten (`overflow:hidden`, ~Z. 227).
- [ ] **D9** 🟢 Nicht per „+“ übernommene HA/Test-Eingaben gehen beim Speichern still verloren (~Z. 898).
- [ ] **D10** 🟢 `new Date('YYYY-MM-DD')` wird als UTC geparst (~Z. 177, 2627) – in AT/DE harmlos.

## E. Sitzplan

- [ ] **E1** 🟠 „Sitzplan öffnen“ zeigt während laufender Stunde die falsche Klasse (`initSeatingPlan` überschreibt gewählte Gruppe).
- [ ] **E2** 🟠 Datum bleibt über Nacht stehen (App offen) → Einträge landen am Vortag (~Z. 2521).
- [ ] **E3** 🟠 Lehrerpult springt beim Ziehen eine Spalte nach rechts (~Z. 3270).
- [ ] **E4** 🟠 „Hinweis für nächste Stunde“ ignoriert A/B-Woche; Entfernen sucht anders als Eintragen; nur Vorname → zwei „Anna“ kollidieren (~Z. 3108–3164).
- [ ] **E5** 🟠 `currentGradeFormCtx` wird nach Schließen nicht zurückgesetzt → altes Modal öffnet sich später erneut.
- [ ] **E6** 🟢 Zufallsauswahl: Doppelklick startet zwei Animationen; Gruppenbildung mischt ungleichmäßig, letzte Gruppe kann 1 Person haben.

## F. Sicherheit (XSS)

- [ ] **F1** 🟠 `escHtml` escaped keine `'` und `"` → Spaltennamen wie „Peter's Test“ zerstören `onclick`-Handler; mit präparierten Namen läuft fremdes JavaScript. Außerdem ungeschützt: `g.value` (~Z. 1952, 3347), `participation.value` (~Z. 2865), `desc` (~Z. 2058). Über Import/Sync können solche Werte auf andere Geräte kommen.

## G. PWA, Oberfläche, Aufräumen

- [x] **G1** 🟠 Versionsnummern an drei Stellen von Hand → jetzt `npm run bump` + Test `tests/pwa-cache.test.js`.
- [ ] **G2** 🟠 `index.html` wird cache-first ausgeliefert → Updates nur über neue SW-Version. Besser: Navigation network-first mit Cache-Fallback.
- [ ] **G3** 🟠 Undefinierte CSS-Variablen: `--border-color`, `--radius`, `--bg-hover`, `--accent-rgb`, `--success-soft`, `--warning-soft`.
- [ ] **G4** 🟠 Zoom gesperrt (`user-scalable=no`, `touch-action`) – Barrierefreiheit.
- [ ] **G5** 🟠 iOS-Icon ist SVG (wird nicht unterstützt) → PNG 180×180. Manifest: PNG 192/512, Farben/Namen angleichen.
- [ ] **G6** 🟢 Timer zählt Ticks statt Uhrzeit → geht nach, wenn iPad gesperrt war (~Z. 3948).
- [ ] **G7** 🟢 Escape schließt nicht alle Modals; Icon-Buttons ohne `aria-label`.
- [ ] **G8** 🟢 `tools.js` ist toter Code (Duplikat, nirgends eingebunden) → löschen. `app.js.bak` löschen.
- [ ] **G9** 🟢 SW-`fetch` fängt auch POST/Fremd-Domains ab; `forceAppUpdate` wartet nicht auf `caches.delete`.
- [ ] **G10** 🟢 Kommentar „HIER BITTE DEINE E-MAIL-ADRESSE EINTRAGEN“ in index.html ~Z. 949.
- [ ] **G11** 🟢 `server.js`: Pfadprüfung per `startsWith` unsauber, liefert `.git/` aus (nur Dev-Server).
- [ ] **G12** 🟢 `loadDB()` verschluckt JSON-Fehler und startet mit leerer DB → nächstes Speichern überschreibt die kaputten (evtl. rettbaren) Daten.

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
