# REA inspection — 22 October 2026

Target: https://www.meech213.com/. Goal: reproduce its visible front-end mechanics with Monti's supplied content.

## What ran

1. `capture_browser_scenario` opened a temporary Chrome session at 1440 × 1000, en-GB, Europe/London, capturing screenshot, DOM, accessibility, network and page errors. Record: `ev_2a3056ebeafc6a97946db2dd46c23769b06b9ac0cbd8458543e7168278fe155d`.
2. Public Next.js chunks observed in that session were saved. `analyze_javascript_application` inspected three selected files: `0zdf164y27n7u.js`, `2xciu9y9uets9.js`, and `340_rlavsp345.js`. Parent: `ev_7b46cb990e8143803c3234b6a5ccfb9e1917a57d28f60ceaa0700093a85a647e`. Focused gallery module: `ev_207ff12bc12ed4d0f664e0906705198092481711d3ff30664d89d10be2eab4d9`.
3. Module evidence and readable copies established geometry, cameras, wrapping, inertia, categories and clock-slot calculations. Original downloaded bytes were preserved separately from formatted reading copies.
4. Reference screens and Monti screens were compared at matching sizes. REA renderer replay separately exercised the new scenes, picking, filters, pause/resume and reduced motion. The workspace record is `work/renderer-acceptance/README.md`.

## Findings used

- Warm paper `#f5f4f1`, fine display labels, rotating five-section clock navigation.
- Home: 12 planes on radius 14.44, 60° camera field of view, staggered heights, wheel-driven yaw with damped velocity.
- Photo: angled horizontal wrapped strip, 28° camera field of view, native image proportions, diagonal titles.
- Detail: vertical wrapped sequence, active counter, 34° camera field of view.
- Clock: ten duplicated slots for five routes, active-route slot, responsive radii and animated circular movement.

The new Three.js renderer and Astro interface implement these behaviours with Monti's nine images and existing film. Labels describe supplied assets; no client commissions or results are invented.

## Scope

This was targeted runtime and public-JavaScript inspection, not recovery of the owner's entire repository or backend. Static analysis was partial: 16 inventoried files were outside the selection, and its semantic graph reached the 24,000 total / 8,000 per-file node ceilings. No private endpoints or credentials were accessed. Booking/payment backend behaviour was not reconstructed.

The local workspace export `work/rea-evidence.json` contains five records (40,883,994 bytes). Downloads are in `work/reference/`, readable copies in `work/reference-readable/`. These are outside the website repository and are not deployed.

Monti retains its own brand, supplied imagery and copy, and uses open licensed fonts. Book opens an email draft rather than adopting Meech's payment terms or implying an unimplemented booking service.
