# Pokémon Data

Pre-fetched from PokéAPI (https://pokeapi.co). Do not hand-edit.

## Files

- **pokemon.json** — All 1025 standard Pokémon (id, num, zh, en, gen, sprite)
- **forms.json** — All HOME-valid form/gender variants (id, num, zh, en, sprite, section)

## Sprite source

Main sprites: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/{id}.png`
Form sprites: fetched from PokéAPI /pokemon/ and /pokemon-form/ endpoints, then resolved to GitHub raw URLs.

## Update

To refresh for a new generation: `node fetch-all-data.cjs`

Last updated: 2026-02-27T10:36:11.523Z
