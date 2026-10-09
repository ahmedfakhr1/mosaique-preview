/* Live edit mode for client meetings. Open any page with ?edit, change things, then "Copy changes".
   Leave with ?noedit. Nothing here changes the real files: edits live in this browser only. */
(function () {
  var KEY = 'mq-edits', PAGE = (location.pathname.split('/').pop() || 'index.html');
  var S; try { S = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { S = {}; }
  ['vars', 'fonts', 'text', 'style', 'photos', 'sections'].forEach(function (k) { S[k] = S[k] || {}; });
  S.notes = S.notes || '';
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Browser storage is full: copy your changes now.'); } }
  function pg(o) { return o[PAGE] = o[PAGE] || {}; }

  // stable keys for every element, taken before anything moves
  function path(el) {
    var p = [];
    while (el && el !== document.body) {
      var i = 1, s = el; while ((s = s.previousElementSibling)) if (s.tagName === el.tagName) i++;
      p.unshift(el.tagName.toLowerCase() + i); el = el.parentElement;
    }
    return p.join('/');
  }
  Array.prototype.forEach.call(document.body.querySelectorAll('*'), function (el) { el.setAttribute('data-mqk', path(el)); });
  function byKey(k) { return document.querySelector('[data-mqk="' + k + '"]'); }
  function short(t) { t = (t || '').replace(/\s+/g, ' ').trim(); return t.length > 70 ? t.slice(0, 67) + '...' : t; }

  // colours (CSS variables on :root)
  var root = document.documentElement, cs = getComputedStyle(root);
  var VARS = [['night', 'Header, hero, footer'], ['wood', 'Dark sections'], ['panel', 'Dark panels'], ['ink', 'Main text'],
    ['marble', 'Light background'], ['paper', 'Cards and forms'], ['stone', 'Soft grey'], ['brass', 'Accent (amber)'],
    ['brass-lt', 'Accent, light'], ['coral', 'Buttons'], ['coral-dk', 'Buttons, hover'], ['mute', 'Small text'],
    ['mute-dk', 'Small text on dark'], ['line', 'Lines'], ['line-dk', 'Lines on dark'], ['rose', 'Errors']];
  var ORIG = {}; VARS.forEach(function (v) { ORIG[v[0]] = cs.getPropertyValue('--' + v[0]).trim(); });
  function applyVars() { for (var k in S.vars) root.style.setProperty('--' + k, S.vars[k]); }

  // fonts: find every rule that uses each family, then override it
  var ROLES = { head: ['Antonio', 'Headings and menu'], accent: ['Newsreader', 'Dish names, italic titles'], body: ['Hanken Grotesk', 'Body text and buttons'] };
  var SEL = { head: [], accent: [], body: [] };
  Array.prototype.forEach.call(document.styleSheets, function (sh) {
    var rules; try { rules = sh.cssRules; } catch (e) { return; }
    Array.prototype.forEach.call(rules || [], function (r) {
      if (!r.style || !r.selectorText) return;
      var f = r.style.fontFamily || '';
      for (var k in ROLES) if (f.split(',')[0].indexOf(ROLES[k][0]) > -1) SEL[k].push(r.selectorText);
    });
  });
  var GF = { 'Oswald': 'Oswald:wght@400;500;600', 'Bebas Neue': 'Bebas+Neue', 'Cinzel': 'Cinzel:wght@400;500;700',
    'Marcellus': 'Marcellus', 'Young Serif': 'Young+Serif', 'Playfair Display': 'Playfair+Display:ital,wght@0,400;0,500;0,700;1,400;1,500',
    'DM Serif Display': 'DM+Serif+Display:ital@0;1', 'Cormorant Garamond': 'Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500',
    'Libre Baskerville': 'Libre+Baskerville:ital,wght@0,400;0,700;1,400', 'Lora': 'Lora:ital,wght@0,400;0,500;0,600;1,400;1,500',
    'Inter': 'Inter:wght@400;500;600;700', 'DM Sans': 'DM+Sans:wght@400;500;600;700', 'Work Sans': 'Work+Sans:wght@400;500;600;700',
    'Jost': 'Jost:wght@400;500;600;700', 'Manrope': 'Manrope:wght@400;500;600;700', 'Lato': 'Lato:wght@400;700' };
  var LIST = { head: ['Antonio', 'Oswald', 'Bebas Neue', 'Cinzel', 'Marcellus', 'Young Serif', 'Playfair Display', 'DM Serif Display', 'Cormorant Garamond'],
    accent: ['Newsreader', 'Playfair Display', 'Cormorant Garamond', 'Libre Baskerville', 'Lora', 'DM Serif Display'],
    body: ['Hanken Grotesk', 'Inter', 'DM Sans', 'Work Sans', 'Jost', 'Manrope', 'Lato'] };
  var fontStyle = document.createElement('style'); document.head.appendChild(fontStyle);
  function loadFont(n) {
    if (n === 'Antonio' || n === 'Newsreader' || n === 'Hanken Grotesk' || document.getElementById('gf-' + n)) return;
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.id = 'gf-' + n;
    l.href = 'https://fonts.googleapis.com/css2?family=' + (GF[n] || n.replace(/ /g, '+')) + '&display=swap';
    document.head.appendChild(l);
  }
  function applyFonts() {
    var css = '';
    ['body', 'accent', 'head'].forEach(function (k) {
      var n = S.fonts[k]; if (!n || !SEL[k].length) return; loadFont(n);
      css += SEL[k].join(',') + '{font-family:"' + n + '","' + ROLES[k][0] + '",sans-serif !important}';
    });
    fontStyle.textContent = css;
  }

  // text, size, colour per element
  function applyText() {
    var t = pg(S.text), st = pg(S.style), k, el;
    for (k in t) if ((el = byKey(k))) el.innerText = t[k].to;
    for (k in st) if ((el = byKey(k))) { if (st[k].fs) el.style.fontSize = st[k].fs + 'px'; if (st[k].color) el.style.color = st[k].color; }
  }
  function applyPhotos() {
    var p = pg(S.photos), el;
    for (var k in p) if ((el = byKey(k)) && p[k].data) { el.removeAttribute('srcset'); el.src = p[k].data; }
  }
  function sections() {
    return Array.prototype.filter.call(document.body.children, function (el) { return el.tagName === 'SECTION' || el.tagName === 'MAIN'; })
      .reduce(function (a, el) { return a.concat(el.tagName === 'MAIN' ? Array.prototype.slice.call(el.children).filter(function (c) { return c.tagName === 'SECTION'; }) : [el]); }, []);
  }
  function secLabel(el) { var h = el.querySelector('h1,h2,h3'); return short(h ? h.innerText : el.className || 'Section'); }
  var SECORIG = sections().map(function (el) { return el.getAttribute('data-mqk'); });
  function applySections() {
    var s = pg(S.sections), list = sections();
    if (s.order) {
      var anchor = list.length ? list[list.length - 1].nextSibling : null, parent = list.length ? list[0].parentNode : null;
      s.order.forEach(function (k) { var el = byKey(k); if (el && parent) parent.insertBefore(el, anchor); });
    }
    sections().forEach(function (el) { el.style.display = (s.hidden || []).indexOf(el.getAttribute('data-mqk')) > -1 ? 'none' : ''; });
  }
  function applyAll() { applyVars(); applyFonts(); applyText(); applyPhotos(); applySections(); }
  applyAll();

  // panel
  var css = document.createElement('style');
  css.textContent = '.mqe,.mqe *{box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",sans-serif !important;letter-spacing:0;text-transform:none}' +
    '.mqe-fab{position:fixed;left:14px;bottom:86px;z-index:9999;background:#1d1d1f;color:#fff;border:0;border-radius:24px;padding:12px 18px;font:600 15px system-ui;box-shadow:0 6px 20px rgba(0,0,0,.35);cursor:pointer}' +
    '.mqe-p{position:fixed;z-index:9998;right:0;top:0;bottom:0;width:340px;background:#fff;color:#1d1d1f;box-shadow:-8px 0 30px rgba(0,0,0,.25);display:none;flex-direction:column;font-size:14px;line-height:1.4}' +
    '.mqe-p.on{display:flex}@media(max-width:700px){.mqe-p{top:auto;left:0;width:auto;height:58vh;border-radius:16px 16px 0 0}}' +
    '.mqe-h{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid #e5e5e5}.mqe-h b{flex:1;font-size:15px}' +
    '.mqe-t{display:flex;gap:4px;padding:8px 10px;overflow-x:auto;border-bottom:1px solid #e5e5e5}.mqe-t button{flex:none;border:0;background:#f2f2f2;border-radius:16px;padding:7px 12px;font-size:13px;cursor:pointer;color:#1d1d1f}.mqe-t button.on{background:#1d1d1f;color:#fff}' +
    '.mqe-b{flex:1;overflow:auto;padding:12px 14px}.mqe-f{display:flex;gap:8px;padding:10px 14px;border-top:1px solid #e5e5e5}' +
    '.mqe button.x{border:1px solid #ccc;background:#fff;border-radius:8px;padding:9px 12px;font-size:13px;cursor:pointer;color:#1d1d1f}.mqe button.pr{background:#1d1d1f;color:#fff;border-color:#1d1d1f;flex:1}' +
    '.mqe-r{display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #f0f0f0}.mqe-r span{flex:1}.mqe-r input[type=color]{width:44px;height:32px;border:1px solid #ccc;border-radius:6px;padding:0;background:none}' +
    '.mqe select,.mqe textarea,.mqe input[type=text]{width:100%;border:1px solid #ccc;border-radius:8px;padding:8px;font-size:14px;color:#1d1d1f;background:#fff}.mqe label{display:block;margin:10px 0 4px;font-weight:600}' +
    '.mqe p.n{color:#666;font-size:13px;margin:0 0 10px}.mqe-s{display:flex;align-items:center;gap:6px;padding:7px 0;border-bottom:1px solid #f0f0f0}.mqe-s span{flex:1}.mqe-s.off span{opacity:.4;text-decoration:line-through}' +
    'body.mqe-text [data-mqk]:not(.mqe *):hover{outline:2px dashed #2b7cff;outline-offset:2px;cursor:text}body.mqe-photo img:hover{outline:3px solid #2b7cff;cursor:pointer}' +
    '[contenteditable=true]{outline:2px solid #2b7cff !important;outline-offset:2px}' +
    '.mqe-out{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px}.mqe-out div{background:#fff;border-radius:12px;padding:14px;width:min(640px,100%);max-height:90vh;display:flex;flex-direction:column;gap:10px}.mqe-out textarea{flex:1;min-height:50vh;font:12px/1.4 ui-monospace,monospace !important}' +
    '.mqe-toast{position:fixed;left:50%;transform:translateX(-50%);bottom:140px;z-index:10001;background:#1d1d1f;color:#fff;padding:10px 16px;border-radius:20px;font:500 14px system-ui}';
  document.head.appendChild(css);

  var fab = document.createElement('button'); fab.className = 'mqe mqe-fab'; fab.textContent = '✎ Edit';
  var P = document.createElement('div'); P.className = 'mqe mqe-p';
  P.innerHTML = '<div class="mqe-h"><b>Edit mode</b><button class="x" data-a="close">Close</button></div>' +
    '<div class="mqe-t"></div><div class="mqe-b"></div>' +
    '<div class="mqe-f"><button class="x pr" data-a="copy">Copy changes</button><button class="x" data-a="reset">Reset</button><button class="x" data-a="exit">Exit</button></div>';
  document.body.appendChild(fab); document.body.appendChild(P);
  var tabsEl = P.querySelector('.mqe-t'), body = P.querySelector('.mqe-b'), tab = 'Colours', mode = '';
  var TABS = ['Colours', 'Fonts', 'Text', 'Photos', 'Sections', 'Notes'];
  function setMode(m) { mode = m; document.body.classList.toggle('mqe-text', m === 'text'); document.body.classList.toggle('mqe-photo', m === 'photo'); }
  function renderTabs() {
    tabsEl.innerHTML = '';
    TABS.forEach(function (t) { var b = document.createElement('button'); b.textContent = t; if (t === tab) b.className = 'on'; b.onclick = function () { tab = t; render(); }; tabsEl.appendChild(b); });
  }
  function toHex(c) { if (/^#[0-9a-f]{6}$/i.test(c)) return c; var d = document.createElement('div'); d.style.color = c; document.body.appendChild(d); var m = getComputedStyle(d).color.match(/\d+/g); d.remove(); return '#' + m.slice(0, 3).map(function (x) { return (+x).toString(16).padStart(2, '0'); }).join(''); }
  var sel = null;
  function render() {
    renderTabs(); setMode(tab === 'Text' ? 'text' : tab === 'Photos' ? 'photo' : ''); body.innerHTML = '';
    if (tab === 'Colours') {
      body.innerHTML = '<p class="n">Applies to every page.</p>';
      VARS.forEach(function (v) {
        var r = document.createElement('div'); r.className = 'mqe-r';
        r.innerHTML = '<span>' + v[1] + '</span><input type="color">';
        var i = r.querySelector('input'); i.value = toHex(S.vars[v[0]] || ORIG[v[0]]);
        i.oninput = function () { S.vars[v[0]] = i.value; applyVars(); save(); };
        body.appendChild(r);
      });
    } else if (tab === 'Fonts') {
      body.innerHTML = '<p class="n">Applies to every page. Needs internet for new fonts.</p>';
      for (var k in ROLES) (function (k) {
        var l = document.createElement('label'); l.textContent = ROLES[k][1]; body.appendChild(l);
        var s = document.createElement('select');
        LIST[k].concat(['Other...']).forEach(function (n) { var o = document.createElement('option'); o.textContent = n; s.appendChild(o); });
        var cur = S.fonts[k] || ROLES[k][0]; if (LIST[k].indexOf(cur) < 0) { var o = document.createElement('option'); o.textContent = cur; s.insertBefore(o, s.lastChild); }
        s.value = cur;
        s.onchange = function () {
          var n = s.value; if (n === 'Other...') { n = prompt('Google Fonts name (e.g. Cinzel Decorative)'); if (!n) { s.value = cur; return; } }
          if (n === ROLES[k][0]) delete S.fonts[k]; else S.fonts[k] = n; applyFonts(); save(); render();
        };
        body.appendChild(s);
      })(k);
    } else if (tab === 'Text') {
      body.innerHTML = '<p class="n">Tap any text on the page to rewrite it. Links don\'t open while this tab is on.</p><div class="sel"></div>';
      var box = body.querySelector('.sel');
      if (sel) {
        var k2 = sel.getAttribute('data-mqk'), st = pg(S.style);
        box.innerHTML = '<label>Selected: "' + short(sel.innerText).replace(/</g, '&lt;') + '"</label>' +
          '<div class="mqe-r"><span>Size</span><button class="x" data-z="-1">A−</button><button class="x" data-z="1">A+</button></div>' +
          '<div class="mqe-r"><span>Colour</span><input type="color"></div><button class="x" data-z="0">Undo style on this text</button>';
        box.querySelectorAll('[data-z]').forEach(function (b) {
          b.onclick = function () {
            var z = +b.getAttribute('data-z');
            if (!z) { delete st[k2]; sel.style.fontSize = ''; sel.style.color = ''; save(); return render(); }
            var fs = Math.round(parseFloat(getComputedStyle(sel).fontSize) * (z > 0 ? 1.08 : 0.92));
            sel.style.fontSize = fs + 'px'; st[k2] = st[k2] || {}; st[k2].fs = fs; save();
          };
        });
        var ci = box.querySelector('input'); ci.value = toHex(getComputedStyle(sel).color);
        ci.oninput = function () { sel.style.color = ci.value; st[k2] = st[k2] || {}; st[k2].color = ci.value; save(); };
      }
    } else if (tab === 'Photos') {
      body.innerHTML = '<p class="n">Tap any photo on the page to swap it with one from this device. Send me the original files too.</p>';
      var p = pg(S.photos);
      for (var k3 in p) { var d = document.createElement('div'); d.className = 'mqe-r'; d.innerHTML = '<span>' + short(p[k3].alt || p[k3].from) + ' → ' + p[k3].name + '</span>'; body.appendChild(d); }
    } else if (tab === 'Sections') {
      body.innerHTML = '<p class="n">This page only. Move sections or hide them.</p>';
      var s = pg(S.sections);
      sections().forEach(function (el, i, all) {
        var k4 = el.getAttribute('data-mqk'), off = (s.hidden || []).indexOf(k4) > -1;
        var r = document.createElement('div'); r.className = 'mqe-s' + (off ? ' off' : '');
        r.innerHTML = '<span>' + secLabel(el).replace(/</g, '&lt;') + '</span><button class="x" data-m="-1">↑</button><button class="x" data-m="1">↓</button><button class="x" data-m="h">' + (off ? 'Show' : 'Hide') + '</button>';
        r.querySelectorAll('button').forEach(function (b) {
          b.onclick = function () {
            var m = b.getAttribute('data-m'), order = all.map(function (e) { return e.getAttribute('data-mqk'); });
            if (m === 'h') { s.hidden = s.hidden || []; if (off) s.hidden.splice(s.hidden.indexOf(k4), 1); else s.hidden.push(k4); }
            else { var j = i + (+m); if (j < 0 || j >= order.length) return; order.splice(j, 0, order.splice(i, 1)[0]); s.order = order; }
            applySections(); save(); render(); if (m !== 'h') byKey(k4).scrollIntoView({ behavior: 'smooth', block: 'start' });
          };
        });
        body.appendChild(r);
      });
    } else if (tab === 'Notes') {
      body.innerHTML = '<p class="n">Anything else he asked for, in your words.</p><textarea rows="10"></textarea>';
      var ta = body.querySelector('textarea'); ta.value = S.notes; ta.oninput = function () { S.notes = ta.value; save(); };
    }
  }

  // text editing
  document.addEventListener('click', function (e) {
    if (P.contains(e.target) || fab.contains(e.target)) return;
    if (mode === 'text') {
      var el = e.target.closest('[data-mqk]'); if (!el) return;
      e.preventDefault(); e.stopPropagation();
      var own = function (n) { return Array.prototype.some.call(n.childNodes, function (c) { return c.nodeType === 3 && c.textContent.trim(); }); };
      while (el && el !== document.body && !own(el)) el = el.parentElement;
      if (!el || el === document.body || el.closest('section,header,footer,nav') === el) return;
      if (el.tagName === 'IMG' || el.tagName === 'svg' || el.closest('svg')) return;
      startEdit(el);
    } else if (mode === 'photo') {
      var img = e.target.closest('img') || (e.target.closest('figure,picture,.pimg') || {}).querySelector && e.target.closest('figure,picture,.pimg').querySelector('img');
      if (!img) return; e.preventDefault(); e.stopPropagation(); pickPhoto(img);
    }
  }, true);
  function startEdit(el) {
    if (sel && sel !== el) sel.removeAttribute('contenteditable');
    sel = el; var k = el.getAttribute('data-mqk'), t = pg(S.text);
    var before = t[k] ? t[k].from : el.innerText;
    el.setAttribute('contenteditable', 'true'); el.focus();
    el.oninput = function () { if (el.innerText.trim() === before.trim()) delete t[k]; else t[k] = { from: before, to: el.innerText }; save(); };
    el.onblur = function () { el.removeAttribute('contenteditable'); };
    if (tab === 'Text') render();
  }
  var file = document.createElement('input'); file.type = 'file'; file.accept = 'image/*'; file.style.display = 'none'; document.body.appendChild(file);
  function pickPhoto(img) {
    file.value = ''; file.onchange = function () {
      var f = file.files[0]; if (!f) return; var r = new FileReader();
      r.onload = function () {
        var im = new Image(); im.onload = function () {
          var s = Math.min(1, 1100 / Math.max(im.width, im.height)), c = document.createElement('canvas');
          c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          var data = c.toDataURL('image/jpeg', 0.72), k = img.getAttribute('data-mqk'), p = pg(S.photos);
          p[k] = { from: (p[k] && p[k].from) || img.getAttribute('src'), alt: img.alt, name: f.name, data: data };
          img.removeAttribute('srcset'); img.src = data; save(); render();
        }; im.src = r.result;
      }; r.readAsDataURL(f);
    }; file.click();
  }

  // export
  function report() {
    var L = ['MOSAÏQUE WEBSITE CHANGES (' + new Date().toLocaleString() + ')', ''];
    var vk = Object.keys(S.vars); if (vk.length) { L.push('COLOURS (all pages)'); vk.forEach(function (k) { var lab = (VARS.filter(function (v) { return v[0] === k; })[0] || [k, k])[1]; L.push('- ' + lab + ' (--' + k + '): ' + ORIG[k] + ' -> ' + S.vars[k]); }); L.push(''); }
    var fk = Object.keys(S.fonts); if (fk.length) { L.push('FONTS (all pages)'); fk.forEach(function (k) { L.push('- ' + ROLES[k][1] + ': ' + ROLES[k][0] + ' -> ' + S.fonts[k]); }); L.push(''); }
    var pages = {}; ['text', 'style', 'photos', 'sections'].forEach(function (g) { for (var p in S[g]) pages[p] = 1; });
    Object.keys(pages).forEach(function (p) {
      var out = [], t = S.text[p] || {}, st = S.style[p] || {}, ph = S.photos[p] || {}, se = S.sections[p] || {};
      for (var k in t) out.push('- Text: "' + short(t[k].from) + '" -> "' + t[k].to.replace(/\s+/g, ' ').trim() + '"   [' + k + ']');
      for (k in st) out.push('- Style [' + k + ']: ' + (st[k].fs ? 'size ' + st[k].fs + 'px ' : '') + (st[k].color ? 'colour ' + st[k].color : ''));
      for (k in ph) out.push('- Photo: ' + ph[k].from + ' ("' + short(ph[k].alt) + '") -> new photo file "' + ph[k].name + '"   [' + k + ']');
      if (se.order) out.push('- Section order: ' + se.order.map(function (k) { var e = byKey(k); return e && p === PAGE ? secLabel(e) : k; }).join(' | '));
      if (se.hidden && se.hidden.length) out.push('- Hidden sections: ' + se.hidden.map(function (k) { var e = byKey(k); return e && p === PAGE ? secLabel(e) : k; }).join(' | '));
      if (out.length) { L.push('PAGE ' + p); L = L.concat(out); L.push(''); }
    });
    if (S.notes.trim()) { L.push('NOTES'); L.push(S.notes.trim()); L.push(''); }
    if (L.length === 2) L.push('No changes yet.');
    var lite = JSON.parse(JSON.stringify(S)); for (var p in lite.photos) for (var k in lite.photos[p]) delete lite.photos[p][k].data;
    L.push('--- data ---'); L.push(JSON.stringify(lite));
    return L.join('\n');
  }
  function showOut(txt, copied) {
    var o = document.createElement('div'); o.className = 'mqe mqe-out';
    o.innerHTML = '<div><b>' + (copied ? 'Copied. Paste it to Claude.' : 'Select all and copy, then paste it to Claude.') + '</b><textarea readonly></textarea><button class="x pr">Done</button></div>';
    o.querySelector('textarea').value = txt; o.querySelector('button').onclick = function () { o.remove(); };
    document.body.appendChild(o);
  }
  function toast(m) { var t = document.createElement('div'); t.className = 'mqe mqe-toast'; t.textContent = m; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2600); }

  P.addEventListener('click', function (e) {
    var a = e.target.getAttribute && e.target.getAttribute('data-a'); if (!a) return;
    if (a === 'close') { P.classList.remove('on'); setMode(''); fab.style.display = ''; }
    if (a === 'copy') { var txt = report(); if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () { showOut(txt, true); }, function () { showOut(txt, false); }); else showOut(txt, false); }
    if (a === 'reset' && confirm('Remove all edits on all pages?')) { localStorage.removeItem(KEY); location.reload(); }
    if (a === 'exit') { localStorage.removeItem('mq-edit'); location.href = location.pathname; }
  });
  fab.onclick = function () { P.classList.add('on'); fab.style.display = 'none'; render(); };
})();
