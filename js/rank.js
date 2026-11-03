(function () {
  'use strict';
  var form = document.getElementById('rkForm');
  if (!form) return;
  var input = document.getElementById('rkUser');
  var field = document.getElementById('rkField');
  var hint = document.getElementById('rkHint');
  var go = document.getElementById('rkGo');
  var out = document.getElementById('rkResult');
  var body = document.getElementById('rkBody');
  var stats = document.getElementById('rkStats');
  var formulaEl = document.getElementById('rkFormula');
  var HINT = hint.textContent;
  var data = null, index = null, loading = null;
  var nf = new Intl.NumberFormat('en-US');

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function num(n) { return nf.format(Math.round(n)); }
  function sc(n) { return nf.format(Math.round(n * 10) / 10); }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function xlink(u) { return /^https:\/\/x\.com\/[A-Za-z0-9_]{1,15}\/status\/\d+$/.test(u) ? u : '#'; }

  function load() {
    if (data) return Promise.resolve(data);
    if (loading) return loading;
    loading = fetch('data/leaderboard.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function (j) {
        data = j; index = Object.create(null);
        j.entries.forEach(function (e) { index[e.username.toLowerCase()] = e; });
        render(j);
        return j;
      })
      .catch(function (e) {
        loading = null;
        clear(body);
        var tr = el('tr'); var td = el('td', 'muted', 'Could not load the snapshot. Check your connection and try again.');
        td.colSpan = 4; tr.appendChild(td); body.appendChild(tr);
        stats.textContent = 'Snapshot unavailable.';
        throw e;
      });
    return loading;
  }

  function render(j) {
    if (j.formula) formulaEl.textContent = j.formula;
    var s = j.sample || {};
    stats.textContent = 'Last updated ' + j.updated_dhaka + ' · ' + num(s.posts) + ' posts from ' + num(s.accounts) +
      ' accounts scanned · ranking the top ' + num(s.ranked) + ' of them. Snapshot, not live.';
    clear(body);
    j.entries.slice(0, 10).forEach(function (e) {
      var tr = el('tr', 'rk-row');
      tr.appendChild(el('td', 'rk-pos', String(e.rank)));
      var td = el('td', 'rk-acc');
      var a = el('a', null, '@' + e.username);
      a.href = 'https://x.com/' + encodeURIComponent(e.username);
      a.target = '_blank'; a.rel = 'noopener noreferrer';
      td.appendChild(a);
      if (e.name) td.appendChild(el('small', 'muted', e.name));
      tr.appendChild(td);
      tr.appendChild(el('td', 'num-c rk-sc', sc(e.score)));
      tr.appendChild(el('td', 'num-c hide-s', String(e.posts.length)));
      tr.addEventListener('click', function (ev) { if (ev.target.tagName !== 'A') { input.value = e.username; check(); } });
      body.appendChild(tr);
    });
  }

  function cleanName(v) { return v.trim().replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, '').replace(/[/?#].*$/, '').replace(/^@+/, ''); }
  function setHint(t, bad) { hint.textContent = t; hint.classList.toggle('bad', !!bad); }
  function bad(msg) {
    setHint(msg, true); field.classList.remove('err'); void field.offsetWidth; field.classList.add('err');
    clear(out);
  }

  function metric(label, v) {
    var d = el('div', 'pm');
    d.appendChild(el('b', null, num(v)));
    d.appendChild(el('small', null, label));
    return d;
  }

  function postItem(p) {
    var li = el('li', 'rk-post');
    var top = el('div', 'rk-ptop');
    var a = el('a', 'rk-plink', 'View post ↗');
    a.href = xlink(p.url); a.target = '_blank'; a.rel = 'noopener noreferrer';
    var when = new Date(p.at);
    top.appendChild(el('span', 'rk-pdate', isNaN(when) ? '' : when.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })));
    top.appendChild(el('span', 'rk-pscore', sc(p.score) + ' pts'));
    top.appendChild(a);
    li.appendChild(top);
    if (p.text) li.appendChild(el('p', 'rk-ptext', p.text));
    var m = el('div', 'rk-pm');
    m.appendChild(metric('views', p.impressions)); m.appendChild(metric('likes', p.likes));
    m.appendChild(metric('replies', p.replies)); m.appendChild(metric('reposts', p.reposts));
    m.appendChild(metric('quotes', p.quotes));
    li.appendChild(m);
    return li;
  }

  function showFound(e) {
    clear(out);
    var card = el('div', 'card rk-card');
    var head = el('div', 'rk-head');
    var l = el('div', 'rk-who');
    var a = el('a', 'rk-name', '@' + e.username);
    a.href = 'https://x.com/' + encodeURIComponent(e.username); a.target = '_blank'; a.rel = 'noopener noreferrer';
    l.appendChild(a);
    if (e.name) l.appendChild(el('small', 'muted', e.name));
    head.appendChild(l);
    head.appendChild(el('span', 'tag', 'Unofficial'));
    card.appendChild(head);
    var big = el('div', 'big');
    var b1 = el('div', 'box'); b1.appendChild(el('span', 'k', 'Rank in snapshot'));
    b1.appendChild(el('div', 'num acc', '#' + num(e.rank)));
    b1.appendChild(el('div', 'sub', 'of top ' + num(data.sample.ranked) + ' ranked'));
    var b2 = el('div', 'box'); b2.appendChild(el('span', 'k', 'Score'));
    b2.appendChild(el('div', 'num', sc(e.score)));
    b2.appendChild(el('div', 'sub', 'from ' + e.posts.length + ' of 5 posts found'));
    big.appendChild(b1); big.appendChild(b2); card.appendChild(big);
    card.appendChild(el('span', 'k', 'Post breakdown'));
    var ul = el('ul', 'rk-posts');
    e.posts.forEach(function (p) { ul.appendChild(postItem(p)); });
    card.appendChild(ul);
    if (e.posts.length < 5) card.appendChild(el('p', 'sub', 'Only ' + e.posts.length + ' FUNGO post' + (e.posts.length === 1 ? '' : 's') + ' from this account appeared in our sample. Their real score may be higher.'));
    out.appendChild(card);
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function showMissing(name) {
    clear(out);
    var card = el('div', 'card rk-card zero');
    card.appendChild(el('span', 'k', '@' + name));
    card.appendChild(el('div', 'num', 'Not found in snapshot'));
    card.appendChild(el('p', null, 'We did not see this account in our sample of ' + num(data.sample.posts) + ' public FUNGO posts, or it falls outside the top ' + num(data.sample.ranked) + ' we rank. That does not prove it is outside the real campaign top 500: the sample is partial and the official ranking is FungoLabs\' own.'));
    var a = el('a', 'btn-outline', 'Official campaign page ↗');
    a.href = 'https://fungolabs.org/launchpad/c/cfpdxjt4'; a.target = '_blank'; a.rel = 'noopener noreferrer';
    var w = el('p'); w.appendChild(a);
    card.appendChild(w);
    out.appendChild(card);
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function check() {
    var name = cleanName(input.value);
    if (!name) { bad('Enter an X username, for example @FungoLabs'); return; }
    if (!/^[A-Za-z0-9_]{1,15}$/.test(name)) { bad('That is not a valid X username (letters, numbers, underscore, max 15).'); return; }
    setHint(HINT, false); field.classList.remove('err');
    input.value = name;
    go.classList.add('busy');
    load().then(function () {
      var e = index[name.toLowerCase()];
      if (e) showFound(e); else showMissing(name);
    }).catch(function () {
      clear(out);
      var card = el('div', 'card err-card');
      card.appendChild(el('h3', null, 'Could not load the snapshot'));
      card.appendChild(el('p', 'sub', 'Please try again in a moment.'));
      out.appendChild(card);
    }).then(function () { go.classList.remove('busy'); });
  }

  form.addEventListener('submit', function (ev) { ev.preventDefault(); check(); });
  input.addEventListener('focus', function () { load().catch(function () {}); }, { once: true });

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); load().catch(function () {}); }
    }, { rootMargin: '400px 0px' });
    io.observe(document.getElementById('rank'));
  } else { load().catch(function () {}); }
})();
