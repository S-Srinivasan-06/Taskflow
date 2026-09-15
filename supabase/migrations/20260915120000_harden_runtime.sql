-- Additive migration: existing unowned data is preserved for administrator review.
alter table app.tasks add column if not exists completed_at timestamptz;
-- Historical completion times are unknown; do not invent them from due dates.
do $$ begin
if not exists (select 1 from pg_constraint where conname = 'tasks_owner_required' and conrelid = 'app.tasks'::regclass) then
  alter table app.tasks add constraint tasks_owner_required check (user_id is not null) not valid;
end if;
end $$;
do $$ begin
  if not exists (select 1 from app.tasks where user_id is null) then
    alter table app.tasks validate constraint tasks_owner_required;
    alter table app.tasks alter column user_id set not null;
  end if;
end $$;
create index if not exists idx_tasks_owner_completed on app.tasks(user_id, completed_at) where is_deleted = false and status = 'DONE';
create table if not exists app.auth_rate_limits (
  key_hash varchar(64) primary key,
  expires_at timestamptz not null,
  attempts integer not null check (attempts >= 0)
);
create index if not exists idx_auth_rate_limits_expiry on app.auth_rate_limits(expires_at);
alter table app.auth_rate_limits enable row level security;
create table if not exists app.schema_version (id integer primary key check (id = 1), version integer not null);
insert into app.schema_version values (1, 3) on conflict (id) do update set version = excluded.version;
alter table app.schema_version enable row level security;
revoke all on all tables in schema app from public, anon, authenticated;

-- Backend login role: no DDL, no role creation, no superuser or RLS bypass.
-- Set its password privately after applying migrations; never commit a password.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'taskflow_app') then
    create role taskflow_app login nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
  end if;
end $$;
grant usage on schema app to taskflow_app;
grant select, insert, update on app.tasks, app.app_users to taskflow_app;
grant select, insert, update, delete on app.login_sessions, app.auth_rate_limits to taskflow_app;
grant select on app.schema_version to taskflow_app;
drop policy if exists backend_access on app.tasks;
drop policy if exists backend_access on app.app_users;
drop policy if exists backend_access on app.login_sessions;
drop policy if exists backend_access on app.auth_rate_limits;
drop policy if exists backend_access on app.schema_version;
create policy backend_access on app.tasks to taskflow_app using (true) with check (true);
create policy backend_access on app.app_users to taskflow_app using (true) with check (true);
create policy backend_access on app.login_sessions to taskflow_app using (true) with check (true);
create policy backend_access on app.auth_rate_limits to taskflow_app using (true) with check (true);
create policy backend_access on app.schema_version for select to taskflow_app using (true);
