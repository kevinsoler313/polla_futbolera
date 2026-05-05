"""
Script para recalcular TODOS los puntos desde cero.
1. Resetea puntaje de todos los usuarios a 0
2. Resetea puntaje de todas las predicciones a 0
3. Recalcula los puntos solo para usuarios normales (no admin)
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from app.core.database import SessionLocal
from app.models.models import Usuario, PrediccionPartido, Partido, PrediccionGrupo, GrupoPosiciones
from app.services.puntaje_service import procesar_resultado_partido, procesar_clasificados_grupo

db = SessionLocal()

print("=" * 60)
print("RECALCULANDO PUNTOS")
print("=" * 60)

# 1. Resetear TODOS los puntajes a 0
print("\n[1] Reseteando puntajes de usuarios...")
usuarios = db.query(Usuario).all()
for u in usuarios:
    print(f"  {u.nombre_usuario}: {u.puntaje} -> 0")
    u.puntaje = 0
    u.aciertos_exactos = 0
db.commit()

# 2. Resetear puntajes de predicciones de partidos
print("\n[2] Reseteando puntajes de predicciones de partidos...")
preds_partido = db.query(PrediccionPartido).all()
for pred in preds_partido:
    pred.puntaje = 0
    pred.acerto = False
db.commit()
print(f"  {len(preds_partido)} predicciones reseteadas.")

# 3. Resetear puntajes de predicciones de grupo
print("\n[3] Reseteando puntajes de predicciones de grupo...")
try:
    preds_grupo = db.query(PrediccionGrupo).all()
    for pred in preds_grupo:
        pred.puntaje = 0
    db.commit()
    print(f"  {len(preds_grupo)} predicciones de grupo reseteadas.")
except Exception as e:
    print(f"  No se pudo resetear predicciones de grupo: {e}")

# 4. Recalcular puntos por partidos con resultado real
print("\n[4] Recalculando puntos por resultados de partidos...")
partidos_con_resultado = db.query(Partido).filter(
    Partido.goles_equipo1 != None,
    Partido.goles_equipo2 != None
).all()

for partido in partidos_con_resultado:
    procesar_resultado_partido(db, partido)
print(f"  Procesados {len(partidos_con_resultado)} partidos.")

# 5. Recalcular puntos por posiciones de grupo
print("\n[5] Recalculando puntos por posiciones de grupo...")
posiciones = db.query(GrupoPosiciones).all()
# Agrupar por grupo
grupos_procesados = set()
for pos in posiciones:
    if pos.id_grupo not in grupos_procesados:
        pos1 = db.query(GrupoPosiciones).filter(
            GrupoPosiciones.id_grupo == pos.id_grupo,
            GrupoPosiciones.posicion == 1
        ).first()
        pos2 = db.query(GrupoPosiciones).filter(
            GrupoPosiciones.id_grupo == pos.id_grupo,
            GrupoPosiciones.posicion == 2
        ).first()
        if pos1 and pos2:
            procesar_clasificados_grupo(db, pos.id_grupo, pos1.id_equipo, pos2.id_equipo)
            print(f"  Grupo {pos.id_grupo}: 1ro=equipo {pos1.id_equipo}, 2do=equipo {pos2.id_equipo}")
            grupos_procesados.add(pos.id_grupo)
print(f"  Procesados {len(grupos_procesados)} grupos.")

# 6. Mostrar resultados finales
print("\n" + "=" * 60)
print("RESULTADO FINAL")
print("=" * 60)
usuarios = db.query(Usuario).all()
for u in usuarios:
    admin_str = "ADMIN" if u.es_admin else "Normal"
    preds_con_puntos = db.query(PrediccionPartido).filter(
        PrediccionPartido.id_usuario == u.id,
        PrediccionPartido.puntaje > 0
    ).count()
    print(f"  {u.nombre_usuario} ({admin_str}): Puntaje={u.puntaje} | Aciertos={u.aciertos_exactos} | Preds con puntos={preds_con_puntos}")

db.close()
print("\nRecalculo completado!")
