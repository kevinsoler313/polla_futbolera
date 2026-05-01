"""
Schemas Pydantic - Validación de datos de Ligas Privadas
"""
from pydantic import BaseModel, field_validator
from typing import List, Optional


# ── Crear Liga ─────────────────────────────────────────────────────────────────
class LigaCreate(BaseModel):
    nombre: str

    @field_validator("nombre")
    @classmethod
    def nombre_valido(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("El nombre de la liga debe tener al menos 3 caracteres")
        if len(v) > 100:
            raise ValueError("El nombre no puede superar 100 caracteres")
        return v


# ── Unirse a una Liga ──────────────────────────────────────────────────────────
class LigaJoin(BaseModel):
    codigo: str

    @field_validator("codigo")
    @classmethod
    def codigo_valido(cls, v: str) -> str:
        v = v.strip().upper()
        if not v.startswith("SKJ26-"):
            raise ValueError("El código no es válido. Debe comenzar con SKJ26-")
        return v


# ── Entrada en el Ranking ──────────────────────────────────────────────────────
class RankingEntry(BaseModel):
    posicion: int
    id: int
    nombre_usuario: str
    puntaje: int
    aciertos_exactos: int
    es_yo: bool = False  # True si es el usuario que consulta

    model_config = {"from_attributes": True}


# ── Respuesta de Liga ──────────────────────────────────────────────────────────
class LigaResponse(BaseModel):
    id: int
    nombre: str
    codigo: str
    total_miembros: int

    model_config = {"from_attributes": True}


# ── Liga con Ranking ───────────────────────────────────────────────────────────
class LigaConRanking(BaseModel):
    liga: LigaResponse
    ranking: List[RankingEntry]
