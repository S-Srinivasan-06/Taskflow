create schema if not exists app;

create table if not exists app.tasks (
    id uuid primary key,
    title varchar(255) not null,
    description text,
    due_at timestamp(6) with time zone,
    status varchar(255) not null default 'PENDING',
    priority varchar(255) not null default 'LOW',
    category varchar(255),
    is_deleted boolean not null default false,
    created_at timestamp(6) with time zone not null,
    updated_at timestamp(6) with time zone not null,
    version bigint not null default 0,
    constraint chk_tasks_status
        check (status in ('PENDING', 'IN_PROGRESS', 'DONE', 'CANCELLED')),
    constraint chk_tasks_priority
        check (priority in ('LOW', 'MEDIUM', 'HIGH', 'URGENT'))
);

create index if not exists idx_tasks_due_at on app.tasks (due_at);
create index if not exists idx_tasks_status on app.tasks (status);
create index if not exists idx_tasks_is_deleted on app.tasks (is_deleted);

-- Browser-facing Supabase roles must not access the private application schema.
revoke all on schema app from anon, authenticated;
revoke all on table app.tasks from anon, authenticated;
