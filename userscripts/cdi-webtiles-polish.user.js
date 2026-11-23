// ==UserScript==
// @name         CDI WebTiles Polish
// @namespace    https://github.com/LootAppraiser
// @version      2.2.2
// @description  crawl.dcss.io: Maple Mono (woff2) everywhere in game and lobby, plus a clean lobby with a header bar, grouped Play buttons, a readable games table and the DWEM recordings list
// @match        https://crawl.dcss.io/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  var CFG = {
    gameFont: true,         // Maple Mono for all in-game text (messages, stats, menus, map glyphs, action panel)
    lobbyTheme: true,       // the lobby redesign below
    hidePatreon: true,
    hideServerNotes: false, // the SSH / Code of Conduct / contact lines in the footer
    hideLoginForm: false,
    idleDimSeconds: 300,    // rows idle at least this long are dimmed (0 = never)
  };

  // ---- font: Maple Mono NL (no ligatures, OFL-1.1) as woff2 ----
  // Full-coverage files live in this repo (fonts/maple-mono); the fontsource
  // latin subset is the fallback if jsDelivr can't serve them.
  var FONT = 'WT Maple Mono';
  var FONT_REPO = 'https://cdn.jsdelivr.net/gh/LootAppraiser/dcss-rc@main/fonts/maple-mono/MapleMonoNL-';
  var FONT_NPM = 'https://cdn.jsdelivr.net/npm/@fontsource/maple-mono@5.3.0/files/maple-mono-latin-';
  var WEIGHTS = [[400, 'Regular'], [500, 'Medium'], [600, 'SemiBold'], [700, 'Bold']];
  var fontFaces = WEIGHTS.map(function (w) {
    return '@font-face { font-family: "' + FONT + '"; font-style: normal; font-weight: ' + w[0] + '; font-display: swap; ' +
      'src: url("' + FONT_REPO + w[1] + '.woff2") format("woff2"), url("' + FONT_NPM + w[0] + '-normal.woff2") format("woff2"); }';
  }).join('\n');

  var fontStyle = document.createElement('style');
  fontStyle.id = 'wt-font';
  fontStyle.textContent = fontFaces + (CFG.gameFont ? `
  /* the game sets these inline on <html> from the tile_font_* options; !important wins over that */
  :root {
    --crt-font: "${FONT}", "DejaVu Sans Mono", monospace !important;
    --msg-font: "${FONT}", "DejaVu Sans Mono", monospace !important;
    --stat-font: "${FONT}", "DejaVu Sans Mono", monospace !important;
    --lbl-font: "${FONT}", "DejaVu Sans Mono", monospace !important;
    --action-font: "${FONT}", "DejaVu Sans Mono", monospace !important;
  }` : '');
  document.head.appendChild(fontStyle);

  if (CFG.gameFont) {
    // Canvas text (glyph-mode map, action panel counts) is drawn with plain
    // "Npx monospace" font strings; point those at Maple Mono too.
    var proto = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
    var fontDesc = proto && Object.getOwnPropertyDescriptor(proto, 'font');
    if (fontDesc && fontDesc.set && !proto.__wtFont) {
      var fontCache = new Map();
      var mapFont = function (v) {
        if (typeof v !== 'string' || v.indexOf(FONT) !== -1) return v;
        var out = fontCache.get(v);
        if (out === undefined) {
          out = v.replace(/(^|[\s,])monospace\s*$/i, '$1"' + FONT + '", monospace');
          if (fontCache.size < 500) fontCache.set(v, out);
        }
        return out;
      };
      Object.defineProperty(proto, 'font', {
        configurable: true,
        enumerable: fontDesc.enumerable,
        get: fontDesc.get,
        set: function (v) { fontDesc.set.call(this, mapFont(v)); },
      });
      proto.__wtFont = true;
    }
    // Canvas never triggers a webfont load by itself in time for the first frame
    // (and the glyph-mode cell size is measured once at game start), so load now.
    if (document.fonts && document.fonts.load) {
      WEIGHTS.forEach(function (w) { document.fonts.load(w[0] + ' 16px "' + FONT + '"').catch(function () {}); });
    }
  }

  // ---- lobby ----
  // The game view reuses this page (same document, no reload), so the lobby
  // <style> tag is attached only while #lobby is on screen.
  var lobbyEl = document.getElementById('lobby');
  if (!lobbyEl || !CFG.lobbyTheme) return;

  var css = `
  :root {
    --wt-bg: #0b0d11;
    --wt-surface: #12151b;
    --wt-surface-2: #181c24;
    --wt-hover: #1a1f29;
    --wt-input: #0e1116;
    --wt-border: #242a35;
    --wt-border-soft: #1b2029;
    --wt-text: #e7e9ee;
    --wt-text-2: #b3b9c5;
    --wt-muted: #7a8294;
    --wt-accent: #e5b45a;
    --wt-accent-ink: #1d1505;
    --wt-accent-soft: rgba(229, 180, 90, .14);
    --wt-git: #b69cff;
    --wt-seeded: #6ccfdc;
    --wt-mode: #f0a37a;
    --wt-live: #5fd08a;
    --wt-danger: #f07373;
    --wt-ui: "WT Maple Mono", "Maple Mono", "Maple Mono NF", "DejaVu Sans Mono", monospace;
    --wt-mono: var(--wt-ui);
  }
  html, body { background: var(--wt-bg) !important; color: var(--wt-text); }

  #lobby {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 24px 48px;
    font-family: var(--wt-ui);
    font-size: 13px;
    line-height: 1.5;
    color: var(--wt-text);
    -webkit-font-smoothing: antialiased;
  }
  #lobby input, #lobby button, #lobby textarea, #lobby select,
  .floating_dialog, .floating_dialog input, .floating_dialog button { font-family: var(--wt-ui); }
  #lobby > br { display: none; }

  #lobby a:link, #lobby a:visited, .floating_dialog a:link, .floating_dialog a:visited {
    color: var(--wt-accent);
    font-weight: 500;
    text-decoration: none;
  }
  #lobby a:hover, .floating_dialog a:hover { color: var(--wt-text); text-decoration: none; }

  /* ---------- header bar ---------- */
  #lobby > .login_placeholder {
    order: 0;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px 28px;
    min-height: 36px;
    padding: 14px 0;
    margin: 0 0 22px;
    border-bottom: 1px solid var(--wt-border);
    text-align: left;
    font-size: 13px;
    color: var(--wt-text-2);
  }
  .wt-brand { display: flex; align-items: center; gap: 10px; white-space: nowrap; }
  .wt-logo {
    background: var(--wt-accent);
    color: var(--wt-accent-ink);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: .06em;
    padding: 4px 7px;
    border-radius: 6px;
  }
  .wt-brand-name { font-size: 15px; font-weight: 600; color: var(--wt-text); }
  #wt-nav { display: flex; flex-wrap: wrap; gap: 4px 20px; flex: 1 1 auto; }
  #lobby #wt-nav a:link, #lobby #wt-nav a:visited { color: var(--wt-text-2); font-weight: 500; }
  #lobby #wt-nav a:hover { color: var(--wt-text); }

  #lobby #login {
    float: none;
    display: flex;
    align-items: center;
    gap: 14px;
    margin-left: auto;
    text-align: right;
  }
  #login_message:empty { display: none; }
  #login_message { color: var(--wt-text-2); white-space: nowrap; }
  #lobby #login_form { display: flex; align-items: center; gap: 8px; margin: 0; white-space: nowrap; }
  #lobby #login_form label {
    position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap;
  }
  #lobby #login_form input.text { width: 150px; }
  #lobby #login .extra_links { font-size: 0; white-space: nowrap; }
  #lobby #login .extra_links a { font-size: 13px; margin-left: 16px; }
  #lobby #login .extra_links a:first-child { margin-left: 0; }

  /* ---------- form controls ---------- */
  #lobby input.text, .floating_dialog input.text {
    box-sizing: border-box;
    height: 32px;
    padding: 0 10px;
    background: var(--wt-input);
    border: 1px solid var(--wt-border);
    border-radius: 8px;
    color: var(--wt-text);
    font-size: 13px;
    outline: none;
    transition: border-color .12s, box-shadow .12s;
  }
  #lobby textarea, .floating_dialog textarea {
    box-sizing: border-box;
    padding: 10px 12px;
    background: var(--wt-input);
    border: 1px solid var(--wt-border);
    border-radius: 8px;
    color: var(--wt-text);
    font-family: var(--wt-mono);
    font-size: 13px;
    line-height: 1.5;
    outline: none;
  }
  #lobby input.text:focus, .floating_dialog input.text:focus,
  #lobby textarea:focus, .floating_dialog textarea:focus {
    border-color: var(--wt-accent);
    box-shadow: 0 0 0 3px var(--wt-accent-soft);
  }
  #lobby input::placeholder { color: var(--wt-muted); }
  #lobby input.button, #lobby button, .floating_dialog input.button, .floating_dialog button {
    box-sizing: border-box;
    height: 32px;
    padding: 0 14px;
    background: var(--wt-surface-2);
    border: 1px solid var(--wt-border);
    border-radius: 8px;
    color: var(--wt-text);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background .12s, border-color .12s, color .12s;
  }
  #lobby input.button:hover, #lobby button:hover,
  .floating_dialog input.button:hover, .floating_dialog button:hover { border-color: #3a4252; background: var(--wt-hover); }
  #lobby input.button[type="submit"], .floating_dialog input.button[type="submit"], #lobby button.wt-primary {
    background: var(--wt-accent);
    border-color: var(--wt-accent);
    color: var(--wt-accent-ink);
  }
  #lobby input.button[type="submit"]:hover, .floating_dialog input.button[type="submit"]:hover,
  #lobby button.wt-primary:hover { background: #f0c575; border-color: #f0c575; }

  /* ---------- cards ---------- */
  #play_now, #lobby_body, #wt-recs, #admin_panel {
    background: var(--wt-surface);
    border: 1px solid var(--wt-border);
    border-radius: 12px;
    margin: 0 0 18px;
  }
  .wt-card-head {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 13px 18px;
    border-bottom: 1px solid var(--wt-border);
  }
  .wt-card-title { font-size: 14px; font-weight: 600; color: var(--wt-text); }
  .wt-pill {
    font-size: 11px;
    font-weight: 600;
    line-height: 18px;
    padding: 0 7px;
    border-radius: 999px;
    background: var(--wt-surface-2);
    border: 1px solid var(--wt-border);
    color: var(--wt-text-2);
    font-variant-numeric: tabular-nums;
  }
  .wt-card-meta { margin-left: auto; font-size: 12px; color: var(--wt-muted); }
  .wt-live-dot {
    display: inline-block;
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--wt-live);
    margin-right: 6px;
    vertical-align: 1px;
  }

  #account_restricted {
    margin: 0 0 18px;
    padding: 12px 16px;
    border: 1px solid rgba(229, 180, 90, .35);
    border-radius: 10px;
    background: rgba(229, 180, 90, .07);
    color: #f0d49b;
  }
  #admin_panel { padding: 14px 18px; }
  #admin_panel hr { border: 0; border-top: 1px solid var(--wt-border); margin: 12px 0; }
  #admin_panel_button { margin: 0 0 12px; }

  /* ---------- play now ---------- */
  #play_now { order: 1; padding: 0; text-align: left; }
  #play_now:empty { display: none; }
  #play_now:not(:has(.wt-pn)) { padding: 14px 18px; line-height: 2; }
  .wt-pn-groups { padding: 4px 18px 6px; }
  .wt-pn-group {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 10px 0;
    border-top: 1px solid var(--wt-border-soft);
  }
  .wt-pn-group:first-child { border-top: 0; }
  .wt-pn-ver {
    flex: none;
    width: 72px;
    font-family: var(--wt-mono);
    font-size: 12px;
    font-weight: 600;
    color: var(--wt-muted);
  }
  .wt-pn-ver.is-git { color: var(--wt-git); }
  .wt-pn-games { display: flex; flex-wrap: wrap; gap: 8px; }
  .wt-game {
    display: inline-flex;
    align-items: stretch;
    border: 1px solid var(--wt-border);
    border-radius: 8px;
    background: var(--wt-surface-2);
    overflow: hidden;
    transition: border-color .12s;
  }
  .wt-game:hover { border-color: #3a4252; }
  #lobby .wt-game a:link, #lobby .wt-game a:visited {
    display: flex;
    align-items: center;
    padding: 6px 12px;
    color: var(--wt-text);
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
  }
  #lobby .wt-game a:hover { background: var(--wt-hover); }
  #lobby .wt-game a.edit_rc_link {
    padding: 6px 9px;
    border-left: 1px solid var(--wt-border);
    color: var(--wt-muted);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: .04em;
  }
  #lobby .wt-game a.edit_rc_link:hover { color: var(--wt-text); }
  .wt-game.is-primary { background: var(--wt-accent); border-color: var(--wt-accent); }
  #lobby .wt-game.is-primary a:link, #lobby .wt-game.is-primary a:visited { color: var(--wt-accent-ink); font-weight: 700; }
  #lobby .wt-game.is-primary a:hover { background: #f0c575; }
  #lobby .wt-game.is-primary a.edit_rc_link { color: rgba(29, 21, 5, .7); border-left-color: rgba(0, 0, 0, .18); }
  .wt-pn-extra { padding: 10px 18px 14px; border-top: 1px solid var(--wt-border-soft); font-size: 13px; }
  .wt-pn-extra a { margin-right: 16px; }
  /* older versions fold away: the card answers "how do I play" in two rows */
  .wt-pn-older { border-top: 1px solid var(--wt-border-soft); }
  .wt-pn-older > summary {
    list-style: none;
    cursor: pointer;
    padding: 10px 18px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: var(--wt-muted);
    user-select: none;
  }
  .wt-pn-older > summary::-webkit-details-marker { display: none; }
  .wt-pn-older > summary::before {
    content: '▸';
    display: inline-block;
    width: 1.1em;
    color: var(--wt-muted);
  }
  .wt-pn-older[open] > summary::before { content: '▾'; }
  .wt-pn-older > summary:hover { color: var(--wt-text); }
  .wt-pn-older .wt-pn-groups { padding: 0 18px 8px 30px; }
  .wt-pn-older .wt-pn-group { padding: 6px 0; border-top: 1px dashed var(--wt-border-soft); }
  .wt-pn-older .wt-pn-group:first-child { border-top: 0; }
  /* buttons keep the exact same look as above; only the row rhythm differs */

  /* ---------- games table ---------- */
  #lobby_body { order: 2; text-align: left; overflow: clip; }
  #lobby #player_list {
    width: 100%;
    margin: 0;
    border-collapse: separate;
    border-spacing: 0;
    background: none;
    line-height: 1.35;
    font-variant-numeric: tabular-nums;
  }
  #lobby #player_list th {
    position: sticky;
    top: 0;
    z-index: 2;
    width: auto;
    padding: 9px 12px;
    background: var(--wt-surface-2);
    background-image: none;
    border-bottom: 1px solid var(--wt-border);
    color: var(--wt-muted);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: .06em;
    text-transform: uppercase;
    text-align: left;
    white-space: nowrap;
    user-select: none;
  }
  #lobby #player_list th.header:hover { color: var(--wt-text); }
  #lobby #player_list th.headerSortDown, #lobby #player_list th.headerSortUp { color: var(--wt-text); }
  #lobby #player_list th.headerSortDown::after,
  #lobby #player_list th.headerSortUp::after {
    content: "";
    display: inline-block;
    margin-left: 6px;
    vertical-align: 2px;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
  }
  #lobby #player_list th.headerSortDown::after { border-top: 5px solid var(--wt-accent); }
  #lobby #player_list th.headerSortUp::after { border-bottom: 5px solid var(--wt-accent); }
  #lobby #player_list thead tr:hover { background: none; }

  #lobby #player_list td {
    padding: 8px 12px;
    border-bottom: 1px solid var(--wt-border-soft);
    color: var(--wt-text-2);
    font-size: 13.5px;
    white-space: nowrap;
    vertical-align: middle;
  }
  #lobby #player_list th:first-child, #lobby #player_list td:first-child { padding-left: 18px; }
  #lobby #player_list th:last-child, #lobby #player_list td:last-child { padding-right: 18px; }
  #lobby #player_list tbody tr:last-child td { border-bottom: 0; }
  #lobby #player_list tbody tr { transition: opacity .2s; }
  #lobby #player_list tbody tr:hover { background: var(--wt-hover); }
  #lobby #player_list tbody tr.wt-idle { opacity: .5; }
  #lobby #player_list tbody tr.wt-idle:hover { opacity: .85; }

  #lobby #player_list th.xl, #lobby #player_list th.turn, #lobby #player_list th.dur,
  #lobby #player_list th.idle_time, #lobby #player_list th.spectator_count,
  #lobby #player_list td.xl, #lobby #player_list td.turn, #lobby #player_list td.dur,
  #lobby #player_list td.idle_time, #lobby #player_list td.spectator_count { text-align: right; }

  #lobby #player_list td.username a:link, #lobby #player_list td.username a:visited,
  #lobby #player_list td.username b { color: var(--wt-text); font-weight: 600; }
  #lobby #player_list td.username a:hover { color: var(--wt-accent); }
  #lobby #player_list td.game_id { font-family: var(--wt-mono); font-size: 12px; color: var(--wt-muted); }
  #lobby #player_list td.game_id::before {
    content: "";
    display: inline-block;
    width: 6px; height: 6px;
    margin-right: 8px;
    border-radius: 50%;
    background: currentColor;
    vertical-align: 1px;
  }
  #lobby #player_list td.game_id:empty::before { display: none; }
  #lobby #player_list td.game_id[data-kind="git"] { color: var(--wt-git); }
  #lobby #player_list td.game_id[data-kind="seeded"] { color: var(--wt-seeded); }
  #lobby #player_list td.game_id[data-kind="mode"] { color: var(--wt-mode); }
  #lobby #player_list td.xl { color: var(--wt-text); font-weight: 600; }
  #lobby #player_list td.char { font-family: var(--wt-mono); font-size: 13px; color: var(--wt-text); }
  #lobby #player_list td.turn, #lobby #player_list td.dur, #lobby #player_list td.idle_time { color: var(--wt-muted); }
  #lobby #player_list td.spectator_count { color: var(--wt-live); font-weight: 600; }
  #lobby #player_list td.spectator_count:not(:empty)::before {
    content: "";
    display: inline-block;
    width: 6px; height: 6px;
    margin-right: 6px;
    border-radius: 50%;
    background: var(--wt-live);
    box-shadow: 0 0 0 3px rgba(95, 208, 138, .15);
    vertical-align: 1px;
  }
  #lobby #player_list th.milestone_col { width: auto; }
  #lobby #player_list td.milestone_col { width: 100%; max-width: 0; color: var(--wt-muted); font-size: 13px; }
  #lobby #player_list .milestone_container { height: 1.1em; line-height: 1.1em; overflow: hidden; }
  #lobby #player_list .milestone, #lobby #player_list .new_milestone {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 1100px) {
    #lobby #player_list .turn, #lobby #player_list .idle_time { display: none; }
  }
  @media (max-width: 900px) {
    #lobby #player_list .milestone_col, #lobby #player_list .game_id { display: none; }
  }
  @media (max-width: 640px) {
    #lobby { padding: 0 12px 32px; }
    #lobby #player_list .god { display: none; }
  }

  /* ---------- recordings (DWEM WTRec) ---------- */
  #wt-recs { order: 3; }
  #wt-recs > summary {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 13px 18px;
    cursor: pointer;
    list-style: none;
    user-select: none;
  }
  #wt-recs > summary::-webkit-details-marker { display: none; }
  #wt-recs > summary::before {
    content: "";
    width: 6px; height: 6px;
    margin: 0 2px 0 1px;
    border-right: 1.5px solid var(--wt-muted);
    border-bottom: 1.5px solid var(--wt-muted);
    transform: rotate(-45deg);
    transition: transform .15s;
  }
  #wt-recs[open] > summary::before { transform: rotate(45deg); }
  #wt-recs[open] > summary { border-bottom: 1px solid var(--wt-border); }
  #wt-recs .wt-pill:empty { display: none; }
  #lobby #wt-recs .wt-recs-refresh { height: 26px; padding: 0 10px; font-size: 12px; display: none; }
  #wt-recs[open] .wt-recs-refresh { display: inline-block; }
  #wt-recs .wt-recs-note { padding: 14px 18px; color: var(--wt-muted); font-size: 13px; }
  #wt-recs .wt-rec {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 18px;
    padding: 9px 18px;
    border-top: 1px solid var(--wt-border-soft);
  }
  #wt-recs .wt-rec:first-child { border-top: 0; }
  #wt-recs .wt-rec:hover { background: var(--wt-hover); }
  #wt-recs .wt-rec-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--wt-mono);
    font-size: 13px;
    color: var(--wt-text);
  }
  #wt-recs .wt-rec-meta { color: var(--wt-muted); font-size: 12px; white-space: nowrap; font-variant-numeric: tabular-nums; }
  #wt-recs .wt-rec-actions { display: flex; gap: 6px; }
  #lobby #wt-recs .wt-rec-actions button { height: 28px; padding: 0 11px; font-size: 12px; }
  #lobby #wt-recs .wt-rec-actions button.wt-danger:hover { color: var(--wt-danger); border-color: rgba(240, 115, 115, .5); }

  /* ---------- footer (server notes) ---------- */
  #lobby > #banner { order: 4; }
  #banner > #banner {
    margin: 6px 0 0;
    padding: 18px 2px 0;
    border-top: 1px solid var(--wt-border);
    background: none;
    color: var(--wt-muted);
    font-size: 12.5px;
    line-height: 1.75;
  }
  #banner .wt-title { display: none; }
  #banner > #banner > p {
    display: block !important;
    margin: 0 !important;
    padding: 0 !important;
    background: none !important;
    border-radius: 0 !important;
    line-height: 1.75 !important;
  }
  #lobby #banner a:link, #lobby #banner a:visited { color: var(--wt-text-2); }
  #lobby #banner a:hover { color: var(--wt-accent); }

  /* ---------- dialogs ---------- */
  .floating_dialog {
    min-width: 300px;
    padding: 22px 24px;
    background: var(--wt-surface);
    border: 1px solid var(--wt-border);
    border-radius: 14px;
    box-shadow: 0 24px 64px rgba(0, 0, 0, .6);
    color: var(--wt-text);
    font-size: 14px;
    line-height: 1.5;
  }
  .floating_dialog label { display: block; margin: 12px 0 6px; font-size: 12px; font-weight: 600; color: var(--wt-text-2); }
  .floating_dialog form > br { display: none; }
  .floating_dialog input.text { width: 100%; }
  .floating_dialog p { margin: 12px 0; color: var(--wt-muted); font-size: 12.5px; }
  .floating_dialog input.button { margin: 14px 8px 0 0; }
  .floating_dialog pre { white-space: pre-wrap; font-family: var(--wt-mono); font-size: 12.5px; color: var(--wt-text-2); }
  #rc_edit textarea { width: min(88ch, 82vw); height: 62vh; }
  #lobby .floating_dialog a.hide_dialog { color: var(--wt-muted); }
  `;
  var style = document.createElement('style');
  style.textContent = css;

  function lobbyShown() {
    return getComputedStyle(lobbyEl).display !== 'none';
  }

  function sync() {
    var on = lobbyShown();
    if (on && !style.isConnected) document.head.appendChild(style);
    else if (!on && style.isConnected) style.remove();
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function squash(s) {
    return String(s || '').replace(/[\s\u00a0]+/g, ' ').trim();
  }

  // ---- header: brand + nav links (taken from the server banner) + the login box ----
  function ensureHeader() {
    var bar = lobbyEl.querySelector('.login_placeholder');
    if (!bar || bar.querySelector('.wt-brand')) return;
    var brand = el('div', 'wt-brand');
    brand.appendChild(el('span', 'wt-logo', 'CDI'));
    brand.appendChild(el('span', 'wt-brand-name', 'WebTiles'));
    var nav = el('nav');
    nav.id = 'wt-nav';
    bar.insertBefore(nav, bar.firstChild);
    bar.insertBefore(brand, nav);

    var u = document.getElementById('username');
    var p = document.getElementById('password');
    if (u && !u.placeholder) u.placeholder = 'Username';
    if (p && !p.placeholder) p.placeholder = 'Password';
  }

  // Split a node's children into lines at <br>.
  function splitLines(node) {
    var lines = [[]];
    Array.prototype.slice.call(node.childNodes).forEach(function (n) {
      if (n.nodeType === 1 && n.tagName === 'BR') lines.push([]);
      else lines[lines.length - 1].push(n);
    });
    return lines.filter(function (l) {
      return l.some(function (n) { return n.nodeType === 1 || squash(n.nodeValue); });
    });
  }

  // The banner is server HTML (re-sent on reconnect). It becomes the page footer;
  // its first line of links moves into the header nav.
  function tidyBanner() {
    var inner = document.querySelector('#banner > #banner');
    if (!inner || inner.getAttribute('data-wt') === '1') return;
    inner.setAttribute('data-wt', '1');

    for (var i = 0; i < inner.childNodes.length; i++) {
      var n = inner.childNodes[i];
      if (n.nodeType === 3 && squash(n.nodeValue)) {
        var t = el('span', 'wt-title', squash(n.nodeValue));
        inner.replaceChild(t, n);
        if (t.nextSibling && t.nextSibling.tagName === 'BR') t.nextSibling.remove();
        break;
      }
    }

    if (CFG.hidePatreon) {
      var link = inner.querySelector('a[href*="patreon"]');
      if (link) (link.closest('div[style*="darkorange"]') || link.parentElement).remove();
    }
    Array.prototype.slice.call(inner.children).forEach(function (c) {
      if (c.tagName === 'BR') c.remove();
    });

    var p = inner.querySelector('p');
    if (!p) return;
    var lines = splitLines(p);
    var nav = document.getElementById('wt-nav');
    var first = lines[0] || [];
    var isNav = first.length && first.every(function (n) {
      return (n.nodeType === 1 && n.tagName === 'A') || (n.nodeType === 3 && /^[\s\-|·•]*$/.test(n.nodeValue));
    });
    if (isNav && nav) {
      nav.textContent = '';
      first.forEach(function (n) { if (n.nodeType === 1) nav.appendChild(n.cloneNode(true)); });
      lines.shift();
    }

    var notes = el('div', 'wt-notes');
    lines.forEach(function (line) {
      var d = el('div', 'wt-note');
      line.forEach(function (n) { d.appendChild(n); });
      if (d.firstChild && d.firstChild.nodeType === 3) d.firstChild.nodeValue = d.firstChild.nodeValue.replace(/^\s+/, '');
      notes.appendChild(d);
    });
    p.replaceWith(notes);
    if (CFG.hideServerNotes) notes.remove();
  }

  // ---- play now: rebuild the server's free-form links into version rows ----
  // Anchors are moved, not cloned, so the client's .edit_rc_link click handlers survive.
  // The newest stable and trunk stay in the open; anything older folds into one disclosure.
  function isGitVer(v) {
    return /git|trunk|a\d+$/i.test(v || '');
  }

  function verKey(v) {
    var m = /^(\d+)\.(\d+)(?:\.(\d+))?/.exec(v || '');
    return m ? [+m[1], +m[2], +(m[3] || 0)] : [-1, 0, 0];
  }

  function newestFirst(a, b) {
    var x = verKey(a.ver), y = verKey(b.ver);
    for (var i = 0; i < 3; i++) if (x[i] !== y[i]) return y[i] - x[i];
    return 0;
  }

  function layoutPlayNow() {
    var pn = document.getElementById('play_now');
    if (!pn || pn.querySelector('.wt-pn')) return;
    var plays = Array.prototype.slice.call(pn.querySelectorAll('a[href^="#play-"]'));
    if (!plays.length) return;

    var groups = [], byVer = {};
    var used = new Set();
    plays.forEach(function (a) {
      var id = a.getAttribute('href').slice(6);
      var m = /^([^-]+)-(.+)$/.exec(id);
      var mode = m ? m[1] : id;
      var ver = m ? m[2] : '';
      if (!byVer[ver]) {
        var isGit = isGitVer(ver);
        byVer[ver] = { ver: ver, label: isGit ? 'trunk' : ver, isGit: isGit, games: [] };
        groups.push(byVer[ver]);
      }
      var rc = null;
      pn.querySelectorAll('.edit_rc_link').forEach(function (r) {
        if (!rc && String(r.getAttribute('data-game_id')) === id) rc = r;
      });
      used.add(a);
      if (rc) used.add(rc);
      byVer[ver].games.push({ a: a, rc: rc, mode: mode, label: squash(a.textContent) || id });
    });

    var root = el('div', 'wt-pn');
    var head = el('div', 'wt-card-head');
    head.appendChild(el('span', 'wt-card-title', 'Play'));
    head.appendChild(el('span', 'wt-card-meta', 'rc edits the options file for that game'));
    root.appendChild(head);

    var gitGroups = groups.filter(function (g) { return g.isGit; });
    var stableGroups = groups.filter(function (g) { return !g.isGit; }).sort(newestFirst);
    var main = [];
    if (stableGroups.length) main.push(stableGroups.shift());       // newest stable
    main.push.apply(main, gitGroups);                               // trunk
    var older = stableGroups;                                       // the rest, newest first

    function renderGroup(g) {
      var row = el('div', 'wt-pn-group');
      row.appendChild(el('div', 'wt-pn-ver' + (g.isGit ? ' is-git' : ''), g.label || '-'));
      var games = el('div', 'wt-pn-games');
      g.games.forEach(function (gm, i) {
        var primary = gm.mode === 'dcss' || (i === 0 && !g.games.some(function (x) { return x.mode === 'dcss'; }));
        var box = el('span', 'wt-game' + (primary ? ' is-primary' : ''));
        gm.a.textContent = gm.label;
        box.appendChild(gm.a);
        if (gm.rc) {
          gm.rc.textContent = 'rc';
          gm.rc.title = 'Edit RC for ' + gm.a.getAttribute('href').slice(6);
          box.appendChild(gm.rc);
        }
        games.appendChild(box);
      });
      row.appendChild(games);
      return row;
    }

    var wrap = el('div', 'wt-pn-groups');
    main.forEach(function (g) { wrap.appendChild(renderGroup(g)); });
    root.appendChild(wrap);

    if (older.length) {
      var det = el('details', 'wt-pn-older');
      det.appendChild(el('summary', null, 'Older versions (' + older.length + ')'));
      var ow = el('div', 'wt-pn-groups');
      older.forEach(function (g) { ow.appendChild(renderGroup(g)); });
      det.appendChild(ow);
      // stay open/closed the way the player left it while the lobby keeps updating
      try { det.open = sessionStorage.getItem('wt-pn-older') === '1'; } catch (e) { /* ignore */ }
      det.addEventListener('toggle', function () {
        try { sessionStorage.setItem('wt-pn-older', det.open ? '1' : '0'); } catch (e) { /* ignore */ }
      });
      root.appendChild(det);
    }

    var extras = Array.prototype.slice.call(pn.querySelectorAll('a')).filter(function (a) { return !used.has(a); });
    if (extras.length) {
      var ex = el('div', 'wt-pn-extra');
      extras.forEach(function (a) { ex.appendChild(a); });
      root.appendChild(ex);
    }

    pn.textContent = '';
    pn.appendChild(root);
  }

  // ---- games table: the client swaps in a fresh clone on every update, so this
  // runs synchronously from the observer (before paint) and must stay cheap ----
  function gameKind(id) {
    if (/git|trunk/i.test(id)) return 'git';
    if (/^seeded/i.test(id)) return 'seeded';
    if (/^(tut|sprint|descent|zotdef)/i.test(id)) return 'mode';
    return 'stable';
  }

  function ensureGamesHead() {
    var body = document.getElementById('lobby_body');
    if (!body) return null;
    var head = body.querySelector(':scope > .wt-card-head');
    if (head) return head;
    var span = body.querySelector(':scope > span');
    head = el('div', 'wt-card-head');
    head.appendChild(el('span', 'wt-card-title', 'Games running'));
    head.appendChild(el('span', 'wt-pill wt-count', '0'));
    var meta = el('span', 'wt-card-meta');
    meta.appendChild(el('span', 'wt-live-dot'));
    meta.appendChild(el('span', 'wt-watch', ''));
    head.appendChild(meta);
    if (span) span.replaceWith(head);
    else body.insertBefore(head, body.firstChild);
    return head;
  }

  function setText(node, v) {
    if (node && node.textContent !== v) node.textContent = v;
  }

  function decorateTable() {
    var t = document.getElementById('player_list');
    if (!t || !t.tBodies[0]) return;
    var head = ensureGamesHead();
    var rows = t.tBodies[0].rows, specs = 0, watched = 0;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var idle = r.querySelector('td.idle_time');
      var secs = idle ? parseInt(idle.getAttribute('data-time'), 10) || 0 : 0;
      var dim = CFG.idleDimSeconds > 0 && secs >= CFG.idleDimSeconds;
      if (r.classList.contains('wt-idle') !== dim) r.classList.toggle('wt-idle', dim);

      var g = r.querySelector('td.game_id');
      if (g) {
        var k = gameKind(g.textContent);
        if (g.getAttribute('data-kind') !== k) g.setAttribute('data-kind', k);
      }
      var sc = r.querySelector('td.spectator_count');
      var n = sc ? parseInt(sc.textContent, 10) || 0 : 0;
      if (n) { specs += n; watched++; }

      var ms = r.querySelector('.milestone');
      if (ms && ms.title !== ms.textContent) ms.title = ms.textContent;
    }
    if (head) {
      setText(head.querySelector('.wt-count'), String(rows.length));
      setText(head.querySelector('.wt-watch'),
        specs ? specs + (specs === 1 ? ' spectator' : ' spectators') + ' on ' + watched + (watched === 1 ? ' game' : ' games') : 'no spectators');
    }
  }


  // ---- recordings: lists the sessions DWEM's WTRec module saved in this browser ----
  // (record_wtrec = true in the RC). Reads and plays them through the module itself.
  var recsEl = null;

  function wtrec() {
    return (window.DWEM && window.DWEM.Modules && window.DWEM.Modules.WTRec) || null;
  }

  function ensureRecs() {
    if (recsEl && recsEl.isConnected) return;
    var body = document.getElementById('lobby_body');
    if (!body || !body.parentNode) return;
    recsEl = el('details');
    recsEl.id = 'wt-recs';
    var sum = el('summary');
    sum.appendChild(el('span', 'wt-card-title', 'Recordings'));
    sum.appendChild(el('span', 'wt-pill wt-recs-count', ''));
    sum.appendChild(el('span', 'wt-card-meta', 'DWEM WTRec, saved in this browser'));
    var refresh = mkBtn('Refresh', 'wt-recs-refresh', function (e) {
      e.preventDefault();
      e.stopPropagation();
      loadRecs();
    });
    sum.appendChild(refresh);
    recsEl.appendChild(sum);
    recsEl.appendChild(el('div', 'wt-recs-body'));
    body.parentNode.insertBefore(recsEl, body.nextSibling);
    recsEl.addEventListener('toggle', function () { if (recsEl.open) loadRecs(); });
  }

  function note(box, text) {
    box.textContent = '';
    return box.appendChild(el('div', 'wt-recs-note', text));
  }

  function mkBtn(label, cls, fn) {
    var b = el('button', cls, label);
    b.type = 'button';
    b.addEventListener('click', fn);
    return b;
  }

  function fmtDate(t) {
    if (!t) return '';
    var d = new Date(t), p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  async function loadRecs() {
    var box = recsEl.querySelector('.wt-recs-body');
    var count = recsEl.querySelector('.wt-recs-count');
    var W = wtrec();
    if (!W) {
      note(box, 'WTRec is not loaded (DWEM still starting, or the module is off). Try Refresh in a moment.');
      return;
    }
    note(box, 'Loading…');
    var list;
    try { list = (await W.listSessions()).reverse(); }
    catch (e) { note(box, 'Could not read the recordings: ' + e); return; }
    count.textContent = list.length ? String(list.length) : '';
    if (!list.length) {
      note(box, 'No recordings yet. With record_wtrec = true in your RC, play a game and return to the lobby; it is saved here.');
      return;
    }
    box.textContent = '';
    list.forEach(function (s) {
      var row = el('div', 'wt-rec');
      row.appendChild(el('span', 'wt-rec-name', s.name));
      row.appendChild(el('span', 'wt-rec-meta',
        fmtDate(s.createdAt) + (s.data ? '  ·  ' + s.data.length.toLocaleString() + ' msgs' : '')));
      var acts = el('span', 'wt-rec-actions');
      acts.appendChild(mkBtn('Play', 'wt-primary', async function () {
        try {
          var full = await W.getSession(s.name);
          if (!full) return note(box, 'That recording is gone.');
          var blob = await W.buildZipFromSession(full);
          W.playWTRec(blob);
        } catch (e) { console.error('[lobby] play recording failed', e); alert('Could not play it: ' + e); }
      }));
      acts.appendChild(mkBtn('Download', '', async function () {
        try {
          var full = await W.getSession(s.name);
          if (!full) return;
          var blob = await W.buildZipFromSession(full);
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = s.name + '.wtrec';
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 10000);
        } catch (e) { alert('Could not download it: ' + e); }
      }));
      acts.appendChild(mkBtn('Delete', 'wt-danger', async function () {
        if (!confirm('Delete recording ' + s.name + '?')) return;
        try { await W.deleteSession(s.name); } catch (e) { alert('Could not delete it: ' + e); }
        loadRecs();
      }));
      row.appendChild(acts);
      box.appendChild(row);
    });
  }

  function tidy() {
    ensureHeader();
    tidyBanner();
    layoutPlayNow();
    ensureRecs();
    if (CFG.hideLoginForm) {
      var f = document.getElementById('login_form');
      if (f && f.style.display !== 'none') f.style.display = 'none';
    }
  }

  sync();
  tidy();
  decorateTable();

  var pending = false;
  function later() {
    if (pending) return;
    pending = true;
    setTimeout(function () { pending = false; sync(); tidy(); decorateTable(); }, 50);
  }

  // #play_now and the game table are filled in after login; the table is replaced
  // on every lobby update; the lobby is hidden and shown again around games.
  new MutationObserver(function () { decorateTable(); later(); })
    .observe(document.body, { childList: true, subtree: true });
  new MutationObserver(later).observe(lobbyEl, { attributes: true, attributeFilter: ['style', 'class'] });
})();
