/* Sama Sourcing — service worker minimal.
   Objectif : le site reste consultable hors ligne après une première visite
   (y compris la calculatrice, qui fonctionne entièrement en local).
   Aucune requête vers un tiers : uniquement l'origine du site.

   Après une modification de fichier, incrémente VERSION pour forcer la mise à jour.
*/
var VERSION = 'sama-2026-11-21e';
var CORE = [
  './',
  'index.html',
  'outils.html',
  'bibliotheque.html',
  'calculatrice.html',
  'calcul-transport.html',
  'marches.html',
  'score-de-preparation.html',
  'comment-ca-marche.html',
  'mon-histoire.html',
  'preuves.html',
  'documents.html',
  'questions.html',
  '404.html',
  'assets/css/style.css',
  'assets/css/calculatrice.css',
  'assets/css/marches.css',
  'assets/fonts/fonts.css',
  'assets/js/config.js',
  'assets/js/main.js',
  'assets/js/quiz.js',
  'assets/js/calculatrice.js',
  'assets/js/calcul-transport.js',
  'assets/data/quiz-data.js',
  'assets/data/marches.js',
  'assets/js/marches.js',
  'assets/img/favicon.svg',
  'assets/img/hero-800.webp',
  'assets/img/hero-1600.webp',
  'assets/img/og.jpg',
  'assets/img/og-transport.jpg',
  'manifest.webmanifest'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(VERSION).then(function (cache) {
      // addAll échoue en bloc si un fichier manque : on ajoute un par un.
      return Promise.all(CORE.map(function (url) {
        return cache.add(new Request(url, { cache: 'reload' })).catch(function () { /* fichier absent : ignoré */ });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) { return key !== VERSION; })
        .map(function (key) { return caches.delete(key); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;

  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // rien d'externe n'est mis en cache

  // Pages : réseau d'abord (contenu frais), cache en secours si hors ligne.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(function (response) {
        var copy = response.clone();
        caches.open(VERSION).then(function (cache) { cache.put(request, copy); });
        return response;
      }).catch(function () {
        return caches.match(request, { ignoreSearch: true }).then(function (hit) {
          return hit || caches.match('index.html') || caches.match('./');
        });
      })
    );
    return;
  }

  // Ressources : cache d'abord, revalidation silencieuse en arrière-plan.
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(function (hit) {
      if (hit) {
        fetch(request).then(function (response) {
          if (response && response.ok && response.type === 'basic') {
            var copy = response.clone();
            caches.open(VERSION).then(function (cache) { cache.put(request, copy); });
          }
        }).catch(function () { /* hors ligne : la version en cache suffit */ });
        return hit;
      }
      return fetch(request).then(function (response) {
        if (response && response.ok && response.type === 'basic') {
          var copy = response.clone();
          caches.open(VERSION).then(function (cache) { cache.put(request, copy); });
        }
        return response;
      });
    })
  );
});
