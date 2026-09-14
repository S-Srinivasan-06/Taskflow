-- The production Supabase database already owns these roles. Plain PostgreSQL
-- needs compatible NOLOGIN roles so the shared migrations can apply their
-- browser-access revocations unchanged.
do $$
begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then
        create role anon nologin;
    end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then
        create role authenticated nologin;
    end if;
end
$$;
