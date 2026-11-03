(function () {
  'use strict';
  const C = window.CHECKER_CONFIG;
  const $ = (s, r = document) => r.querySelector(s);
  const nf = new Intl.NumberFormat('en-US');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const enc = new TextEncoder();
  const hex = (b) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const short = (a) => (a.length > 16 ? a.slice(0, 6) + '…' + a.slice(-4) : a);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- theme ---------- */
  const root = document.documentElement;
  try { const t = localStorage.getItem('theme'); if (t) root.dataset.theme = t; else if (matchMedia('(prefers-color-scheme: light)').matches) root.dataset.theme = 'light'; } catch (e) {}
  $('#themeBtn').addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
  });

  /* ---------- toast ---------- */
  let toastT;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200);
  }

  /* ---------- count-up ---------- */
  function tween(el, to, opts = {}) {
    const from = opts.from ?? 0, dur = reduced ? 0 : (opts.dur ?? 1100);
    const fmt = opts.fmt || ((v) => nf.format(Math.round(v)));
    if (el._raf) cancelAnimationFrame(el._raf);
    if (!dur) { el.textContent = fmt(to); el._val = to; return; }
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      const v = from + (to - from) * e;
      el.textContent = fmt(v); el._val = v;
      if (p < 1) el._raf = requestAnimationFrame(step);
    };
    el._raf = requestAnimationFrame(step);
  }
  const compact = (v) => (v >= 1e9 ? (v / 1e9).toFixed(1) + 'B' : v >= 1e6 ? Math.round(v / 1e6) + 'M' : nf.format(Math.round(v)));
  const usd = (v) => (v >= 100 ? '$' + nf.format(Math.round(v)) : '$' + v.toFixed(2));
  const fdvLabel = (v) => '$' + (v >= 1e9 ? v / 1e9 + 'B' : v / 1e6 + 'M');

  /* ---------- reveal on scroll ---------- */
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in'); io.unobserve(e.target);
    const b = $('b[data-count]', e.target);
    if (b) {
      const to = +b.dataset.count, sfx = b.dataset.suffix || '';
      tween(b, to, { fmt: (v) => (b.dataset.compact ? compact(v) : nf.format(Math.round(v))) + sfx, dur: 1400 });
    }
  }), { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach((el, i) => { el.style.setProperty('--d', (i % 4) * 0.08 + 's'); io.observe(el); });

  /* ---------- RPC (race public nodes) ---------- */
  async function rpc(method, params) {
    const ctrls = [];
    const attempt = (url) => {
      const c = new AbortController(); ctrls.push(c);
      const t = setTimeout(() => c.abort(), 8000);
      return fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: c.signal })
        .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then((j) => { if (j.error) throw new Error(j.error.message || 'rpc error'); return j.result; })
        .finally(() => clearTimeout(t));
    };
    try {
      const res = await Promise.any(C.rpcs.map(attempt));
      ctrls.forEach((c) => c.abort());
      return res;
    } catch (e) { throw new Error('All public RPC nodes failed. Try again in a moment.'); }
  }
  const call = (to, data) => rpc('eth_call', [{ to, data }, 'latest']);

  /* ---------- address helpers ---------- */
  function checksum(addr) {
    const a = addr.slice(2).toLowerCase();
    const h = hex(keccak256(enc.encode(a)));
    let o = '0x';
    for (let i = 0; i < 40; i++) o += parseInt(h[i], 16) >= 8 ? a[i].toUpperCase() : a[i];
    return o;
  }
  function namehash(name) {
    let node = new Uint8Array(32);
    if (!name) return node;
    for (const label of name.split('.').reverse()) {
      const lh = keccak256(enc.encode(label));
      const buf = new Uint8Array(64); buf.set(node); buf.set(lh, 32);
      node = keccak256(buf);
    }
    return node;
  }
  async function resolveEns(name) {
    const nh = hex(namehash(name));
    const r = await call(C.ensRegistry, '0x0178b8bf' + nh);
    const resolver = '0x' + r.slice(-40);
    if (/^0x0{40}$/.test(resolver)) return null;
    const a = await call(resolver, '0x3b3b57de' + nh);
    const addr = '0x' + a.slice(-40);
    return /^0x0{40}$/.test(addr) ? null : addr;
  }
  async function balanceOf(addr) {
    const r = await call(C.contract, '0x70a08231' + addr.slice(2).toLowerCase().padStart(64, '0'));
    return Number(BigInt(r));
  }

  function avatar(addr) {
    const h = hex(keccak256(enc.encode(addr.toLowerCase())));
    const a = parseInt(h.slice(0, 3), 16) % 360, b = (a + 40 + (parseInt(h.slice(3, 5), 16) % 80)) % 360;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${a},90%,60%)"/><stop offset="1" stop-color="hsl(${b},90%,50%)"/></linearGradient></defs><circle cx="20" cy="20" r="20" fill="url(#g)"/><circle cx="${12 + (parseInt(h.slice(5, 7), 16) % 16)}" cy="${12 + (parseInt(h.slice(7, 9), 16) % 16)}" r="7" fill="rgba(255,255,255,.35)"/></svg>`;
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  /* ---------- UI state ---------- */
  const form = $('#form'), input = $('#addr'), hint = $('#hint'), field = $('#field'), goBtn = $('#goBtn'), out = $('#result');
  const HINT = hint.textContent;
  let fdv = C.fdvDefault, token = 0;

  function setHint(msg, bad) { hint.textContent = msg || HINT; hint.classList.toggle('bad', !!bad); if (bad) { field.classList.remove('err'); void field.offsetWidth; field.classList.add('err'); } }

  function skeleton() {
    out.innerHTML = `<div class="card" aria-busy="true"><div class="sk m"></div><div class="big"><div class="box"><div class="sk s"></div><div class="sk l"></div></div><div class="box"><div class="sk s"></div><div class="sk l"></div></div></div><div class="sk m"></div></div>`;
  }

  function parseInput(raw) {
    const v = raw.trim().replace(/\s+/g, '');
    if (!v) return { err: 'Paste a wallet address or an ENS name first.' };
    if (/^0x[0-9a-fA-F]{40}$/.test(v)) {
      const body = v.slice(2);
      if (body !== body.toLowerCase() && body !== body.toUpperCase() && checksum(v) !== v) return { err: 'That address has a bad checksum. Check for a typo (or paste it in all lowercase).' };
      return { addr: v };
    }
    if (/^0x/i.test(v)) return { err: 'A wallet address is 0x followed by 40 characters. Yours looks the wrong length.' };
    if (/^[^\s.]+(\.[^\s.]+)+$/.test(v) && v.length < 256) return { ens: v.toLowerCase() };
    return { err: 'Enter a 0x address or an ENS name like name.eth.' };
  }

  async function check(raw, opts = {}) {
    const my = ++token;
    const p = parseInput(raw);
    if (p.err) { setHint(p.err, true); return; }
    setHint('');
    goBtn.classList.add('busy');
    skeleton();
    if (!opts.noScroll) out.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    const t0 = performance.now();
    try {
      let addr = p.addr, ens = null;
      if (p.ens) {
        ens = p.ens; addr = await resolveEns(ens);
        if (my !== token) return;
        if (!addr) { await minWait(t0); if (my === token) renderError(`Couldn't resolve “${ens}”`, 'That ENS name has no address set, or it isn\'t a regular .eth name. Paste the 0x address instead.'); return; }
      }
      const n = await balanceOf(addr);
      if (my !== token) return;
      await minWait(t0);
      if (my !== token) return;
      renderResult(addr, ens, n);
      remember(ens || addr);
      const u = new URL(location.href); u.searchParams.set('address', ens || addr);
      history.replaceState(null, '', u);
    } catch (e) {
      if (my === token) { await minWait(t0); renderError('Couldn\'t read the chain', e.message || 'Network problem. Please try again.'); }
    } finally {
      if (my === token) goBtn.classList.remove('busy');
    }
  }
  const minWait = (t0) => sleep(Math.max(0, 550 - (performance.now() - t0)));

  function renderError(title, msg) {
    out.innerHTML = `<div class="card err-card"><h3>${esc(title)}</h3><p class="muted">${esc(msg)}</p></div>`;
  }

  function renderResult(addr, ens, n) {
    const tokens = n * C.perNft;
    const pct = (n / C.collectionSize) * 100;
    const ck = checksum(addr);
    const head = `<div class="r-top"><div class="who"><img class="avatar" alt="" src="${avatar(addr)}"><div><b>${esc(ens || short(ck))}</b><small>${esc(ens ? short(ck) : 'Ethereum mainnet')}</small></div></div>
      <div class="acts"><button class="btn-outline" id="copyLink" type="button">Copy share link</button><a class="btn-outline" href="https://etherscan.io/address/${ck}" target="_blank" rel="noopener noreferrer">Etherscan ↗</a></div></div>`;
    if (n === 0) {
      out.innerHTML = `<div class="card">${head}<div class="zero"><span class="k">Zama OG NFTs found</span><div class="num">0</div><p>This wallet holds no Zama OG NFT right now, so no share of the 700M holder pool. If your NFT sits in another wallet, check that address too. A listed or staked NFT may not show here.</p></div></div>`;
      bindCopy(ens || addr); return;
    }
    out.innerHTML = `<div class="card">${head}
      <div class="big">
        <div class="box"><span class="k">Zama OG NFTs</span><div class="num" id="rN">0</div><div class="sub">${n === 1 ? '1 NFT' : n + ' NFTs'} × ${nf.format(C.perNft)} $FUNGO</div></div>
        <div class="box"><span class="k">Your $FUNGO</span><div class="num acc" id="rT">0</div><div class="sub">estimated allocation</div></div>
      </div>
      <div class="bar" role="img" aria-label="Share of the collection"><i id="rBar"></i></div>
      <div class="bar-l"><span id="rPct">0%</span><span>of ${nf.format(C.collectionSize)} NFTs</span></div>
      <div class="fdv">
        <div class="fdv-h"><span class="k">If $FUNGO launched at an FDV of…</span><span class="guess">guess · no market price yet</span></div>
        <div class="chips" id="chips" role="group" aria-label="Imagined FDV">${C.fdvScenarios.map((v) => `<button type="button" class="chip" data-v="${v}">${fdvLabel(v)}</button>`).join('')}</div>
        <input class="slider" id="slider" type="range" min="0" max="100" step="0.1" aria-label="Custom FDV">
        <div class="val"><div class="num acc" id="rUsd">$0</div><small id="rNote"></small></div>
      </div></div>`;
    tween($('#rN'), n, { dur: 900 });
    tween($('#rT'), tokens, { dur: 1500 });
    tween($('#rPct'), pct, { dur: 1300, fmt: (v) => v.toFixed(3) + '% of the collection' });
    requestAnimationFrame(() => requestAnimationFrame(() => { $('#rBar').style.width = Math.max(pct, 0.6) + '%'; }));
    const slider = $('#slider'), usdEl = $('#rUsd');
    const toSlider = (f) => (Math.log(f / 1e6) / Math.log(500)) * 100;
    const fromSlider = (s) => 1e6 * Math.pow(500, s / 100);
    function applyFdv(f, animate) {
      fdv = f;
      const price = f / C.totalSupply, val = tokens * price;
      tween(usdEl, val, { from: usdEl._val || 0, dur: animate ? 600 : 1500, fmt: usd });
      $('#rNote').textContent = `at ${fdvLabel(f)} FDV, 1 $FUNGO = $${price < 0.01 ? price.toFixed(5) : price.toFixed(4)}`;
      document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', Math.abs(+c.dataset.v / f - 1) < 0.02));
    }
    slider.value = toSlider(fdv);
    applyFdv(fdv, false);
    $('#chips').addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      slider.value = toSlider(+b.dataset.v); applyFdv(+b.dataset.v, true);
    });
    slider.addEventListener('input', () => {
      let f = fromSlider(+slider.value);
      for (const c of C.fdvScenarios) if (Math.abs(c / f - 1) < 0.03) f = c;
      f = f >= 1e7 ? Math.round(f / 1e5) * 1e5 : Math.round(f / 1e4) * 1e4;
      applyFdv(f, true);
    });
    bindCopy(ens || addr);
  }

  function bindCopy(id) {
    const b = $('#copyLink'); if (!b) return;
    b.addEventListener('click', async () => {
      const u = new URL(location.href); u.search = ''; u.hash = ''; u.searchParams.set('address', id);
      try { await navigator.clipboard.writeText(u.toString()); toast('Link copied'); }
      catch (e) { prompt('Copy this link:', u.toString()); }
    });
  }

  /* ---------- recent (local only) ---------- */
  function recents() { try { return JSON.parse(localStorage.getItem('recent') || '[]'); } catch (e) { return []; } }
  function remember(id) {
    try { const r = [id, ...recents().filter((x) => x !== id)].slice(0, 3); localStorage.setItem('recent', JSON.stringify(r)); } catch (e) {}
    renderRecents();
  }
  function renderRecents() {
    const r = recents(), box = $('#recent');
    box.innerHTML = r.map((x) => `<button type="button" class="pill" data-id="${esc(x)}">${esc(short(x))}</button>`).join('') + (r.length ? '<button type="button" class="pill" data-clear="1">clear</button>' : '');
  }
  $('#recent').addEventListener('click', (e) => {
    const b = e.target.closest('.pill'); if (!b) return;
    if (b.dataset.clear) { try { localStorage.removeItem('recent'); } catch (x) {} renderRecents(); return; }
    input.value = b.dataset.id; check(b.dataset.id);
  });

  form.addEventListener('submit', (e) => { e.preventDefault(); check(input.value); });
  input.addEventListener('input', () => { if (hint.classList.contains('bad')) setHint(''); field.classList.remove('err'); });
  $('#sampleBtn').addEventListener('click', () => { input.value = C.sample; check(C.sample); });
  $('#pasteBtn').addEventListener('click', async () => {
    try { const t = await navigator.clipboard.readText(); if (t) { input.value = t.trim(); check(t); } else toast('Clipboard is empty'); }
    catch (e) { toast('Paste with Ctrl/Cmd+V instead'); input.focus(); }
  });

  /* ---------- live block ---------- */
  (async function () {
    const live = $('#live'), txt = $('#liveText');
    try { const b = parseInt(await rpc('eth_blockNumber', []), 16); txt.textContent = 'Block ' + nf.format(b); live.classList.add('on'); }
    catch (e) { txt.textContent = 'RPC offline'; live.classList.add('off'); }
  })();

  /* ---------- X campaign countdown ---------- */
  (function () {
    const end = Date.parse(C.campaign.closesAtUtc);
    const set = (id, v) => { const el = $(id); if (el) el.textContent = String(v).padStart(2, '0'); };
    function tick() {
      let s = Math.max(0, Math.floor((end - Date.now()) / 1000));
      set('#cdD', Math.floor(s / 86400)); set('#cdH', Math.floor(s % 86400 / 3600)); set('#cdM', Math.floor(s % 3600 / 60)); set('#cdS', s % 60);
      return s;
    }
    const f = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
    $('#cdAbs').textContent = f.format(end) + ' · 30 Nov 2026 14:00 UTC (per campaign page)';
    if (tick() > 0) { const id = setInterval(() => { if (tick() <= 0) clearInterval(id); }, 1000); }
  })();

  /* ---------- boot ---------- */
  renderRecents();
  const q = new URLSearchParams(location.search).get('address');
  if (q) { input.value = q; check(q, { noScroll: false }); }
})();
