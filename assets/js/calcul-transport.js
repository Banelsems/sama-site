/* ==========================================================================
   Sama Sourcing — Calcul de fret « Transport & CBM »
   --------------------------------------------------------------------------
   Deuxième calculatrice du menu Outils, à côté de « Vrai prix d'une pièce ».
   Elle ne remplace pas la première : elle calcule la ligne transport que la
   première suppose connue. Volume des colis, poids taxable, W/M, minimum
   facturé, comparaison LCL / 20' / 40', puis passage du résultat à la
   calculatrice du coût de revient (?fret=&annexes=&mode=).

   100 % côté client : aucune requête, aucun cookie, rien n'est envoyé.
   ========================================================================== */
(function () {
  'use strict';

  var form = document.getElementById('vt-form');
  if (!form) return;

  var CFG = window.SAMA_CONFIG || {};
  var TARIFS = (CFG.calc && CFG.calc.transportTarifs) || {};
  var STORE = 'sama-fret-v1';
  var MAX_ALERTS = 6;

  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Modes de transport ----------
     Un seul champ « tarif » change de libellé et d'unité selon le mode :
     c'est le prix que le transitaire t'a donné, pas une hypothèse de plus. */
  var MODES = {
    lcl: {
      kind: 'lcl', label: 'Maritime — groupage (LCL)',
      tarifLabel: 'Prix du m³', unit: '$/CBM', rate: TARIFS.lcl || 110, step: '1',
      note: 'Groupage : tu paies le volume occupé, souvent avec un minimum de 1 m³.'
    },
    fcl20: {
      kind: 'fcl', label: 'Maritime — conteneur 20 pieds',
      tarifLabel: 'Prix du conteneur 20\'', unit: '$/20\'', rate: TARIFS.fcl20 || 3800, step: '50',
      note: 'Un 20 pieds charge utile ≈ 28 m³ et 21 à 25 tonnes selon la marchandise.'
    },
    fcl40: {
      kind: 'fcl', label: 'Maritime — conteneur 40 pieds',
      tarifLabel: 'Prix du conteneur 40\'', unit: '$/40\'', rate: TARIFS.fcl40 || 5200, step: '50',
      note: 'Un 40 pieds charge utile ≈ 58 m³. Plus léger par m³, plus lourd à remplir.'
    },
    air: {
      kind: 'air', label: 'Aérien — au kilo taxable',
      tarifLabel: 'Prix du kilo', unit: '$/kg', rate: TARIFS.air || 7.5, step: '0.1',
      note: 'Aérien : le poids taxable est le plus élevé des deux — réel ou volumétrique.'
    },
    express: {
      kind: 'air', label: 'Express — porte à porte',
      tarifLabel: 'Prix du kilo', unit: '$/kg', rate: TARIFS.express || 11, step: '0.1',
      note: 'Express : plus cher au kilo, mais dédouané et livré sans transitaire local.'
    }
  };

  var DEFAULTS = {
    mode: 'lcl',
    tarif: 110,
    annexes: 180,
    conteneurs: 1,
    minimum: 1,
    divisor: 6000,
    wm: true,
    rows: [{ name: 'Carton textile', qty: 12, l: 60, w: 50, h: 40, kg: 18 }]
  };

  /* ---------- Formatage ---------- */
  var nf = function (dec) {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  };
  var money = function (v, dec) {
    if (!isFinite(v)) return '—';
    return nf(dec === undefined ? 2 : dec).format(v) + ' $';
  };
  var num = function (v, dec) {
    if (!isFinite(v)) return '—';
    return nf(dec === undefined ? 2 : dec).format(v);
  };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var toNum = function (el, fallback) {
    if (!el) return fallback || 0;
    var v = parseFloat(String(el.value).replace(',', '.'));
    return isFinite(v) ? v : (fallback || 0);
  };
  var clamp = function (v, min, max) {
    if (!isFinite(v)) return min;
    return Math.min(max, Math.max(min, v));
  };

  /* ---------- Lignes de colis ---------- */
  var rowsBox = $('vt-rows');
  var tpl = $('vt-tpl');

  var addRow = function (data, focus) {
    if (!rowsBox || !tpl) return;
    var node = tpl.content.firstElementChild.cloneNode(true);
    ['name', 'qty', 'l', 'w', 'h', 'kg'].forEach(function (k) {
      var input = node.querySelector('[data-k="' + k + '"]');
      if (!input) return;
      input.value = data && data[k] !== undefined && data[k] !== null ? data[k] : '';
    });
    rowsBox.appendChild(node);
    if (focus) {
      var first = node.querySelector('[data-k="name"]');
      if (first) first.focus();
    }
  };

  var readRows = function () {
    if (!rowsBox) return [];
    return Array.prototype.map.call(rowsBox.querySelectorAll('.vt-row'), function (row) {
      var get = function (k) {
        var el = row.querySelector('[data-k="' + k + '"]');
        return el ? el.value : '';
      };
      return {
        name: get('name').trim().slice(0, 40),
        qty: Math.max(0, Math.round(toNum(row.querySelector('[data-k="qty"]')) || 0)),
        l: Math.max(0, toNum(row.querySelector('[data-k="l"]'))),
        w: Math.max(0, toNum(row.querySelector('[data-k="w"]'))),
        h: Math.max(0, toNum(row.querySelector('[data-k="h"]'))),
        kg: Math.max(0, toNum(row.querySelector('[data-k="kg"]')))
      };
    });
  };

  var rowCbm = function (r) { return (r.l * r.w * r.h / 1000000) * r.qty; };
  var rowKg = function (r) { return r.kg * r.qty; };

  /* ---------- Calcul ----------
     CBM = L × l × H (cm) ÷ 1 000 000, par colis, multiplié par la quantité.
     Maritime : W/M — 1 m³ = 1 000 kg, on facture l'unité la plus élevée.
     Aérien : poids volumétrique = cm³ ÷ 6 000 (soit 1 m³ ≈ 167 kg). */
  var compute = function (s) {
    var cbm = 0, kg = 0, colis = 0, rows = [];
    s.rows.forEach(function (r) {
      var c = rowCbm(r), k = rowKg(r);
      cbm += c; kg += k; colis += r.qty;
      rows.push({ name: r.name, qty: r.qty, l: r.l, w: r.w, h: r.h, cbm: c, kg: k, dims: r.l + '×' + r.w + '×' + r.h });
    });

    var mode = MODES[s.mode] || MODES.lcl;
    var volKg = cbm * 1000000 / (s.divisor || 6000);
    var chargeableKg = Math.max(kg, volKg);
    var tonnes = kg / 1000;

    var units = 0, unitLabel = 'CBM', freight = 0, minimumApplied = false;
    if (mode.kind === 'lcl') {
      units = s.wm ? Math.max(cbm, tonnes) : cbm;
      if (units < s.minimum) { units = s.minimum; minimumApplied = true; }
      freight = units * s.tarif;
      unitLabel = s.wm && tonnes > cbm ? 'tonnes' : 'CBM';
    } else if (mode.kind === 'fcl') {
      units = Math.max(1, Math.round(s.conteneurs));
      freight = units * s.tarif;
      unitLabel = units > 1 ? 'conteneurs' : 'conteneur';
    } else {
      units = chargeableKg;
      if (units > 0 && units < 45) { units = 45; minimumApplied = true; }
      freight = units * s.tarif;
      unitLabel = 'kg';
    }

    var total = freight + s.annexes;
    var perKg = kg > 0 ? total / kg : NaN;
    var perCbm = cbm > 0 ? total / cbm : NaN;
    var perColis = colis > 0 ? total / colis : NaN;

    /* Comparaison des trois options maritimes, mêmes colis, mêmes annexes. */
    var lclRate = s.mode === 'lcl' ? s.tarif : (TARIFS.lcl || 110);
    var lclUnits = s.wm ? Math.max(cbm, tonnes) : cbm;
    lclUnits = Math.max(lclUnits, s.minimum);
    var compare = [
      { key: 'lcl', label: 'Groupage LCL', cost: cbm > 0 ? lclUnits * lclRate + s.annexes : NaN, note: num(lclUnits, 2) + ' CBM × ' + money(lclRate, 0) },
      { key: 'fcl20', label: 'Conteneur 20 pieds', cost: cbm > 0 ? (TARIFS.fcl20 || 3800) + s.annexes : NaN, note: money(TARIFS.fcl20 || 3800, 0) + ' + annexes' },
      { key: 'fcl40', label: 'Conteneur 40 pieds', cost: cbm > 0 ? (TARIFS.fcl40 || 5200) + s.annexes : NaN, note: money(TARIFS.fcl40 || 5200, 0) + ' + annexes' }
    ];
    var cheapest = null;
    compare.forEach(function (c) {
      if (isFinite(c.cost) && (!cheapest || c.cost < cheapest.cost)) cheapest = c;
    });

    return {
      mode: s.mode, kind: mode.kind, cbm: cbm, kg: kg, tonnes: tonnes, colis: colis,
      volKg: volKg, chargeableKg: chargeableKg, units: units, unitLabel: unitLabel,
      freight: freight, annexes: s.annexes, total: total,
      perKg: perKg, perCbm: perCbm, perColis: perColis,
      minimumApplied: minimumApplied, compare: compare, cheapest: cheapest, rows: rows
    };
  };

  /* ---------- Alertes ---------- */
  var buildAlerts = function (s, r) {
    var a = [];
    var push = function (level, text) { a.push({ level: level, text: text }); };

    if (!(r.cbm > 0) && !(r.kg > 0)) {
      push('warn', 'Ajoute les dimensions d\'au moins un colis : sans volume ni poids, il n\'y a rien à facturer.');
      return a;
    }
    if (r.cbm > 0 && r.kg === 0) {
      push('info', 'Tu as le volume mais pas le poids. Le transitaire te demandera le poids brut : c\'est lui qui décide du W/M.');
    }
    if (r.kind === 'lcl' && s.wm && r.tonnes > r.cbm) {
      push('warn', 'Cargaison dense : ' + num(r.tonnes, 2) + ' t pour ' + num(r.cbm, 2) + ' m³. Avec la règle W/M (1 m³ = 1 t), tu paies au poids et non au volume — ' + num(r.units, 2) + ' unités au lieu de ' + num(r.cbm, 2) + '.');
    }
    if (r.kind === 'lcl' && r.cbm >= 13 && r.cheapest && r.cheapest.key !== 'lcl' && isFinite(r.cheapest.cost)) {
      push('info', 'À ' + num(r.cbm, 2) + ' m³, le groupage coûte ' + money(r.total, 0) + ' alors qu\'un ' + r.cheapest.label.toLowerCase() + ' revient à ' + money(r.cheapest.cost, 0) + '. Demande les deux prix avant de réserver.');
    }
    if (r.kind === 'fcl' && r.cbm > 0 && r.cbm < 12) {
      push('info', 'Tu réserves un conteneur pour ' + num(r.cbm, 2) + ' m³ : tu paies du vide. À ce volume, le groupage est souvent ' + money(r.compare[0].cost, 0) + '.');
    }
    if (r.kind === 'air' && r.volKg > r.kg && r.volKg > 0) {
      push('info', 'Poids volumétrique (' + num(r.volKg, 1) + ' kg) supérieur au poids réel (' + num(r.kg, 1) + ' kg) : tu paies le volume, pas la balance. Allège les cartons ou réduis leurs dimensions.');
    }
    if (r.minimumApplied) {
      push('info', 'Minimum facturé appliqué : le transitaire facture ' + num(r.units, 2) + ' ' + (r.kind === 'air' ? 'kg' : 'CBM') + ' même si tu en occupes moins.');
    }
    s.rows.forEach(function (row) {
      if (row.qty > 0 && Math.max(row.l, row.w, row.h) > 120) {
        push('info', '« ' + (row.name || 'Colis sans nom') + ' » dépasse 120 cm de côté : surcharge hors gabarit probable, et souvent refus en express.');
      }
    });
    var heavy = s.rows.filter(function (row) { return row.qty > 0 && row.kg > 25; });
    if (heavy.length) {
      push('info', heavy.length + ' ligne(s) à plus de 25 kg par colis : manutention à prévoir, et parfois une surprime au port.');
    }
    if (r.total > 0 && r.cheapest && isFinite(r.cheapest.cost)) {
      push('ok', 'Option la moins chère sur ces chiffres : ' + r.cheapest.label + ' à ' + money(r.cheapest.cost, 0) + ' (annexes comprises).');
    }
    var order = { warn: 0, info: 1, ok: 2 };
    a.sort(function (x, y) { return order[x.level] - order[y.level]; });
    return a.slice(0, MAX_ALERTS);
  };

  /* ---------- Rendu ---------- */
  var render = function (s, r) {
    var mode = MODES[s.mode] || MODES.lcl;

    // Libellés qui suivent le mode.
    var setText = function (id, txt) { var el = $(id); if (el) el.textContent = txt; };
    setText('vt-mode-note', mode.note);
    setText('t-tarif-label', mode.tarifLabel);
    var unit = $('unit-tarif');
    if (unit) unit.textContent = mode.unit;
    var tarif = $('vt-tarif');
    if (tarif) tarif.step = mode.step;

    // Groupes visibles selon le mode.
    var fcl = $('vt-field-conteneurs');
    if (fcl) fcl.hidden = mode.kind !== 'fcl';
    var minField = $('vt-field-minimum');
    if (minField) minField.hidden = !(mode.kind === 'lcl' || mode.kind === 'air');
    var divField = $('vt-field-diviseur');
    if (divField) divField.hidden = mode.kind !== 'air';
    var wmField = $('vt-field-wm');
    if (wmField) wmField.hidden = mode.kind !== 'lcl';

    setText('vt-cbm', num(r.cbm, 3) + ' m³');
    setText('vt-kg', num(r.kg, 1) + ' kg');
    setText('vt-vol-kg', mode.kind === 'air' ? num(r.volKg, 1) + ' kg' : num(r.kg / 1000, 3) + ' t');
    setText('vt-vol-kg-label', mode.kind === 'air' ? 'Poids volumétrique (' + num(1000000 / (s.divisor || 6000), 0) + ' kg par m³)' : 'Poids en tonnes (W/M)');
    setText('vt-units', num(r.units, mode.kind === 'air' ? 1 : 2) + ' ' + r.unitLabel);
    setText('vt-freight', money(r.freight));
    setText('vt-annexes-out', money(r.annexes));
    setText('vt-total', money(r.total));
    setText('vt-perkg', isFinite(r.perKg) ? money(r.perKg, 2) + ' / kg' : '—');
    setText('vt-percbm', isFinite(r.perCbm) ? money(r.perCbm, 0) + ' / m³' : '—');
    setText('vt-percolis', isFinite(r.perColis) ? money(r.perColis, 2) + ' / colis' : '—');
    setText('vt-count', r.colis + (r.colis > 1 ? ' colis' : ' colis'));

    var live = $('vt-live');
    if (live) live.textContent = money(r.total);

    // Comparaison LCL / 20' / 40'.
    var cmp = $('vt-compare');
    if (cmp) {
      cmp.innerHTML = r.compare.map(function (c) {
        var best = r.cheapest && r.cheapest.key === c.key && r.cbm > 0;
        return '<li class="vt-cmp-row' + (best ? ' is-best' : '') + '">' +
          '<span class="vt-cmp-name">' + esc(c.label) + (best ? ' <b>le moins cher</b>' : '') + '</span>' +
          '<span class="vt-cmp-cost">' + (isFinite(c.cost) ? money(c.cost, 0) : '—') + '</span>' +
          '<span class="vt-cmp-note">' + esc(c.note) + '</span></li>';
      }).join('');
    }

    // Alertes.
    var alerts = $('vt-alerts');
    if (alerts) {
      alerts.innerHTML = buildAlerts(s, r).map(function (x) {
        return '<li class="vt-alert vt-alert-' + x.level + '">' + esc(x.text) + '</li>';
      }).join('');
    }

    // Métadonnées par ligne (m³ et kg réels).
    var rows = rowsBox ? rowsBox.querySelectorAll('.vt-row') : [];
    Array.prototype.forEach.call(rows, function (row, i) {
      var meta = row.querySelector('[data-meta]');
      var d = r.rows[i];
      if (!meta || !d) return;
      var empty = !(d.cbm > 0) && !(d.kg > 0);
      meta.textContent = empty ? 'À renseigner' : num(d.cbm, 3) + ' m³ · ' + num(d.kg, 1) + ' kg';
      meta.classList.toggle('is-empty', empty);
    });

    // Boutons.
    var wa = $('vt-wa');
    if (wa) {
      var text = 'Bonjour Sama Sourcing, j\'ai un calcul de fret à vérifier : ' +
        (r.mode === 'lcl' ? 'groupage' : r.mode === 'air' ? 'aérien' : r.mode === 'express' ? 'express' : 'conteneur') +
        ', ' + num(r.cbm, 2) + ' m³, ' + num(r.kg, 1) + ' kg, ' + money(r.total, 0) + ' estimés.';
      var digits = (window.SAMA && window.SAMA.digits) || '8619824786223';
      wa.setAttribute('href', 'https://wa.me/' + digits + '?text=' + encodeURIComponent(text));
      wa.setAttribute('data-wa-text', text);
    }
    var waLabel = $('vt-wa-label');
    if (waLabel) {
      waLabel.textContent = r.total > 0 ? 'Vérifier ce fret sur WhatsApp' : 'Demander un prix de fret';
    }
    var toCalc = $('vt-to-calc');
    if (toCalc) {
      var ok = isFinite(r.total) && r.total > 0;
      toCalc.href = 'calculatrice.html?fret=' + (isFinite(r.freight) ? r.freight.toFixed(2) : '0') +
        '&annexes=' + (isFinite(r.annexes) ? r.annexes.toFixed(2) : '0') + '&mode=' + s.mode + '&src=fret';
      toCalc.setAttribute('aria-disabled', ok ? 'false' : 'true');
      toCalc.classList.toggle('is-disabled', !ok);
    }

    // Bloc d'impression.
    var print = $('vt-print-body');
    if (print) {
      print.innerHTML =
        '<table class="calc-print-table"><thead><tr><th>Colis</th><th>Qté</th><th>Dimensions cm</th><th>CBM</th><th>kg</th></tr></thead><tbody>' +
        r.rows.map(function (d) {
          return '<tr><td>' + esc(d.name || '—') + '</td><td>' + d.qty + '</td><td>' + esc(d.dims) + '</td><td>' + num(d.cbm, 3) + '</td><td>' + num(d.kg, 1) + '</td></tr>';
        }).join('') +
        '<tr class="calc-print-strong"><td>Total</td><td>' + r.colis + '</td><td>—</td><td>' + num(r.cbm, 3) + '</td><td>' + num(r.kg, 1) + '</td></tr>' +
        '</tbody></table>';
      var printTotals = $('vt-print-totals');
      if (printTotals) {
        printTotals.innerHTML =
          '<p>Mode : <b>' + esc(mode.label) + '</b></p>' +
          '<p>Unités facturées : <b>' + num(r.units, 2) + ' ' + esc(r.unitLabel) + '</b></p>' +
          '<p>Fret : <b>' + money(r.freight) + '</b> · Annexes : <b>' + money(r.annexes) + '</b></p>' +
          '<p>Total transport : <b>' + money(r.total) + '</b></p>';
      }
    }
  };

  /* ---------- Lecture / écriture ---------- */
  var readState = function () {
    var modeKey = ($('vt-mode') && $('vt-mode').value) || DEFAULTS.mode;
    var tarif = toNum($('vt-tarif'), MODES[modeKey] ? MODES[modeKey].rate : 110);
    return {
      mode: MODES[modeKey] ? modeKey : 'lcl',
      tarif: Math.max(0, tarif),
      annexes: Math.max(0, toNum($('vt-annexes'), 0)),
      conteneurs: Math.max(1, Math.round(toNum($('vt-conteneurs'), 1) || 1)),
      minimum: Math.max(0, toNum($('vt-minimum'), 1)),
      divisor: ($('vt-diviseur') && parseInt($('vt-diviseur').value, 10)) || 6000,
      wm: !!($('vt-wm') && $('vt-wm').checked),
      rows: readRows()
    };
  };

  var save = function (s) {
    try {
      localStorage.setItem(STORE, JSON.stringify({ v: 1, state: s }));
    } catch (e) { /* quota plein ou navigation privée : on continue sans mémoire */ }
  };

  var update = function (announce) {
    var s = readState();
    var r = compute(s);
    render(s, r);
    save(s);
    if (announce) {
      var live = $('vt-live-text');
      if (live) live.textContent = 'Transport estimé : ' + money(r.total) + '.';
    }
  };

  /* ---------- Abonnements ---------- */
  form.addEventListener('input', function () { update(false); });
  form.addEventListener('change', function () { update(false); });
  form.addEventListener('submit', function (e) { e.preventDefault(); update(true); });

  // Changement de mode : le tarif suit le mode (prix pré-rempli, modifiable).
  var modeSel = $('vt-mode');
  if (modeSel) {
    modeSel.addEventListener('change', function () {
      var m = MODES[modeSel.value] || MODES.lcl;
      var tarif = $('vt-tarif');
      if (tarif) tarif.value = m.rate;
      setStatus('Tarif pré-rempli pour « ' + m.label + ' ». Remplace-le par le prix de ton transitaire.');
      update(false);
    });
  }

  var addBtn = $('vt-add');
  if (addBtn) {
    addBtn.addEventListener('click', function () {
      if (rowsBox.querySelectorAll('.vt-row').length >= 12) {
        setStatus('Douze lignes suffisent : au-delà, regroupe les colis identiques.');
        return;
      }
      addRow({ name: '', qty: 1, l: 0, w: 0, h: 0, kg: 0 }, true);
      update(false);
    });
  }

  if (rowsBox) {
    rowsBox.addEventListener('click', function (e) {
      var del = e.target.closest('.vt-del');
      if (!del) return;
      var row = del.closest('.vt-row');
      var count = rowsBox.querySelectorAll('.vt-row').length;
      if (count <= 1) {
        // Une seule ligne : on la vide au lieu de la supprimer.
        ['name', 'qty', 'l', 'w', 'h', 'kg'].forEach(function (k) {
          var el = row.querySelector('[data-k="' + k + '"]');
          if (el) el.value = '';
        });
      } else {
        row.remove();
      }
      update(true);
    });
  }

  /* ---------- Boutons ---------- */
  var statusTimer = null;
  var setStatus = function (txt) {
    var el = $('vt-status');
    if (!el) return;
    el.textContent = txt;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(function () { el.textContent = ''; }, 7000);
  };

  var copyText = function () {
    var s = readState(), r = compute(s), mode = MODES[s.mode] || MODES.lcl;
    return 'Calcul de fret — Sama Sourcing\n' +
      'Mode : ' + mode.label + '\n' +
      'Colis : ' + r.colis + ' · Volume : ' + num(r.cbm, 3) + ' m³ · Poids réel : ' + num(r.kg, 1) + ' kg\n' +
      'Unités facturées : ' + num(r.units, 2) + ' ' + r.unitLabel + '\n' +
      'Fret : ' + money(r.freight) + ' · Annexes : ' + money(r.annexes) + ' · Total : ' + money(r.total) + '\n' +
      'Coût au kg : ' + (isFinite(r.perKg) ? money(r.perKg) : '—') + ' · au m³ : ' + (isFinite(r.perCbm) ? money(r.perCbm, 0) : '—') + '\n' +
      'Comparaison : ' + r.compare.map(function (c) { return c.label + (isFinite(c.cost) ? ' ' + money(c.cost, 0) : ' —'); }).join(' · ') + '\n' +
      'Estimation, pas un devis. Calculé dans le navigateur, rien n\'est envoyé.';
  };

  var btnCopy = $('vt-copy');
  if (btnCopy) {
    btnCopy.addEventListener('click', function () {
      var text = copyText();
      var done = function () { setStatus('Résumé copié. Tu peux le coller dans WhatsApp ou dans un e-mail.'); };
      var fallback = function () {
        try {
          var area = document.createElement('textarea');
          area.value = text;
          area.setAttribute('readonly', '');
          area.style.position = 'fixed';
          area.style.opacity = '0';
          document.body.appendChild(area);
          area.select();
          document.execCommand('copy');
          document.body.removeChild(area);
          done();
        } catch (e) {
          setStatus('Copie impossible ici. Utilise « Imprimer / PDF ».');
        }
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(fallback);
      } else fallback();
    });
  }

  var btnPrint = $('vt-print-btn');
  if (btnPrint) btnPrint.addEventListener('click', function () { window.print(); });

  var btnReset = $('vt-reset');
  if (btnReset) {
    btnReset.addEventListener('click', function () {
      rowsBox.innerHTML = '';
      addRow({ name: '', qty: 1, l: 0, w: 0, h: 0, kg: 0 });
      if (modeSel) modeSel.value = DEFAULTS.mode;
      var tarif = $('vt-tarif'); if (tarif) tarif.value = '';
      ['vt-annexes', 'vt-conteneurs'].forEach(function (id) { var el = $(id); if (el) el.value = ''; });
      var minEl = $('vt-minimum'); if (minEl) minEl.value = '';
      var divEl = $('vt-diviseur'); if (divEl) divEl.value = '6000';
      var wm = $('vt-wm'); if (wm) wm.checked = true;
      update(true);
      setStatus('Formulaire vidé. À toi de saisir tes cartons.');
    });
  }

  var btnDemo = $('vt-demo');
  if (btnDemo) {
    btnDemo.addEventListener('click', function () {
      applyState(DEFAULTS);
      update(true);
      setStatus('Exemple chargé : 12 cartons de 60 × 50 × 40 cm, 18 kg, groupage à 110 $/m³.');
    });
  }

  /* ---------- État ---------- */
  var applyState = function (state) {
    if (!state) return;
    var modeVal = MODES[state.mode] ? state.mode : DEFAULTS.mode;
    if (modeSel) modeSel.value = modeVal;
    var m = MODES[modeVal];
    var tarif = $('vt-tarif'); if (tarif) { tarif.value = state.tarif === undefined ? m.rate : state.tarif; tarif.step = m.step; }
    var ann = $('vt-annexes'); if (ann) ann.value = state.annexes === undefined ? '' : state.annexes;
    var cont = $('vt-conteneurs'); if (cont) cont.value = state.conteneurs === undefined ? 1 : state.conteneurs;
    var minEl = $('vt-minimum'); if (minEl) minEl.value = state.minimum === undefined ? '' : state.minimum;
    var divEl = $('vt-diviseur'); if (divEl && state.divisor) divEl.value = String(state.divisor);
    var wm = $('vt-wm'); if (wm) wm.checked = state.wm !== false;
    if (rowsBox) {
      rowsBox.innerHTML = '';
      var rows = Array.isArray(state.rows) && state.rows.length ? state.rows : DEFAULTS.rows;
      rows.slice(0, 12).forEach(function (r) { addRow(r); });
    }
  };

  /* ---------- Démarrage ---------- */
  var stored = null;
  try { stored = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { stored = null; }
  if (stored && stored.v === 1 && stored.state) {
    applyState(stored.state);
  } else {
    applyState(DEFAULTS);
  }
  update(false);

  // L'impression relance un rendu pour être sûre que les tableaux sont à jour.
  window.addEventListener('beforeprint', function () { update(false); });
})();
