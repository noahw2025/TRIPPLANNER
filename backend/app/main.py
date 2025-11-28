"""FastAPI application entrypoint."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import auth, budget, destinations, events, trips, weather
from .schemas import HealthResponse

app = FastAPI(title="Trip Itinerary Planner")

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://tripplanner-production-8891.up.railway.app",  # backend self
]

# Allow any *.vercel.app frontend (for deployed clients)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", response_model=HealthResponse, tags=["health"])
def health_check() -> HealthResponse:
    """Simple health endpoint for uptime checks."""
    return HealthResponse(status="ok")


@app.get("/", tags=["health"])
def root():
    return {"status": "ok"}


# Register routers (implementations will be added incrementally).
app.include_router(auth.router, prefix="/auth")
app.include_router(trips.router)
app.include_router(destinations.router)
app.include_router(events.router)
app.include_router(budget.router)
app.include_router(weather.router)
