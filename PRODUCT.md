# Product

## Register

brand

## Users

School directors and administrators in Morocco evaluating bus tracking for their school; secondarily transport operators, and parents checking the product's legitimacy. French-first readers (Arabic-adjacent market), often on mobile, WhatsApp-native communication culture.

## Product Purpose

Marketing site for Transco, the school vertical of the Transtra platform (transtra.net). One-page pitch: what the product does (live bus tracking, parent app, school console, QR-verified boarding), why it can be trusted, and a single conversion goal — request a demo.

## Brand Personality

Trustworthy, honest, product-real. Copy is plain French with correct typography (guillemets, espaces insécables); demo data is labeled honestly. Gold = Transco school identity (logo only, never status); teal = Transtra platform trust.

## Aesthetic lane

Apple HIG, translated to the web. Named deliberately, not by reflex: the product's whole promise is a phone in a parent's hand, so the site is built the way that phone behaves. Large display type with size-specific tracking, generous single-idea sections, translucent materials instead of opaque bars, and a chrome that carries no surface at all until content passes under it.

This lane governs **layout, type, materials, and motion**. It does not govern the product mocks: those stay 1:1 faithful to the real console and app (see principle 1).

## Human imagery

The page opens on a full-height video loop of a child walking to school, and three photographed faces carry the roles section. This was chosen after testing the alternative: an earlier product-led version, which opened directly on the console, is archived at `/old`.

The rule that makes this safe: **photography sets the scene, the product proves the claim.** The film hero is followed immediately by the console — "here is your school's morning, and here is the software that keeps it". Imagery never stands in for evidence.

Three constraints, non-negotiable:

- **No identifiable children's faces.** A page selling the tracking of children's location is the worst possible place to put children's faces. Children appear from behind or at distance; adults carry the faces.
- **No fabricated testimonials.** The roles section sits where customer quotes would conventionally go and deliberately carries none — invented endorsements under stock faces are a different thing from stock photography. It states what each role actually sees, including what it cannot see.
- **Current photography is placeholder.** Free stock has no Moroccan school-transport imagery; every current asset carries some foreign signal (the hero's school building reads Eastern European). These prove the layout. The highest-value upgrade to this page is half a day photographing a real partner school.

## Design Principles

1. **The product is the proof** — every mock is faithful to the real console/app, never decoration, and every claim lands on one. The mocks are the one place the Apple lane stops: they must look like the software, not like the site. Photography may open a section; it may never be what a claim rests on.
2. **Honesty converts** — state data freshness, label demo data, never fake urgency.
3. **Materials, not bars** — chrome is a translucent layer that content passes under, and it inverts over dark sections. A light material is never stacked on another light material, and never left floating over dark content.
4. **Motion is physics, not duration** — every transition is a spring parameterised by damping + response. Overshoot is reserved for movement that continued a gesture. Feedback lands on pointer-down, never on release. Anything the user can grab tracks 1:1, hands its velocity to the animation that follows, and can be caught and reversed mid-flight.
5. **One page, one goal** — every section funnels to "Demander une démo".
6. **Parents are the emotional core** — the school buys, but the parent's peace of mind is the story.

## Anti-references

- Generic SaaS landing pages: gradient text, hero metrics, icon-card grids, tracked-uppercase eyebrows. **No per-section kickers** — the type scale carries the hierarchy instead.
- Photography used *instead of* the product: smiling children and yellow school buses standing in for evidence. The distinction from the human imagery above is what the picture is doing — setting a scene, or being asked to prove a claim. (The closing film band is still stock footage of an American school bus, and fails this test; it is on the list to cut.)
- Repeating one card shape down the page. The roles section is three alternating editorial bands, not a third icon-card grid.
- Overpromising copy ("révolutionnaire", "IA"); the product sells on honesty about data freshness.
- Decorative glassmorphism. Translucency here is functional — it signals a floating layer and shows what is underneath. Where it stops earning that, it goes solid.
- Fixed-duration easing curves on anything a finger can touch.

## Accessibility & Inclusion

WCAG AA contrast; content visible without JS (the phone carousel falls back to native scroll-snap, so all three screens stay reachable); French-first with bilingual intent (fr/en in product).

Three display preferences are honored independently, because the site claims the product honors them:

- `prefers-reduced-motion` — movement is removed, but feedback is not: fades and colour changes stay, springs settle instantly. Dragging still tracks the finger, since direct manipulation is not "animation".
- `prefers-reduced-transparency` — materials become opaque, blur is dropped, and hierarchy passes to border and shadow.
- `prefers-contrast: more` — near-solid surfaces with defined borders.

Touch targets are ≥44px, including the header wordmark and the carousel dots (44px hit area around an 8px dot).
