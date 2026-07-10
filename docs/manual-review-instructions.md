# Manuelle Review-Anweisungen für Beyblade X Companion

Diese Datei wird alle 5 Beys neu gelesen. Abweichungen müssen selbstständig korrigiert werden.

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
   - `ratingsSource`: `community` wenn aus Community-Quellen (BeyBase, WBO, Wiki), `estimated` wenn eigene Berechnung aufgrund fehlender Daten.
6. **Beschreibungen schreiben**:
   - Deutsch und Englisch.
   - Individuell, abwechslungsreich, nicht generisch.
   - Keine Aufzählung der Teile im Bey-Text (Teile sind bereits separat verlinkt).
7. **JSON aktualisieren**: `public/data/beys.json`, `public/data/blades.json`, `public/data/assistBlades.json`, `public/data/ratchets.json`, `public/data/bits.json`.
8. **In Todo-Liste abhaken**: `docs/manual-review-todo.md` aktualisieren.
9. **Nächstes Bey**: Eins nach dem anderen.

## Deploy-Rhythmus

- Alle 25 Beys: `npm test`, commit, push, GitHub-Pages-Deploy abwarten.
- Danach weiter mit den nächsten 25 Beys.

## Verbote

- Keine Scripte für inhaltliche Änderungen.
- Kein Raten oder Halluzinieren.
- Keine generischen Platzhalter wie "The X Bit.".
- Keine Teileliste in Bey-Beschreibungen.

## Qualitätskontrolle

Vor jedem Deploy:
- `npm test` muss passen.
- Bilder müssen existieren und weißen Hintergrund haben.
- Bewertungen müssen in 0,5-Schritten sein.
- `ratingsSource` muss gesetzt sein.
