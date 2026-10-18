# Product spec

## 1. Goal

Get a task out of the owner's head in under five seconds, wherever they are, and give them a calm place to sort it later and decide what to do now.

Today the owner runs an Eisenhower matrix as a Google Sheets canvas app. It works, but it is cluttered: around 20 filter chips before any task appears, empty quadrants taking as much room as full ones, eight or more buttons per task card, and the "what do I do now" area buried halfway down the page. This project replaces it with a phone app for capture and a redesigned web app for sorting and focus, sharing one data store.

## 2. User and context

One user to start: an adult with ADHD using the app at work (projects such as Ignite Internal, Ignite Marketplace, Ignite Direct, AI Platform and AFT). Captures happen on the move, between meetings or mid-task. Sorting and planning happen at a desk, usually in the morning. The user also wants to use the app for personal task logging. User will have access to a phone app where the user can brain dump quickly and later sort in the web app. 

Design for low working memory, time blindness, decision fatigue and task paralysis. Data should still be scoped by user ID so the app can support more people later.

## 3. Vocabulary

Use these words in the UI exactly as written.

| Term | Meaning |
| --- | --- |
| To sort / Inbox | Captured items that haven't been placed in a quadrant yet. "Inbox" on the phone, "To sort" on the web. |
| Do now | Quadrant 1: urgent and important. |
| Plan | Quadrant 2: important, not urgent. |
| Delegate | Quadrant 3: urgent, not important. |
| Drop | Quadrant 4: neither. Dropping is a legitimate choice, not a failure. |
| Today | The tasks chosen for today. Three is the suggested size. The first one is "Now". |
| First step | The first tiny physical action of a task, such as "Open Lucidchart". |
| Energy | Quick win, Medium or Deep focus: how much focus a task needs. |
| Waiting on | A person the task is blocked on. Blocked tasks can't be picked for Today. |
| Sprint | A 25-minute focus timer on one task. |
| Wins | Completed tasks and the total focused time. |

The matrix layout is fixed: urgent on the left, not urgent on the right, important on top, not important below.

## 4. Data model

```ts
type Quadrant = 'inbox' | 'do' | 'plan' | 'delegate' | 'drop';
type Energy = 'quick' | 'medium' | 'deep';      // UI: Quick win, Medium, Deep focus
type When = 'today' | 'this_week' | 'flexible';  // UI: Today, This week, Flexible
type Status = 'active' | 'done' | 'dropped';
type Source = 'mobile_text' | 'mobile_voice' | 'web';

interface Task {
  id: string;               // UUID created on the device that makes the task
  userId: string;
  title: string;
  firstStep?: string;
  projectId?: string;
  quadrant: Quadrant;       // new captures start in 'inbox'
  status: Status;
  when?: When;
  dueAt?: string;           // ISO 8601; drives labels like "Due in 48h"
  estimateMinutes?: number; // UI shows "2h", "4h+"
  energy?: Energy;
  waitingOn?: string;       // a person's name; blocked while set
  todayOrder?: number;      // 1-based position; set when the task is in Today
  todayDate?: string;       // ISO date the Today pick belongs to
  focusedMinutes: number;   // running total from sprints
  source: Source;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

interface Project { id: string; userId: string; name: string; archived: boolean; }

interface Sprint {
  id: string;
  taskId: string;
  startedAt: string;
  endedAt?: string;
  plannedMinutes: number;   // default 25
}

interface Settings {
  userId: string;
  workdayStart: string;     // default "09:00"
  workdayEnd: string;       // default "18:00"
  comfortableHours: number; // default 5; the planning limit for Today
  sprintMinutes: number;    // default 25
}
```

Today is sized for 3 tasks (a constant, not a setting). The data layer does not block a 4th. The UI shows an amber warning when a user goes over: "That's 4 for today. Three is easier to finish. Keep it, or move one to tomorrow." The data layer exposes a pure function that reports whether a day is over the suggested size, so the UI and tests share one rule.

## 5. Mobile app, v1

The mockups are in `docs/design/mobile-capture.dc.html`. Its `start` prop switches between the four states described below.

### 5.1 Capture (home screen, `start="capture"`)

The app opens straight onto this screen, with the text box focused where the platform allows it.

| Element | Behaviour |
| --- | --- |
| Header | App mark, the title "Capture", and a sync pill on the right (see section 7 for its states). |
| Text box | Label "What's on your mind?", placeholder "Type it before it slips away". Large text (Lexend 500, 22px). It sits in the focus card (see DESIGN.md). |
| Optional tags | Helper text "Optional. You can sort it properly on the web." Four toggle chips: Today, This week (only one of these two at a time), Quick win, Deep focus (only one of these two at a time). Tapping a selected chip clears it. |
| Mic button | 60×60, opens voice capture. |
| Save to inbox | Primary, full remaining width, 60px tall. Disabled while the text box is empty or only whitespace. |
| Return key | Saves, same as the button. The hint below the buttons reads "The Return key saves too." |
| Recently captured | The newest 3 items, newest first, each showing the text, time and tags. "See all N" opens the Inbox. If there's nothing yet: "Nothing yet. Your first thought will land here." |

### 5.2 Just saved (`start="saved"`)

On save, the text box clears, the tags reset, and the new item appears at the top of Recently captured with a blue tint and blue border. A dark toast appears above the tab bar reading "Saved to inbox", with an Undo button. It disappears after 5 seconds. Undo removes the item and puts its text and tags back in the box.

### 5.3 Voice capture (`start="voice"`)

A bottom sheet slides over a dimmed screen.

| Element | Behaviour |
| --- | --- |
| Status line | "Listening" while waiting; "Got it. Save, or cancel and try again." once text is recognised. |
| Waveform | Decorative only. Static if the user prefers reduced motion. |
| Transcript | Live recognised text in large type; "Speak now…" in muted text until something is heard. |
| Cancel | Closes the sheet and discards the transcript. |
| Save to inbox | Disabled until there's text. Saves with `source: 'mobile_voice'`, then shows the same toast as typed captures. |

### 5.4 Inbox (`start="inbox"`)

| Element | Behaviour |
| --- | --- |
| Header | "Inbox" with a count badge, plus the sync pill. |
| Info banner | "These wait in To sort on your web matrix. Sort them there when you're at your desk." |
| Groups | "Today" (captured today) and "Earlier". Each row shows the text, time and tags. |
| Empty state | "Inbox is clear. Nothing waiting to be sorted." |

In v1 the inbox is read-only on the phone. Editing and triage on mobile come in phase 4.

### 5.5 Tab bar

Two tabs, Capture and Inbox; the Inbox tab carries a count badge. Leave room for a Today tab in phase 4.

## 6. Web app

The mockups are in `docs/design/web-a-focus-first.dc.html`, `web-b-right-sized-matrix.dc.html` and `web-c-plan-my-day.dc.html`. The confirmed combination (section 9) uses all three: A as the Today view, B as the Matrix view, and C as an optional morning planning flow.

### 6.1 Global header (all views)

App mark and name; navigation (Today, Matrix, Wins); and a capture input that's always visible ("Capture a thought and get back to it"). Pressing Enter saves to To sort without leaving the page. Also show a search button and an "Add task" button for a full task with details.

### 6.2 Today view (mockup A)

| Area | Content and behaviour |
| --- | --- |
| Day header | Date ("Friday, 16 October") and a plain sentence: "9:53 am. About 8 hours left today, 6 of them planned." |
| Time ribbon | A bar for the workday (start to end from Settings). Time already gone is hatched; each Today task is a block sized by its estimate (Now in blue, the others in soft blue); the rest is labelled "Xh free". Give it an aria-label that reads the whole day out. |
| Now card | The focus card. "Now" label, "1 of 3 for today" ("1 of 4" when over the suggested size), task title (52px), a "Just this first step" block with a large checkbox, chips (project, estimate, due, energy), and three actions: "Start a 25-minute sprint" (primary), "Mark done" (secondary) and "Not now" (text button that moves the task down Today). |
| Up next | Today tasks 2 and 3, each with title, first step, chips and a Start button. An empty slot shows a dashed "Add a third task from Plan (N waiting)" button. |
| My energy | Any / Low / Okay / Sharp. Filters suggestions to quick, medium or deep tasks. It doesn't hide tasks already in Today. |
| Sidebar | To sort (the oldest item, with Do now / Plan / Delegate / Drop buttons laid out as a 2×2 grid); Matrix at a glance (2×2 counts, linking to Matrix); Waiting on others (the first item with a Follow up button, plus "See N more"); Wins (count, focused time, one small square per win). |

### 6.3 Matrix view (mockup B)

| Area | Content and behaviour |
| --- | --- |
| Filter row | One row only: an energy segmented control with counts (All energy, Quick win, Medium, Deep focus), a project select, and a "More filters" button holding the rest (staged, waiting, due date). |
| To sort strip | The next inbox item with Do now / Plan / Delegate / Drop buttons and a count badge. |
| Today | Three slots; a 4th pick adds a row and shows the amber warning (it is not blocked). When Today is empty, the first slot suggests the active task due soonest, with an "Add to today" button. Empty slots read "Open slot. Press T on any task to put it here." |
| Quadrants | Two columns: Urgent (narrow) and Not urgent (wide). Each column stacks its important quadrant above its not-important one. Empty quadrants shrink to a compact card with a calm line ("Nothing on fire.", "Nothing to hand off.", "Nothing to drop."). Quadrants with tasks get the space. |
| Task row | Done checkbox, title, "First step: …" underneath, chips (due in amber, estimate, energy), one visible action ("Today", or "Follow up" when waiting on someone), and a "More" menu with Move, Edit, Start sprint and Delete. Rows waiting on someone get a muted background and a person icon. |
| Long lists | Show 3 rows (5 at most), then "Show N more". Sort options: Due soonest (the default), Shortest first, Energy. |
| Keyboard | `/` focuses search, `T` adds the focused task to Today, `D` marks it done, `1` to `4` move it to a quadrant. |

### 6.4 Plan my day (mockup C, optional morning flow)

Three steps with a progress bar: 1. Sort, 2. Choose, 3. Start.

**Sort** shows one inbox item at a time in the focus card. Four large buttons are laid out as the matrix itself, with "Urgent" and "Not urgent" labels above them: Do today, Plan for later, Hand it off, Let it go. There's also a "Not sure yet, leave it in To sort" text button.

**Choose** is titled "Pick 3 for today". Picking more than 3 shows the amber warning from section 4 and is allowed. A capacity bar shows planned hours against the hours left in the workday, with a marker at the comfortable limit (Settings, default 5h). The bar turns amber over the limit, with the message "That is more than 5h. Consider moving one to Monday." (use the next working day). Tasks are toggle rows; blocked tasks are disabled and read "Blocked: waiting on Chetan"; the task due soonest is marked "Suggested". The continue button reads "Lock in N tasks" and is disabled at zero.

**Start** shows the first pick as the Now card with a working 25-minute sprint timer (mm:ss) and an "End sprint" button. The other picks are listed under "After that".

### 6.5 Wins

A simple list of completed tasks, newest first, with the date, project and focused minutes, plus totals at the top. There's no mockup yet; follow DESIGN.md.

## 7. Sync and offline

Every device writes to a local store first (IndexedDB in the browser or PWA, or the platform equivalent), assigns the UUID itself, and then syncs. Failed syncs retry with backoff and are never dropped.

The sync pill has three states: "Synced to web", "Saving… will sync" (pending items) and "Offline. Saved on this phone".

New captures should appear on the web within 10 seconds when online, using a realtime subscription if the backend has one, otherwise polling. For conflicts, the most recent `updatedAt` wins per field. Captures never conflict because each is a new row.

## 8. Build phases

| Phase | Scope | Done when |
| --- | --- | --- |
| 0. Foundations | Section 9 decisions (done); scaffold the repo; design tokens; data model and migrations on a local Supabase; start from an empty database (no import of the old Google Sheet) | Tokens live in one theme file; migrations apply to an empty database with row-level security verified |
| 1. Capture loop | Mobile Capture, Just saved, Voice and Inbox; offline queue and sync; a minimal web To sort list with the four triage buttons, plus a plain list per quadrant | A capture made in airplane mode syncs when the phone reconnects; a capture shows up on the web within 10s; undo works; data layer tests pass |
| 2. Web matrix and Today | Mockup B Matrix view, mockup A Today view with time ribbon and Now card, energy filters, Waiting on, keyboard shortcuts | Adding a 4th task to Today shows the amber warning and still works; empty quadrants collapse; everything works by keyboard alone; contrast checks pass |
| 3. Focus | Sprints and timer (logged to `Sprint` and `focusedMinutes`), Plan my day flow, Wins, Settings for workday hours and the comfortable limit | Sprint time adds up correctly in Wins; the capacity bar turns amber over the limit |
| 4. Mobile growth | A Today tab on the phone, triage on the phone, editing a capture, optional home-screen widget or share-sheet capture | To be agreed with the owner |

## 9. Decisions (settled with the owner)

| Decision | Outcome |
| --- | --- |
| App name | Regain Focus (`APP_NAME` constant). |
| Backend | Supabase (Postgres, Auth, Realtime, row-level security), developed against a local Supabase and kept portable to a hosted project via environment variables and migrations only. Start from an empty database; the old Google Sheet is not imported. |
| Mobile technology | An installable PWA sharing the web codebase. Revisit native for widgets, the share sheet or more reliable voice. The owner uses Android; iOS works through "Add to Home Screen". |
| Web layout | A + B + C combined as in section 6. |
| Voice in v1 | In-app mic using the Web Speech API where supported, with keyboard dictation as the fallback. |
| Sign-in | Google sign-in. |
| Workday and limits | 9:00 to 18:00 and a 5h comfortable limit, editable in Settings (phase 3). |
| Today limit | Soft limit of 3: no cap, but an amber warning when a user goes over (section 4). |

## 10. Features in the current Sheets app to carry over later

Not needed for phases 1 and 2, but don't design them out:

- Bulk dump: paste many lines and create many captures at once.
- Staged status.
- Daily budget. The comfortable limit replaces it.
- Spotlight with a limit of 3. This becomes Today.
- "Reality check" prompts for each quadrant. Show them during onboarding or in help, not on every visit.
- Editing the first step ("Change").
- Move between quadrants.
- Done list with "+30m focused" per task.
- Projects view.
- Priority list view.
- Search.
- A density toggle ("Comfortable").

## 11. Real sample data (from the current app, for seeding and tests)

| Title | Project | Quadrant | Estimate | When / due | Energy | First step | Other |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Talk to Ali T about Ignite Marketplace Resources | Ignite Internal | inbox | | | | | |
| AI Platform PRR | AI Platform | plan | 4h+ | Due in 48h | Deep focus | Open the DR checklist and the PRR Confluence doc | |
| Tech landscape diagram | Ignite Internal | plan | 2h | This week | Quick win | Open Lucidchart | |
| DR | AFT | plan | 2h | Flexible | Deep focus | | Waiting on Chetan |

When the screenshot was taken, the totals were 22 tasks across 9 projects: 10 in Plan (19h 30m in total) and 11 done (5h 15m focused). The other projects seen were Ignite Direct and Ignite Marketplace. "Ask Chetan for the DR update" in the mobile mockups is an illustrative voice capture, not real data.
