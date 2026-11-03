# Gestaltung: „Papier & Tinte“

> Gilt für jede Änderung an Aussehen und Texten. Ziel: Die App sieht aus wie von einem Menschen mit Geschmack gemacht, nicht wie der Durchschnitt aller generierten Apps (BUGS AE, Anti-Slop-Prüfung 02.11.2026).

## Charakter

**Schulheft, Lehrerzimmer, ruhig.** Ein Werkzeug, das jeden Tag im Unterricht offen ist – am Pult, manchmal am Beamer. Es drängt sich nicht auf; die Klassenfarben im Stundenplan und Sitzplan tragen die Information, der Rest tritt zurück.

## Der eine eigene Akzent

**Überschriften in einer Buchschrift** (`--font-display`: Iowan Old Style auf iPad/Mac, sonst Palatino/Georgia). Nur Ansichtstitel, Fenstertitel, Logo, Abschnittsüberschriften im Dashboard, leere Zustände. Alles andere bleibt Inter. Keine zweite Besonderheit daneben.

## App-Symbol

Kalender mit Haken in Tinten-Blau `#2f55c9` auf Papier `#f5f1e9` (`icon.svg`, daraus `icon-180/192/512.png`). Nicht randlos abrunden – das machen iOS/Android selbst.

## Grundwerte (style.css `:root`)

**Standard-Design (seit 02.11.2026): hell, Hintergrund Eisblau (`#bfdbfe`, Karten `#dbeafe`), Akzent Tinte** (`DEFAULT_THEME` in app.js). Dunkel ist wählbar („Dunkel“, „Schiefer“, „Tiefsee“), ebenso „Papier (hell)“.

| | Dunkel | Hell (Grundwerte, Eisblau/Papier setzen Hintergrund und Karten darüber) |
|---|---|---|
| Hintergrund | `#14120f` warmes Dunkel | `#f5f1e9` Papier |
| Karten | `#211e19` | `#fffdf8` |
| Schrift | `#efe9de` / Neben `#a59d90` / leise `#908877` | `#27221b` / `#5f574b` / `#716859` |
| Akzent | `#3d63dd` Tinte, Text auf dunkel `#8aa4f5` | `#2f55c9` |
| Schrift auf Akzent | `--on-accent` (weiß) | weiß |

- Statusfarben (`--success`, `--warning`, `--danger`) und Notenfarben bleiben getrennt vom Akzent.
- Nutzer können Akzent und Hintergrund in den Einstellungen wählen. „Standard“ wird **nicht gespeichert** (`savedThemeAccent`, `savedThemeBg`, `savedThemeMode`), damit eine neue Standardfarbe alle erreicht, die nie selbst gewählt haben. Früher automatisch gespeicherte Standardwerte (`#0f1117`, `#6366f1`) gelten als Standard.

## Regeln

1. **Akzent nur für die Hauptaktion und „jetzt“** (Hauptknopf, „Heute“, laufende/nächste Stunde, gewählter Tag, Schalter an). Nicht für Menü, Reiter, Namen, Plaketten, Wochentage. „Gewählt“ ohne Akzent: Tinte auf Papier (`.tab-btn.active`) oder eine hellere Fläche ohne farbige Kante (`.nav-item.active`).
2. **Schriftgrößen nur aus der Reihe** 10 · 11 · 12 · 13 · 14 · 16 · 20 · 26 px (+ 36 für die Restzeit im Cockpit, große Symbole). `tests/design-stufe2.test.js` prüft das.
3. **Rundungen nur über Grundwerte:** `--radius-xs` (Plaketten), `--radius-sm` (Knöpfe, Eingaben, Reiter), `--radius-md` (Karten), `--radius-lg/xl` (Fenster). Die Pille (`99px`) nur für Chips und Zähler, runde Icon-Knöpfe als Kreis. Der Regler „Rundung“ in den Einstellungen verschiebt alle Grundwerte.
4. **Etiketten in normaler Schreibung**, nicht in Großbuchstaben. Ausnahme: winzige Überschriften wie „LETZTE STUNDE“ im Cockpit.
5. **Kein Leuchten, kein Verlauf, keine Spaß-Bewegung.** Schatten nur `--shadow-sm/md/lg`. Bewegung nur für Zustände (Fenster öffnet, Ziehen, Drücken), 120–250 ms, nichts vergrößert sich beim Darüberfahren.
6. **Texte ruhig und konkret:** keine Ausrufezeichen, kein „erfolgreich“, keine Geviertstriche (—) und keine Gedankenstriche („Nicht mehr möglich – inzwischen …“). Stattdessen Punkt, Komma, Doppelpunkt oder Klammer. Der Strich „–“ nur in Spannen (12.10. – 16.10., 07:45–08:30) und als Platzhalter „–“ für „kein Wert“. Meldungen sagen, was passiert ist („Sicherung gespeichert ✓“).
7. **Neue Farbe/Größe/Rundung nötig?** Grundwert ergänzen (hier und in `style.css`), nie eine Einzelzahl in eine Regel oder einen Inline-Stil schreiben.

## Listen statt Karten

Die Schülerliste besteht aus Zeilen mit Trennlinien (gleiche Angaben in festen Spalten untereinander), kein Kartenraster. Neue Listen genauso bauen; Karten nur, wo jedes Element eigenen, bildhaften Inhalt hat (Sitzplan, Stunden-Kacheln). **Ausnahme Klassenübersicht (AH8, Wunsch 03.11.):** Kacheln in Klassenfarbe wie die Stunde im Stundenplan (Grund 15 % Klassenfarbe, Name 26 px in der Farbe) – Klassen findet man an Farbe und Namen wieder, nicht an Spalten. Wählbar sind daneben „Liste“ (Zeilen wie die Schülerliste) und „Groß“ (Kachel mit nächster Stunde, Thema, Fälligem, Auffälligen; AH12).

## Noch offen


- Über 200 Inline-Stile in `index.html` (BUGS AE10) – bei Umbauten dieser Stellen in `style.css` verlegen.
