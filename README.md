# iCAUR V27 Owner Knowledge Base

A bilingual (English / Arabic) owner, sales, and service reference for the iCAUR V27,
built as a static React + TypeScript site.

**Live:** https://khalidfathyfl.github.io/icaur-v27-guide/

## What is in it

- **Egypt market page** — official launch prices, GB Auto warranty terms, and a
  trim-by-trim equipment matrix for Play RWD and Wild AWD.
- **Interactive centre screen** — a working model of the V27 infotainment system:
  ten settings menus with real toggles, segmented options and actions, a climate
  bar, drive modes, a navigation app, and a three.js 540° surround view.
- **21 structured guides** — each with location, steps, requirements, conditions
  where the feature will not work, safety notes, sources, and videos.
- **Specs, Play vs Wild, reviews, videos, sources, glossary.**
- Language selector (English / عربي / both), light and dark themes, a trim
  selector, and search that works in either language.

## The editorial rule

Evidence from China or another export market is never presented as an Egypt fact.
Every feature carries a verification status per market — `confirmed-egypt`,
`confirmed-export`, `likely`, `verify`, `not-available` — and only the Egypt launch
data in `src/content/egypt.ts` can promote something to "confirmed for Egypt".

## Project layout

```
src/
  app/routes.tsx            Route table
  components/               Shared UI (header, footer, cards, layout primitives)
  content/                  All content, stored bilingually
    types.ts                  Content model
    egypt.ts                  Egypt prices, warranty, equipment matrix
    infotainment.ts           Centre-screen menu tree
    features.ts               The 21 owner guides
  features/
    infotainment/           Screen simulator (state machine + 3D view)
    search/                 Bilingual ranked search
  i18n/                     Language context and translator
  lib/                      Storage, links, hash router
  pages/                    One file per route
  theme/  vehicle/          Theme and trim contexts
```

Every owner-facing string is a `Localized` value (`{ en, ar }`), so the UI reads
the right language directly instead of looking a translation up by its Arabic text.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for more detail.

## Development

```bash
npm install
npm run dev      # http://127.0.0.1:5173
npm run build    # type-check and build to dist/
npm run lint
```

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the site and
publishes `dist/` to GitHub Pages.

The Vite `base` is `'./'` so the build works under any repository name, and routing
is hash-based so deep links survive on Pages without server rewrites.
