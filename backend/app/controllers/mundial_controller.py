"""
Controller de Equipos y Grupos - datos del mundial
"""
from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel

from app.database import get_db
from app.models.models import Equipo, Grupo, Partido

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
    id_equipo1: int
    id_equipo2: int
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
    return db.query(Grupo).options(joinedload(Grupo.equipos)).order_by(Grupo.nombre).all()


@router.get("/equipos", response_model=List[EquipoResponse])
def listar_equipos(db: Session = Depends(get_db)):
    """Lista todos los equipos."""
    return db.query(Equipo).order_by(Equipo.nombre).all()


@router.get("/partidos", response_model=List[PartidoResponse])
def listar_partidos(fase: Optional[str] = None, id_grupo: Optional[int] = None, db: Session = Depends(get_db)):
    """Lista partidos, filtrable por fase o grupo."""
    query = db.query(Partido)
    if fase:
        query = query.filter(Partido.fase == fase)
    if id_grupo:
        query = query.filter(Partido.id_grupo == id_grupo)
    return query.all()
