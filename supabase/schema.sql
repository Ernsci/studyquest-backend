-- =============================================================================
-- StudyQuest — Supabase / Postgres schema
-- =============================================================================
-- How to run: Supabase dashboard → SQL Editor → New query → paste → Run.
-- Run `seed.sql` afterwards if you want the bundled sample content in the DB.
-- Re-running this file is safe: everything is `if not exists` / `or replace`.
--
-- Conventions
--  * snake_case columns; the API maps them to the camelCase types in
--    `src/lib/types.ts`. No other code reads these tables.
--  * Content ids are `text`, not uuid, and keep the deterministic ids the demo
--    layer uses (`sub_javascript`, `les_javascript_values-and-variables`,
--    `qs_javascript_1`). Progress rows recorded against demo content therefore
--    stay valid after the database is connected.
--  * Learner-facing ids (`profiles.id`, `attempts.id`, …) are `uuid`;
--    `profiles.id` is a foreign key to `auth.users(id)` and cascades on delete.
--  * `question_solutions` is split out of `questions` on purpose: it has RLS
--    enabled and *no* policies, so the anon key can never read an answer key
--    even if a future query is accidentally built with a user token.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------- enums
do $$ begin
  create type public.sq_role as enum ('learner', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sq_difficulty as enum ('beginner', 'intermediate', 'advanced');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sq_question_kind as enum
    ('single', 'multiple', 'true_false', 'short_answer', 'code');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sq_practice_mode as enum ('quiz', 'practice', 'review', 'lesson');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sq_theme_mode as enum ('light', 'dark', 'system');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sq_report_status as enum ('open', 'in_review', 'resolved', 'dismissed');
exception when duplicate_object then null; end $$;

-- -------------------------------------------------------------------- helpers
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Emails listed here get the admin role automatically at signup. Set with:
--   alter database postgres set app.admin_emails = 'you@example.com,ana@example.com';
create or replace function public.is_admin_email(email text)
returns boolean
language sql
stable
as $$
  select coalesce(
    array [lower(btrim(coalesce(email, '')))] &&
    string_to_array(nullif(current_setting('app.admin_emails', true), ''), ','),
    false
  );
$$;

-- ==================================================================== content
create table if not exists public.subjects (
  id           text primary key,
  slug         text not null unique,
  title        text not null,
  description  text not null default '',
  icon         text not null default 'book',
  color_hex    text not null default '#6366f1' check (color_hex ~* '^#[0-9a-f]{6}$'),
  level        public.sq_difficulty not null default 'beginner',
  sort_order   integer not null default 0,
  published    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.modules (
  id           text primary key,
  subject_id   text not null references public.subjects (id) on delete cascade,
  slug         text not null,
  title        text not null,
  description  text not null default '',
  sort_order   integer not null default 0,
  updated_at   timestamptz not null default now(),
  unique (subject_id, slug)
);

create table if not exists public.lessons (
  id                text primary key,
  subject_id        text not null references public.subjects (id) on delete cascade,
  module_id         text references public.modules (id) on delete set null,
  slug              text not null,
  title             text not null,
  description       text not null default '',
  body              text not null default '',
  objectives        jsonb not null default '[]'::jsonb,
  code_examples     jsonb not null default '[]'::jsonb,
  diagram           jsonb,
  related           jsonb not null default '[]'::jsonb,
  estimated_minutes integer not null default 10 check (estimated_minutes between 1 and 600),
  difficulty        public.sq_difficulty not null default 'beginner',
  sort_order        integer not null default 0,
  published         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (subject_id, slug)
);

create table if not exists public.questions (
  id           text primary key,
  subject_id   text not null references public.subjects (id) on delete cascade,
  lesson_id    text references public.lessons (id) on delete set null,
  kind         public.sq_question_kind not null default 'single',
  prompt       text not null,
  hint         text,
  options      jsonb not null default '[]'::jsonb,
  points       integer not null default 1 check (points between 1 and 100),
  difficulty   public.sq_difficulty not null default 'beginner',
  sort_order   integer not null default 0,
  published    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Answer keys. RLS is on with no policies: readable through the service-role
-- key (the API) and by nobody else, so a prompt-only query can never leak them.
create table if not exists public.question_solutions (
  question_id     text primary key references public.questions (id) on delete cascade,
  answer          jsonb not null,
  explanation     text not null default '',
  starter_code    text,
  expected_output text,
  updated_at      timestamptz not null default now()
);

create index if not exists modules_subject_idx   on public.modules (subject_id, sort_order);
create index if not exists lessons_subject_idx   on public.lessons (subject_id, sort_order);
create index if not exists lessons_module_idx    on public.lessons (module_id);
create index if not exists questions_subject_idx on public.questions (subject_id, sort_order);
create index if not exists questions_lesson_idx  on public.questions (lesson_id);


-- ==================================================================== learner
create table if not exists public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  email               text not null default '',
  display_name        text not null default 'Learner',
  username            text unique,
  avatar_url          text,
  bio                 text,
  role                public.sq_role not null default 'learner',
  weekly_goal_lessons integer not null default 3 check (weekly_goal_lessons between 1 and 35),
  reminder_time       text,
  reminder_enabled    boolean not null default false,
  theme_mode          public.sq_theme_mode not null default 'system',
  xp                  integer not null default 0 check (xp >= 0),
  freeze_tokens       integer not null default 0 check (freeze_tokens between 0 and 99),
  email_verified_at   timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists public.lesson_progress (
  user_id      uuid not null references public.profiles (id) on delete cascade,
  subject_slug text not null,
  lesson_slug  text not null,
  attempts     integer not null default 0 check (attempts >= 0),
  best_percent integer check (best_percent between 0 and 100),
  completed    boolean not null default false,
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (user_id, subject_slug, lesson_slug)
);

create table if not exists public.attempts (
  id               uuid primary key default extensions.gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  mode             public.sq_practice_mode not null default 'practice',
  subject_slug     text,
  lesson_slug      text,
  score            integer not null default 0 check (score >= 0),
  total            integer not null default 0 check (total >= 0),
  percent          integer not null default 0 check (percent between 0 and 100),
  passed           boolean not null default false,
  xp_awarded       integer not null default 0 check (xp_awarded >= 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  answered         integer not null default 0 check (answered >= 0),
  correct          integer not null default 0 check (correct >= 0),
  created_at       timestamptz not null default now()
);

-- A frozen copy of what was asked and what the key said, so an attempt still
-- reads correctly after an admin edits or deletes the question.
create table if not exists public.attempt_answers (
  id              uuid primary key default extensions.gen_random_uuid(),
  attempt_id      uuid not null references public.attempts (id) on delete cascade,
  position        integer not null,
  question_id     text references public.questions (id) on delete set null,
  kind            public.sq_question_kind not null default 'single',
  prompt          text not null default '',
  given           jsonb,
  correct         boolean not null default false,
  points_awarded  integer not null default 0,
  points_possible integer not null default 0,
  expected        jsonb,
  explanation     text not null default '',
  unique (attempt_id, position)
);

create table if not exists public.daily_activity (
  user_id             uuid not null references public.profiles (id) on delete cascade,
  day                 date not null,
  lessons_completed   integer not null default 0,
  xp_earned           integer not null default 0,
  exercises_completed integer not null default 0,
  minutes             integer not null default 0,
  primary key (user_id, day)
);

create table if not exists public.bookmarks (
  user_id       uuid not null references public.profiles (id) on delete cascade,
  subject_slug  text not null,
  lesson_slug   text not null,
  lesson_title  text not null default '',
  subject_title text not null default '',
  created_at    timestamptz not null default now(),
  primary key (user_id, subject_slug, lesson_slug)
);

create table if not exists public.review_items (
  user_id      uuid not null references public.profiles (id) on delete cascade,
  question_id  text not null references public.questions (id) on delete cascade,
  subject_slug text not null default '',
  review_box   integer not null default 0 check (review_box between 0 and 20),
  due_on       date not null,
  last_correct boolean,
  times_seen   integer not null default 0 check (times_seen >= 0),
  mastered     boolean not null default false,
  prompt       text not null default '',
  kind         public.sq_question_kind not null default 'single',
  primary key (user_id, question_id)
);


-- =============================================================== community/admin
create table if not exists public.content_reports (
  id            uuid primary key default extensions.gen_random_uuid(),
  created_at    timestamptz not null default now(),
  status        public.sq_report_status not null default 'open',
  reason        text not null,
  details       text not null default '',
  target        text not null default '',
  target_href   text,
  reporter_id   uuid references public.profiles (id) on delete set null,
  reporter_email text,
  resolved_at   timestamptz,
  admin_note    text
);

create table if not exists public.feedback (
  id           uuid primary key default extensions.gen_random_uuid(),
  created_at   timestamptz not null default now(),
  rating       integer not null check (rating between 1 and 5),
  message      text not null default '',
  author_id    uuid references public.profiles (id) on delete set null,
  author_email text
);

create table if not exists public.audit_log (
  id           uuid primary key default extensions.gen_random_uuid(),
  created_at   timestamptz not null default now(),
  action       text not null,
  target_type  text not null default '',
  target_id    text not null default '',
  actor_id     uuid references public.profiles (id) on delete set null,
  actor_email  text,
  summary      text not null default '',
  ip           text
);

create index if not exists attempts_user_idx       on public.attempts (user_id, created_at desc);
create index if not exists attempts_subject_idx    on public.attempts (user_id, subject_slug);
create index if not exists attempt_answers_att_idx on public.attempt_answers (attempt_id, position);
create index if not exists activity_user_idx       on public.daily_activity (user_id, day desc);
create index if not exists review_due_idx          on public.review_items (user_id, due_on);
create index if not exists reports_status_idx      on public.content_reports (status, created_at desc);
create index if not exists feedback_created_idx    on public.feedback (created_at desc);
create index if not exists audit_created_idx       on public.audit_log (created_at desc);
create index if not exists profiles_xp_idx         on public.profiles (xp desc);

-- ================================================================== functions
-- True when the caller (browser token) is an admin. `security definer` so the
-- policy below can read `profiles.role` without recursing into its own policy.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;

-- Signup hook: every auth.users row gets a profile row. Copies the display name
-- from the signup metadata and grants admin when the email is allow-listed.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
begin
  candidate := coalesce(
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    split_part(coalesce(new.email, ''), '@', 1),
    'Learner'
  );
  insert into public.profiles (id, email, display_name, role, email_verified_at)
  values (
    new.id,
    coalesce(new.email, ''),
    left(btrim(candidate), 80),
    case when public.is_admin_email(new.email) then 'admin'::public.sq_role else 'learner'::public.sq_role end,
    new.email_confirmed_at
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- A browser-issued write may change preferences, never the server-owned columns.
-- The service-role key has no `auth.uid()`, so the API is unaffected.
create or replace function public.guard_profile_columns()
returns trigger
language plpgsql
as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  new.role := old.role;
  new.xp := old.xp;
  new.freeze_tokens := old.freeze_tokens;
  new.email := old.email;
  new.email_verified_at := old.email_verified_at;
  new.created_at := old.created_at;
  return new;
end;
$$;

-- Adds XP and spends streak-freeze tokens in one statement, so two attempts
-- finishing at the same moment cannot overwrite each other's totals.
create or replace function public.apply_attempt_xp(p_user uuid, p_xp integer, p_freeze_spent integer)
returns public.profiles
language sql
security definer
set search_path = public
as $$
  update public.profiles p
  set xp = p.xp + greatest(0, coalesce(p_xp, 0)),
      freeze_tokens = greatest(0, p.freeze_tokens - greatest(0, coalesce(p_freeze_spent, 0)))
  where p.id = p_user
  returning p.*;
$$;

-- One upsert per practice session instead of a read-modify-write round trip.
-- Rows older than the heatmap window are pruned so the table stays small.
create or replace function public.record_activity(
  p_user       uuid,
  p_day        date,
  p_lessons    integer,
  p_xp         integer,
  p_exercises  integer,
  p_minutes    integer
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.daily_activity as a
       (user_id, day, lessons_completed, xp_earned, exercises_completed, minutes)
  values (p_user, p_day, coalesce(p_lessons, 0), coalesce(p_xp, 0),
          coalesce(p_exercises, 0), coalesce(p_minutes, 0))
  on conflict (user_id, day) do update
     set lessons_completed   = a.lessons_completed + excluded.lessons_completed,
         xp_earned           = a.xp_earned + excluded.xp_earned,
         exercises_completed = a.exercises_completed + excluded.exercises_completed,
         minutes             = a.minutes + excluded.minutes;

  delete from public.daily_activity
   where user_id = p_user and day < p_day - 365;
$$;


-- ============================================================ row level security
-- The API talks to Postgres with the service-role key, which bypasses RLS. These
-- policies exist for everything else: the anon key, the SQL editor's `anon`
-- preview, and any future query built with a learner's own token.
alter table public.subjects          enable row level security;
alter table public.modules           enable row level security;
alter table public.lessons           enable row level security;
alter table public.questions         enable row level security;
alter table public.question_solutions enable row level security;
alter table public.profiles          enable row level security;
alter table public.lesson_progress   enable row level security;
alter table public.attempts          enable row level security;
alter table public.attempt_answers   enable row level security;
alter table public.daily_activity    enable row level security;
alter table public.bookmarks         enable row level security;
alter table public.review_items      enable row level security;
alter table public.content_reports   enable row level security;
alter table public.feedback          enable row level security;
alter table public.audit_log         enable row level security;

-- Published content is world-readable; unpublished rows need an admin.
drop policy if exists subjects_read on public.subjects;
create policy subjects_read on public.subjects
  for select to anon, authenticated
  using (published or public.is_admin());

drop policy if exists modules_read on public.modules;
create policy modules_read on public.modules
  for select to anon, authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.subjects s
      where s.id = modules.subject_id and s.published
    )
  );

drop policy if exists lessons_read on public.lessons;
create policy lessons_read on public.lessons
  for select to anon, authenticated
  using (published or public.is_admin());

drop policy if exists questions_read on public.questions;
create policy questions_read on public.questions
  for select to anon, authenticated
  using (published or public.is_admin());

-- Deliberately no policy: answer keys are service-role only.

-- Own profile, or any profile when you are an admin.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

revoke all on function public.apply_attempt_xp(uuid, integer, integer) from public, anon, authenticated;

-- Learner-owned rows: you see and change your own, admins may read everything.
drop policy if exists lesson_progress_owner on public.lesson_progress;
create policy lesson_progress_owner on public.lesson_progress
  for all to authenticated
  using (user_id = (select auth.uid()) or public.is_admin())
  with check (user_id = (select auth.uid()));

drop policy if exists attempts_owner on public.attempts;
create policy attempts_owner on public.attempts
  for all to authenticated
  using (user_id = (select auth.uid()) or public.is_admin())
  with check (user_id = (select auth.uid()));

drop policy if exists attempt_answers_owner on public.attempt_answers;
create policy attempt_answers_owner on public.attempt_answers
  for all to authenticated
  using (
    exists (
      select 1 from public.attempts a
      where a.id = attempt_answers.attempt_id
        and (a.user_id = (select auth.uid()) or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.attempts a
      where a.id = attempt_answers.attempt_id and a.user_id = (select auth.uid())
    )
  );

drop policy if exists daily_activity_owner on public.daily_activity;
create policy daily_activity_owner on public.daily_activity
  for all to authenticated
  using (user_id = (select auth.uid()) or public.is_admin())
  with check (user_id = (select auth.uid()));

drop policy if exists bookmarks_owner on public.bookmarks;
create policy bookmarks_owner on public.bookmarks
  for all to authenticated
  using (user_id = (select auth.uid()) or public.is_admin())
  with check (user_id = (select auth.uid()));

drop policy if exists review_items_owner on public.review_items;
create policy review_items_owner on public.review_items
  for all to authenticated
  using (user_id = (select auth.uid()) or public.is_admin())
  with check (user_id = (select auth.uid()));

-- Reports and feedback: anyone (including signed-out visitors, through the
-- feedback form) may file one; only the author or an admin may read it back.
drop policy if exists reports_insert on public.content_reports;
create policy reports_insert on public.content_reports
  for insert to authenticated, anon
  with check (reporter_id is null or reporter_id = (select auth.uid()));

drop policy if exists reports_read on public.content_reports;
create policy reports_read on public.content_reports
  for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_admin());

drop policy if exists reports_admin_write on public.content_reports;
create policy reports_admin_write on public.content_reports
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists feedback_insert on public.feedback;
create policy feedback_insert on public.feedback
  for insert to authenticated, anon
  with check (author_id is null or author_id = (select auth.uid()));

drop policy if exists feedback_read on public.feedback;
create policy feedback_read on public.feedback
  for select to authenticated
  using (author_id = (select auth.uid()) or public.is_admin());

drop policy if exists feedback_admin_delete on public.feedback;
create policy feedback_admin_delete on public.feedback
  for delete to authenticated
  using (public.is_admin());

-- The audit trail is admin-read and service-role-write.
drop policy if exists audit_admin_read on public.audit_log;
create policy audit_admin_read on public.audit_log
  for select to authenticated
  using (public.is_admin());

drop policy if exists audit_admin_delete on public.audit_log;

-- =========================================================== triggers & grants
drop trigger if exists subjects_touch on public.subjects;
create trigger subjects_touch before update on public.subjects
  for each row execute function public.touch_updated_at();

drop trigger if exists modules_touch on public.modules;
create trigger modules_touch before update on public.modules
  for each row execute function public.touch_updated_at();

drop trigger if exists lessons_touch on public.lessons;
create trigger lessons_touch before update on public.lessons
  for each row execute function public.touch_updated_at();

drop trigger if exists questions_touch on public.questions;
create trigger questions_touch before update on public.questions
  for each row execute function public.touch_updated_at();

drop trigger if exists solutions_touch on public.question_solutions;
create trigger solutions_touch before update on public.question_solutions
  for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists lesson_progress_touch on public.lesson_progress;
create trigger lesson_progress_touch before update on public.lesson_progress
  for each row execute function public.touch_updated_at();

drop trigger if exists profiles_guard_columns on public.profiles;
create trigger profiles_guard_columns before update on public.profiles
  for each row execute function public.guard_profile_columns();

grant usage on schema public to anon, authenticated;

grant select on public.subjects, public.modules, public.lessons, public.questions to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on
  public.lesson_progress, public.daily_activity, public.bookmarks, public.review_items to authenticated;
grant select on public.attempts, public.attempt_answers to authenticated;
grant insert on public.content_reports, public.feedback to anon, authenticated;
grant select, update on public.content_reports to authenticated;
grant select, delete on public.feedback to authenticated;
grant select on public.audit_log to authenticated;
revoke insert, update, delete on public.attempts, public.attempt_answers from anon, authenticated;
revoke insert, update, delete on public.audit_log from anon, authenticated;

-- Belt and braces next to the missing policies above.
revoke all on public.question_solutions from anon, authenticated, public;

-- Sanity check: 15 tables, all with RLS on, and no policy on question_solutions.
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;

revoke all on function public.record_activity(uuid, date, integer, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.apply_attempt_xp(uuid, integer, integer) to service_role;
grant execute on function public.record_activity(uuid, date, integer, integer, integer, integer) to service_role;


