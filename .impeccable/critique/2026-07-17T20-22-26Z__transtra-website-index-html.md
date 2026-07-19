---
target: transtra-website/index.html
total_score: 34
p0_count: 0
p1_count: 0
timestamp: 2026-07-17T20-22-26Z
slug: transtra-website-index-html
---
⚠️ DEGRADED: single-context Assessment A (sub-agent hit session usage limit; B ran as isolated sub-agent and completed first)

# Critique — site vitrine Transco (transtra-website/index.html)

## Design Health Score
| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | No scrollspy/active state in header nav; otherwise honest demo labeling |
| 2 | Match System / Real World | 4 | Real product vocabulary, natural French, school-first ordering |
| 3 | User Control and Freedom | 3 | One-page anchors all valid; mailto CTA is a placeholder address |
| 4 | Consistency and Standards | 4 | Tokens/components ported 1:1 from product design system |
| 5 | Error Prevention | 3 | No forms; mailto pre-fills subject; little surface for error |
| 6 | Recognition Rather Than Recall | 4 | Every icon labeled; sections self-evident |
| 7 | Flexibility and Efficiency | 3 | Anchor nav + visible focus; no accelerators (acceptable for register) |
| 8 | Aesthetic and Minimalist Design | 4 | Real UI mocks as imagery; no filler; hero right side deliberately airy |
| 9 | Error Recovery | 3 | All anchors resolve; only weak spot is the placeholder mailto |
| 10 | Help and Documentation | 3 | Mock captions teach; "données de démonstration" honesty |
| **Total** | | **34/40** | **Good** |

## Anti-Patterns Verdict
LLM assessment: does NOT read as AI-generated. No gradient text, no icon-card grid (bento tiles differ in content/shape), no tracked-uppercase eyebrows (kickers are sentence-case colored text), no hero-metric template, steps carry real product-UI chips instead of numbered circles. Identity is specific: gold Transco icon + teal accent + Figtree + real dashboard/phone mocks with real i18n strings.
Deterministic scan (Assessment B): 1 advisory finding total — `numbered-section-markers` on "01,02,03,04,07,09", a verified FALSE POSITIVE (bus codes BUS-01..04 and clock times 07:42/09:41 in mock fixture data; zero real section markers). No em-dash finding. Assets all HTTP 200; DOM serializes clean; no console errors.
Visual overlays: skipped — no mutable browser injection available (one-shot headless Chrome only).

## What's Working
- Hero = faithful console-école mock (real nav, StatCards, live map with route + bus markers, StatusBadges) — product-as-imagery sells credibility instantly.
- Parents section pairs the real mobile home screen ("Le bus de mon enfant", 07:42, RouteLine, Suivre le bus) with the emotional copy; peak of the page.
- French typography: apostrophes typographiques, guillemets et ponctuation haute avec espaces insécables.

## Priority Issues (state after fixes this session)
- [P1→fixed] Reveal-gated content invisible without JS/headless → default-visible, html.js-anim arms hiding only when JS can reveal.
- [P1→fixed] Wordmark `<svg width:auto` fell back to 300px box → overflow + broken header on narrow viewports; fixed with aspect-ratio.
- [P1→fixed] Courses table forced horizontal page overflow on mobile → scroll container + min-width.
- [P2→fixed] Decorative "Régénérer le QR" span looked interactive → pointer-events none + aria-hidden.
- [P2 open] mailto:contact@transtra.app is a placeholder address — needs the real contact before shipping.
- [P3 open] No scrollspy active state in header nav.
- [P3 open] Desktop hero leaves a large airy zone top-right (deliberate, gold wash carries it).

## Persona Red Flags
- Jordan (school director): none blocking — sections answer "quoi/comment/qui/confiance" in order; all jargon is product vocabulary explained in place.
- Casey (mobile parent): fixed this session — page previously overflowed at <500px; now single-column, CTA reachable, table scrolls in its card.
- Riley (stress tester): all anchors (#fonctionnement #parents #console #securite #demo #top) resolve; the placeholder mailto is the one honest gap.

## Questions to Consider
- Should the final CTA collect a real lead (form/WhatsApp/phone) instead of a placeholder mailto?
- Would a second page (tarifs/FAQ) dilute or strengthen the single-scroll pitch?
