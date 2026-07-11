# Manuelle Review-Anleitungen für Beyblade X Companion

Diese Anleitung muss nach jeweils 5 erledigten Beys neu gelesen werden. Nach jedem 5. Bey ist ein Checkpoint Pflicht: Anleitung noch einmal komplett lesen, die letzten 5 Beys gegen jede Regel prüfen und Abweichungen selbstständig korrigieren, bevor mit dem nächsten Bey fortgefahren wird. Der Checkpoint zählt als eigener Arbeitsschritt, nicht als optionale Kontrolle.

## Grundregel: Abgehakt = erledigt, offen = neu machen

- Beys, die in `docs/manual-review-todo.md` mit `[x]` markiert sind, gelten als vollständig erledigt. Sie werden nicht erneut bearbeitet.
- Jeder Bey mit `[ ]` muss komplett neu recherchiert, geprüft und bearbeitet werden – unabhängig davon, ob JSON-Einträge, Bilder oder Beschreibungen scheinbar bereits existieren. Vorhandene, aber ungeprüfte Inhalte zählen nicht als abgeschlossen.
- Erst wenn Bey, Blade(n), Ratchet und Bit geprüft, korrigiert und abgehakt sind, gilt der Bey als erledigt.
- Teile, die in mehreren Beys vorkommen, müssen für jedes offene Bey erneut geprüft werden; ein abgehaktes Bey legitimiert keine Teile im nächsten offenen Bey.

## Prozess pro Bey

1. **Bey auswählen**: Nächstes unerledigtes Bey in `docs/manual-review-todo.md`.
2. **Teile identifizieren**: Blade, Assist Blade (falls vorhanden), Ratchet, Bit.
3. **Recherche**: Für Bey und jedes Teil separat im Internet recherchieren.
   - Eigenschaften, Stärken, Schwächen
   - Release, Gewicht, Höhe, Spin-Richtung
   - Competitive-Nutzung, Meta-Relevanz
4. **Bilder prüfen**:
   - Offizielles Herstellerbild bevorzugen.
   - Alternativ sauberes Produktfoto mit weißem Hintergrund.
   - Bey/Teil muss vollständig sichtbar sein.
   - Hintergrund muss weiß sein.
5. **Bewertungen berechnen**:
   - Attack, Defense, Stamina, Balance in 0,5-Schritten.
   - Basierend auf Recherche, nicht geraten.
   - `ratingsSource`: `community` wenn aus Community-Quellen (BeyBase, WBO, Wiki), `estimated` wenn eigene Einschätzung aufgrund fehlender Daten.
6. **Beschreibungen schreiben**:
   - Deutsch und Englisch.
   - Individuell, abwechslungsreich, nicht generisch.
   - Keine Aufzählung der Teile im Bey-Text (Teile sind bereits separat verlinkt).
7. **JSON aktualisieren**: `public/data/beys.json`, `public/data/blades.json`, `public/data/assistBlades.json`, `public/data/ratchets.json`, `public/data/bits.json`.
8. **In Todo-Liste abhaken**: `docs/manual-review-todo.md` aktualisieren.
9. **Checkpoint**: Alle 5 erledigten Beys diese Datei neu lesen und die letzten 5 Einträge kontrollieren.
10. **Nächstes Bey**: Eins nach dem anderen.

## Deploy-Rhythmus

- Alle 25 Beys: `npm test`, commit, push, GitHub-Pages-Deploy abwarten.
- Danach weiter mit den nächsten 25 Beys.

## Bewertungsmethodik (Ratings)

Ratings werden transparent und nachvollziehbar vergeben. Wo Mess- oder Community-Daten fehlen, wird `ratingsSource: estimated` gesetzt und im Assessment kurz begründet. Bei vorliegenden Community-Quellen (BeyBase, WBO, Wiki) wird `ratingsSource: community` verwendet. Es gibt keine objektive Formel, die ein Rating allein aus Gewicht oder Form errechnet; die objektiven Größen sind die Begründungsbasis, das endgültige Rating bleibt ein begründetes Gesamturteil unter Berücksichtigung von Meta-Relevanz, Rebound, LAD und Spielgefühl.

### Skala

| Wert | Bedeutung |
|------|-----------|
| 1 | sehr schwach in dieser Dimension |
| 2 | schwach |
| 3 | durchschnittlich |
| 4 | stark |
| 5 | sehr stark / meta-relevant |

### Objektive Bewertungsgrundlagen

Wo verfügbar, sollen harte Fakten die Bewertung leiten. Diese Größen sind objektiv messbar oder vom Hersteller dokumentiert:

- **Gewicht** in Gramm (schwerere Teile tendieren zu mehr Defense, leichtere zu mehr Stamina).
- **Höhe** in Millimetern (beeinflusst Attack-Winkel und Trefferhöhe).
- **Spin-Richtung** (`right`, `left`, `both`) und deren Synergie mit dem Blade-Design.
- **Kontaktpunktform** des Blades (scharf/spitz vs. rund/abgerollt).
- **Bit-Spitzenform** (flach/spitz/gummiert für Attack; breit/rund für Defense; scharf/free-spin für Stamina).
- **Ratchet-Höhe und -Gewicht** (hohe Ratchets fördern Upper/Lower Attack; schwere Ratchets stabilisieren).

Diese Fakten allein ergeben noch kein Rating. Sie bilden die objektive Basis, auf der das subjektive Gesamturteil (Meta-Relevanz, Rebound, LAD, etc.) aufbaut. Fehlen harte Daten, muss `ratingsSource: estimated` gesetzt und die Einschätzung im Assessment begründet werden.

### Blade

- **Attack**: Bewertung nach Kontaktpunktform, Aggressivität, Rebound und KO-Potenzial. Scharfe, ausladende Kontaktpunkte = höher; runde, zurückgezogene Formen = niedriger.
- **Defense**: Gewicht, niedriges Rebound, robuste Kanten und Widerstandsfähigkeit gegen Treffer. Schwere, runde Blades ohne Angriffsflächen = höher.
- **Stamina**: Spin-Retention, LAD (Life After Death), aerodynamisches Design und Gewichtsdistribution. Niedriges Rebound und gute freie Rotation am Ende = höher.
- **Balance**: Kombination aus Attack, Defense und Stamina. Ein Blade mit ausbalancierten Werten ohne klare Schwäche erhält einen hohen Balance-Wert; extrem spezialisierte Blades erhalten hier einen niedrigeren Wert.

### Assist Blade

- Gleiche Kriterien wie Blade, aber mit meist geringerem Einfluss auf das Gesamtkombo.
- Bewertung relativ zur Wirkung: Unterstützt es Angriff, Defense, Stamina oder ausbalanciert es das Combo?

### Ratchet

- **Attack**: Höhe, die Upper/Lower Attack ermöglicht; geringere Masse kann Aggressivität erhöhen; Burst-Anfälligkeit ist ein Risikofaktor.
- **Defense**: hohes Gewicht, Stabilität, Burst-Resistenz und geringes Rebound.
- **Stamina**: leichte Bauweise, geringe Reibung und hohe Ausdauer.
- **Balance**: vielseitig einsetzbar, keine extreme Spezialisierung, gute Kombination aus Stabilität und Ausdauer.

### Bit

- **Attack**: flache, spitze oder gummierte Spitze = hohe Geschwindigkeit und Aggression.
- **Defense**: breite, runde Spitze (Ball/Wide Ball) = Stabilität, hohe Reibung, schwer aus dem Gleichgewicht zu bringen.
- **Stamina**: scharfe Spitze mit geringer Reibung oder Free-Spin-Mechanismen = hohe Spin-Retention.
- **Balance**: hybride Spitzen, die Angriff und Kontrolle/Stabilität verbinden, oder solide Allround-Werte.

### Bezugswerte

Wo möglich, mit bekannten Referenzteilen der gleichen Kategorie vergleichen. Beispiele für Orientierung (können sich mit dem Meta ändern):

- Ein Blade mit sehr hohem Attack-Potenzial und kontrolliertem Rebound: 4,5–5
- Ein reines Stamina-Blade mit gutem LAD: 4,5–5
- Ein durchschnittliches Allround-Ratchet: 3
- Ein Bit mit schlechter Reibung und Kippneigung: 1,5–2

### Nachkontrolle pro Teil

Nachdem alle vier Ratings vergeben wurden:

- Stimmen sie mit `typeTag` und der offensichtlichen Rolle überein? (Ein Attack-Teil sollte Attack ≥ 3,5 haben, sofern das Tag zutrifft.)
- Ist die Balance sinnvoll im Verhältnis zu Attack, Defense und Stamina?
- Gibt es Community-Quellen, die die Einschätzung bestätigen oder widerlegen?
- Sind die verwendeten Formulierungen im Assessment abwechslungsreich und nicht generisch?

## Verbote

- Keine Scripte für inhaltliche Änderungen.
- Kein Raten oder Halluzinieren. Fehlende Werte dürfen nur als geschätzt ausgewiesen werden, wenn sie plausibel begründet sind.
- Keine generischen Platzhalter wie "The X Bit.".
- Keine ausweichenden oder beliebig austauschbaren Formulierungen wie "ein solides Teil" oder "gute Werte" ohne konkreten Bezug.
- Keine Teileliste in Bey-Beschreibungen.
- Keine Wiederholung desselben Satzbaus oder derselben Floskeln über mehrere Beys hinweg. Jede Beschreibung und jedes Assessment müssen in Wortwahl, Satzrhythmus und Betonung unterscheidbar sein.

## Qualitätskontrolle

Vor jedem Deploy:
- `npm test` muss passen.
- Bilder müssen existieren und weißen Hintergrund haben.
- Bewertungen müssen in 0,5-Schritten sein.
- `ratingsSource` muss gesetzt sein.
- Beschreibungen müssen individuell formuliert sein und dürfen nicht aus anderen Einträgen kopiert klingen.
