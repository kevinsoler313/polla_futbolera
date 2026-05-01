"""
Liga Controller - Endpoints REST para Ligas Privadas y Rankings
Responsabilidad única: recibir HTTP requests, delegar al service, retornar respuestas.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Usuario
from app.controllers.security import get_current_user
from app.schemas.liga_schema import (
    LigaCreate, LigaJoin, LigaResponse, RankingEntry, LigaConRanking
)
from app.services import liga_service

router = APIRouter(prefix="/api/ligas", tags=["Ligas"])


@router.post("", response_model=LigaResponse, status_code=status.HTTP_201_CREATED)
def crear_liga(
    datos: LigaCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Crea una nueva liga privada. El creador se une automáticamente."""
    try:
        liga = liga_service.crear_liga(db, datos.nombre, usuario.id)
        return liga
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/join", response_model=LigaResponse)
def unirse_a_liga(
    datos: LigaJoin,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Une al usuario autenticado a una liga usando su código de invitación."""
    try:
        liga = liga_service.unirse_a_liga(db, datos.codigo, usuario.id)
        return liga
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/mis-ligas", response_model=list[LigaResponse])
def mis_ligas(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Retorna todas las ligas a las que pertenece el usuario autenticado."""
    return liga_service.get_mis_ligas(db, usuario.id)


@router.get("/ranking-global", response_model=list[RankingEntry])
def ranking_global(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Retorna el ranking global de todos los participantes."""
    return liga_service.get_ranking_global(db, usuario.id)


@router.get("/{id_liga}/ranking", response_model=list[RankingEntry])
def ranking_liga(
    id_liga: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """
    Retorna el ranking de los miembros de una liga específica.
    Solo accesible si el usuario pertenece a esa liga.
    """
    try:
        return liga_service.get_ranking_liga(db, id_liga, usuario.id)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
