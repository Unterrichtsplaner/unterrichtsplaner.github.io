# Unterrichtsplaner – Projektwissen für KI-Assistenten

> Diese Datei zuerst lesen. Sie ist das Gedächtnis des Projekts über alle Sitzungen hinweg.
> Offene Fehler und Aufgaben stehen in **[BUGS.md](BUGS.md)**.

## Worum es geht

Offline-fähige PWA für Lehrkräfte: Stundenplan, Klassen, Noten, Anwesenheit, Mitarbeit, Hausaufgaben und Sitzplan. Der Autor ist selbst Lehrer und nutzt die App täglich, die Daten sind **echte Schülerdaten**. Datenverlust ist der schlimmste denkbare Fehler.

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
| `firebase-config.js` | Öffentliche Firebase-Web-Config. Die ist absichtlich öffentlich, Schutz passiert über Firestore-Regeln + E2EE |
| `lib/` | Fremdbibliotheken (vendored). **Nicht anfassen.** |
| `tools.js`, `app.js.bak` | Toter Code (siehe BUGS G8) |

## Datenmodell

Eine einzige globale Variable `db`, gespeichert als JSON in `localStorage['lehrerapp_v3']` über `saveDB()`:

```js
db = {
  settings: { teacherName, school, blocks, lastModified, theme*, warnAbsences, warnGrade, warnHomework,
              studentSortOrder, seatingBufferMins, lastBackupTimestamp, … },
  lessonSlots: [{ id, day /*0=Mo…4=Fr*/, block /*=blocks[].num*/, part /*'first'|'second'|'full'*/,
                  subject, room, color, groupId,
                  recurring /*'weekly'|'biweekly'|'none' (Altdaten: true/false)*/, startWeek, specificDate }],
  lessonData: { '<slotId>_<YYYY-MM-DD>': { done, notes, ausfall, hwEnabled, testEnabled, … } },
  groups: [{ id, subject, className, year, color, schularbeitWeight /*0–100*/,
             seatingRows, seatingCols, teacherDeskX, teacherDeskY, seatingPlan: [{ studentId, … }],
             gradeEvents, attendanceEvents, participationEvents, homeworkEvents }],
  students: { '<groupId>': [{ id, firstName, lastName,
             grades: [{ type, value /*String!*/, date, note }],
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
- In app.js läuft immer nur ein Sync gleichzeitig (`syncRunning`/`syncQueued`). Ist ein Konflikt offen (`window.currentConflict`), pausiert der Auto-Sync.

Datumswerte sind Strings `YYYY-MM-DD` in **lokaler** Zeit (`formatDate()`). Nie `toISOString()` für Datumsstrings verwenden, und `new Date('YYYY-MM-DD')` nur mit `+ 'T12:00:00'`.

## Regeln (aus Fehlern gelernt)

1. **Notendurchschnitt nur über `calculateStudentAverage(student, groupId)`.** Keine eigenen Rechnungen in Views.
2. **`lastModified` bedeutet „Nutzer hat Daten geändert“.** Nutzeränderungen → `saveDB()`. Alles andere (Sync-Metadaten, Migrationen) → `persistDB()`. `saveDB()` nie in Render-Funktionen aufrufen.
3. **Alles, was in `innerHTML` oder in `onclick="…"` landet und vom Nutzer stammt, geht durch `escHtml()`.** Namen, Spaltentitel, Notenwerte, Notizen.
4. **Einträge nie per Index aus einer sortierten Kopie löschen.** Immer per `id` oder Objekt-Referenz.
5. **Zweiwöchige Stunden nicht über `Kalenderwoche % 2` berechnen** (Jahre mit KW 53).
6. **Jede aufgerufene Funktion und jede `getElementById`-ID muss existieren.** Nach Umbauen mit grep gegenprüfen.
7. **Keine stillen Fallbacks auf leere Daten.** Lieber Fehler anzeigen als echte Daten überschreiben.
8. **Kleine Schritte.** Pro Änderung ein Thema; kein „nebenbei noch schnell“ in anderen Bereichen.

## Arbeitsablauf

1. Aufgabe aus `BUGS.md` wählen (ein Block pro Sitzung).
2. **Zuerst einen Test schreiben, der den Fehler zeigt** (`tests/`), dann reparieren.
3. `npm test` muss grün sein.
4. `npm run bump`, sonst sehen installierte Apps die Änderung nie.
5. In `BUGS.md` abhaken und neue Erkenntnisse hier in „Regeln“ ergänzen.
6. Commit auf einem Branch. **Mergen/Pushen auf `main` = live für alle Geräte**, nur nach Rückfrage.

Änderungen am Datenmodell brauchen eine Migration in `loadDB()`, damit bestehende Daten weiter funktionieren. Vorher daran denken, dass der Nutzer ein Backup (Export) hat.

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
