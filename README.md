# RoomCast

Digital signage calendar platform for displays and room screens. Connect external calendars (Exchange, Google, CalDAV, ICS), manage rooms, and display real-time schedules on any screen via a simple URL.

## Features

- **Calendar Integration** — Exchange, Google Calendar, CalDAV, ICS feeds with encrypted credentials
- **5 Display Layouts** — Room Booking, Agenda, Day Grid, Week Grid, Info Display
- **Real-time Updates** — Server-Sent Events push changes to displays instantly
- **Multi-language** — German, English, French (i18n via next-intl)
- **Role-based Access** — Admin, Editor, Viewer roles with audit logging
- **Token-based Displays** — Public display access without authentication
- **Theme & Branding** — Customizable colors, fonts, logos per display
- **Docker Ready** — Multi-stage production build with sync worker

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS v4, shadcn/ui |
| Language | TypeScript 5.9 (strict) |
| Database | PostgreSQL 16 |
| ORM | Prisma 6 |
| Auth | NextAuth v5 (Credentials, Google, Microsoft Entra ID) |
| Testing | Vitest + Playwright |

## Quick Start

### Prerequisites

- **Node.js 20+**
- **PostgreSQL 16** (or use Docker Compose)
- **npm**

### 1. Clone & Install

```bash
git clone https://github.com/Firestarter3716/roomcast.git
cd roomcast
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Generate secrets:

```bash
# Generate and paste into .env
openssl rand -base64 32  # → NEXTAUTH_SECRET
openssl rand -base64 32  # → ENCRYPTION_SECRET
openssl rand -base64 32  # → CRON_SECRET
```

### 3. Start Database

```bash
docker compose up db -d
```

### 4. Initialize Database

```bash
npx prisma db push
npm run db:seed
```

This creates the schema and seeds a default admin account:
- **Email:** `admin@roomcast.local`
- **Password:** `changeme`

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with the admin credentials.

## Docker (Production)

Run the full stack with a single command:

```bash
# Generate secrets first
export NEXTAUTH_SECRET=$(openssl rand -base64 32)
export ENCRYPTION_SECRET=$(openssl rand -base64 32)
export CRON_SECRET=$(openssl rand -base64 32)

docker compose up -d
```

This starts:
- **db** — PostgreSQL 16
- **app** — Next.js production server (port 3000)
- **sync-worker** — Background calendar sync worker

## NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm test` | Run unit/integration/component tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:e2e` | Run E2E tests (Playwright) |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:seed` | Seed admin user and system settings |
| `npm run db:studio` | Open Prisma Studio (database GUI) |
| `npm run sync:worker` | Start calendar sync worker (dev) |

## Testing

267 tests across 4 layers:

```
Unit Tests          124   (schemas, utilities, middleware, i18n)
Integration Tests    47   (API endpoints, SSE, encryption roundtrip)
UI/Component Tests   83   (cards, dialogs, dashboard, theme)
E2E Tests            13   (auth, calendar/room/display/user CRUD)
```

```bash
# All unit/integration/component tests
npm test

# E2E tests (requires running dev server)
npm run test:e2e

# Both
npm test && npm run test:e2e
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_URL` | Yes | Application URL (e.g. `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | Yes | Session signing secret |
| `ENCRYPTION_SECRET` | Yes | Calendar credential encryption key |
| `CRON_SECRET` | Yes | Sync worker authentication |
| `ADMIN_EMAIL` | No | Seed admin email (default: `admin@roomcast.local`) |
| `ADMIN_PASSWORD` | No | Seed admin password (default: `changeme`) |
| `GOOGLE_AUTH_CLIENT_ID` | No | Google OAuth |
| `GOOGLE_AUTH_CLIENT_SECRET` | No | Google OAuth |
| `AZURE_AD_CLIENT_ID` | No | Microsoft Entra ID OAuth |
| `AZURE_AD_CLIENT_SECRET` | No | Microsoft Entra ID OAuth |
| `AZURE_AD_TENANT_ID` | No | Microsoft Entra ID OAuth |

## Project Structure

```
src/
├── app/           Next.js App Router (pages, API routes, layouts)
├── features/      Feature modules
│   ├── calendars/ Calendar integration (4 providers)
│   ├── display/   Display rendering (5 layouts, SSE, real-time)
│   ├── displays/  Display configuration (editor, wizard, QR)
│   ├── rooms/     Room management
│   ├── users/     User management
│   ├── settings/  System settings & health dashboard
│   └── audit/     Audit logging
├── server/        Backend services (auth, sync, SSE, middleware)
├── shared/        Shared components & utilities
└── i18n/          Translations (de, en, fr)
e2e/               Playwright E2E tests + page objects
```

## License

Private
