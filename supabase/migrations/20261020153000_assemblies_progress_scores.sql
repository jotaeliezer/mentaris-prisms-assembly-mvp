-- Saved worlds (assemblies), one progress blob, and one score per world.
-- A pilot is a Supabase anonymous user. They can keep 5 assemblies.

create table public.assemblies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 24),
  seed text not null check (char_length(seed) between 1 and 64),
  mission_id text not null default 'add' check (char_length(mission_id) between 1 and 32),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assemblies_user_id_idx on public.assemblies (user_id);

create table public.progress (
  assembly_id uuid primary key references public.assemblies (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  snapshot jsonb not null,
  saved_at timestamptz not null default now()
);

create index progress_user_id_idx on public.progress (user_id);

create table public.scores (
  assembly_id uuid primary key references public.assemblies (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  score integer not null default 0 check (score >= 0),
  layer integer not null default 0,
  cluster integer not null default 1 check (cluster >= 1),
  updated_at timestamptz not null default now()
);

create index scores_user_id_idx on public.scores (user_id);

create or replace function public.limit_player_assemblies()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (select count(*) from public.assemblies where user_id = new.user_id) >= 5 then
    raise exception 'An account can keep 5 assemblies.';
  end if;
  return new;
end;
$$;

create trigger assemblies_limit_5
  before insert on public.assemblies
  for each row
  execute function public.limit_player_assemblies();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger assemblies_touch_updated_at
  before update on public.assemblies
  for each row
  execute function public.touch_updated_at();

alter table public.assemblies enable row level security;
alter table public.progress enable row level security;
alter table public.scores enable row level security;

create policy assemblies_select on public.assemblies
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy assemblies_insert on public.assemblies
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy assemblies_update on public.assemblies
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy assemblies_delete on public.assemblies
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy progress_select on public.progress
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy progress_insert on public.progress
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.assemblies
      where id = assembly_id and user_id = (select auth.uid())
    )
  );

create policy progress_update on public.progress
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.assemblies
      where id = assembly_id and user_id = (select auth.uid())
    )
  );

create policy progress_delete on public.progress
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy scores_select on public.scores
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy scores_insert on public.scores
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.assemblies
      where id = assembly_id and user_id = (select auth.uid())
    )
  );

create policy scores_update on public.scores
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.assemblies
      where id = assembly_id and user_id = (select auth.uid())
    )
  );

create policy scores_delete on public.scores
  for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.assemblies to authenticated;
grant select, insert, update, delete on public.progress to authenticated;
grant select, insert, update, delete on public.scores to authenticated;

revoke all on public.assemblies from anon;
revoke all on public.progress from anon;
revoke all on public.scores from anon;
