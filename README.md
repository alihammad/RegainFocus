# Regain Focus

Quick capture and an Eisenhower matrix for adults with ADHD. Read `CLAUDE.md`, then `docs/SPEC.md` and `docs/DESIGN.md`.

## Layout

| Path            | What                                                      |
| --------------- | --------------------------------------------------------- |
| `apps/web`      | Vite + React PWA (mobile capture and the web app)         |
| `packages/core` | Data model, local store, sync and rules. No React or DOM. |
| `supabase`      | Migrations, pgTAP tests and local config                  |

## Run it locally

Needs Node, pnpm and Docker Desktop.

```
pnpm install
pnpm db:start        # local Supabase; prints the API URL and publishable key
cp apps/web/.env.example apps/web/.env.local   # then paste the key
pnpm dev             # http://127.0.0.1:5173
```

Checks: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm db:test`.

## Moving to a hosted Supabase project

Schema lives only in `supabase/migrations`. Create a project, run `supabase link` then `supabase db push`, enable the Google provider in the dashboard, and set the two `VITE_SUPABASE_*` values. No code changes.
