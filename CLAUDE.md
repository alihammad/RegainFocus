# Regain Focus: quick capture and an Eisenhower matrix for adults with ADHD

The name is Regain Focus. Keep it in one config constant (`APP_NAME`) and never hard-code it in components.

## What we're building

Two front ends on one shared data store.

The **mobile app** captures a thought in seconds, by typing or by voice, into an Inbox. In v1 it does no sorting: capture and look at the inbox, nothing else.

The **web app** is where the owner sorts the inbox into an Eisenhower matrix (Do now, Plan, Delegate, Drop), picks up to 3 tasks for today, and works through them in focus sprints.

The owner is an adult with ADHD who uses this every working day. Every decision should reduce friction, choices and visual noise. When in doubt, show less.

## Read these before writing code

| File | What's in it |
| --- | --- |
| `docs/SPEC.md` | Product, screens, behaviour, data model, sync, build phases, open decisions |
| `docs/DESIGN.md` | Design tokens, components, copy rules and the ADHD UX rules |
| `docs/design/README.md` | How to read the mockup files in `docs/design/` |

## How to work in this repo

The decisions in `docs/SPEC.md` section 9 are settled. If a new open decision comes up, propose a default, explain the trade-off in a sentence or two, and wait for an answer rather than choosing silently.

Build in the phase order in `docs/SPEC.md` section 8. Phase 1 (mobile capture, inbox and the shared backend) ships before any of the bigger web views. Finish each phase's acceptance checks before starting the next.

Match the mockups' layout, copy and token values. Don't add features, settings or screens that aren't in the spec; suggest them to the owner instead.

Keep design tokens in one place (CSS custom properties or a theme file) using the names in `docs/DESIGN.md`. No hard-coded colours in components.

Capture must never lose data. Write to local storage first, then sync. Treat a lost capture as the most serious kind of bug.

Accessibility is a requirement, not a polish step: WCAG AA contrast, real `<button>` and `<label>` elements, full keyboard use on web, 44px minimum touch targets, and `prefers-reduced-motion` respected.

Write tests for the data layer: creating a capture, the offline sync queue, triage into quadrants, the Today warning above 3 tasks, and undo.

Work in small commits with clear messages. After each phase, summarise what was built and what's left.

## UX rules that override everything else

1. One primary action per screen or card; everything else lives behind "More".
2. Capture is always one tap away and never asks a question before saving.
3. Today is sized for 3 tasks. Adding more shows a calm amber warning but is never blocked.
4. A task's first tiny step is shown prominently wherever the task is the focus.
5. Use undo instead of "Are you sure?" dialogs.
6. Blue means now, focus or the primary action. Amber means a deadline or being over capacity. No red, no overdue walls, no guilt in the copy.
7. Long lists collapse after a few items ("Show 7 more").

The full list, with reasons, is in `docs/DESIGN.md`.
