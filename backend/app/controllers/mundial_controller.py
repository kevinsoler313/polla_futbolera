"""
Controller de Equipos y Grupos - datos del mundial
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from app.database import get_db
from app.models.models import Equipo, Grupo, Partido

router = APIRouter(prefix="/api/mundial", tags=["Mundial"])


# ── Schemas de respuesta inline ────────────────────────────────────────────────
class EquipoResponse(BaseModel):
    id: int
    nombre: str
    bandera: str | None
    grupo_id: int | None
    model_config = {"from_attributes": True}


class PartidoResponse(BaseModel):
    id: int
    id_equipo1: int
    id_equipo2: int
    goles_equipo1: int | None
    goles_equipo2: int | None
    fase: str
    id_grupo: int | None
    equipo1: EquipoResponse | None = None
    equipo2: EquipoResponse | None = None
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
    return db.query(Grupo).order_by(Grupo.nombre).all()


@router.get("/equipos", response_model=List[EquipoResponse])
def listar_equipos(db: Session = Depends(get_db)):
    """Lista todos los equipos."""
    return db.query(Equipo).order_by(Equipo.nombre).all()


@router.get("/partidos", response_model=List[PartidoResponse])
def listar_partidos(fase: str | None = None, id_grupo: int | None = None, db: Session = Depends(get_db)):
    """Lista partidos, filtrable por fase o grupo."""
    query = db.query(Partido)
    if fase:
        query = query.filter(Partido.fase == fase)
    if id_grupo:
        query = query.filter(Partido.id_grupo == id_grupo)
    return query.all()
