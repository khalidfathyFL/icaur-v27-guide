# Architecture

The app is organized around route-level pages, reusable UI components, structured content, and feature modules.

## Top-level flow

- `src/App.tsx` wires global providers and the application shell.
- `src/app/routes.tsx` maps hash routes to page components.
- `src/components/SiteHeader.tsx` and `src/components/SiteFooter.tsx` own the persistent chrome.

## Content

- `src/content/` holds structured data: features, specs, reviews, sources, glossary, videos, Egypt data, and infotainment menu definitions.
- Content is consumed through `src/content/index.ts`, which exposes lookup helpers such as `getFeature`, `getSources`, and `getVideos`.

## State

- `src/i18n/` owns language selection and localized text helpers.
- `src/theme/` owns light/dark mode.
- `src/vehicle/` owns Play/Wild trim selection.

## Pages

- `src/pages/` contains route-level UI:
  - `HomePage.tsx`
  - `GuidesPage.tsx`
  - `FeaturePage.tsx`
  - `SpecsPage.tsx`
  - `LibraryPages.tsx`
  - `EgyptPage.tsx`

## Feature Modules

- `src/features/infotainment/` contains the interactive V27 screen simulator and its local reducer-style state.
- `src/features/search/` contains feature search indexing/matching.

## Shared UI

- `src/components/layout.tsx` contains page layout primitives.
- `src/components/FeatureGrid.tsx` renders guide cards.
- `src/components/VerificationBadge.tsx` renders verification and trim status consistently.

## Deployment

The site uses Vite hash routing and `base: './'` so it can be hosted on GitHub Pages without rewrite rules.
