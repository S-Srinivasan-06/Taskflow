-- Existing shared tasks retain NULL ownership and cannot be accessed by any user.
-- Assign legacy rows to a verified account only through an explicit admin migration.
create table app.app_users (
    id uuid primary key,
    username varchar(32) not null unique,
    password_hash varchar(100) not null,
    created_at timestamptz not null,
    constraint username_format check (username ~ '^[a-z0-9_.-]{3,32}$')
);

create table app.login_sessions (
    token_hash varchar(64) primary key,
    user_id uuid not null references app.app_users(id) on delete cascade,
    expires_at timestamptz not null
);
create index idx_login_sessions_expiry on app.login_sessions(expires_at);
create index idx_login_sessions_user on app.login_sessions(user_id);

alter table app.tasks add column user_id uuid references app.app_users(id);
create index idx_tasks_owner_active_due on app.tasks(user_id, is_deleted, due_at, id);

-- Access is through Spring's authenticated, owner-filtered API. No browser role
-- can access the private tables, even if the schema is accidentally exposed.
alter table app.tasks enable row level security;
alter table app.app_users enable row level security;
alter table app.login_sessions enable row level security;
revoke all on schema app from public, anon, authenticated;
revoke all on all tables in schema app from public, anon, authenticated;
