FROM postgres:17-alpine

COPY docker/postgres/000-create-supabase-roles.sql /docker-entrypoint-initdb.d/000-create-supabase-roles.sql
COPY supabase/migrations/*.sql /docker-entrypoint-initdb.d/
