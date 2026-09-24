# Unterrichtsplaner – Projektwissen für KI-Assistenten

> Diese Datei zuerst lesen. Sie ist das Gedächtnis des Projekts über alle Sitzungen hinweg.
> Offene Fehler und Aufgaben stehen in **[BUGS.md](BUGS.md)**.

## Worum es geht

Offline-fähige PWA für Lehrkräfte: Stundenplan, Klassen, Noten, Anwesenheit, Mitarbeit, Hausaufgaben und Sitzplan. Der Autor ist selbst Lehrer und nutzt die App täglich, die Daten sind **echte Schülerdaten**. Datenverlust ist der schlimmste denkbare Fehler.

**Die App wird auch von anderen Lehrkräften genutzt** (über dieselbe GitHub-Pages-Adresse und dasselbe Firebase-Projekt). Jedes Update muss für sie ohne Anleitung funktionieren: keine unerwarteten Dialoge, alte Daten (lokal wie in der Cloud) immer lesbar.

Zielgruppe: Lehrkräfte in **Deutschland** (Noten 1–6, „Klassenarbeit“). Der interne Notentyp heißt aus historischen Gründen `schularbeit`; in der Oberfläche heißt er „Klassenarbeit“.

Gehostet auf GitHub Pages (`unterrichtsplaner.github.io`). Was auf `main` liegt, ist sofort live.

## Architektur

Kein Framework, kein Build-Schritt. `index.html` lädt die Skripte in dieser Reihenfolge, alle teilen sich den globalen Scope:

```
lib/crypto-js.min.js → crypto-helper.js → lib/firebase-*-compat.js → firebase-config.js → sync-manager.js → app.js
```

| Datei | Inhalt |
|---|---|
| `app.js` (~4300 Z.) | Fast die ganze App: State, Rendering (HTML-Strings per `innerHTML`), alle Event-Handler (inline `onclick` in index.html → globale Funktionen) |
| `index.html` | Gesamtes Markup inkl. aller Modals (`modal-*`) und Views (`view-dashboard/timetable/classes/students/seating`) |
| `sync-manager.js` | Firebase-Auth + Firestore, Sync-Entscheidung (`decideSync`), Passwort-Probe, Upload per Transaktion |
| `crypto-helper.js` | E2EE: verschlüsselt die komplette DB mit dem Master-Passwort, bevor sie in die Cloud geht |
| `sw.js` | Service Worker, cache-first. Cache-Liste `ASSETS` muss exakt zu den URLs in index.html passen |
| `firestore.rules` | Kopie der Firestore-Sicherheitsregeln (jeder Nutzer nur sein eigenes Dokument). Änderungen hier **und** in der Firebase-Konsole machen |
| `firebase-config.js` | Öffentliche Firebase-Web-Config. Die ist absichtlich öffentlich, Schutz passiert über Firestore-Regeln + E2EE |
| `lib/` | Fremdbibliotheken (vendored). **Nicht anfassen.** |
| `tools.js`, `app.js.bak` | Toter Code (siehe BUGS G8) |

## Datenmodell

Eine einzige globale Variable `db`, gespeichert als JSON in `localStorage['lehrerapp_v3']` über `saveDB()`:

```js
db = {
  settings: { teacherName, school, blocks, lastModified, theme*, warnAbsences, warnGrade, warnPoints, warnHomework,
              studentSortOrder, seatingBufferMins, lastBackupTimestamp, … },
  lessonSlots: [{ id, day /*0=Mo…4=Fr*/, block /*=blocks[].num, feste Kennung*/, part /*'first'|'second'|'full'*/,
                  subject, room, color, groupId,
                  recurring /*'weekly'|'biweekly'|'none' (Altdaten: true/false)*/,
                  startDate /*biweekly: Datum in einer A-Woche*/, startWeek /*veraltet, nur für alte App-Versionen*/,
                  specificDate /*einmalig, liegt immer auf `day`*/ }],
  lessonData: { '<slotId>_<YYYY-MM-DD>': { done, notes, ausfall, hwEnabled, testEnabled, … } },
  groups: [{ id, subject, className, year, color, schularbeitWeight /*0–100*/, gradeScale /*'1-6' (Standard, fehlt bei Altdaten) | '0-15'*/,
             seatingRows, seatingCols, teacherDeskX, teacherDeskY, seatingPlan: [{ studentId, … }],
             gradeEvents, attendanceEvents, participationEvents, homeworkEvents }],
  students: { '<groupId>': [{ id, firstName, lastName,
             grades: [{ type, value /*String! '2.0', '2-' (Tendenz), '+' (zählt nicht)*/, date, note }],
             attendance: [{ id?, date, type, note }],
             participation: [{ id?, date, value, label? }],
             homework: [{ id, date, note }],
             studentNotes: [{ text, date }] }] },
  syncSettings: { lastSyncedCloudTimestamp, syncedLocalModified },
  acknowledgedWarnings: { '<studentId>_absences': n, … },
}
```

### Cloud-Sync (so funktioniert er)

- Die Cloud (Firestore `users_data/<uid>`) hält **einen** verschlüsselten Gesamtstand + `lastModified` als **Versionskennung**.
- Lokal merkt sich `db.syncSettings`: `lastSyncedCloudTimestamp` (welche Cloud-Version zuletzt übereinstimmte) und `syncedLocalModified` (welches lokale `lastModified` dazu gehörte).
- „Cloud geändert“ = `cloudTimestamp !== lastSyncedCloudTimestamp`, „lokal geändert“ = `lastModified !== syncedLocalModified` (`isLocalDBChanged()`). **Nur Gleichheit, nie größer/kleiner**, denn die Uhren verschiedener Geräte sind nicht vergleichbar.
- Die Entscheidung trifft `decideSync()` in `sync-manager.js`. Das ist eine reine Funktion mit Tabellen-Test. Ein leeres Gerät lädt nie hoch.
- Vor jeder Aktion werden die Cloud-Daten mit dem Master-Passwort entschlüsselt (Passwort-Probe). Hochgeladen wird per Firestore-Transaktion, nur wenn die Cloud noch auf dem erwarteten Stand ist (`CloudChangedError`).
- Cloud-Format steht im Dokument (`format`): fehlt = v1 (CryptoJS, nur noch lesen), `2` = gzip + AES-GCM, PBKDF2-Schlüssel (`salt`, `iv`, `iterations`, `compression`). Ver-/Entschlüsselung ist **async** (`CryptoHelper.encryptPayload`/`decryptPayload`). Ein neues Format braucht eine neue Nummer; alte Versionen melden dann „neuere App-Version“ statt „falsches Passwort“.
- Firestore-Limit: 1 MiB pro Dokument, die ganze DB liegt in einem Dokument. `_buildDoc()` prüft die Größe vor jedem Schreiben (`CLOUD_MAX_BYTES`), ab `CLOUD_WARN_BYTES` wird gewarnt.
- Ist ein Stand beidseitig „geändert“, aber inhaltlich gleich (`cloudMatchesLocal`), gibt es keinen Konflikt.
- In app.js läuft immer nur ein Sync gleichzeitig (`syncRunning`/`syncQueued`). Ist ein Konflikt offen (`window.currentConflict`), pausiert der Auto-Sync.

Datumswerte sind Strings `YYYY-MM-DD` in **lokaler** Zeit (`formatDate()`). Nie `toISOString()` für Datumsstrings verwenden, und `new Date('YYYY-MM-DD')` nur mit `+ 'T12:00:00'`.

## Regeln (aus Fehlern gelernt)

1. **Notendurchschnitt nur über `calculateStudentAverage(student, groupId)`** (Klassenschnitt: `calculateGroupAverage`). Keine eigenen Rechnungen in Views. Notenwerte nie mit `parseFloat` lesen, sondern mit `gradeNumber()` (versteht „2-“); Eingaben über `parseGradeInput()`; Schularbeit vs. Sonstige nur über `gradeCategory()`.
   **Jede Klasse hat ihre Notenskala** (`gradeScale(group)`: 1–6 oder 0–15 Punkte, höher = besser). Eingabe, Farbe und Warnung immer mit der Skala der Klasse: `parseGradeInput(v, scale)`, `gradeColor(v, scale)`. Nie „kleiner = besser“ annehmen.
2. **`lastModified` bedeutet „Nutzer hat Daten geändert“.** Nutzeränderungen → `saveDB()`. Alles andere (Sync-Metadaten, Migrationen) → `persistDB()`. `saveDB()` nie in Render-Funktionen aufrufen.
3. **Alles, was in `innerHTML` oder in `onclick="…"` landet und vom Nutzer stammt, geht durch `escHtml()`.** Namen, Spaltentitel, Notenwerte, Notizen.
4. **Einträge nie per Index aus einer sortierten Kopie löschen.** Immer per `id` oder Objekt-Referenz.
5. **Ob eine Stunde an einem Datum stattfindet, nur über `slotOccursOn(slot, dateStr)` / `lessonsAt(dateStr, block)`**, Überschneidungen über `slotsShareDate`. Nie über `Kalenderwoche % 2` (Jahre mit KW 53).
6. **Jede aufgerufene Funktion und jede `getElementById`-ID muss existieren.** Nach Umbauen mit grep gegenprüfen.
7. **Keine stillen Fallbacks auf leere Daten.** Lieber Fehler anzeigen als echte Daten überschreiben.
8. **Formulare merken sich den bearbeiteten Eintrag per Objekt-Referenz, nicht per Index.** Zwischen Öffnen und Speichern kann sich die Liste ändern (Sync, andere Ansicht).
9. **Listen-Einträge in Render-Funktionen nicht über `onclick="f(${i})"` löschen**, sondern per Closure mit dem Objekt (`el.querySelector(…).onclick = () => f(entry)`), und in `f` mit `indexOf(entry)` suchen; `-1` (z. B. nach Sync) heißt: nichts löschen.
10. **Wer etwas löscht, räumt Abhängiges mit auf** (Klasse → Stunden → `lessonData`) und prüft, ob die aktuelle Ansicht/Auswahl (`currentGroupId`, `currentOverviewGroupId`, `currentSeatingGroupId`) noch gültig ist.
11. **Kleine Schritte.** Pro Änderung ein Thema; kein „nebenbei noch schnell“ in anderen Bereichen.
12. **Block-Nummern (`blocks[].num`) sind Kennungen, auf die Stunden verweisen.** Nie umnummerieren; Blöcke mit Stunden nicht löschen.
13. **`lessonData`-Schlüssel hängen am Datum** (`slotId_YYYY-MM-DD`). Wer Tag/Datum einer Stunde ändert, verschiebt sie mit (`moveLessonData`).
14. **Datumsstrings mit `parseDate()` lesen** (lokal, mittags), rechnen mit `addDays`/`mondayOf`.
15. **Cloud-Daten, die andere Geräte schreiben, immer abwärtskompatibel lesen.** Andere Lehrkräfte haben evtl. noch eine alte App-Version; Formatwechsel nur mit Kennung im Dokument, altes Format weiter lesen, und nie „kann ich nicht lesen“ als „falsches Passwort“ behandeln.
16. **Noten sind im Unterricht vertraulich.** Ansichten, die am Pult/Beamer offen sind (Sitzplan), zeigen Noten nur auf Knopfdruck; der Zustand wird nie gespeichert.
17. **Schultage sind Mo–Fr.** Datums-Sprünge und -Leisten über `isSchoolDay`/`nextSchoolDay`/`addSchoolDays`, nicht über `addDays(d, 1)`.
18. **Inline-`onclick` in index.html wird im Test (jsdom) nicht ausgeführt**, weil app.js nicht im Fenster-Kontext läuft. Im Test die Funktion per `app('f()')` aufrufen und das Attribut separat prüfen.
19. **Event-Handler, die der Test auslösen soll** (z. B. `toggle` an `<details>`), nach dem `innerHTML` per `addEventListener` anhängen, nicht als Inline-Attribut. Ansichtszustand wie „Gruppe aufgeklappt“ in einer Modul-Variable halten, nie in `db`.
20. **Stundenplan hat zwei Modi:** unter 700 px (`isTimetableDayView()`) die Tagesansicht (`timetableDay`), sonst die Woche (`currentWeekOffset`). Wer das Datum ändert, geht über `setTimetableDay`/`navigateWeek`/`jumpToDate`, damit beide zusammenpassen. Zellen nur über `buildTimetableCell` bauen. Im Test Breite per `window.innerWidth = 400` setzen.
21. **Zeitabhängige Anzeigen (laufende/nächste Stunde) bekommen die Uhrzeit als Parameter** (`timetableClock(now)`, `findNextLesson(now)`) und werden per Timer neu gezeichnet (`refreshTimetableClock`). Im Test `vi.useFakeTimers({ toFake: ['Date'] })` + `vi.setSystemTime(…)`.

## Arbeitsablauf

1. Aufgabe aus `BUGS.md` wählen (ein Block pro Sitzung).
2. **Zuerst einen Test schreiben, der den Fehler zeigt** (`tests/`), dann reparieren.
3. `npm test` muss grün sein.
4. `npm run bump`, sonst sehen installierte Apps die Änderung nie.
5. In `BUGS.md` abhaken und neue Erkenntnisse hier in „Regeln“ ergänzen.
6. Commit auf einem Branch. **Mergen/Pushen auf `main` = live für alle Geräte**, nur nach Rückfrage.

**So kommt ein Update bei Nutzern an** (in der Generalprobe am 24.09.2026 beobachtet): Beim **ersten** Öffnen nach dem Deploy läuft noch die alte Version aus dem Cache (inklusive ihrer alten Fehler, auch Sync). Der neue Service Worker installiert sich dabei im Hintergrund, und ab dem **zweiten** Öffnen läuft die neue Version. Neuer Code muss deshalb immer mit Daten klarkommen, die die alte Version gerade noch geschrieben hat.

Änderungen am Datenmodell brauchen eine Migration in `migrateDB()` (läuft in `loadDB()`, beim Import und bei der Cloud-Übernahme; muss beliebig oft laufen dürfen und setzt kein `lastModified`), damit bestehende Daten weiter funktionieren. Vorher daran denken, dass der Nutzer ein Backup (Export) hat.

## Tests

```bash
npm install     # einmalig
npm test        # alle Tests (Vitest + jsdom)
npm run serve   # lokaler Server auf http://localhost:3000
```

- `tests/setup.js` baut die Browser-Umgebung nach: `index.html`-Body, SyncManager-Attrappe, leeres localStorage.
- `tests/helpers/load-app.js`: `loadApp()` lädt app.js wie ein `<script>`-Tag, `app('ausdruck')` greift auf globale Funktionen/State zu, z. B. `app('db')`, `app('switchView("seating")')`.
- `tests/helpers/fake-firebase.js`: Firestore-Attrappe. `tests/sync.test.js` simuliert damit ein zweites Gerät, Wettläufe und falsche Uhren.
- `tests/pwa-cache.test.js` prüft, dass Service-Worker-Cache und index.html zusammenpassen.
