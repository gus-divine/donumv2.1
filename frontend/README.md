# Donum 2.1 — Web

Next.js 16 + TypeScript + Tailwind + Supabase.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Run with Docker

From project root (runs both frontend and backend):

```bash
docker compose up --build
```

Or use `.\start-dev-clean.ps1` to start with cleanup.

## Env

`.env.local` should have:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Use `.env.example` as a template.

## Super admin

- **Email:** superadmin@donumplan.com  
- **Password:** ChangeMe123! (or whatever you set via reset script)

**Reset password** (if login fails):

```bash
cd frontend
npm run reset-super-admin
# Or with custom password:
npm run reset-super-admin -- YourNewPassword123!
```
