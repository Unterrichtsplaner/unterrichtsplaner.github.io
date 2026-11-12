# Konzept: Plus-Konto und Laden (BUGS AV1)

*Stand 12.11.2026 · Idee von Kevin · noch nichts gebaut. Entscheidungen vom 12.11. stehen in Abschnitt 12; der Shop soll aussehen wie ein Item-Shop aus Spielen (Abschnitt 5a).*

## 1. Ziel in einem Satz

Die Plusse werden eine Währung: Jeder Schüler hat ein Konto, sieht es auf seiner Seite und löst es selbst ein – für eine 1, für einen Vorteil oder als Spende an die Klasse. Statt „3× ++ = 1, 3× + = ++“ gilt nur noch: **+ ist 1 Plus wert, ++ ist 2 Plusse wert.**

## 2. So erleben es die Schüler

1. Auf der persönlichen Seite (Reiter „Ich“) steht groß der Kontostand: **„23 Plusse“**.
2. Darunter der **Laden**: was es gibt und was es kostet. Was man sich leisten kann, ist antippbar, der Rest zeigt „noch 4 Plusse“.
3. Antippen → die Seite zeigt einen **QR-Code** bildschirmfüllend: „Zeig das deiner Lehrkraft. Song aussuchen · 5 Plusse“.
4. Die Lehrkraft scannt und bestätigt. Beim nächsten Laden der Seite steht unter „Eingelöst“: „Song aussuchen · 5 · Do 12.11.“ und der neue Kontostand.
5. **Spenden:** Im Laden gibt es „An die Klasse spenden“ mit 1, 3, 5 oder 10 Plussen. Gespendete Plusse zählen fürs Klassenziel ein zweites Mal (sie zählen ja schon automatisch, wenn man sie verdient).

```
┌──────────────────────────────┐
│ Anna                Level 7  │
│                              │
│   23 Plusse                  │
│   seit Schuljahresbeginn 31, │
│   eingelöst 8                │
├──────────────────────────────┤
│ Laden                        │
│  Song aussuchen          5 ▸ │
│  Sitzplatz aussuchen     3 ▸ │
│  Keine TÜ abgeben        8 ▸ │
│  Eine 1 (mündlich)       9 ▸ │
│  An die Klasse spenden   ▸   │
└──────────────────────────────┘
```

## 3. So erlebst du es

- **Scannen:** Ein Knopf „Plusse einlösen“ im Sitzplan (bei Timer und Stoppuhr) und im Reiter „Schülerapp“. Er öffnet die Kamera; der Code wird ohne Internet gelesen.
- **Bestätigen:** Es erscheint z. B.
  ```
  Anna Muster möchte einlösen:
  Song aussuchen · 5 Plusse
  ✓ Konto reicht            [Ablehnen]  [Einlösen]
  ```
  Den genauen Kontostand zeigt das Fenster erst auf „Anzeigen“ (Beamer, siehe Abschnitt 8).
- **Ohne Handy:** Im Schüler-Fenster gibt es „Plusse einlösen“: Angebot antippen, bestätigen. Für Schüler ohne Handy, bei Handyverbot oder wenn es schnell gehen soll.
- **Rückgängig:** Nach dem Einlösen kommt „Rückgängig“ (wie überall). In der Liste „Eingelöst“ im Schüler-Fenster lässt sich ein Eintrag auch später löschen; die Plusse sind dann wieder auf dem Konto.
- **Laden einrichten:** Im Reiter „Schülerapp“ der Klasse: Angebote mit Name und Preis, eigene hinzufügen, löschen, Reihenfolge. Eine Rechenhilfe sagt, wie viele Plusse ein mittlerer Schüler bis zum Halbjahr und bis zum Schuljahresende ungefähr sammelt.

## 4. Regeln des Kontos

| Regel | Vorschlag |
|---|---|
| Wert | + = 1 Plus, ++ = 2 Plusse (wie heute beim Klassenziel). |
| Was zählt | Alle + und ++ des Schuljahrs, auch Einträge mit Titel (z. B. „Referat“), genau wie beim Klassenziel. |
| Minus | Kostet nichts. Das Konto wird nur durch Einlösen kleiner. |
| Kontostand | verdient − eingelöst. Nie unter 0: Einlösen geht nur, wenn es reicht. |
| Gültigkeit | Ein Schuljahr. Beim Schuljahreswechsel beginnt das Konto bei 0 (wie XP und Joker heute). Kein Verfall zum Halbjahr. |
| Mitarbeits-Einträge | Bleiben in der Tabelle stehen (nichts wird gelöscht). Eine Mitarbeitsnote entsteht aber **nur** über den Shop: Wer sich keine 1 holt, bekommt dafür keine Note (entschieden 12.11.). |
| Level, XP, Ränge | Bleiben als Fortschritt und sinken beim Einlösen **nie** (sonst wäre Sparen bestraft). |

## 5. Der Laden

Pro Klasse einstellbar. Vorschlag für den Anfang (Preise selbst anpassbar):

| Angebot | Preis | Art |
|---|---|---|
| Sitzplatz für eine Stunde aussuchen | 3 | Vorteil |
| Partner wählen | 3 | Vorteil |
| Song aussuchen | 5 | Vorteil |
| Aufgabe aussuchen | 5 | Vorteil |
| Keine TÜ abgeben | 8 | Vorteil |
| Eine 1 (mündlich) | 6 | Note |
| An die Klasse spenden | 1 / 3 / 5 / 10 | Spende |

**Zur Einordnung:** Ein mittlerer Schüler sammelt etwa 0,5 Plusse pro Stunde. Bei 2 Wochenstunden sind das rund 17 im Halbjahr und 34 im Schuljahr. Eine 1 kostet 6 – das ist genau deine bisherige Regel „3× ++ = 1“ (entschieden 12.11.). **Offen:** Die Vorteile sind teils teurer als die 1 (keine TÜ 8). Vorschlag: Sitzplatz 2, Partner 2, Song 3, Aufgabe 3, keine TÜ 4, eine 1 6.

**Arten:**
- **Vorteil:** wird nur vermerkt („Song aussuchen am 12.11.“).
- **Note:** trägt beim Einlösen automatisch eine Note ein: Art „Mündlich“, Wert 1 (bei Punkten 15), Titel „Plus-Konto“, Datum heute. Sie zählt im Schnitt wie jede andere Note. Rückgängig nimmt Note und Einlösung zusammen zurück.
- **Spende:** zählt fürs Klassenziel zusätzlich. Auf der Klassenseite steht nur die Summe („34 Plusse gespendet“), **nie**, wer wie viel gespendet hat.

**Hinweis zur Note:** Ob man eine 1 „kaufen“ darf, ist eine pädagogische Entscheidung. Rechtlich muss die Note die Leistung abbilden; die Plusse sind Mitarbeit, also passt es zur mündlichen Note. Am besten kurz mit Fachschaft oder Schulleitung absprechen. Wer das nicht will, lässt das Angebot einfach weg.

## 5a. Aussehen: Item-Shop (Wunsch 12.11.: „cool wie ein Itemshop, z. B. Fortnite“)

Eigener Reiter **SHOP** auf der persönlichen Seite (neben Ich · Sammlung · Klasse). Im Stil eines Spiele-Shops, aber in den Regeln der Schülerseite (DESIGN.md: große Farbflächen, Farben „Ozean“, Archivo, keine Schatten, keine Verläufe, kein Lila):

- **Oben:** Kontostand als riesige Zahl mit Plus-Münze, darunter „+ = 1 · ++ = 2“.
- **Highlight:** das teuerste Angebot (meist die 1) als große Karte über die ganze Breite.
- **Alle Angebote** als Karten im Raster: großes Symbol, Name, Seltenheit, Preisschild. Was man sich noch nicht leisten kann, ist blass und zeigt „noch 2“.
- **Seltenheit nach Preis** (automatisch): bis 2 GEWÖHNLICH (Nebeltürkis), 3 SELTEN (Meerblau), 4–5 EPISCH (Koralle), ab 6 LEGENDÄR (Sonne) – statt Spiele-Lila, das die Schülerseite nicht verwendet.
- **Für die Klasse:** Spenden-Fläche mit Stand des Klassenziels und Knöpfen 1 · 3 · 5 · 10.
- **Kaufen:** Karte antippen → ganze Seite in der Farbe der Seltenheit mit großem Symbol, Preis und QR-Code: „Zeig das deiner Lehrkraft“.
- **Eingelöst:** Liste darunter, neueste zuerst.

## 6. Einlösen per QR-Code

**Warum QR:** Die Schülerseite kann nur lesen, sie darf nichts in die Cloud schreiben (so ist sie sicher). Der QR-Code ist der Rückweg ohne Server: Der Schüler zeigt ihn, dein Planer liest ihn und speichert die Einlösung bei dir. Danach geht der neue Stand beim nächsten Abgleich auf seine Seite.

**Was im Code steht:** Kennung der persönlichen Seite (nicht der Schlüssel), Angebot, Betrag (bei Spende), eine Einmal-Nummer und eine **Unterschrift**. Die Unterschrift rechnet die Schülerseite mit dem Schlüssel aus ihrem Link; dein Planer kennt denselben Schlüssel und prüft sie.

Damit gilt:
- **Niemand kann für einen anderen einlösen.** Ohne Annas Link kein gültiger Code für Annas Konto.
- **Abfotografieren nützt nichts.** Der Code enthält den Schlüssel nicht, also öffnet er auch nicht Annas Seite.
- **Jeder Code gilt nur einmal.** Die Einmal-Nummer wird gespeichert; ein zweites Scannen meldet „schon eingelöst“.
- **Preis gilt aus dem Planer.** Hat sich der Preis inzwischen geändert, zeigt die Bestätigung den aktuellen.
- **Ohne Internet:** Scannen und Speichern gehen offline, der Abgleich folgt später.
- **Verzögerung:** Die Schülerseite zeigt den neuen Stand nach dem nächsten Abgleich (Firebase-Grenze: höchstens alle 10 Minuten neu). Bis dahin zeigt sie beim angefragten Angebot „wartet auf Bestätigung“ (nur auf dem Handy des Schülers gemerkt). Doppelt einlösen geht trotzdem nicht, weil das echte Konto in deinem Planer steht.

**Kamera:** Safari auf dem iPad kann QR-Codes nicht selbst lesen. Dafür kommt eine kleine, freie Bibliothek (jsQR, MIT-Lizenz) in `lib/` – lokal, nichts von fremden Servern. Beim ersten Scannen fragt das iPad einmal, ob die App die Kamera benutzen darf. Die Bilder bleiben im Gerät.

## 7. Was aus den Jokern wird

Die Joker (alle 4 Level einer, höchstens 4: Sitzplatz, Song, Aufgabe, Partner, Rätsel) sind im Grunde schon ein Laden – nur mit fester Zuteilung statt eigener Wahl. Zwei Systeme nebeneinander wären wieder schwer zu verstehen.

**Vorschlag:** Der Laden ersetzt die Joker.
- Die bisherigen Joker-Texte werden die ersten Angebote im Laden (mit Preisvorschlag).
- Schon eingelöste Joker bleiben in der Liste „Eingelöst“ sichtbar.
- Der Joker-Abschnitt verschwindet von der Schülerseite; „alle 4 Level ein Joker“ entfällt.
- Sticker, Baustellen, Level und Ränge bleiben, wie sie sind.

## 8. Beamer und Datenschutz

- **Beamer (Regel 16/67):** Der Kontostand ist eine Angabe über die Mitarbeit eines Schülers. Im Schüler-Fenster und in der Bestätigung steht er erst nach „Anzeigen“; ohne „Anzeigen“ nur „Konto reicht“ bzw. „reicht nicht“.
- **Schülerseite:** zeigt nur das eigene Konto und die eigenen Einlösungen. Die Klassenseite zeigt nur die Summe der Spenden, keine Namen.
- **Datenschutzhinweise:** Ergänzen: Einlösungen werden pro Schüler gespeichert (Angebot, Datum, Preis) und erscheinen verschlüsselt auf seiner persönlichen Seite. Die Rückfrage beim Einschalten der persönlichen Seiten nennt das Konto mit.

## 9. Technik (für die Umsetzung)

- **Daten:**
  - `groups[].studentApp.personal.shop = [{ id, name, price, kind: 'perk' | 'grade' | 'donate' }]`
  - `students[gid][i].redeemed = [{ id, date, itemId, name, price, kind, nonce?, gradeRef? }]` – Name und Preis werden beim Einlösen mitgespeichert (wie bei den Stickern), damit spätere Änderungen am Laden alte Einträge nicht verändern.
- **Rechnen statt speichern:** Kontostand, „verdient“ und Spendensumme werden immer berechnet, nie gespeichert (wie XP, Regel 95).
- **Klassenziel:** `classGoalCount` zählt gespendete Plusse seit Beginn des Ziels zusätzlich.
- **Auszüge:** Persönliche Seite bekommt `account: { balance, earned, spent, shop, redeemed }` (ohne Nachnamen, ohne andere Schüler). Klassenseite bekommt `donated` (nur Summe). Neues Format → `StudentShare.FORMAT` bleibt, wenn die Seite alte Auszüge weiter liest (Regel 15).
- **Abgleich (Regel 83):** `shop` und `redeemed` bekommen Einträge in `MERGE_SPEC` (Listen mit `id`). Einlösungen auf zwei Geräten bleiben beide; dieselbe Einmal-Nummer zählt nur einmal.
- **Schreibgrenze (AK3):** Kein zusätzliches Veröffentlichen – Einlösungen ändern den Auszug und gehen mit dem normalen Takt raus.
- **Dateien:** Planer-Seite in `js/schuelerapp-planer.js`, Scanner in einer neuen Datei `js/scanner.js` (Regel 99), Schülerseite in `schueler.js`, Bibliothek `lib/jsQR.js` (+ Eintrag in `sw.js`, `LIZENZEN.txt`).
- **Alte App-Versionen** anderer Lehrkräfte lesen die neuen Felder nicht, löschen sie aber auch nicht (Objekte bleiben erhalten).

## 10. Stufen und Aufwand

| Stufe | Inhalt | Aufwand |
|---|---|---|
| **1** | Konto, Laden mit Preisen, Spende, Note per Einlösen, Einlösen im Schüler-Fenster, Anzeige auf Schüler- und Klassenseite, Joker → Laden, Datenschutzhinweise | Hoch |
| **2** | QR-Code auf der Schülerseite, Scannen im Planer (Kamera, jsQR), Unterschrift und Einmal-Nummer, „wartet auf Bestätigung“ | Hoch |

Stufe 1 ist schon im Unterricht nutzbar (du tippst ein). Erst ausprobieren, dann Stufe 2.

## 11. Tests (Auswahl)

- Kontostand: + und ++ richtig, Minus ändert nichts, Einlösen zieht ab, nie unter 0, neues Schuljahr beginnt bei 0.
- Einlösen löscht keine Mitarbeits-Einträge; Level/XP sinken nicht.
- Note per Einlösen erscheint in der Notentabelle; Rückgängig nimmt beides zurück.
- Spende zählt fürs Klassenziel zusätzlich; Klassenseite enthält keine Namen.
- Auszüge: persönliche Seite ohne Nachname und ohne andere Schüler; Kontostand im Schüler-Fenster erst nach „Anzeigen“.
- Abgleich: Einlösungen auf zwei Geräten bleiben beide, gleiche Einmal-Nummer nur einmal.
- QR (Stufe 2): falsche Unterschrift wird abgelehnt, zweites Scannen meldet „schon eingelöst“, Code enthält keinen Schlüssel.
- Im Browser: Laden und QR auf dem Handy, Scannen auf dem iPad, Beamer-Ansicht.

## 12. Entscheidungen (12.11.2026)

| # | Frage | Entscheidung |
|---|---|---|
| 1 | Zählen eingelöste Plusse weiter für die Mitarbeitsnote? | **Nein.** Eingelöst ist eingelöst. Eine Mitarbeitsnote gibt es nur über den Shop. |
| 2 | Ersetzt der Shop die Joker? | **Ja**, und er sieht aus wie ein Item-Shop (5a). |
| 3 | Wert von ++ | **2 Plusse.** |
| 4 | Kostet ein Minus Plusse? | **Nein.** |
| 5 | Gültigkeit | **Schuljahr**, kein Verfall zum Halbjahr. |
| 6 | Spenden anonym? | **Ja**, nur die Summe. |
| 7 | „Eine 1“ im Shop? | **Ja, für 6 Plusse.** |
| 8 | Wo scannen? | **Sitzplan und Reiter „Schülerapp“.** |
| 9 | Handys im Unterricht? | **Erlaubt**; Einlösen im Schüler-Fenster bleibt als zweiter Weg. |

**Noch offen:** Preise der Vorteile (Vorschlag in Abschnitt 5), Aussehen des Shops nach dem Entwurf.
