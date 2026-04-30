from typing import  List
from sqlalchemy.orm import Session
from app.models.models import Partido, PrediccionPartido, Usuario, PrediccionGrupo, GrupoPosiciones, TercerosClasificados, PrediccionTerceros

PUNTOS_FASE = {
    "grupos": {"pge": 1, "marcador": 2, "clasificado": 0},
    "1/16": {"clasificado": 3, "pge": 4, "marcador": 6},
    "octavos": {"clasificado": 5, "pge": 6, "marcador": 10},
    "cuartos": {"clasificado": 7, "pge": 8, "marcador": 12},
    "semis": {"clasificado": 9, "pge": 10, "marcador": 14},
    "final": {"clasificado": 11, "pge": 12, "marcador": 16},
}

def obtener_resultado(goles1: int, goles2: int) -> int:
    if goles1 > goles2:
        return 1
    elif goles2 > goles1:
        return -1
    return 0

def procesar_resultado_partido(db: Session, partido: Partido):
    """
    Calcula y asigna los puntos de PGE y Marcador para un partido que ya tiene goles.
    """
    if partido.goles_equipo1 is None or partido.goles_equipo2 is None:
        return

    fase = partido.fase
    puntos_config = PUNTOS_FASE.get(fase, {"pge": 0, "marcador": 0})
    pts_pge = puntos_config["pge"]
    pts_marcador = puntos_config["marcador"]

    res_real = obtener_resultado(partido.goles_equipo1, partido.goles_equipo2)

    predicciones = db.query(PrediccionPartido).filter(PrediccionPartido.id_partido == partido.id).all()

    for pred in predicciones:
        # Resetear puntaje previo por si se edita el resultado
        # Para esto, tendríamos que llevar tracking de qué se le dio.
        # Por simplicidad, asumimos que si pred.puntaje > 0, ya se calculó y debemos restarlo
        # del usuario.
        usuario = db.query(Usuario).filter(Usuario.id == pred.id_usuario).first()
        if not usuario or usuario.es_admin:
            continue

        # Si ya se había puntuado, restamos para recalcular (idempotencia básica)
        if pred.puntaje > 0:
            usuario.puntaje -= pred.puntaje
            pred.puntaje = 0
        if pred.acerto:
            usuario.aciertos_exactos -= 1
            pred.acerto = False

        res_pred = obtener_resultado(pred.goles_equipo1, pred.goles_equipo2)
        puntos_ganados = 0

        # Validar PGE
        if res_real == res_pred:
            puntos_ganados += pts_pge

        # Validar Marcador Exacto
        if partido.goles_equipo1 == pred.goles_equipo1 and partido.goles_equipo2 == pred.goles_equipo2:
            puntos_ganados += pts_marcador
            pred.acerto = True
            usuario.aciertos_exactos += 1

        pred.puntaje += puntos_ganados
        usuario.puntaje += puntos_ganados

    db.commit()


def procesar_clasificados_llave(db: Session, partido: Partido):
    """
    Calcula puntos por acertar qué equipo clasifica a una llave eliminatoria.
    Se asume que pred.id_equipo1 y pred.id_equipo2 guardan la predicción del usuario
    de quién llegaba a ese partido.
    """
    if partido.fase == "grupos":
        return

    pts_clasificado = PUNTOS_FASE.get(partido.fase, {}).get("clasificado", 0)
    if pts_clasificado == 0:
        return

    predicciones = db.query(PrediccionPartido).filter(PrediccionPartido.id_partido == partido.id).all()

    for pred in predicciones:
        usuario = db.query(Usuario).filter(Usuario.id == pred.id_usuario).first()
        if not usuario or usuario.es_admin:
            continue

        puntos_ganados = 0
        if partido.id_equipo1 is not None and pred.id_equipo1 == partido.id_equipo1:
            puntos_ganados += pts_clasificado
        
        if partido.id_equipo2 is not None and pred.id_equipo2 == partido.id_equipo2:
            puntos_ganados += pts_clasificado

        # Sumar los puntos ganados por clasificación a la predicción y al usuario
        pred.puntaje += puntos_ganados
        usuario.puntaje += puntos_ganados

    db.commit()


def procesar_clasificados_grupo(db: Session, id_grupo: int, id_equipo_1ro: int, id_equipo_2do: int):
    """
    Asigna +3 puntos por acertar la posición exacta de los clasificados de la fase de grupos.
    """
    # Guardar en GrupoPosiciones si no existe
    # 1ro
    pos1 = db.query(GrupoPosiciones).filter(GrupoPosiciones.id_grupo == id_grupo, GrupoPosiciones.posicion == 1).first()
    if not pos1:
        pos1 = GrupoPosiciones(id_grupo=id_grupo, posicion=1, id_equipo=id_equipo_1ro)
        db.add(pos1)
    else:
        pos1.id_equipo = id_equipo_1ro

    # 2do
    pos2 = db.query(GrupoPosiciones).filter(GrupoPosiciones.id_grupo == id_grupo, GrupoPosiciones.posicion == 2).first()
    if not pos2:
        pos2 = GrupoPosiciones(id_grupo=id_grupo, posicion=2, id_equipo=id_equipo_2do)
        db.add(pos2)
    else:
        pos2.id_equipo = id_equipo_2do
        
    db.commit()

    pts_grupo = 3
    predicciones = db.query(PrediccionGrupo).join(Partido, Partido.id_grupo == id_grupo).all() # Esto no sirve directamente si PrediccionGrupo no liga a partido, pero sí liga a equipo
    # Mejor buscar por equipo y usuario
    pred_grupo = db.query(PrediccionGrupo).filter(
        PrediccionGrupo.id_equipo.in_([id_equipo_1ro, id_equipo_2do])
    ).all()

    # Como no tenemos un campo de 'puntos_ganados' en PrediccionGrupo en el modelo actual, 
    # tendremos que sumar directamente al Usuario. Pero ojo con la idempotencia.
    # Si esta función se llama varias veces, dará puntos múltiples. 
    # Para la prueba técnica asumimos que se llamará una vez, o el administrador debe tener cuidado.
    # En un sistema real se debería agregar un flag en PrediccionGrupo `puntuado = Boolean`.
    
    for pred in pred_grupo:
        usuario = db.query(Usuario).filter(Usuario.id == pred.id_usuario).first()
        if not usuario or usuario.es_admin:
            continue
        
        # Idempotencia: Restar puntos previos si existen para recalcular
        if pred.puntaje > 0:
            usuario.puntaje -= pred.puntaje
            pred.puntaje = 0

        # Validar si atinó a la posición exacta
        puntos_ganados = 0
        if pred.id_equipo == id_equipo_1ro and pred.posicion == 1:
            puntos_ganados = pts_grupo
        elif pred.id_equipo == id_equipo_2do and pred.posicion == 2:
            puntos_ganados = pts_grupo
        
        if puntos_ganados > 0:
            pred.puntaje = puntos_ganados
            usuario.puntaje += puntos_ganados
            
    db.commit()


def procesar_mejores_terceros(db: Session, equipos_ids: List[int]):
    """
    Asigna puntos a los usuarios que acertaron los mejores terceros.
    equipos_ids: lista de los 8 IDs de equipos que realmente pasaron.
    """
    # 1. Limpiar y Guardar resultados reales
    db.query(TercerosClasificados).delete()
    for idx, eq_id in enumerate(equipos_ids):
        nuevo = TercerosClasificados(id_equipo=eq_id, posicion=idx+1)
        db.add(nuevo)
    db.commit()

    pts_tercero = 3 # Puntos por cada acierto

    # 2. Procesar puntos para usuarios
    predicciones = db.query(PrediccionTerceros).filter(PrediccionTerceros.clasificado_tercero == True).all()
    
    for pred in predicciones:
        usuario = db.query(Usuario).filter(Usuario.id == pred.id_usuario).first()
        if not usuario or usuario.es_admin:
            continue

        # Idempotencia: Restar puntos previos si existen
        if pred.puntaje > 0:
            usuario.puntaje -= pred.puntaje
            pred.puntaje = 0

        # Validar si el equipo elegido está en la lista real de clasificados
        if pred.id_equipo in equipos_ids:
            pred.puntaje = pts_tercero
            usuario.puntaje += pts_tercero

    db.commit()
