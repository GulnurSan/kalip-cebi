(function () {
  'use strict';

  // ---------- storage ----------
  var KEY = 'kalipcebi-v1';
  var INT = [0, 1, 3, 7, 14, 30, 60]; // days per box
  var KNOWN = 4; // box from which an item counts as "learnt"

  function today() {
    var d = new Date();
    return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
  }
  function load() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    s = s && typeof s === 'object' ? s : {};
    s.items = s.items || {};
    s.streak = s.streak || { n: 0, last: -9 };
    s.daily = s.daily || { day: -1, n: 0 };
    s.set = Object.assign({ dir: 'mix', goal: 20, accent: 'en-GB', rate: 0.9, auto: true, batch: 30 }, s.set || {});
    return s;
  }
  var S = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('İlerleme kaydedilemedi'); }
  }

  // ---------- model ----------
  var ALL = [], BYID = {}, UNITS = [];
  LEVELS.forEach(function (L) {
    function mk(t) {
      return function (x) {
        var it = { id: L.id + '|' + t + '|' + x[0], en: x[0], tr: x[1], ex: x[2] || '', t: t, L: L };
        BYID[it.id] = it; return it;
      };
    }
    var W = L.w.map(mk('w')), P = L.p.map(mk('p'));
    var n = Math.max(Math.ceil(W.length / 10), Math.ceil(P.length / 3));
    L.units = [];
    for (var i = 0; i < n; i++) {
      var u = { id: L.id + '-' + (i + 1), n: i + 1, L: L, items: W.slice(i * 10, i * 10 + 10).concat(P.slice(i * 3, i * 3 + 3)) };
      u.items.forEach(function (it) { it.u = u; });
      L.units.push(u); UNITS.push(u);
    }
    L.items = W.concat(P);
    ALL = ALL.concat(L.items);
  });

  function st(it) { return S.items[it.id]; }
  function isKnown(it) { var s = st(it); return !!s && s.b >= KNOWN; }
  function isSeen(it) { return !!st(it); }
  function counts(items) {
    var k = 0, l = 0;
    items.forEach(function (it) { var s = st(it); if (s) { if (s.b >= KNOWN) k++; else l++; } });
    return { k: k, l: l, n: items.length };
  }
  function dueItems() {
    var t = today();
    return ALL.filter(function (it) { var s = st(it); return s && s.b >= 1 && s.d <= t; })
      .sort(function (a, b) { return st(a).d - st(b).d; });
  }
  function nextUnit() {
    if (S.lastUnit) {
      var lu = UNITS.filter(function (u) { return u.id === S.lastUnit; })[0];
      if (lu && lu.items.some(function (it) { return !isSeen(it); })) return lu;
    }
    for (var i = 0; i < UNITS.length; i++) {
      if (UNITS[i].items.some(function (it) { return !isSeen(it); })) return UNITS[i];
    }
    return null;
  }
  function tick() {
    var t = today();
    if (S.daily.day !== t) S.daily = { day: t, n: 0 };
    S.daily.n++;
    if (S.streak.last !== t) {
      S.streak.n = S.streak.last === t - 1 ? S.streak.n + 1 : 1;
      S.streak.last = t;
    }
  }
  function streakNow() { var t = today(); return S.streak.last >= t - 1 ? S.streak.n : 0; }
  function todayCount() { return S.daily.day === today() ? S.daily.n : 0; }
  function grade(it, g, lapsed) {
    var s = S.items[it.id] || { b: 0, d: 0, c: 0, w: 0 };
    var t = today();
    if (lapsed) { s.b = 1; s.d = t + 1; s.w++; }
    else if (g === 'good') { s.b = Math.min(6, s.b + 1); s.d = t + INT[s.b]; s.c++; }
    else { s.b = Math.max(1, s.b); s.d = t + Math.max(1, Math.round(INT[s.b] / 2)); s.c++; }
    S.items[it.id] = s; tick(); save();
  }

  // ---------- helpers ----------
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function $(id) { return document.getElementById(id); }
  var toastT;
  function toast(msg) { var t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2200); }
  function bar(c) {
    var k = c.n ? c.k / c.n * 100 : 0, l = c.n ? c.l / c.n * 100 : 0;
    return '<div class="bar"><i class="k" style="width:' + k + '%"></i><i class="l" style="width:' + l + '%"></i></div>';
  }
  var SPK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>';
  function kindLabel(it) { return it.t === 'w' ? 'Kelime' : 'Kalıp'; }

  // ---------- speech ----------
  var voices = [];
  function loadVoices() { try { voices = window.speechSynthesis.getVoices() || []; } catch (e) { voices = []; } }
  if ('speechSynthesis' in window) { loadVoices(); try { window.speechSynthesis.onvoiceschanged = loadVoices; } catch (e) {} }
  function pickVoice() {
    var a = S.set.accent;
    var norm = function (v) { return (v.lang || '').replace('_', '-'); };
    return voices.filter(function (v) { return norm(v) === a; })[0] || voices.filter(function (v) { return norm(v).indexOf('en') === 0; })[0] || null;
  }
  function speak(text) {
    if (!('speechSynthesis' in window)) { toast('Bu cihazda sesli okuma yok'); return; }
    try {
      var clean = String(text).replace(/…/g, ', ').replace(/\s\/\s/g, '. ').replace(/\([^)]*\)/g, '');
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(clean);
      u.lang = S.set.accent; var v = pickVoice(); if (v) u.voice = v;
      u.rate = S.set.rate;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  // ---------- navigation ----------
  var cur = { v: 'home' };
  var dictState = { q: '', lvl: 'all', t: 'all', limit: 120 };
  function go(v, arg) { cur = { v: v, arg: arg }; render(); window.scrollTo(0, 0); }
  function render() {
    var v = cur.v, html = '';
    if (v === 'home') html = vHome();
    else if (v === 'levels') html = vLevels();
    else if (v === 'level') html = vLevel(cur.arg);
    else if (v === 'unit') html = vUnit(cur.arg);
    else if (v === 'dict') html = vDict();
    else if (v === 'settings') html = vSettings();
    $('view').innerHTML = html;
    var tab = { level: 'levels', unit: 'levels' }[v] || v;
    Array.prototype.forEach.call(document.querySelectorAll('#tabs button'), function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === tab); });
    if (v === 'dict') bindDict();
  }

  // ---------- views ----------
  function vHome() {
    var due = dueItems().length, nu = nextUnit(), tc = todayCount(), goal = S.set.goal;
    var all = counts(ALL);
    var h = '<div class="hero"><h1>Kalıp Cebi</h1><p>Kelime ve kalıp, A1\'den C2\'ye.</p>' +
      '<div class="stat-row"><div class="stat"><b>' + streakNow() + '</b><span>gün seri</span></div>' +
      '<div class="stat"><b>' + tc + '/' + goal + '</b><span>bugünkü kart</span></div>' +
      '<div class="stat"><b>' + all.k + '</b><span>öğrenildi</span></div></div></div><div class="checks" style="margin:0 -16px"></div>';
    h += '<div class="box"><h3>Tekrar zamanı</h3>';
    if (due) h += '<p class="muted">' + due + ' kart seni bekliyor. Önce tekrar, sonra yeni ünite.</p><button class="btn" data-act="review">Tekrara başla</button>';
    else h += '<p class="muted">Bugün tekrar edilecek kart yok. Yeni bir ünite öğrenebilirsin.</p>';
    h += '</div>';
    if (nu) {
      var c = counts(nu.items);
      h += '<div class="box"><h3>Sıradaki: ' + nu.L.id + ' · Ünite ' + nu.n + '</h3><p class="muted small">' +
        esc(nu.items.slice(0, 4).map(function (i) { return i.en; }).join(', ')) + '…</p>' + bar(c) +
        '<p class="small muted" style="margin-top:6px">' + (c.k + c.l) + '/' + c.n + ' görüldü</p>' +
        '<button class="btn alt" data-act="learn" data-id="' + nu.id + '">Öğrenmeye başla</button></div>';
    } else {
      h += '<div class="box"><h3>Bütün üniteleri gördün!</h3><p class="muted">Şimdi düzenli tekrarla hepsini kalıcı hale getir.</p></div>';
    }
    h += '<details class="box"><summary>Konuşurken donup kalırsan: 4 adım</summary><ol class="steps">' +
      '<li><b>Zaman kazan:</b> “Let me think for a second…”</li>' +
      '<li><b>Başlatıcıyla gir:</b> “I think…”, “The thing is…”</li>' +
      '<li><b>Kısa cümle kur:</b> Uzun Türkçe cümleyi 2-3 basit cümleye böl.</li>' +
      '<li><b>Kelime yoksa tarif et:</b> “It\'s the thing you use to…”</li></ol>' +
      '<p class="small muted" style="margin:6px 0 0">Mükemmel olmak zorunda değilsin, anlaşılır olman yeter.</p></details>';
    h += '<h2>Seviyeler</h2>' + levelList();
    return h;
  }
  function levelList() {
    return LEVELS.map(function (L) {
      var c = counts(L.items);
      return '<button class="lvl" data-act="level" data-id="' + L.id + '"><span class="badge">' + L.id + '</span><span class="mid"><b>' + esc(L.name) + '</b>' + bar(c) +
        '<span class="small muted">' + c.k + ' öğrenildi · ' + c.l + ' öğreniliyor · ' + c.n + ' toplam</span></span></button>';
    }).join('') + '<div class="legend"><span><i class="dot k"></i>Öğrenildi</span><span><i class="dot l"></i>Öğreniliyor</span><span><i class="dot"></i>Yeni</span></div>';
  }
  function vLevels() {
    return '<div class="top"><h1>Seviyeler</h1></div><p class="muted">Her seviye kelime ve kalıplardan oluşan ünitelere bölünmüş. Sırayla ilerle ya da istediğin seviyeden başla.</p>' + levelList();
  }
  function vLevel(id) {
    var L = LEVELS.filter(function (x) { return x.id === id; })[0];
    var c = counts(L.items);
    var h = '<div class="top"><button class="back" data-act="tab" data-id="levels" aria-label="Geri">‹</button><h1>' + L.id + ' · ' + esc(L.name) + '</h1></div>' +
      '<p class="muted">' + esc(L.desc) + '</p>' + bar(c) +
      '<p class="small muted">' + L.w.length + ' kelime · ' + L.p.length + ' kalıp · ' + c.k + ' öğrenildi</p>' +
      '<button class="btn ghost" data-act="quizlevel" data-id="' + L.id + '">Seviye quizi (20 soru)</button><h2>Üniteler</h2>';
    h += L.units.map(function (u) {
      var uc = counts(u.items), seen = uc.k + uc.l;
      var cls = uc.k === uc.n ? ' done' : seen ? ' part' : '';
      return '<button class="unit' + cls + '" data-act="unitsheet" data-id="' + u.id + '"><span class="num">' + u.n + '</span><span class="mid"><b>Ünite ' + u.n + '</b>' +
        '<div class="prev">' + esc(u.items.map(function (i) { return i.en; }).join(', ')) + '</div>' + bar(uc) + '</span></button>';
    }).join('');
    return h;
  }
  function unitById(id) { return UNITS.filter(function (u) { return u.id === id; })[0]; }
  function vUnit(id) {
    var u = unitById(id);
    return '<div class="top"><button class="back" data-act="level" data-id="' + u.L.id + '" aria-label="Geri">‹</button><h1>' + u.L.id + ' · Ünite ' + u.n + '</h1></div>' +
      '<button class="btn" data-act="learn" data-id="' + u.id + '">Kartlarla öğren</button><button class="btn ghost" data-act="quizunit" data-id="' + u.id + '">Quiz</button>' +
      '<div style="margin-top:10px">' + u.items.map(rowHtml).join('') + '</div>';
  }
  function statusDot(it) { var s = st(it); return '<i class="dot ' + (!s ? '' : s.b >= KNOWN ? 'k' : 'l') + '"></i>'; }
  function rowHtml(it) {
    return '<div class="row"><div class="mid"><div class="en">' + statusDot(it) + esc(it.en) + (it.t === 'p' ? '<span class="tag">kalıp</span>' : '') + '</div><div class="tr">' + esc(it.tr) + '</div>' +
      (it.ex ? '<div class="ex">' + esc(it.ex) + '</div>' : '') + '</div><button class="spk" data-act="speak" data-id="' + esc(it.id) + '" aria-label="Dinle">' + SPK + '</button></div>';
  }
  function vDict() {
    var d = dictState;
    var h = '<div class="top"><h1>Sözlük</h1></div><input type="search" id="q" placeholder="İngilizce ya da Türkçe ara" value="' + esc(d.q) + '" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">' +
      '<div class="chips" style="margin-top:10px">' + ['all'].concat(LEVELS.map(function (L) { return L.id; })).map(function (l) {
        return '<button class="chip' + (d.lvl === l ? ' on' : '') + '" data-act="dlvl" data-id="' + l + '">' + (l === 'all' ? 'Hepsi' : l) + '</button>';
      }).join('') + '</div><div class="seg">' + [['all', 'Hepsi'], ['w', 'Kelimeler'], ['p', 'Kalıplar']].map(function (x) {
        return '<button class="' + (d.t === x[0] ? 'on' : '') + '" data-act="dtype" data-id="' + x[0] + '">' + x[1] + '</button>';
      }).join('') + '</div><div id="dres"></div>';
    return h;
  }
  function norm(s) { return String(s).toLocaleLowerCase('tr').replace(/[’']/g, "'"); }
  function dictResults() {
    var d = dictState, q = norm(d.q.trim());
    var res = ALL.filter(function (it) {
      return (d.lvl === 'all' || it.L.id === d.lvl) && (d.t === 'all' || it.t === d.t) &&
        (!q || norm(it.en).indexOf(q) >= 0 || norm(it.tr).indexOf(q) >= 0);
    });
    var h = '<p class="small muted" style="margin:12px 0 0">' + res.length + ' sonuç</p>';
    if (!res.length) return h + '<p class="empty">Sonuç yok. Başka bir kelime dene.</p>';
    h += res.slice(0, d.limit).map(function (it) { return rowHtml(it).replace('<div class="tr">', '<div class="tr"><b class="small">' + it.L.id + '</b> · '); }).join('');
    if (res.length > d.limit) h += '<button class="btn ghost" style="margin-top:14px" data-act="dmore">Daha fazla göster</button>';
    return h;
  }
  function bindDict() {
    $('dres').innerHTML = dictResults();
    var q = $('q');
    q.addEventListener('input', function () { dictState.q = q.value; dictState.limit = 120; $('dres').innerHTML = dictResults(); });
  }
  function vSettings() {
    var s = S.set;
    function seg(key, opts) {
      return '<div class="seg">' + opts.map(function (o) { return '<button class="' + (String(s[key]) === String(o[0]) ? 'on' : '') + '" data-act="set" data-k="' + key + '" data-id="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>';
    }
    return '<div class="top"><h1>Ayarlar</h1></div>' +
      '<div class="set"><label>Tekrarda kart yönü</label>' + seg('dir', [['en', 'İng → Tr'], ['tr', 'Tr → İng'], ['mix', 'Karışık']]) +
      '<p class="small muted" style="margin:8px 0 0">Konuşma için en etkilisi <b>Tr → İng</b>: Türkçeye bakıp İngilizcesini sesli söylersin. Yeni kartlar ilk seferde her zaman İngilizce gösterilir.</p></div>' +
      '<div class="set"><label>Günlük hedef (kart)</label>' + seg('goal', [[10, '10'], [20, '20'], [40, '40'], [60, '60']]) + '</div>' +
      '<div class="set"><label>Bir tekrar oturumunda en fazla</label>' + seg('batch', [[20, '20'], [30, '30'], [50, '50'], [100, '100']]) + '</div>' +
      '<div class="set"><label>Aksan</label>' + seg('accent', [['en-GB', 'İngiliz'], ['en-US', 'Amerikan']]) + '</div>' +
      '<div class="set"><label>Konuşma hızı</label>' + seg('rate', [[0.7, 'Yavaş'], [0.9, 'Normal'], [1, 'Hızlı']]) + '</div>' +
      '<div class="set"><label>İngilizce cevabı otomatik oku</label>' + seg('auto', [[true, 'Açık'], [false, 'Kapalı']]) + '</div>' +
      '<div class="set"><label>Nasıl çalışır?</label><p class="small muted" style="margin:0">Her kartı <b>Bilmedim / Zordu / Bildim</b> diye işaretlersin. Bildiğin kartlar giderek daha seyrek gelir: 1, 3, 7, 14, 30, 60 gün sonra. 14 günlük aralığa ulaşan kart “öğrenildi” sayılır. Bilmediğin kart aynı oturumda tekrar gelir ve ertesi gün yine sorulur.</p></div>' +
      '<div class="set"><label>Yedekle / geri yükle</label><p class="small muted" style="margin:0 0 10px">İlerlemen bu telefonda saklanır. Yedek almak için kopyala ve Notlar\'a yapıştır.</p>' +
      '<button class="btn ghost" data-act="export">Yedeği göster ve kopyala</button><button class="btn ghost" data-act="import">Yedeği geri yükle</button></div>' +
      '<div class="set" style="border:0"><button class="btn ghost" data-act="reset" style="color:var(--red)">İlerlemeyi sıfırla</button></div>' +
      '<p class="small muted" style="text-align:center">Kalıp Cebi · ' + ALL.length + ' kelime ve kalıp</p>';
  }

  // ---------- sheet ----------
  function openSheet(html) { var s = $('sheet'); s.innerHTML = '<div class="sheet">' + html + '</div>'; s.hidden = false; }
  function closeSheet() { var s = $('sheet'); s.hidden = true; s.innerHTML = ''; }

  // ---------- sessions ----------
  var SES = null;
  function openSession() { $('session').hidden = false; document.body.style.overflow = 'hidden'; }
  function closeSession() { SES = null; $('session').hidden = true; $('session').innerHTML = ''; document.body.style.overflow = ''; render(); }

  function startCards(items, title, unit) {
    if (!items.length) { toast('Çalışılacak kart yok'); return; }
    var q = items.map(function (it) {
      var dir = !isSeen(it) ? 'en' : S.set.dir === 'mix' ? (Math.random() < 0.5 ? 'en' : 'tr') : S.set.dir;
      return { it: it, dir: dir, lapsed: false };
    });
    SES = { mode: 'card', q: q, i: 0, total: items.length, done: 0, title: title, unit: unit, rev: false, again: 0 };
    if (unit) { S.lastUnit = unit.id; save(); }
    openSession(); drawCard(true);
  }
  function drawCard(first) {
    var s = SES, e = s.q[s.i];
    if (!e) return drawCardEnd();
    var it = e.it, pct = s.done / s.total * 100;
    var h = '<div class="sess"><div class="sess-top"><button class="x" data-act="close" aria-label="Kapat">×</button><div class="bar"><i class="k" style="width:' + pct + '%"></i></div><span class="cnt">' + s.done + '/' + s.total + '</span></div><div class="card">';
    h += '<div class="kind">' + kindLabel(it) + ' · ' + it.L.id + (isSeen(it) ? '' : ' · yeni') + '</div>';
    if (e.dir === 'en') {
      h += '<div class="big">' + esc(it.en) + '</div>' + (it.ex && !s.rev ? '<div class="ex">' + esc(it.ex) + '</div>' : '');
      h += '<button class="spk" data-act="speak" data-id="' + esc(it.id) + '" aria-label="Dinle">' + SPK + '</button>';
      if (s.rev) h += '<div class="ans"><div class="mean">' + esc(it.tr) + '</div>' + (it.ex ? '<div class="ex">' + esc(it.ex) + '</div>' : '') + '</div>';
    } else {
      h += '<div class="big tr">' + esc(it.tr) + '</div>';
      if (!s.rev) h += '<div class="say">İngilizcesini sesli söyle, sonra cevaba bak.</div>';
      else h += '<div class="ans"><div class="mean">' + esc(it.en) + '</div>' + (it.ex ? '<div class="ex">' + esc(it.ex) + '</div>' : '') +
        '<button class="spk" data-act="speak" data-id="' + esc(it.id) + '" aria-label="Dinle">' + SPK + '</button></div>';
    }
    h += '</div>';
    if (!s.rev) h += '<button class="btn" data-act="reveal">Cevabı göster</button>';
    else h += '<div class="grades"><button class="g-again" data-act="g" data-id="again">Bilmedim<small>tekrar gelsin</small></button><button class="g-hard" data-act="g" data-id="hard">Zordu<small>yakında sor</small></button><button class="g-good" data-act="g" data-id="good">Bildim<small>' + nextLabel(it) + '</small></button></div>';
    h += '</div>';
    $('session').innerHTML = h; $('session').scrollTop = 0;
    if (S.set.auto && ((e.dir === 'en' && !s.rev) || (e.dir === 'tr' && s.rev))) speak(it.en);
  }
  function nextLabel(it) { var s = st(it), b = Math.min(6, (s ? s.b : 0) + 1), d = INT[b]; return d === 1 ? 'yarın' : d + ' gün sonra'; }
  function drawCardEnd() {
    var s = SES;
    var h = '<div class="sess"><div class="end"><div class="score">' + s.total + '</div><h2>kart tamamlandı</h2>' +
      '<p class="muted">' + (s.again ? s.again + ' kez “Bilmedim” dedin. Bunlar yarın tekrar gelecek.' : 'Hepsini bildin, harika!') + '</p>' +
      '<p class="muted small">Bugün toplam ' + todayCount() + ' kart · ' + streakNow() + ' gün seri</p></div>';
    if (s.unit) h += '<button class="btn" data-act="quizunit" data-id="' + s.unit.id + '">Bu üniteyle quiz yap</button>';
    var nu = nextUnit();
    if (nu && (!s.unit || nu.id !== s.unit.id)) h += '<button class="btn alt" data-act="learn" data-id="' + nu.id + '">Sıradaki: ' + nu.L.id + ' · Ünite ' + nu.n + '</button>';
    h += '<button class="btn ghost" data-act="close">Kapat</button></div>';
    $('session').innerHTML = h;
  }
  function onGrade(g) {
    var s = SES, e = s.q[s.i];
    if (g === 'again') { e.lapsed = true; s.again++; s.q.push({ it: e.it, dir: e.dir === 'en' && isSeen(e.it) ? 'tr' : e.dir, lapsed: true }); }
    else { grade(e.it, g, e.lapsed); s.done++; }
    s.i++; s.rev = false; drawCard(false);
  }

  function startQuiz(items, title, unit) {
    if (items.length < 2) { toast('Quiz için yeterli kart yok'); return; }
    SES = { mode: 'quiz', q: shuffle(items), i: 0, score: 0, ans: null, wrong: [], title: title, unit: unit };
    openSession(); drawQuiz();
  }
  function distractors(it) {
    var pool = it.L.items.filter(function (x) { return x.t === it.t && x !== it && x.tr !== it.tr; });
    if (pool.length < 3) pool = ALL.filter(function (x) { return x.t === it.t && x !== it; });
    return shuffle(pool).slice(0, 3);
  }
  function drawQuiz() {
    var s = SES, it = s.q[s.i];
    if (!it) return drawQuizEnd();
    if (!s.cur || s.cur.it !== it) {
      s.cur = { it: it, dir: Math.random() < 0.5 ? 'en' : 'tr', opts: shuffle([it].concat(distractors(it))) };
    }
    var c = s.cur, pct = s.i / s.q.length * 100;
    var h = '<div class="sess"><div class="sess-top"><button class="x" data-act="close" aria-label="Kapat">×</button><div class="bar"><i class="k" style="width:' + pct + '%"></i></div><span class="cnt">' + (s.i + 1) + '/' + s.q.length + '</span></div>' +
      '<div class="card"><div class="kind">' + (c.dir === 'en' ? 'Türkçesi hangisi?' : 'İngilizcesi hangisi?') + '</div><div class="big' + (c.dir === 'tr' ? ' tr' : '') + '">' + esc(c.dir === 'en' ? it.en : it.tr) + '</div>' +
      (c.dir === 'en' ? '<button class="spk" data-act="speak" data-id="' + esc(it.id) + '" aria-label="Dinle">' + SPK + '</button>' : '') + '</div><div class="opts">';
    h += c.opts.map(function (o, i) {
      var cls = '';
      if (s.ans !== null) { if (o === it) cls = ' right'; else if (i === s.ans) cls = ' wrong'; }
      return '<button class="opt' + cls + '" data-act="opt" data-id="' + i + '"' + (s.ans !== null ? ' disabled' : '') + '>' + esc(c.dir === 'en' ? o.tr : o.en) + '</button>';
    }).join('') + '</div>';
    if (s.ans !== null) h += '<div style="margin-top:14px">' + (it.ex ? '<p class="muted small" style="text-align:center;margin:0 0 10px">' + esc(it.ex) + '</p>' : '') + '<button class="btn" data-act="qnext">Devam</button></div>';
    h += '</div>';
    $('session').innerHTML = h;
  }
  function onOpt(i) {
    var s = SES; if (s.ans !== null) return;
    s.ans = i; var it = s.cur.it, ok = s.cur.opts[i] === it;
    var r = S.items[it.id];
    if (ok) { s.score++; if (r) r.c++; }
    else { s.wrong.push(it); if (r) { r.w++; if (r.b > 0) r.d = today(); } }
    tick(); save(); drawQuiz();
    if (S.set.auto) speak(it.en);
  }
  function drawQuizEnd() {
    var s = SES, n = s.q.length;
    var msg = s.score === n ? 'Kusursuz!' : s.score / n >= 0.8 ? 'Çok iyi!' : s.score / n >= 0.5 ? 'Fena değil, biraz daha tekrar.' : 'Bu üniteyi kartlarla bir kez daha çalış.';
    var h = '<div class="sess"><div class="end"><div class="score">' + s.score + '/' + n + '</div><h2>' + msg + '</h2>';
    if (s.wrong.length) h += '<div style="text-align:left;margin-top:10px">' + s.wrong.map(rowHtml).join('') + '</div>';
    h += '</div>';
    if (s.wrong.length) h += '<button class="btn" data-act="redo">Yanlışları kartlarla çalış</button>';
    h += '<button class="btn ghost" data-act="close">Kapat</button></div>';
    $('session').innerHTML = h;
  }

  // ---------- actions ----------
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-act],[data-tab]');
    if (!el) { if (ev.target.id === 'sheet') closeSheet(); return; }
    if (el.hasAttribute('data-tab')) { closeSheet(); go(el.getAttribute('data-tab')); return; }
    var a = el.getAttribute('data-act'), id = el.getAttribute('data-id');
    switch (a) {
      case 'tab': go(id); break;
      case 'level': go('level', id); break;
      case 'unitsheet': {
        var u = unitById(id), c = counts(u.items);
        openSheet('<h3>' + u.L.id + ' · Ünite ' + u.n + '</h3><p class="muted">' + (c.k + c.l) + '/' + c.n + ' görüldü · ' + c.k + ' öğrenildi</p>' +
          '<button class="btn" data-act="learn" data-id="' + u.id + '">Kartlarla öğren</button><button class="btn alt" data-act="quizunit" data-id="' + u.id + '">Quiz</button>' +
          '<button class="btn ghost" data-act="unitlist" data-id="' + u.id + '">Listeyi gör</button><button class="btn ghost" data-act="closesheet">Vazgeç</button>');
        break;
      }
      case 'closesheet': closeSheet(); break;
      case 'unitlist': closeSheet(); go('unit', id); break;
      case 'learn': {
        closeSheet(); var un = unitById(id);
        var items = un.items.filter(function (it) { return !isSeen(it); });
        var rest = un.items.filter(function (it) { return isSeen(it); });
        if (!items.length) items = rest; else items = items.concat(rest.filter(function (it) { return st(it).d <= today(); }));
        if (SES) { SES = null; }
        startCards(items, un.L.id + ' · Ünite ' + un.n, un); break;
      }
      case 'review': startCards(dueItems().slice(0, S.set.batch), 'Tekrar', null); break;
      case 'quizunit': closeSheet(); SES = null; var uq = unitById(id); startQuiz(uq.items, 'Quiz', uq); break;
      case 'quizlevel': {
        var L = LEVELS.filter(function (x) { return x.id === id; })[0];
        var seen = L.items.filter(isSeen), pool = seen.length >= 20 ? seen : L.items;
        startQuiz(shuffle(pool).slice(0, 20), 'Seviye quizi', null); break;
      }
      case 'speak': if (BYID[id]) speak(BYID[id].en); break;
      case 'reveal': SES.rev = true; drawCard(false); break;
      case 'g': onGrade(id); break;
      case 'opt': onOpt(+id); break;
      case 'qnext': SES.i++; SES.ans = null; drawQuiz(); break;
      case 'redo': { var w = SES.wrong; SES = null; startCards(w, 'Yanlışlar', null); break; }
      case 'close': closeSession(); break;
      case 'dlvl': dictState.lvl = id; dictState.limit = 120; render(); break;
      case 'dtype': dictState.t = id; dictState.limit = 120; render(); break;
      case 'dmore': dictState.limit += 200; $('dres').innerHTML = dictResults(); break;
      case 'set': {
        var k = el.getAttribute('data-k'), v = id;
        if (k === 'goal' || k === 'batch' || k === 'rate') v = parseFloat(v);
        if (k === 'auto') v = v === 'true';
        S.set[k] = v; save(); render();
        if (k === 'accent' || k === 'rate') speak('Nice to meet you.');
        break;
      }
      case 'export': {
        var data = JSON.stringify(S);
        openSheet('<h3>Yedek</h3><p class="muted small">Bu metni kopyalayıp Notlar\'a kaydet.</p><textarea id="exp" readonly>' + esc(data) + '</textarea>' +
          '<button class="btn" data-act="copyexp" style="margin-top:12px">Kopyala</button><button class="btn ghost" data-act="closesheet">Kapat</button>');
        break;
      }
      case 'copyexp': {
        var ta = $('exp');
        var done = function () { toast('Kopyalandı'); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(done, function () { ta.select(); toast('Metni seçip kopyala'); });
        else { ta.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('Metni seçip kopyala'); } }
        break;
      }
      case 'import':
        openSheet('<h3>Yedeği geri yükle</h3><p class="muted small">Daha önce kopyaladığın yedeği buraya yapıştır. Şu anki ilerlemenin yerine geçer.</p><textarea id="imp" placeholder="Yedeği yapıştır"></textarea>' +
          '<button class="btn" data-act="doimport" style="margin-top:12px">Geri yükle</button><button class="btn ghost" data-act="closesheet">Vazgeç</button>');
        break;
      case 'doimport': {
        try {
          var o = JSON.parse($('imp').value);
          if (!o || typeof o.items !== 'object') throw new Error('bad');
          localStorage.setItem(KEY, JSON.stringify(o)); S = load(); closeSheet(); render(); toast('Yedek yüklendi');
        } catch (e) { toast('Bu metin geçerli bir yedek değil'); }
        break;
      }
      case 'reset':
        openSheet('<h3>İlerleme sıfırlansın mı?</h3><p class="muted">Bütün kartların, serin ve istatistiklerin silinir. Bu geri alınamaz.</p><button class="btn" data-act="doreset">Evet, sıfırla</button><button class="btn ghost" data-act="closesheet">Vazgeç</button>');
        break;
      case 'doreset': S.items = {}; S.streak = { n: 0, last: -9 }; S.daily = { day: -1, n: 0 }; S.lastUnit = null; save(); closeSheet(); render(); toast('Sıfırlandı'); break;
    }
  });

  render();

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();
