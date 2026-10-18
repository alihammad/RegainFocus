-- Regain Focus: initial schema.
-- Plain Postgres plus auth.uid() / auth.users, so it runs unchanged on local and hosted Supabase.
-- Every row belongs to a user (user_id) and row-level security restricts access to that user.

-- ---------------------------------------------------------------------------
-- Shared trigger functions
-- ---------------------------------------------------------------------------

-- Devices set updated_at themselves (they write offline). The server stamps
-- server_modified_at on every real change so other devices can pull "everything
-- changed since I last looked" without trusting device clocks.
create function public.stamp_server_modified_at() returns trigger
language plpgsql as $$
begin
  -- A stale write was already turned into a no-op by ignore_stale_update; don't re-stamp it.
  if tg_op = 'UPDATE' and new is not distinct from old then
    return new;
  end if;
  new.server_modified_at := now();
  return new;
end;
$$;

-- Last write wins by updated_at. A retried or out-of-order sync that carries an
-- older updated_at becomes a no-op instead of overwriting newer data.
create function public.ignore_stale_update() returns trigger
language plpgsql as $$
begin
  if new.updated_at < old.updated_at then
    return old;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------

create table public.projects (
  id                 uuid primary key,
  user_id            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name               text not null check (length(btrim(name)) > 0),
  archived           boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  server_modified_at timestamptz not null default now()
);

create index projects_user_idx on public.projects (user_id, server_modified_at);

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------

create table public.tasks (
  id                 uuid primary key,   -- created on the device that makes the task
  user_id            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title              text not null check (length(btrim(title)) > 0),
  first_step         text,
  project_id         uuid references public.projects (id) on delete set null,
  quadrant           text not null default 'inbox'
                       check (quadrant in ('inbox', 'do', 'plan', 'delegate', 'drop')),
  status             text not null default 'active'
                       check (status in ('active', 'done', 'dropped')),
  when_bucket        text check (when_bucket in ('today', 'this_week', 'flexible')), -- Task.when
  due_at             timestamptz,
  estimate_minutes   integer check (estimate_minutes > 0),
  energy             text check (energy in ('quick', 'medium', 'deep')),
  waiting_on         text,
  -- Today is sized for 3 tasks but is NOT capped here: the UI warns above 3.
  today_order        integer check (today_order >= 1),
  today_date         date,
  focused_minutes    integer not null default 0 check (focused_minutes >= 0),
  source             text not null check (source in ('mobile_text', 'mobile_voice', 'web')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  completed_at       timestamptz,
  -- Tombstone so a delete (including undo of a fresh capture) syncs to other devices.
  deleted_at         timestamptz,
  server_modified_at timestamptz not null default now(),
  check ((today_order is null) = (today_date is null))
);

create index tasks_user_quadrant_idx on public.tasks (user_id, quadrant, status) where deleted_at is null;
create index tasks_user_today_idx    on public.tasks (user_id, today_date) where today_date is not null and deleted_at is null;
create index tasks_user_sync_idx     on public.tasks (user_id, server_modified_at);

-- ---------------------------------------------------------------------------
-- sprints
-- ---------------------------------------------------------------------------

create table public.sprints (
  id                 uuid primary key,
  user_id            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  task_id            uuid not null references public.tasks (id) on delete cascade,
  started_at         timestamptz not null,
  ended_at           timestamptz,
  planned_minutes    integer not null default 25 check (planned_minutes > 0),
  updated_at         timestamptz not null default now(),
  server_modified_at timestamptz not null default now()
);

create index sprints_user_idx on public.sprints (user_id, server_modified_at);
create index sprints_task_idx on public.sprints (task_id);

-- ---------------------------------------------------------------------------
-- settings (one row per user)
-- ---------------------------------------------------------------------------

create table public.settings (
  user_id            uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  workday_start      time not null default '09:00',
  workday_end        time not null default '18:00',
  comfortable_hours  numeric(4, 1) not null default 5 check (comfortable_hours > 0),
  sprint_minutes     integer not null default 25 check (sprint_minutes > 0),
  updated_at         timestamptz not null default now(),
  server_modified_at timestamptz not null default now(),
  check (workday_end > workday_start)
);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- The stale-write guard must run before the stamp, so its name sorts first.
create trigger a_ignore_stale before update on public.projects
  for each row execute function public.ignore_stale_update();
create trigger a_ignore_stale before update on public.tasks
  for each row execute function public.ignore_stale_update();
create trigger a_ignore_stale before update on public.sprints
  for each row execute function public.ignore_stale_update();
create trigger a_ignore_stale before update on public.settings
  for each row execute function public.ignore_stale_update();

create trigger b_stamp before insert or update on public.projects
  for each row execute function public.stamp_server_modified_at();
create trigger b_stamp before insert or update on public.tasks
  for each row execute function public.stamp_server_modified_at();
create trigger b_stamp before insert or update on public.sprints
  for each row execute function public.stamp_server_modified_at();
create trigger b_stamp before insert or update on public.settings
  for each row execute function public.stamp_server_modified_at();

-- ---------------------------------------------------------------------------
-- Row-level security: a user sees and changes only their own rows.
-- ---------------------------------------------------------------------------

alter table public.projects enable row level security;
alter table public.tasks    enable row level security;
alter table public.sprints  enable row level security;
alter table public.settings enable row level security;

create policy projects_own on public.projects for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy tasks_own on public.tasks for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy sprints_own on public.sprints for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy settings_own on public.settings for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.projects, public.tasks, public.sprints, public.settings
  to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime (only where the publication exists, so this also runs on plain Postgres)
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.tasks, public.projects, public.sprints, public.settings;
  end if;
end;
$$;
