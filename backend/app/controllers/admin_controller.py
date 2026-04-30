from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List

from app.database import get_db
from app.models.models import Usuario, Partido, Grupo
from app.controllers.security import get_current_admin
from app.services.puntaje_service import (
    procesar_resultado_partido, 
    procesar_clasificados_llave,
    procesar_clasificados_grupo,
    procesar_mejores_terceros
)

router = APIRouter(prefix="/api/admin", tags=["Administrador"])


class ResultadoPartido(BaseModel):
    goles_equipo1: int
    goles_equipo2: int

class EquiposLlave(BaseModel):
    id_equipo1: Optional[int] = None
    id_equipo2: Optional[int] = None

class PosicionesGrupo(BaseModel):
    id_equipo_1ro: int
    id_equipo_2do: int

class MarcadorReal(BaseModel):
    id_partido: int
    goles_equipo1: int
    goles_equipo2: int

class DatosRealesGrupo(BaseModel):
    id_grupo: int
    partidos: List[MarcadorReal]
    id_equipo_1ro: int
    id_equipo_2do: int


@router.put("/partido/{id_partido}/marcador")
def actualizar_marcador_partido(
    id_partido: int, 
    resultado: ResultadoPartido, 
    db: Session = Depends(get_db),
    admin: Usuario = Depends(get_current_admin)
):
    """Actualiza el marcador real de un partido y calcula puntos de los usuarios."""
    partido = db.query(Partido).filter(Partido.id == id_partido).first()
    if not partido:
        raise HTTPException(status_code=404, detail="Partido no encontrado")

    partido.goles_equipo1 = resultado.goles_equipo1
    partido.goles_equipo2 = resultado.goles_equipo2
    db.commit()
    db.refresh(partido)

    procesar_resultado_partido(db, partido)

    return {"mensaje": "Marcador actualizado y puntos calculados correctamente", "partido": partido.id}


@router.put("/llave/{id_partido}/clasificados")
def actualizar_clasificados_llave(
    id_partido: int, 
    equipos: EquiposLlave, 
    db: Session = Depends(get_db),
    admin: Usuario = Depends(get_current_admin)
):
    """Asigna los equipos reales que llegaron a un partido eliminatorio y calcula puntos."""
    partido = db.query(Partido).filter(Partido.id == id_partido).first()
    if not partido:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    
    if partido.fase == "grupos":
        raise HTTPException(status_code=400, detail="Este partido es de fase de grupos")

    partido.id_equipo1 = equipos.id_equipo1
    partido.id_equipo2 = equipos.id_equipo2
    db.commit()
    db.refresh(partido)

    procesar_clasificados_llave(db, partido)

    return {"mensaje": "Equipos clasificados a la llave actualizados", "partido": partido.id}


@router.post("/grupo/{id_grupo}/posiciones")
def establecer_posiciones_grupo(
    id_grupo: int, 
    posiciones: PosicionesGrupo, 
    db: Session = Depends(get_db),
    admin: Usuario = Depends(get_current_admin)
):
    """Establece los clasificados (1ro y 2do) de un grupo y calcula puntos."""
    grupo = db.query(Grupo).filter(Grupo.id == id_grupo).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")

    procesar_clasificados_grupo(db, id_grupo, posiciones.id_equipo_1ro, posiciones.id_equipo_2do)

    return {"mensaje": "Posiciones de grupo establecidas y puntos calculados"}


@router.post("/grupo/guardar-resultados-reales")
def guardar_resultados_reales_grupo(
    datos: DatosRealesGrupo,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(get_current_admin)
):
    """
    Guarda los marcadores reales de todos los partidos de un grupo
    y establece los clasificados finales (1ro y 2do), calculando puntos.
    """
    # 1. Guardar marcadores de los partidos y procesar puntos
    for p_dato in datos.partidos:
        partido = db.query(Partido).filter(Partido.id == p_dato.id_partido).first()
        if partido:
            partido.goles_equipo1 = p_dato.goles_equipo1
            partido.goles_equipo2 = p_dato.goles_equipo2
            db.commit()
            db.refresh(partido)
            procesar_resultado_partido(db, partido)

    # 2. Guardar posiciones finales del grupo y procesar puntos
    procesar_clasificados_grupo(
        db, 
        datos.id_grupo, 
        datos.id_equipo_1ro, 
        datos.id_equipo_2do
    )

    return {
        "mensaje": "Resultados y posiciones de grupo guardados correctamente. Puntos actualizados.",
        "id_grupo": datos.id_grupo
    }


class MejoresTercerosReales(BaseModel):
    equipos_ids: List[int] # Lista de 8 IDs de equipos

@router.post("/mundial/mejores-terceros")
def establecer_mejores_terceros_reales(
    datos: MejoresTercerosReales,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(get_current_admin)
):
    """Establece los 8 mejores terceros oficiales del mundial y calcula puntos."""
    if len(datos.equipos_ids) != 8:
        raise HTTPException(status_code=400, detail="Deben ser exactamente 8 equipos")

    procesar_mejores_terceros(db, datos.equipos_ids)

    return {"mensaje": "Mejores terceros oficiales establecidos y puntos calculados"}

