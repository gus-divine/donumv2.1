# Donum 2.1 — Web

Next.js 16 + TypeScript + Tailwind + Supabase.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Run with Docker

```bash
docker compose up --build
```

## Env

`.env.local` should have:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Use `env.example` as a template.

## Super admin

- **Email:** superadmin@donumplan.com  
- **Password:** ChangeMe123!
