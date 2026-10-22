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

The production output is static HTML in `dist/`. All 62 routes are generated, including 49 individual images and eight videos, so direct links and reloads work without server rewrites. The existing GitHub-to-Vercel integration publishes `main`. Node 24 is pinned through `engines` as supported by [Vercel](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

## Edit

- `src/data/portfolio.ts`: imagery, categories, description, services and contact address.
- `src/data/matylda.ts`: 40 images from Matylda’s supplied portfolio, with project context, contribution credit and Home feature order.
- `src/data/reels.ts`: seven selected public reels, native aspect ratios and original-source links.
- `src/components/Studio.astro`: accessible markup, navigation and enquiry fields.
- `src/scripts/studio.ts`: route/history state, clock, categories and email draft.
- `src/scripts/gallery.ts`: Three.js scenes, motion, picking, captions and media lifecycle.
- `src/styles/global.css`: desktop, tablet and mobile layouts.

Wheel/drag moves the gallery; selecting an image opens its detail. Previous/next, Escape, native links and browser history work. Scroll deformation and velocity are restrained, category blur is removed, and page entrances use small offsets. Reduced motion stops ambient animation. HTML links remain available to keyboard users and as a WebGL fallback.

Book validates fields and opens a `mailto:` draft to `hello@montistudio.co.uk`. The visitor completes sending in their email app. There is no form submission backend, payment collection or simulated delivery confirmation.

Cormorant Garamond, the classic Monti site's serif, is self-hosted for the MONTISTUDIO name, display headings, clock and gallery captions. Inter is self-hosted for body copy, form controls and small interface text. The header is a single uppercase MONTISTUDIO home link at the top left. OFL notices are in `public/fonts/`. Meech's photography, logo, proprietary typeface and application bundles are not shipped.

## Portfolio sources

The Photo gallery contains the nine existing images plus 40 native JPEGs extracted directly from Matylda’s supplied PDF, without PDF page labels or margins. Native source bytes and resolution are preserved in `src/assets/matylda/`; the site generates separate WebP previews (at most 768 × 1152) and detail/fallback images (at most 1440 × 2160), preserving aspect ratio and avoiding enlargement. Project context and source hashes are in `docs/portfolio-images.json`. The CV, personal contact text, PDF and page previews are not shipped.

The added images are credited as Matylda’s prior fashion/styling assistance. Do not describe them as Monti commissions, sole styling or photography.

Video retains the existing film and adds seven selected public reels from Matylda’s profile. `public/reels/` contains H264 full videos, muted lightweight previews and real-frame posters. Source aspect and resolution are preserved without enlargement; landscape work stays landscape. The Outdoor skincare and Ffern website versions omit the credited music track; their original Instagram links remain available. `docs/reel-sources.json` records provenance and processed-file hashes. Signed media URLs, account cookies and credentials are not shipped. Native playback starts only after a visitor presses play and pauses on navigation, backgrounding or page exit.

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
