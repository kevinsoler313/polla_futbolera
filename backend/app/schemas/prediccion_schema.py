"""
Schemas Pydantic - Predicciones (apuestas iniciales de grupos)
"""
from pydantic import BaseModel
from typing import List, Optional


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
    puntaje: int

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
    id_equipo1: Optional[int] = None
    id_equipo2: Optional[int] = None

    model_config = {"from_attributes": True}


# ── Predicción de Mejores Terceros ───────────────────────────────────────────
class PrediccionTercerosItem(BaseModel):
    id_equipo: int
    clasificado_tercero: bool = True
    posicion: int = 0

class PrediccionTercerosCreate(BaseModel):
    predicciones: List[PrediccionTercerosItem]

class PrediccionTercerosResponse(BaseModel):
    id: int
    id_usuario: int
    id_equipo: int
    clasificado_tercero: bool
    posicion: Optional[int] = None

    model_config = {"from_attributes": True}


# ── Predicción de bracket (eliminatorias) ─────────────────────────────────────
class BracketItemCreate(BaseModel):
    id_partido: int
    id_equipo1: int
    id_equipo2: int
    goles_equipo1: int
    goles_equipo2: int
    ganador: int

class BracketCreate(BaseModel):
    predicciones: List[BracketItemCreate]

class PrediccionLlavesResponse(BaseModel):
    id: int
    id_usuario: int
    id_prediccion_partido: int

    model_config = {"from_attributes": True}
