# TripIt – Itinerary Planner

FastAPI + React/Vite app for planning trips with auth, itineraries, budgets, and live weather.

## Prerequisites
- Python 3.11+
- Node 18+
- Git

## Environment
- Backend config: `backend/.env` (copy from `.env.example`). Use the Supabase **session pooler (IPv4) connection string**:  
  `postgresql+psycopg2://postgres:<PASSWORD>@<POOLER_HOST>:6543/postgres?sslmode=require`
  - In Supabase UI: Database → Connection pooling → Session → copy the URI (it is IPv4). Replace `<PASSWORD>`.
  - Set `TRIP_PLANNER_SECRET_KEY` to a strong random string.
- Frontend config: `frontend/.env` (copy from `.env.example`) with `VITE_API_BASE_URL` pointing to your backend (`http://localhost:8000` for local, your deployed URL for prod).

## Backend setup (Supabase/Postgres)
```bash
cd backend
python -m venv venv
./venv/Scripts/activate  # Windows (PowerShell)
# source venv/bin/activate  # macOS/Linux

pip install -r requirements.txt
cp .env.example .env  # then edit with your Supabase session pooler URL + secret key
alembic upgrade head   # applies migrations to Supabase
uvicorn app.main:app --reload
```

## Frontend setup
```bash
cd frontend
cp .env.example .env   # set VITE_API_BASE_URL
npm install
npm run dev
```

App URLs:
- API: http://localhost:8000
- Web: http://localhost:5173

## Auth & demo
- Seed demo data (optional): `python -m app.seed` from backend (venv active).
- Demo login (after seed): `demo@example.com / demo123`

## Scripts
- Backend dev server: `uvicorn app.main:app --reload`
- Frontend dev server: `npm run dev`
- Frontend build: `npm run build`

## Notes
- Weather uses Open-Meteo (no API key).
- PDF export available per trip.

## Deploy (Supabase + Railway/Render + Vercel/Netlify)
- Database: Supabase Postgres (session pooler URL). Set `TRIP_PLANNER_DATABASE_URL`, `TRIP_PLANNER_SECRET_KEY`, etc.
- Backend (FastAPI): deploy `backend` as a container/service.
  - Build from `backend/Dockerfile`
  - Env vars: `TRIP_PLANNER_DATABASE_URL`, `TRIP_PLANNER_SECRET_KEY`, `TRIP_PLANNER_ALGORITHM`, `TRIP_PLANNER_ACCESS_TOKEN_EXPIRE_MINUTES`
  - `PORT` provided by host; start command already runs `alembic upgrade head` then `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Frontend: deploy `frontend` build to Vercel/Netlify and set `VITE_API_BASE_URL` to your backend URL.
