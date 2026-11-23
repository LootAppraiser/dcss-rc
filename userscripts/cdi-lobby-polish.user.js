// ==UserScript==
// @name         CDI Lobby Polish
// @namespace    https://github.com/LootAppraiser
// @version      1.1.0
// @description  Tidier crawl.dcss.io lobby: dark card layout, readable games table, no Patreon block, DWEM recordings list
// @match        https://crawl.dcss.io/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // Only ever style the lobby. The game view reuses this page (same document, no
  // reload), so the <style> tag is attached only while #lobby is on screen.
  var lobbyEl = document.getElementById('lobby');
  if (!lobbyEl) return;

  var CFG = {
    hidePatreon: true,
    hideServerNotes: false, // the SSH / Code of Conduct / contact paragraph
    hideLoginForm: false,
  };

  var css = `
  :root {
    --bg: #0d1117;
    --panel: #161b22;
    --panel2: #12171d;
    --line: #30363d;
    --fg: #e6edf3;
    --muted: #8b949e;
    --accent: #7ee787;
    --accent-dim: #2ea043;
  }
  html, body { background: var(--bg) !important; color: var(--fg); }
  body {
    font-size: 15px;
    background-image: radial-gradient(1200px 400px at 50% -120px, #16202b 0%, transparent 70%);
    background-repeat: no-repeat;
  }
  a, a:visited { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }

  #lobby { max-width: 1180px; margin: 0 auto; padding: 14px 20px 40px; }

  /* top-right account bar */
  .login_placeholder { text-align: right; font-size: 13px; color: var(--muted); margin: 2px 2px 10px; }
  #login { float: none; text-align: right; }
  #login .extra_links { color: var(--line); }
  #login .extra_links a { margin: 0 2px; }
  #login_form label { color: var(--muted); margin-right: 6px; }
  #login_form { white-space: nowrap; }
  #login_form input.text { width: 11em; }

  /* banner card */
  #banner > #banner {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 14px 18px 12px;
    margin: 0 0 14px;
    line-height: 1.5;
  }
  .wt-title { font-size: 20px; font-weight: 600; letter-spacing: .2px; margin-bottom: 8px; }
  #banner > #banner > p {
    background: none !important;
    border-radius: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.6;
  }

  /* play now card */
  #play_now {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 14px 18px 16px;
    margin: 0 0 14px;
    text-align: left;
    line-height: 1.9;
  }
  #play_now a {
    display: inline-block;
    padding: 2px 10px;
    margin: 2px 1px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--panel2);
    color: var(--fg);
  }
  #play_now a:hover { border-color: var(--accent-dim); color: var(--accent); text-decoration: none; }
  #play_now table { margin: 6px 0 0; border-collapse: collapse; }
  #play_now td, #play_now th { padding: 2px 10px; }
  #play_now hr { border: 0; border-top: 1px solid var(--line); margin: 10px 0; }
  /* server markup varies; every row is rebuilt as its own left-aligned block */
  #play_now { white-space: normal !important; }
  #play_now .wt-row {
    display: block;
    text-align: left !important;
    white-space: normal !important;
    margin: 3px 0;
  }
  /* CDI's server-side play-now markup centres itself; force the block left */
  #play_now, #play_now * { text-align: left !important; }
  #play_now table { margin: 6px 0 0 !important; }
  #play_now [align="center"] { margin-left: 0 !important; margin-right: 0 !important; }

  /* games list */
  #lobby_body { text-align: left; }
  #lobby_body > span {
    display: block;
    font-size: 11px;
    letter-spacing: .12em;
    text-transform: uppercase;
    color: var(--muted);
    margin: 4px 2px 8px;
  }
  #player_list {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 10px;
    overflow: hidden;
    font-variant-numeric: tabular-nums;
  }
  #player_list thead th {
    position: sticky;
    top: 0;
    z-index: 2;
    background: #1b222b;
    color: var(--muted);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: .08em;
    text-transform: uppercase;
    padding: 8px;
    border-bottom: 1px solid var(--line);
    white-space: nowrap;
  }
  #player_list tbody td { padding: 5px 8px; border-bottom: 1px solid #21262d; white-space: nowrap; }
  #player_list tbody tr:nth-child(even) { background: var(--panel2); }
  #player_list tbody tr:hover { background: #1f2a1f; }
  #player_list tbody tr:last-child td { border-bottom: 0; }
  #player_list td.username { color: var(--accent); }
  #player_list td.xl, #player_list td.turn, #player_list td.dur,
  #player_list td.idle_time, #player_list td.spectator_count { text-align: right; }
  #player_list td.milestone_col {
    color: var(--muted);
    font-style: italic;
    max-width: 26em;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  #player_list th.xl, #player_list th.turn, #player_list th.dur,
  #player_list th.idle_time, #player_list th.spectator_count { text-align: right; }
  #player_list .milestone { opacity: .85; }

  /* dialogs and inputs keep working, just match the theme */
  .floating_dialog {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 14px 18px;
    color: var(--fg);
  }
  .floating_dialog a.hide_dialog { color: var(--muted); }
  input.text, textarea, select, .button, button {
    background: var(--panel2);
    border: 1px solid var(--line);
    border-radius: 6px;
    color: var(--fg);
    padding: 3px 8px;
    font-family: inherit;
  }
  .button:hover, input.button:hover, button:hover { border-color: var(--accent-dim); cursor: pointer; }
  #admin_panel { background: var(--panel); border-radius: 10px; }

  /* recordings (DWEM WTRec) */
  #wt-recs {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 10px 18px;
    margin: 0 0 14px;
  }
  #wt-recs > summary {
    cursor: pointer;
    font-size: 11px;
    letter-spacing: .12em;
    text-transform: uppercase;
    color: var(--muted);
    list-style-position: inside;
  }
  #wt-recs[open] > summary { margin-bottom: 8px; }
  #wt-recs .wt-recs-note { color: var(--muted); font-size: 13px; padding: 4px 0; }
  #wt-recs .wt-rec {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 0;
    border-top: 1px solid #21262d;
    font-size: 13px;
  }
  #wt-recs .wt-rec .wt-rec-name { flex: 1 1 auto; color: var(--fg); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #wt-recs .wt-rec .wt-rec-meta { color: var(--muted); white-space: nowrap; font-variant-numeric: tabular-nums; }
  #wt-recs .wt-rec button { padding: 2px 10px; font-size: 12px; }
  #wt-recs .wt-rec button.wt-play { color: var(--accent); }
  #wt-recs .wt-recs-top { display: flex; justify-content: flex-end; margin-bottom: 4px; }
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

  function collapseWS(root) {
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var n;
    while ((n = w.nextNode())) {
      if (n.nodeValue && /[\s\u00a0]/.test(n.nodeValue)) {
        n.nodeValue = n.nodeValue.replace(/[ \t\r\n\u00a0]+/g, ' ');
      }
    }
  }

  // The server's play-now markup (game_links.html plus per-server separators) keeps
  // the template's newlines and indentation and centres itself. Rebuild it into
  // plain left-aligned rows split on <br>, whatever the server sent.
  function layoutPlayNow() {
    var pn = document.getElementById('play_now');
    if (!pn || pn.getAttribute('data-wt-rows') === '1') return;
    if (!pn.querySelector('a')) return; // filled in after login

    collapseWS(pn);
    var rows = [], row = null;
    var nodes = Array.prototype.slice.call(pn.childNodes);
    for (var i = 0; i < nodes.length; i++) {
      var nd = nodes[i];
      if (nd.nodeType === 1 && nd.tagName === 'BR') {
        if (row) rows.push(row);
        row = null;
        continue;
      }
      if (!row) {
        row = document.createElement('div');
        row.className = 'wt-row';
      }
      row.appendChild(nd);
    }
    if (row) rows.push(row);

    while (pn.firstChild) pn.removeChild(pn.firstChild);
    for (var j = 0; j < rows.length; j++) {
      var r = rows[j];
      if (!r.textContent.trim() && !r.querySelector('a')) continue;
      var lead = r.firstChild;
      while (lead && lead.nodeType === 3 && !lead.nodeValue.trim()) {
        var next = lead.nextSibling;
        r.removeChild(lead);
        lead = next;
      }
      if (lead && lead.nodeType === 3) lead.nodeValue = lead.nodeValue.replace(/^\s+/, '');
      pn.appendChild(r);
    }
    pn.setAttribute('data-wt-rows', '1');
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
    recsEl = document.createElement('details');
    recsEl.id = 'wt-recs';
    var sum = document.createElement('summary');
    sum.textContent = 'Recordings';
    var box = document.createElement('div');
    box.className = 'wt-recs-body';
    recsEl.appendChild(sum);
    recsEl.appendChild(box);
    body.parentNode.insertBefore(recsEl, body);
    recsEl.addEventListener('toggle', function () { if (recsEl.open) loadRecs(); });
  }

  function note(box, text) {
    box.textContent = '';
    var d = document.createElement('div');
    d.className = 'wt-recs-note';
    d.textContent = text;
    box.appendChild(d);
    return d;
  }

  function mkBtn(label, cls, fn) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    if (cls) b.className = cls;
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
    var W = wtrec();
    if (!W) {
      note(box, 'WTRec is not loaded (DWEM still starting, or the module is off). Close and reopen this section in a moment.');
      return;
    }
    note(box, 'Loading...');
    var list;
    try { list = (await W.listSessions()).reverse(); }
    catch (e) { note(box, 'Could not read the recordings: ' + e); return; }
    if (!list.length) {
      note(box, 'No recordings yet. With record_wtrec = true in your RC, play a game and return to the lobby; it is saved here.');
      return;
    }
    box.textContent = '';
    var top = document.createElement('div');
    top.className = 'wt-recs-top';
    top.appendChild(mkBtn('Refresh', '', loadRecs));
    box.appendChild(top);
    list.forEach(function (s) {
      var row = document.createElement('div');
      row.className = 'wt-rec';
      var nm = document.createElement('span');
      nm.className = 'wt-rec-name';
      nm.textContent = s.name;
      var meta = document.createElement('span');
      meta.className = 'wt-rec-meta';
      meta.textContent = fmtDate(s.createdAt) + (s.data ? '  ' + s.data.length + ' msgs' : '');
      row.appendChild(nm);
      row.appendChild(meta);
      row.appendChild(mkBtn('Play', 'wt-play', async function () {
        try {
          var full = await W.getSession(s.name);
          if (!full) return note(box, 'That recording is gone.');
          var blob = await W.buildZipFromSession(full);
          W.playWTRec(blob);
        } catch (e) { console.error('[lobby] play recording failed', e); alert('Could not play it: ' + e); }
      }));
      row.appendChild(mkBtn('Download', '', async function () {
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
        } catch (e) { alert('Could not download it: ' + e); }
      }));
      row.appendChild(mkBtn('Delete', '', async function () {
        if (!confirm('Delete recording ' + s.name + '?')) return;
        try { await W.deleteSession(s.name); } catch (e) { alert('Could not delete it: ' + e); }
        loadRecs();
      }));
      box.appendChild(row);
    });
  }

  function tidy() {
    layoutPlayNow();
    ensureRecs();
    var inner = document.querySelector('#banner > #banner');
    if (!inner) return;

    // title line as its own block
    if (!inner.querySelector('.wt-title')) {
      for (var i = 0; i < inner.childNodes.length; i++) {
        var n = inner.childNodes[i];
        if (n.nodeType === 3 && n.textContent.trim()) {
          var t = document.createElement('div');
          t.className = 'wt-title';
          t.textContent = n.textContent.trim();
          inner.replaceChild(t, n);
          break;
        }
      }
    }

    if (CFG.hidePatreon) {
      var link = inner.querySelector('a[href*="patreon"]');
      if (link) {
        var box = link.closest('div[style*="darkorange"]') || link.parentElement;
        box.remove();
      }
    }

    if (CFG.hideServerNotes) {
      var p = inner.querySelector('p');
      if (p && /code of conduct/i.test(p.textContent)) p.remove();
    }

    if (CFG.hideLoginForm) {
      var f = document.getElementById('login_form');
      if (f && f.style.display !== 'none') f.style.display = 'none';
    }
  }

  sync();
  tidy();

  var pending = false;
  function later() {
    if (pending) return;
    pending = true;
    setTimeout(function () { pending = false; sync(); tidy(); }, 50);
  }

  // #play_now and the game table are filled in after login; the lobby is also
  // hidden and shown again when a game starts or ends, all without a reload.
  new MutationObserver(later).observe(document.body, { childList: true, subtree: true });
  new MutationObserver(later).observe(lobbyEl, { attributes: true, attributeFilter: ['style', 'class'] });
})();
