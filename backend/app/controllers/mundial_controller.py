"""
Controller de Equipos y Grupos - datos del mundial
"""
from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.repositories.mundial_repository import GrupoRepository, EquipoRepository, PartidoRepository

router = APIRouter(prefix="/api/mundial", tags=["Mundial"])


# ── Schemas de respuesta inline ────────────────────────────────────────────────
class EquipoResponse(BaseModel):
    id: int
    nombre: str
    bandera: Optional[str]
    grupo_id: Optional[int]
    model_config = {"from_attributes": True}


class PartidoResponse(BaseModel):
    id: int
    id_equipo1: Optional[int] = None
    id_equipo2: Optional[int] = None
    goles_equipo1: Optional[int]
    goles_equipo2: Optional[int]
    fase: str
    id_grupo: Optional[int]
    equipo1: Optional[EquipoResponse] = None
    equipo2: Optional[EquipoResponse] = None
    model_config = {"from_attributes": True}

class GrupoResponse(BaseModel):
    id: int
    nombre: str
    equipos: List[EquipoResponse] = []
    partidos: List[PartidoResponse] = []
    model_config = {"from_attributes": True}



# ── Endpoints ──────────────────────────────────────────────────────────────────
@router.get("/grupos", response_model=List[GrupoResponse])
def listar_grupos(db: Session = Depends(get_db)):
    """Lista todos los grupos con sus equipos y partidos."""
    return GrupoRepository(db).get_all_with_equipos()


@router.get("/equipos", response_model=List[EquipoResponse])
def listar_equipos(db: Session = Depends(get_db)):
    """Lista todos los equipos."""
    return EquipoRepository(db).get_all_ordered()


@router.get("/partidos", response_model=List[PartidoResponse])
def listar_partidos(fase: Optional[str] = None, id_grupo: Optional[int] = None, db: Session = Depends(get_db)):
    """Lista partidos, filtrable por fase o grupo."""
    return PartidoRepository(db).get_partidos(fase=fase, id_grupo=id_grupo)


@router.get("/partidos/eliminatoria", response_model=List[PartidoResponse])
def listar_partidos_eliminatoria(db: Session = Depends(get_db)):
    """Lista todos los partidos de fase eliminatoria (excluye fase de grupos)."""
    return PartidoRepository(db).get_partidos_eliminatoria()
