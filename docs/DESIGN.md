# Design system and UX rules

The values below come from the approved mockups in `docs/design/`. Where a mockup and this file disagree, this file wins; flag the difference to the owner.

## 1. ADHD UX rules

| # | Rule | Why |
| --- | --- | --- |
| 1 | One primary action per screen or card. Secondary actions sit behind a "More" menu. | Every visible button is a decision; fewer decisions make starting easier. |
| 2 | Capture is one tap or one keystroke away, everywhere, and never asks a question before saving. | Thoughts vanish in seconds. Any friction at capture loses them. |
| 3 | Show the next thing, hide the rest. Lists collapse after 3 to 5 items. | A long list feels like a wall and triggers avoidance. |
| 4 | Today is sized for 3 tasks. Going over shows a calm amber warning, never a block. | Limiting work in progress protects focus and makes "done for today" reachable, but the owner stays in control. |
| 5 | Make time visible: time left in the day, planned against available, a comfortable limit. | Time blindness makes over-planning the default. |
| 6 | Show the first tiny step wherever a task is the focus. | A concrete physical first action gets past the freeze. |
| 7 | Give instant feedback and an undo, never a confirmation dialog. | Dialogs interrupt, and undo removes the fear of a wrong tap. |
| 8 | Colour only carries meaning. Blue is now, focus or the primary action. Amber is a deadline or being over capacity. Nothing else is coloured, and meaning is never shown by colour alone. | A calm screen makes the important thing stand out. |
| 9 | No guilt. Never use red or "overdue" walls. Dropping a task is a valid outcome, and empty states are reassuring ("Nothing on fire."). | Shame leads to avoiding the app altogether. |
| 10 | Keep placement predictable. Capture, Today and the matrix are always in the same place. | Not having to re-find things saves working memory. |
| 11 | No ambient motion. Animate only in response to an action, and respect `prefers-reduced-motion`. | Motion pulls attention away from the task. |
| 12 | Explanatory text (such as the reality check prompts) appears in onboarding or help, not on every visit. | Instructions you've already learned become noise. |

## 2. Colour tokens

| Token | Hex | Used for |
| --- | --- | --- |
| `--color-ground` | `#F1F2EE` | Page background |
| `--color-surface` | `#FBFBF9` | Cards, panels, inputs |
| `--color-ink` | `#1C211F` | Main text, the focus card's border and shadow, the active nav pill |
| `--color-ink-2` | `#4E5753` | Secondary text (passes 4.5:1 on ground and surface) |
| `--color-ink-3` | `#3F4844` | Text on muted fills, empty-slot text, disabled button text |
| `--color-line` | `#D6D9D2` | Hairlines and card borders |
| `--color-control-border` | `#C5CAC2` | Borders on quiet buttons, inputs and selects; the disabled primary button's fill |
| `--color-chip` | `#E4E7E0` | Neutral chips, bar tracks, the Save button in the header |
| `--color-muted-panel` | `#EBEDE7` | Empty quadrant cells, blocked rows |
| `--color-dashed` | `#8F9792` | Dashed borders on empty slots |
| `--color-blue` | `#2B44C0` | Primary buttons, the "Now" label, selected chips, count badges, links |
| `--color-blue-hover` | `#1C2E8A` | Link hover |
| `--color-blue-tint` | `#E3E7F8` | The first-step block, selected rows, info banners, the active tab |
| `--color-blue-on-tint` | `#22358F` | Text on the blue tint |
| `--color-blue-soft` | `#9AA8EA` | Secondary blocks in the time ribbon (with ink text) |
| `--color-amber-tint` | `#F6E6CF` | Deadline chip fill |
| `--color-amber-text` | `#7A4100` | Deadline chip text, over-limit messages |
| `--color-amber-strong` | `#B35C00` | The capacity bar fill when over the limit |
| `--color-dark` | `#1C211F` | Toast, voice sheet, sprint timer panel |
| `--color-on-dark-muted` | `#D7DBD3` | Secondary text on dark |
| `--color-on-dark-accent` | `#8FA2FF` | The listening dot and waveform |
| `--color-on-dark-link` | `#B9C4F5` | The Undo link in the toast |
| `--color-scrim` | `rgba(28, 33, 31, 0.45)` | Dimming behind the voice sheet |

The mockups are light-only. If you add dark mode, keep the same roles and check every pair for contrast.

## 3. Typography

Load both families from Google Fonts.

| Family | Weights | Role | Fallback stack |
| --- | --- | --- | --- |
| Lexend | 400, 500, 600 | Headings, task titles, buttons, numbers, the capture box | `'Lexend', 'Segoe UI', system-ui, sans-serif` |
| Atkinson Hyperlegible | 400, 700 | Body text, labels, chips, helper text | `'Atkinson Hyperlegible', Verdana, system-ui, sans-serif` |

Both typefaces were designed for legibility, which is why they were chosen. Don't swap them for Inter or Roboto.

| Style | Web | Mobile |
| --- | --- | --- |
| Page title (h1) | Lexend 600, 32px, letter-spacing -0.01em | Lexend 600, 24px |
| Now card title | Lexend 600, 52px, line-height 1.05, letter-spacing -0.02em | Lexend 600, 42px (Plan my day) |
| Flow step title | Lexend 600, 36px | n/a |
| Section heading (h2) | Lexend 600, 22px (18px in the sidebar) | Lexend 600, 17px |
| First step text | Lexend 500, 24px | Lexend 500, 22px |
| Task title in a list | Lexend 500 to 600, 18 to 19px | Atkinson 400, 16 to 17px |
| Capture box | n/a | Lexend 500, 22px, line-height 1.35 |
| Body | Atkinson 400, 16px, line-height 1.5 | Same |
| Secondary and meta text | Atkinson 400, 14 to 15px, `--color-ink-2` | Atkinson 400, 13 to 14px |
| Buttons | Lexend 500 to 600, 15 to 18px | Lexend 600, 17 to 18px |

Use sentence case everywhere. No all-caps labels and no letter-spaced eyebrow text.

## 4. Spacing, sizes and radii

| Scale | Values |
| --- | --- |
| Spacing | 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 40 px. Lay out with flex or grid and `gap`. |
| Touch targets | At least 44×44px. Primary buttons are 56px tall on web and 60px on mobile. |
| Web layout | Content max-width 1280px with 32px side padding. Today view: a main column (flex `999 1 620px`) and a sidebar (flex `1 1 320px`) that wraps underneath on narrow screens. |
| Mobile layout | 20px side padding, top padding from `env(safe-area-inset-top)`, and a bottom tab bar with `env(safe-area-inset-bottom)`. |
| Radii | Chips 999px; small controls 10px; web buttons 12 to 14px; mobile buttons 16 to 18px; panels 16 to 18px; focus card 24px (web) or 22px (mobile); bottom sheet 28px on the top corners. |

## 5. Components

**Focus card.** A 2px `--color-ink` border, surface fill and a hard offset shadow: `8px 8px 0 var(--color-ink)` on web, `6px 6px 0` on mobile. This is the app's signature, and it marks exactly one thing per screen: the Now card, the capture box, or the item being sorted. Never use it twice on one screen.

**First step block.** Blue tint fill, 16px radius. A small label "Just this first step" (Atkinson 700, 15px, blue-on-tint) sits above a 28px checkbox (`accent-color: var(--color-blue)`) with the step in Lexend 500.

**Buttons.**

| Kind | Look |
| --- | --- |
| Primary | `--color-blue` fill, white Lexend 600, optional leading icon. |
| Secondary | 2px ink border, transparent fill, ink text. |
| Quiet | 1px control-border border, ground fill, ink text. Used for triage buttons and "Today" on rows. |
| Text | No border, underlined `--color-ink-2`, or blue bold for "Show N more". |
| Disabled primary | `--color-control-border` fill, `--color-ink-3` text, and the `disabled` attribute set. |
| Icon only | 44×44, transparent, always with an `aria-label`. |

**Chips.** Display chips are 28 to 30px tall with a pill radius. Neutral chips use `--color-chip`; deadline chips use amber tint with amber text in bold. Toggle chips are 44px tall with a 1.5px border, and when selected have a blue fill, white text and `aria-pressed="true"`.

**Quadrant glyph.** A 16px 2×2 grid of rounded squares in which the filled cell names the quadrant: top-left Do now, top-right Plan, bottom-left Delegate, bottom-right Drop. Always show it with a text label. It replaces the four competing quadrant colours of the old app.

**Energy glyph.** Three ascending bars: 1 filled for Quick win, 2 for Medium, 3 for Deep focus. Unfilled bars are at 25% opacity. Always show it with a text label.

**Time ribbon.** A 44px bar with 3px gaps between segments. Time already gone uses a 135° hatch of `#D3D7CF` and `#E4E7E0`. The Now task is blue with white text, other planned tasks are blue-soft with ink text, and free time shows plain text. Hour labels (13px, ink-2) sit underneath.

**Capacity bar.** A 14px track in chip colour. The fill is blue up to the comfortable limit and amber-strong above it. A 3px ink marker sits at the limit, with a bold status line underneath.

**Toast.** Dark fill, 16px radius, sitting above the tab bar. It has a check icon, the message, and an Undo text button in on-dark-link colour. It lasts 5 seconds and uses `role="status"`.

**Sync pill.** Chip colour, 30px tall, with an 8px blue dot and 13px text.

**Tab bar (mobile).** Surface fill with a top hairline. Each tab is 56px tall with an icon and a 13px Lexend label. The active tab has a blue tint fill, blue-on-tint text and `aria-current="page"`.

**Icons.** Inline SVG on a 16-unit viewBox with a 1.5 to 1.8 round stroke in `currentColor`. Never use emoji anywhere in the UI.

## 6. Copy rules

Use plain verbs and short sentences. Name a button by exactly what it does ("Save to inbox", "Start a 25-minute sprint", "Lock in 2 tasks"). Use the same word all the way through a flow: if the button says "Save to inbox", the toast says "Saved to inbox".

Describe time relatively and calmly ("Due in 48h", "This week", "About 8 hours left today"). Never write "overdue" or "late"; for a missed date, say "Was due Tuesday".

Empty states should reassure and point to what's possible next. They never scold.

## 7. Accessibility checklist

| Check | How |
| --- | --- |
| Contrast | Text at least 4.5:1, or 3:1 at 24px and above. The token pairs above are chosen to pass; check any new pair. |
| Semantics | Real `button`, `a`, `input` and `label` elements; headings in order; landmarks (`header`, `nav`, `main`, `aside`). |
| Keyboard | Everything reachable by Tab, with a visible focus ring (3px blue outline, 2px offset). Shortcuts are documented and never the only way to do something. |
| Screen readers | `aria-pressed` on toggles, `aria-current` on nav and tabs, `role="status"` on toasts, an `aria-label` describing the time ribbon and capacity bar, decorative SVGs marked `aria-hidden`. |
| Motion | Honour `prefers-reduced-motion`; the timer counts down but nothing pulses. |
| Colour | Every state shown in colour also has text or an icon. |
