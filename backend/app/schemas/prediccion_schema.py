"""
Schemas Pydantic - Predicciones (apuestas iniciales de grupos)
"""
from pydantic import BaseModel
from typing import List


# ── Predicción de posición en grupo ──────────────────────────────────────────
class PrediccionGrupoItem(BaseModel):
    id_equipo: int
    posicion: int     # 1 = primero, 2 = segundo


class PrediccionGrupoCreate(BaseModel):
    predicciones: List[PrediccionGrupoItem]


class PrediccionGrupoResponse(BaseModel):
    id: int
    id_usuario: int
    id_equipo: int
    posicion: int

    model_config = {"from_attributes": True}


# ── Predicción de partido de grupos ──────────────────────────────────────────
class PrediccionPartidoItem(BaseModel):
    id_partido: int
    goles_equipo1: int
    goles_equipo2: int
    fase: str = "grupos"


class PrediccionPartidoCreate(BaseModel):
    predicciones: List[PrediccionPartidoItem]


class PrediccionPartidoResponse(BaseModel):
    id: int
    id_usuario: int
    id_partido: int
    goles_equipo1: int
    goles_equipo2: int
    puntaje: int
    acerto: bool
    fase: str

    model_config = {"from_attributes": True}


# ── Predicción de bracket (eliminatorias) ─────────────────────────────────────
class BracketWinnerItem(BaseModel):
    id_partido: int
    id_equipo_ganador: int


class BracketCreate(BaseModel):
    winners: dict  # { "r16a1": equipo_id, "r8a1": equipo_id, ... }
