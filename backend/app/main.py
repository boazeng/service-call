"""FastAPI entry point for the TACT Service-Call app."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import Base, SessionLocal, engine
from . import models  # noqa: F401 — registers tables on Base
from .api import api_keys, auth, dashboard, devices, public_api, service_calls, sync, users
from .seed import seed_users


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables exist (idempotent) in every environment. Dev also seeds the
    # demo users; production seeds its admin via `python -m app.bootstrap`.
    Base.metadata.create_all(bind=engine)
    if settings.is_dev:
        db = SessionLocal()
        try:
            seed_users(db)
        finally:
            db.close()
    yield


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/health", tags=["health"])
    def health():
        return {"status": "ok", "app": settings.app_name, "env": settings.app_env}

    app.include_router(auth.router)
    app.include_router(service_calls.router)
    app.include_router(public_api.router)
    app.include_router(api_keys.router)
    app.include_router(sync.router)
    app.include_router(dashboard.router)
    app.include_router(devices.router)
    app.include_router(users.router)
    return app


app = create_app()
