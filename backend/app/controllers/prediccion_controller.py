"""
Controller de Predicciones - Apuestas de fase de grupos
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict
from collections import defaultdict

from app.database import get_db
from app.models.models import Usuario, Partido, PrediccionPartido, PrediccionGrupo, Equipo, Grupo
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


# ── Generación de Llaves de 16avos ──────────────────────────────────────────
@router.post("/generar_llaves", status_code=200)
def generar_llaves(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user)
):
    """
    Calcula los clasificados (1ros, 2dos, mejores 8 3ros) basado en las predicciones 
    de partidos del usuario y genera/actualiza las predicciones para la fase 1/16.
    """
    # 1. Obtener todas las predicciones de partidos de fase de grupos del usuario
    predicciones = db.query(PrediccionPartido).filter(
        PrediccionPartido.id_usuario == usuario.id,
        PrediccionPartido.fase == "grupos"
    ).all()
    
    if not predicciones:
        raise HTTPException(status_code=400, detail="No hay predicciones de partidos guardadas.")

    # 2. Calcular tabla por grupo
    # Estructura: stats[id_grupo][id_equipo] = {"pts": 0, "dg": 0, "gf": 0}
    stats = defaultdict(lambda: {"pts": 0, "dg": 0, "gf": 0})
    
    partidos_dict = {p.id: p for p in db.query(Partido).filter(Partido.fase == "grupos").all()}
    
    for pred in predicciones:
        partido = partidos_dict.get(pred.id_partido)
        if not partido or not partido.id_grupo:
            continue
            
        g1 = pred.goles_equipo1
        g2 = pred.goles_equipo2
        e1 = pred.id_equipo1
        e2 = pred.id_equipo2
        
        # GF y GC
        stats[e1]["gf"] += g1
        stats[e1]["dg"] += (g1 - g2)
        stats[e2]["gf"] += g2
        stats[e2]["dg"] += (g2 - g1)
        
        # Grupo (para poder agruparlos luego)
        stats[e1]["grupo"] = partido.id_grupo
        stats[e2]["grupo"] = partido.id_grupo
        
        # Puntos
        if g1 > g2:
            stats[e1]["pts"] += 3
        elif g2 > g1:
            stats[e2]["pts"] += 3
        else:
            stats[e1]["pts"] += 1
            stats[e2]["pts"] += 1

    # Agrupar stats por grupo
    grupos_stats = defaultdict(list)
    for eq_id, eq_stats in stats.items():
        if "grupo" in eq_stats:
            grupos_stats[eq_stats["grupo"]].append((eq_id, eq_stats))

    # 3. Determinar posiciones por grupo
    grupos_db = db.query(Grupo).all()
    grupo_nombre = {g.id: g.nombre for g in grupos_db}
    equipo_grupo = {e.id: grupo_nombre[e.grupo_id] for e in db.query(Equipo).all()}
    
    primeros = {}
    segundos = {}
    terceros_lista = []
    
    # Asegurar que procesamos los 12 grupos (A-L)
    for g in grupos_db:
        nom_grupo = g.nombre
        equipos = grupos_stats.get(g.id, [])
        
        # Ordenar: Puntos DESC, DG DESC, GF DESC
        equipos.sort(
            key=lambda x: (x[1]["pts"], x[1]["dg"], x[1]["gf"]),
            reverse=True
        )
        
        if len(equipos) >= 1: 
            primeros[nom_grupo] = equipos[0][0]
        else:
            # Fallback: tomar el primer equipo del grupo por ID si no hay predicciones
            eq_def = db.query(Equipo).filter(Equipo.grupo_id == g.id).first()
            primeros[nom_grupo] = eq_def.id if eq_def else None

        if len(equipos) >= 2: 
            segundos[nom_grupo] = equipos[1][0]
        else:
            eq_def = db.query(Equipo).filter(Equipo.grupo_id == g.id).offset(1).first()
            segundos[nom_grupo] = eq_def.id if eq_def else None

        if len(equipos) >= 3: 
            terceros_lista.append(equipos[2])
        else:
            eq_def = db.query(Equipo).filter(Equipo.grupo_id == g.id).offset(2).first()
            if eq_def:
                terceros_lista.append((eq_def.id, {"pts": 0, "dg": 0, "gf": 0}))
        
    # Ordenar terceros para sacar los 8 mejores
    terceros_lista.sort(
        key=lambda x: (x[1]["pts"], x[1]["dg"], x[1]["gf"]),
        reverse=True
    )
    mejores_terceros = [t[0] for t in terceros_lista[:8]]
    terceros_grupos = [equipo_grupo[eq_id] for eq_id in mejores_terceros if eq_id]
    terceros_dict = {equipo_grupo[eq_id]: eq_id for eq_id in mejores_terceros if eq_id}
    
    # 4. Asignar los 8 mejores terceros a sus slots válidos usando Backtracking (DFS)
    slots_terceros = [
        ('E', ['A', 'B', 'C', 'D', 'F']),
        ('I', ['C', 'D', 'F', 'G', 'H']),
        ('D', ['B', 'E', 'F', 'I', 'J']),
        ('G', ['A', 'E', 'H', 'I', 'J']),
        ('A', ['C', 'E', 'F', 'H', 'I']),
        ('L', ['E', 'H', 'I', 'J', 'K']),
        ('B', ['E', 'F', 'G', 'I', 'J']),
        ('K', ['D', 'E', 'I', 'J', 'L'])
    ]

    def dfs(index, asignaciones, usados):
        if index == 8:
            return asignaciones
        
        slot_lider, validos = slots_terceros[index]
        for t_grupo in terceros_grupos:
            if t_grupo not in usados and t_grupo in validos:
                res = dfs(index + 1, asignaciones + [(slot_lider, t_grupo)], usados | {t_grupo})
                if res: return res
        return None
        
    asignacion_terceros = dfs(0, [], set())
    if not asignacion_terceros:
        # Fallback por seguridad, asignar secuencialmente si no hay match perfecto
        asignacion_terceros = [(slots_terceros[i][0], terceros_grupos[i]) for i in range(8)]
        
    terceros_asignados = {lider: g for lider, g in asignacion_terceros}
    
    # 5. Generar el arreglo de las 16 llaves exactas
    llaves_orden = [
        (primeros.get('E'), terceros_dict.get(terceros_asignados.get('E'))),
        (primeros.get('I'), terceros_dict.get(terceros_asignados.get('I'))),
        (segundos.get('A'), segundos.get('B')),
        (primeros.get('F'), segundos.get('C')),
        (segundos.get('K'), segundos.get('L')),
        (primeros.get('H'), segundos.get('J')),
        (primeros.get('D'), terceros_dict.get(terceros_asignados.get('D'))),
        (primeros.get('G'), terceros_dict.get(terceros_asignados.get('G'))),
        (primeros.get('C'), segundos.get('F')),
        (segundos.get('E'), segundos.get('I')),
        (primeros.get('A'), terceros_dict.get(terceros_asignados.get('A'))),
        (primeros.get('L'), terceros_dict.get(terceros_asignados.get('L'))),
        (primeros.get('J'), segundos.get('H')),
        (segundos.get('D'), segundos.get('G')),
        (primeros.get('B'), terceros_dict.get(terceros_asignados.get('B'))),
        (primeros.get('K'), terceros_dict.get(terceros_asignados.get('K'))),
    ]

    # 6. Obtener partidos genéricos de 1/16 de la base de datos
    partidos_16avos = db.query(Partido).filter(Partido.fase == "1/16").order_by(Partido.id).all()
    if len(partidos_16avos) != 16:
        raise HTTPException(status_code=500, detail="La base de datos no tiene los 16 partidos de 16avos configurados.")
        
    # 7. Crear o actualizar PrediccionPartido para todas las fases eliminatorias (73 al 104)
    partidos_todos = db.query(Partido).filter(Partido.fase != "grupos").all()
    llaves_generadas = []
    
    # Crear un mapa rápido de los IDs de 1/16 para asignar los equipos calculados
    id_to_teams = {partidos_16avos[i].id: llaves_orden[i] for i in range(16)}

    for partido_db in partidos_todos:
        pred = db.query(PrediccionPartido).filter(
            PrediccionPartido.id_usuario == usuario.id,
            PrediccionPartido.id_partido == partido_db.id
        ).first()
        
        # Si es de 1/16, asignamos los equipos calculados
        eq1_id, eq2_id = (None, None)
        if partido_db.id in id_to_teams:
            eq1_id, eq2_id = id_to_teams[partido_db.id]

        if pred:
            if partido_db.id in id_to_teams:
                pred.id_equipo1 = eq1_id
                pred.id_equipo2 = eq2_id
        else:
            pred = PrediccionPartido(
                id_usuario=usuario.id,
                id_partido=partido_db.id,
                goles_equipo1=0,
                goles_equipo2=0,
                fase=partido_db.fase,
                id_equipo1=eq1_id,
                id_equipo2=eq2_id,
                puntaje=0,
                acerto=False
            )
            db.add(pred)
            
        db.flush()
        
        llaves_generadas.append({
            "id_partido": pred.id_partido,
            "id_equipo1": pred.id_equipo1,
            "id_equipo2": pred.id_equipo2,
            "fase": pred.fase
        })

    db.commit()

    return {"message": "Cuadro de torneo generado con éxito", "llaves": llaves_generadas}
