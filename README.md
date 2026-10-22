# Monti Studio

Portfolio for Caleb Smiler and Matylda Sala's London creative practice. The orbit layout adapts Meech213's gallery mechanics to Monti's existing imagery, film, description and services.

## Run

Use Node 24 (`nvm use`), then:

```sh
npm ci
npm run dev
npm run build
npm run preview
```

The production output is static HTML in `dist/`. All 15 routes are generated, including individual images and the film, so direct links and reloads work without server rewrites. The existing GitHub-to-Vercel integration publishes `main`. Node 24 is pinned through `engines` as supported by [Vercel](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

## Edit

- `src/data/portfolio.ts`: imagery, categories, description, services and contact address.
- `src/components/Studio.astro`: accessible markup, navigation and enquiry fields.
- `src/scripts/studio.ts`: route/history state, clock, categories and email draft.
- `src/scripts/gallery.ts`: Three.js scenes, motion, picking, captions and media lifecycle.
- `src/styles/global.css`: desktop, tablet and mobile layouts.

Wheel/drag moves the gallery; selecting an image opens its detail. Previous/next, Escape, native links and browser history work. Reduced motion stops ambient animation. HTML links remain available to keyboard users and as a WebGL fallback.

Book validates fields and opens a `mailto:` draft to `hello@montistudio.co.uk`. The visitor completes sending in their email app. There is no form submission backend, payment collection or simulated delivery confirmation.

Fonts are self-hosted: Cormorant Garamond for Monti's wordmark and Poiret One for the display interface. OFL notices are in `public/fonts/`. Meech's photography, logo, proprietary typeface and application bundles are not shipped.

## Restore the classic site

The original is preserved at remote tag `monti-classic-2026-10-22`, commit `f13d3573ac37138f74a433565ac28d3270d53613`. The workspace's sibling `archives/RESTORE.md` documents the verified Git bundle, source tar, live snapshot and checksums.

To restore through a reviewable commit, start from a clean checkout of current `main`:

```sh
git restore --source=monti-classic-2026-10-22 --staged --worktree -- .
git commit -m "Restore classic Monti Studio website"
git push origin main
```

Verify the resulting production deployment. This preserves the orbit version in history for a later switch back. Do not reset or force-push history.

See [REA inspection](docs/rea-inspection.md) and [visual/interaction QA](design-qa.md).
