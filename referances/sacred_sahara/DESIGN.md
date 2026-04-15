# Design System Specification: The Ethereal Union

## 1. Overview & Creative North Star
**Creative North Star: "The Editorial Sanctuary"**

This design system rejects the "database-driven" look of traditional matrimonial sites. Instead, it adopts the persona of a high-end luxury editorial. We treat every profile and interaction as a curated story, not a line item. 

To break the "template" aesthetic, we utilize **intentional asymmetry**. Hero sections should feature off-center typography and overlapping image containers. Elements are not just placed; they are "floated" and "layered" to create a sense of depth and tactile permanence. The goal is to evoke the feeling of browsing a bespoke wedding invitation or a prestige lifestyle journal—warm, sun-baked, and deeply intentional.

---

## 2. Colors & Surface Philosophy

The palette transitions from the warmth of sun-bleached cream to the authoritative depth of maroon, creating a "Romantic Dusk" atmosphere.

### The "No-Line" Rule
**Explicit Instruction:** 1px solid borders are strictly prohibited for sectioning or containment. Boundaries must be defined through background tonal shifts. Use `surface-container-low` for secondary sections sitting on a `surface` background. The eye should perceive a change in depth, not a technical divider.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of fine paper. 
*   **Base:** `surface` (#fefccf)
*   **Tier 1 (Sectioning):** `surface-container-low` (#f8f6c9)
*   **Tier 2 (Interactive Cards):** `surface-container-lowest` (#ffffff)
*   **Accent Layer:** `primary-container` (#a6606b) for high-impact callouts.

### The Glass & Gradient Rule
To achieve "Sun-Baked Simplicity," use subtle radial gradients. 
*   **Signature Gradient:** `primary` (#8a4853) to `primary-container` (#a6606b) at a 45-degree angle for primary CTAs.
*   **Glassmorphism:** For floating navigation or modal overlays, use `surface` at 80% opacity with a `24px` backdrop-blur. This ensures the romantic background tones bleed through, maintaining a cohesive "aura."

---

## 3. Typography: The Editorial Voice

We pair the classical authority of **Noto Serif** with the modern, rhythmic clarity of **Manrope**.

*   **Display (Noto Serif):** Used for "Big Moments"—hero headers and landing statements. The `display-lg` (3.5rem) should be used with tight letter-spacing (-0.02em) to feel like a masthead.
*   **Headlines (Noto Serif):** Used for profile names and section titles. This provides the "classic" matrimonial trust.
*   **Body (Manrope):** All functional text. `body-lg` (1rem) is the standard for profile bios to ensure effortless readability.
*   **Labels (Manrope):** Used for metadata (Age, Location, Profession). Always uppercase with `0.05em` letter-spacing to provide a premium, "labeled" feel.

---

## 4. Elevation & Depth

### The Layering Principle
Avoid "Flatness." Use the `surface-container` tiers to stack importance. A card containing a user's interests should be `surface-container-lowest` placed atop a `surface-container-low` page section. This creates "soft lift."

### Ambient Shadows
Shadows must never be grey or harsh.
*   **Shadow Color:** 6% opacity of `on-surface` (#1d1d03).
*   **Standard Shadow:** `0px 12px 32px rgba(29, 29, 3, 0.06)`. It should look like a soft glow, not a drop shadow.

### The "Ghost Border" Fallback
If a border is required for accessibility (e.g., in high-contrast modes), use `outline-variant` (#d7c1c3) at **15% opacity**. High-contrast, 100% opaque borders are strictly forbidden.

---

## 5. Components

### Buttons: The Tactile Touch
*   **Primary:** Uses the Signature Gradient (Primary to Primary-Container). Shape: `full` (pill) for a soft, inviting feel. No border.
*   **Secondary:** `surface-container-lowest` with a 10% `outline-variant` Ghost Border. 
*   **Padding:** Vertical `12px`, Horizontal `32px` to emphasize "Premium Space."

### Cards: The Story Containers
*   **Radius:** Always `lg` (2rem) or `md` (1.5rem). 
*   **Composition:** Forbid dividers. Separate the "User Name" (Headline-sm) from the "Bio" (Body-md) using `24px` of vertical whitespace.
*   **Hover State:** Shift from `surface-container-low` to `surface-container-lowest` and increase the Ambient Shadow spread.

### Input Fields: The Elegant Inquiry
*   **Style:** Underline-only or softly filled (`surface-container-highest`). 
*   **Focus State:** The label (Manrope Label-md) shifts to `primary` (#8a4853), and a subtle 2px bottom-bar appears. Never use a "box" focus.

### Chips: The Personality Tags
*   **Visuals:** `surface-container-high` background. No border. Radius: `sm` (0.5rem) to provide a slight architectural contrast to the pill-shaped buttons.

---

## 6. Do's and Don'ts

### Do:
*   **Embrace Whitespace:** If you think there is enough space, add 16px more. Luxury is defined by the space it doesn't use.
*   **Overlap Elements:** Allow a profile image to slightly "break the container" of a card to create a bespoke, non-webby feel.
*   **Use Tonal Transitions:** Use `surface-dim` for footers to create a grounded, "end of page" feeling.

### Don't:
*   **Don't use Dividers:** Never use a `<hr>` or a 1px border. Use a 48px-64px vertical gap or a subtle background color change instead.
*   **Don't use Pure Black:** Text should always be `on-surface` (#1d1d03) or `on-surface-variant` (#524345) to keep the "Sun-Baked" warmth.
*   **Don't use Square Corners:** Even "small" components must have at least a `sm` (0.5rem) radius to maintain the romantic, approachable brand voice.