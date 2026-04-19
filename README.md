# PirateSpotters.space

Real-time pirate intelligence platform for Star Citizen.

## Quick Start

Open **two terminals**:

**Terminal 1 — Backend:**
```
start-backend.bat
```
API runs at http://localhost:8000

**Terminal 2 — Frontend:**
```
start-frontend.bat
```
App runs at http://localhost:5173

## Stack

- **Frontend**: React + Vite + TailwindCSS
- **Backend**: FastAPI + SQLite
- **No cloud, no accounts, no cost**

## Project Structure

```
piratespotter/
  frontend/     React app
  backend/
    main.py     FastAPI routes
    database.py SQLAlchemy models + SQLite
    venv/       Python virtualenv
  start-backend.bat
  start-frontend.bat
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/reports | List reports (filter: system, since, limit) |
| POST | /api/reports | Submit a new report |
| POST | /api/reports/{id}/vote | Upvote or downvote |

## Upgrading Later

When you're ready to go live:
- Swap SQLite for Supabase (Postgres) — change `DATABASE_URL` in `database.py`
- Deploy frontend to Vercel (`vercel` CLI, one command)
- Deploy backend to Railway or Render (free tiers available)
