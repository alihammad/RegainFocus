-- pgTAP tests for the initial schema. Run with: pnpm db:test (needs the local stack running).
begin;
select plan(10);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com');

-- Act as user A.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

-- Creating a capture: lands in the inbox, active, user_id filled from the session.
insert into public.tasks (id, title, source)
values ('10000000-0000-0000-0000-000000000001', 'Ask Chetan for the DR update', 'mobile_text');

select results_eq(
  $$ select quadrant, status, user_id::text from public.tasks where id = '10000000-0000-0000-0000-000000000001' $$,
  $$ values ('inbox', 'active', '00000000-0000-0000-0000-00000000000a') $$,
  'a new capture starts in the inbox, active, owned by the signed-in user'
);

-- An empty title is rejected.
select throws_ok(
  $$ insert into public.tasks (id, title, source) values (gen_random_uuid(), '   ', 'web') $$,
  '23514', null, 'a whitespace-only title is rejected'
);

-- Today has no cap: a 4th task for the same day is accepted (the UI warns instead).
insert into public.tasks (id, title, source, today_date, today_order) values
  ('20000000-0000-0000-0000-000000000001', 't1', 'web', current_date, 1),
  ('20000000-0000-0000-0000-000000000002', 't2', 'web', current_date, 2),
  ('20000000-0000-0000-0000-000000000003', 't3', 'web', current_date, 3),
  ('20000000-0000-0000-0000-000000000004', 't4', 'web', current_date, 4);

select is(
  (select count(*)::int from public.tasks where today_date = current_date),
  4, 'a 4th task can be added to Today'
);

-- today_order and today_date go together.
select throws_ok(
  $$ insert into public.tasks (id, title, source, today_order) values (gen_random_uuid(), 'x', 'web', 1) $$,
  '23514', null, 'today_order without today_date is rejected'
);

-- Last write wins: a newer update applies, a stale one is ignored.
update public.tasks set title = 'newer', updated_at = now() + interval '2 hours'
 where id = '10000000-0000-0000-0000-000000000001';
update public.tasks set title = 'stale', updated_at = now() + interval '1 hour'
 where id = '10000000-0000-0000-0000-000000000001';

select is(
  (select title from public.tasks where id = '10000000-0000-0000-0000-000000000001'),
  'newer', 'a stale update does not overwrite newer data'
);

-- The server stamps server_modified_at on a real change.
select ok(
  (select server_modified_at >= now() - interval '1 minute' from public.tasks
    where id = '10000000-0000-0000-0000-000000000001'),
  'server_modified_at is stamped'
);

-- Soft delete (tombstone) is an ordinary update.
update public.tasks set deleted_at = now(), updated_at = now() + interval '3 hours'
 where id = '10000000-0000-0000-0000-000000000001';
select isnt(
  (select deleted_at from public.tasks where id = '10000000-0000-0000-0000-000000000001'),
  null, 'a task can be tombstoned for sync'
);

-- Act as user B: A's rows are invisible and untouchable.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);

select is((select count(*)::int from public.tasks), 0, 'user B cannot see user A''s tasks');

update public.tasks set title = 'hijack' where id = '20000000-0000-0000-0000-000000000001';
reset role;
select is(
  (select title from public.tasks where id = '20000000-0000-0000-0000-000000000001'),
  't1', 'user B cannot change user A''s task'
);

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
select throws_ok(
  $$ insert into public.tasks (id, user_id, title, source)
     values (gen_random_uuid(), '00000000-0000-0000-0000-00000000000a', 'spoof', 'web') $$,
  '42501', null, 'user B cannot create a task owned by user A'
);

select * from finish();
rollback;
