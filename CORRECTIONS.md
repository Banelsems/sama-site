# Corrections — audit du 17 novembre 2026 et suite

Ce fichier liste ce qui a été corrigé, page par page, avec le fichier concerné. Il sert
de journal de maintenance : avant de modifier une page, vérifier ce qui y a déjà été fait.

## 1. Les neuf points de l'audit

| # | Problème relevé | Correction | Où |
|---|---|---|---|
| 1 | Liens morts `href="#"` (24 occurrences) | Supprimés : les réseaux sans URL réelle sont retirés, la liste du pied de page est reconstruite au chargement depuis `config.js` | `assets/js/config.js`, `assets/js/main.js`, les 8 pages |
| 2 | Numéro WhatsApp dupliqué (7 endroits) | Un seul endroit : `config.whatsapp`. Les liens portent `data-sama="wa"` et sont réécrits au chargement ; `tools/build.py` vérifie qu'aucune URL `wa.me` ne dévie | `assets/js/config.js`, `assets/js/main.js` |
| 3 | Fallback mort : `fetch('assets/data/quiz.json')` | Supprimé. Si les données manquent, le test affiche un message actionnable au lieu d'une erreur silencieuse | `assets/js/quiz.js` |
| 4 | Pas de `robots.txt`, `sitemap.xml`, ni 404 | Les trois sont créés ; `llms.txt` en plus pour les IA | racine du site |
| 5 | Pas d'en-têtes de sécurité | CSP stricte en `meta` sur chaque page + `_headers` prêt pour Cloudflare/Netlify | les 8 pages, `_headers` |
| 6 | Header/footer dupliqués (6 copies divergentes) | Assumés et documentés (site statique sans inclusion) ; un contrôle automatique vérifie qu'ils sont identiques sur les 8 pages | `tools/build.py`, `README.md` |
| 7 | `STORE` localStorage (`sama-quiz-v2`) ≠ `version` des données (`3.0`) | `sama-quiz-v3`, `store_version: "3"`, migration unique de l'ancienne clé puis suppression | `assets/js/quiz.js`, `assets/data/quiz-data.js` |
| 8 | Dark mode en option, jamais piloté | Retiré au profit de `<meta name="color-scheme" content="only light">` : une seule palette, pas de flash | les 8 pages |
| 9 | `og.jpg` ne correspondait plus au positionnement | Régénérée : « La Chine n'est pas le problème. / Ta préparation, si. », plus `og-calculatrice.jpg` | `assets/img/og.jpg`, `assets/img/og-calculatrice.jpg` |

## 2. Problèmes trouvés pendant la mise en œuvre

| Problème | Correction |
|---|---|
| `#sticky-cta` était appelé par `main.js` et le CSS… mais absent de toutes les pages | Bloc ajouté sur les 8 pages, avec `body.has-cta-bar` pour remonter le bouton WhatsApp |
| `<meta name="claude:viewport-fit-sides">` non standard | Supprimée ; `viewport-fit=cover` reste dans `viewport` |
| Boîte d'image (lightbox) présente sur 4 pages sans galerie | Retirée de `score`, `comment-ca-marche`, `mon-histoire`, `questions` ; conservée sur `preuves` |
| Quiz : `aria-valuenow` en base 0 | Passé en base 1, avec `aria-valuetext` (« Question 3 sur 12 ») |
| `role="status"` posé sur un conteneur mis à jour en boucle | Remplacé par une région `aria-live="polite"` annoncée à la demande |
| Calculatrice : trois sorties jamais mises à jour (`out-valeur`, `out-transport`, `out-cif`) affichaient « — » | Alimentées dans `render()` (USD et monnaie locale) |
| Calculatrice : formulaire vide → avalanche d'alertes | État vide neutre (« À renseigner… ») avant tout calcul |
| Calculatrice : ouverture sur un formulaire vide, donc page qui semble cassée | Exemple pré-rempli (1 200 pièces à 3,50 USD → Goma) + mention « Exemple pré-rempli » + bouton « Tout effacer » |
| Calculatrice : la formule débordait à 390 px (colonne `auto` en max-content) | `grid-template-columns: minmax(0, 1fr)` et `min-width: 0` |
| `404.html` dépendait entièrement de `style.css` servi depuis le domaine final | Page 100 % autonome : styles en ligne avec valeurs de repli, plus aucune ressource externe. Elle s'affiche même si le domaine, les polices ou la CSP bloquent le reste |
| Navigation à 7 puis 8 entrées cassait la barre à 1040 px | Point de rupture porté à 1120 px, `gap` 20 px, marque 1,1 rem (mesuré : 1 043 px nécessaires pour 1 078 px disponibles) |

## 3. Page par page

### `index.html`
- En-tête : `robots`, canonical + `hreflang` fr / `x-default`, CSP, `referrer`, Open Graph complet (url, alt, type) et Twitter Cards, `manifest`, `apple-touch-icon`, `style.css?v=23`.
- JSON-LD : `Organization` + `WebSite` + `WebPage` + `Service` (trois niveaux de préparation) + `FAQPage` (les 6 objections visibles).
- Navigation 8 entrées (Calculatrice et Documents ajoutées) ; pied de page avec adresse, téléphone, année et liste sociale reconstruite.
- Nouvelle section `.calc-teaser` « Le prix usine n'est pas ton coût » → `calculatrice.html`.
- Barre d'action mobile (`.sticky-cta`).

### `score-de-preparation.html`
- JSON-LD : `WebPage` + `BreadcrumbList` + `WebApplication` (gratuit, `price: 0`).
- Lightbox retirée, CTA mobile ajouté, `aria-valuenow` corrigé, `fetch` mort supprimé.
- Stockage `sama-quiz-v3` + migration de `sama-quiz-v2`.

### `comment-ca-marche.html`
- JSON-LD : `WebPage` + `BreadcrumbList` + `HowTo` (6 étapes, `totalTime`, `supply`).
- Lightbox retirée, CTA mobile, `data-sama` sur Calendly/WhatsApp.

### `mon-histoire.html`
- JSON-LD : `WebPage` + `BreadcrumbList` + `AboutPage` + `Person` (fondateur, `worksFor` → Organization).
- Lightbox retirée.

### `preuves.html`
- JSON-LD : `WebPage` + `BreadcrumbList` + `CollectionPage` avec `ItemList` des PDF (`contentUrl`).
- Lightbox conservée (galerie réelle).

### `questions.html`
- JSON-LD : `WebPage` + `BreadcrumbList` + `FAQPage` (8 questions, réponses alignées sur le texte visible).
- Lightbox retirée, CTA mobile.

### `documents.html`
- JSON-LD : `WebPage` + `BreadcrumbList` + `CollectionPage`.
- Bibliothèque PDF (guide 41 pages, présentation de l'équipe, écosystème, documents clients).

### `calculatrice.html` (nouvelle page)
- 8 blocs de saisie, résultats en panneau collant sur mobile, bloc imprimable, sauvegarde locale, partage WhatsApp, copie du détail.
- JSON-LD : `WebPage` + `BreadcrumbList` + `WebApplication` (gratuit).
- Contenu pédagogique : formule expliquée, limites du modèle, lexique (landed cost, CIF/FOB, CBM/LCL/FCL, HS, clearing, marge sur prix de vente).

## 4. Le calcul, et sa vérification

Formule utilisée :

```
coût unitaire = (marchandise + transport + assurance + frais de paiement
                 + droits + TVA + autres prélèvements + dédouanement forfaitaire
                 + port + clearing + livraison locale)
                × (1 + marge de change) / pièces vendables
```

avec `pièces vendables = quantité × (1 − casse − défauts − colis perdus)` et
`prix de vente à m % = coût unitaire / (1 − m)` (marge sur prix de vente, pas sur l'achat).

Cas de contrôle exécuté dans le navigateur (exemple livré avec la page) :

| Poste | USD |
|---|---|
| Marchandise (1 200 × 3,50) | 4 200,00 |
| Transport LCL (8 CBM × 110) + annexes 180 | 1 060,00 |
| Assurance 0,4 % de (marchandise + transport) | 21,04 |
| Paiement TT 1,5 % + 45 fixe | 108,00 |
| **CIF** | **5 281,04** |
| Droits 15 % du CIF | 792,16 |
| TVA 16 % de (CIF + droits) | 971,71 |
| Autres prélèvements 2 % du CIF | 105,62 |
| Dédouanement forfaitaire | 120,00 |
| Port 900 + clearing 350 + inland 1 200 + divers 150 | 2 600,00 |
| **Total hors change** | **9 978,53** |
| Marge de change 8 % | 798,28 |
| **Total rendu boutique** | **10 776,81** |

→ 30 175 069 CDF à 1 USD = 2 800 CDF ; 1 128 pièces vendables (6 % de pertes) ;
**26 751 CDF par pièce**, soit 9,55 USD, **×2,73** le prix usine. Prix conseillé à 50 % : 53 502 CDF.

## 5. Ce qui reste à faire par le propriétaire du site

1. Renseigner les réseaux sociaux dans `config.js` (ou les laisser vides : les liens disparaissent proprement).
2. Décider du domaine : `python3 tools/build.py --base https://<compte>.github.io/sama-sourcing/` pour la phase GitHub, puis `--domain samasourcing.site` si le domaine est acheté.
3. Activer **Enforce HTTPS** dans GitHub Pages (sans quoi le mode hors ligne ne s'active pas).
4. Soumettre `sitemap.xml` dans Google Search Console et Bing Webmaster Tools après la mise en ligne.
