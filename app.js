(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // Cairo time
  function cairo() {
    try {
      var p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
      var g = function (t) { return p.filter(function (x) { return x.type === t; })[0].value; };
      var h = +g('hour') % 24, m = +g('minute');
      return { h: h, m: m, t: h * 60 + m, date: g('year') + '-' + g('month') + '-' + g('day') };
    } catch (e) { var d = new Date(); return { h: d.getHours(), m: d.getMinutes(), t: d.getHours() * 60 + d.getMinutes(), date: d.toISOString().slice(0, 10) }; }
  }

  // Open or closed badge. Hours come from data-* on <body> (minutes after midnight; close is next-day when smaller than open).
  var st = $('.js-status'), bd = document.body;
  if (st && bd.getAttribute('data-open')) {
    var c = cairo(), o = +bd.getAttribute('data-open'), x = +bd.getAttribute('data-close');
    var open = o < x ? (c.t >= o && c.t < x) : (c.t >= o || c.t < x);
    st.textContent = open ? bd.getAttribute('data-open-text') : bd.getAttribute('data-closed-text');
    st.classList.toggle('open', open);
  }

  // drawer
  var burger = $('.burger'), mnav = $('#mnav');
  function setNav(o) {
    if (!burger || !mnav) return;
    mnav.classList.toggle('open', o);
    burger.setAttribute('aria-expanded', String(o));
    burger.setAttribute('aria-label', o ? 'Close menu' : 'Open menu');
    document.body.style.overflow = o ? 'hidden' : '';
  }
  if (burger) {
    burger.addEventListener('click', function () { setNav(!mnav.classList.contains('open')); });
    $$('#mnav a').forEach(function (a) { a.addEventListener('click', function () { setNav(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setNav(false); });
  }

  // toast
  var toast = $('.toast'), tt, base = toast ? toast.textContent : '';
  function say(msg) {
    if (!toast) return;
    toast.textContent = msg || base;
    toast.classList.add('show'); clearTimeout(tt);
    tt = setTimeout(function () { toast.classList.remove('show'); }, 2800);
  }
  $$('.js-ar').forEach(function (b) { b.addEventListener('click', function () { say(); }); });

  // reservation request: builds an email to the reservations address
  var form = $('.js-rform');
  if (form) {
    var dateEl = $('#rf-date', form);
    if (dateEl) dateEl.min = cairo().date;
    var err = $('.rerr', form);
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var v = function (id) { return ($('#' + id, form).value || '').trim(); };
      var miss = [];
      if (!v('rf-name')) miss.push('your name');
      if (!v('rf-phone')) miss.push('a phone number');
      if (!v('rf-date')) miss.push('a date');
      if (miss.length) {
        err.textContent = 'Please add ' + miss.join(', ').replace(/, ([^,]*)$/, ' and $1') + '.';
        err.hidden = false; return;
      }
      err.hidden = true;
      var guests = v('rf-guests'), subject = 'Table request: ' + guests + (guests === '1' ? ' guest' : ' guests') + ', ' + v('rf-date') + ' at ' + v('rf-time');
      var body = 'Name: ' + v('rf-name') + '\nPhone: ' + v('rf-phone') + '\nDate: ' + v('rf-date') + '\nTime: ' + v('rf-time') + '\nGuests: ' + guests + (v('rf-notes') ? '\nNotes: ' + v('rf-notes') : '');
      var a = $('.js-mail', form), wa = bd.getAttribute('data-wa');
      if (wa) { a.href = 'https://wa.me/' + wa + '?text=' + encodeURIComponent(subject + '\n' + body); a.target = '_blank'; a.rel = 'noopener'; say('Opening WhatsApp with the request.'); }
      else { a.href = 'mailto:' + a.getAttribute('href').replace('mailto:', '').split('?')[0] + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body); say('Opening your email app with the request.'); }
      a.click();
    });
  }

  // menu: chips and scrollspy
  var chips = $$('.js-jump a');
  if (chips.length) {
    var secs = chips.map(function (c) { return $(c.getAttribute('href')); });
    var scroller = $('.js-jump .wrap');
    var setOn = function (id) {
      chips.forEach(function (c) {
        var on = c.getAttribute('href') === id;
        c.classList.toggle('on', on);
        if (on) c.setAttribute('aria-current', 'true'); else c.removeAttribute('aria-current');
      });
    };
    var lock = 0;
    function centre(c) { if (scroller) scroller.scrollTo({ left: c.offsetLeft - scroller.clientWidth / 2 + c.offsetWidth / 2, behavior: 'smooth' }); }
    chips.forEach(function (c) {
      c.addEventListener('click', function () { setOn(c.getAttribute('href')); lock = Date.now() + 1100; centre(c); });
    });
    var tick = false;
    window.addEventListener('scroll', function () {
      if (tick) return; tick = true;
      requestAnimationFrame(function () {
        tick = false;
        if (Date.now() < lock) return;
        var cur = null;
        secs.forEach(function (s, i) { if (s && s.getBoundingClientRect().top < 190) cur = chips[i]; });
        if (cur && !cur.classList.contains('on')) { setOn(cur.getAttribute('href')); centre(cur); }
        if (!cur) chips.forEach(function (c) { c.classList.remove('on'); });
      });
    }, { passive: true });
  }

  // header turns solid once you scroll past the opening photo
  var over = $('.hdr--over');
  if (over) {
    var solid = function () { over.classList.toggle('solid', window.scrollY > 40); };
    solid(); window.addEventListener('scroll', solid, { passive: true });
  }

  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // reveal on scroll (content is visible by default; the js class on <html> hides it until it enters)
  var rv = $$('.rv');
  if (rv.length) {
    if (!('IntersectionObserver' in window) || still) { rv.forEach(function (n) { n.classList.add('in'); }); }
    else {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
      rv.forEach(function (n) { io.observe(n); });
    }
  }

  // slow parallax on photos (a few dozen pixels, clamped)
  var px = $$('[data-px]');
  if (px.length && !still) {
    var pt = false;
    var upd = function () {
      pt = false;
      var vh = window.innerHeight;
      px.forEach(function (im) {
        var box = im.parentNode.getBoundingClientRect();
        if (box.bottom < -200 || box.top > vh + 200) return;
        var p = (box.top + box.height / 2 - vh / 2) / vh;
        p = Math.max(-1, Math.min(1, p));
        im.style.setProperty('--py', (-p * (+im.getAttribute('data-px'))).toFixed(1) + 'px');
      });
    };
    upd();
    window.addEventListener('scroll', function () { if (!pt) { pt = true; requestAnimationFrame(upd); } }, { passive: true });
    window.addEventListener('resize', upd);
  }

  // photo track: previous and next buttons
  var track = $('.js-track');
  if (track) {
    var step = function (d) { var f = track.querySelector('figure'); track.scrollBy({ left: d * (f ? f.offsetWidth + 20 : 320), behavior: still ? 'auto' : 'smooth' }); };
    var pv = $('.js-prev'), nx = $('.js-next');
    if (pv) pv.addEventListener('click', function () { step(-1); });
    if (nx) nx.addEventListener('click', function () { step(1); });
  }
})();

// edit mode for client meetings: ?edit turns it on (kept across pages), ?noedit turns it off
(function () {
  try {
    if (/[?&]noedit\b/.test(location.search)) localStorage.removeItem('mq-edit');
    else if (/[?&]edit\b/.test(location.search)) localStorage.setItem('mq-edit', '1');
    if (localStorage.getItem('mq-edit')) { var s = document.createElement('script'); s.src = 'edit.js?v=1'; document.body.appendChild(s); }
  } catch (e) {}
})();
