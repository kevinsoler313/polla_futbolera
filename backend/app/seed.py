"""
Seed de base de datos - Equipos y Grupos del Mundial 2026
48 equipos en 12 grupos (A-L), 3 equipos por grupo
"""
from sqlalchemy.orm import Session
from app.models.models import Grupo, Equipo, Partido


# Datos del Mundial 2026 (48 equipos, 12 grupos)
GRUPOS_DATA = {
    "A": [
        {"nombre": "México", "bandera": "🇲🇽"},
        {"nombre": "Sudáfrica", "bandera": "🇿🇦"},
        {"nombre": "República de Corea", "bandera": "🇰🇷"},
        {"nombre": "República Checa", "bandera": "🇨🇿"},
    ],
    "B": [
        {"nombre": "Canadá", "bandera": "🇨🇦"},
        {"nombre": "Bosnia y Herzegovina", "bandera": "🇧🇦"},
        {"nombre": "Catar", "bandera": "🇶🇦"},
        {"nombre": "Suiza", "bandera": "🇨🇭"},
    ],
    "C": [
        {"nombre": "Brasil", "bandera": "🇧🇷"},
        {"nombre": "Marruecos", "bandera": "🇲🇦"},
        {"nombre": "Haití", "bandera": "🇭🇹"},
        {"nombre": "Escocia", "bandera": "🏴󠁧󠁢󠁳󠁣󠁴󠁿"},
    ],
    "D": [
        {"nombre": "Estados Unidos", "bandera": "🇺🇸"},
        {"nombre": "Paraguay", "bandera": "🇵🇾"},
        {"nombre": "Australia", "bandera": "🇦🇺"},
        {"nombre": "Turquía", "bandera": "🇹🇷"},
    ],
    "E": [
        {"nombre": "Alemania", "bandera": "🇩🇪"},
        {"nombre": "Curazao", "bandera": "🇨🇼"},
        {"nombre": "Costa de Marfil", "bandera": "🇨🇮"},
        {"nombre": "Ecuador", "bandera": "🇪🇨"},
    ],
    "F": [
        {"nombre": "Países Bajos", "bandera": "🇳🇱"},
        {"nombre": "Japón", "bandera": "🇯🇵"},
        {"nombre": "Suecia", "bandera": "🇸🇪"},
        {"nombre": "Túnez", "bandera": "🇹🇳"},
    ],
    "G": [
        {"nombre": "Bélgica", "bandera": "🇧🇪"},
        {"nombre": "Egipto", "bandera": "🇪🇬"},
        {"nombre": "Irán", "bandera": "🇮🇷"},
        {"nombre": "Nueva Zelanda", "bandera": "🇳🇿"},
    ],
    "H": [
        {"nombre": "España", "bandera": "🇪🇸"},
        {"nombre": "Cabo Verde", "bandera": "🇨🇻"},
        {"nombre": "Arabia Saudita", "bandera": "🇸🇦"},
        {"nombre": "Uruguay", "bandera": "🇺🇾"},
    ],
    "I": [
        {"nombre": "Francia", "bandera": "🇫🇷"},
        {"nombre": "Senegal", "bandera": "🇸🇳"},
        {"nombre": "Irak", "bandera": "🇮🇶"},
        {"nombre": "Noruega", "bandera": "🇳🇴"},
    ],
    "J": [
        {"nombre": "Argentina", "bandera": "🇦🇷"},
        {"nombre": "Argelia", "bandera": "🇩🇿"},
        {"nombre": "Austria", "bandera": "🇦🇹"},
        {"nombre": "Jordania", "bandera": "🇯🇴"},
    ],
    "K": [
        {"nombre": "Portugal", "bandera": "🇵🇹"},
        {"nombre": "RD Congo", "bandera": "🇨🇩"},
        {"nombre": "Uzbekistán", "bandera": "🇺🇿"},
        {"nombre": "Colombia", "bandera": "🇨🇴"},
    ],
    "L": [
        {"nombre": "Inglaterra", "bandera": "🏴󠁧󠁢󠁥󠁮󠁧󠁿"},
        {"nombre": "Croacia", "bandera": "🇭🇷"},
        {"nombre": "Ghana", "bandera": "🇬🇭"},
        {"nombre": "Panamá", "bandera": "🇵🇦"},
    ],
}


def seed_database(db: Session):
    """Inserta datos iniciales. Si hay datos pero no son los 48 equipos de 2026, los refresca."""
    equipo_count = db.query(Equipo).count()
    
    if equipo_count == 48:
        return  # Ya tiene los datos correctos
    
    if equipo_count > 0:
        print("[INFO] Actualizando base de datos a formato Mundial 2026 (48 equipos)...")
        # Limpiar tablas para evitar conflictos de integridad
        db.query(Partido).delete()
        db.query(Equipo).delete()
        db.query(Grupo).delete()
        db.commit()

    equipo_map: dict[str, int] = {}

    for nombre_grupo, equipos in GRUPOS_DATA.items():
        grupo = Grupo(nombre=nombre_grupo)
        db.add(grupo)
        db.flush()  # Obtener ID

        for eq_data in equipos:
            eq = Equipo(
                nombre=eq_data["nombre"],
                bandera=eq_data["bandera"],
                grupo_id=grupo.id
            )
            db.add(eq)
            db.flush()
            equipo_map[eq.nombre] = eq.id

        # Crear los partidos del grupo (round-robin: 6 partidos para 4 equipos)
        equipo_ids = []
        for eq_data in equipos:
            equipo_ids.append(equipo_map[eq_data["nombre"]])

        import itertools
        for e1, e2 in itertools.combinations(equipo_ids, 2):
            partido = Partido(
                id_equipo1=e1,
                id_equipo2=e2,
                fase="grupos",
                id_grupo=grupo.id
            )
            db.add(partido)

    # ── Partidos de Eliminatoria (vacíos) ──────────────────────────────────────
    fases_eliminatorias = {
        "1/16": 16,
        "octavos": 8,
        "cuartos": 4,
        "semis": 2,
        "tercer_puesto": 1,
        "final": 1
    }
    for fase, num_partidos in fases_eliminatorias.items():
        for _ in range(num_partidos):
            partido = Partido(
                id_equipo1=None,
                id_equipo2=None,
                fase=fase,
                id_grupo=None
            )
            db.add(partido)

    db.commit()
    print("[OK] Base de datos inicializada con equipos y partidos del Mundial 2026")
