/* Intro splash: title + three cards, then a smooth zoom-fade into the site. Once per session. */
(function () {
  'use strict';
  var d = document.documentElement, el = document.getElementById('splash');
  if (!el) return;
  if (!d.classList.contains('splash-on')) { el.remove(); return; }
  try { sessionStorage.setItem('splashSeen', '1'); } catch (e) {}

  var pic = function (name, w, h, cls) {
    return '<picture class="' + cls + '"><source srcset="assets/' + name + '.webp" type="image/webp">' +
      '<img src="assets/' + name + '.jpg" alt="" width="' + w + '" height="' + h + '" decoding="async" draggable="false"></picture>';
  };
  el.querySelector('.sp-stage').innerHTML =
    pic('title', 1100, 117, 'sp-title') +
    '<div class="sp-cards">' +
    pic('card-genesis', 400, 463, 'sp-card c1') +
    pic('card-zama', 400, 463, 'sp-card c2') +
    pic('card-x', 400, 462, 'sp-card c3') +
    '</div>';

  var imgs = Array.prototype.slice.call(el.querySelectorAll('img'));
  var done = false, hold;
  function leave(fast) {
    if (done) return; done = true; clearTimeout(hold);
    el.classList.add('leaving'); if (fast) el.classList.add('fast');
    d.classList.remove('splash-on'); // page content starts revealing under the fading splash
    var end = function () { el.remove(); };
    el.addEventListener('animationend', function (e) { if (e.target === el) end(); });
    setTimeout(end, 1500);
  }
  el.addEventListener('click', function () { leave(true); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') leave(true); });

  var decoded = Promise.all(imgs.map(function (i) { return i.decode ? i.decode().catch(function () {}) : Promise.resolve(); }));
  var timeout = new Promise(function (r) { setTimeout(r, 2500); });
  Promise.race([decoded, timeout]).then(function () {
    if (done) return;
    el.classList.add('play');
    hold = setTimeout(leave, 2900);
  });
})();
