# PLU Apple HIG and Native UI QA

## Scope

The canonical Green Pepper lesson was rebuilt in a sandbox before promotion to `main`. The audit targeted the reported failures:

- Step 3 could not reliably advance on mobile.
- The mobile product sheet escaped or broke its viewport.
- Internal learning-engine and data language was visible to learners.
- The interface described concepts instead of demonstrating them.
- Browser and installed-app icons were incomplete.

## Tested viewports

| Surface | Viewport |
| --- | ---: |
| iPhone SE | 375 × 667 |
| iPhone 15 | 393 × 852 |
| iPad mini | 744 × 1133 |
| Desktop | 1440 × 900 |

## Automated results

All surfaces passed:

- zero document-level vertical overflow;
- zero horizontal overflow;
- action dock remains inside the viewport;
- Step 3 primary action is visible and enabled;
- Step 3 advances to practice;
- the complete Look → Know → Code → Practice → Recall journey finishes;
- bottom sheet or side sheet remains fully inside the viewport;
- backdrop covers the viewport;
- sheet content owns its scrolling;
- sheet closes by explicit control, backdrop, or Escape;
- focus moves into the sheet and returns to its trigger;
- all visible interactive targets are at least 44 × 44 CSS pixels;
- reduced-motion mode removes transitions;
- favicon and web manifest are present;
- no learner-facing implementation terms were found;
- no page errors were recorded;
- a failed final recall repairs the smallest two-digit group and can then complete.

## Native interaction decisions

### One viewport, one action

The photograph and learning stage stay spatially stable. Content changes in place instead of becoming a vertically stacked article. The primary action lives in a fixed action dock, so Step 3 cannot hide its continuation below the fold.

### Show, do not explain

The lesson demonstrates:

- bell shape through a visual form card;
- green through a color cue;
- sold by weight through a scale cue;
- `4065` as `40 · 65`;
- the code as two visible keypad movements;
- independent recall against a different photograph.

Internal terms such as schema, catalog, reducer, provenance, code scope, and procedural memory do not appear in the learning UI.

### Native sheet behavior

Mobile uses a bottom sheet with a grabber, rounded top corners, safe-area padding, an internal scroll region, and a 44-pixel close control. Desktop uses a right-side inspector. The same content is progressively disclosed under Spot it, At checkout, and Similar.

### Feedback

Correct and incorrect actions receive visual feedback. Sound is off by default and optional. Where supported, vibration reinforces the same event; neither audio nor haptics is the only carrier of meaning.

### Accessibility

The interface respects safe areas, keyboard number entry, focus containment, Escape dismissal, focus restoration, semantic button labels, and `prefers-reduced-motion`.

## Canonical photo rule

Each product requires at least three realistic photographs:

1. clean hero view;
2. alternate angle or specimen;
3. real checkout or produce-bin context.

Recall uses a different image from instruction so success represents product recognition rather than memorization of one photograph.

## Reference guidance

The audit follows Apple Human Interface Guidelines for designing for iOS, layout, feedback, offering help, accessibility, and motion. The implementation adapts those principles to a responsive web/PWA surface rather than imitating native chrome literally.

## Reference-study alignment — 2026-09-07

The 48 reference studies now reuse the Core 25 pacing established in `570fcca`, documented in `442f685`, and completed in `1061aa8`. Product identity appears once on the stage. The exercise shows a short visual cue, a recorded code in its established chunks or a compact source-status choice, then one checkout decision. Original source wording and media restrictions live in the Item / Code / Sources sheet; AI/reference labels and separate completion semantics remain visible.

Browser checks covered 375 × 667 dark/light layouts and desktop layouts up to 1440 × 900, with no document overflow in inspected states. Goldendew exact-code recall, wrong-answer repair, completion, refresh and reset passed; handwritten Aloe used only short source-status choices, and the long Kohlrabi label remained contained. Native sheet checks covered visible initial focus, repeated opening, backdrop/close/Escape dismissal, focus restoration, arrow-key tabs, source links, internal scrolling and 44-pixel controls. Green and Yellow bell pepper provided the unchanged Core 25 comparison. No catalogue facts, source statuses or mastery-storage boundaries changed.
