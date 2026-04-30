"""
Controller de Autenticación - Registro y Login
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Usuario
from app.schemas.usuario_schema import UsuarioCreate, UsuarioLogin, UsuarioResponse, Token
from app.repositories.usuario_repository import UsuarioRepository
from app.controllers.security import (
    hash_password, verify_password, create_access_token, get_current_user
)

router = APIRouter(prefix="/api/auth", tags=["Autenticación"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def registrar_usuario(datos: UsuarioCreate, db: Session = Depends(get_db)):
    """Crea un nuevo perfil de usuario."""
    usuario_repo = UsuarioRepository(db)
    
    # Verificar duplicados
    if usuario_repo.get_by_username(datos.nombre_usuario):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre de usuario ya está en uso"
        )
    if usuario_repo.get_by_email(datos.correo):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo ya está registrado"
        )

    # Crear usuario
    nuevo = usuario_repo.create({
        "nombre_usuario": datos.nombre_usuario,
        "correo": datos.correo,
        "contrasena": hash_password(datos.contrasena),
        "puntaje": 0,
    })

    # Generar token
    token = create_access_token({"sub": str(nuevo.id)})
    return Token(
        access_token=token,
        usuario=UsuarioResponse.model_validate(nuevo)
    )


@router.post("/login", response_model=Token)
def login(datos: UsuarioLogin, db: Session = Depends(get_db)):
    """Autentica un usuario y retorna JWT."""
    usuario_repo = UsuarioRepository(db)
    usuario = usuario_repo.get_by_username(datos.nombre_usuario)

    if not usuario or not verify_password(datos.contrasena, usuario.contrasena):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos"
        )

    token = create_access_token({"sub": str(usuario.id)})
    return Token(
        access_token=token,
        usuario=UsuarioResponse.model_validate(usuario)
    )


@router.get("/me", response_model=UsuarioResponse)
def perfil_actual(usuario: Usuario = Depends(get_current_user)):
    """Retorna el perfil del usuario autenticado."""
    return usuario
