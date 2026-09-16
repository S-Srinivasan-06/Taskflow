# Vercel + Render + Supabase deployment

## Database

Run 'supabase db push'. In the Supabase SQL editor, assign a strong private
password to the migration-created taskflow_app role:

    alter role taskflow_app password 'GENERATE_A_UNIQUE_PASSWORD';

Use the Session pooler on port 5432. The role's pooler username is normally
'taskflow_app.PROJECT_REF'.

## Render backend

Create a Blueprint from render.yaml and set SUPABASE_DB_URL,
SUPABASE_DB_USERNAME, SUPABASE_DB_PASSWORD, and TASKFLOW_PROXY_SECRET. The
secret must contain at least 32 random characters. Copy the resulting Render
URL. Readiness is exposed at /actuator/health/readiness.

The Blueprint explicitly uses Render's free plan in Singapore, the nearest
available Render region to this project's Supabase Tokyo region. Free services
spin down when idle, so the first request after inactivity can take longer.

## Vercel frontend

Import the same GitHub repository and set Root Directory to 'frontend'. Set
RENDER_BACKEND_URL to the Render URL and TASKFLOW_PROXY_SECRET to exactly the
same value used by Render.

The Vercel function keeps browser API calls same-origin, forwards cookies,
passes a verified client address for login throttling, and disables API caching.

## Verification

On the Vercel URL, register a temporary user, create/edit/complete/delete a
task, sign out, and sign in again. Authentication cookies should appear on the
Vercel domain with Secure, HttpOnly, and SameSite=Lax.
