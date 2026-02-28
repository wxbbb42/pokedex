# Copilot Instructions — Living Pokédex

## Project Overview

A **Living Pokédex tracker for Pokémon HOME**, built with **Vite + vanilla ES modules**.
- Frontend: `src/` (data.js, storage.js, ui.js, main.js, style.css)
- Backend: `api/pokedex-progress.js` (Vercel serverless → GitHub Gist sync)
- Static data: `public/data/` (pokemon.json, forms.json, main-timeline.json)
- Data pipeline: `scripts/` (Node.js CJS scripts that fetch from PokéAPI/Serebii)
- Deploy target: **Vercel**

## Code Style

### Immutability (CRITICAL)
- NEVER mutate objects/arrays in place. Use spread operator, `.map()`, `.filter()`.
- Exception: DOM manipulation and `state` object in `data.js` (the single mutable store).

### File Organization
- Keep files focused: 200–400 lines typical, 800 max.
- One module = one responsibility. Don't combine unrelated concerns.
- Organize by feature/domain, not by type.

### Functions
- Keep functions under 50 lines. Extract helpers for complex logic.
- Avoid nesting deeper than 4 levels — use early returns.
- Use descriptive names. No single-letter variables in non-trivial contexts.
- No magic numbers — use named constants.

### Error Handling
- Handle errors at every level. Never silently swallow errors.
- Empty `catch {}` blocks must have a comment explaining why.
- User-facing errors should be friendly (Chinese UI). Log details to console.

### No Debug Code in Production
- Remove `console.log` before committing (except intentional error logging).
- No commented-out code blocks.
- No TODO/FIXME without a clear plan.

## Security (CRITICAL — always check)

- **NEVER** hardcode secrets (API keys, tokens, passwords) in source code.
- All secrets go in environment variables (`process.env.*` on Vercel).
- Validate `process.env` values exist before using them; fail fast if missing.
- Escape all user input before rendering in HTML (use `esc()` from `ui.js`).
- API endpoints must validate request body shape and type.
- Error responses must NOT leak internal details (stack traces, env var names).
- Set proper CORS headers on API routes.

## Code Review Checklist

When reviewing or writing code, check in this priority order:

### CRITICAL
- [ ] No hardcoded secrets
- [ ] No XSS (user input escaped before HTML rendering)
- [ ] No unvalidated API input
- [ ] Auth/secrets not exposed in client-side code

### HIGH
- [ ] Proper error handling (no empty catch, no swallowed errors)
- [ ] Functions < 50 lines, files < 800 lines
- [ ] No deep nesting (> 4 levels)
- [ ] No mutation of shared state outside `data.js`
- [ ] Missing loading/error states for async operations

### MEDIUM
- [ ] Efficient DOM operations (batch with DocumentFragment, use cardCache)
- [ ] No unnecessary re-renders (reuse cached elements)
- [ ] Lazy loading for images
- [ ] No `console.log` debug statements

### LOW
- [ ] Consistent naming conventions
- [ ] JSDoc on exported functions
- [ ] No magic numbers

**Confidence filter**: Only flag issues you're >80% sure are real problems.
Consolidate similar issues instead of reporting each separately.

## Architecture Conventions

### State Management
- Single mutable `state` object in `data.js` — the only place state lives.
- Components read from `state`, never maintain their own shadow state.
- After mutating `state`, call the relevant render/update functions.

### Card Caching
- Cards are created once via `makeCard()` and cached in `state.cardCache`.
- `syncCardState()` updates collected/shiny state on existing cards.
- Never rebuild cards that already exist — retrieve from cache with `getCard()`.

### Data Flow
```
loadPokemonData() → state.pokemonData[]
getVisibleLists() → { main, gmax, event } (filtered by activeGen)
renderCards() → DOM (using cached cards)
updateProgress() → progress bar
```

### Storage Flow
```
Click card → toggle in state.collected → saveLocal() → scheduleSyncRemote()
Page load → loadLocal() → loadFromRemote() → merge → renderCards()
```

### Serverless API
- `api/pokedex-progress.js` uses CJS (`module.exports`) for Vercel.
- GET returns `number[]` from Gist, POST writes `number[]` to Gist.
- GIST_ID and GIST_TOKEN are Vercel env vars, never in source.

## Performance

- Use `DocumentFragment` for batch DOM insertions.
- Use `cardCache` Map — never create duplicate card elements.
- Images use `loading="lazy"`.
- Iterate `cardCache.values()` instead of `querySelectorAll` for search/filter.
- Static data JSON files are cached via Vercel headers (`Cache-Control: public, max-age=86400`).

## Development Workflow

1. Write code first, explain after.
2. Prefer working solutions over perfect solutions.
3. Run `vite build` after changes to verify no build errors.
4. Keep changes atomic — one concern per edit.

### Priorities
1. Get it working
2. Get it right
3. Get it clean

## Project-Specific Notes

- UI language is **Chinese (zh-CN)** — all user-facing text uses Chinese.
- Pokémon data has three sections: `main`, `gmax`, `event`.
- Shiny mode appends `_shiny` to collection keys.
- `SKIP_EVENT_IDS` filters out cap Pikachu variants already in main dex.
- Box view uses fixed 6×5 grid (30 slots) with empty placeholders.
