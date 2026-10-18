# Mockup files

These are the source files of the approved mockups, exported from a design canvas. They are a **reference, not code to copy**. They use the canvas's own format, and its runtime (`support.js`) isn't included, so opening them straight in a browser won't render them properly.

Here's what's in each file that's useful to read:

| Part | Use it for |
| --- | --- |
| Markup and the inline `style="…"` attributes | Exact layout, spacing, sizes, colours and copy |
| `<sc-for list="{{ items }}">` and `<sc-if value="{{ flag }}">` | Repeated items and conditional parts |
| `{{ name }}` | A value computed in the script block |
| `<script type="text/x-dc">` | Each component's state and behaviour, written as a small class. `renderVals()` returns what the markup uses. |

| File | Screens | Notes |
| --- | --- | --- |
| `mobile-capture.dc.html` | Mobile Capture, Just saved, Voice capture, Inbox | One component; its `start` prop picks the state (`capture`, `saved`, `inbox`, `voice`). The script shows the save, undo, toast timer, tag toggles and simulated voice behaviour. |
| `web-a-focus-first.dc.html` | Web Today view | Static layout. |
| `web-b-right-sized-matrix.dc.html` | Web Matrix view | Static layout. |
| `web-c-plan-my-day.dc.html` | Web Plan my day flow | Working three-step flow: capacity bar logic, the Today limit of 3, a blocked task, and a 25-minute countdown. |

The owner can also add screenshots of the canvas to `docs/design/screenshots/`. If screenshots are present, use them as the visual target and these files for exact values.
