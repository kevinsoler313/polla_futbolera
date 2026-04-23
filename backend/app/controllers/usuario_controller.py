"""
Controller de Usuarios - tabla general de puntajes
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.models import Usuario
from app.schemas.usuario_schema import UsuarioResponse
from app.controllers.security import get_current_user

router = APIRouter(prefix="/api/usuarios", tags=["Usuarios"])


@router.get("/ranking", response_model=List[UsuarioResponse])
def ranking_general(db: Session = Depends(get_db)):
    """Tabla general: todos los usuarios ordenados por puntaje descendente."""
    usuarios = db.query(Usuario).order_by(Usuario.puntaje.desc()).all()
    return usuarios


@router.get("/{usuario_id}", response_model=UsuarioResponse)
def obtener_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_user)
):
    """Obtiene el perfil público de un usuario específico."""
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return usuario
