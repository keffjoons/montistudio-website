# Portfolio, typography and restrained motion — 22 October 2026

final result: passed (local browser acceptance)

Current user direction supersedes the historical typography and motion choices below: uppercase MONTISTUDIO in the classic Cormorant Garamond, Inter body/UI, native portfolio imagery, selected Matylda reels and much subtler motion.

- Content: 49 photographs (nine existing plus 40 native JPEG extractions) and eight videos (the existing film plus seven selected public reels). All 62 static routes and their media assets exist. Twelve featured Home items remain; the remaining work recycles into the gallery. No enlargement of small source images. Source hashes/credits are recorded in `docs/portfolio-images.json` and `docs/reel-sources.json`; PDF CV/contact pages, account credentials and transient CDN links are excluded.
- Attribution: published founder work retains its project context. PDF work is labelled fashion/styling assistance; reels are credited to Matylda Sala and link to the original public posts. No Monti commission history is invented. Outdoor skincare and Ffern use silent website versions; the other five retain their original source audio.
- Motion: deformation coefficients reduced by 90%, wheel/drag sensitivity and velocity cap halved, category blur removed, caption opacity floor .85. Home entry scale .99→1 and tiny offsets finish within .532s. About image scale 1.015→1, words rise 8px; Book rises 8px with a 2° orbit gesture. Detail text moves 4px and counters roll for at most 450 ms. Clock hands settle through 8° over 800 ms. Reduced-motion preference shows content immediately and skips clock movement.
- Five surfaces checked: **type** uses the requested serif display/wordmark and Inter body, with one top-left name; **spacing** keeps project context, controls and Book CTA clear; **colors** preserve paper/ink; **images** retain supplied/native content and aspect ratios; **copy** retains Monti’s joint-founder description, real email-draft flow and accurate credits.

## Browser evidence

Evidence root: `/Users/calebsmiler/Documents/ChatGPT/Monti/work/screenshots/`. Desktop 1280 × 720 and mobile 390 × 844 CSS viewports produce matching one-pixel-per-CSS-pixel PNGs. Comparisons join unscaled captures, before on the left and after on the right. Changing content/orbit positions are intentional; motion is not frame-synchronised.

| Check | Evidence |
|---|---|
| Header, expanded Home and restrained scroll | `subtle-home-desktop-final.png`, `subtle-home-scroll-desktop-final.png`, `subtle-home-comparison.png` |
| Expanded Video gallery | `subtle-video-gallery-desktop.png` |
| About, Book and CTA spacing | `subtle-about-desktop.png`, `subtle-book-desktop.png`, `subtle-book-mobile.png` |
| Native reel detail and mobile context | `subtle-muuto-desktop.png`, `subtle-muuto-mobile-final.png`, `subtle-mobile-video-comparison.png` |
| Imported image, role credit and mobile controls | `subtle-photo-49-mobile-final.png`, `subtle-mobile-photo-comparison.png` |
| Beauty category, eight matching photographs | `subtle-beauty-desktop-final.png` |

- [P2, fixed] The native mobile portrait player covered the new project credit, original-source link and counter. Reserved context above the player, supplied intrinsic dimensions and constrained the player to the viewing area. At 390 × 844, credit is y148–197.5; portrait video is x57.75/y216,274.5×488, bottom704. The original-source link passes DOM hit-testing. Landscape players retain their aspect ratio and centre within the same area.
- [P2, fixed] Mobile photo detail spread imagery behind the header, attribution and buttons. Reduced the compact strip’s tilt and fitted each image into the body, preserving aspect ratio. At 390 × 844 the stage is clipped below 228 px/above the bottom 140 px; credit ends at 180 px. Prev/Next remain readable, and 49→01 wrapping/active title/counter work. Desktop geometry is retained. Separate actual-Three.js projection/raycast checks covered 49 varied-aspect cards and five viewport sizes.
- [P2, fixed] An intentional pause could reject a pending preview play() and permanently mark the healthy preview blocked. Ignore aborts and stale completions, retaining genuine autoplay/format failure handling. Eleven focused checks of the actual handler passed.

- [P2, fixed] Small-phone landscape rotation previously collapsed the reserved media area. At 667 × 375 the layout now places metadata on the left and media in a right-hand frame, with the clock hidden only for these short detail views. Actual Photo 49 remains visible and correctly selected; the native portrait video is 156.94 × 279 at y72–351. Screenshot: `subtle-photo-landscape-final.png`. Renderer projection/bounds/picking/wrap checks also pass at 568 × 320 and 480 × 320. The counter override uses equal specificity so it stays below the context.

## Functional validation and limits

- Actual canvas selection of the Muuto card opened its correct native route/source. Native playback reached 12.433 s / readyState 4 at 1080 × 1920. Landscape Phaea playback advanced and paused after Back; its native dimensions remain 1916 × 1078. Native videos have controls, no autoplay, metadata preload, and pause on navigation, backgrounding and page exit.
- Photo 49→01 navigation, accessible counter text, eight-image Beauty filter, Home scrolling and reduced-motion navigation passed. Clock/counter state remains consistent after navigation. Captured final-browser errors/warnings: none.
- Desktop and mobile Book button hit tests at 5%, 25%, 50%, 90% all pass; bottoms 542.4 px and 577.3 px respectively. Input text is 16 px and mobile document width equals 390 px. No enquiry was submitted or email sent.
- Production build: 62 pages; all image/video paths exist; WebP limits 1440 × 2160 detail and 768 × 1152 preview, with no upscaling. Strict TypeScript passes for all four browser scripts. Native/processed asset hashes verified. Read-only correctness review completed with no remaining actionable findings after fixes.
- This is browser-emulated mobile acceptance, not a physical-device/performance benchmark. Vite retains the existing Three.js chunk-size advisory. Production rollout is verified separately through the existing GitHub/Vercel integration and canonical site.

---

## Historical reports (superseded where current direction differs)

# Serif typography and header revision — 22 October 2026

final result: passed

User direction: use only the classic Monti serif, remove the centred logo, and put lowercase montistudio at the top left. This direction supersedes the Meech typography and centred-brand treatment in the historical report below.

- Confirmed the classic tag uses Cormorant Garamond, with a light upright header. Current configuration self-hosts only that family at weights 300/400. Body, form controls, navigation, headings and WebGL image captions use it; active Poiret/Helvetica stacks and the second font preload were removed.
- Header is one montistudio home link. At 1280 × 720 its bounds start x=25/y=20; at 390 × 844 they start x=12/y=14. No centred wordmark or visible Creative Office label remains. Moved the detail Back link below the header so it cannot intersect the new name.
- Source/before visual: workspace `work/screenshots/monti-live-home-desktop.png`. After: `serif-home-desktop.png`. Both are 1280 × 720 pixels and CSS pixels, at one image pixel per CSS pixel. Full side-by-side: `serif-home-comparison.jpg` (2560 × 720); focused header: `serif-header-comparison.png` (2560 × 100). These show the previous implementation versus the requested revision, not an assertion of unchanged typography.
- Mobile captures at 390 × 844: `serif-home-mobile.png`, `serif-about-mobile.png`, `serif-book-mobile.png`. Photo/canvas typography: `serif-photo-desktop.png`. Desktop contact: `serif-book-desktop.png`.
- Five surfaces checked: **typography** matches the classic family in CSS/computed styles and rendered captions; **spacing** keeps the name at the left and controls clear; **colors** retain the existing paper/ink tokens; **images** are unchanged supplied assets with their existing crops; **copy** changes only the header name presentation.
- [P2, fixed] The enlarged serif UI text initially moved the desktop enquiry button into the clock target: hit tests at 5% and 25% across the button failed, with its bottom at y≈614.8. Tightened form offset and row spacing; post-fix bottom y≈574.8 and all 5%/25%/50%/90% hit tests pass. Evidence: `serif-book-desktop.png`. Mobile button bottom y≈598.3, centre hit passes, document width equals viewport width 390.
- Browser checks: desktop Home/Photo/Book and mobile Home/About/Book; header home link navigates correctly; browser console has no captured errors/warnings. Production build generates all 15 routes successfully. No dependencies changed and no form was submitted.
- An independent read-only code review found no missed active font declarations or old header selectors. No actionable P0/P1/P2 findings remain for this revision.

All screenshot paths above are relative to `/Users/calebsmiler/Documents/ChatGPT/Monti/`. Within the screenshot list, bare filenames are in `work/screenshots/`. Physical-device testing and external mail delivery are outside this typography revision.

---

## Historical orbit acceptance (before the serif/header revision)

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
