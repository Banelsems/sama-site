// Sama Sourcing — interactions. Aucun suivi, aucun cookie, aucune bibliothèque.
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canObserve = 'IntersectionObserver' in window;


  /* ---------- Menu mobile (☰) ---------- */
  var siteHeader = document.querySelector('.site-header');
  var navToggle = document.querySelector('.nav-toggle');
  if (siteHeader && navToggle) {
    var setMenu = function (open) {
      siteHeader.classList.toggle('menu-open', open);
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      navToggle.querySelector('.visually-hidden').textContent = open ? 'Fermer le menu' : 'Ouvrir le menu';
    };
    navToggle.addEventListener('click', function () { setMenu(!siteHeader.classList.contains('menu-open')); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    document.querySelectorAll('.nav a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  }

  /* ---------- Barre fixe mobile : après l'en-tête, avant l'appel final ---------- */
  var bar = document.getElementById('sticky-cta');
  var hero = document.querySelector('.hero');
  var finalSection = document.getElementById('final');
  var barLink = bar ? bar.querySelector('a') : null;
  var ticking = false;
  var onScroll = function () {
    ticking = false;
    if (!bar || !hero || !finalSection) return;
    var show = hero.getBoundingClientRect().bottom < 0 &&
               finalSection.getBoundingClientRect().top > window.innerHeight;
    bar.classList.toggle('is-visible', show);
    bar.setAttribute('aria-hidden', show ? 'false' : 'true');
    barLink.tabIndex = show ? 0 : -1;
  };
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
  }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* Trajet animé figé si moins de mouvement est demandé */
  var route = document.querySelector('.route-line');
  if (route && reduceMotion && route.pauseAnimations) route.pauseAnimations();

  /* ---------- Cartes qui se retournent ---------- */
  document.querySelectorAll('.flip').forEach(function (card) {
    card.addEventListener('click', function () {
      card.setAttribute('aria-pressed', card.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    });
  });

  /* ---------- Onglets accessibles (flèches gauche/droite) ---------- */
  var tabKeys = function (tabs, select) {
    tabs.forEach(function (tab, i) {
      tab.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % tabs.length;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + tabs.length) % tabs.length;
        if (e.key === 'Home') next = 0;
        if (e.key === 'End') next = tabs.length - 1;
        if (next === null) return;
        e.preventDefault();
        select(next, true);
        tabs[next].focus();
      });
    });
  };

  /* ---------- Suivi de commande : étapes + téléphone, lecture automatique ---------- */
  var tracker = document.querySelector('[data-tracker]');
  if (tracker) {
    var steps = Array.prototype.slice.call(tracker.querySelectorAll('.step'));
    var panels = steps.map(function (s) { return document.getElementById(s.getAttribute('aria-controls')); });
    var current = 0;
    var timer = null;
    var playing = false;
    var STEP_MS = 5200;

    var fill = function (i, animate) {
      var bar = steps[i].querySelector('.step-bar i');
      if (!bar) return;
      bar.style.transition = 'none';
      bar.style.transform = 'scaleX(0)';
      if (!animate || reduceMotion) return;
      void bar.offsetWidth; // relance la transition
      bar.style.transition = 'transform ' + STEP_MS + 'ms linear';
      bar.style.transform = 'scaleX(1)';
    };

    var select = function (i, byUser) {
      current = i;
      steps.forEach(function (s, k) {
        var on = k === i;
        s.setAttribute('aria-selected', on ? 'true' : 'false');
        s.tabIndex = on ? 0 : -1;
        s.classList.toggle('is-done', k < i);
        if (!on) { var b = s.querySelector('.step-bar i'); if (b) { b.style.transition = 'none'; b.style.transform = ''; } }
        // remet les bulles à zéro pour rejouer leur entrée
        panels[k].hidden = !on;
      });
      if (byUser) stop();
      if (playing) { fill(i, true); schedule(); }
    };

    var schedule = function () {
      clearTimeout(timer);
      timer = setTimeout(function () { select((current + 1) % steps.length, false); }, STEP_MS);
    };
    var start = function () {
      if (playing || reduceMotion) return;
      playing = true; fill(current, true); schedule();
    };
    var stop = function () {
      playing = false; clearTimeout(timer);
      steps.forEach(function (s) { var b = s.querySelector('.step-bar i'); if (b) { b.style.transition = 'none'; b.style.transform = ''; } });
    };

    steps.forEach(function (s, i) { s.addEventListener('click', function () { select(i, true); }); });
    tabKeys(steps, select);

    // lecture automatique seulement quand le suivi est à l'écran
    if (canObserve) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) start(); else if (playing) { playing = false; clearTimeout(timer); } });
      }, { threshold: 0.35 }).observe(tracker);
    }
  }

  /* ---------- Pour qui : bascule oui / non ---------- */
  var fit = document.querySelector('[data-fit]');
  if (fit) {
    var fitTabs = Array.prototype.slice.call(fit.querySelectorAll('[role="tab"]'));
    var fitSelect = function (i) {
      fit.setAttribute('data-state', i === 0 ? 'yes' : 'no');
      fitTabs.forEach(function (t, k) {
        var on = k === i;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
    };
    fitTabs.forEach(function (t, i) { t.addEventListener('click', function () { fitSelect(i); }); });
    tabKeys(fitTabs, fitSelect);
  }

  /* ---------- Compteur 100+ ---------- */
  var countUp = function (el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    if (reduceMotion) { el.textContent = target; return; }
    var t0 = null;
    var tick = function (t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / 1400, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) window.requestAnimationFrame(tick);
    };
    el.textContent = '0';
    window.requestAnimationFrame(tick);
  };

  /* ---------- Apparitions au défilement ---------- */
  if (canObserve && !reduceMotion) {
    var pending = [];
    document.querySelectorAll('[data-reveal]').forEach(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight * 0.92) {
        el.classList.add('reveal-pending');
        pending.push(el);
      }
    });
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var idx = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
        el.style.transitionDelay = Math.min(idx, 4) * 70 + 'ms';
        el.classList.add('reveal-in');
        el.classList.remove('reveal-pending');
        setTimeout(function () { el.classList.remove('reveal-in'); el.style.transitionDelay = ''; }, 1400);
        revealObs.unobserve(el);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.1 });
    pending.forEach(function (el) { revealObs.observe(el); });

    var once = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        if (el.hasAttribute('data-count')) countUp(el); else el.classList.add('is-in');
        once.unobserve(el);
      });
    }, { threshold: 0.5 });
    document.querySelectorAll('.journey, [data-count]').forEach(function (el) { once.observe(el); });
  } else {
    document.querySelectorAll('.journey').forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- Lightbox (rapport et photos) ---------- */
  var dialog = document.getElementById('lightbox');
  if (!dialog || typeof dialog.showModal !== 'function') return; // sans support : les liens ouvrent l'image
  var img = dialog.querySelector('img');
  var cap = dialog.querySelector('figcaption');
  var items = [];
  var index = 0;
  var opener = null;
  var show = function (i) {
    index = (i + items.length) % items.length;
    var a = items[index];
    var thumb = a.querySelector('img');
    img.src = a.getAttribute('href');
    img.alt = thumb ? thumb.alt : '';
    cap.textContent = a.dataset.caption || '';
    var multi = items.length > 1;
    dialog.querySelector('.lb-prev').hidden = !multi;
    dialog.querySelector('.lb-next').hidden = !multi;
  };
  document.querySelectorAll('[data-gallery]').forEach(function (gallery) {
    var links = Array.prototype.slice.call(gallery.querySelectorAll('a.thumb'));
    links.forEach(function (a, i) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        items = links; opener = a; show(i);
        dialog.showModal();
        dialog.querySelector('.lb-close').focus();
      });
    });
  });
  dialog.querySelector('.lb-close').addEventListener('click', function () { dialog.close(); });
  dialog.querySelector('.lb-prev').addEventListener('click', function () { show(index - 1); });
  dialog.querySelector('.lb-next').addEventListener('click', function () { show(index + 1); });
  dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') show(index - 1);
    if (e.key === 'ArrowRight') show(index + 1);
  });
  dialog.addEventListener('close', function () { img.removeAttribute('src'); if (opener) opener.focus(); });
})();
