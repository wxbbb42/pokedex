# Data Pipeline Scripts

These scripts fetch, parse, and transform Pokémon data from PokéAPI and Serebii
into the JSON files served by the app (`public/data/`).

**Run all scripts from the `scripts/` directory:**

```bash
cd scripts
node fetch-all-data.cjs      # Fetch all 1025 Pokémon → public/data/pokemon.json + forms.json
node build-timeline.cjs       # Build main-timeline.json from Serebii data + pokemon.json
node patch-timeline.cjs       # Patch Chinese names (Vivillon, Alcremie, Tauros)
node fix-entities.cjs         # Fix HTML entities in timeline data
node fix-sprites.cjs          # Fix specific sprite URLs in forms.json
node refetch-names.cjs        # Re-fetch Chinese names from PokéAPI
```

### One-time / utility scripts

These were used once during initial data gathering and are kept for reference:

- `fetch-events.cjs` / `fetch-events.py` — Fetch event Pokémon sprite data
- `fetch-forms.cjs` — Fetch form sprite data
- `fetch-missing.cjs` / `fetch-missing2.cjs` — Fetch missing form data

### Data directory

`scripts/data/` contains intermediate/raw data files used by the pipeline:

- `serebii.html` — Raw Serebii Living Dex page
- `serebii-normal.json` / `serebii-shiny.json` — Parsed Serebii data
- `names.json` — Chinese name lookup cache
- `new-forms.json` — Additional form data
- `event-sprites.json` / `form-sprites.json` — Sprite URL mappings
