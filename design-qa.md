# Monti orbit — visual and interaction QA

Date: 22 October 2026. Browser-rendered static implementation: `http://127.0.0.1:4322/`. Source: `https://www.meech213.com/`. Brief: reproduce its layout/motion with Monti's existing imagery and text.

final result: passed

## Evidence and normalization

Evidence root: `/Users/calebsmiler/Documents/ChatGPT/Monti/work/screenshots/`.

| State | Source truth | Final implementation | Combined comparison |
|---|---|---|---|
| Home desktop | reference-home-desktop.png | implementation-home-desktop-final.png | comparison-home-desktop-final.jpg |
| Photo desktop | reference-photo-desktop.png | implementation-photo-desktop-final.png | comparison-photo-desktop-final.jpg |
| About desktop | reference-about-desktop-viewport.png | implementation-about-desktop-final.png | comparison-about-desktop-final.jpg |
| Book desktop | reference-book-desktop.png | implementation-book-desktop-final.png | comparison-book-desktop-final-v2.jpg |
| Home mobile | reference-home-mobile.png | implementation-home-mobile-final.png | comparison-mobile-final-v5.jpg, top left pair |
| Photo mobile | reference-photo-mobile.png | implementation-photo-mobile-final.png | comparison-mobile-final-v5.jpg, bottom left pair |
| About mobile | reference-about-mobile-normalized.png | implementation-about-mobile-v2.png | comparison-mobile-final-v5.jpg, top right pair |
| Book mobile | reference-book-mobile-normalized.png | implementation-book-mobile-final.png | comparison-mobile-final-v5.jpg, bottom right pair |
| Video mobile | reference-video-mobile.png | implementation-video-gallery-mobile-final.png | comparison-video-mobile-final.jpg |

Desktop CSS viewport and final pixels: 1280 × 720. Mobile CSS viewport and final pixels: 390 × 844. The application canvas may render at device density 2; comparison PNGs are at one image pixel per CSS pixel. Mobile reference About/Book captures required a tab-specific emulated viewport. The oversized 780 × 1688 surface captures contain the 390 × 844 CSS viewport in their upper-left region; that region was cropped without resampling, verified against DOM image bounds (portrait x≈110.6, y≈109.0, width≈168.8). They were not stretched to fit. Earlier full-page About/Book images and mismatched viewport captures were excluded from the final comparison.

Each comparison contains source on the left and Monti on the right. The four-pair mobile board is 1560 × 1688; each pair is 780 × 844. Desktop pairs are 2560 × 720. The focused, readable navigation comparison is `comparison-navigation-focus.png` (480 × 200 per side). Forms and mobile typography are readable at native size in the mobile board and individual captures.

Motion is not frame-synchronized between independent sites. Compare scene geometry, scale, spacing and controls rather than which moving card occupies an exact pixel. Content and branding intentionally differ according to the brief.

## Findings and comparison history

- **[P2, fixed] Development toolbar intruded on the reference layout.** Initial `implementation-home-desktop-v1.png` / `comparison-home-desktop-v1.jpg`. Disabled Astro's dev toolbar and validated the static build. Post-fix: `implementation-home-desktop-final.png`, `comparison-home-desktop-final.jpg`.
- **[P2, fixed] Photo project captions were absent.** Initial `implementation-photo-desktop-v1.png`. Added diagonal white category/image identifiers as textured labels, refreshed after font loading, preserved picking through labels. Post-fix: `implementation-photo-desktop-final.png`, `implementation-photo-mobile-final.png` and their combined comparisons.
- **[P2, fixed] Contact button's left edge intersected the clock's Book target.** Initial `implementation-book-desktop-v1.png`. Reduced form offset/row gaps. Post-fix: `implementation-book-desktop-final.png` / `comparison-book-desktop-final-v2.jpg`; DOM hit-testing at 5%, 25%, 50%, 90% across the button resolves to the button.
- **[P2, fixed] Mobile About flex compression put services into the clock area.** Initial `implementation-about-mobile-final.png`. Prevented portrait/copy flex shrinking and stacked the service image before service text. Post-fix: `implementation-about-mobile-v2.png` and `comparison-mobile-final-v5.jpg`; scrolling exposes services and email above the clock, with no horizontal overflow.
- **[P2, fixed] Mobile native video began beneath the Back link.** Moved the mobile player center from 45% to 49% of the viewport, leaving Back above it and controls clear of the clock. Evidence: `implementation-video-mobile-final.png`. Native video also has an accessible name.
- **[P2, fixed] A desktop portrait-width experiment over-cropped Monti's image.** `implementation-about-desktop-v2.png` / `comparison-about-desktop-v2.jpg`. Checked actual source image bounds: x≈889.6, width≈364.8, height≈547.2 at 1280 × 720. Restored the 30% image track; Monti's final x=886, width=369. Post-fix: `implementation-about-desktop-final.png`, `comparison-about-desktop-final.jpg`.
- **[P2, fixed] Video lacked the reference's diagonal project identification.** Extended caption rendering to Video, using the truthful label Fashion / Film. Post-fix: `implementation-video-gallery-mobile-final.png`, `comparison-video-mobile-final.jpg`. Selecting the caption opens `/video/film`; Escape returns to Video.

No actionable P0/P1/P2 findings remain for the adapted brief.

## Required fidelity surfaces

1. **Fonts/typography:** fine geometric display, uppercase navigation, small neutral UI labels, diagonal captions and display hierarchy were compared at native size. Poiret One replaces proprietary Ceraph; Monti's existing Cormorant wordmark replaces Meech's logo. These are deliberate identity/licensing adaptations, not claims of identical font outlines. Desktop/mobile line lengths reflect Monti's longer description. Clock baseline offsets were refined after the initial comparison. Fonts are self-hosted and OFL notices retained.
2. **Spacing/layout rhythm:** home orbit/card positions, photo strip angle/contain-fit, clock anchor/radii, header/footer placement, portrait grid, mobile portrait 168 × 253 at y=109 and contact layout were checked. Desktop About image bounds now match within a few pixels. Tablet 768 × 1024 Photo has document width 768; all category buttons fit, rightmost edge≈742.7. Mobile document width is 390 with scrolling confined to content where required.
3. **Colors/tokens:** paper `#f5f4f1`, dark ink, faint inactive clock labels, white image captions and thin form rules preserve the reference hierarchy. Active navigation and keyboard focus remain distinct. No added gradients, decorative cards or unrelated accent colors.
4. **Image quality/assets:** all deployed photography and film derive from the original Monti site. Astro emits 1440-wide WebP images; gallery planes preserve native proportions. The About portrait is not widened to fill a landscape frame. Native film retains the supplied original; the muted gallery preview is a smaller derivative. Monti's own wordmark is retained; no Meech imagery/logo or recovered application bundle is deployed.
5. **Copy/content:** original Monti description/services/contact, Caleb Smiler & Matylda Sala, and London identity. Category/image identifiers describe images rather than fabricated commissions. Source-specific biography, payment terms, clients and social links are not substituted into Monti's business. Book explicitly says it opens an email draft; no fake send confirmation.

## Interaction and runtime checks

- Desktop home wheel changes the orbit; actual canvas picking opens `/photo/03`.
- Photo strip drag moves cards without accidental selection; Beauty filters to images 02, 06, 09.
- Mobile image picking opens 02; Next changes to 03; Escape and browser Back/Forward restore correct routes.
- Film and its caption open the native player; actual playback reached `currentTime=0.186667`, `paused=false`, `readyState=4`, duration `1.671309`, error null.
- Native required-field and invalid-email validation block incomplete enquiries. No message was sent; the external email app handoff/delivery was not exercised.
- About scroll reaches services/email without horizontal overflow. Desktop CTA hit area is unobstructed.
- Separate REA renderer replay exercised four views, picking, next, filters, disable/enable and reduced-motion static poster. Evidence: workspace `work/renderer-acceptance/README.md`.
- IAB final static-build console check: no captured warning/error messages. REA renderer check: no page errors. Forced WebGL context loss, physical mobile-device performance and external mail delivery remain untested; HTML fallback exists in code.
- Node 24 production build: 15 static routes. Strict TypeScript script checks passed. npm audit: zero vulnerabilities. Vite's Three.js chunk-size advisory remains; no measured performance benchmark is claimed.

## Implementation checklist

- [x] Compare actual rendered source and implementation together.
- [x] Correct P2 findings and compare revised captures.
- [x] Check all five fidelity surfaces, desktop/mobile and tablet category fit.
- [x] Exercise gallery/navigation/player/form validation and inspect console.
- [x] Preserve classic source, remote tag and verified offline restore artifacts.
- [ ] Verify production deployment separately; this report establishes local build acceptance.
