-- 10day_workflow: Home + Todo rework (phase-1 schema)
-- Created: 2026-03-11
-- Safe to run in Supabase SQL Editor.

begin;

-- 1) Todo main table
create table if not exists public.todos (
  id bigserial primary key,
  user_id uuid not null,
  cycle_id bigint not null references public.cycles(id) on delete cascade,
  content text not null,
  status text not null default 'pending' check (status in ('pending','done','dropped')),
  source text not null default 'manual' check (source in ('manual','ai_parse')),
  last_status_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Todo submission batch table (one submit action)
create table if not exists public.todo_submissions (
  id bigserial primary key,
  user_id uuid not null,
  cycle_id bigint not null references public.cycles(id) on delete cascade,
  submit_type text not null default 'manual' check (submit_type in ('manual','auto_cycle_rollover')),
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 3) Todo submission item mapping (todo -> record)
create table if not exists public.todo_submission_items (
  id bigserial primary key,
  submission_id bigint not null references public.todo_submissions(id) on delete cascade,
  todo_id bigint not null references public.todos(id) on delete cascade,
  record_id bigint references public.records(id) on delete set null,
  status_at_submit text not null check (status_at_submit in ('pending','done','dropped')),
  event_time timestamptz not null,
  created_at timestamptz not null default now(),
  unique (submission_id, todo_id)
);

-- 4) Indexes
create index if not exists idx_todos_user_cycle on public.todos(user_id, cycle_id);
create index if not exists idx_todos_user_status on public.todos(user_id, status);
create index if not exists idx_todos_last_changed on public.todos(last_status_changed_at desc);

create index if not exists idx_todo_submissions_user_cycle on public.todo_submissions(user_id, cycle_id, submitted_at desc);
create index if not exists idx_todo_submission_items_submission on public.todo_submission_items(submission_id);
create index if not exists idx_todo_submission_items_todo on public.todo_submission_items(todo_id);

-- 5) updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_todos_updated_at on public.todos;
create trigger trg_todos_updated_at
before update on public.todos
for each row execute function public.set_updated_at();

-- 6) RLS
alter table public.todos enable row level security;
alter table public.todo_submissions enable row level security;
alter table public.todo_submission_items enable row level security;

-- todos policies
drop policy if exists "todos_select_own" on public.todos;
create policy "todos_select_own" on public.todos
for select using (auth.uid() = user_id);

drop policy if exists "todos_insert_own" on public.todos;
create policy "todos_insert_own" on public.todos
for insert with check (auth.uid() = user_id);

drop policy if exists "todos_update_own" on public.todos;
create policy "todos_update_own" on public.todos
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "todos_delete_own" on public.todos;
create policy "todos_delete_own" on public.todos
for delete using (auth.uid() = user_id);

drop policy if exists "todo_submissions_select_own" on public.todo_submissions;
create policy "todo_submissions_select_own" on public.todo_submissions
for select using (auth.uid() = user_id);

drop policy if exists "todo_submissions_insert_own" on public.todo_submissions;
create policy "todo_submissions_insert_own" on public.todo_submissions
for insert with check (auth.uid() = user_id);

drop policy if exists "todo_submissions_update_own" on public.todo_submissions;
create policy "todo_submissions_update_own" on public.todo_submissions
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "todo_submissions_delete_own" on public.todo_submissions;
create policy "todo_submissions_delete_own" on public.todo_submissions
for delete using (auth.uid() = user_id);

drop policy if exists "todo_submission_items_select_own" on public.todo_submission_items;
create policy "todo_submission_items_select_own" on public.todo_submission_items
for select using (
  exists (
    select 1 from public.todo_submissions s
    where s.id = todo_submission_items.submission_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "todo_submission_items_insert_own" on public.todo_submission_items;
create policy "todo_submission_items_insert_own" on public.todo_submission_items
for insert with check (
  exists (
    select 1 from public.todo_submissions s
    where s.id = todo_submission_items.submission_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "todo_submission_items_update_own" on public.todo_submission_items;
create policy "todo_submission_items_update_own" on public.todo_submission_items
for update using (
  exists (
    select 1 from public.todo_submissions s
    where s.id = todo_submission_items.submission_id
      and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.todo_submissions s
    where s.id = todo_submission_items.submission_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "todo_submission_items_delete_own" on public.todo_submission_items;
create policy "todo_submission_items_delete_own" on public.todo_submission_items
for delete using (
  exists (
    select 1 from public.todo_submissions s
    where s.id = todo_submission_items.submission_id
      and s.user_id = auth.uid()
  )
);

commit;
