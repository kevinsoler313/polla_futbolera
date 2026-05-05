"""
Controller de Predicciones - Apuestas de fase de grupos
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict
from collections import defaultdict

from app.core.database import get_db
from app.models.models import Usuario, Partido, PrediccionPartido, PrediccionGrupo, Equipo, Grupo
from app.schemas.prediccion_schema import (
    PrediccionPartidoCreate, PrediccionPartidoResponse,
    PrediccionGrupoCreate, PrediccionGrupoResponse,
    BracketCreate,
    PrediccionTercerosCreate, PrediccionTercerosResponse,
    PrediccionLlavesResponse
)
from app.schemas.usuario_schema import UsuarioResponse, DeadlineStatus
from app.core.security import get_current_user
from app.repositories.mundial_repository import PartidoRepository, EquipoRepository, GrupoRepository
from app.repositories.prediccion_repository import PrediccionPartidoRepository, PrediccionGrupoRepository, PrediccionTercerosRepository, PrediccionLlavesRepository
from app.services import deadline_service

router = APIRouter(prefix="/api/predicciones", tags=["Predicciones"])


def _verificar_apuestas_abiertas(usuario: Usuario):
    """
    Guard reutilizable: lanza 403 si el usuario ya confirmó o si el Mundial empezó.
    Los admins siempre pueden editar.
    """
    if usuario.es_admin:
        return  # Los admins nunca quedan bloqueados
    if usuario.apuestas_confirmadas:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ya confirmaste tus apuestas. No puedes editarlas."
        )
    if not deadline_service.apuestas_abiertas():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Las apuestas están cerradas. El Mundial ya comenzó."
        )



# ── Partidos de grupos ─────────────────────────────────────────────────────────
@router.post("/partidos", response_model=List[PrediccionPartidoResponse], status_code=201)
def guardar_predicciones_partidos(
    datos: PrediccionPartidoCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user)
):
    """Guarda o actualiza las predicciones de resultados de partidos."""
    _verificar_apuestas_abiertas(usuario)
    respuesta = []
    partido_repo = PartidoRepository(db)
    pred_repo = PrediccionPartidoRepository(db)

    for item in datos.predicciones:
        # Verificar que el partido existe
        partido = partido_repo.get(item.id_partido)
        if not partido:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Partido {item.id_partido} no encontrado"
            )

        # Si ya existe predicción para ese partido, actualizar
        pred = pred_repo.get_prediccion(usuario.id, item.id_partido)

        if pred:
            pred = pred_repo.update(pred, {
                "goles_equipo1": item.goles_equipo1,
                "goles_equipo2": item.goles_equipo2,
                "fase": item.fase
            })
        else:
            pred = pred_repo.create({
                "id_usuario": usuario.id,
                "id_partido": item.id_partido,
                "goles_equipo1": item.goles_equipo1,
                "goles_equipo2": item.goles_equipo2,
                "fase": item.fase,
                "id_equipo1": partido.id_equipo1,
                "id_equipo2": partido.id_equipo2,
                "puntaje": 0,
                "acerto": False
            })

        respuesta.append(pred)

    return respuesta


@router.get("/partidos/mis", response_model=List[PrediccionPartidoResponse])
def mis_predicciones_partidos(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user)
):
    """Obtiene todas las predicciones de partidos del usuario actual."""
    return PrediccionPartidoRepository(db).get_mis_predicciones(usuario.id)


# ── Posiciones en grupos ───────────────────────────────────────────────────────
@router.post("/grupos", response_model=List[PrediccionGrupoResponse], status_code=201)
def guardar_predicciones_grupos(
    datos: PrediccionGrupoCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user)
):
    """Guarda o actualiza predicciones de clasificados por grupo (1.° y 2.° lugar)."""
    _verificar_apuestas_abiertas(usuario)
    respuesta = []
    equipo_repo = EquipoRepository(db)
    pred_repo = PrediccionGrupoRepository(db)

    for item in datos.predicciones:
        equipo = equipo_repo.get(item.id_equipo)
        if not equipo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Equipo {item.id_equipo} no encontrado"
            )

        pred = pred_repo.get_prediccion(usuario.id, item.id_equipo)

        if pred:
            pred = pred_repo.update(pred, {"posicion": item.posicion})
        else:
            pred = pred_repo.create({
                "id_usuario": usuario.id,
                "id_equipo": item.id_equipo,
                "posicion": item.posicion
            })

        respuesta.append(pred)

    return respuesta


@router.get("/grupos/mis", response_model=List[PrediccionGrupoResponse])
def mis_predicciones_grupos(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user)
):
    """Obtiene las predicciones de clasificados del usuario."""
    return PrediccionGrupoRepository(db).get_mis_predicciones(usuario.id)


@router.get("/terceros/mis", response_model=List[PrediccionTercerosResponse])
def mis_predicciones_terceros(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user)
):
    """Obtiene los mejores terceros guardados del usuario."""
    return PrediccionTercerosRepository(db).get_all_by_usuario(usuario.id)


@router.get("/llaves/mis", response_model=List[PrediccionLlavesResponse])
def mis_predicciones_llaves(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user)
):
    """Obtiene el mapeo de llaves guardadas del usuario."""
    return PrediccionLlavesRepository(db).get_all_by_usuario(usuario.id)


@router.post("/terceros", response_model=List[PrediccionTercerosResponse], status_code=201)
def guardar_predicciones_terceros(
    datos: PrediccionTercerosCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user)
):
    """Guarda las predicciones de mejores terceros seleccionados manualmente."""
    _verificar_apuestas_abiertas(usuario)
    repo = PrediccionTercerosRepository(db)
    repo.delete_by_usuario(usuario.id)
    
    respuesta = []
    for item in datos.predicciones:
        pred = repo.create({
            "id_usuario": usuario.id,
            "id_equipo": item.id_equipo,
            "clasificado_tercero": item.clasificado_tercero,
            "posicion": item.posicion
        })
        respuesta.append(pred)
    
    return respuesta


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
    pred_repo = PrediccionPartidoRepository(db)
    partido_repo = PartidoRepository(db)
    grupo_repo = GrupoRepository(db)
    equipo_repo = EquipoRepository(db)
    terceros_repo = PrediccionTercerosRepository(db)
    llaves_repo = PrediccionLlavesRepository(db)

    # 1. Obtener todas las predicciones de partidos de fase de grupos del usuario
    predicciones = pred_repo.get_mis_predicciones_fase(usuario.id, "grupos")
    
    if not predicciones:
        raise HTTPException(status_code=400, detail="No hay predicciones de partidos guardadas.")

    # 2. Calcular tabla por grupo
    # Estructura: stats[id_grupo][id_equipo] = {"pts": 0, "dg": 0, "gf": 0}
    stats = defaultdict(lambda: {"pts": 0, "dg": 0, "gf": 0})
    
    partidos_dict = {p.id: p for p in partido_repo.get_partidos(fase="grupos")}
    
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
    grupos_db = grupo_repo.get_all()
    grupo_nombre = {g.id: g.nombre for g in grupos_db}
    equipos_all = equipo_repo.get_all()
    equipo_grupo = {e.id: grupo_nombre[e.grupo_id] for e in equipos_all}
    
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
            # Fallback
            eq_def = next((e for e in equipos_all if e.grupo_id == g.id), None)
            primeros[nom_grupo] = eq_def.id if eq_def else None

        if len(equipos) >= 2: 
            segundos[nom_grupo] = equipos[1][0]
        else:
            # Fallback
            eq_def = [e for e in equipos_all if e.grupo_id == g.id]
            segundos[nom_grupo] = eq_def[1].id if len(eq_def) > 1 else None

        if len(equipos) >= 3: 
            terceros_lista.append(equipos[2])
        else:
            eq_def = [e for e in equipos_all if e.grupo_id == g.id]
            if len(eq_def) > 2:
                terceros_lista.append((eq_def[2].id, {"pts": 0, "dg": 0, "gf": 0}))
        
    # ── Determinar mejores terceros (Manual vs Calculado) ──────────────────────
    terceros_guardados = terceros_repo.get_all_by_usuario(usuario.id)
    
    if terceros_guardados:
        # Usar los que el usuario eligió manualmente con drag and drop, respetando su orden
        # Filtramos solo los que marcó como clasificados
        mejores_terceros = [t.id_equipo for t in terceros_guardados if t.clasificado_tercero]
    else:
        # Si no hay manuales, calcularlos automáticamente
        terceros_lista.sort(
            key=lambda x: (x[1]["pts"], x[1]["dg"], x[1]["gf"]),
            reverse=True
        )
        mejores_terceros = [t[0] for t in terceros_lista[:8]]
        
        # Guardar el cálculo automático con una posición por defecto
        for idx, eq_id in enumerate(mejores_terceros):
            if eq_id:
                terceros_repo.create({
                    "id_usuario": usuario.id,
                    "id_equipo": eq_id,
                    "clasificado_tercero": True,
                    "posicion": idx + 1
                })
    
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
    partidos_16avos = partido_repo.get_partidos(fase="1/16")
    partidos_16avos.sort(key=lambda p: p.id)
    
    if len(partidos_16avos) != 16:
        raise HTTPException(status_code=500, detail="La base de datos no tiene los 16 partidos de 16avos configurados.")
        
    # 7. Crear o actualizar PrediccionPartido para todas las fases eliminatorias
    partidos_todos = partido_repo.get_partidos_eliminatoria()
    llaves_generadas = []
    
    # Limpiar predicción de llaves explícita antes de regenerar
    llaves_repo.delete_by_usuario(usuario.id)
    
    # Mapa de IDs de 1/16 para asignar los equipos calculados
    id_to_teams = {partidos_16avos[i].id: llaves_orden[i] for i in range(16)}

    for partido_db in partidos_todos:
        pred = pred_repo.get_prediccion(usuario.id, partido_db.id)
        
        # Asignar equipos si es fase 1/16
        eq1_id, eq2_id = (None, None)
        if partido_db.id in id_to_teams:
            eq1_id, eq2_id = id_to_teams[partido_db.id]

        if pred:
            update_data = {}
            if partido_db.id in id_to_teams:
                update_data["id_equipo1"] = eq1_id
                update_data["id_equipo2"] = eq2_id
            if update_data:
                pred = pred_repo.update(pred, update_data)
        else:
            pred = pred_repo.create({
                "id_usuario": usuario.id,
                "id_partido": partido_db.id,
                "goles_equipo1": 0,
                "goles_equipo2": 0,
                "fase": partido_db.fase,
                "id_equipo1": eq1_id,
                "id_equipo2": eq2_id,
                "puntaje": 0,
                "acerto": False
            })
            
        # 8. Guardar en tabla PrediccionLlaves para el seguimiento explícito del bracket
        llaves_repo.create({
            "id_usuario": usuario.id,
            "id_prediccion_partido": pred.id
        })
            
        llaves_generadas.append({
            "id_partido": pred.id_partido,
            "id_equipo1": pred.id_equipo1,
            "id_equipo2": pred.id_equipo2,
            "fase": pred.fase
        })

    return {"message": "Cuadro de torneo generado con éxito", "llaves": llaves_generadas}



# ── Guardar predicciones de bracket (eliminatorias) ─────────────────────────
@router.post("/bracket", status_code=200)
def guardar_bracket(
    datos: BracketCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user)
):
    """Guarda las predicciones de ganadores en la fase eliminatoria."""
    _verificar_apuestas_abiertas(usuario)
    partido_repo = PartidoRepository(db)
    equipo_repo = EquipoRepository(db)
    pred_repo = PrediccionPartidoRepository(db)
    
    saved = []

    for item in datos.predicciones:
        partido = partido_repo.get(item.id_partido)
        if not partido:
            continue

        pred = pred_repo.get_prediccion(usuario.id, partido.id)

        if pred:
            pred = pred_repo.update(pred, {
                "goles_equipo1": item.goles_equipo1,
                "goles_equipo2": item.goles_equipo2,
                "id_equipo1": item.id_equipo1,
                "id_equipo2": item.id_equipo2
            })
        else:
            pred = pred_repo.create({
                "id_usuario": usuario.id,
                "id_partido": partido.id,
                "goles_equipo1": item.goles_equipo1,
                "goles_equipo2": item.goles_equipo2,
                "fase": partido.fase,
                "id_equipo1": item.id_equipo1,
                "id_equipo2": item.id_equipo2,
                "puntaje": 0,
                "acerto": False
            })

        saved.append(pred.id)

    return {"message": "Bracket guardado con éxito", "saved": len(saved)}


# ── Confirmar Apuestas ─────────────────────────────────────────────────────────────────
@router.post("/confirmar", response_model=UsuarioResponse)
def confirmar_apuestas(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user)
):
    """
    Confirma definitivamente las apuestas del usuario.
    Una vez confirmadas, no se pueden modificar (ni el deadline te lo permite).
    Solo disponible mientras las apuestas estén abiertas.
    """
    try:
        usuario_actualizado = deadline_service.confirmar_apuestas(db, usuario)
        return usuario_actualizado
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.get("/deadline", response_model=DeadlineStatus)
def get_deadline(
    usuario: Usuario = Depends(get_current_user)
):
    """
    Retorna el estado de cierre de apuestas:
    - Si están abiertas o cerradas
    - La fecha exacta de cierre
    - Segundos restantes para el cierre
    """
    return deadline_service.get_estado_apuestas()
