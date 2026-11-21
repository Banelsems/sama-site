# Marchés & taxi — passe UX/UI v3 (21 novembre 2026)

Objectif : passer de **3,85 / 5** à **≥ 4,5 / 5** sur les 10 heuristiques de Nielsen,
sans framework, sans dépendance et sans régression FR/EN ni 1078 / 390 px.

## 1. Changements priorisés

### Quick wins (livrés dans cette passe)

1. **Overlay chauffeur → vraie boîte de dialogue** (`role="dialog"`, `aria-modal`, focus initial sur le titre, piège à focus, restauration du focus, ✕ visible).
2. **Recherche partagée et persistante** sur `#/`, `#/all`, `#/city/*`, `#/cat/*` + filtre **« Ouvert maintenant »** à côté de **« Épingle vérifiée seulement »** + tri (ordre de liste / ouverts d'abord / près de l'aéroport).
3. **Fiche marché nettoyée** : un seul bloc horaires, un seul lien Amap, toast favori durable avec **« Annuler »**, favori avec libellé visible sur la fiche et infobulle sur les cartes.
4. **Zéro collision `data-field`** : le bouton mode terrain utilise `data-field-toggle`, le conteneur garde `data-field="on|off"`. Sans ce correctif, **tout clic** dans l'app déclenchait le mode terrain (bug bloquant corrigé).
5. **Barre de sous-navigation mobile** : onglets sur une ligne, langue + mode terrain en dessous (plus de retour à la ligne au milieu des onglets).
6. **Croix de recherche unique** : la croix native de `input[type=search]` est masquée, le bouton maison reste.
7. **Espacement** : `hero + section` et `page-hero + section` passent de 112 px à 36 px (28 px en mobile).
8. **Anneau de focus jaune** sur champs, boutons, chips, liens (jamais supprimé).

### Medium (structurel, fait ici ou amorcé)

- Légende permanente des badges + définition de « épingle », « Amap », « gros / détail / mixte ».
- Date de vérification terrain visible sur **chaque fiche** (« Vérifié sur place · novembre 2026 » pour une épingle, « Adresse vérifiée · novembre 2026 » sinon).
- Avertissement « nouvel onglet » sur Amap (texte sous le bouton + `aria-label`).
- `#/all` intégré à la navigation principale (4ᵉ onglet « Les 29 marchés ») et aux CTA du hero.
- Suggestions de frappe (Levenshtein ≤ 1–2) sur villes, marchés et catégories.
- Mode terrain persistant (`localStorage`), contraste renforcé, cibles ≥ 58 px.
- Feuille taxi multi-marchés imprimable en 1 clic (table marché / adresse zh / km / tarif).
- Historique de recherche léger (5 entrées, dédupliqué, effaçable).
- Notes personnelles par favori (stockage local, debounce 600 ms + toast).

### Long terme

- Photos de rue datées par marché (preuve terrain), avec crédit et date.
- Vérification collaborative : signaler une adresse fausse sans compte (mailto pré-rempli).
- Version « carnet de route » : 3–5 marchés, ordre optimisé, export PDF.
- Traduction des noms de métro en EN (`sortie D` → `exit D`) dans la donnée source.
- Tests automatisés Playwright (dialog, focus, filtres) branchés sur `tools/build.py`.

## 2. Spécifications des 3 correctifs prioritaires

### 2.1 Dialogue chauffeur

HTML (`marches.html`) :

```html
<div id="driver" class="driver" role="dialog" aria-modal="true"
     aria-labelledby="driverName" aria-describedby="driverAddr driverHint" hidden>
  <button class="driver-x" id="driverX" type="button" data-close-driver aria-label="Fermer">✕</button>
  <p class="hint" id="driverHint"></p>
  <h2 class="zh-name" id="driverName" tabindex="-1"></h2>
  <p class="zh-addr" id="driverAddr"></p>
  <p class="hint" id="driverSub"></p>
  <button class="btn btn-yellow close" id="driverClose" type="button" data-close-driver>Fermer</button>
</div>
```

JS :

```js
let lastFocus = null;
function openDriver(id){
  lastFocus = document.activeElement;
  document.getElementById('driverClose').textContent = t('close');
  document.getElementById('driverX').setAttribute('aria-label', t('close'));
  el.hidden = false;
  document.body.style.overflow = 'hidden';
  document.getElementById('driverName').focus();
  document.addEventListener('keydown', trapDriver);
}
function trapDriver(e){
  if (e.key !== 'Tab') return;
  const list = [...el.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
    .filter(n => !n.disabled && n.offsetParent !== null);
  if (!list.length) return;
  const first = list[0], last = list.at(-1);
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}
function closeDriver(){
  if (el.hidden) return;
  el.hidden = true;
  document.body.style.overflow = '';
  document.removeEventListener('keydown', trapDriver);
  if (lastFocus?.focus) lastFocus.focus();
  lastFocus = null;
}
```

CSS : `.driver-x { position: fixed; top: 18px; right: 18px; width: 44px; height: 44px; border-radius: 50%; border: 1px solid rgba(255,255,255,.28); background: rgba(255,255,255,.08); color: var(--paper); }`
+ `:focus-visible { outline: 3px solid var(--yellow); outline-offset: 2px; }`

### 2.2 Recherche partagée + filtres

- État unique : `state.q`, `state.openOnly`, `state.allPin`, `state.sort`, persistants pendant la session de navigation (pas de reset au changement de vue).
- `searchBar()` rend `<label class="visually-hidden" for="q">`, `#q` (`type="search"`, `enterkeyhint="search"`), un bouton `[data-search-clear]` et la rangée d'historique `[data-hist]`.
- `filterBar(chips)` rend deux `input[type=checkbox]` (`#openOnly`, `#pinOnly`) dans des `<label class="check-chip">`, un `select#sortSel` avec `aria-label`, et le bouton `[data-print-sheet]`.
- `filtered(list)` applique dans l'ordre : recherche (`searchHits`), épingle, ouvert maintenant, tri.
- `countLine` est un `<p id="countLine" role="status" aria-live="polite">` (« 12 / 29 marchés » ou « 1 résultat pour « baima » »).
- La saisie utilise `isComposing` pour ne pas relancer un rendu en composition IME, puis restaure focus + caret.

### 2.3 Fiche marché

- Un seul `kv-row` « Horaires | 08:00–18:00 » : le badge ouvert/fermé vit dans `.mk-status`, pas dans le tableau.
- Un seul lien Amap (`target="_blank" rel="noopener"`, `aria-label` « Ouvrir dans Amap (nouvel onglet) », `↗`) + `.newtab-note`.
- `data-copy-full` : carte adresse + barre sticky mobile (une seule occurrence visible à la fois, `sticky-bar` masquée ≥ 620 px).
- `toggleFav` : `aria-pressed`, libellé visible, `toast(t('favAdded'), t('undo'), undoFn)` — 5,2 s, bouton `[data-toast-act]`, puis `favUndone`.
- Notes : `textarea[data-note]` avec `<label>` explicite, debounce 600 ms, toast discret « Note enregistrée ».

## 3. Micro-copy FR / EN

| Clé | FR | EN |
|---|---|---|
| `legendTitle` | Légende | Legend |
| `openNow` / `closedNow` | Ouvert / Fermé | Open / Closed |
| `legendOpen` | = maintenant, à l'heure de Chine (UTC+8). | = right now, China time (UTC+8). |
| `pin` | Épingle vérifiée | Verified pin |
| `legendPin` | = position relevée sur Amap, vérifiée sur place. | = position taken from Amap, checked on site. |
| `noPin` | Épingle à confirmer | Pin to confirm |
| `legendNoPin` | = position estimée par le nom : vérifie l'entrée sur place. | = position estimated from the name: check the entrance on site. |
| `legendAmap` | Amap = la carte utilisée en Chine (l'équivalent de Google Maps) ; le lien s'ouvre dans un nouvel onglet. | Amap = the map people use in China (the local Google Maps); the link opens in a new tab. |
| `legendType` | Gros = réservé aux pros ; détail = vente à l'unité ; mixte = les deux. | Wholesale = trade only; retail = sold by the unit; mixed = both. |
| `newTab` | Ouvrir dans Amap : nouvel onglet | Open in Amap : new tab |
| `verifiedOn` | Vérifié sur place · novembre 2026 | Verified on site · November 2026 |
| `verifiedAddr` | Adresse vérifiée · novembre 2026 | Address verified · November 2026 |
| `favAdd` / `favRemove` | Ajouter aux favoris / Retirer des favoris | Add to favourites / Remove from favourites |
| `favAdded` / `favRemoved` / `favUndone` | Ajouté à tes favoris / Retiré de tes favoris / Changement annulé | Added to your favourites / Removed from your favourites / Change undone |
| `undo` | Annuler | Undo |
| `openOnly` | Ouvert maintenant | Open now |
| `pinOnly` | Épingle vérifiée seulement | Verified pin only |
| `sortLabel` | Trier | Sort |
| `sortDefault` / `sortOpen` / `sortAirport` | Ordre de la liste / Ouverts d'abord / Près de l'aéroport | List order / Open first / Near the airport |
| `fieldMode` | Mode terrain : contraste élevé, boutons plus grands, animations réduites. | Field mode: higher contrast, bigger buttons, fewer animations. |
| `printSheet` | Feuille taxi (imprimer) | Taxi sheet (print) |
| `typoHint` | Tu voulais dire : | Did you mean: |
| `readyTomorrow` | prêts pour demain | ready for tomorrow |
| `favNote` / `favNotePh` | Ma note (privée, sur cet appareil) / Ex. : « demander le prix au carton » | My note (private, on this device) / e.g. "ask for the carton price" |
| `searchEmpty` | Rien trouvé. Essaie le nom chinois, ou parcours les villes ci-dessous. | Nothing found. Try the Chinese name, or browse the cities below. |
| `openNone` | Aucun marché ouvert à cette heure : regarde « Fermé » ou change de ville. | No market open right now: check "Closed" or pick another city. |

Réflexif : « 3 marchés prêts pour demain » (en-tête des favoris), « Adresse vérifiée · novembre 2026 » (preuve, pas promesse), ton tutoiement expert.

## 4. Critères d'acceptation (mesurés)

| Critère | Cible | Résultat |
|---|---|---|
| Dialogue : `role=dialog`, `aria-modal=true`, focus initial | 100 % | ✔ `H2#driverName`, focus dans le dialogue |
| Tab / Shift+Tab restent dans le dialogue | boucle fermée | ✔ 5 Tab → « Fermer », toujours dans `#driver` |
| Échap ferme et rend le focus au déclencheur | 100 % | ✔ focus → « Montrer au chauffeur », `body.overflow` restauré |
| Recherche présente sur `#/`, `#/all`, `#/city/*`, `#/cat/*` | 4/4 | ✔ |
| Requête conservée en changeant de vue | valeur identique | ✔ « baima » → `#/city/guangzhou` : 1 résultat |
| « Ouvert maintenant » filtre réellement | compteur cohérent | ✔ 29 → 28 marchés, 6 groupes |
| Fiche : horaires affichés une seule fois | 1 | ✔ 1 occurrence de « 08:00 » |
| Amap : un seul lien, nouvel onglet annoncé | 1 + texte | ✔ `target=_blank`, `rel=noopener`, note visible |
| Favori : toast durable + Annuler | action visible ≥ 5 s | ✔ « Ajouté à tes favoris | Annuler » → « Retiré de tes favoris » |
| Suggestions de frappe | ≥ 1 sur faute simple | ✔ « yiwuu » → « Yiwu » → 7 résultats |
| `#/all` dans la navigation | lien + `aria-current` | ✔ « Les 29 marchés », actif sur `#/all` |
| FR/EN : mêmes clés | 0 écart | ✔ 156 / 156 |
| Débordement horizontal 1078 / 390 px | 0 px | ✔ 0 / 0 |
| Console | 0 erreur | ✔ 0 sur 8 routes |
| Build + validation | OK / 0 erreur | ✔ 12 pages, 13 fichiers, 0 erreur |
| Focus visible jaune | 100 % des contrôles | ✔ boutons, champs, selects |

Note : le libellé « sortie D » reste français dans la donnée métro (chaîne source) — à traiter côté données, pas côté interface.
