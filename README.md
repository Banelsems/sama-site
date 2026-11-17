# Site Sama Sourcing — export hors ligne (17 novembre 2026)

Site statique en HTML, CSS et JavaScript simples. Aucun framework, aucun build, aucun serveur nécessaire.

## Ouvrir le site

1. Dézippe le fichier.
2. Ouvre le dossier `sama-site`.
3. Double-clique sur `index.html`. Le site s'ouvre dans ton navigateur, même sans connexion.

## Les pages

| Fichier | Page |
|---|---|
| `index.html` | Accueil |
| `score-de-preparation.html` | Le test « Score de préparation » (12 questions) |
| `comment-ca-marche.html` | Comment ça marche |
| `mon-histoire.html` | Notre histoire |
| `preuves.html` | Preuves (documents et captures masqués) |
| `questions.html` | Questions fréquentes |

## Les dossiers

| Dossier | Contenu |
|---|---|
| `assets/css/` | La feuille de style (`style.css`) |
| `assets/js/` | `main.js` (menu, animations, galerie) et `quiz.js` (le test) |
| `assets/data/` | Le contenu du test : `quiz-data.js` |
| `assets/fonts/` | Les polices Bricolage Grotesque et Figtree, en local (licence SIL Open Font License) |
| `assets/img/` | Photos, captures masquées, icônes, image de partage |
| `docs/` | Les 2 PDF anonymisés (compte rendu de visite, devis) |

## Ce qui a besoin d'Internet

Le site s'affiche entièrement hors ligne. Seuls ces liens ouvrent un service externe quand on clique dessus :

- **Réserver mon appel** → Calendly (`calendly.com/samasourcing/appel-decouverte`)
- **Bouton WhatsApp flottant** et **bouton WhatsApp du résultat du test** → `wa.me`, vers le +86 198 2478 6223
- **Partager le test** → WhatsApp

Le site n'a ni formulaire, ni base de données, ni compte utilisateur. Le test calcule le score dans le navigateur et garde la progression sur l'appareil du visiteur (localStorage). Rien n'est envoyé.

## Modifier le test

Change le texte dans `assets/data/quiz-data.js` (après `window.SAMA_QUIZ = `). C'est le seul fichier qui contient le test : il n'y a pas de copie à tenir à jour.

## Mettre en ligne plus tard

Envoie tout le contenu du dossier `sama-site` à la racine de l'hébergement (par exemple `public_html` chez Hostinger). Les liens `canonical` et l'image de partage pointent déjà vers `https://samasourcing.site/`.

## À compléter

- Liens du pied de page (chaîne WhatsApp, LinkedIn, Instagram, Facebook) : encore `#`.
