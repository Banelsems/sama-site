#!/usr/bin/env python3
"""Sama Sourcing — outil de cohérence et de bascule d'URL de base.

Le site est 100 % statique : aucun générateur ne construit les pages. Ce script ne
réécrit donc pas le HTML de fond, il ne fait que deux choses :

1. vérifier que la navigation et le pied de page sont identiques sur toutes les pages
   (et que l'URL de base est la même partout : canonical, Open Graph, sitemap, robots) ;
2. changer l'URL de base en une commande, pour passer de
   https://samasourcing.site/ à https://<pseudo>.github.io/sama-sourcing/ (ou l'inverse).

Exemples :

    python3 tools/build.py                      # contrôle seulement, n'écrit rien
    python3 tools/build.py --check              # idem, explicite
    python3 tools/build.py --base https://kabila.github.io/sama-sourcing/
    python3 tools/build.py --domain samasourcing.site
    python3 tools/build.py --domain samasourcing.site --no-cname

Après une bascule, relance simplement ce script sans argument pour vérifier.
"""
from __future__ import annotations

import argparse
import re
import sys
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
CONFIG = ROOT / 'assets' / 'js' / 'config.js'
BASE_RE = re.compile(r"baseUrl\s*:\s*'([^']+)'")
NAV_RE = re.compile(r'<nav class="nav" id="menu".*?</nav>', re.S)
FOOTER_RE = re.compile(r'<ul class="footer-nav".*?</ul>', re.S)
IGNORED = {'404.html'}   # page d'erreur : contenu volontairement allégé


def pages() -> list[pathlib.Path]:
    return sorted(p for p in ROOT.glob('*.html') if p.name not in IGNORED)


def current_base() -> str:
    m = BASE_RE.search(CONFIG.read_text(encoding='utf-8'))
    if not m:
        sys.exit('Impossible de lire site.baseUrl dans assets/js/config.js')
    base = m.group(1)
    return base if base.endswith('/') else base + '/'


def targets() -> list[pathlib.Path]:
    files = pages() + [ROOT / 'sitemap.xml', ROOT / 'robots.txt', ROOT / 'llms.txt', CONFIG]
    return [f for f in files if f.exists()]


def normalise(block: str) -> str:
    block = re.sub(r'\s+', ' ', block)
    block = block.replace(' aria-current="page"', '')
    return re.sub(r'v=\d+', 'v=N', block).strip()


def check(base: str) -> int:
    problems = 0
    ref_nav = ref_foot = None
    for page in pages():
        html = page.read_text(encoding='utf-8')
        nav = NAV_RE.search(html)
        foot = FOOTER_RE.search(html)
        if not nav or not foot:
            print(f'  ✗ {page.name}: navigation ou pied de page absent')
            problems += 1
            continue
        nav_n, foot_n = normalise(nav.group(0)), normalise(foot.group(0))
        if ref_nav is None:
            ref_nav, ref_foot = nav_n, foot_n
        if nav_n != ref_nav:
            print(f'  ✗ {page.name}: navigation différente des autres pages')
            problems += 1
        if foot_n != ref_foot:
            print(f'  ✗ {page.name}: pied de page différent des autres pages')
            problems += 1
        if 'calculatrice.html' not in nav_n:
            print(f'  ✗ {page.name}: la calculatrice n\'est pas dans la navigation')
            problems += 1

    for f in targets():
        text = f.read_text(encoding='utf-8')
        found = set(re.findall(r'https?://[^\s"\'<>)]+', text))
        exempt = ('wa.me', 'calendly.com', 'schema.org', 'sitemaps.org', 'w3.org', 'TON-PSEUDO')
        others = sorted({u for u in found if u.startswith('http') and not u.startswith(base)
                         and not any(e in u for e in exempt)})
        if others:
            print(f'  ✗ {f.relative_to(ROOT)}: URL hors base — {", ".join(others[:4])}')
            problems += 1

    sitemap = (ROOT / 'sitemap.xml').read_text(encoding='utf-8')
    locs = re.findall(r'<loc>([^<]+)</loc>', sitemap)
    def in_sitemap(page: pathlib.Path) -> bool:
        if page.name == 'index.html':
            return any(loc == base or loc == base.rstrip('/') for loc in locs)
        return any(loc.endswith('/' + page.name) for loc in locs)

    missing = [p.name for p in pages() if not in_sitemap(p)]
    if missing:
        print(f'  ✗ sitemap.xml: pages absentes — {", ".join(missing)}')
        problems += 1

    robots = (ROOT / 'robots.txt').read_text(encoding='utf-8')
    if f'Sitemap: {base}sitemap.xml' not in robots:
        print('  ✗ robots.txt: la ligne Sitemap ne pointe pas vers l\'URL de base')
        problems += 1

    print(f'Base actuelle : {base}')
    print(f'Pages         : {len(pages())}')
    print('Contrôle      : ' + ('OK, rien à corriger' if problems == 0 else f'{problems} problème(s)'))
    return 1 if problems else 0


def rewrite(old: str, new: str) -> None:
    if old == new:
        print('URL de base identique : rien à réécrire.')
        return
    touched = 0
    for f in targets():
        text = f.read_text(encoding='utf-8')
        if old not in text:
            continue
        text = text.replace(old, new)
        f.write_text(text, encoding='utf-8')
        touched += 1
        print(f'  · {f.relative_to(ROOT)}')
    err = ROOT / '404.html'
    if err.exists():
        text = err.read_text(encoding='utf-8')
        text = text.replace(f'<base href="{old}">', f'<base href="{new}">')
        err.write_text(text, encoding='utf-8')
        print('  · 404.html (balise base)')
    print(f'{touched} fichier(s) mis à jour : {old} → {new}')


def main() -> int:
    ap = argparse.ArgumentParser(description='Contrôle et bascule d\'URL de base du site Sama Sourcing.')
    ap.add_argument('--base', help='Nouvelle URL de base, avec un slash final (ex. https://pseudo.github.io/sama-sourcing/)')
    ap.add_argument('--domain', help='Domaine personnalisé (ex. samasourcing.site) : base = https://<domaine>/ et fichier CNAME écrit')
    ap.add_argument('--no-cname', action='store_true', help='Avec --domain, ne pas écrire le fichier CNAME')
    ap.add_argument('--check', action='store_true', help='Contrôle seulement (comportement par défaut)')
    args = ap.parse_args()

    old = current_base()
    new = None
    if args.base:
        new = args.base.rstrip('/') + '/'
        if not new.startswith(('http://', 'https://')):
            sys.exit('--base doit commencer par https://')
    elif args.domain:
        domain = args.domain.strip().rstrip('/')
        new = 'https://' + domain + '/'
        if not args.no_cname:
            (ROOT / 'CNAME').write_text(domain + '\n', encoding='utf-8')
            print(f'CNAME écrit : {domain}')

    if new and not args.check:
        rewrite(old, new)
        old = new

    return check(old)


if __name__ == '__main__':
    raise SystemExit(main())
