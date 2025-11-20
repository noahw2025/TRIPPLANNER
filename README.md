# TripIt – Itinerary Planner

FastAPI + React/Vite app for planning trips with auth, itineraries, budgets, and live weather.

## Prerequisites
- Python 3.11+
- Node 18+
- Git

## Backend setup
```bash
cd backend
python -m venv venv
./venv/Scripts/activate  # Windows (PowerShell)
# source venv/bin/activate  # macOS/Linux

pip install -r requirements.txt
cp .env.example .env  # fill JWT_SECRET, etc. if needed
alembic upgrade head
uvicorn app.main:app --reload
```

## Frontend setup
```bash
cd frontend
cp .env.example .env
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
- SQLite DB lives in project root as `trip_planner.db` (ignored by git).
- Weather uses Open-Meteo (no API key).
- PDF export available per trip.
