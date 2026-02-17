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

3) Run API + Web together:

`npm run dev`

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
