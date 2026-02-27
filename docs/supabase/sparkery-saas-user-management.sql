-- Sparkery SaaS user-management baseline
-- Run in Supabase SQL editor for Sparkery workspace user directory.

set lock_timeout = '5s';
set statement_timeout = '10min';

create table if not exists public.sparkery_workspace_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users (id) on delete set null,
  email text not null unique,
  display_name text not null,
  role text not null default 'user',
  status text not null default 'active',
  last_login_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.sparkery_workspace_members
  drop constraint if exists sparkery_workspace_members_role_check;
alter table if exists public.sparkery_workspace_members
  add constraint sparkery_workspace_members_role_check check (
    role in ('admin', 'manager', 'employee', 'user', 'guest')
  );

alter table if exists public.sparkery_workspace_members
  drop constraint if exists sparkery_workspace_members_status_check;
alter table if exists public.sparkery_workspace_members
  add constraint sparkery_workspace_members_status_check check (
    status in ('active', 'invited', 'suspended')
  );

create index if not exists idx_sparkery_workspace_members_user_id
  on public.sparkery_workspace_members (user_id);
create index if not exists idx_sparkery_workspace_members_email
  on public.sparkery_workspace_members (lower(email));

create or replace function public.set_sparkery_workspace_member_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.sparkery_workspace_members_bootstrap_role()
returns trigger
language plpgsql
as $$
begin
  if (new.role is null or new.role = 'user') then
    if not exists (
      select 1
      from public.sparkery_workspace_members existing
    ) then
      new.role = 'admin';
    end if;
  end if;
  return new;
end;
$$;

do $$
begin
  if to_regclass('public.sparkery_workspace_members') is not null then
    execute 'drop trigger if exists trg_sparkery_workspace_members_updated_at on public.sparkery_workspace_members';
    execute 'create trigger trg_sparkery_workspace_members_updated_at before update on public.sparkery_workspace_members for each row execute function public.set_sparkery_workspace_member_updated_at()';
    execute 'drop trigger if exists trg_sparkery_workspace_members_bootstrap_role on public.sparkery_workspace_members';
    execute 'create trigger trg_sparkery_workspace_members_bootstrap_role before insert on public.sparkery_workspace_members for each row execute function public.sparkery_workspace_members_bootstrap_role()';
  end if;
end;
$$;

alter table public.sparkery_workspace_members enable row level security;

create or replace function public.sparkery_is_workspace_manager(target_user uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.sparkery_workspace_members m
    where m.user_id = target_user
      and m.status = 'active'
      and m.role in ('admin', 'manager')
  );
$$;

revoke all on function public.sparkery_is_workspace_manager(uuid) from public;
grant execute on function public.sparkery_is_workspace_manager(uuid) to authenticated;

drop policy if exists sparkery_workspace_members_select on public.sparkery_workspace_members;
create policy sparkery_workspace_members_select
on public.sparkery_workspace_members
for select
to authenticated
using (
  auth.uid() is not null
  and (
    user_id = auth.uid()
    or public.sparkery_is_workspace_manager(auth.uid())
  )
);

drop policy if exists sparkery_workspace_members_insert on public.sparkery_workspace_members;
create policy sparkery_workspace_members_insert
on public.sparkery_workspace_members
for insert
to authenticated
with check (
  auth.uid() is not null
  and (
    user_id = auth.uid()
    or public.sparkery_is_workspace_manager(auth.uid())
  )
);

drop policy if exists sparkery_workspace_members_update on public.sparkery_workspace_members;
create policy sparkery_workspace_members_update
on public.sparkery_workspace_members
for update
to authenticated
using (
  auth.uid() is not null
  and (
    user_id = auth.uid()
    or public.sparkery_is_workspace_manager(auth.uid())
  )
)
with check (
  auth.uid() is not null
  and (
    user_id = auth.uid()
    or public.sparkery_is_workspace_manager(auth.uid())
  )
);

reset lock_timeout;
reset statement_timeout;
