# PokéAPI v2 — Complete Reference Guide

> Base URL: `https://pokeapi.co/api/v2/`
>
> Source: <https://pokeapi.co/docs/v2>

---

## Overview

- **Read-only** — only `GET` requests are supported.
- **No authentication** required. All resources are fully open.
- **No rate limiting** (since Nov 2018 static hosting migration), but **cache locally** and be respectful.
- **Fair Use**: locally cache resources, don't DDoS. Violators are IP-banned.

---

## Pagination

Any endpoint called **without** an ID/name returns a paginated list.

```
GET https://pokeapi.co/api/v2/{endpoint}/?limit=20&offset=0
```

| Field | Type | Description |
|-------|------|-------------|
| count | integer | Total resources available |
| next | string | URL for next page (null if last) |
| previous | string | URL for previous page (null if first) |
| results | list | Array of `{ name, url }` (Named) or `{ url }` (Unnamed) |

**Named endpoints** (most): results have `name` + `url`.
**Unnamed endpoints**: `characteristic`, `contest-effect`, `evolution-chain`, `machine`, `super-contest-effect` — results have `url` only.

---

## Common Models

These types appear throughout the API.

### Name

| Field | Type | Description |
|-------|------|-------------|
| name | string | Localized name |
| language | NamedAPIResource → Language | Language of this name |

### NamedAPIResource

| Field | Type | Description |
|-------|------|-------------|
| name | string | Resource name |
| url | string | Resource URL |

### APIResource

| Field | Type | Description |
|-------|------|-------------|
| url | string | Resource URL |

### Description

| Field | Type | Description |
|-------|------|-------------|
| description | string | Localized description |
| language | NamedAPIResource → Language | Language |

### Effect

| Field | Type | Description |
|-------|------|-------------|
| effect | string | Localized effect text |
| language | NamedAPIResource → Language | Language |

### VerboseEffect

| Field | Type | Description |
|-------|------|-------------|
| effect | string | Full effect text |
| short_effect | string | Brief effect text |
| language | NamedAPIResource → Language | Language |

### FlavorText

| Field | Type | Description |
|-------|------|-------------|
| flavor_text | string | Localized flavor text (raw from game files, may contain special chars) |
| language | NamedAPIResource → Language | Language |
| version | NamedAPIResource → Version | Game version |

### GenerationGameIndex

| Field | Type | Description |
|-------|------|-------------|
| game_index | integer | Internal game ID |
| generation | NamedAPIResource → Generation | Generation |

### VersionGameIndex

| Field | Type | Description |
|-------|------|-------------|
| game_index | integer | Internal game ID |
| version | NamedAPIResource → Version | Version |

### VersionGroupFlavorText

| Field | Type | Description |
|-------|------|-------------|
| text | string | Localized text |
| language | NamedAPIResource → Language | Language |
| version_group | NamedAPIResource → VersionGroup | Version group |

### MachineVersionDetail

| Field | Type | Description |
|-------|------|-------------|
| machine | APIResource → Machine | The machine |
| version_group | NamedAPIResource → VersionGroup | Version group |

### Encounter

| Field | Type | Description |
|-------|------|-------------|
| min_level | integer | Lowest encounter level |
| max_level | integer | Highest encounter level |
| condition_values | list NamedAPIResource → EncounterConditionValue | Required conditions |
| chance | integer | Encounter chance (%) |
| method | NamedAPIResource → EncounterMethod | Encounter method |

### VersionEncounterDetail

| Field | Type | Description |
|-------|------|-------------|
| version | NamedAPIResource → Version | Game version |
| max_chance | integer | Total encounter chance (%) |
| encounter_details | list Encounter | Encounter specifics |

---

## Berries

### Berry

```
GET /berry/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name |
| growth_time | integer | Hours per growth stage (4 stages total) |
| max_harvest | integer | Max berries per tree (Gen IV) |
| natural_gift_power | integer | Power of Natural Gift with this berry |
| size | integer | Size in mm |
| smoothness | integer | Smoothness for Pokéblocks/Poffins |
| soil_dryness | integer | Soil drying rate |
| firmness | NamedAPIResource → BerryFirmness | Firmness |
| flavors | list BerryFlavorMap | Flavor potencies |
| item | NamedAPIResource → Item | Corresponding item |
| natural_gift_type | NamedAPIResource → Type | Type for Natural Gift |

#### BerryFlavorMap

| Field | Type | Description |
|-------|------|-------------|
| potency | integer | Flavor strength |
| flavor | NamedAPIResource → BerryFlavor | The flavor |

### Berry Firmness

```
GET /berry-firmness/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name |
| berries | list NamedAPIResource → Berry | Berries with this firmness |
| names | list Name | Localized names |

### Berry Flavor

```
GET /berry-flavor/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name |
| berries | list FlavorBerryMap | Berries with this flavor |
| contest_type | NamedAPIResource → ContestType | Correlated contest type |
| names | list Name | Localized names |

#### FlavorBerryMap

| Field | Type | Description |
|-------|------|-------------|
| potency | integer | Flavor strength |
| berry | NamedAPIResource → Berry | The berry |

---

## Contests

### Contest Type

```
GET /contest-type/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name |
| berry_flavor | NamedAPIResource → BerryFlavor | Correlated berry flavor |
| names | list ContestName | Localized names |

#### ContestName

| Field | Type | Description |
|-------|------|-------------|
| name | string | Contest name |
| color | string | Associated color |
| language | NamedAPIResource → Language | Language |

### Contest Effect

```
GET /contest-effect/{id}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| appeal | integer | Base appeal hearts |
| jam | integer | Hearts opponent loses |
| effect_entries | list Effect | Localized effects |
| flavor_text_entries | list FlavorText | Localized flavor text |

### Super Contest Effect

```
GET /super-contest-effect/{id}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| appeal | integer | Appeal level |
| flavor_text_entries | list FlavorText | Localized flavor text |
| moves | list NamedAPIResource → Move | Moves with this effect |

---

## Encounters

### Encounter Method

```
GET /encounter-method/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name (e.g., "walk") |
| order | integer | Sort order |
| names | list Name | Localized names |

### Encounter Condition

```
GET /encounter-condition/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name |
| names | list Name | Localized names |
| values | list NamedAPIResource → EncounterConditionValue | Possible values |

### Encounter Condition Value

```
GET /encounter-condition-value/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name |
| condition | NamedAPIResource → EncounterCondition | Parent condition |
| names | list Name | Localized names |

---

## Evolution

### Evolution Chain

```
GET /evolution-chain/{id}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| baby_trigger_item | NamedAPIResource → Item | Item held during mating to get baby |
| chain | ChainLink | Base evolution chain link |

#### ChainLink

| Field | Type | Description |
|-------|------|-------------|
| is_baby | boolean | Whether this is a baby Pokémon |
| species | NamedAPIResource → PokemonSpecies | Species at this point |
| evolution_details | list EvolutionDetail | How to evolve |
| evolves_to | list ChainLink | Next evolutions |

#### EvolutionDetail

| Field | Type | Description |
|-------|------|-------------|
| item | NamedAPIResource → Item | Required item |
| trigger | NamedAPIResource → EvolutionTrigger | Trigger type |
| gender | integer | Required gender ID |
| held_item | NamedAPIResource → Item | Item to hold during trigger |
| known_move | NamedAPIResource → Move | Move that must be known |
| known_move_type | NamedAPIResource → Type | Must know a move of this type |
| location | NamedAPIResource → Location | Required location |
| min_level | integer | Minimum level |
| min_happiness | integer | Minimum happiness |
| min_beauty | integer | Minimum beauty |
| min_affection | integer | Minimum affection |
| needs_multiplayer | boolean | Requires link/Union Circle |
| needs_overworld_rain | boolean | Requires rain |
| party_species | NamedAPIResource → PokemonSpecies | Species required in party |
| party_type | NamedAPIResource → Type | Type required in party |
| relative_physical_stats | integer | Atk vs Def: 1 (>), 0 (=), -1 (<) |
| time_of_day | string | "day" or "night" |
| trade_species | NamedAPIResource → PokemonSpecies | Trade partner species |
| turn_upside_down | boolean | 3DS must be upside-down |
| region | NamedAPIResource → Region | Required region |
| base_form | NamedAPIResource → PokemonSpecies | Required form |
| used_move | NamedAPIResource → Move | Move that must be used |
| min_move_count | integer | Min times a move used |
| min_steps | integer | Min steps taken |
| min_damage_taken | integer | Min damage taken |

### Evolution Trigger

```
GET /evolution-trigger/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name (e.g., "level-up", "trade") |
| names | list Name | Localized names |
| pokemon_species | list NamedAPIResource → PokemonSpecies | Species using this trigger |

---

## Games

### Generation

```
GET /generation/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name (e.g., "generation-i") |
| abilities | list NamedAPIResource → Ability | Abilities introduced |
| names | list Name | Localized names |
| main_region | NamedAPIResource → Region | Main region |
| moves | list NamedAPIResource → Move | Moves introduced |
| pokemon_species | list NamedAPIResource → PokemonSpecies | Species introduced |
| types | list NamedAPIResource → Type | Types introduced |
| version_groups | list NamedAPIResource → VersionGroup | Version groups |

### Pokédex

```
GET /pokedex/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name |
| is_main_series | boolean | From main video games |
| descriptions | list Description | Localized descriptions |
| names | list Name | Localized names |
| pokemon_entries | list PokemonEntry | Catalogued Pokémon |
| region | NamedAPIResource → Region | Region |
| version_groups | list NamedAPIResource → VersionGroup | Relevant version groups |

#### PokemonEntry

| Field | Type | Description |
|-------|------|-------------|
| entry_number | integer | Index in the Pokédex |
| pokemon_species | NamedAPIResource → PokemonSpecies | The species |

### Version

```
GET /version/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name (e.g., "red") |
| names | list Name | Localized names |
| version_group | NamedAPIResource → VersionGroup | Parent version group |

### Version Group

```
GET /version-group/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name (e.g., "red-blue") |
| order | integer | Sort order |
| generation | NamedAPIResource → Generation | Generation |
| move_learn_methods | list NamedAPIResource → MoveLearnMethod | Available learn methods |
| pokedexes | list NamedAPIResource → Pokedex | Pokédexes |
| regions | list NamedAPIResource → Region | Visitable regions |
| versions | list NamedAPIResource → Version | Versions in this group |

---

## Items

### Item

```
GET /item/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name |
| cost | integer | Store price |
| fling_power | integer | Power when used with Fling |
| fling_effect | NamedAPIResource → ItemFlingEffect | Fling effect |
| attributes | list NamedAPIResource → ItemAttribute | Item attributes |
| category | NamedAPIResource → ItemCategory | Category |
| effect_entries | list VerboseEffect | Localized effects |
| flavor_text_entries | list VersionGroupFlavorText | Localized flavor text |
| game_indices | list GenerationGameIndex | Game indices |
| names | list Name | Localized names |
| sprites | ItemSprites | Sprite images |
| held_by_pokemon | list ItemHolderPokemon | Pokémon that hold this |
| baby_trigger_for | APIResource → EvolutionChain | Evolution chain this triggers |
| machines | list MachineVersionDetail | Related machines |

#### ItemSprites

| Field | Type | Description |
|-------|------|-------------|
| default | string | Default sprite URL |

#### ItemHolderPokemon

| Field | Type | Description |
|-------|------|-------------|
| pokemon | NamedAPIResource → Pokemon | The Pokémon |
| version_details | list ItemHolderPokemonVersionDetail | Version details |

#### ItemHolderPokemonVersionDetail

| Field | Type | Description |
|-------|------|-------------|
| rarity | integer | Hold frequency |
| version | NamedAPIResource → Version | Game version |

### Item Attribute

```
GET /item-attribute/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name |
| items | list NamedAPIResource → Item | Items with this attribute |
| names | list Name | Localized names |
| descriptions | list Description | Localized descriptions |

### Item Category

```
GET /item-category/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name |
| items | list NamedAPIResource → Item | Items in this category |
| names | list Name | Localized names |
| pocket | NamedAPIResource → ItemPocket | Bag pocket |

### Item Fling Effect

```
GET /item-fling-effect/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name |
| effect_entries | list Effect | Localized effects |
| items | list NamedAPIResource → Item | Items with this effect |

### Item Pocket

```
GET /item-pocket/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name |
| categories | list NamedAPIResource → ItemCategory | Categories in this pocket |
| names | list Name | Localized names |

---

## Locations

### Location

```
GET /location/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name |
| region | NamedAPIResource → Region | Region |
| names | list Name | Localized names |
| game_indices | list GenerationGameIndex | Game indices |
| areas | list NamedAPIResource → LocationArea | Areas within |

### Location Area

```
GET /location-area/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name |
| game_index | integer | Internal game ID |
| encounter_method_rates | list EncounterMethodRate | Encounter methods + rates |
| location | NamedAPIResource → Location | Parent location |
| names | list Name | Localized names |
| pokemon_encounters | list PokemonEncounter | Pokémon found here |

#### EncounterMethodRate

| Field | Type | Description |
|-------|------|-------------|
| encounter_method | NamedAPIResource → EncounterMethod | Method |
| version_details | list EncounterVersionDetails | Version-specific rates |

#### EncounterVersionDetails

| Field | Type | Description |
|-------|------|-------------|
| rate | integer | Encounter chance |
| version | NamedAPIResource → Version | Game version |

#### PokemonEncounter

| Field | Type | Description |
|-------|------|-------------|
| pokemon | NamedAPIResource → Pokemon | The Pokémon |
| version_details | list VersionEncounterDetail | Version-specific encounters |

### Pal Park Area

```
GET /pal-park-area/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name |
| names | list Name | Localized names |
| pokemon_encounters | list PalParkEncounterSpecies | Pokémon encounters |

#### PalParkEncounterSpecies

| Field | Type | Description |
|-------|------|-------------|
| base_score | integer | Base catch score |
| rate | integer | Base encounter rate |
| pokemon_species | NamedAPIResource → PokemonSpecies | The species |

### Region

```
GET /region/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name |
| locations | list NamedAPIResource → Location | Locations |
| main_generation | NamedAPIResource → Generation | Introduction generation |
| names | list Name | Localized names |
| pokedexes | list NamedAPIResource → Pokedex | Regional Pokédexes |
| version_groups | list NamedAPIResource → VersionGroup | Visitable version groups |

---

## Machines

### Machine

```
GET /machine/{id}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| item | NamedAPIResource → Item | TM/HM item |
| move | NamedAPIResource → Move | Taught move |
| version_group | NamedAPIResource → VersionGroup | Version group |

---

## Moves

### Move

```
GET /move/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name |
| accuracy | integer | Hit chance (%) |
| effect_chance | integer | Effect trigger chance (%) |
| pp | integer | Power Points |
| priority | integer | Move order (-8 to 8) |
| power | integer | Base power (0 = no base power) |
| contest_combos | ContestComboSets | Contest combo details |
| contest_type | NamedAPIResource → ContestType | Contest appeal type |
| contest_effect | APIResource → ContestEffect | Contest effect |
| damage_class | NamedAPIResource → MoveDamageClass | Physical/Special/Status |
| effect_entries | list VerboseEffect | Localized effects |
| effect_changes | list AbilityEffectChange | Historical effect changes |
| learned_by_pokemon | list NamedAPIResource → Pokemon | Pokémon that learn it |
| flavor_text_entries | list MoveFlavorText | Localized flavor text |
| generation | NamedAPIResource → Generation | Introduction generation |
| machines | list MachineVersionDetail | TM/HM associations |
| meta | MoveMetaData | Combat metadata |
| names | list Name | Localized names |
| past_values | list PastMoveStatValues | Historical stat changes |
| stat_changes | list MoveStatChange | Stat modifications |
| super_contest_effect | APIResource → SuperContestEffect | Super contest effect |
| target | NamedAPIResource → MoveTarget | Targeting type |
| type | NamedAPIResource → Type | Elemental type |

#### ContestComboSets

| Field | Type | Description |
|-------|------|-------------|
| normal | ContestComboDetail | Normal contest combos |
| super | ContestComboDetail | Super contest combos |

#### ContestComboDetail

| Field | Type | Description |
|-------|------|-------------|
| use_before | list NamedAPIResource → Move | Moves to use before |
| use_after | list NamedAPIResource → Move | Moves to use after |

#### MoveFlavorText

| Field | Type | Description |
|-------|------|-------------|
| flavor_text | string | Localized text |
| language | NamedAPIResource → Language | Language |
| version_group | NamedAPIResource → VersionGroup | Version group |

#### MoveMetaData

| Field | Type | Description |
|-------|------|-------------|
| ailment | NamedAPIResource → MoveAilment | Status ailment inflicted |
| category | NamedAPIResource → MoveCategory | Move category |
| min_hits | integer | Min hits (null if always 1) |
| max_hits | integer | Max hits (null if always 1) |
| min_turns | integer | Min effect turns (null if 1) |
| max_turns | integer | Max effect turns (null if 1) |
| drain | integer | HP drain % (negative = recoil) |
| healing | integer | HP heal % of max HP |
| crit_rate | integer | Crit rate bonus |
| ailment_chance | integer | Ailment chance (%) |
| flinch_chance | integer | Flinch chance (%) |
| stat_chance | integer | Stat change chance (%) |

#### MoveStatChange

| Field | Type | Description |
|-------|------|-------------|
| change | integer | Change amount |
| stat | NamedAPIResource → Stat | Affected stat |

#### PastMoveStatValues

| Field | Type | Description |
|-------|------|-------------|
| accuracy | integer | Previous accuracy |
| effect_chance | integer | Previous effect chance |
| power | integer | Previous power |
| pp | integer | Previous PP |
| effect_entries | list VerboseEffect | Previous effects |
| type | NamedAPIResource → Type | Previous type |
| version_group | NamedAPIResource → VersionGroup | Version group |

### Move Ailment

```
GET /move-ailment/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name |
| moves | list NamedAPIResource → Move | Moves causing this ailment |
| names | list Name | Localized names |

### Move Battle Style

```
GET /move-battle-style/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name |
| names | list Name | Localized names |

### Move Category

```
GET /move-category/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name |
| moves | list NamedAPIResource → Move | Moves in this category |
| descriptions | list Description | Localized descriptions |

### Move Damage Class

```
GET /move-damage-class/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name (physical / special / status) |
| descriptions | list Description | Localized descriptions |
| moves | list NamedAPIResource → Move | Moves in this class |
| names | list Name | Localized names |

### Move Learn Method

```
GET /move-learn-method/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name |
| descriptions | list Description | Localized descriptions |
| names | list Name | Localized names |
| version_groups | list NamedAPIResource → VersionGroup | Applicable version groups |

### Move Target

```
GET /move-target/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name |
| descriptions | list Description | Localized descriptions |
| moves | list NamedAPIResource → Move | Moves with this target |
| names | list Name | Localized names |

---

## Pokémon

### Ability

```
GET /ability/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name |
| is_main_series | boolean | From main game series |
| generation | NamedAPIResource → Generation | Origin generation |
| names | list Name | Localized names |
| effect_entries | list VerboseEffect | Localized effects |
| effect_changes | list AbilityEffectChange | Historical changes |
| flavor_text_entries | list AbilityFlavorText | Localized flavor text |
| pokemon | list AbilityPokemon | Pokémon with this ability |

#### AbilityEffectChange

| Field | Type | Description |
|-------|------|-------------|
| effect_entries | list Effect | Previous effects |
| version_group | NamedAPIResource → VersionGroup | Version group |

#### AbilityFlavorText

| Field | Type | Description |
|-------|------|-------------|
| flavor_text | string | Localized text |
| language | NamedAPIResource → Language | Language |
| version_group | NamedAPIResource → VersionGroup | Version group |

#### AbilityPokemon

| Field | Type | Description |
|-------|------|-------------|
| is_hidden | boolean | Whether this is a hidden ability |
| slot | integer | Ability slot (1-3) |
| pokemon | NamedAPIResource → Pokemon | The Pokémon |

### Characteristic

```
GET /characteristic/{id}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| gene_modulo | integer | Highest IV remainder ÷ 5 |
| possible_values | list integer | Possible highest IV values |
| highest_stat | NamedAPIResource → Stat | The stat |
| descriptions | list Description | Localized descriptions |

### Egg Group

```
GET /egg-group/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name |
| names | list Name | Localized names |
| pokemon_species | list NamedAPIResource → PokemonSpecies | Member species |

### Gender

```
GET /gender/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name (female / male / genderless) |
| pokemon_species_details | list PokemonSpeciesGender | Species + gender rates |
| required_for_evolution | list NamedAPIResource → PokemonSpecies | Species needing this gender to evolve |

#### PokemonSpeciesGender

| Field | Type | Description |
|-------|------|-------------|
| rate | integer | Female chance in eighths (-1 = genderless) |
| pokemon_species | NamedAPIResource → PokemonSpecies | The species |

### Growth Rate

```
GET /growth-rate/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name (e.g., "slow", "medium", "fast") |
| formula | string | LaTeX formula |
| descriptions | list Description | Localized descriptions |
| levels | list GrowthRateExperienceLevel | XP table |
| pokemon_species | list NamedAPIResource → PokemonSpecies | Species with this rate |

#### GrowthRateExperienceLevel

| Field | Type | Description |
|-------|------|-------------|
| level | integer | Level |
| experience | integer | XP required to reach this level |

### Nature

```
GET /nature/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name |
| decreased_stat | NamedAPIResource → Stat | Stat decreased by 10% |
| increased_stat | NamedAPIResource → Stat | Stat increased by 10% |
| hates_flavor | NamedAPIResource → BerryFlavor | Disliked flavor |
| likes_flavor | NamedAPIResource → BerryFlavor | Liked flavor |
| pokeathlon_stat_changes | list NatureStatChange | Pokéathlon effects |
| move_battle_style_preferences | list MoveBattleStylePreference | Battle Palace preferences |
| names | list Name | Localized names |

#### NatureStatChange

| Field | Type | Description |
|-------|------|-------------|
| max_change | integer | Change amount |
| pokeathlon_stat | NamedAPIResource → PokeathlonStat | Affected stat |

#### MoveBattleStylePreference

| Field | Type | Description |
|-------|------|-------------|
| low_hp_preference | integer | Use chance (%) when HP < 50% |
| high_hp_preference | integer | Use chance (%) when HP > 50% |
| move_battle_style | NamedAPIResource → MoveBattleStyle | Battle style |

### Pokéathlon Stat

```
GET /pokeathlon-stat/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name |
| names | list Name | Localized names |
| affecting_natures | NaturePokeathlonStatAffectSets | Nature effects |

#### NaturePokeathlonStatAffectSets

| Field | Type | Description |
|-------|------|-------------|
| increase | list NaturePokeathlonStatAffect | Positive effects |
| decrease | list NaturePokeathlonStatAffect | Negative effects |

#### NaturePokeathlonStatAffect

| Field | Type | Description |
|-------|------|-------------|
| max_change | integer | Maximum change |
| nature | NamedAPIResource → Nature | The nature |

### Pokemon

```
GET /pokemon/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name |
| base_experience | integer | XP gained for defeating |
| height | integer | Height in decimetres |
| is_default | boolean | Default for this species |
| order | integer | Sort order (families grouped) |
| weight | integer | Weight in hectograms |
| abilities | list PokemonAbility | Possible abilities |
| forms | list NamedAPIResource → PokemonForm | Possible forms |
| game_indices | list VersionGameIndex | Game indices |
| held_items | list PokemonHeldItem | Wild held items |
| location_area_encounters | string | URL to encounter data |
| moves | list PokemonMove | Learnable moves |
| past_types | list PokemonTypePast | Historical types |
| past_abilities | list PokemonAbilityPast | Historical abilities |
| past_stats | list PokemonStatPast | Historical stats |
| sprites | PokemonSprites | Sprite images |
| cries | PokemonCries | Cry audio files |
| species | NamedAPIResource → PokemonSpecies | Species |
| stats | list PokemonStat | Base stats |
| types | list PokemonType | Types |

#### PokemonAbility

| Field | Type | Description |
|-------|------|-------------|
| is_hidden | boolean | Hidden ability |
| slot | integer | Slot (1-3) |
| ability | NamedAPIResource → Ability | The ability |

#### PokemonType

| Field | Type | Description |
|-------|------|-------------|
| slot | integer | Type slot order |
| type | NamedAPIResource → Type | The type |

#### PokemonTypePast

| Field | Type | Description |
|-------|------|-------------|
| generation | NamedAPIResource → Generation | Last gen with these types |
| types | list PokemonType | The types |

#### PokemonAbilityPast

| Field | Type | Description |
|-------|------|-------------|
| generation | NamedAPIResource → Generation | Last gen with these abilities |
| abilities | list PokemonAbility | The abilities (null = empty slot) |

#### PokemonStatPast

| Field | Type | Description |
|-------|------|-------------|
| generation | NamedAPIResource → Generation | Last gen with these stats |
| stats | list PokemonStat | The stats |

#### PokemonHeldItem

| Field | Type | Description |
|-------|------|-------------|
| item | NamedAPIResource → Item | The item |
| version_details | list PokemonHeldItemVersion | Version details |

#### PokemonHeldItemVersion

| Field | Type | Description |
|-------|------|-------------|
| version | NamedAPIResource → Version | Game version |
| rarity | integer | Hold chance |

#### PokemonMove

| Field | Type | Description |
|-------|------|-------------|
| move | NamedAPIResource → Move | The move |
| version_group_details | list PokemonMoveVersion | Learn details per version |

#### PokemonMoveVersion

| Field | Type | Description |
|-------|------|-------------|
| move_learn_method | NamedAPIResource → MoveLearnMethod | How learned |
| version_group | NamedAPIResource → VersionGroup | Version group |
| level_learned_at | integer | Level required (0 = not level-up) |
| order | integer | Replace priority (lowest replaced first) |

#### PokemonStat

| Field | Type | Description |
|-------|------|-------------|
| stat | NamedAPIResource → Stat | The stat |
| effort | integer | EVs gained |
| base_stat | integer | Base stat value |

#### PokemonSprites

| Field | Type | Description |
|-------|------|-------------|
| front_default | string | Front sprite |
| front_shiny | string | Front shiny sprite |
| front_female | string | Front female sprite |
| front_shiny_female | string | Front shiny female sprite |
| back_default | string | Back sprite |
| back_shiny | string | Back shiny sprite |
| back_female | string | Back female sprite |
| back_shiny_female | string | Back shiny female sprite |

> Sprites also include nested `versions` and `other` objects with generation-specific and alternative artwork (e.g., `other.official-artwork.front_default`).

#### PokemonCries

| Field | Type | Description |
|-------|------|-------------|
| latest | string | Latest cry audio URL (.ogg) |
| legacy | string | Legacy cry audio URL (.ogg) |

### Pokemon Location Areas

```
GET /pokemon/{id or name}/encounters
```

Returns a list of `LocationAreaEncounter`:

| Field | Type | Description |
|-------|------|-------------|
| location_area | NamedAPIResource → LocationArea | The location area |
| version_details | list VersionEncounterDetail | Version-specific encounters |

### Pokemon Color

```
GET /pokemon-color/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name (black, blue, brown, gray, green, pink, purple, red, white, yellow) |
| names | list Name | Localized names |
| pokemon_species | list NamedAPIResource → PokemonSpecies | Species with this color |

### Pokemon Form

```
GET /pokemon-form/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name |
| order | integer | Global sort order |
| form_order | integer | Sort order within species |
| is_default | boolean | Default form for species |
| is_battle_only | boolean | Only appears in battle |
| is_mega | boolean | Requires Mega Evolution |
| form_name | string | Form name |
| pokemon | NamedAPIResource → Pokemon | The Pokémon |
| types | list PokemonFormType | Form types |
| sprites | PokemonFormSprites | Form sprites |
| version_group | NamedAPIResource → VersionGroup | Introduction version group |
| names | list Name | Form-specific full names |
| form_names | list Name | Form-specific form names |

#### PokemonFormType

| Field | Type | Description |
|-------|------|-------------|
| slot | integer | Type slot |
| type | NamedAPIResource → Type | The type |

#### PokemonFormSprites

| Field | Type | Description |
|-------|------|-------------|
| front_default | string | Front sprite |
| front_shiny | string | Front shiny sprite |
| back_default | string | Back sprite |
| back_shiny | string | Back shiny sprite |

### Pokemon Habitat

```
GET /pokemon-habitat/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name |
| names | list Name | Localized names |
| pokemon_species | list NamedAPIResource → PokemonSpecies | Species in this habitat |

### Pokemon Shape

```
GET /pokemon-shape/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name |
| awesome_names | list AwesomeName | "Scientific" names |
| names | list Name | Localized names |
| pokemon_species | list NamedAPIResource → PokemonSpecies | Species with this shape |

#### AwesomeName

| Field | Type | Description |
|-------|------|-------------|
| awesome_name | string | Scientific name |
| language | NamedAPIResource → Language | Language |

### Pokemon Species

```
GET /pokemon-species/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name |
| order | integer | National Dex order (families grouped) |
| gender_rate | integer | Female chance in eighths (-1 = genderless) |
| capture_rate | integer | Base catch rate (0-255) |
| base_happiness | integer | Initial happiness (0-255) |
| is_baby | boolean | Baby Pokémon |
| is_legendary | boolean | Legendary Pokémon |
| is_mythical | boolean | Mythical Pokémon |
| hatch_counter | integer | Egg hatch counter |
| has_gender_differences | boolean | Visual gender differences |
| forms_switchable | boolean | Can switch between forms |
| growth_rate | NamedAPIResource → GrowthRate | XP growth rate |
| pokedex_numbers | list PokemonSpeciesDexEntry | Pokédex entries |
| egg_groups | list NamedAPIResource → EggGroup | Egg groups |
| color | NamedAPIResource → PokemonColor | Pokédex color |
| shape | NamedAPIResource → PokemonShape | Pokédex shape |
| evolves_from_species | NamedAPIResource → PokemonSpecies | Pre-evolution species |
| evolution_chain | APIResource → EvolutionChain | Evolution chain |
| habitat | NamedAPIResource → PokemonHabitat | Habitat |
| generation | NamedAPIResource → Generation | Introduction generation |
| names | list Name | Localized names |
| pal_park_encounters | list PalParkEncounterArea | Pal Park data |
| flavor_text_entries | list FlavorText | Pokédex flavor text |
| form_descriptions | list Description | Form descriptions |
| genera | list Genus | Genus (e.g., "Seed Pokémon") |
| varieties | list PokemonSpeciesVariety | All varieties |

#### Genus

| Field | Type | Description |
|-------|------|-------------|
| genus | string | Localized genus |
| language | NamedAPIResource → Language | Language |

#### PokemonSpeciesDexEntry

| Field | Type | Description |
|-------|------|-------------|
| entry_number | integer | Pokédex index |
| pokedex | NamedAPIResource → Pokedex | The Pokédex |

#### PalParkEncounterArea

| Field | Type | Description |
|-------|------|-------------|
| base_score | integer | Catch score |
| rate | integer | Encounter rate |
| area | NamedAPIResource → PalParkArea | Pal Park area |

#### PokemonSpeciesVariety

| Field | Type | Description |
|-------|------|-------------|
| is_default | boolean | Default variety |
| pokemon | NamedAPIResource → Pokemon | The Pokémon |

### Stat

```
GET /stat/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name (hp, attack, defense, special-attack, special-defense, speed) |
| game_index | integer | In-game stat ID |
| is_battle_only | boolean | Battle-only stat (e.g., accuracy, evasion) |
| affecting_moves | MoveStatAffectSets | Moves that affect this stat |
| affecting_natures | NatureStatAffectSets | Natures that affect this stat |
| characteristics | list APIResource → Characteristic | Related characteristics |
| move_damage_class | NamedAPIResource → MoveDamageClass | Related damage class |
| names | list Name | Localized names |

#### MoveStatAffectSets

| Field | Type | Description |
|-------|------|-------------|
| increase | list MoveStatAffect | Moves that increase |
| decrease | list MoveStatAffect | Moves that decrease |

#### MoveStatAffect

| Field | Type | Description |
|-------|------|-------------|
| change | integer | Change amount |
| move | NamedAPIResource → Move | The move |

#### NatureStatAffectSets

| Field | Type | Description |
|-------|------|-------------|
| increase | list NamedAPIResource → Nature | Natures that increase |
| decrease | list NamedAPIResource → Nature | Natures that decrease |

### Type

```
GET /type/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name |
| damage_relations | TypeRelations | Type effectiveness |
| past_damage_relations | list TypeRelationsPast | Historical effectiveness |
| game_indices | list GenerationGameIndex | Game indices |
| generation | NamedAPIResource → Generation | Introduction generation |
| move_damage_class | NamedAPIResource → MoveDamageClass | Damage class |
| names | list Name | Localized names |
| pokemon | list TypePokemon | Pokémon with this type |
| moves | list NamedAPIResource → Move | Moves of this type |

#### TypePokemon

| Field | Type | Description |
|-------|------|-------------|
| slot | integer | Type slot |
| pokemon | NamedAPIResource → Pokemon | The Pokémon |

#### TypeRelations

| Field | Type | Description |
|-------|------|-------------|
| no_damage_to | list NamedAPIResource → Type | No effect on |
| half_damage_to | list NamedAPIResource → Type | Not very effective against |
| double_damage_to | list NamedAPIResource → Type | Super effective against |
| no_damage_from | list NamedAPIResource → Type | Immune to |
| half_damage_from | list NamedAPIResource → Type | Resists |
| double_damage_from | list NamedAPIResource → Type | Weak to |

#### TypeRelationsPast

| Field | Type | Description |
|-------|------|-------------|
| generation | NamedAPIResource → Generation | Last gen with these relations |
| damage_relations | TypeRelations | The relations |

---

## Utility

### Language

```
GET /language/{id or name}/
```

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Identifier |
| name | string | Name |
| official | boolean | Games published in this language |
| iso639 | string | Two-letter language code |
| iso3166 | string | Two-letter country code |
| names | list Name | Localized names |

---

## Quick Reference — All Endpoints

| Endpoint | URL Pattern | Lookup |
|----------|-------------|--------|
| Berry | `/berry/{id or name}/` | id / name |
| Berry Firmness | `/berry-firmness/{id or name}/` | id / name |
| Berry Flavor | `/berry-flavor/{id or name}/` | id / name |
| Contest Type | `/contest-type/{id or name}/` | id / name |
| Contest Effect | `/contest-effect/{id}/` | id |
| Super Contest Effect | `/super-contest-effect/{id}/` | id |
| Encounter Method | `/encounter-method/{id or name}/` | id / name |
| Encounter Condition | `/encounter-condition/{id or name}/` | id / name |
| Encounter Condition Value | `/encounter-condition-value/{id or name}/` | id / name |
| Evolution Chain | `/evolution-chain/{id}/` | id |
| Evolution Trigger | `/evolution-trigger/{id or name}/` | id / name |
| Generation | `/generation/{id or name}/` | id / name |
| Pokédex | `/pokedex/{id or name}/` | id / name |
| Version | `/version/{id or name}/` | id / name |
| Version Group | `/version-group/{id or name}/` | id / name |
| Item | `/item/{id or name}/` | id / name |
| Item Attribute | `/item-attribute/{id or name}/` | id / name |
| Item Category | `/item-category/{id or name}/` | id / name |
| Item Fling Effect | `/item-fling-effect/{id or name}/` | id / name |
| Item Pocket | `/item-pocket/{id or name}/` | id / name |
| Location | `/location/{id or name}/` | id / name |
| Location Area | `/location-area/{id or name}/` | id / name |
| Pal Park Area | `/pal-park-area/{id or name}/` | id / name |
| Region | `/region/{id or name}/` | id / name |
| Machine | `/machine/{id}/` | id |
| Move | `/move/{id or name}/` | id / name |
| Move Ailment | `/move-ailment/{id or name}/` | id / name |
| Move Battle Style | `/move-battle-style/{id or name}/` | id / name |
| Move Category | `/move-category/{id or name}/` | id / name |
| Move Damage Class | `/move-damage-class/{id or name}/` | id / name |
| Move Learn Method | `/move-learn-method/{id or name}/` | id / name |
| Move Target | `/move-target/{id or name}/` | id / name |
| Ability | `/ability/{id or name}/` | id / name |
| Characteristic | `/characteristic/{id}/` | id |
| Egg Group | `/egg-group/{id or name}/` | id / name |
| Gender | `/gender/{id or name}/` | id / name |
| Growth Rate | `/growth-rate/{id or name}/` | id / name |
| Nature | `/nature/{id or name}/` | id / name |
| Pokéathlon Stat | `/pokeathlon-stat/{id or name}/` | id / name |
| **Pokemon** | **`/pokemon/{id or name}/`** | **id / name** |
| Pokemon Encounters | `/pokemon/{id or name}/encounters` | id / name |
| Pokemon Color | `/pokemon-color/{id or name}/` | id / name |
| **Pokemon Form** | **`/pokemon-form/{id or name}/`** | **id / name** |
| Pokemon Habitat | `/pokemon-habitat/{id or name}/` | id / name |
| Pokemon Shape | `/pokemon-shape/{id or name}/` | id / name |
| **Pokemon Species** | **`/pokemon-species/{id or name}/`** | **id / name** |
| Stat | `/stat/{id or name}/` | id / name |
| Type | `/type/{id or name}/` | id / name |
| Language | `/language/{id or name}/` | id / name |

**Bold** = endpoints most relevant to this project's data pipeline.

---

## Sprite URLs

Sprites are hosted on GitHub. Common patterns:

```
# Official artwork (high-res, used in this project)
https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{id}.png
https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/{id}.png

# Default game sprites
https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{id}.png
https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/{id}.png

# HOME artwork (3D renders)
https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/{id}.png
https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/shiny/{id}.png
```

---

## Wrapper Libraries

| Language | Library | Auto-cache |
|----------|---------|------------|
| Node.js (server) | [Pokedex Promise v2](https://github.com/PokeAPI/pokedex-promise-v2) | Yes |
| Browser JS | [pokeapi-js-wrapper](https://github.com/PokeAPI/pokeapi-js-wrapper) | Yes |
| TypeScript | [Pokenode-ts](https://github.com/Gabb-c/pokenode-ts) | Yes |
| Python 3 | [PokeBase](https://github.com/GregHilmes/pokebase) | Yes |
| Python async | [aiopokeapi](https://github.com/beastmatser/aiopokeapi) | Yes |
| Kotlin Multiplatform | [PokeKotlin](https://github.com/PokeAPI/pokekotlin) | Yes |
| Java (Spring Boot) | [pokeapi-reactor](https://github.com/SirSkaro/pokeapi-reactor) | Yes |
| .NET Standard | [PokeApiNet](https://github.com/mtrdp642/PokeApiNet) | — |
| Swift | [PokemonAPI](https://github.com/kinkofer/PokemonAPI) | — |
| Go | [pokeapi-go](https://github.com/mtslzr/pokeapi-go) | — |
| Rust | [Rustemon](https://crates.io/crates/rustemon) | Yes |
| PHP | [PokePHP](https://github.com/danrovito/pokephp) | — |
| Ruby | [Poke-Api-V2](https://github.com/rdavid1099/poke-api-v2) | — |
| Elixir | [Max-Elixir-PokeAPI](https://github.com/HenriqueArtur/Max-Elixir-PokeAPI) | Yes |
| Scala 3 | [pokeapi-scala](https://github.com/juliano/pokeapi-scala) | Yes |
