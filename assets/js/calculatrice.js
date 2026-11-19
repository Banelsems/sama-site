/* ==========================================================================
   Sama Sourcing — Calculatrice « Vrai prix d'une pièce »
   --------------------------------------------------------------------------
   100 % côté client, aucune requête réseau, aucun cookie.
   Toutes les valeurs sont des ordres de grandeur modifiables : l'outil sert à
   poser un ordre de grandeur juste, pas à remplacer un devis de transitaire.
   ========================================================================== */
(function () {
  'use strict';

  var form = document.getElementById('calc-form');
  if (!form) return;

  var CFG = window.SAMA_CONFIG || {};
  var CALC = CFG.calc || {};
  var TAUX_DEF = CALC.taux || {};
  var TARIFS = CALC.transportTarifs || {};
  var MAX_SNAPSHOTS = CALC.maxSnapshots || 5;
  var STORE = 'sama-calc-v' + (CALC.storeVersion || '1');

  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Devises ---------- */
  var CUR = {
    USD: { sym: '$', dec: 2, name: 'dollars US' },
    EUR: { sym: '€', dec: 2, name: 'euros' },
    CNY: { sym: '¥', dec: 2, name: 'yuans' },
    CDF: { sym: 'FC', dec: 0, name: 'francs congolais' },
    XOF: { sym: 'FCFA', dec: 0, name: 'francs CFA' },
    XAF: { sym: 'FCFA', dec: 0, name: 'francs CFA' },
    NGN: { sym: '₦', dec: 0, name: 'nairas' },
    GHS: { sym: 'GH₵', dec: 0, name: 'cedis' },
    KES: { sym: 'KSh', dec: 0, name: 'shillings' },
    ZAR: { sym: 'R', dec: 0, name: 'rands' }
  };
  var cur = function (code) {
    return CUR[code] || { sym: code || '', dec: 2, name: code || '' };
  };

  /* ---------- Pays de destination ----------
     Taux indicatifs 2026 : ils varient selon le code HS et le régime douanier.
     Modifiables dans le formulaire, jamais présentés comme une vérité. */
  var COUNTRIES = {
    goma: {
      label: 'Goma / RDC (port de Matadi)', country: 'RDC', currency: 'CDF', port: 'Matadi',
      duty: 15, vat: 16, other: 2,
      portFrais: 900, clearing: 350, inland: 1200, divers: 150,
      hint: 'RDC : droits souvent 5 à 30 % du CIF selon le code HS, TVA 16 %, prélèvements locaux en plus. Le poste que tout le monde sous-estime, c\'est le camion Matadi → Goma.'
    },
    douala: {
      label: 'Douala / Cameroun', country: 'Cameroun', currency: 'XAF', port: 'Douala',
      duty: 20, vat: 19.25, other: 1.45,
      portFrais: 800, clearing: 300, inland: 950, divers: 120,
      hint: 'Cameroun : droits 5 à 30 %, TVA 19,25 %, redevance informatique et précompte en plus. Port de Douala, puis route vers l\'intérieur.'
    },
    abidjan: {
      label: 'Abidjan / Côte d\'Ivoire', country: 'Côte d\'Ivoire', currency: 'XOF', port: 'Abidjan',
      duty: 20, vat: 18, other: 1,
      portFrais: 750, clearing: 280, inland: 850, divers: 130,
      hint: 'Côte d\'Ivoire : droits 5 à 35 % selon le code HS, TVA 18 %. Port d\'Abidjan, puis route ou rail vers l\'intérieur.'
    },
    lagos: {
      label: 'Lagos / Nigeria', country: 'Nigeria', currency: 'NGN', port: 'Apapa / Lagos',
      duty: 20, vat: 7.5, other: 2,
      portFrais: 1100, clearing: 400, inland: 700, divers: 180,
      hint: 'Nigeria : droits 5 à 35 %, TVA 7,5 %, prélèvements (CISS 1 %, ETLS 0,5 %) et une surcharge de 7 % sur les droits. Port d\'Apapa : prévois du temps.'
    },
    autre: {
      label: 'Autre destination', country: '', currency: 'USD', port: '',
      duty: 0, vat: 0, other: 0,
      portFrais: 0, clearing: 0, inland: 0, divers: 0,
      hint: 'Autre destination : renseigne toi-même les taux. Chaque pays applique son tarif selon le code HS, et le port change tout.'
    }
  };

  var PAY_MODES = {
    tt: { label: 'Virement bancaire (TT)', rate: 1.5 },
    alipay: { label: 'Alipay / WeChat Pay', rate: 1.5 },
    wu: { label: 'Western Union / MoneyGram', rate: 4 },
    lc: { label: 'Lettre de crédit (L/C)', rate: 2 },
    autre: { label: 'Autre', rate: 0 }
  };

  var TRANSPORT = {
    lcl: { qte: 'Volume', qteUnit: 'CBM', qteHint: 'Le volume facturable, arrondi au CBM supérieur par le transitaire.', tarif: 'Tarif par CBM', qteVal: 8, tarifVal: TARIFS.lcl || 110, step: 0.1 },
    fcl20: { qte: 'Nombre de conteneurs 20 pieds', qteUnit: 'conteneur(s)', qteHint: 'Un 20 pieds tient environ 28 CBM utiles.', tarif: 'Prix par conteneur 20 pieds', qteVal: 1, tarifVal: TARIFS.fcl20 || 3800, step: 1 },
    fcl40: { qte: 'Nombre de conteneurs 40 pieds', qteUnit: 'conteneur(s)', qteHint: 'Un 40 pieds tient environ 58 CBM utiles.', tarif: 'Prix par conteneur 40 pieds', qteVal: 1, tarifVal: TARIFS.fcl40 || 5200, step: 1 },
    air: { qte: 'Poids brut facturé', qteUnit: 'kg', qteHint: 'Poids réel ou poids volumétrique : le transporteur retient le plus élevé.', tarif: 'Tarif par kg', qteVal: 500, tarifVal: TARIFS.air || 7.5, step: 1 },
    express: { qte: 'Poids facturé', qteUnit: 'kg', qteHint: 'Express : porte à porte, plus cher, plus rapide.', tarif: 'Tarif par kg', qteVal: 50, tarifVal: TARIFS.express || 11, step: 1 }
  };

  /* ---------- Outils ---------- */
  var nf = function (dec) {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  };
  var money = function (v, code) {
    var c = cur(code);
    if (!isFinite(v)) return '—';
    return nf(c.dec).format(v) + ' ' + c.sym;
  };
  var pctTxt = function (v, dec) {
    if (!isFinite(v)) return '—';
    return nf(dec === undefined ? 1 : dec).format(v) + ' %';
  };
  var clamp = function (v, min, max) {
    if (!isFinite(v)) return min;
    return Math.min(max, Math.max(min, v));
  };
  var toNum = function (el, fallback) {
    if (!el) return fallback || 0;
    var v = parseFloat(String(el.value).replace(',', '.'));
    if (!isFinite(v)) return fallback || 0;
    return v;
  };
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /* Tous les champs de saisie, dans l'ordre du formulaire (pour la sauvegarde). */
  var FIELDS = [
    'prix-usine', 'devise-achat', 'devise-autre', 'quantite',
    'taux-cny', 'taux-eur', 'taux-autre', 'devise-locale', 'taux-local', 'marge-change',
    'transport-mode', 'transport-qte', 'transport-tarif', 'transport-forfait', 'transport-annexes',
    'pays', 'hs-code', 'douane-droit', 'douane-tva', 'douane-autres', 'douane-forfait',
    'paiement-mode', 'paiement-taux', 'paiement-fixe', 'assurance-taux', 'assurance-fixe',
    'port-frais', 'port-clearing', 'port-inland', 'port-divers',
    'perte-casse', 'perte-defauts', 'perte-colis', 'prix-vente'
  ];

  var initial = null;   // valeurs présentes à l'ouverture (exemple pré-rempli)
  var snapshots = [];
  var lastResult = null;

  /* Remet tous les champs à une valeur vide : le formulaire repart de zéro. */
  var clearAll = function () {
    FIELDS.forEach(function (id) {
      var el = $(id);
      if (!el) return;
      if (el.tagName === 'SELECT') { el.selectedIndex = 0; return; }
      if (el.type === 'range') { el.value = '0'; return; }
      el.value = '';
    });
  };

  /* ---------- Lecture du formulaire ---------- */
  var readAll = function () {
    var out = {};
    FIELDS.forEach(function (id) {
      var el = $(id);
      if (el) out[id] = el.value;
    });
    return out;
  };

  var readState = function () {
    var s = {};
    s.prixUsine = Math.max(0, toNum($('prix-usine')));
    s.deviseAchat = $('devise-achat').value || 'USD';
    s.deviseAutre = (($('devise-autre').value || 'DEV').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5)) || 'DEV';
    s.quantite = Math.max(1, Math.round(toNum($('quantite'), 1)));
    s.tauxCny = toNum($('taux-cny'), TAUX_DEF.CNY || 7.15) || 1;
    s.tauxEur = toNum($('taux-eur'), TAUX_DEF.EUR || 0.86) || 1;
    s.tauxAutre = toNum($('taux-autre'), 0.8) || 1;
    s.deviseLocale = $('devise-locale').value || 'CDF';
    s.tauxLocal = toNum($('taux-local'), TAUX_DEF[s.deviseLocale] || 1);
    s.margeChange = clamp(toNum($('marge-change'), 8), 0, 20);
    s.mode = $('transport-mode').value || 'lcl';
    s.qte = Math.max(0, toNum($('transport-qte')));
    s.tarif = Math.max(0, toNum($('transport-tarif')));
    s.forfait = Math.max(0, toNum($('transport-forfait')));
    s.annexes = Math.max(0, toNum($('transport-annexes')));
    s.pays = $('pays').value || 'goma';
    s.hs = ($('hs-code').value || '').trim();
    s.droit = clamp(toNum($('douane-droit')), 0, 100);
    s.tva = clamp(toNum($('douane-tva')), 0, 40);
    s.autres = clamp(toNum($('douane-autres')), 0, 30);
    s.douaneForfait = Math.max(0, toNum($('douane-forfait')));
    s.paiementMode = $('paiement-mode').value || 'tt';
    s.paiementTaux = clamp(toNum($('paiement-taux')), 0, 20);
    s.paiementFixe = Math.max(0, toNum($('paiement-fixe')));
    s.assuranceTaux = clamp(toNum($('assurance-taux')), 0, 5);
    s.assuranceFixe = Math.max(0, toNum($('assurance-fixe')));
    s.portFrais = Math.max(0, toNum($('port-frais')));
    s.portClearing = Math.max(0, toNum($('port-clearing')));
    s.portInland = Math.max(0, toNum($('port-inland')));
    s.portDivers = Math.max(0, toNum($('port-divers')));
    s.perteCasse = clamp(toNum($('perte-casse')), 0, 40);
    s.perteDefauts = clamp(toNum($('perte-defauts')), 0, 40);
    s.perteColis = clamp(toNum($('perte-colis')), 0, 40);
    s.prixVente = Math.max(0, toNum($('prix-vente')));
    return s;
  };

  /* ---------- Le calcul, poste par poste ---------- */
  var compute = function (s) {
    // Combien de dollars vaut une unité de la devise de facture ?
    var usdPerUnit = 1;
    if (s.deviseAchat === 'CNY') usdPerUnit = 1 / s.tauxCny;
    else if (s.deviseAchat === 'EUR') usdPerUnit = 1 / s.tauxEur;
    else if (s.deviseAchat === 'AUTRE') usdPerUnit = 1 / s.tauxAutre;

    var goods = s.prixUsine * s.quantite;
    var goodsUsd = goods * usdPerUnit;

    var transportBase = s.forfait > 0 ? s.forfait : s.qte * s.tarif;
    var transportUsd = transportBase + s.annexes;

    var insuranceUsd = s.assuranceFixe > 0
      ? s.assuranceFixe
      : (goodsUsd + transportUsd) * s.assuranceTaux / 100;

    var paymentUsd = goodsUsd * s.paiementTaux / 100 + s.paiementFixe;

    var cif = goodsUsd + transportUsd + insuranceUsd;
    var duty = cif * s.droit / 100;
    var vat = (cif + duty) * s.tva / 100;
    var other = cif * s.autres / 100;
    var customs = duty + vat + other + s.douaneForfait;

    var portTotal = s.portFrais + s.portClearing + s.portInland + s.portDivers;

    var totalUsd = goodsUsd + transportUsd + insuranceUsd + paymentUsd + customs + portTotal;

    // Risque de change : un pourcentage du total, appliqué en monnaie locale.
    var fxUsd = totalUsd * s.margeChange / 100;
    var totalLocal = (totalUsd + fxUsd) * s.tauxLocal;

    var lossPct = clamp(s.perteCasse + s.perteDefauts + s.perteColis, 0, 95);
    var sellableExact = s.quantite * (1 - lossPct / 100);
    var sellable = Math.floor(sellableExact + 1e-9);
    var lost = Math.max(0, s.quantite - sellable);

    var unitLocal = sellable > 0 ? totalLocal / sellable : Infinity;
    var unitUsd = sellable > 0 ? (totalUsd + fxUsd) / sellable : Infinity;
    var unitLocalNoFx = sellable > 0 ? (totalUsd * s.tauxLocal) / sellable : Infinity;
    var unitUsdNoFx = sellable > 0 ? totalUsd / sellable : Infinity;

    var factoryUsd = s.prixUsine * usdPerUnit;
    var factoryLocal = factoryUsd * s.tauxLocal;
    var ratio = factoryUsd > 0 ? unitUsd / factoryUsd : 0;

    var lostCostLocal = lost * unitLocal;

    // Prix de vente conseillés : marge sur le prix de vente, pas sur le coût.
    var prices = [30, 50, 80].map(function (m) {
      var price = unitLocal / (1 - m / 100);
      return {
        margin: m,
        price: price,
        priceUsd: unitUsd / (1 - m / 100),
        netPiece: price - unitLocal,
        netTotal: (price - unitLocal) * sellable
      };
    });

    // Marge réelle si l'utilisateur a saisi son prix.
    var actual = null;
    if (s.prixVente > 0 && isFinite(unitLocal)) {
      var m = (s.prixVente - unitLocal) / s.prixVente * 100;
      actual = { margin: m, netPiece: s.prixVente - unitLocal, netTotal: (s.prixVente - unitLocal) * sellable };
    }

    // Répartition : tout est ramené en monnaie locale, marge de change incluse.
    var grand = totalUsd + fxUsd;
    var lines = [
      { key: 'goods', label: 'Marchandise (prix usine)', usd: goodsUsd },
      { key: 'transport', label: 'Transport international', usd: transportUsd },
      { key: 'insurance', label: 'Assurance cargo', usd: insuranceUsd },
      { key: 'payment', label: 'Frais de paiement', usd: paymentUsd },
      { key: 'duty', label: 'Droits de douane', usd: duty },
      { key: 'vat', label: 'TVA / taxes à l\'import', usd: vat },
      { key: 'other', label: 'Autres prélèvements', usd: other },
      { key: 'customsFixed', label: 'Frais de dédouanement', usd: s.douaneForfait },
      { key: 'port', label: 'Port, clearing, livraison locale', usd: portTotal },
      { key: 'fx', label: 'Marge de sécurité de change', usd: fxUsd }
    ].filter(function (l) { return l.usd > 0.004; });

    var breakdown = lines.map(function (l) {
      return { label: l.label, local: l.usd * s.tauxLocal, share: grand > 0 ? (l.usd / grand) * 100 : 0, usd: l.usd };
    });

    return {
      s: s, goods: goods, goodsUsd: goodsUsd, transportUsd: transportUsd, insuranceUsd: insuranceUsd,
      paymentUsd: paymentUsd, cif: cif, duty: duty, vat: vat, other: other, customs: customs,
      portTotal: portTotal, totalUsd: totalUsd, fxUsd: fxUsd, totalLocal: totalLocal,
      lossPct: lossPct, sellable: sellable, lost: lost, sellableExact: sellableExact,
      unitLocal: unitLocal, unitUsd: unitUsd, unitLocalNoFx: unitLocalNoFx, unitUsdNoFx: unitUsdNoFx,
      factoryUsd: factoryUsd, factoryLocal: factoryLocal, ratio: ratio,
      lostCostLocal: lostCostLocal, prices: prices, actual: actual,
      breakdown: breakdown, grand: grand, currency: s.deviseLocale
    };
  };

  /* ---------- Points de vigilance ---------- */
  var buildAlerts = function (r) {
    var s = r.s;
    var country = COUNTRIES[s.pays] || COUNTRIES.autre;
    var expected = country.duty + country.vat + country.other;
    var out = [];

    // Formulaire vide : on n'affiche pas une liste de reproches, seulement la marche à suivre.
    if (!(r.grand > 0)) {
      return [{ level: 'info', text: 'À renseigner : le prix usine, la quantité et le transport. Le coût de revient et les prix conseillés s\'affichent aussitôt.' }];
    }

    if (s.margeChange < 5) {
      out.push({ level: 'warn', text: 'Marge de change à ' + pctTxt(s.margeChange, 0) + '. Recommandé : 5 à 15 %. À ce niveau, une dévaluation de 10 % te fait vendre à perte sans que tu le voies.' });
    } else if (s.margeChange > 18) {
      out.push({ level: 'info', text: 'Marge de change à ' + pctTxt(s.margeChange, 0) + ' : très prudente. Elle gonfle ton coût de revient et peut te faire fixer un prix trop haut face à tes concurrents.' });
    }

    if (r.lossPct < 3) {
      out.push({ level: 'warn', text: 'Pertes estimées à ' + pctTxt(r.lossPct, 1) + '. C\'est optimiste : casse, défauts et colis perdus tournent plutôt entre 3 et 8 % sur un premier envoi.' });
    } else if (r.lossPct > 12) {
      out.push({ level: 'info', text: 'Pertes à ' + pctTxt(r.lossPct, 1) + ' : élevées. Vérifie l\'emballage et le nombre de transbordements avant de commander.' });
    }

    if (s.droit === 0) {
      out.push({ level: 'warn', text: 'Droits de douane à 0 %. Deux possibilités : ton code HS est réellement exonéré, ou tu oublies la douane. Dans le second cas, la mauvaise surprise arrive au port.' });
    } else if (expected > 0 && (s.droit + s.tva + s.autres) < expected * 0.7) {
      out.push({ level: 'warn', text: 'Douane possiblement sous-estimée : tu appliques ' + pctTxt(s.droit + s.tva + s.autres, 1) + ' au total, pour ' + esc(country.label) + ' les ordres de grandeur tournent plutôt autour de ' + pctTxt(expected, 1) + ' (droits + TVA + prélèvements).' });
    }

    if (r.transportUsd <= 0) {
      out.push({ level: 'warn', text: 'Transport à 0 : aucun fret n\'est gratuit. Sans ce poste, ton coût de revient est faux d\'au moins 30 % sur un envoi maritime.' });
    }

    if (r.paymentUsd <= 0) {
      out.push({ level: 'info', text: 'Frais de paiement à 0 : un virement international coûte toujours quelque chose (banque, correspondant, taux appliqué).' });
    }

    if (s.assuranceFixe === 0 && s.assuranceTaux === 0) {
      out.push({ level: 'info', text: 'Sans assurance cargo, un sinistre se paie sur ta marge — et sur celle de plusieurs commandes.' });
    }

    if (!s.hs) {
      out.push({ level: 'info', text: 'Code HS vide : les droits appliqués sont une approximation. Demande le code exact à ton déclarant, c\'est lui qui fixe le taux.' });
    }

    if (r.ratio >= 2.2 && r.ratio > 0) {
      out.push({ level: 'info', text: 'Chaque pièce te coûte ' + nf(2).format(r.ratio) + ' fois son prix usine. C\'est courant à l\'import : ton prix de vente doit partir du coût de revient, jamais du prix usine.' });
    }

    if (r.actual && r.actual.margin < 0) {
      out.push({ level: 'warn', text: 'À ton prix de vente, tu perds ' + money(Math.abs(r.actual.netPiece), s.deviseLocale) + ' par pièce. Tu vends à perte, et le volume aggrave la perte.' });
    } else if (r.actual && r.actual.margin < 15) {
      out.push({ level: 'warn', text: 'Marge nette à ' + pctTxt(r.actual.margin, 1) + ' : trop mince pour absorber une baisse de change ou une taxe imprévue.' });
    }

    if (!isFinite(r.unitLocal) || r.sellable <= 0) {
      out.unshift({ level: 'warn', text: 'Aucune pièce vendable : les pertes estimées dépassent la quantité commandée. Corrige la quantité ou le taux de pertes.' });
    }

    if (!out.length) {
      out.push({ level: 'ok', text: 'Rien d\'anormal dans tes hypothèses. Reste à remplacer les taux indicatifs par tes vrais devis avant de payer.' });
    }

    // Les avertissements d'abord, les informations ensuite, 6 maximum.
    var order = { warn: 0, info: 1, ok: 2 };
    out.sort(function (a, b) { return order[a.level] - order[b.level]; });
    return out.slice(0, 6);
  };

  /* ---------- Rendu ---------- */
  var icon = function (id) { return '<svg aria-hidden="true"><use href="#' + id + '"/></svg>'; };

  var render = function (r) {
    var s = r.s, L = s.deviseLocale, dec = cur(L).dec;

    // Le grand chiffre : tant que rien n'est saisi, on affiche « — », pas des zéros.
    var hasInput = r.grand > 0;
    $('out-unitaire').textContent = isFinite(r.unitLocal) && hasInput ? nf(dec).format(r.unitLocal) : '—';
    $('out-unitaire-cur').textContent = hasInput ? ' ' + cur(L).sym + ' / pièce' : '';
    $('out-sans-change').textContent = isFinite(r.unitLocal) && hasInput
      ? 'Sans la marge de change : ' + money(r.unitUsdNoFx, 'USD') + ' (' + money(r.unitLocalNoFx, L) + ') par pièce.'
      : '—';

    // Comparaison prix usine / vrai coût
    $('out-compare').innerHTML = isFinite(r.unitUsd) && r.factoryUsd > 0
      ? 'Tu pensais <b>' + money(r.factoryUsd, 'USD') + '</b> la pièce. Elle te coûte <b>' + money(r.unitUsd, 'USD') + '</b> — soit <b>×' + nf(2).format(r.ratio) + '</b>.'
      : 'Renseigne une quantité et un prix usine pour voir l\'écart.';
    var delta = isFinite(r.unitUsd) ? (r.unitUsd - r.factoryUsd) * r.sellable : 0;
    $('out-compare-explain').innerHTML = delta > 0
      ? 'Sur ' + nf(0).format(r.sellable) + ' pièces vendables, l\'écart représente <b>' + money(delta, 'USD') + '</b> de plus que le prix usine. C\'est ce que paient ceux qui calculent « prix usine × 1,2 ».'
      : 'Ton coût de revient est au niveau du prix usine : vérifie que tous les postes sont remplis.';

    // Rappels dans le formulaire : ce que pèsent déjà les trois premiers postes.
    $('out-valeur').textContent = hasInput ? money(r.goodsUsd, 'USD') + ' (' + money(r.goodsUsd * s.tauxLocal, L) + ')' : '—';
    $('out-transport').textContent = hasInput ? money(r.transportUsd, 'USD') + ' (' + money(r.transportUsd * s.tauxLocal, L) + ')' : '—';
    $('out-cif').textContent = hasInput ? money(r.cif, 'USD') + ' (' + money(r.cif * s.tauxLocal, L) + ')' : '—';

    // La commande
    $('out-total-local').textContent = money(r.totalLocal, L);
    $('out-total-usd').textContent = money(r.totalUsd + r.fxUsd, 'USD') + ' (dont ' + money(r.fxUsd, 'USD') + ' de change)';
    $('out-qty-sellable').textContent = nf(0).format(r.sellable) + ' sur ' + nf(0).format(s.quantite) + ' (' + pctTxt(r.lossPct, 1) + ' de pertes)';
    $('out-perte-cost').textContent = money(r.lostCostLocal, L) + ' (' + nf(0).format(r.lost) + ' pièces)';

    // Prix conseillés
    $('out-prices').innerHTML = r.prices.map(function (p) {
      return '<li class="calc-price">' +
        '<span class="calc-price-margin">' + p.margin + ' %</span>' +
        '<span class="calc-price-main">' + money(p.price, L) + '</span>' +
        '<span class="calc-price-sub">soit ' + money(p.priceUsd, 'USD') + ' · ' + money(p.netPiece, L) + ' de marge par pièce · ' + money(p.netTotal, L) + ' sur la commande</span>' +
        '</li>';
    }).join('');

    // Répartition
    $('out-breakdown').innerHTML = r.breakdown.map(function (b) {
      var w = Math.max(1, Math.min(100, b.share));
      return '<li>' +
        '<div class="calc-bd-row"><span>' + esc(b.label) + '</span><b>' + money(b.local, L) + '<small>' + pctTxt(b.share, 1) + '</small></b></div>' +
        '<div class="calc-bd-bar" aria-hidden="true"><i style="width:' + w.toFixed(1) + '%"></i></div>' +
        '</li>';
    }).join('');
    $('out-breakdown-note').textContent = 'Lecture : part de chaque poste dans le coût total rendu boutique (' + money(r.grand * s.tauxLocal, L) + '). La marge de change est comptée comme un poste, parce qu\'elle sort bien de ta poche.';

    // Alertes
    var alerts = buildAlerts(r);
    $('out-alerts').innerHTML = alerts.map(function (a) {
      return '<li class="calc-alert is-' + a.level + '">' + icon(a.level === 'ok' ? 'i-check' : 'i-alert') + '<p>' + a.text + '</p></li>';
    }).join('');

    // Bandeau mobile
    $('live-unit').textContent = isFinite(r.unitLocal) && hasInput ? money(r.unitLocal, L) : '—';

    // Partage WhatsApp : message court, déjà rempli, modifiable avant envoi
    var waText = [
      'Bonjour Sama, voici mon calcul de coût de revient (calculatrice du site) :',
      '• Produit : ' + nf(0).format(s.quantite) + ' pièces à ' + money(s.prixUsine, s.deviseAchat === 'AUTRE' ? s.deviseAutre : s.deviseAchat) + ' l\'unité',
      '• Destination : ' + (COUNTRIES[s.pays] ? COUNTRIES[s.pays].country || 'autre pays' : 'autre pays') + (COUNTRIES[s.pays] && COUNTRIES[s.pays].port ? ' (port de ' + COUNTRIES[s.pays].port + ')' : ''),
      '• Transport : ' + nf(1).format(s.qte) + ' ' + (TRANSPORT[s.mode] ? TRANSPORT[s.mode].qteUnit : ''),
      '• Coût de revient : ' + money(r.unitLocal, L) + ' / pièce (' + money(r.unitUsd, 'USD') + ')',
      '• Coût total commande : ' + money(r.totalLocal, L),
      '• Prix conseillé (50 % de marge) : ' + money(r.prices[1].price, L),
      (alerts[0] && alerts[0].level !== 'ok' ? '• Point de vigilance : ' + alerts[0].text.replace(/<[^>]+>/g, '') : ''),
      'Qu\'est-ce qui cloche dans mes hypothèses ?'
    ].filter(function (line) { return line && line !== '• Point de vigilance : '; }).join('\n');

    var wa = document.getElementById('btn-wa');
    if (wa) {
      var href = (window.SAMA && window.SAMA.waUrl) ? window.SAMA.waUrl(waText) : 'https://wa.me/8619824786223?text=' + encodeURIComponent(waText);
      wa.setAttribute('href', href);
    }

    lastResult = r;
    buildPrint(r, alerts);
    return r;
  };

  /* ---------- Bloc imprimé (PDF via « Imprimer ») ---------- */
  var devCode = function (s) { return s.deviseAchat === 'AUTRE' ? s.deviseAutre : s.deviseAchat; };

  var buildPrint = function (r, alerts) {
    var s = r.s, L = s.deviseLocale;
    var country = COUNTRIES[s.pays] || COUNTRIES.autre;
    var date = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date());
    var t = TRANSPORT[s.mode] || TRANSPORT.lcl;

    var hyp = [
      ['Prix usine par pièce', money(s.prixUsine, devCode(s))],
      ['Quantité commandée', nf(0).format(s.quantite) + ' pièces'],
      ['Transport', (s.forfait > 0 ? 'forfait ' + money(s.forfait, 'USD') : nf(1).format(s.qte) + ' ' + t.qteUnit + ' × ' + money(s.tarif, 'USD')) + ' + ' + money(s.annexes, 'USD') + ' d\'annexes'],
      ['Destination', country.label],
      ['Change', '1 USD = ' + nf(2).format(s.tauxLocal) + ' ' + L + ' · marge ' + pctTxt(s.margeChange, 0)],
      ['Douane', pctTxt(s.droit, 1) + ' de droits · ' + pctTxt(s.tva, 2) + ' de TVA · ' + pctTxt(s.autres, 1) + ' d\'autres prélèvements'],
      ['Paiement & assurance', pctTxt(s.paiementTaux, 2) + ' + ' + money(s.paiementFixe, 'USD') + ' · assurance ' + (s.assuranceFixe > 0 ? money(s.assuranceFixe, 'USD') : pctTxt(s.assuranceTaux, 2))],
      ['Port, clearing, livraison', money(s.portFrais, 'USD') + ' + ' + money(s.portClearing, 'USD') + ' + ' + money(s.portInland, 'USD') + ' + ' + money(s.portDivers, 'USD')],
      ['Pertes estimées', pctTxt(r.lossPct, 1) + ' → ' + nf(0).format(r.sellable) + ' pièces vendables'],
      ['Code HS', s.hs || 'non renseigné']
    ];

    var res = [
      ['Coût de revient par pièce', money(r.unitLocal, L) + ' (' + money(r.unitUsd, 'USD') + ')'],
      ['Coût total de la commande', money(r.totalLocal, L) + ' (' + money(r.grand, 'USD') + ')'],
      ['Dont marge de sécurité de change', money(r.fxUsd * s.tauxLocal, L)],
      ['Prix usine par pièce', money(r.factoryLocal, L) + ' (' + money(r.factoryUsd, 'USD') + ')'],
      ['Multiplicateur réel', '×' + nf(2).format(r.ratio)]
    ];
    r.prices.forEach(function (p) {
      res.push(['Prix de vente conseillé à ' + p.margin + ' %', money(p.price, L) + ' — marge ' + money(p.netPiece, L) + ' / pièce']);
    });
    if (r.actual) {
      res.push(['À ton prix de vente (' + money(s.prixVente, L) + ')', 'marge nette ' + pctTxt(r.actual.margin, 1) + ', soit ' + money(r.actual.netTotal, L)]);
    }

    var table = function (rows, cls) {
      return '<table class="calc-print-table' + (cls ? ' ' + cls : '') + '"><tbody>' +
        rows.map(function (row) { return '<tr><td>' + esc(row[0]) + '</td><td>' + esc(row[1]) + '</td></tr>'; }).join('') +
        '</tbody></table>';
    };

    $('calc-print').innerHTML =
      '<div class="calc-print-wrap">' +
        '<header class="calc-print-head">' +
          '<p class="calc-print-brand">Sama Sourcing · samasourcing.site</p>' +
          '<h1>Le vrai prix d\'une pièce</h1>' +
          '<p class="calc-print-meta">Calcul du ' + esc(date) + ' · ' + esc(country.label) + ' · ' + nf(0).format(s.quantite) + ' pièces</p>' +
        '</header>' +
        '<section class="calc-print-hero">' +
          '<p>Coût de revient par pièce vendable</p>' +
          '<b>' + esc(money(r.unitLocal, L)) + '</b>' +
          '<span>soit ' + esc(money(r.unitUsd, 'USD')) + ' · commande totale ' + esc(money(r.totalLocal, L)) + '</span>' +
        '</section>' +
        '<section><h2>Hypothèses de départ</h2>' + table(hyp) + '</section>' +
        '<section><h2>Résultats</h2>' + table(res, 'calc-print-strong') + '</section>' +
        '<section><h2>Répartition du coût</h2>' +
          '<table class="calc-print-table"><thead><tr><th>Poste</th><th>Montant</th><th>Part</th></tr></thead><tbody>' +
          r.breakdown.map(function (b) {
            return '<tr><td>' + esc(b.label) + '</td><td>' + esc(money(b.local, L)) + '</td><td>' + esc(pctTxt(b.share, 1)) + '</td></tr>';
          }).join('') +
          '</tbody></table></section>' +
        '<section><h2>Points de vigilance</h2><ul class="calc-print-alerts">' +
          alerts.map(function (a) { return '<li>' + esc(a.text.replace(/<[^>]+>/g, '')) + '</li>'; }).join('') +
        '</ul></section>' +
        '<footer class="calc-print-foot">Estimation calculée sur des hypothèses déclarées par l\'utilisateur. Les taux de fret, de douane et de change doivent être confirmés par un devis et un déclarant. Aucun devis, aucune garantie. Calculatrice gratuite : ' + esc(String(CFG.site && CFG.site.baseUrl || '')) + 'calculatrice.html</footer>' +
      '</div>';
  };

  /* ---------- Libellés et champs dynamiques ---------- */
  var syncLabels = function (s) {
    var code = devCode(s);
    document.querySelectorAll('[data-unit="achat"]').forEach(function (el) { el.textContent = code; });

    $('field-devise-autre').hidden = s.deviseAchat !== 'AUTRE';
    $('field-taux-cny').hidden = s.deviseAchat !== 'CNY';
    $('field-taux-eur').hidden = s.deviseAchat !== 'EUR';
    $('field-taux-autre').hidden = s.deviseAchat !== 'AUTRE';
    $('lbl-devise-autre').textContent = s.deviseAutre;

    $('lbl-devise-locale').textContent = cur(s.deviseLocale).name;
    $('unit-taux-local').textContent = s.deviseLocale;
    $('unit-prix-vente').textContent = s.deviseLocale;
    $('out-marge').textContent = nf(0).format(s.margeChange) + ' %';

    var t = TRANSPORT[s.mode] || TRANSPORT.lcl;
    $('t-qte-label').textContent = t.qte;
    $('t-qte-unit').textContent = t.qteUnit;
    $('h-transport-qte').textContent = t.qteHint;
    $('t-tarif-label').textContent = t.tarif;
    $('transport-qte').step = t.step;

    $('out-pertes').textContent = pctTxt(s.perteCasse + s.perteDefauts + s.perteColis, 1);

    var country = COUNTRIES[s.pays] || COUNTRIES.autre;
    $('pays-hint').textContent = country.port
      ? 'Port de ' + country.port + ' — taux indicatifs pré-remplis, à confirmer.'
      : 'Aucun pré-remplissage : renseigne les taux de ton pays.';
    var note = $('pays-note') && $('pays-note').querySelector('p');
    if (note) note.textContent = country.hint;
  };

  /* ---------- Sauvegarde locale (5 calculs + le calcul en cours) ---------- */
  var saveTimer = null;
  var store = function () {
    try { return JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { return null; }
  };
  var saveCurrent = function () {
    try {
      localStorage.setItem(STORE, JSON.stringify({
        v: String(CALC.storeVersion || '1'),
        current: readAll(),
        snapshots: snapshots
      }));
    } catch (e) { /* quota plein ou navigation privée : on continue sans mémoire */ }
  };
  var saveDebounced = function () { clearTimeout(saveTimer); saveTimer = setTimeout(saveCurrent, 600); };

  var applyAll = function (values) {
    if (!values) return;
    FIELDS.forEach(function (id) {
      var el = $(id);
      if (el && values[id] !== undefined) el.value = values[id];
    });
  };

  /* ---------- Boucle de mise à jour ---------- */
  var announceTimer = null;
  var update = function (announce) {
    var s = readState();
    var r = compute(s);
    syncLabels(s);
    render(r);
    saveDebounced();
    if (announce) {
      clearTimeout(announceTimer);
      announceTimer = setTimeout(function () {
        var live = $('calc-announce');
        if (!live) return;
        live.textContent = isFinite(r.unitLocal) && r.grand > 0
          ? 'Coût de revient : ' + money(r.unitLocal, s.deviseLocale) + ' par pièce, soit ' + money(r.totalLocal, s.deviseLocale) + ' pour la commande.'
          : 'Calcul incomplet.';
      }, 800);
    }
  };

  var pendingFrame = false;
  var scheduleUpdate = function () {
    if (pendingFrame) return;
    pendingFrame = true;
    window.requestAnimationFrame(function () { pendingFrame = false; update(false); });
  };

  var applyCountry = function (id) {
    var c = COUNTRIES[id] || COUNTRIES.autre;
    if (c.currency && $('devise-locale').value !== c.currency) {
      $('devise-locale').value = c.currency;
      if (TAUX_DEF[c.currency]) $('taux-local').value = TAUX_DEF[c.currency];
    }
    $('douane-droit').value = c.duty;
    $('douane-tva').value = c.vat;
    $('douane-autres').value = c.other;
    $('port-frais').value = c.portFrais;
    $('port-clearing').value = c.clearing;
    $('port-inland').value = c.inland;
    $('port-divers').value = c.divers;
  };

  form.addEventListener('submit', function (e) { e.preventDefault(); });

  form.addEventListener('input', scheduleUpdate);

  form.addEventListener('change', function (e) {
    var t = e.target;
    if (!t || !t.id) return;
    if (t.id === 'transport-mode') {
      var cfg = TRANSPORT[t.value] || TRANSPORT.lcl;
      $('transport-qte').value = cfg.qteVal;
      $('transport-tarif').value = cfg.tarifVal;
    } else if (t.id === 'pays') {
      applyCountry(t.value);
    } else if (t.id === 'paiement-mode') {
      var pm = PAY_MODES[t.value];
      if (pm) $('paiement-taux').value = pm.rate;
    } else if (t.id === 'devise-locale') {
      if (TAUX_DEF[t.value]) $('taux-local').value = TAUX_DEF[t.value];
    }
    update(true);
  });

  /* ---------- Actions ---------- */
  var setStatus = function (msg) {
    var el = $('calc-status');
    if (!el) return;
    el.textContent = msg;
    clearTimeout(setStatus.timer);
    setStatus.timer = setTimeout(function () { el.textContent = ''; }, 5000);
  };

  var dateStr = function () {
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date());
  };

  var resultText = function (r) {
    var s = r.s, L = s.deviseLocale;
    var out = [];
    out.push('SAMA SOURCING — Le vrai prix d\'une pièce');
    out.push('Calcul du ' + dateStr());
    out.push('');
    out.push('PRODUIT');
    out.push('- ' + nf(0).format(s.quantite) + ' pièces à ' + money(s.prixUsine, devCode(s)) + ' l\'unité (prix usine)');
    out.push('- Valeur marchandise : ' + money(r.goodsUsd, 'USD'));
    out.push('');
    out.push('COÛTS (en ' + L + ')');
    r.breakdown.forEach(function (b) {
      out.push('- ' + b.label + ' : ' + money(b.local, L) + ' (' + pctTxt(b.share, 1) + ')');
    });
    out.push('');
    out.push('RÉSULTAT');
    out.push('- Coût total de la commande : ' + money(r.totalLocal, L) + ' (' + money(r.grand, 'USD') + ')');
    out.push('- Pièces vendables : ' + nf(0).format(r.sellable) + ' sur ' + nf(0).format(s.quantite) + ' (pertes ' + pctTxt(r.lossPct, 1) + ')');
    out.push('- Coût de revient par pièce : ' + money(r.unitLocal, L) + ' soit ' + money(r.unitUsd, 'USD'));
    out.push('- Prix usine par pièce : ' + money(r.factoryLocal, L) + ' → multiplicateur ×' + nf(2).format(r.ratio));
    out.push('');
    out.push('PRIX DE VENTE CONSEILLÉS');
    r.prices.forEach(function (p) {
      out.push('- Marge ' + p.margin + ' % : ' + money(p.price, L) + ' (' + money(p.netPiece, L) + ' par pièce, ' + money(p.netTotal, L) + ' sur la commande)');
    });
    if (r.actual) {
      out.push('- À ton prix de ' + money(s.prixVente, L) + ' : marge nette ' + pctTxt(r.actual.margin, 1));
    }
    out.push('');
    out.push('HYPOTHÈSES : ' + (COUNTRIES[s.pays] ? COUNTRIES[s.pays].label : 'autre destination') + ', droits ' + pctTxt(s.droit, 1) + ', TVA ' + pctTxt(s.tva, 2) + ', marge de change ' + pctTxt(s.margeChange, 0) + '.');
    out.push('Estimation à confirmer par un devis et un déclarant.');
    return out.join('\n');
  };

  var btnCopy = $('btn-copy');
  if (btnCopy) {
    btnCopy.addEventListener('click', function () {
      if (!lastResult) return;
      var text = resultText(lastResult);
      var done = function () { setStatus('Détail copié. Tu peux le coller dans WhatsApp ou dans un document.'); };
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
          setStatus('Copie impossible sur ce navigateur. Utilise « Imprimer / PDF ».');
        }
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(fallback);
      } else fallback();
    });
  }

  var btnPrint = $('btn-print');
  if (btnPrint) btnPrint.addEventListener('click', function () { window.print(); });

  var renderSaved = function () {
    var wrap = $('calc-saved-wrap');
    var list = $('calc-saved');
    if (!wrap || !list) return;
    wrap.hidden = snapshots.length === 0;
    list.innerHTML = snapshots.map(function (sn, i) {
      return '<li><button type="button" class="calc-saved-load" data-load="' + i + '">' +
        '<b>' + esc(sn.label) + '</b><span>' + esc(sn.summary || '') + '</span></button>' +
        '<button type="button" class="calc-saved-del" data-del="' + i + '" aria-label="Supprimer ce calcul enregistré">×</button></li>';
    }).join('');
  };

  var btnSave = $('btn-save');
  if (btnSave) {
    btnSave.addEventListener('click', function () {
      var s = readState();
      var r = compute(s);
      var label = 'Calcul du ' + new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date());
      snapshots.unshift({
        label: label,
        summary: money(r.unitLocal, s.deviseLocale) + ' / pièce · ' + nf(0).format(s.quantite) + ' pièces · ' + (COUNTRIES[s.pays] ? COUNTRIES[s.pays].country : ''),
        inputs: readAll()
      });
      snapshots = snapshots.slice(0, MAX_SNAPSHOTS);
      saveCurrent();
      renderSaved();
      setStatus('Calcul enregistré sur cet appareil (' + snapshots.length + '/' + MAX_SNAPSHOTS + '). Rien n\'a été envoyé.');
    });
  }

  var resetForm = function () {
    clearAll();
    update(true);
    setStatus('Formulaire vidé. À toi de saisir tes chiffres.');
  };
  ['btn-reset', 'btn-reset-top'].forEach(function (id) {
    var b = $(id);
    if (b) b.addEventListener('click', resetForm);
  });

  var savedList = $('calc-saved');
  if (savedList) {
    savedList.addEventListener('click', function (e) {
      var load = e.target.closest('[data-load]');
      var del = e.target.closest('[data-del]');
      if (load) {
        var i = parseInt(load.getAttribute('data-load'), 10);
        if (snapshots[i]) {
          applyAll(snapshots[i].inputs);
          update(true);
          setStatus('Calcul rechargé.');
        }
      } else if (del) {
        var j = parseInt(del.getAttribute('data-del'), 10);
        snapshots.splice(j, 1);
        saveCurrent();
        renderSaved();
        setStatus('Calcul supprimé.');
      }
    });
  }

  /* ---------- Démarrage ---------- */
  initial = readAll();
  var stored = store();
  if (stored && stored.v === String(CALC.storeVersion || '1')) {
    snapshots = Array.isArray(stored.snapshots) ? stored.snapshots.slice(0, MAX_SNAPSHOTS) : [];
    if (stored.current) applyAll(stored.current);
  } else if (stored) {
    // Version de données différente : on repart proprement plutôt que d'afficher des chiffres faux.
    try { localStorage.removeItem(STORE); } catch (e) { /* rien */ }
  }
  renderSaved();
  update(false);

  // L'impression relance un rendu pour être sûre que le bloc est à jour.
  window.addEventListener('beforeprint', function () { update(false); });
})();
