/* ==========================================================================
   Sama Sourcing — configuration du site.
   --------------------------------------------------------------------------
   C'EST LE SEUL ENDROIT OÙ L'ON MODIFIE :
     - le numéro WhatsApp (et le lien de réservation Calendly) ;
     - les liens des réseaux sociaux (vide = le lien est retiré proprement) ;
     - l'URL de base (canonical, sitemap, image de partage) ;
     - les valeurs par défaut de la calculatrice « Vrai prix d'une pièce ».

   Au chargement, main.js applique ces valeurs à tous les liens balisés
   `data-sama="..."` (aucune page à rouvrir).

   Les pages sont écrites à la main (aucun générateur), mais un petit outil
   de cohérence existe : tools/build.py. Il vérifie que la navigation et le
   pied de page sont identiques partout, et il réécrit d'un coup les URL
   absolues (canonical, og:url, sitemap.xml, robots.txt, llms.txt, <base>
   de 404.html) quand l'URL de base change.
   ========================================================================== */
(function () {
  'use strict';

  var CONFIG = {
    /* Version des données du site. Sert aussi de version de stockage local. */
    version: '2026.11',

    brand: {
      name: 'Sama Sourcing',
      mark: 'S',
      city: 'Yiwu',
      country: 'Chine',
      since: 2023,
      created: 2026,
      room: 'Marché Binwang, zone C, porte 3, 4e étage, n° 425-2, Yiwu (Chine)',
      roomZh: '宾王市场C区3号门，3楼26号上4楼425-2号'
    },

    /* URL de base, avec la barre oblique finale. Valeur de référence ;
       les canonical, og:url, sitemap.xml, robots.txt et llms.txt contiennent
       aussi l'URL en dur. Pour en changer, ne modifie pas ces fichiers à la
       main : lance `python3 tools/build.py --base <nouvelle URL>` (ou
       --domain <domaine>), qui les réécrit tous de façon cohérente.
       Phase 1 (GitHub Pages)  : https://TON-PSEUDO.github.io/sama-sourcing/
       Phase 2 (domaine propre): https://samasourcing.site/ */
    site: {
      baseUrl: 'https://samasourcing.site/',
      lang: 'fr',
      ogImage: 'assets/img/og.jpg',
      themeColor: '#0A1A3A'
    },

    contact: {
      /* Numéro unique du site. Format international, sans espace. */
      whatsapp: {
        e164: '+8619824786223',
        display: '+86 198 2478 6223'
      },
      calendly: 'https://calendly.com/samasourcing/appel-decouverte',
      /* Renseigne un email pour l'afficher dans le pied de page (sinon rien). */
      email: ''
    },

    /* Un lien vide est automatiquement retiré du pied de page (plus de href="#"). */
    social: {
      whatsappChannel: '',
      linkedin: '',
      instagram: '',
      facebook: '',
      tiktok: ''
    },

    /* Valeurs indicatives de la calculatrice : les champs démarrent toujours
       vides ; elles ne servent qu'à pré-remplir quand l'utilisateur choisit
       un mode de transport, un pays ou un moyen de paiement.
       Ordres de grandeur 2026, à confirmer par un devis ou un transitaire. */
    calc: {
      storeVersion: '1',
      maxSnapshots: 5,
      /* 1 USD = X. À mettre à jour : ce sont des taux de repli, pas une source. */
      taux: {
        CNY: 7.15,
        EUR: 0.86,
        CDF: 2800,
        XOF: 600,
        XAF: 600,
        NGN: 1550,
        GHS: 15.2,
        KES: 129
      },
      transportTarifs: {
        lcl: 110,     // USD par CBM
        fcl20: 3800,  // USD par conteneur 20'
        fcl40: 5200,  // USD par conteneur 40'
        air: 7.5,     // USD par kg
        express: 11   // USD par kg
      }
    }
  };

  /* ---------- Helpers partagés ---------- */

  var digits = function () {
    return String(CONFIG.contact.whatsapp.e164).replace(/[^\d]/g, '');
  };

  /** Lien wa.me avec message pré-rempli (toujours encodé). */
  var waUrl = function (text) {
    var base = 'https://wa.me/' + digits();
    return text ? base + '?text=' + encodeURIComponent(text) : base;
  };

  var DEFAULT_WA_TEXT = 'Bonjour Sama Sourcing, je veux préparer un achat en Chine.';

  window.SAMA_CONFIG = CONFIG;
  window.SAMA = {
    config: CONFIG,
    digits: digits,
    waUrl: waUrl,
    defaultWaText: DEFAULT_WA_TEXT,
    /* Construit une URL absolue à partir d'un chemin relatif au site. */
    url: function (path) {
      return String(CONFIG.site.baseUrl).replace(/\/$/, '') + '/' + String(path || '').replace(/^\//, '');
    }
  };
})();
