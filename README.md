# Site Sama Sourcing

Site vitrine statique : HTML, CSS et JavaScript simples. Aucun framework, aucun serveur, aucune base de données, aucun cookie, aucun tracker. Le site s'ouvre directement en double-cliquant sur `index.html` et fonctionne hors ligne (la calculatrice et le test calculent dans le navigateur).

Positionnement : « La Chine n'est pas le problème — ta préparation, si. »
Conversion : Calendly (appel découverte) + WhatsApp (+86 198 2478 6223).

## Les pages

| Fichier | Page | Rôle |
|---|---|---|
| `index.html` | Accueil | promesse, trois niveaux de préparation, objections |
| `score-de-preparation.html` | Le test | 12 questions → score sur 10 |
| `outils.html` | Outils | le menu Outils : les deux calculatrices et l'annuaire des marchés |
| `calculatrice.html` | Calcul « Vrai prix d'une pièce » | coût de revient réel (landed cost) |
| `calcul-transport.html` | Calcul transport & CBM | volume des colis, poids taxable, fret |
| `marches.html` | Marchés & taxi | 29 marchés dans 6 villes : recherche partagée (`#/`, `#/all`, villes), filtres ouvert / épingle vérifiée, tri, mode terrain, fiche avec légende des badges, dialogue chauffeur accessible, feuille taxi imprimable |
| `comment-ca-marche.html` | Comment ça marche | méthode en 6 étapes |
| `mon-histoire.html` | Notre histoire | origine, parcours |
| `preuves.html` | Preuves | compte rendu, devis, captures masquées |
| `bibliotheque.html` | Bibliothèque | le test de préparation et les documents PDF |
| `documents.html` | Documents | les PDF à télécharger |
| `questions.html` | Questions | FAQ (8 réponses) |
| `404.html` | Erreur | page servie automatiquement par GitHub Pages |

## Les menus Outils et Bibliothèque

La navigation tient en sept entrées : **Accueil · Outils ▾ · Bibliothèque ▾ · Comment ça marche · Notre histoire · Preuves · Questions**. Chaque bouton ouvre un panneau de deux ou trois liens, et le dernier lien du panneau mène à la page qui les rassemble (« Tous les outils », « Toute la bibliothèque »).

Outils → `outils.html` :

| Entrée | Page | Ce qu'elle fait |
|---|---|---|
| Vrai prix d'une pièce | `calculatrice.html` | coût de revient réel, prix de vente conseillé, alertes |
| Transport & CBM | `calcul-transport.html` | CBM, poids taxable, fret groupage / conteneur / aérien / express, comparaison, CBM fournisseur, liste de colis collée |
| Marchés & taxi | `marches.html` | 29 marchés, 6 villes : recherche et filtres partagés, ouvert/fermé à l'heure de Chine, favoris avec annulation, notes privées, mode terrain, feuille taxi imprimable, dialogue chauffeur accessible |

Bibliothèque → `bibliotheque.html` :

| Entrée | Page | Ce qu'elle fait |
|---|---|---|
| Le test de préparation | `score-de-preparation.html` | 12 questions, score sur 10, ce qui manque avant de payer |
| Les documents | `documents.html` | les PDF à télécharger (guides, gabarits, exemples) |

Les deux panneaux sont indépendants : ouvrir l'un ferme l'autre. Ils se ferment au clic extérieur, à `Échap`, et quand on choisit un lien.

Le panneau se ferme au clic extérieur, à `Échap`, et quand on choisit un lien. Au clavier il reste utilisable : le bouton porte `aria-expanded` et `aria-controls`, les liens suivent dans l'ordre. En dessous de 1120 px (et dans le menu mobile) le panneau s'affiche en liste indentée plutôt qu'en carte flottante.

Les deux calculateurs se parlent : le calcul transport peut envoyer son fret au calcul du coût de revient, par l'URL `calculatrice.html?fret=<montant>&annexes=<montant>&mode=<lcl|fcl20|fcl40|air|express>&src=fret`. Le calcul de destination pré-remplit « transport forfaitaire », « annexes » et le mode, puis affiche un statut « Fret importé depuis le calcul transport ». Ces paramètres ne sont lus que si `src=fret` : un lien ordinaire ne peut pas écraser tes saisies enregistrées.

## Les dossiers

| Chemin | Contenu |
|---|---|
| `assets/css/` | `style.css` (tout le site), `calculatrice.css` (les deux calculateurs) et `marches.css` (l'annuaire, scopé sous `.mkt-app`, plus sa sous-barre `.mkt-bar`) |
| `assets/js/` | `config.js` (réglages centralisés), `main.js` (menu, CTA mobile, galerie, service worker), `quiz.js` (le test), `calculatrice.js` (coût de revient), `calcul-transport.js` (fret et CBM), `marches.js` (annuaire des marchés) |
| `assets/data/` | `quiz-data.js` (questions, scores, textes du test) et `marches.js` (villes, marchés, tarifs de taxi, textes FR/EN) |
| `assets/fonts/` | Bricolage Grotesque et Figtree, servies en local (SIL Open Font License) |
| `assets/img/` | photos WebP, captures masquées, icônes, `og.jpg`, `og-calculatrice.jpg` et `og-transport.jpg` |
| `docs/` | les PDF publics (guide, présentation de l'équipe, écosystème, compte rendu, devis) |
| `tools/build.py` | contrôle de cohérence + bascule d'URL de base (voir plus bas) |
| `sw.js` | cache hors ligne (service worker, actif uniquement en HTTPS) |
| `manifest.webmanifest` | nom, icônes et couleurs pour l'installation sur mobile |
| `_headers` | en-têtes HTTP réels (Cloudflare / Netlify) ; ignoré par GitHub Pages |
| `robots.txt`, `sitemap.xml`, `llms.txt` | indexation, plan du site, résumé pour les IA |
| `CNAME.example` | gabarit du domaine personnalisé |

## Ce qui se règle dans `assets/js/config.js`

Un seul fichier à modifier pour les données qui changent souvent :

- le numéro **WhatsApp** (`contact.whatsapp`) — les liens `data-sama="wa"` sont réécrits au chargement, aucune page à rouvrir ;
- le lien **Calendly** (`contact.calendly`) ;
- les **réseaux sociaux** (`social.*`) — une valeur vide suffit à retirer proprement le lien du pied de page ;
- l'**URL de base** (`site.baseUrl`) ;
- les **valeurs indicatives** de la calculatrice : taux de change de repli, tarifs de transport, version du stockage local.

`main.js` applique ces valeurs aux liens balisés `data-sama` et reconstruit la liste `[data-social-list]` au chargement. C'est le seul mécanisme de gabarit du site.

## Outils : `tools/build.py`

Les pages sont écrites à la main (aucun générateur, aucun dossier `partials`). L'outil ne construit rien, il **vérifie** et **bascule** :

```sh
python3 tools/build.py                 # contrôle : nav, pied de page, URL de base, sitemap, robots
python3 tools/build.py --base https://<pseudo>.github.io/sama-sourcing/
python3 tools/build.py --domain samasourcing.site        # base + fichier CNAME
python3 tools/build.py --domain samasourcing.site --no-cname
```

Le contrôle vérifie que la navigation (7 entrées, deux menus déroulants) et le pied de page sont identiques sur les 12 pages, qu'aucune URL absolue ne pointe ailleurs que sur la base, que chaque page figure dans `sitemap.xml` et que `robots.txt` pointe vers le bon plan. Il sort en code 1 en cas d'écart : utilisable avant chaque `git push`.

La bascule remplace l'URL de base dans les `canonical`, `og:url`, `twitter:image`, `sitemap.xml`, `robots.txt`, `llms.txt`, `<base>` de `404.html` et `config.js`, en une passe. Aucun autre fichier n'est touché.

## Hors ligne

- `sw.js` met en cache les pages et les ressources après la première visite (HTTPS uniquement ; en `file://` il ne s'enregistre pas, ce qui est normal). Stratégie : réseau d'abord pour les pages, cache d'abord pour les ressources. **Après une modification de fichier, incrémente `VERSION` en tête de `sw.js`** pour forcer le rafraîchissement des caches.
- Le test, les deux calculateurs et l'annuaire gardent leurs données dans `localStorage` (`sama-quiz-v3`, `sama-calc-v1`, `sama-fret-v1`, `sama-favs`, `sama-lang`). Aucune requête réseau, aucune donnée envoyée.

## Sécurité

- Chaque page porte une **CSP stricte en balise `meta`** : `default-src 'self'`, aucun script tiers, aucun formulaire distant (`form-action 'none'`), aucun `eval`.
- `referrer="strict-origin-when-cross-origin"`, `<meta name="color-scheme" content="only light">`.
- Aucune dépendance externe : polices auto-hébergées, aucune CDN, aucun analytics.
- GitHub Pages **ne permet pas** d'en-têtes HTTP personnalisés : la CSP passe donc par `meta` (sans `frame-ancestors`, impossible en `meta`).
- Pour de vrais en-têtes (`Strict-Transport-Security`, `X-Frame-Options: DENY`, `Permissions-Policy`, `frame-ancestors 'none'`), le fichier `_headers` est prêt : il suffit de servir le domaine derrière Cloudflare (ou Netlify). Sur GitHub Pages, ce fichier est simplement publié comme un fichier texte, sans effet.

## Mettre en ligne (GitHub Pages)

### 1. Créer le dépôt et pousser

```sh
cd sama-site
git init
git add -A
git commit -m "chore(site): site statique production-ready"
git branch -M main
git remote add origin https://github.com/<compte>/sama-sourcing.git
git push -u origin main
```

`index.html` doit rester **à la racine du dépôt** (pas dans un sous-dossier).

### 2. Activer GitHub Pages

1. Dépôt → **Settings** → **Pages**.
2. **Build and deployment** : Source = `Deploy from a branch`, Branch = `main`, Folder = `/ (root)`.
3. Enregistrer, attendre le déploiement (1 à 2 minutes).
4. Le site est servi à `https://<compte>.github.io/sama-sourcing/`.

### 3. Mettre les URL au bon domaine

Le site est déjà réglé sur `https://samasourcing.site/`. Pour publier d'abord sur l'URL GitHub, une seule commande :

```sh
python3 tools/build.py --base https://<compte>.github.io/sama-sourcing/
git add -A && git commit -m "chore(seo): base URL github.io" && git push
```

Cela réécrit canonical, Open Graph, `sitemap.xml`, `robots.txt`, `llms.txt`, `<base>` de `404.html` et `config.js` d'un coup — sans toucher au contenu.

### 4. Activer HTTPS

**Settings → Pages** → cocher **Enforce HTTPS** dès que le certificat est émis (« Certificate provisioned »). Le service worker hors ligne ne s'active qu'en HTTPS : c'est cette étape qui le rend opérationnel.

### 5. Domaine personnalisé (optionnel)

```sh
python3 tools/build.py --domain samasourcing.site
git add -A && git commit -m "chore(deploy): domaine personnalisé" && git push
```

Puis chez le registrar / DNS :

| Type | Nom | Valeur |
|---|---|---|
| A | `@` | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` |
| CNAME | `www` | `<compte>.github.io` |

Dans **Settings → Pages**, renseigner `samasourcing.site` (Custom domain), attendre la vérification DNS, puis cocher **Enforce HTTPS**. Le fichier `CNAME` écrit par la commande doit être commité.

### 6. Vrais en-têtes de sécurité (optionnel, Cloudflare)

Le domaine chez Cloudflare (proxy activé) : créer une règle **Transform Rules → Modify response headers** à partir de `_headers`, ou héberger le site sur **Cloudflare Pages** qui lit `_headers` nativement. Attention : sur Cloudflare, garder `Always Use HTTPS` et le mode SSL **Full (strict)**.

### 7. Vérifications après mise en ligne

- `https://<domaine>/robots.txt` et `/sitemap.xml` s'ouvrent et contiennent les bonnes URL.
- Une URL inexistante affiche bien `404.html` (ex. `/nimporte-quoi`).
- `https://search.google.com/test/rich-results` sur l'accueil, la calculatrice et la FAQ : Organization, WebSite, WebApplication, FAQPage, BreadcrumbList doivent être détectés.
- Sur une URL `*.github.io/projet/`, le `robots.txt` du dépôt reste consultable mais les robots utilisent celui du domaine `github.io` — d'où l'intérêt du domaine personnalisé.

## Modifier le test

Tout le contenu du quiz vit dans `assets/data/quiz-data.js` (objet `window.SAMA_QUIZ`). Après une modification de structure, incrémenter `store_version` (le stockage local `sama-quiz-v3` est invalidé si la version change, et l'ancien `sama-quiz-v2` est migré une fois).

## Ajouter un document à la bibliothèque

1. Déposer le PDF dans `docs/`.
2. Générer l'aperçu de couverture (800 px et 1600 px, WebP) dans `assets/img/`.
3. Ajouter une carte `<li class="doc">` dans `documents.html` en copiant une carte existante (boutons Ouvrir / Télécharger).
4. Ajouter l'entrée dans `sitemap.xml` si la page change de poids, et dans `preuves.html` si le document sert de preuve.

## Conventions

- Français, tutoiement, phrases courtes, pas de jargon non expliqué.
- Aucun emoji, aucune promesse chiffrée non vérifiable.
- Les scripts portent un `?v=N` : incrémenter à chaque modification de `style.css`, `main.js`, `quiz.js`, `calculatrice.js` ou `config.js`.
