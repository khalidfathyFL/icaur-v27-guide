# iCAUR V27 Egypt Knowledge Base

English + Arabic React + TypeScript static website for an iCAUR V27 owner knowledge base.

## What is included

- Bilingual English + Arabic RTL interface.
- Play RWD / Wild AWD trim selector.
- Search across Arabic, English, and aliases.
- Structured guide data in `src/data.ts`.
- Reusable feature page template with availability, verification, sources, videos, steps, requirements, unavailable conditions, and safety notes.
- Specs, Play vs Wild comparison, videos, sources, and glossary pages.
- Hash routing and relative Vite asset paths for GitHub Pages.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The production files are generated in `dist/`.

## GitHub Pages

Use one of these deployment options:

1. Push the repository to GitHub and configure Pages to deploy from GitHub Actions.
2. Or build locally and publish the contents of `dist/` to the `gh-pages` branch.

Because the site uses hash routes like `#/guides/charging`, direct links work on GitHub Pages without a server rewrite.
