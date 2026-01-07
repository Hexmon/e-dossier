# e-dossier-v2

## Project Details
- Next.js 15 app (App Router) written in TypeScript
- PostgreSQL database accessed via Drizzle ORM
- Backend APIs live under `/api/v1`

## Setup Guide
1. Install prerequisites: Node.js and `pnpm`.
2. Install dependencies: `pnpm install`.
3. Configure environment:
   - Copy `.env.example` to `.env`.
   - Update `DATABASE_URL`, JWT keys, CSRF secret, and any admin credentials.
4. Prepare the database:
   - Create the database defined in `DATABASE_URL`.
   - Run migrations: `pnpm db:migrate`.
5. (Optional) Seed admin accounts: `pnpm seed:admins`.
6. Start the dev server: `pnpm dev` and open `http://localhost:3000`.
