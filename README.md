# HumanResourceSystem

Monorepo (npm workspaces) with:

- **API**: Express + TypeScript REST API, JWT login, Swagger UI
- **Web**: Vite + React + TypeScript UI (responsive login + placeholder pages)

## Prereqs

- Node.js 20+ (you have Node installed already)

## Setup

1) Install dependencies:

`npm install`

2) Create API env file:

- Copy `apps/api/.env.example` to `apps/api/.env`
- Set database credentials in `apps/api/.env` (`DATABASE_URL` or `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`)

3) Run API + Web together:

`npm run dev`

## Start the apps

- Start both frontend + backend:

`npm run dev`

- Start backend only (API):

`npm run dev:api`

- Start frontend only (Web):

`npm run dev:web`

## Useful scripts (root)

- Dev (API + Web): `npm run dev`
- Dev (API only): `npm run dev:api`
- Dev (Web only): `npm run dev:web`
- Typecheck (both): `npm run typecheck`
- Build (both): `npm run build`

## Production

1) Build everything:

`npm run build`

2) Start the API (serves only the API; the web app is a separate static build):

`npm -w apps/api run start`

## URLs

- API health: `http://localhost:4000/api/health`
- Swagger UI: `http://localhost:4000/docs`
- Web app: `http://localhost:5173`

## Default user

- Email: `admin@example.com`
- Password: `Admin@1234`

## Permission notes

- Job seeker application status changes require: `CHANGE_JOBSEEKER_APP_STATUS`
- Moving applicants back to All Applicants requires: `MOVE_BACK_TO_ALL_APPLICANTS`
- App color theme changes require: `CHANGE_APP_COLOR`
- Admin dashboard widgets require: `ADMIN_DASHBOARD`
- Employer dashboard widgets require: `EMPLOYER_DASHBOARD`
- Job seeker dashboard widgets require: `JOB_SEEKER_DASHBOARD`
- Full page-to-permission mapping is documented in `PERMISSIONS.md`
