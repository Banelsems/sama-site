// Sama Sourcing — test « Score de préparation ».
// Tout se passe dans le navigateur : aucune réponse n'est envoyée sur un serveur.
// Le contenu (questions, paliers, textes) vient de assets/data/quiz.json.
(function () {
  'use strict';

  var root = document.getElementById('quiz');
  if (!root) return;

  var STORE = 'sama-quiz-v2';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var data = null;
  var steps = [];        // profil puis questions notées
  var state = { i: 0, answers: {}, lead: null, done: false };

  /* ---------- Outils ---------- */
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var icon = function (id) { return '<svg aria-hidden="true"><use href="#' + id + '"/></svg>'; };
  var save = function () { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* stockage indisponible : on continue sans */ } };
  var load = function () { try { return JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { return null; } };
  var clear = function () { try { localStorage.removeItem(STORE); } catch (e) { /* rien */ } };
  var focusTitle = function () {
    var h = root.querySelector('[data-focus]');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    var top = root.getBoundingClientRect().top + window.scrollY - 90;
    if (window.scrollY > top) window.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
  };
  var newLead = function () {
    var r = '';
    try { r = Array.prototype.map.call(crypto.getRandomValues(new Uint8Array(3)), function (b) { return (b % 36).toString(36); }).join(''); }
    catch (e) { r = Math.random().toString(36).slice(2, 5); }
    return (data.config.lead_prefix || 'Q') + Date.now().toString(36).slice(-4).toUpperCase() + r.toUpperCase();
  };

  /* ---------- Calcul du score (règles du cahier des charges) ---------- */
  // Un point par case cochée (option « ok »), rien pour « en partie » ou « non ».
  var compute = function () {
    var a = state.answers;
    var score = 0;
    var blocks = data.blocks.map(function (b) { return { id: b.id, title: b.title, got: 0, max: 0, miss: [] }; });
    var byId = {};
    blocks.forEach(function (b) { byId[b.id] = b; });
    var missing = [];
    data.questions.forEach(function (q) {
      var opt = q.options.filter(function (o) { return o.id === a[q.id]; })[0];
      var p = opt ? opt.p : 0;
      score += p;
      byId[q.block].max += 1;
      byId[q.block].got += p;
      if (!opt || opt.s !== 'ok') { var m = { q: q, s: opt ? opt.s : 'no' }; missing.push(m); byId[q.block].miss.push(m); }
    });
    // Manques classés par coût : cases critiques d'abord, puis « non » avant « en partie », puis ordre du livre.
    var rank = function (m) { return (m.q.critical ? 0 : 2) + (m.s === 'no' ? 0 : 1); };
    missing.sort(function (x, y) { return rank(x) - rank(y); });
    var total = data.questions.length;
    var tier = data.tiers.filter(function (t) { return score >= t.min && score <= t.max; })[0] || data.tiers[0];
    // Thème le plus faible (pour le diagnostic du palier 2)
    var weakest = blocks.slice().sort(function (x, y) { return (x.got / x.max) - (y.got / y.max); })[0];
    return { score: score, total: total, tier: tier, blocks: blocks, missing: missing, weakest: weakest };
  };

  var profileShort = function (pid, fallback) {
    var p = data.profile.filter(function (x) { return x.id === pid; })[0];
    var o = p && p.options.filter(function (x) { return x.id === state.answers[pid]; })[0];
    return o ? (o.short || o.label) : fallback;
  };

  // « a, b et c »
  var joinFr = function (list) {
    if (list.length < 2) return list.join('');
    return list.slice(0, -1).join(', ') + ' et ' + list[list.length - 1];
  };

  var waLink = function (r) {
    var manques = joinFr(r.missing.slice(0, 3).map(function (m) { return m.q.missing.replace(/\bton\b/g, 'mon').replace(/\bta\b/g, 'ma'); })) || 'rien de précis';
    var msg = r.tier.wa_message
      .replace('{score}', r.score).replace('{total}', r.total)
      .replace('{produit}', profileShort('P1', 'un produit'))
      .replace('{mode}', profileShort('P2', 'à distance'))
      .replace('{manques}', manques)
      .replace('{lead_id}', state.lead);
    var num = String(data.config.whatsapp_number || '').replace(/[^\d]/g, '');
    return 'https://wa.me/' + num + '?text=' + encodeURIComponent(msg);
  };

  /* ---------- Écrans ---------- */
  var renderIntro = function () {
    var c = data.copy.intro;
    var saved = load();
    var hasSaved = saved && saved.i > 0 && !saved.done;
    root.innerHTML =
      '<div class="quiz-card quiz-intro">' +
        '<ul class="quiz-bullets">' + c.bullets.map(function (b) { return '<li>' + icon('i-check') + esc(b) + '</li>'; }).join('') + '</ul>' +
        '<div class="quiz-actions">' +
          (hasSaved
            ? '<button class="btn btn-primary" type="button" data-act="resume">' + esc(c.resume) + '</button><button class="btn btn-outline" type="button" data-act="start">' + esc(c.restart) + '</button>'
            : '<button class="btn btn-primary" type="button" data-act="start" data-focus>' + esc(c.cta) + '</button>') +
        '</div>' +
        '<p class="quiz-note">' + esc(c.note) + '</p>' +
      '</div>';
  };

  var renderStep = function () {
    var step = steps[state.i];
    var n = state.i + 1;
    var isProfile = step.kind === 'profile';
    var q = step.item;
    var block = !isProfile && data.blocks.filter(function (b) { return b.id === q.block; })[0];
    var kicker = isProfile ? 'Ton profil' : esc(block.title);
    var chosen = state.answers[q.id];
    root.innerHTML =
      '<div class="quiz-card quiz-step">' +
        '<div class="quiz-top">' +
          (state.i > 0 ? '<button class="quiz-back" type="button" data-act="back">' + icon('i-back') + 'Précédent</button>' : '<span></span>') +
          '<span class="quiz-count" aria-hidden="true">' + n + ' / ' + steps.length + '</span>' +
        '</div>' +
        '<div class="quiz-progress" role="progressbar" aria-label="Progression" aria-valuemin="0" aria-valuemax="' + steps.length + '" aria-valuenow="' + state.i + '"><i style="transform:scaleX(' + (state.i / steps.length) + ')"></i></div>' +
        '<p class="quiz-kicker">' + kicker + '' + '</p>' +
        '<h2 class="quiz-q" data-focus>' + esc(q.text) + '</h2>' +
        '<p class="visually-hidden">Question ' + n + ' sur ' + steps.length + '</p>' +
        '<div class="quiz-options" role="group" aria-label="Réponses">' +
          q.options.map(function (o) {
            return '<button type="button" class="quiz-opt" data-opt="' + esc(o.id) + '" aria-pressed="' + (chosen === o.id) + '"><span class="quiz-dot" aria-hidden="true"></span><span>' + esc(o.label) + '</span></button>';
          }).join('') +
        '</div>' +
      '</div>';
    // la barre avance après le rendu, pour l'effet de progression
    requestAnimationFrame(function () {
      var bar = root.querySelector('.quiz-progress i');
      if (bar) bar.style.transform = 'scaleX(' + (n / steps.length) + ')';
    });
  };

  var renderCalc = function () {
    root.innerHTML = '<div class="quiz-card quiz-calc" role="status"><span class="quiz-spinner" aria-hidden="true"></span><p data-focus>' + esc(data.copy.calc) + '</p></div>';
  };

  var renderResult = function () {
    var r = compute();
    var c = data.copy.result;
    if (!state.lead) { state.lead = newLead(); save(); }
    var pct = Math.round((r.score / r.total) * 100);
    var mode = state.answers.P2 || 'undecided';
    var reading = (r.tier.reading && (r.tier.reading[mode] || r.tier.reading.undecided)) || '';

    // Ce qui manque, dit en une phrase (les 3 points qui coûtent le plus cher)
    var top = r.missing.slice(0, 3).map(function (m) { return m.q.missing; });
    var missSentence = r.missing.length
      ? esc(c.missing_lead) + ' : <b>' + esc(joinFr(top)) + '</b>.' + (r.missing.length > 3 ? ' ' + esc(c.missing_more) : '')
      : esc(c.allgood);

    // Score par thème, avec les points manquants de chaque thème (ouvrables pour voir quoi faire)
    var dims = r.blocks.filter(function (b) { return b.max; }).map(function (b) {
      var w = Math.round((b.got / b.max) * 100);
      var miss = b.miss.map(function (m) {
        return '<details><summary><span class="miss-tag miss-' + m.s + '">' + (m.s === 'part' ? 'En partie' : 'Pas encore') + '</span>' +
          '<b>' + esc(m.q.label) + '</b>' + icon('i-plus') + '</summary><p>' + esc(m.q.action) + '</p></details>';
      }).join('');
      return '<li><div class="dim-row"><span>' + (b.got === b.max ? icon('i-check') : '') + esc(b.title) + '</span><b>' + b.got + '/' + b.max + '</b></div>' +
        '<div class="dim-bar" aria-hidden="true"><i style="--w:' + w + '%"></i></div>' +
        (miss ? '<div class="missing-list">' + miss + '</div>' : '') + '</li>';
    }).join('');

    var shareUrl = 'https://wa.me/?text=' + encodeURIComponent(c.share_text + ' ' + location.href.split('#')[0].split('?')[0]);

    root.innerHTML =
      '<div class="quiz-result">' +
        '<div class="score-card">' +
          '<p class="score-label">' + esc(c.score_label) + '</p>' +
          '<p class="score-num"><b data-score="' + r.score + '">' + r.score + '</b><span>/' + r.total + '</span></p>' +
          '<div class="score-gauge" aria-hidden="true"><span class="z1"></span><span class="z2"></span><span class="z3"></span><i style="--x:' + pct + '%"></i></div>' +
          '<h2 class="score-head" data-focus>' + esc(r.tier.headline) + '</h2>' +
          '<p class="score-reading">' + esc(reading) + '</p>' +
          '<p class="score-sub">' + esc(r.tier.subline) + '</p>' +
        '</div>' +

        '<div class="quiz-card result-main">' +
          '<p class="result-diag">' + missSentence + '</p>' +
          '<div class="result-cta">' +
            '<a class="btn btn-wa" href="' + waLink(r) + '" target="_blank" rel="noopener">' + icon('i-chat') + esc(c.wa_cta) + '</a>' +
            '<p class="quiz-note">' + esc(c.wa_note) + '</p>' +
          '</div>' +
        '</div>' +

        '<div class="quiz-card"><h3>' + esc(c.dims_title) + '</h3>' + (r.missing.length ? '<p class="quiz-muted">' + esc(c.dims_intro) + '</p>' : '') + '<ul class="dims">' + dims + '</ul></div>' +

        '<div class="result-tools">' +
          '<a class="btn btn-outline btn-small" href="' + shareUrl + '" target="_blank" rel="noopener">' + esc(c.share_cta) + '</a>' +
          '<button class="btn btn-outline btn-small" type="button" data-act="print">' + esc(c.print_cta) + '</button>' +
          '<button class="btn btn-outline btn-small" type="button" data-act="restart">' + esc(c.restart) + '</button>' +
        '</div>' +
        '<p class="quiz-ref">Référence : ' + esc(state.lead) + '</p>' +
      '</div>';

    requestAnimationFrame(function () { root.classList.add('is-shown'); });
  };

  var show = function () {
    root.classList.remove('is-shown');
    if (state.done) renderResult();
    else renderStep();
    focusTitle();
  };

  /* ---------- Actions ---------- */
  var finish = function () {
    state.done = true;
    save();
    if (reduceMotion) { show(); return; }
    renderCalc();
    focusTitle();
    setTimeout(show, 1200);   // le court calcul donne du poids au score (cahier des charges §2.2)
  };

  root.addEventListener('click', function (e) {
    var opt = e.target.closest('.quiz-opt');
    if (opt && !root.dataset.busy) {
      var q = steps[state.i].item;
      state.answers[q.id] = opt.getAttribute('data-opt');
      save();
      root.querySelectorAll('.quiz-opt').forEach(function (b) { b.setAttribute('aria-pressed', b === opt ? 'true' : 'false'); });
      root.dataset.busy = '1';
      setTimeout(function () {
        delete root.dataset.busy;
        if (state.i < steps.length - 1) { state.i += 1; save(); show(); }
        else finish();
      }, reduceMotion ? 0 : 250);
      return;
    }
    var act = e.target.closest('[data-act]');
    if (!act) return;
    var a = act.getAttribute('data-act');
    if (a === 'start' || a === 'restart') { state = { i: 0, answers: {}, lead: null, done: false }; clear(); save(); show(); }
    if (a === 'resume') { state = load() || state; show(); }
    if (a === 'back' && state.i > 0) { state.i -= 1; save(); show(); }
    if (a === 'print') window.print();
  });

  // Le PDF (impression) affiche aussi le détail des manques
  window.addEventListener('beforeprint', function () { root.querySelectorAll('details').forEach(function (d) { d.open = true; }); });

  /* ---------- Démarrage ---------- */
  // Hors ligne : le contenu est déjà chargé par assets/data/quiz-data.js (fetch est bloqué en file://)
  (window.SAMA_QUIZ ? Promise.resolve(window.SAMA_QUIZ) : fetch('assets/data/quiz.json?v=3', { cache: 'no-cache' })
    .then(function (res) { if (!res.ok) throw new Error(res.status); return res.json(); }))
    .then(function (json) {
      data = json;
      steps = data.profile.map(function (p) { return { kind: 'profile', item: p }; })
        .concat(data.questions.map(function (q) { return { kind: 'question', item: q }; }));
      var saved = load();
      if (saved && saved.done) { state = saved; show(); }   // résultat déjà obtenu : on le réaffiche
      else renderIntro();
    })
    .catch(function () {
      root.innerHTML = '<div class="quiz-card"><p>Le test n\'a pas pu se charger. Vérifie ta connexion, puis recharge la page.</p></div>';
    });
})();
