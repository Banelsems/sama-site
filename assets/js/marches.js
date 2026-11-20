/* Sama Sourcing — logique de la page « Marchés » (routes #/…, recherche,
   favoris, estimateur taxi). Aucun appel réseau. */
(function () {
'use strict';
var D = window.SAMA_MARKETS || {};
var CITIES = D.CITIES, CATS = D.CATS, MARKETS = D.MARKETS, TAXI = D.TAXI, ORIGINS = D.ORIGINS, T = D.T;
if (!CITIES) return;

const state = { lang:'fr', q:'', favs:[] };
try { const s = localStorage.getItem('sama-lang'); if (s === 'fr' || s === 'en') state.lang = s; } catch(e){}
try { const f = JSON.parse(localStorage.getItem('sama-favs') || '[]'); if (Array.isArray(f)) state.favs = f; } catch(e){}
const t = k => (T[state.lang][k] || T.fr[k] || k);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const city = id => CITIES.find(c => c.id === id);
const catName = id => { const c = CATS.find(x => x.id === id); return c ? c[state.lang] : id; };
const marketsOf = cid => MARKETS.filter(m => m.c === cid);
const countCity = cid => marketsOf(cid).length;

function saveFavs(){ try { localStorage.setItem('sama-favs', JSON.stringify(state.favs)); } catch(e){} }
function isFav(id){ return state.favs.indexOf(id) > -1; }
function toggleFav(id){
  const i = state.favs.indexOf(id);
  if (i > -1) state.favs.splice(i,1); else state.favs.push(id);
  saveFavs(); rerender();
}

function amapUrl(m){
  if (m.lat && m.lng) {
    return 'https://uri.amap.com/marker?position=' + m.lng + ',' + m.lat +
      '&name=' + encodeURIComponent(m.zh) + '&callnative=1&coordinate=gaode&src=sama-markets';
  }
  const c = city(m.c);
  return 'https://uri.amap.com/search?keyword=' + encodeURIComponent(m.zh) +
    '&city=' + encodeURIComponent(c.zh) + '&callnative=1&src=sama-markets';
}

function fareRange(cid, km, night){
  const c = TAXI[cid];
  let f = km <= c.baseKm ? c.base : c.base + (km - c.baseKm) * c.perKm;
  if (km > c.baseKm) {
    let extra = 0;
    c.long.forEach((tier, i) => {
      const next = c.long[i+1] ? c.long[i+1].from : Infinity;
      const start = Math.max(tier.from, c.baseKm);
      const end = Math.min(km, next);
      if (end > start) extra += (end - start) * c.perKm * tier.pct;
    });
    f += extra;
  }
  if (night) f *= (1 + c.night);
  return [Math.round(f), Math.round(f * 1.18)];
}

let toastTimer = null;
function toast(msg){
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

function copyText(txt, okMsg){
  const done = () => toast(okMsg || t('copied'));
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(txt).then(done, () => fallbackCopy(txt, done));
  } else {
    fallbackCopy(txt, done);
  }
}
function fallbackCopy(txt, done){
  const ta = document.createElement('textarea');
  ta.value = txt; ta.setAttribute('readonly',''); ta.style.position = 'fixed'; ta.style.top = '-1000px';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); done(); } catch(e){ toast('Copie impossible : sélectionne le texte à la main'); }
  document.body.removeChild(ta);
}

/* =====================================================================
   4. Composants HTML
   ===================================================================== */
function mktCard(m, showCity){
  const c = city(m.c);
  const pins = m.lat ? '<span class="status status-received">' + t('pin') + '</span>'
                     : '<span class="status status-wait">' + t('noPin') + '</span>';
  const star = '<button class="fav ' + (isFav(m.id) ? 'on' : '') + '" type="button" data-fav="' + m.id +
    '" aria-label="' + (isFav(m.id) ? 'Retirer des favoris' : 'Ajouter aux favoris') + '" aria-pressed="' + isFav(m.id) + '">' +
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9z"/></svg></button>';
  return '<div class="mkt-wrap">' +
    '<a class="mkt" href="#/m/' + m.id + '">' +
      '<div class="top"><div><div class="zh">' + esc(m.zh) + '</div><div class="en">' + esc(m.en) + '</div></div></div>' +
      '<div class="addr">' + esc(m.addr) + '</div>' +
      '<div class="meta"><span>' + esc(m.metro) + '</span><span>' + esc(m.hours) + '</span>' +
        (showCity ? '<span>' + esc(c.name) + '</span>' : '') + pins + '</div>' +
    '</a>' + star + '</div>';
}

function cityCard(c){
  return '<a class="city-card" href="#/city/' + c.id + '">' +
    '<div class="zh">' + c.zh + '</div>' +
    '<div class="nm">' + esc(c.name) + '</div>' +
    '<div class="sp">' + esc(c.sp[state.lang]) + '</div>' +
    '<div class="ct">' + countCity(c.id) + ' ' + (countCity(c.id) > 1 ? t('markets') : t('market')) + ' →</div>' +
    '</a>';
}

function chipsCats(activeId, hrefBase){
  let out = '<div class="chips">';
  CATS.forEach(c => {
    out += '<a class="chip ' + (activeId === c.id ? 'is-on' : '') + '" href="' + hrefBase + c.id + '">' + esc(c[state.lang]) + '</a>';
  });
  out += '</div>';
  return out;
}

/* =====================================================================
   5. Vues
   ===================================================================== */
function viewHome(){
  const q = state.q.trim().toLowerCase();
  let body;
  if (q) {
    const hits = MARKETS.filter(m =>
      (m.zh + ' ' + m.py + ' ' + m.en + ' ' + m.addr + ' ' + m.district).toLowerCase().indexOf(q) > -1
    );
    body = hits.length
      ? '<div class="mkt-list">' + hits.map(m => mktCard(m, true)).join('') + '</div>'
      : '<div class="empty">' + t('searchEmpty') + '</div>';
  } else {
    body = '<div class="city-grid">' + CITIES.map(cityCard).join('') + '</div>';
  }
  const cats = q ? '' :
    '<section class="section section-sky"><div class="wrap">' +
      '<div class="section-head"><h2>' + t('sCats') + '</h2><p class="sub">' + t('sCatsSub') + '</p></div>' +
      chipsCats(null, '#/cat/') +
    '</div></section>';

  return '<section class="hero"><div class="wrap">' +
      '<p class="eyebrow">' + t('eyebrow') + '</p>' +
      '<h1>' + t('h1') + '</h1>' +
      '<p class="hero-sub">' + t('heroSub') + '</p>' +
      '<div class="hero-actions">' +
        '<button class="btn btn-yellow" type="button" data-scroll="cities">' + t('ctaCity') + '</button>' +
        '<a class="btn btn-ghost" href="#/taxi">' + t('ctaTaxi') + '</a>' +
      '</div>' +
      '<div class="hero-stats"><span><b>' + CITIES.length + '</b>' + t('statCities') + '</span>' +
        '<span><b>' + MARKETS.length + '</b>' + t('statMarkets') + '</span>' +
        '<span><b>' + CATS.length + '</b>' + t('statCats') + '</span></div>' +
    '</div></section>' +

    '<section class="section" id="cities"><div class="wrap">' +
      '<div class="section-head"><h2>' + t('sCities') + '</h2><p class="sub">' + t('sCitiesSub') + '</p></div>' +
      '<div class="field" style="margin-bottom:22px">' +
        '<label class="visually-hidden" for="q">' + t('searchPh') + '</label>' +
        '<input class="input" id="q" type="search" autocomplete="off" placeholder="' + t('searchPh') + '" value="' + esc(state.q) + '">' +
      '</div>' +
      '<div id="homeBody">' + body + '</div>' +
    '</div></section>' +

    cats +

    '<section class="section"><div class="wrap">' +
      '<div class="section-head"><h2>' + t('sHow') + '</h2><p class="sub">' + t('sHowSub') + '</p></div>' +
      '<div class="steps-grid">' +
        '<div class="step-card"><span class="step-num">1</span><h3>' + t('step1') + '</h3><p class="sub">' + t('step1d') + '</p></div>' +
        '<div class="step-card"><span class="step-num">2</span><h3>' + t('step2') + '</h3><p class="sub">' + t('step2d') + '</p></div>' +
        '<div class="step-card"><span class="step-num">3</span><h3>' + t('step3') + '</h3><p class="sub">' + t('step3d') + '</p></div>' +
      '</div>' +
    '</div></section>' +

    '<section class="section section-sky"><div class="wrap">' +
      '<div class="section-head"><h2>' + t('sTaxi') + '</h2><p class="sub">' + t('sTaxiSub') + '</p></div>' +
      '<div class="card" style="background:var(--paper)">' +
        '<table class="mini-table"><tbody>' +
          CITIES.map(c => '<tr><td>' + esc(c.name) + ' · ' + c.zh + '</td><td>' + TAXI[c.id].base + ' ¥ / ' + TAXI[c.id].baseKm + ' km</td></tr>').join('') +
        '</tbody></table>' +
        '<div style="margin-top:18px"><a class="btn btn-primary" href="#/taxi">' + t('seeEstimator') + '</a></div>' +
      '</div>' +
    '</div></section>';
}

function viewCity(cid){
  const c = city(cid);
  if (!c) return viewHome();
  const list = marketsOf(cid);
  return '<section class="page-hero"><div class="wrap">' +
      '<a class="crumb" href="#/" style="color:var(--mist-ink)">← ' + t('navCities') + '</a>' +
      '<p class="eyebrow">' + c.zh + '</p>' +
      '<h1>' + esc(c.name) + '</h1>' +
      '<p>' + esc(c.sp[state.lang]) + ' · ' + list.length + ' ' + (list.length > 1 ? t('markets') : t('market')) + '</p>' +
    '</div></section>' +
    '<section class="section"><div class="wrap">' +
      '<div class="mkt-list">' + list.map(m => mktCard(m, false)).join('') + '</div>' +
    '</div></section>';
}

function viewCat(cid){
  const c = CATS.find(x => x.id === cid);
  if (!c) return viewHome();
  const list = MARKETS.filter(m => m.cats.indexOf(cid) > -1);
  return '<section class="page-hero"><div class="wrap">' +
      '<a class="crumb" href="#/" style="color:var(--mist-ink)">← ' + t('navCities') + '</a>' +
      '<h1>' + esc(c[state.lang]) + '</h1>' +
      '<p>' + list.length + ' ' + (list.length > 1 ? t('markets') : t('market')) + '</p>' +
    '</div></section>' +
    '<section class="section"><div class="wrap"><div class="mkt-list">' + list.map(m => mktCard(m, true)).join('') + '</div></div></section>';
}

function viewFav(){
  const list = MARKETS.filter(m => isFav(m.id));
  return '<section class="page-hero"><div class="wrap">' +
      '<a class="crumb" href="#/" style="color:var(--mist-ink)">← ' + t('navCities') + '</a>' +
      '<h1>' + t('favs') + '</h1><p>' + list.length + ' ' + (list.length > 1 ? t('markets') : t('market')) + '</p>' +
    '</div></section>' +
    '<section class="section"><div class="wrap">' +
      (list.length ? '<div class="mkt-list">' + list.map(m => mktCard(m, true)).join('') + '</div>' : '<div class="empty">' + t('favEmpty') + '</div>') +
    '</div></section>';
}

function viewMarket(id){
  const m = MARKETS.find(x => x.id === id);
  if (!m) return viewHome();
  const c = city(m.c);
  const typeTxt = { wholesale:t('wholesale'), mixed:t('mixed'), retail:t('retail') }[m.type];
  const pin = m.lat ? '<span class="status status-received">' + t('pin') + '</span>'
                    : '<span class="status status-wait">' + t('noPin') + '</span>';
  const originList = ORIGINS[m.c] || [];
  const est = originList.length ? fareRange(m.c, originList[0].km, false) : null;

  return '<section class="section" style="padding-top:36px"><div class="wrap">' +
      '<a class="crumb" href="#/city/' + m.c + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 19l-7-7 7-7"/></svg>' + esc(c.name) + '</a>' +
      '<div class="mk-title"><p class="py">' + esc(m.py) + ' · ' + c.zh + '</p>' +
        '<h1>' + esc(m.zh) + '</h1>' +
        '<p class="sub" style="font-size:1.05em">' + esc(m.en) + '</p>' + pin + '</div>' +

      '<div class="addr-card">' +
        '<p class="lbl">' + t('address') + '</p>' +
        '<p class="zh-addr">' + esc(m.addr) + '</p>' +
        '<p class="sub-line">' + esc(m.district) + ' · ' + esc(m.metro) + '</p>' +
        '<div class="mk-actions">' +
          '<button class="btn btn-primary" type="button" data-copy="' + esc(m.addr) + '">' + t('copy') + '</button>' +
          '<a class="btn btn-outline" href="' + amapUrl(m) + '" target="_blank" rel="noopener">' + t('openAmap') + '</a>' +
        '</div>' +
        '<button class="btn btn-outline btn-block btn-small" type="button" data-driver="' + m.id + '">' + t('driver') + '</button>' +
      '</div>' +

      '<dl class="kv">' +
        '<div class="kv-row"><dt>' + t('hours') + '</dt><dd>' + esc(m.hours) + '</dd></div>' +
        '<div class="kv-row"><dt>' + t('type') + '</dt><dd>' + esc(typeTxt) + '</dd></div>' +
        '<div class="kv-row"><dt>' + t('metro') + '</dt><dd>' + esc(m.metro) + '</dd></div>' +
        '<div class="kv-row"><dt>' + t('cats') + '</dt><dd>' + m.cats.map(x => esc(catName(x))).join(' · ') + '</dd></div>' +
      '</dl>' +

      (m.note ? '<div class="note-box">' + esc(m.note[state.lang]) + '</div>' : '') +

      (est ? '<div style="margin-top:26px">' +
        '<h3 style="margin-bottom:10px">' + t('taxiFrom') + ' · ' + esc(originList[0][state.lang]) + '</h3>' +
        '<div class="fare-big"><span class="num">≈ ' + est[0] + '–' + est[1] + ' ¥</span>' +
          '<span class="unit">' + originList[0].km + ' km</span>' +
          '<span class="note">' + t('taxiNote') + '</span></div>' +
        '<div style="margin-top:14px"><a class="btn btn-outline btn-small" href="#/taxi">' + t('seeEstimator') + '</a></div>' +
      '</div>' : '') +
    '</div></section>' +

    '<div class="sticky-bar">' +
      '<button class="btn btn-primary" type="button" data-copy="' + esc(m.addr) + '">' + t('copy') + '</button>' +
      '<a class="btn btn-outline" href="' + amapUrl(m) + '" target="_blank" rel="noopener">' + t('openAmap') + '</a>' +
    '</div>';
}

function viewTaxi(){
  return '<section class="page-hero"><div class="wrap">' +
      '<a class="crumb" href="#/" style="color:var(--mist-ink)">← ' + t('navCities') + '</a>' +
      '<h1>' + t('taxiTitle') + '</h1><p>' + t('taxiSub') + '</p>' +
    '</div></section>' +
    '<section class="section"><div class="wrap">' +
      '<div class="form-card" id="taxiForm">' +
        '<div class="form-row form-row-2">' +
          '<div class="field"><label class="label" for="txCity">' + t('cityLbl') + '</label>' +
            '<select class="select" id="txCity">' + CITIES.map(c => '<option value="' + c.id + '">' + esc(c.name) + ' · ' + c.zh + '</option>').join('') + '</select></div>' +
          '<div class="field"><label class="label" for="txFrom">' + t('from') + '</label>' +
            '<select class="select" id="txFrom"></select></div>' +
        '</div>' +
        '<div class="field"><label class="label" for="txKm">' + t('dist') + ' — <span id="txKmOut">20</span> km</label>' +
          '<input class="slider" id="txKm" type="range" min="1" max="60" value="20" step="1"></div>' +
        '<label class="chip" for="txNight" style="justify-self:start"><input type="checkbox" id="txNight" style="width:18px;height:18px;margin-right:2px"> ' + t('nightChk') + '</label>' +
        '<div class="fare-big"><span class="unit">' + t('fareLbl') + '</span><span class="num" id="txOut">—</span><span class="note">' + t('fareNote') + '</span></div>' +
      '</div>' +
    '</div></section>' +
    '<section class="section section-sky"><div class="wrap">' +
      '<div class="section-head"><h2>' + t('rates') + '</h2></div>' +
      '<div class="table-wrap"><table class="table"><thead><tr>' +
        '<th>' + t('navCities') + '</th><th>' + t('rateBase') + '</th><th>' + t('rateKm') + '</th><th>' + t('rateNight') + '</th><th>' + t('rateLong') + '</th>' +
      '</tr></thead><tbody>' +
        CITIES.map(c => {
          const x = TAXI[c.id];
          const longTxt = x.long.map(l => (l.pct*100) + '% >' + l.from + ' km').join(', ');
          return '<tr><td><b>' + esc(c.name) + '</b></td><td>' + x.base + ' ¥ / ' + x.baseKm + ' km</td><td>' + x.perKm.toFixed(1).replace('.', state.lang === 'fr' ? ',' : '.') + ' ¥</td><td>' + (x.night*100) + '% ' + x.nightTxt + '</td><td>' + longTxt + '</td></tr>';
        }).join('') +
      '</tbody></table></div>' +
      '<p class="sub" style="margin-top:18px;font-size:.95rem">' + t('taxiNote') + '</p>' +
    '</div></section>';
}

function viewAbout(){
  return '<section class="page-hero"><div class="wrap">' +
      '<a class="crumb" href="#/" style="color:var(--mist-ink)">← ' + t('navCities') + '</a>' +
      '<h1>' + t('aboutTitle') + '</h1><p>' + t('aboutSub') + '</p>' +
    '</div></section>' +
    '<section class="section"><div class="wrap">' +
      '<div class="grid-2">' +
        '<div class="card"><b>' + t('noAccount') + '</b><p class="sub">' + t('offline') + '</p></div>' +
        '<div class="card"><b>' + t('dataNote') + '</b><p class="sub">' + t('taxiNote') + '</p></div>' +
      '</div>' +
    '</div></section>';
}

/* =====================================================================
   6. Routage et rendu
   ===================================================================== */
function routeInfo(){
  const raw = (location.hash || '').replace(/^#/, '');
  const p = raw.split('/').filter(Boolean);
  if (p[0] === 'city') return { v:'city', id:p[1] };
  if (p[0] === 'm') return { v:'market', id:p[1] };
  if (p[0] === 'cat') return { v:'cat', id:p[1] };
  if (p[0] === 'taxi') return { v:'taxi' };
  if (p[0] === 'about') return { v:'about' };
  if (p[0] === 'fav') return { v:'fav' };
  return { v:'home' };
}

function currentView(){
  const r = routeInfo();
  if (r.v === 'city') return viewCity(r.id);
  if (r.v === 'market') return viewMarket(r.id);
  if (r.v === 'cat') return viewCat(r.id);
  if (r.v === 'taxi') return viewTaxi();
  if (r.v === 'about') return viewAbout();
  if (r.v === 'fav') return viewFav();
  return viewHome();
}

function renderNav(){
  const r = routeInfo();
  document.querySelectorAll('[data-nav]').forEach(a => {
    const on = (a.dataset.nav === 'home' && r.v === 'home') || (a.dataset.nav === 'taxi' && r.v === 'taxi') || (a.dataset.nav === 'about' && r.v === 'about');
    if (on) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
  });
  document.documentElement.lang = state.lang;
  document.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === state.lang ? 'true' : 'false'));
}

function rerender(){
  document.getElementById('app').innerHTML = currentView();
  renderNav();
  if (routeInfo().v === 'taxi') initTaxi();
}

function initTaxi(){
  const form = document.getElementById('taxiForm');
  if (!form) return;
  const citySel = document.getElementById('txCity');
  const fromSel = document.getElementById('txFrom');
  const km = document.getElementById('txKm');
  const kmOut = document.getElementById('txKmOut');
  const night = document.getElementById('txNight');
  const out = document.getElementById('txOut');

  function fillOrigins(){
    const list = ORIGINS[citySel.value] || [];
    fromSel.innerHTML = list.map((o,i) => '<option value="' + i + '">' + esc(o[state.lang]) + '</option>').join('');
    if (list.length) { km.value = list[0].km; km.max = Math.max(60, list[0].km + 10); }
  }
  function compute(){
    const c = citySel.value;
    const kmv = Number(km.value);
    kmOut.textContent = kmv;
    const r = fareRange(c, kmv, night.checked);
    out.textContent = '≈ ' + r[0] + '–' + r[1] + ' ¥';
  }
  fillOrigins(); compute();

  citySel.addEventListener('change', () => { fillOrigins(); compute(); });
  fromSel.addEventListener('change', () => {
    const list = ORIGINS[citySel.value] || [];
    const o = list[Number(fromSel.value)];
    if (o) { km.value = o.km; compute(); }
  });
  km.addEventListener('input', compute);
  night.addEventListener('change', compute);
}

/* =====================================================================
   7. Événements
   ===================================================================== */
document.addEventListener('click', e => {
  const scrollBtn = e.target.closest('[data-scroll]');
  if (scrollBtn) {
    const el = document.getElementById(scrollBtn.dataset.scroll);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  const langBtn = e.target.closest('[data-lang]');
  if (langBtn) {
    state.lang = langBtn.dataset.lang;
    try { localStorage.setItem('sama-lang', state.lang); } catch(err){}
    rerender();
    return;
  }

  const favBtn = e.target.closest('[data-fav]');
  if (favBtn) { e.preventDefault(); e.stopPropagation(); toggleFav(favBtn.dataset.fav); return; }

  const copyBtn = e.target.closest('[data-copy]');
  if (copyBtn) { copyText(copyBtn.dataset.copy); return; }

  const drvBtn = e.target.closest('[data-driver]');
  if (drvBtn) { openDriver(drvBtn.dataset.driver); return; }

  if (e.target.closest('[data-close-driver]')) { closeDriver(); return; }
  if (e.target.id === 'driver') { closeDriver(); return; }
});

function folded(s){
  return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function searchHaystack(m){
  const city = CITIES.filter(c => c.id === m.c)[0];
  const cityWords = city ? (city.zh + ' ' + city.name + ' ' + (city.sp ? city.sp.fr : '')) : '';
  const catWords = (m.cats || []).map(function (k) {
    const cat = CATS.filter(c => c.id === k)[0];
    return cat ? (cat.fr + ' ' + cat.en) : '';
  }).join(' ');
  return m.zh + ' ' + m.py + ' ' + m.en + ' ' + m.addr + ' ' + m.district + ' ' + cityWords + ' ' + catWords;
}

document.addEventListener('input', e => {
  if (e.target.id === 'q') {
    state.q = e.target.value;
    const body = document.getElementById('homeBody');
    if (!body) return;
    const q = state.q.trim().toLowerCase();
    if (!q) { body.innerHTML = '<div class="city-grid">' + CITIES.map(cityCard).join('') + '</div>'; return; }
    // Recherche élargie : nom, pinyin, adresse, quartier + ville + catégories, sans accents.
    const hits = MARKETS.filter(m => folded(searchHaystack(m)).indexOf(folded(q)) > -1);
    body.innerHTML = hits.length ? '<div class="mkt-list">' + hits.map(m => mktCard(m, true)).join('') + '</div>'
                                 : '<div class="empty">' + t('searchEmpty') + '</div>';
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeDriver();
});

function openDriver(id){
  const m = MARKETS.find(x => x.id === id);
  if (!m) return;
  const el = document.getElementById('driver');
  document.getElementById('driverHint').textContent = t('driverHint');
  document.getElementById('driverName').textContent = m.zh;
  document.getElementById('driverAddr').textContent = m.addr;
  document.getElementById('driverSub').textContent = t('driverSub');
  el.hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeDriver(){
  const el = document.getElementById('driver');
  if (!el || el.hidden) return;
  el.hidden = true;
  document.body.style.overflow = '';
}

let lastHash = '';
function onRoute(){
  const h = location.hash;
  if (h === lastHash && document.getElementById('app').innerHTML) { renderNav(); return; }
  lastHash = h;
  window.scrollTo(0, 0);
  rerender();
}

window.addEventListener('hashchange', onRoute);
rerender();
})();
