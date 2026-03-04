# MTS-Logistics

Production-ready starter for a **Multi-Tenant SaaS & Logistics System**.

## Implemented Deliverables

- Prisma schema with tenant discriminator strategy in `backend/prisma/schema.prisma`.
- NestJS tenant extraction + request tenant context + Prisma tenant scoping in:
  - `backend/src/common/tenant/tenant-context.middleware.ts`
  - `backend/src/common/tenant/tenant-scope.interceptor.ts`
  - `backend/src/prisma/prisma.service.ts`
- Industrial high-contrast dashboard layout component in `frontend/src/components/dashboard-layout.tsx`.
- Demo data seeding script in `backend/scripts/mock-data-generator.ts`.
- Docker Compose stack for API, Web, Postgres, and Redis in `docker-compose.yml`.
- GitHub Actions CI/CD workflow in `.github/workflows/ci-cd.yml`.

## Quick Start

1. Install dependencies:
   - `cd backend && npm install`
   - `cd ../frontend && npm install`
2. Generate Prisma client:
   - `cd ../backend`
   - `npx prisma generate`
3. (Optional) Run mock seed script:
   - `npm run mock:seed`
4. Start with Docker:
   - From repo root: `docker compose up --build`

## Tenant Isolation Notes

- Middleware extracts tenant context from `x-tenant-id`, authenticated user claim, or subdomain.
- Interceptor ensures each request has a tenant and stores it in `AsyncLocalStorage`.
- Prisma service enforces tenant scoping on read/write operations and injects `tenantId` on create/upsert.

## Auth Endpoints

- `POST /auth/register-tenant` (public): creates tenant + admin user and returns JWT.
- `POST /auth/login` (public): returns JWT for existing tenant admin/user.
- `GET /auth/me` (protected): resolves authenticated user from JWT.

JWT payload includes `sub`, `tenantId`, `email`, and `role`. Protected HTTP routes require `Authorization: Bearer <token>`.

## Visual Theme

- Primary: `#FF4F00` (International Orange)
- Background: `#020617` (Slate 950)
- Typography: Inter

## Dashboard Screenshot

Admin command center view:

![Admin Dashboard](docs/screenshots/admin-dashboard.png)
