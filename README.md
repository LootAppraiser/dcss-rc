# dcss-rc

My Dungeon Crawl Stone Soup rc for **Webtiles** (set up on [CDI](https://crawl.dcss.io), trunk), plus the
[BRC](https://github.com/brianfaires/crawl-rc) features I actually use. One file: [`init.txt`](init.txt).

## Use it

1. On the server, next to **Play**, click **edit rc** for the game version you play.
2. Paste the contents of `init.txt`, save, start a new game.

That's it. If the game shows a Lua error on startup, read the message and line number before taking any
turns, and open an issue with it.

## What you need for the whole thing

| Part | Needs |
|---|---|
| Plain crawl options (travel, explore, safety, autofight, menus) | nothing |
| `tile_font_*` lines | the [Maple Mono NF](https://github.com/subframe7536/maple-font) font installed on your computer (otherwise delete those lines) |
| `sounds_on`, `sound_pack`, `bgm_volume`, `show_gold_status` | [DWEM](https://github.com/refracta/dcss-webtiles-extension-module) in Tampermonkey (sound packs, gold in the status panel) |
| `record_wtrec` | DWEM (its WTRec module records games in your browser; `/wtrec list` in chat shows them) |
| `fx_*` lines | [dcss-fx](https://github.com/LootAppraiser/dcss-fx) (smooth movement, attack effects, light) on top of DWEM |
| BRC section at the bottom | nothing, it is plain Lua in the rc |

The `fx_*` and sound lines are only read by the browser extensions, not by crawl. Without them they do
nothing; crawl may mention them as unknown options at startup, which is harmless.

## What is in it

- **Pickup**: autopickup for gold, scrolls, potions, books, jewellery, wands and gems; armour and weapons are
  yours to choose.
- **Travel / explore**: single-step travel at 20 ms, explore wall bias, a tuned list of things explore stops for.
- **Safety**: confirm risky spell failure rates and one-way hatches, capital-Y confirmations, autofight stops below 75% HP.
- **Display**: fonts and sizes, 2x map scale, bigger action panel.
- **Keys**: `Ctrl-Tab` autofight without moving, `Ctrl-D` travel to the nearest `>` and descend, `Ctrl-E` go up.
- **BRC features** (full build, only these modules): monster danger alerts, rest until fully recovered,
  item stat inscriptions (AC/EV/damage), spell-level and faith-amulet alerts, quiver reminders, safe stairs.
  The BRC section is large because BRC is a Lua framework; the options at the top are the part to edit.

## Make it yours

- Anything under a `##### lua/features/NAME.lua #####` banner is one BRC feature: delete that whole block to
  drop it (BRC finds features by itself, nothing else needs editing).
- BRC's own settings are the `brc_config_custom` table near the top of the Lua section.
- Personal taste lives in the first ~100 lines: delays, fonts, sizes, `fx_*` tuning, keys.

## Credits and license

MIT, see [LICENSE](LICENSE). The Lua section is BRC by Brian Faires (MIT), see [NOTICE](NOTICE) for what is
included and the one change made to it.
