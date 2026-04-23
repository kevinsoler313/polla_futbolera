"""
Controller de Predicciones - Apuestas de fase de grupos
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.models import Usuario, Partido, PrediccionPartido, PrediccionGrupo, Equipo
from app.schemas.prediccion_schema import (
    PrediccionPartidoCreate, PrediccionPartidoResponse,
    PrediccionGrupoCreate, PrediccionGrupoResponse
)
from app.controllers.security import get_current_user

router = APIRouter(prefix="/api/predicciones", tags=["Predicciones"])


# ── Partidos de grupos ─────────────────────────────────────────────────────────
@router.post("/partidos", response_model=List[PrediccionPartidoResponse], status_code=201)
def guardar_predicciones_partidos(
    datos: PrediccionPartidoCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user)
):
    """Guarda o actualiza las predicciones de resultados de partidos."""
    respuesta = []
    for item in datos.predicciones:
        # Verificar que el partido existe
        partido = db.query(Partido).filter(Partido.id == item.id_partido).first()
        if not partido:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Partido {item.id_partido} no encontrado"
            )

        # Si ya existe predicción para ese partido, actualizar
        pred = db.query(PrediccionPartido).filter(
            PrediccionPartido.id_usuario == usuario.id,
            PrediccionPartido.id_partido == item.id_partido
        ).first()

        if pred:
            pred.goles_equipo1 = item.goles_equipo1
            pred.goles_equipo2 = item.goles_equipo2
            pred.fase = item.fase
        else:
            pred = PrediccionPartido(
                id_usuario=usuario.id,
                id_partido=item.id_partido,
                goles_equipo1=item.goles_equipo1,
                goles_equipo2=item.goles_equipo2,
                fase=item.fase,
                id_equipo1=partido.id_equipo1,
                id_equipo2=partido.id_equipo2,
                puntaje=0,
                acerto=False
            )
            db.add(pred)

        db.commit()
        db.refresh(pred)
        respuesta.append(pred)

    return respuesta


@router.get("/partidos/mis", response_model=List[PrediccionPartidoResponse])
def mis_predicciones_partidos(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user)
):
    """Obtiene todas las predicciones de partidos del usuario actual."""
    return db.query(PrediccionPartido).filter(
        PrediccionPartido.id_usuario == usuario.id
    ).all()


# ── Posiciones en grupos ───────────────────────────────────────────────────────
@router.post("/grupos", response_model=List[PrediccionGrupoResponse], status_code=201)
def guardar_predicciones_grupos(
    datos: PrediccionGrupoCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user)
):
    """Guarda o actualiza predicciones de clasificados por grupo (1.° y 2.° lugar)."""
    respuesta = []
    for item in datos.predicciones:
        equipo = db.query(Equipo).filter(Equipo.id == item.id_equipo).first()
        if not equipo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Equipo {item.id_equipo} no encontrado"
            )

        pred = db.query(PrediccionGrupo).filter(
            PrediccionGrupo.id_usuario == usuario.id,
            PrediccionGrupo.id_equipo == item.id_equipo
        ).first()

        if pred:
            pred.posicion = item.posicion
        else:
            pred = PrediccionGrupo(
                id_usuario=usuario.id,
                id_equipo=item.id_equipo,
                posicion=item.posicion
            )
            db.add(pred)

        db.commit()
        db.refresh(pred)
        respuesta.append(pred)

    return respuesta


@router.get("/grupos/mis", response_model=List[PrediccionGrupoResponse])
def mis_predicciones_grupos(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user)
):
    """Obtiene las predicciones de clasificados del usuario."""
    return db.query(PrediccionGrupo).filter(
        PrediccionGrupo.id_usuario == usuario.id
    ).all()
