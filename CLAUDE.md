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
| `sw.js` | Service Worker: die Seite (index.html) network-first mit Cache-Fallback, alle anderen eigenen Dateien cache-first. Cache-Liste `ASSETS` muss exakt zu den URLs in index.html passen |
| `firestore.rules` | Kopie der Firestore-Sicherheitsregeln (jeder Nutzer nur sein eigenes Dokument). Änderungen hier **und** in der Firebase-Konsole machen |
| `firebase-config.js` | Öffentliche Firebase-Web-Config. Die ist absichtlich öffentlich, Schutz passiert über Firestore-Regeln + E2EE |
| `lib/` | Fremdbibliotheken (vendored). **Nicht anfassen.** |
| `server.js` | Nur Dev-Server (`npm run serve`), liefert keine versteckten Dateien aus |

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
                  specificDate /*einmalig, liegt immer auf `day`*/,
                  validFrom, validUntil /*optional, YYYY-MM-DD inkl.: Stundenplanwechsel „ab dieser Woche“*/ }],
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
- Sync läuft nach jeder Eingabe (3 s später), beim Login, beim Zurückkehren in die App (`visibilitychange`) und bei `online`.
- Das Master-Passwort liegt dauerhaft im `localStorage` (`sync_master_password`, bewusst: die Daten liegen dort ohnehin im Klartext). Nur über `storeMasterPassword()` setzen/löschen; Abmelden und falsches Passwort löschen es.
- „Leeres Gerät“ (lädt nie hoch, holt immer) heißt: leer **und** ohne Sync-Stand dieses Kontos (`isFreshEmptyDB`, `syncBaseline`). Wer alle Klassen einzeln löscht, hat einen Sync-Stand, und die Löschung geht in die Cloud. `syncSettings.uid` merkt sich das Konto; ein anderes Konto zählt wie „nie synchronisiert“.
- Solange ein Eingabefenster offen ist (`inputModalOpen`: alles außer Einstellungen und Konflikt-Dialog), übernimmt der Sync keinen Cloud-Stand und meldet keinen Konflikt; `closeModal` holt das nach (`syncAfterModalClose`). Offene Einstellungen werden nach einem Pull neu befüllt (`fillSettingsForm`). Konflikte meldet nur `triggerSyncInternal` (`showSyncConflict`), nicht der Rückruf des SyncManagers.
- Ein Sync wird nie abgebrochen (nach 30 s nur ein Hinweis), sonst schreibt er trotzdem, ohne dass das Gerät es sich merkt. Beim Verlassen der App geht ein wartender Autosave sofort raus (`flushPendingSync`).
- Master-Passwort vergessen/ändern: `startCloudPasswordReset` → `SyncManager.overwriteCloud` (Cloud = Daten dieses Geräts, neues Passwort zweimal eingegeben, nie von einem leeren Gerät).
- In eine **leere** Cloud wird erst hochgeladen, wenn das Master-Passwort ein zweites Mal gleich eingegeben wurde (`newCloudPasswordConfirmed()`, Status `confirm_password`, gemerkt in `sync_master_password_confirmed`). Ein Tippfehler würde sonst alle Geräte aussperren. Die Frage kommt schon beim Einrichten (auch bei leerem Gerät) und beim Autosave sichtbar (T2).
- Vor jedem Upload merkt sich das Gerät, was es hochlädt (`syncSettings.pendingUpload`, SHA-256). Kam die Antwort nie an, erkennt der nächste Sync den eigenen Stand in der Cloud wieder (`ownUpload` → `recovered`), statt einen Konflikt gegen die eigenen Daten zu melden (T4).
- Gehören die lokalen Daten laut `syncSettings.uid` zu einem anderen Konto, fragt der Sync vorher (übernehmen / vom Gerät löschen, `askAboutForeignAccountData`). Abmelden fragt, ob die Daten auf dem Gerät bleiben (T6).
- Beim Verlassen der App (`onAppHidden`) wird ein offenes Stunden-Fenster übernommen, dann der wartende Autosave gesendet.

Datumswerte sind Strings `YYYY-MM-DD` in **lokaler** Zeit (`formatDate()`). Nie `toISOString()` für Datumsstrings verwenden, und `new Date('YYYY-MM-DD')` nur mit `+ 'T12:00:00'`.

## Regeln (aus Fehlern gelernt)

1. **Notendurchschnitt nur über `calculateStudentAverage(student, groupId)`** (Klassenschnitt: `calculateGroupAverage`). Keine eigenen Rechnungen in Views. Notenwerte nie mit `parseFloat` lesen, sondern mit `gradeNumber()` (versteht „2-“); Eingaben über `parseGradeInput()`; Schularbeit vs. Sonstige nur über `gradeCategory()`. Angezeigt werden Noten mit Komma (`formatGradeAverage`, `gradeText`), gespeichert mit Punkt. `gradeTypeLabel()` ist auch Zuordnungsschlüssel für Noten ohne Titel, nie umbenennen; für Anzeigetexte `gradeTypeName()`.
   **Jede Klasse hat ihre Notenskala** (`gradeScale(group)`: 1–6 oder 0–15 Punkte, höher = besser). Eingabe, Farbe und Warnung immer mit der Skala der Klasse: `parseGradeInput(v, scale)`, `gradeColor(v, scale)`. Nie „kleiner = besser“ annehmen.
2. **`lastModified` bedeutet „Nutzer hat Daten geändert“.** Nutzeränderungen → `saveDB()`. Alles andere (Sync-Metadaten, Migrationen) → `persistDB()`. `saveDB()` nie in Render-Funktionen aufrufen.
3. **Alles, was in `innerHTML` landet und aus den Daten stammt (auch IDs, Farben, Blocknamen), geht durch `escHtml()`.** Argumente in Inline-Handlern dagegen **nur über `jsArg()`**: `onclick="f(${jsArg(x)})"`, ohne eigene Anführungszeichen. `'${escHtml(x)}'` reicht dort nicht, weil der Browser `&#39;` vor dem Ausführen wieder zu `'` macht. `tests/xss.test.js` rendert alle Ansichten mit präparierten Daten. Wer eine neue Ansicht baut, nimmt sie dort auf. Umgekehrt nie fertiges Markup escapen (z. B. Nachschlagetabellen wie `valLabels` mit `<span>`): nur den Rohwert, `labels[v] || escHtml(v)`, sonst steht der Quelltext auf dem Bildschirm (F2).
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
22. **Symbole nur als Linien-Icons aus `ICONS` (app.js):** in app.js `icon('name')`, in index.html `<i data-icon="name"></i>` (ersetzt `fillIcons()` beim Start). Keine Emojis in Knöpfen, Reitern, Überschriften; Ausnahme 😊😐☹️ bei der Mitarbeit. Texte in `alert`/`confirm`/Toasts sind davon ausgenommen (können kein SVG). `tests/icons.test.js` prüft das.
23. **Unlesbare gespeicherte Daten nie überschreiben.** `loadDB()` legt sie als `lehrerapp_v3_defekt_<Zeit>` ab und meldet das (`dbLoadFailure`); klappt die Kopie nicht, blockiert `persistDB()`, bis der Nutzer die Datei heruntergeladen hat.
24. **Gewählte Daten/Ansichten verfallen über Nacht.** Ein im Sitzplan gewähltes Datum gilt nur am Tag der Wahl (`setSeatingDate`/`refreshSeatingDate`); wer Einträge mit einem gemerkten Datum anlegt, prüft vorher, ob inzwischen ein neuer Tag ist. Wer eine Ansicht gezielt für eine Klasse öffnet, übergibt sie (`openSeatingForGroup(groupId, dateStr)`), statt eine globale Variable zu setzen, die die Ansicht beim Öffnen wieder überschreibt.
25. **Automatische Notiz-Zeilen (z. B. „… hat letzte Stunde unentschuldigt gefehlt“) mit vollem Namen schreiben und zeilenweise entfernen**, nie per `replace` auf dem ganzen Text; Eintragen und Entfernen über dieselben Hilfsfunktionen (`addAbsenceNote`/`removeAbsenceNote`).
26. **Eigene Skripte/Stylesheets in index.html immer mit `?v=N`** (nur `lib/` nicht). index.html kommt online frisch vom Server; eine Datei ohne Versionsnummer käme noch aus dem alten Cache, und neues `app.js` liefe mit altem `sync-manager.js`. Die frische index.html nie in den Cache legen. `tests/pwa-cache.test.js` prüft das.
27. **Escape und Tippen neben ein Fenster schließen es wie sein Schließen-Knopf** (`closeModalLikeButton`; Escape nur das oberste, `closeTopModal`). Neue Fenster: Overlay mit `onclick="closeModalOnOverlay(event,'modal-…')"` und sonst nichts. Braucht ein Fenster beim Schließen mehr als `closeModal` (speichern, Kontext zurücksetzen) oder darf es nicht weggedrückt werden, in `MODAL_CLOSE_ACTIONS` eintragen. Schließen darf nie eingetippte Daten verwerfen. Knöpfe ohne Text bekommen ein `aria-label` (`tests/accessibility.test.js`).
28. **Laufende Zeiten (Timer, Stoppuhr, Countdowns) über `Date.now()` rechnen, nie Ticks zählen.** Intervalle stehen still, solange das iPad gesperrt ist.
29. **CSS-Variablen nur verwenden, wenn sie in `style.css` definiert sind** (`tests/css-vars.test.js`). Bei Farbe mit Transparenz eine fertige Variable (`--accent-glow`, `--danger-soft` …) nehmen, keine `rgba(var(--…-rgb))`.
30. **`#main-content` hat 800 px Mindestbreite, außer für die Ansichten in der `:has`-Ausnahme** (inzwischen alle: Stundenplan, Dashboard, Klassen, Klassenansicht, Sitzplan; `style.css`). Die 800 px gelten damit nur noch für Browser ohne `:has` bzw. (Sitzplan) ohne Container-Queries. Layout-Stufen lieber per `@container` an der Breite der Ansicht ausrichten als per `@media` an der des Bildschirms (Seitenleiste, Split View). Layout gehört in `style.css`, nicht in Inline-Stile: ein Inline-Wert schlägt jede Stufe. Eine neue oder umgebaute Ansicht bei 375, 640 und 768 px im Browser nachmessen (`document.getElementById('app').scrollWidth` ≤ Breite) und dann in die Ausnahme aufnehmen. Vorsicht: Die Mindestbreite versteckt Layoutfehler, z. B. `margin:0 auto` in einer Flex-Spalte ohne `width:100%`. Zum Nachmessen vorher `npm run bump`, sonst liefert der Service Worker alten Code.
31. **Jede Ansicht braucht einen eigenen Scrollbereich.** `.view` hat `overflow:hidden`; was unter dem Kopf steht, muss in einem Element mit `flex:1; min-height:0; overflow-y:auto` liegen (z. B. `.dashboard-scroll`), sonst ist alles unterhalb des Bildschirms unerreichbar. Karten nie mit fester Höhe/`aspect-ratio` **und** `overflow:hidden`: längere Namen schneiden dann Knöpfe ab. Lieber `min-height`.

32. **Wer die ganze `db` ersetzt** (Import, „Alle Daten löschen“, Cloud-Übernahme, anderes Fenster), geht über `replaceDB(neu)` (zeichnet alles neu, ruft `resetViewSelection()`); Löschen über `wipeLocalData()`. **Wer über ein `await` hinweg mit `db` arbeitet**, merkt sich `const dbAtStart = db` und schreibt nach dem `await` nur, wenn `db === dbAtStart`; sonst landet z. B. der Sync-Stand in einer neuen, leeren DB (K1).
33. **Notenspalten = Datum + Titel + Typ** (`gradeColumns`, `findColumnGrade`, `gradeInColumn`). Nie Noten nur über Datum + Titel suchen. Mehrere Noten eines Schülers in derselben Spalte bekommen eigene Spalten (`nth`).
34. **Auswahllisten, die gespeicherte Werte zeigen, über eine Setz-Funktion füllen, die unbekannte Werte ergänzt** (`setGradeTypeSelect`). Ein `<select>` mit unbekanntem Wert liest `''`, und Speichern löscht dann den Wert (K3).
35. **Fenster mit Eingaben nie per `closeModal` verlassen, um woanders hinzugehen.** Stunden-Fenster: `leaveLessonModal()` (übernimmt Eingaben, speichert nur bei Änderung).
36. **Tabellen-Eingaben: nur ein leeres Feld löscht.** Unbekannte Eingaben werden mit Hinweis abgelehnt und die Zelle zurückgesetzt (wie `updateInlineGrade`, `updateInlineAttendance`).
37. **`persistDB()` kann scheitern** (Speicher voll, oder ein anderes Fenster hat inzwischen gespeichert) und meldet das selbst (`reportSaveFailure`, `askAboutForeignWrite`). Kein `localStorage.setItem`/`removeItem` für die DB an anderer Stelle; wer den gespeicherten Stand anders verändert, ruft `markDBWritten()` (Kennung `lehrerapp_v3_rev`, sonst überschreiben andere Fenster den Stand wieder, T1).

38. **Nach Änderungen an Schülerdaten `refreshStudentViews(groupId)` aufrufen** (bzw. `refreshGradeViews` bei Noten), nicht nur die Ansicht, aus der die Änderung kam. Die Schnellbewertung öffnet sich auch über Tabelle und Stunden-Fenster.
39. **Farben mit Hell/Dunkel-Varianten als Grundfarbe in eine CSS-Variable legen** (`style="--avatar:#…"`) und die Töne in style.css per `color-mix` je Modus mischen, statt zwei feste Farben inline zu setzen (die überstimmen jede Modus-Regel).

40. **Stunden haben einen optionalen Gültigkeitszeitraum** (`validFrom`/`validUntil`). Wer prüft, ob eine Stunde an einem Datum stattfindet oder mit einer anderen kollidiert, geht über `slotOccursOn`/`slotsShareDate` (beachten ihn). Stundenplanwechsel mit Einträgen aus früheren Wochen: `splitSlotFrom`, nie rückwirkend verschieben. Ab wann, bestimmt `splitDateFor` (nie vor heute, nie über gehaltene Stunden); wer Stunden verschiebt, nimmt die Zieldaten von HA/Tests mit (`retargetDueItems`).
41. **„Dieselbe Klasse“ für Stunden nur über `relatedSlots(slot)`** (mit Klasse: alle Stunden der Klasse; freie Stunden: gleicher Fachname). Datumsvorschläge und Fälligkeit müssen dieselbe Regel nutzen.
42. **Nach Änderungen an Stunden oder Stundendaten `renderScheduleViews()`** statt nur `renderTimetable()`, damit das Dashboard mitkommt.
43. **Rückfragen mit mehr als Ja/Nein über `askChoice(titel, text, [{label, value, primary|danger}])`** (liefert eine Promise, `null` = abgebrochen). Die aufrufende Funktion ist dann `async`; nach dem `await` prüfen, ob das bearbeitete Objekt noch in `db` ist.

44. **Sitzplätze: `renderSeatingPlan` schreibt nie in `gridX/gridY`.** Angezeigte Plätze kommen aus `seatingLayout()` (gespeicherter Platz, sonst nächster freier, Pult-Zellen ausgenommen); gespeichert wird nur beim Umordnen (`materializeSeatingLayout`). Pult-Position über `seatingDesk()`, Rastergröße über `seatingGridSize()`.
45. **Wer per zweitem Tippen oder per ✕ etwas entfernt, bietet „Rückgängig“ an** (`showUndoToast`; im Profil `offerProfileUndo`). Normale Toasts lassen Klicks durch und können keinen Knopf tragen. Wiederhergestellt wird über `restoreSeatingEntry`: Es lehnt ab, wenn es für denselben Tag/dieselbe Spalte inzwischen einen neuen Eintrag gibt (Regel 50), und zeichnet das offene Profil neu.

46. **Fenster nur über `openModal`/`closeModal` öffnen und schließen** (Fokus-Übergabe und -Rückgabe, `role="dialog"` setzt `labelModals()` beim Start). Ein Fenster, das eine Vorschau zeigt (Einstellungen), verwirft sie beim Schließen ohne Speichern (`MODAL_CLOSE_ACTIONS`).
47. **Knöpfe, die auf dem Handy nur als Symbol erscheinen, haben ein `aria-label`**; der Text steht in `.btn-label` (Klassenkopf) bzw. `.tab-long`/`.tab-short` (Reiter) und wird per CSS umgeschaltet, nie per `aria-hidden`.
48. **Migrationen fassen nie Werte an, die der Nutzer selbst einstellen kann** (Blockzeiten, Farben …). `migrateDB` läuft bei jedem Laden, Import und Pull; eine Regel wie „sieht aus wie der alte Standard“ trifft irgendwann echte Einstellungen (P3).
49. **Sitzplan und Schnellbewertung fassen nur Mitarbeit/HA-Einträge ohne Titel an.** Einträge mit Titel („Referat“, HA-Spalte „Arbeitsheft“) gehören zu Spalten der Tabelle (Q8).
50. **Pro Schüler und Tag höchstens ein Eintrag aus `DAY_ATTENDANCE_TYPES`** (F/E/Z). Wer einträgt, stellt einen vorhandenen um, damit sein Grund bleibt, statt einen zweiten anzulegen (Q2, Q11). Fehl-Hinweise beim Löschen von Schülern über `cleanUpDeletedStudents`, beim Umbenennen über `renameAbsenceNotes`.
51. **Tabellen der Klassenansicht werden bei jeder Eingabe neu gezeichnet.** Wohin der Fokus danach soll, merkt sich `overviewFocusTarget` (Antippen, Tab); Enter/Tab, die per `change` übernehmen, setzen `overviewCommittedInput`. Neue Eingabe-Reiter nutzen dieselben Wege, sonst geht auf dem iPad nach jeder Zelle die Tastatur zu (Q3).
52. **Fällig ist eine HA nur in der ersten Stunde des Tages, die stattfindet** (`getIncomingItems`). Wer HA/Tests zählt oder anzeigt, geht über `getIncomingItems`/`dueItemsFor`, nie selbst über `targetDate`.
53. **Blöcke immer über `getBlocks()`** – die Liste ist nach Uhrzeit sortiert und eine Kopie. Wer Blöcke speichert, schreibt `db.settings.blocks` (Einstellungen: `blocksDraft`), nie in das Ergebnis von `getBlocks()`.
54. **`:hover` nur in `@media (hover: hover)`.** Auf dem iPad bleibt ein Hover nach dem Tippen hängen (Karten bleiben „angehoben“). `tests/block-s.test.js` prüft das.
55. **Klickbare Elemente, die kein `<button>` sind** (Karten, Farbfelder, Tabellenzellen), bekommen `role="button"`, `tabindex="0"` und einen Namen; Enter/Leertaste löst ein globaler Handler aus. Formulare mit Eingaben merken sich beim Öffnen ihren Stand und fragen beim Schließen nur bei Änderungen (`settingsSnapshot`, `gradeFormSnapshot`).
56. **Nie per `align-items:center`/`justify-content:center` zentrieren, was höher oder breiter als sein Behälter werden kann** (App, Sitzplan-Raster): Der Überschuss ragt dann auf beiden Seiten hinaus, und oben/links ist nicht erreichbar. Stattdessen `margin:auto` am Kind. Bildschirmhöhen mit `100dvh` (nach `100vh` als Rückfall), nie nur `100vh` – Safari auf dem iPhone rechnet `100vh` mit eingefahrener Leiste (S18).
57. **Formulare mit Eingaben blockieren den Pull, solange etwas eingetippt ist** (`inputModalOpen`; Einstellungen nur bei `settingsDirty()`). Ein neues Formular, dessen Felder aus `db` stammen, gehört dazu – sonst ersetzt ein Pull die Eingaben still oder das Formular schreibt beim Speichern den alten Stand zurück (P1, T5).
58. **Datumsfelder für neue Einträge stehen auf heute** (am Wochenende letzter Schultag, `profileDefaultDate`), auch nach dem Eintragen – nie leer lassen. Notenwerte werden mit bis zu zwei Nachkommastellen gespeichert (`parseGradeInput`), im Formular mit Komma angezeigt (`gradeText`).

## Arbeitsablauf

1. Aufgabe aus `BUGS.md` wählen (ein Block pro Sitzung).
2. **Zuerst einen Test schreiben, der den Fehler zeigt** (`tests/`), dann reparieren.
3. `npm test` muss grün sein.
4. `npm run bump`, sonst sehen installierte Apps die Änderung nie.
5. In `BUGS.md` abhaken und neue Erkenntnisse hier in „Regeln“ ergänzen.
6. Commit auf einem Branch. **Mergen/Pushen auf `main` = live für alle Geräte**, nur nach Rückfrage.

**So kommt ein Update bei Nutzern an:** Seit v192 (BUGS G2) lädt die Seite online zuerst vom Server, das Update läuft also schon beim **ersten** Öffnen nach dem Deploy (offline oder bei hängendem WLAN nach 3 s die gecachte Version). Geräte, die noch eine ältere Version als v192 installiert haben, verhalten sich beim Sprung auf v192 noch wie früher (in der Generalprobe am 24.09.2026 beobachtet): erstes Öffnen = alte Version aus dem Cache, ab dem zweiten die neue. GitHub Pages lässt Browser Dateien bis zu 10 Minuten zwischenspeichern, direkt nach dem Deploy kann also noch kurz der alte Stand kommen. Neuer Code muss immer mit Daten klarkommen, die die alte Version gerade noch geschrieben hat.

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
