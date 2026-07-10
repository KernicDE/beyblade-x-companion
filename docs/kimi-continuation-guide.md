# Kimi-Fortsetzungs-Guide – Beyblade X Companion

Dieser Guide ist für eine Kimi-Instanz auf einem anderen Rechner, die das Projekt fortführen soll.

## Repo

- **Repository**: `KernicDE/beyblade-x-companion`
- **Clone-URL**: `https://github.com/KernicDE/beyblade-x-companion.git`
- **Live-URL**: `https://kernicde.github.io/beyblade-x-companion/`

## Schritt-für-Schritt Setup

1. **Repo klonen**

   ```bash
   git clone https://github.com/KernicDE/beyblade-x-companion.git
   cd beyblade-x-companion
   ```

2. **Abhängigkeiten installieren**

   ```bash
   npm install
   ```

3. **Tests laufen lassen (Baseline)**

   ```bash
   npm test -- --run
   ```

4. **Dev-Server starten (optional, für manuelle visuelle Prüfungen)**

   ```bash
   npm run dev
   ```

## Wo wird gearbeitet?

- `docs/manual-review-instructions.md` – Regeln für die manuelle Review-Runde
- `docs/manual-review-todo.md` – Todo-Liste aller 318 Beys; dort ist das nächste unerledigte Bey markiert
- `public/data/beys.json` – Bey-Einträge
- `public/data/blades.json` – Blade-Einträge
- `public/data/ratchets.json` – Ratchet-Einträge
- `public/data/bits.json` – Bit-Einträge
- `public/data/assistBlades.json` – Assist-Blade-Einträge (selten)
- `public/images/beys/`, `blades/`, `ratchets/`, `bits/` – Bilder

## Workflow

1. In `docs/manual-review-todo.md` das nächste unerledigte Bey finden.
2. Für das Bey und alle dazugehörigen Teile:
   - Manuell im Internet recherchieren (BeyBase, Beyblade Wiki, WBO).
   - Bewertungen in 0,5-Schritten setzen (`ratingsSource`: `community` oder `estimated`).
   - Deutsch- und Englisch-Texte individuell und abwechslungsreich formulieren.
   - Bilder prüfen: weißer Hintergrund, Bey/Teil vollständig sichtbar. Fehlende Bilder ergänzen (im Zweifel Blade-Bild für Beys verwenden).
3. JSON-Dateien aktualisieren.
4. In der Todo-Liste abhaken.
5. Nächstes Bey.
6. **Alle 25 Beys**: `npm test -- --run`, dann `git add -A`, `git commit`, `git push origin master`.
7. Nach dem Push ca. 1–2 Minuten warten, dann `https://kernicde.github.io/beyblade-x-companion/` prüfen (HTTP 200 = deployed).

## Qualitätsregeln (Kurzfassung)

- Keine Scripte für inhaltliche Änderungen.
- Kein Raten, keine Halluzination.
- Keine Teilelisten in Bey-Beschreibungen (Teile sind separat verlinkt).
- Bewertungen nur in 0,5-Schritten.
- `ratingsSource` immer setzen.
- Bilder: offizielle Herstellerbilder bevorzugt, sonst saubere Produktfotos mit weißem Hintergrund.

## Nützliche Befehle

```bash
# Status prüfen
git status --short

# Alle Änderungen committen
git add -A
git commit -m "manual review: BEY-NAMEN"
git push origin master

# Live-Seite auf Erreichbarkeit prüfen
curl -s -o /dev/null -w "%{http_code}" "https://kernicde.github.io/beyblade-x-companion/"
```
