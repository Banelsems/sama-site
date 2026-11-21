/* Sama Sourcing — logique de la page « Marchés » (routes #/…, recherche,
   favoris, estimateur taxi). Aucun appel réseau. */
(function () {
'use strict';
var D = window.SAMA_MARKETS || {};
var CITIES = D.CITIES, CATS = D.CATS, MARKETS = D.MARKETS, TAXI = D.TAXI, ORIGINS = D.ORIGINS, T = D.T;
if (!CITIES) return;

const state = { lang:'fr', q:'', favs:[], allCity:'', allPin:false, cityCat:{} };
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

/* Le compteur, ligne par ligne : c'est ce qui rend l'estimation vérifiable
   (et ce qui évite la question « d'où sort ce chiffre ? » au retour). */
function fareParts(cid, km, night){
  const c = TAXI[cid];
  let kmCost = 0, longExtra = 0;
  if (km > c.baseKm) {
    kmCost = (km - c.baseKm) * c.perKm;
    c.long.forEach((tier, i) => {
      const next = c.long[i+1] ? c.long[i+1].from : Infinity;
      const start = Math.max(tier.from, c.baseKm);
      const end = Math.min(km, next);
      if (end > start) longExtra += (end - start) * c.perKm * tier.pct;
    });
  }
  const base = km > 0 ? c.base : 0;
  const sub = base + kmCost + longExtra;
  const nightExtra = night ? sub * c.night : 0;
  const total = sub + nightExtra;
  return { base, kmCost, longExtra, nightExtra, total,
           low: Math.round(total), high: Math.round(total * 1.18) };
}
function fareRange(cid, km, night){
  const f = fareParts(cid, km, night);
  return [f.low, f.high];
}

/* ---------- Ouvert ou fermé, maintenant ----------
   Les horaires sont ceux de la Chine (UTC+8), pas ceux du visiteur : la page
   se consulte depuis la Belgique ou depuis l'hôtel de Yiwu, l'heure doit rester
   la même. Un badge reste une indication, jamais une garantie. */
function cnMinutes(){
  const p = new Intl.DateTimeFormat('en-GB', { timeZone:'Asia/Shanghai', hour:'2-digit', minute:'2-digit', hour12:false })
    .formatToParts(new Date());
  const h = Number((p.find(x => x.type === 'hour') || {}).value || 0) % 24;
  const m = Number((p.find(x => x.type === 'minute') || {}).value || 0);
  return h * 60 + m;
}
function hoursSpan(m){
  const x = String(m.hours || '').match(/(\d{1,2})[:h](\d{2})\s*[–—-]\s*(\d{1,2})[:h](\d{2})/);
  if (!x) return null;
  return { from: (+x[1]) * 60 + (+x[2]), to: (+x[3]) * 60 + (+x[4]) };
}
function fmtHM(mins){
  return String(Math.floor(mins / 60)).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0');
}
function openState(m){
  const span = hoursSpan(m);
  if (!span) return null;
  const now = cnMinutes();
  const open = now >= span.from && now <= span.to;
  return { open, soon: open && (span.to - now) <= 60, to: span.to };
}
function openBadge(m){
  const st = openState(m);
  if (!st) return '';
  return '<span class="open-badge ' + (st.open ? 'is-open' : 'is-closed') + '" title="' + esc(t('hoursNote')) + '">' +
    '<i aria-hidden="true"></i>' + (st.open ? t('openNow') : t('closedNow')) +
    (st.soon ? ' · ' + t('closingSoon') : '') + '</span>';
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
function typeLabel(m){
  return { wholesale:t('wholesale'), mixed:t('mixed'), retail:t('retail') }[m.type] || '';
}

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
        openBadge(m) + (showCity ? '<span>' + esc(c.name) + '</span>' : '') +
        '<span class="tag-type">' + esc(typeLabel(m)) + '</span>' + pins + '</div>' +
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
function searchHits(qRaw){
  const q = folded(String(qRaw || '').trim());
  if (!q) return [];
  return MARKETS.filter(m => folded(searchHaystack(m)).indexOf(q) > -1);
}

function emptySearch(){
  return '<div class="empty">' + t('searchEmpty') + '</div>' +
    '<div class="chips">' + CITIES.map(c =>
      '<a class="chip" href="#/city/' + c.id + '">' + c.zh + ' · ' + esc(c.name) + '</a>').join('') + '</div>';
}

function viewHome(){
  const q = state.q.trim();
  const hits = q ? searchHits(q) : [];
  const body = q
    ? (hits.length ? '<div class="mkt-list">' + hits.map(m => mktCard(m, true)).join('') + '</div>' : emptySearch())
    : '<div class="city-grid">' + CITIES.map(cityCard).join('') + '</div>';
  const count = q ? (hits.length + ' ' + (hits.length > 1 ? t('resultsFor') : t('resultOne')) + ' « ' + esc(q) + ' »') : '';
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
        '<a class="btn btn-ghost" href="#/all">' + t('allLink') + '</a>' +
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
      '<p class="count-line" id="homeCount" role="status" aria-live="polite">' + count + '</p>' +
      (state.favs.length ? '<p class="count-line"><a class="more-link" href="#/fav">★ ' + t('favs') + ' (' + state.favs.length + ') →</a></p>' : '') +
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
  const openCount = list.filter(m => { const o = openState(m); return o && o.open; }).length;
  const active = state.cityCat[cid] || '';
  // Uniquement les produits réellement présents dans cette ville : pas de
  // filtre qui ne renvoie rien.
  const catIds = [];
  list.forEach(m => m.cats.forEach(k => { if (catIds.indexOf(k) === -1) catIds.push(k); }));
  const shown = active ? list.filter(m => m.cats.indexOf(active) > -1) : list;

  const chips = '<div class="chip-row" role="group" aria-label="' + esc(t('catsHere')) + '">' +
    '<button type="button" class="chip' + (active ? '' : ' is-on') + '" data-citycat="' + cid + '" data-cat="">' + esc(t('allCats')) + '</button>' +
    catIds.map(k => '<button type="button" class="chip' + (active === k ? ' is-on' : '') +
      '" data-citycat="' + cid + '" data-cat="' + k + '">' + esc(catName(k)) + '</button>').join('') +
    '</div>';

  return '<section class="page-hero"><div class="wrap">' +
      '<a class="crumb" href="#/" style="color:var(--mist-ink)">← ' + t('navCities') + '</a>' +
      '<p class="eyebrow">' + c.zh + '</p>' +
      '<h1>' + esc(c.name) + '</h1>' +
      '<p>' + esc(c.sp[state.lang]) + ' · ' + list.length + ' ' + (list.length > 1 ? t('markets') : t('market')) +
        (openCount ? ' · ' + openCount + ' ' + (openCount > 1 ? t('openPlural') : t('openNow').toLowerCase()) : '') + '</p>' +
      '<div class="hero-actions">' +
        '<a class="btn btn-light" href="#/taxi/' + cid + '">' + esc(t('taxiCta')) + '</a>' +
        '<a class="btn btn-ghost" href="#/all">' + esc(t('allLink')) + '</a>' +
      '</div>' +
    '</div></section>' +
    '<section class="section"><div class="wrap">' +
      chips +
      '<p class="count-line" role="status" aria-live="polite">' + shown.length + ' / ' + list.length + ' ' + t('markets') + '</p>' +
      (shown.length
        ? '<div class="mkt-list">' + shown.map(m => mktCard(m, false)).join('') + '</div>'
        : '<div class="empty">' + t('sortNothing') + '</div>') +
      '<p class="hours-note">' + t('hoursNote') + '</p>' +
    '</div></section>';
}

function viewAll(){
  const cid = state.allCity;
  const list = MARKETS.filter(m =>
    (!cid || m.c === cid) && (!state.allPin || (m.lat && m.lng)));

  const chips = '<div class="chips">' +
    '<button type="button" class="chip' + (cid ? '' : ' is-on') + '" data-allcity="">' + esc(t('fillAll')) + '</button>' +
    CITIES.map(c => '<button type="button" class="chip' + (cid === c.id ? ' is-on' : '') +
      '" data-allcity="' + c.id + '">' + c.zh + ' ' + esc(c.name) +
      ' <span class="num">' + countCity(c.id) + '</span></button>').join('') + '</div>';

  const body = cid
    ? (list.length
        ? '<div class="mkt-list">' + list.map(m => mktCard(m, false)).join('') + '</div>'
        : '<div class="empty">' + t('sortNothing') + '</div>')
    : CITIES.map(c => {
        const sub = list.filter(m => m.c === c.id);
        if (!sub.length) return '';
        return '<div class="city-block">' +
          '<h2 class="city-head">' + c.zh + ' · ' + esc(c.name) + ' <span>' + sub.length + '</span></h2>' +
          '<div class="mkt-list">' + sub.map(m => mktCard(m, false)).join('') + '</div></div>';
      }).join('') || '<div class="empty">' + t('sortNothing') + '</div>';

  return '<section class="page-hero"><div class="wrap">' +
      '<a class="crumb" href="#/" style="color:var(--mist-ink)">← ' + t('navCities') + '</a>' +
      '<h1>' + t('allTitle') + '</h1><p>' + t('allSub') + '</p>' +
      '<div class="hero-actions">' +
        '<a class="btn btn-ghost" href="#/taxi">' + esc(t('seeEstimator')) + '</a>' +
      '</div>' +
    '</div></section>' +
    '<section class="section"><div class="wrap">' +
      '<div class="filterbar">' + chips +
        '<label class="check-chip"><input type="checkbox" id="allPin"' + (state.allPin ? ' checked' : '') + '> ' +
          esc(t('pinOnly')) + '</label>' +
      '</div>' +
      '<p class="count-line" role="status" aria-live="polite">' + list.length + ' ' +
        (list.length > 1 ? t('markets') : t('market')) + '</p>' +
      body +
      '<p class="hours-note">' + t('hoursNote') + '</p>' +
      '<p class="hours-note">' + t('allNote') + '</p>' +
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
  const pin = m.lat ? '<span class="status status-received">' + t('pin') + '</span>'
                    : '<span class="status status-wait">' + t('noPin') + '</span>';
  const origins = (ORIGINS[m.c] || []).map(o => ({ o: o, r: fareRange(m.c, o.km, false) }));
  const same = MARKETS.filter(x => x.c === m.c && x.id !== m.id);
  const rel = same.filter(x => x.district === m.district)
    .concat(same.filter(x => x.district !== m.district)).slice(0, 3);

  return '<section class="section" style="padding-top:36px"><div class="wrap">' +
      '<a class="crumb" href="#/city/' + m.c + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 19l-7-7 7-7"/></svg>' + esc(c.name) + '</a>' +
      '<div class="mk-title"><p class="py">' + esc(m.py) + ' · ' + c.zh + '</p>' +
        '<h1>' + esc(m.zh) + '</h1>' +
        '<p class="sub" style="font-size:1.05em">' + esc(m.en) + '</p><div class="mk-status">' + pin + openBadge(m) + '</div></div>' +

      '<div class="addr-card">' +
        '<p class="lbl">' + t('address') + '</p>' +
        '<p class="zh-addr">' + esc(m.addr) + '</p>' +
        '<p class="sub-line">' + esc(m.district) + ' · ' + esc(m.metro) + '</p>' +
        '<div class="mk-actions">' +
          '<button class="btn btn-primary" type="button" data-copy-full="' + m.id + '">' + t('copyFull') + '</button>' +
          '<a class="btn btn-outline" href="' + amapUrl(m) + '" target="_blank" rel="noopener">' + t('openAmap') + '</a>' +
        '</div>' +
        '<button class="btn btn-outline btn-block btn-small" type="button" data-driver="' + m.id + '">' + t('driver') + '</button>' +
      '</div>' +

      '<dl class="kv">' +
        '<div class="kv-row"><dt>' + t('hours') + '</dt><dd>' + esc(m.hours) + ' ' + openBadge(m) + '</dd></div>' +
        '<div class="kv-row"><dt>' + t('type') + '</dt><dd>' + esc(typeLabel(m)) + '</dd></div>' +
        '<div class="kv-row"><dt>' + t('metro') + '</dt><dd>' + esc(m.metro) + '</dd></div>' +
        '<div class="kv-row"><dt>' + t('cats') + '</dt><dd>' + m.cats.map(x =>
          '<a class="kv-link" href="#/cat/' + x + '">' + esc(catName(x)) + '</a>').join(' · ') + '</dd></div>' +
      '</dl>' +
      '<p class="hours-note">' + t('hoursNote') + '</p>' +

      (m.note ? '<div class="note-box">' + esc(m.note[state.lang]) + '</div>' : '') +

      (origins.length ? '<div style="margin-top:26px">' +
        '<h3 style="margin-bottom:10px">' + t('taxiFrom') + '</h3>' +
        '<ul class="fare-list">' + origins.map(x =>
          '<li><span>' + esc(x.o[state.lang]) + '</span><em>' + x.o.km + ' km</em>' +
            '<b>≈ ' + x.r[0] + '–' + x.r[1] + ' ¥</b></li>').join('') + '</ul>' +
        '<p class="sub-line">' + t('taxiNote') + '</p>' +
        '<div style="margin-top:14px"><a class="btn btn-outline btn-small" href="#/taxi">' + t('seeEstimator') + '</a></div>' +
      '</div>' : '') +

      (rel.length ? '<div class="rel-block">' +
        '<h3>' + t('related') + '</h3>' +
        '<ul class="rel-list">' + rel.map(x =>
          '<li><a href="#/m/' + x.id + '"><span class="zh">' + esc(x.zh) + '</span>' +
            '<span class="en">' + esc(x.en) + ' · ' + esc(x.district) + '</span></a></li>').join('') +
        '</ul></div>' : '') +
    '</div></section>' +

    '<div class="sticky-bar">' +
      '<button class="btn btn-primary" type="button" data-copy-full="' + m.id + '">' + t('copyFull') + '</button>' +
      '<a class="btn btn-outline" href="' + amapUrl(m) + '" target="_blank" rel="noopener">' + t('openAmap') + '</a>' +
    '</div>';
}

function viewTaxi(cid){
  const sel = city(cid) ? cid : CITIES[0].id;
  return '<section class="page-hero"><div class="wrap">' +
      '<a class="crumb" href="#/" style="color:var(--mist-ink)">← ' + t('navCities') + '</a>' +
      '<h1>' + t('taxiTitle') + '</h1><p>' + t('taxiSub') + '</p>' +
    '</div></section>' +
    '<section class="section"><div class="wrap">' +
      '<div class="form-card" id="taxiForm">' +
        '<div class="form-row form-row-2">' +
          '<div class="field"><label class="label" for="txCity">' + t('cityLbl') + '</label>' +
            '<select class="select" id="txCity">' + CITIES.map(c => '<option value="' + c.id + '"' + (c.id === sel ? ' selected' : '') + '>' + esc(c.name) + ' · ' + c.zh + '</option>').join('') + '</select></div>' +
          '<div class="field"><label class="label" for="txFrom">' + t('from') + '</label>' +
            '<select class="select" id="txFrom"></select></div>' +
        '</div>' +
        '<div class="field"><label class="label" for="txKm">' + t('dist') + ' — <span id="txKmOut">20</span> km</label>' +
          '<input class="slider" id="txKm" type="range" min="1" max="60" value="20" step="1"></div>' +
        '<label class="chip" for="txNight" style="justify-self:start"><input type="checkbox" id="txNight" style="width:18px;height:18px;margin-right:2px"> ' + t('nightChk') + '</label>' +
        '<div class="fare-big"><span class="unit">' + t('fareLbl') + '</span><span class="num" id="txOut">—</span><span class="note">' + t('fareNote') + '</span></div>' +
        '<div class="fare-box">' +
          '<h3 class="fare-box-h">' + t('taxiBreakdown') + '</h3>' +
          '<div class="fare-lines" id="txLines"></div>' +
          '<p class="fare-per" id="txPer"></p>' +
        '</div>' +
        '<div class="fare-actions">' +
          '<button class="btn btn-outline btn-small" type="button" id="txCopy">' + t('copyFare') + '</button>' +
        '</div>' +
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
  if (p[0] === 'taxi') return { v:'taxi', city:p[1] };
  if (p[0] === 'about') return { v:'about' };
  if (p[0] === 'fav') return { v:'fav' };
  if (p[0] === 'all') return { v:'all' };
  return { v:'home' };
}

function currentView(){
  const r = routeInfo();
  if (r.v === 'city') return viewCity(r.id);
  if (r.v === 'market') return viewMarket(r.id);
  if (r.v === 'cat') return viewCat(r.id);
  if (r.v === 'taxi') return viewTaxi(r.city);
  if (r.v === 'about') return viewAbout();
  if (r.v === 'fav') return viewFav();
  if (r.v === 'all') return viewAll();
  return viewHome();
}

function renderNav(){
  const r = routeInfo();
  document.querySelectorAll('[data-nav]').forEach(a => {
    const on = (a.dataset.nav === 'home' && ['home','city','cat','market','fav','all'].indexOf(r.v) > -1) || (a.dataset.nav === 'taxi' && r.v === 'taxi') || (a.dataset.nav === 'about' && r.v === 'about');
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
  let last = null;
  function compute(){
    const c = citySel.value;
    const kmv = Number(km.value);
    kmOut.textContent = kmv;
    const p = fareParts(c, kmv, night.checked);
    out.textContent = '≈ ' + p.low + '–' + p.high + ' ¥';

    const line = (label, val, cls) => '<div class="fare-line' + (cls ? ' ' + cls : '') +
      '"><span>' + label + '</span><b>' + val + '</b></div>';
    let html = line(t('fareBase'), Math.round(p.base) + ' ¥');
    html += line(t('fareKm') + ' · ' + kmv + ' km', Math.round(p.kmCost) + ' ¥');
    if (p.longExtra > 0) html += line(t('fareLong'), '+' + Math.round(p.longExtra) + ' ¥');
    if (p.nightExtra > 0) html += line(t('fareNight') + ' (' + Math.round(TAXI[c].night * 100) + ' %)', '+' + Math.round(p.nightExtra) + ' ¥');
    html += line(t('fareTotal'), Math.round(p.total) + ' ¥', 'is-total');
    const lines = document.getElementById('txLines');
    if (lines) lines.innerHTML = html;

    const per = document.getElementById('txPer');
    if (per) per.textContent = t('perPerson') + ' : ≈ ' + Math.round(p.low / 3) + '–' +
      Math.round(p.high / 3) + ' ' + t('perPersonUnit');

    last = { c: c, kmv: kmv, night: night.checked, p: p, from: (ORIGINS[c][Number(fromSel.value)] || {}) };
  }
  const btnCopy = document.getElementById('txCopy');
  if (btnCopy) btnCopy.addEventListener('click', () => {
    if (!last) return;
    const cc = city(last.c);
    const txt = 'Taxi — Sama Sourcing\n' +
      cc.name + ' · ' + cc.zh + '\n' +
      (last.from.fr ? 'Départ : ' + (last.from[state.lang] || last.from.fr) + '\n' : '') +
      'Distance : ' + last.kmv + ' km' + (last.night ? ' · trajet de nuit' : '') + '\n' +
      'Estimation : ' + last.p.low + '–' + last.p.high + ' ¥\n' +
      'Compteur : prise en charge ' + Math.round(last.p.base) + ' ¥, km ' +
      Math.round(last.p.kmCost) + ' ¥' +
      (last.p.nightExtra ? ', nuit +' + Math.round(last.p.nightExtra) + ' ¥' : '') + '\n' +
      'Hors attente et hors suppléments.';
    copyText(txt, t('fareCopied'));
  });
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

  const copyFullBtn = e.target.closest('[data-copy-full]');
  if (copyFullBtn) {
    const m = MARKETS.find(x => x.id === copyFullBtn.dataset.copyFull);
    if (m) copyText(m.zh + '\n' + m.addr, t('copiedFull'));
    return;
  }

  const allCityBtn = e.target.closest('[data-allcity]');
  if (allCityBtn) {
    state.allCity = allCityBtn.dataset.allcity || '';
    rerender();
    return;
  }

  const cityCatBtn = e.target.closest('[data-citycat]');
  if (cityCatBtn) {
    state.cityCat[cityCatBtn.dataset.citycat] = cityCatBtn.dataset.cat || '';
    rerender();
    return;
  }

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

document.addEventListener('change', e => {
  if (e.target.id === 'allPin') { state.allPin = e.target.checked; rerender(); }
});

document.addEventListener('input', e => {
  if (e.target.id === 'q') {
    state.q = e.target.value;
    const body = document.getElementById('homeBody');
    if (!body) return;
    const q = state.q.trim();
    const count = document.getElementById('homeCount');
    if (!q) {
      body.innerHTML = '<div class="city-grid">' + CITIES.map(cityCard).join('') + '</div>';
      if (count) count.textContent = '';
      return;
    }
    // Recherche élargie : nom, pinyin, adresse, quartier + ville + catégories, sans accents.
    const hits = searchHits(q);
    body.innerHTML = hits.length ? '<div class="mkt-list">' + hits.map(m => mktCard(m, true)).join('') + '</div>'
                                 : emptySearch();
    if (count) count.textContent = hits.length + ' ' + (hits.length > 1 ? t('resultsFor') : t('resultOne')) + ' « ' + q + ' »';
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
