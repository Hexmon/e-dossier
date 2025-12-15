# e-dossier v2

Next.js + Drizzle ORM + PostgreSQL application for managing dossiers. This repo includes schema definitions, migrations, seed scripts, and deployment helpers for a two-VM (App + DB) setup.

# Admin (post: ADMIN)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=Admin@1234
ADMIN_EMAIL=admin@example.com
ADMIN_PHONE=+910000000001
ADMIN_NAME=Admin
ADMIN_RANK=ADMIN

## Seeding admin accounts

With the above env vars set (or in a .env file), run `pnpm seed:admins` to create/update the SUPER_ADMIN and ADMIN users, their credentials, positions, and active appointments.
