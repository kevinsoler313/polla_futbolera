"""
Polla Mundial 2026 - FastAPI Main Entry Point
MVC: Controllers (routers) → Schemas (views/validators) → Models (data)
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import engine, SessionLocal
from app.models import models
from app.controllers import auth_controller, usuario_controller, prediccion_controller, mundial_controller
from app.seed import seed_database

# ── Crear tablas en la base de datos ───────────────────────────────────────────
models.Base.metadata.create_all(bind=engine)

# ── Semilla inicial ────────────────────────────────────────────────────────────
with SessionLocal() as db:
    seed_database(db)

# ── FastAPI App ────────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    description="API para la Polla del Mundial de Fútbol Colombia 2026",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── Manejador Global de Errores Inesperados ────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Error interno del servidor. Por favor, intenta de nuevo más tarde."},
    )

# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(auth_controller.router)
app.include_router(usuario_controller.router)
app.include_router(prediccion_controller.router)
app.include_router(mundial_controller.router)


@app.get("/", tags=["Root"])
def root():
    return {"mensaje": "🏆 Polla Mundial 2026 API - Activa", "docs": "/docs"}
