(function () {
  'use strict';
  var box = document.getElementById('ticker');
  if (!box) return;
  var lines = Array.prototype.slice.call(box.querySelectorAll('[data-tk]'));
  if (lines.length < 2) return;
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (still) { box.classList.add('still'); return; }
  var i = 0, timer = null, paused = false;
  function show(n) {
    var cur = lines[i], nxt = lines[n];
    cur.classList.remove('is-on'); cur.classList.add('is-out');
    nxt.classList.remove('is-out'); nxt.classList.add('is-on');
    i = n;
  }
  function start() { stop(); timer = setInterval(function () { if (!paused) show((i + 1) % lines.length); }, 3000); }
  function stop() { if (timer) clearInterval(timer); timer = null; }
  box.addEventListener('mouseenter', function () { paused = true; });
  box.addEventListener('mouseleave', function () { paused = false; });
  box.addEventListener('focusin', function () { paused = true; });
  box.addEventListener('focusout', function () { paused = false; });
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
  start();
})();
