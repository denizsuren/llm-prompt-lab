"""
LLM Prompt Lab — FastAPI application entry point.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.routers import experiments, runs, models


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="LLM Prompt Lab",
    description="Benchmark, compare, and iterate on LLM prompts with statistical scoring.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(experiments.router, prefix="/api/experiments", tags=["experiments"])
app.include_router(runs.router, prefix="/api/runs", tags=["runs"])
app.include_router(models.router, prefix="/api/models", tags=["models"])


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}
