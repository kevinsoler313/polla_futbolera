"""
Schemas Pydantic - Validación de datos de Usuario y Auth
"""
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime


# ── Registro ──────────────────────────────────────────────────────────────────
class UsuarioCreate(BaseModel):
    nombre_usuario: str
    correo: EmailStr
    contrasena: str

    @field_validator("nombre_usuario")
    @classmethod
    def nombre_no_vacio(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("El nombre de usuario debe tener al menos 3 caracteres")
        if len(v) > 50:
            raise ValueError("El nombre de usuario no puede superar 50 caracteres")
        return v

    @field_validator("contrasena")
    @classmethod
    def contrasena_segura(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("La contraseña debe tener al menos 6 caracteres")
        return v


# ── Login ──────────────────────────────────────────────────────────────────────
class UsuarioLogin(BaseModel):
    nombre_usuario: str
    contrasena: str


# ── Respuesta pública del usuario ──────────────────────────────────────────────
class UsuarioResponse(BaseModel):
    id: int
    nombre_usuario: str
    correo: str
    puntaje: int
    es_admin: bool
    aciertos_exactos: int
    apuestas_confirmadas: bool = False
    fecha_confirmacion: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Estado del cierre de apuestas ───────────────────────────────────────────
class DeadlineStatus(BaseModel):
    abiertas: bool
    fecha_cierre: str
    segundos_restantes: int


# ── Token JWT ──────────────────────────────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioResponse


class TokenData(BaseModel):
    id: Optional[int] = None
    nombre_usuario: Optional[str] = None
