# Supabase setup

Taskflow uses Supabase as managed PostgreSQL through the existing Spring Boot
backend. The browser continues to call the Taskflow REST API; it does not receive
the database password or connect directly to PostgreSQL.

## 1. Link the repository

The Supabase CLI is available without a global installation through `npx`:

```powershell
npx --yes supabase@latest login --agent no --output-format text
npx --yes supabase@latest link --project-ref bxqdpikshuczcutymwrm
```

The GitHub integration working directory should be `.` because `supabase/` is at
the repository root. Migrations committed under `supabase/migrations/` are then
available to Supabase Branching and, when enabled in the dashboard, production
deployment.

## 2. Configure the backend

In the Supabase dashboard, open **Connect** and select the **Session pooler** on
port `5432`. Use its host, username, and database password to set:

```env
SPRING_PROFILES_ACTIVE=supabase
SUPABASE_DB_URL=jdbc:postgresql://POOLER_HOST:5432/postgres?sslmode=require
SUPABASE_DB_USERNAME=postgres.PROJECT_REF
SUPABASE_DB_PASSWORD=YOUR_DATABASE_PASSWORD
```

Use the exact host and username shown by the dashboard. Do not use the
transaction pooler on port `6543`; Hibernate relies on prepared statements.
Store these values in your deployment platform's secret manager or an ignored
local `.env` file. Never commit the real password.

The Supabase profile uses the private `app` schema and runs Hibernate in
`validate` mode. The committed migration creates that schema and its `tasks`
table. Local development remains on the existing PostgreSQL configuration.

## 3. Apply and verify

If automatic production deployment is disabled in the Supabase GitHub
integration, apply committed migrations explicitly:

```powershell
npx --yes supabase@latest db push
```

Start the backend with the three `SUPABASE_DB_*` variables and
`SPRING_PROFILES_ACTIVE=supabase`. A successful startup confirms that Hibernate
validated the remote schema. Then call `GET http://localhost:8081/api/v1/tasks`.

If the remote project already contains a `tasks` table in another schema, this
migration does not move or delete it. Migrate that data deliberately before
switching production traffic.
