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

## 5. Menu Outils et deuxième calculateur (20 novembre 2026)

Demande : un vrai menu « Outils » qui contient la calculatrice et les documents, et un **deuxième** calculateur en plus de l'existant, inspiré d'applications déjà publiées sur un autre lien.

### 5.1 Ce qui a été lu dans les trois liens fournis

Les liens 1 et 2 ouvrent la **même** application (`app_17jcc4k1178`, « SAMA-Calculateur ») : seule l'ancre change dans l'URL. Le troisième (`app_17jcbuyc4xj`, « sama-markets ») est une autre application. L'export du code source demandait un droit d'édition que ce compte n'a pas ; tout a donc été lu à l'écran, vue par vue.

| Source | Ce qui était dedans | Retenu ? |
|---|---|---|
| SAMA-Calculateur — vue « Prix & change » | plusieurs lignes d'articles, saisie en CNY, taux du courtier avec paliers, **commission cachée** dans une fiche interne et une proforma | **Non** : l'intérêt de cette vue est justement de masquer la commission au client. La publier revient à publier la marge. Le site dit l'inverse : tout est montré, rien n'est gonflé. |
| SAMA-Calculateur — vue « Transport / CBM » | CBM par colis (L × l × H ÷ 1 000 000), règle **W/M** (1 m³ = 1 000 kg), **poids volumétrique** (1 m³ = 167 kg, soit 6 000), facturation au CBM ou au kg | **Oui**, c'est la base du nouveau calculateur : mêmes formules, mêmes unités, calcul vivant à chaque frappe |
| SAMA-Calculateur — vue « Historique » | export CSV des calculs passés | Non : le site n'a pas de stockage serveur, et cinq brouillons suffisent dans `localStorage` |
| SAMA-Calculateur — aide et formules | panneau repliable expliquant chaque formule | Oui, sous forme de lexique fixe en bas de page (six entrées) plutôt que d'un tiroir |
| sama-markets | 29 marchés dans 6 villes, position, tarifs officiels de taxi | Non **pour cette livraison** : les adresses de marché demandent une vérification terrain, et les tarifs de taxi changent. À reprendre plus tard si le besoin est confirmé. |

Rien de la vue « Prix & change » n'a été copié : ni le champ de commission cachée, ni la proforma. Le nouveau calculateur ne calcule que ce que le transitaire facture réellement, et le dit.

### 5.2 La navigation

- Sept entrées partout : Accueil · Le test · **Outils ▾** · Comment ça marche · Notre histoire · Preuves · Questions. Le pied de page suit la même liste, avec `outils.html`.
- « Outils » est un bouton, pas un lien : `aria-expanded`, `aria-controls`, `aria-haspopup`. Il ouvre trois entrées (Vrai prix d'une pièce, Transport & CBM, Documents) plus une ligne « Tous les outils » vers `outils.html`.
- Fermeture au clic extérieur, à `Échap` (le focus retourne sur le bouton), et après le choix d'un lien. Survolement automatique seulement au-dessus de 1120 px et sur un appareil qui a un pointeur.
- La pastille jaune « page courante » est posée à l'exécution par `main.js`, pas écrite dans le HTML : `tools/build.py` compare les blocs de navigation entre pages et aurait signalé la différence.

### 5.3 La page `calcul-transport.html`

Modes : groupage (LCL, au CBM ou à la tonne, minimum facturé), conteneur 20′ et 40′ (au conteneur), aérien (au kg taxable, minimum 45 kg), express. Entrées : lignes de colis (nom, quantité, L, l, H, kg), tarif, nombre de conteneurs, minimum, diviseur volumétrique (6 000 ou 5 000), annexes. Sorties : total CBM, poids réel, poids volumétrique, kg taxables, fret, total, coût au kg, au CBM, au colis, comparaison LCL / 20′ / 40′, alertes.

Vérifié à la main sur l'exemple par défaut, 12 colis de 60 × 50 × 40 cm et 18 kg : 1,440 m³, 216,0 kg, 158,40 $ de fret, 338,40 $ avec 180 $ d'annexes, 1,44 CBM facturé, 1,57 $/kg, 235 $/m³, 28,20 $/colis ; comparaison 338 $ (groupage) contre 3 980 $ (20′) et 5 380 $ (40′), « le moins cher » sur le groupage.

Le calculateur existant n'a pas bougé : même page, mêmes calculs, mêmes champs. Un bouton du nouveau calculateur passe le relais à l'ancien (`?fret=&annexes=&mode=&src=fret`), qui pré-remplit son transport forfaitaire et ses annexes. Sans `src=fret`, rien n'est lu : un lien partagé ne peut pas modifier un brouillon enregistré.

Onze pages au total (plus la 404) ; les deux nouvelles sont dans `sitemap.xml`, `sw.js` et `llms.txt` : `outils.html` et `calcul-transport.html`, avec `og-transport.jpg` pour le partage.

## 6. Menu Bibliothèque et calculatrices simplifiées (20 novembre 2026)

Deux demandes : un menu « Bibliothèque » qui reprend le test et les documents pour laisser « Outils » aux seules calculatrices ; et des calculatrices réellement utilisables par un client qui n'est pas à l'aise avec l'informatique.

### 6.1 La navigation

- Sept entrées partout : Accueil · **Outils ▾** · **Bibliothèque ▾** · Comment ça marche · Notre histoire · Preuves · Questions. Pied de page identique, avec `outils.html` et `bibliotheque.html`.
- « Outils » ouvre deux entrées (Vrai prix d'une pièce, Transport & CBM) et « Tous les outils ». « Bibliothèque » ouvre Le test de préparation et Les documents, plus « Toute la bibliothèque ». Ouvrir un panneau ferme l'autre : une seule fonction, `navGroups`, traite les deux.
- La pastille « page courante » reste posée à l'exécution par `main.js`, jamais écrite dans le HTML : `tools/build.py` compare les blocs de navigation entre pages.
- Nouvelle page `bibliotheque.html` : deux cartes d'outils, « Dans quel ordre », « Ce que la bibliothèque ne fait pas », avec `CollectionPage`, `BreadcrumbList` et `ItemList` en JSON-LD. `outils.html` perd sa carte Documents et renvoie vers la Bibliothèque.

### 6.2 Le coût de revient : trois questions, puis « Ajuster »

Le problème n'était pas le calcul, c'était le formulaire : trente-quatre champs d'un coup, dont la moitié que le client ne connaît pas (diviseur volumétrique, code HS, THC). La page est réorganisée, pas simplifiée au rabais.

| Bloc | Contenu | Statut |
|---|---|---|
| 1. Ton produit | prix usine, devise de la facture, quantité | visible, obligatoire |
| 2. Il arrive comment ? | mode, volume, ou le total du devis | visible, pré-rempli |
| 3. Où tu vends | pays, devise de vente, taux | visible, pré-rempli |
| 4. Ajuster les prix, la douane et les frais | marge de change, tarif et annexes, douane, paiement et assurance, port, pertes, prix de vente | **replié** dans un `<details>`, sept réglages déjà remplis |

- Les libellés des modes sont passés en langage courant : « Bateau, groupage — je paie au m³ (le plus courant) », « Avion — je paie au kilo », etc.
- Un lien du bloc transport mène au calcul du volume : « Tu ne connais pas le volume ? Calcule-le en 30 secondes ».
- Aucun identifiant n'a changé : `calculatrice.js` lit toujours les mêmes trente-quatre `id`, le calcul, le stockage local et le pont `?fret=` sont intacts.

### 6.3 Le fret : les cartons d'abord, le tarif du transitaire ensuite

- Ordre revu : **1. Tes cartons** (une ligne par type : nombre, longueur, largeur, hauteur en cm, poids d'un carton) → **2. Il part comment ?** → **3. Les frais en plus** (annexes) → **4. Ajuster le prix du transitaire**, replié.
- Le champ « Désignation » devient « Produit » et passe en facultatif ; « Ajouter un colis » devient « J'ai plusieurs types de cartons ». Les libellés des cellules sont abrégés (Cartons, Long., Larg., Haut., Poids) pour tenir sur un écran de téléphone.
- Le panneau replié contient le prix au m³, le nombre de conteneurs, le minimum facturé, le diviseur volumétrique et la règle W/M, avec l'explication « Pourquoi 1 m³ = 167 kg ? ».

### 6.4 Vérifications refaites après la refonte

- Valeurs par défaut du coût de revient, stockage local vidé : 4 200 $ de marchandise, 1 060 $ de transport, CIF 5 281,04 $, total 10 776,81 $ (dont 798,28 $ de change), **30 175 069 CDF**, 1 128 pièces vendables, **26 751 CDF par pièce** (9,55 $), ×2,73 le prix usine, 38 216 / 53 502 / 133 755 CDF à 30, 50 et 80 %. Identiques aux chiffres de référence.
- Fret par défaut, stockage local vidé : 1,440 m³, 216,0 kg, 158,40 $ de fret, 338,40 $ avec annexes, 1,44 CBM facturé, 1,57 $/kg, 235 $/m³, 28,20 $/colis, comparaison 338 / 3 980 / 5 380 $.
- `python3 tools/build.py` : 11 pages à l'époque, aucun écart. Contrôle des liens, des `id` dupliqués et des références `aria` : 0 erreur, 0 alerte.
- Rendu contrôlé à 390 px et en bureau : les trois blocs visibles tiennent sans débordement horizontal, le panneau « Ajuster » s'ouvre et referme proprement, la comparaison des modes reste lisible.

## 7. Troisième outil : « Marchés & taxi » (21 novembre 2026)

L'application « SAMA Markets » (29 marchés de gros, 6 villes, 12 catégories, épingle Amap, estimation de taxi, favoris, FR/EN) devait entrer dans le menu Outils du site — pas comme un cadre embarqué, mais comme une vraie page du site, avec ses propres styles, sa CSP et son hors ligne.

### 7.1 Ce qui a été refusé, et pourquoi

Le README de l'application proposait de la reprendre telle quelle. Trois obstacles l'interdisaient :

| Obstacle | Décision |
|---|---|
| L'application charge ses polices chez `miaoda.feishu.cn` | remplacées par `assets/fonts/fonts.css`, servies en local (aucune requête tiers) |
| Elle porte un `<script>` en ligne, bloqué par `script-src 'self'` | script extrait dans `assets/js/marches.js`, chargé en `defer` |
| Ses classes `.btn`, `.card`, `.nav`, `.section` écraseraient celles du site | toute sa feuille est réécrite sous `.mkt-app` (voir 7.2) |

Les deux autres solutions (iframe, ou recopie en renommant chaque classe) ont été écartées : la première casse le référencement, le hors ligne et la hauteur de page ; la seconde demande de renommer près de 200 sélecteurs à la main, avec un risque de collision à chaque classe oubliée.

### 7.2 Comment la feuille de style a été reprise

Un script de conversion (`build_marches.py`, hors du dépôt) découpe le fichier unique de l'application et applique trois règles :

- chaque sélecteur reçoit le préfixe `.mkt-app` — `.btn` devient `.mkt-app .btn`, `body` devient `.mkt-app` ; la spécificité (0,2,0) passe devant celle du site, donc un `.card` de l'annuaire reste un `.card` d'annuaire ;
- `html` et `*` sont supprimés (ils viseraient toute la page), les `@media` sont traités en récursif, les `@keyframes` restent globales sous leurs noms propres (`spin`, `rise-safe`, `pop`) ;
- le bloc `:root` est conservé tel quel : ses variables (`--night`, `--paper`, `--line`…) sont déjà celles du site, et les redéclarer sous `.mkt-app` les aurait figées pour toute la page.

Par-dessus, une trentaine de lignes d'adaptation : la barre de l'application (noire, collante, `.site-header`) devient une sous-barre claire et statique sous la navigation du site ; le hero et le `page-hero` de l'app perdent la moitié de leur réserve verticale ; sous 720 px, ses trois liens (Villes, Taxi, À propos) passent sur une seconde ligne au lieu de disparaître — sans eux, un client au téléphone ne peut plus changer d'outil depuis le haut de la page.

### 7.3 La page `marches.html`

- **Ce que le visiteur voit d'abord** : la barre du site, puis celle de l'application (Villes · Taxi · À propos · FR/EN), puis le hero de l'application — qui est déjà écrit pour ce sujet, d'où l'absence de second hero.
- **L'annuaire en clair**, sous l'application : les six villes en `<details>`, les 29 marchés avec le nom chinois, le pinyin, l'adresse en chinois, le quartier, le métro, les horaires, le type (gros / gros et détail) et la note de terrain. Cette partie est générée à partir de `data/markets.json` : elle reste lisible sans JavaScript, se copie et s'imprime, et donne aux moteurs de recherche le contenu que les routes `#/…` ne leur donnent pas.
- **« Ce que cette page ne fait pas »** : trois cartes du site (négociation, vérification du fournisseur, réservation) pour couper court à ce que les clients imaginent.
- **Le pied de page du site**, le CTA final et le bouton WhatsApp restent ceux des autres pages. La barre d'action collante du site a été retirée : sur une fiche marché, l'application a déjà la sienne, et deux barres se superposaient en bas d'écran.
- JSON-LD : `Organization` et `WebSite` repris de l'accueil, plus `WebPage`, `BreadcrumbList`, `ItemList` des six villes et un `WebApplication` (`SAMA Markets`, gratuit) qui décrit l'outil.

### 7.4 Deux corrections apportées au comportement de l'application

- **La recherche ne trouvait que le nom du marché.** Taper « yiwu » ou « meubles » ne donnait rien, alors que c'est ce qu'un client tape. Le filtre couvre maintenant le nom, le pinyin, l'adresse, le quartier, la ville et les catégories, et ignore les accents (« pekin » trouve Pékin). Le correctif est appliqué par le générateur, pas à la main.
- **« 1 marchés »** dans les favoris : pluriel corrigé (`market` / `markets`).

### 7.5 Vérifications

- `python3 tools/build.py` : 12 pages, navigation et pied de page identiques, sitemap à jour, aucun écart.
- Contrôle des liens, des `id` dupliqués et des références `aria` : 13 fichiers, 0 erreur, 0 alerte.
- Dans le navigateur, en local (`http://localhost:8766/marches.html`) : liste des villes, recherche par pinyin et par chinois, fiche marché, copie de l'adresse (« Adresse copiée »), ouverture d'Amap, écran plein écran pour le chauffeur, estimateur de taxi (Guangzhou, aéroport de Baiyun, 31 km : 98–115 ¥), bascule FR/EN, favoris (étoile puis « Mes marchés »), annuaire déplié, menu Outils à trois entrées au-dessus de 1120 px.
- En 390 px : aucun débordement horizontal (`scrollWidth` = 390). La barre d'action collante de l'application débordait de 15 px (boutons du site trop larges) ; ses boutons sont maintenant compressibles.
- `sw.js` passe en `sama-2026-11-21a` et met en cache `marches.html`, `marches.css`, `marches.js` (données et logique).

### 7.6 Ce que la page laisse volontairement de côté

- Onze marchés sur vingt-neuf n'ont pas d'épingle vérifiée : la fiche affiche « épingle à confirmer » et le bouton Amap propose une recherche par nom, pas un point sur la carte. C'est une information, pas un défaut à masquer.
- Aucun prix, aucune marge, aucun devis : l'annuaire donne des portes, pas des tarifs.
- L'application garde sa propre navigation par ancre (`#/city/…`, `#/m/…`) : ces URL ne sont pas indexées individuellement, c'est pourquoi l'annuaire en clair existe en bas de page.

## 8. Ce qui reste à faire par le propriétaire du site

1. Renseigner les réseaux sociaux dans `config.js` (ou les laisser vides : les liens disparaissent proprement).
2. Décider du domaine : `python3 tools/build.py --base https://<compte>.github.io/sama-sourcing/` pour la phase GitHub, puis `--domain samasourcing.site` si le domaine est acheté.
3. Activer **Enforce HTTPS** dans GitHub Pages (sans quoi le mode hors ligne ne s'active pas).
4. Soumettre `sitemap.xml` dans Google Search Console et Bing Webmaster Tools après la mise en ligne.
