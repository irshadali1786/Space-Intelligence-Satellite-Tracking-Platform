"""ORBITX API entry point. Run: uvicorn app.main:app --reload"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from .config import settings
from .routes import analytics, meta, satellites, watchlist

app = FastAPI(
    title="ORBITX API",
    description="Satellite positions are CALCULATED with SGP4 from CelesTrak TLEs. "
                "They are not live radar observations.",
    version="1.0.0",
)

app.add_middleware(CORSMiddleware, allow_origins=settings.CORS_ORIGINS,
                   allow_methods=["*"], allow_headers=["*"])

app.include_router(satellites.router)
app.include_router(analytics.router)
app.include_router(watchlist.router)
app.include_router(meta.router)


@app.exception_handler(SQLAlchemyError)
async def db_error_handler(_: Request, exc: SQLAlchemyError):
    return JSONResponse(status_code=500, content={"detail": "Database error", "error": exc.__class__.__name__})


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}
