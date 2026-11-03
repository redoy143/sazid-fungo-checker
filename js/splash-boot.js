/* Runs in <head>: decides synchronously whether to show the intro, so there is no flash of the page. */
(function () {
  try {
    var d = document.documentElement;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (sessionStorage.getItem('splashSeen') || /[?&]nosplash\b/.test(location.search)) return;
    d.classList.add('splash-on');
  } catch (e) {}
})();
