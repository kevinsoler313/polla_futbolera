"""
Script de diagnostico para verificar el estado de los puntos en la base de datos.
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from app.core.database import SessionLocal
from app.models.models import Usuario, PrediccionPartido, Partido

db = SessionLocal()

print("=" * 60)
print("DIAGNOSTICO DE PUNTOS")
print("=" * 60)

# 1. Listar todos los usuarios y su estado
print("\n-- USUARIOS --")
usuarios = db.query(Usuario).all()
for u in usuarios:
    admin_str = "ADMIN" if u.es_admin else "Normal"
    print(f"  ID={u.id} | {u.nombre_usuario} | {admin_str} | Puntaje={u.puntaje} | Aciertos={u.aciertos_exactos}")

# 2. Contar predicciones por usuario
print("\n-- PREDICCIONES DE PARTIDOS POR USUARIO --")
for u in usuarios:
    count = db.query(PrediccionPartido).filter(PrediccionPartido.id_usuario == u.id).count()
    preds_con_puntos = db.query(PrediccionPartido).filter(
        PrediccionPartido.id_usuario == u.id,
        PrediccionPartido.puntaje > 0
    ).count()
    print(f"  {u.nombre_usuario}: {count} predicciones totales, {preds_con_puntos} con puntos > 0")

# 3. Verificar partidos con resultados reales
print("\n-- PARTIDOS CON RESULTADO REAL --")
partidos_con_resultado = db.query(Partido).filter(
    Partido.goles_equipo1 != None,
    Partido.goles_equipo2 != None
).all()
print(f"  Total partidos con marcador real: {len(partidos_con_resultado)}")
for p in partidos_con_resultado[:5]:
    print(f"    Partido ID={p.id} | {p.goles_equipo1}-{p.goles_equipo2} | Fase: {p.fase}")

# 4. Para cada partido con resultado, verificar si hay predicciones de usuarios normales
if partidos_con_resultado:
    print("\n-- DETALLE: Predicciones vs Resultado Real --")
    for p in partidos_con_resultado[:3]:
        preds = db.query(PrediccionPartido).filter(PrediccionPartido.id_partido == p.id).all()
        print(f"\n  Partido ID={p.id} (Real: {p.goles_equipo1}-{p.goles_equipo2}):")
        if not preds:
            print(f"    SIN PREDICCIONES de ningun usuario")
        for pred in preds:
            user = db.query(Usuario).filter(Usuario.id == pred.id_usuario).first()
            admin_tag = "[ADMIN]" if user and user.es_admin else "[NORMAL]"
            print(f"    {admin_tag} {user.nombre_usuario}: predijo {pred.goles_equipo1}-{pred.goles_equipo2} | puntaje_pred={pred.puntaje} | acerto={pred.acerto}")

db.close()
print("\n" + "=" * 60)
print("FIN DEL DIAGNOSTICO")
