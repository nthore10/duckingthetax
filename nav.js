/* Shared nav loader for Ducking The Tax.
   Each page includes:  <div id="dtt-nav"></div>  then  <script src="/nav.js"></script>
   This fetches /nav.html, injects it, and highlights the active section.
   Edit /nav.html to change the nav for the entire site. */
(function () {
  // Site-wide accessibility baseline (UI-skills standards), injected once for every page:
  // honor reduced-motion, show keyboard focus rings, and lift the faintest text to WCAG-AA contrast.
  if (!document.getElementById('dtt-a11y')) {
    var s = document.createElement('style');
    s.id = 'dtt-a11y';
    s.textContent =
      ':root{--text-dim:#8A95A3;--text-faint:#828D9B;}' +
      '@media (prefers-reduced-motion: reduce){*,*::before,*::after{' +
        'animation-duration:.01ms!important;animation-iteration-count:1!important;' +
        'transition-duration:.01ms!important;scroll-behavior:auto!important;}}' +
      'a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,[tabindex]:focus-visible{' +
        'outline:2px solid #00D89A;outline-offset:2px;border-radius:3px;}';
    document.head.appendChild(s);
  }

  // Cloudflare Web Analytics — loaded site-wide here so it covers every page.
  if (!document.querySelector('script[src*="cloudflareinsights.com/beacon"]')) {
    var cf = document.createElement('script');
    cf.defer = true;
    cf.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    cf.setAttribute('data-cf-beacon', '{"token": "0174f5bc8ef74d9c83594fe1cfb6f7ff"}');
    document.head.appendChild(cf);
  }

  // Ensure the nav's fonts are available even on pages that don't load them.
  if (!document.querySelector('link[href*="fonts.googleapis.com"]')) {
    var f = document.createElement('link');
    f.rel = 'stylesheet';
    f.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap';
    document.head.appendChild(f);
  }

  function setActive(root) {
    var path = location.pathname.replace(/\/index\.html$/, '/').toLowerCase();
    var teams = /^\/(hawks|celtics|nets|hornets|bulls|cavaliers|mavericks|nuggets|pistons|warriors|rockets|pacers|clippers|lakers|grizzlies|heat|bucks|timberwolves|pelicans|knicks|thunder|magic|76ers|suns|blazers|kings|spurs|raptors|jazz|wizards)\.html/;
    var section = '';
    if (path === '/' || path === '') section = 'blog';
    else if (path.indexOf('/cap-sheet') === 0 || teams.test(path)) section = 'capsheets';
    else if (/^\/(epv|free-agent|rookie-extension|veteran-extension)/.test(path)) section = 'values';
    else if (/^\/(season-tracker|luxury-tax|ten-day|two-way|dead-cap)/.test(path)) section = 'trackers';
    else if (path.indexOf('/trade-evaluator') === 0) section = 'evaluator';
    else if (path.indexOf('/contract-calculator') === 0) section = 'tools';
    if (!section) return;
    var el = root.querySelector('[data-nav="' + section + '"]');
    if (el) el.classList.add('active');
  }

  function mount(html) {
    var target = document.getElementById('dtt-nav');
    if (!target) {
      target = document.createElement('div');
      target.id = 'dtt-nav';
      document.body.insertBefore(target, document.body.firstChild);
    }
    target.innerHTML = html;
    setActive(target);
  }

  fetch('/nav.html')
    .then(function (r) { return r.ok ? r.text() : Promise.reject(r.status); })
    .then(mount)
    .catch(function (e) { console.error('nav load failed', e); });
})();
