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
        {"nombre": "Ecuador", "bandera": "🇪🇨"},
        {"nombre": "Bolivia", "bandera": "🇧🇴"},
    ],
    "B": [
        {"nombre": "Argentina", "bandera": "🇦🇷"},
        {"nombre": "Chile", "bandera": "🇨🇱"},
        {"nombre": "Perú", "bandera": "🇵🇪"},
    ],
    "C": [
        {"nombre": "Brasil", "bandera": "🇧🇷"},
        {"nombre": "Paraguay", "bandera": "🇵🇾"},
        {"nombre": "Venezuela", "bandera": "🇻🇪"},
    ],
    "D": [
        {"nombre": "Colombia", "bandera": "🇨🇴"},
        {"nombre": "Uruguay", "bandera": "🇺🇾"},
        {"nombre": "Panamá", "bandera": "🇵🇦"},
    ],
    "E": [
        {"nombre": "España", "bandera": "🇪🇸"},
        {"nombre": "Portugal", "bandera": "🇵🇹"},
        {"nombre": "Escocia", "bandera": "🏴󠁧󠁢󠁳󠁣󠁴󠁿"},
    ],
    "F": [
        {"nombre": "Francia", "bandera": "🇫🇷"},
        {"nombre": "Alemania", "bandera": "🇩🇪"},
        {"nombre": "Turquía", "bandera": "🇹🇷"},
    ],
    "G": [
        {"nombre": "Inglaterra", "bandera": "🏴󠁧󠁢󠁥󠁮󠁧󠁿"},
        {"nombre": "Países Bajos", "bandera": "🇳🇱"},
        {"nombre": "Noruega", "bandera": "🇳🇴"},
    ],
    "H": [
        {"nombre": "Bélgica", "bandera": "🇧🇪"},
        {"nombre": "Austria", "bandera": "🇦🇹"},
        {"nombre": "Eslovaquia", "bandera": "🇸🇰"},
    ],
    "I": [
        {"nombre": "Marruecos", "bandera": "🇲🇦"},
        {"nombre": "Egipto", "bandera": "🇪🇬"},
        {"nombre": "Senegal", "bandera": "🇸🇳"},
    ],
    "J": [
        {"nombre": "Nigeria", "bandera": "🇳🇬"},
        {"nombre": "Costa de Marfil", "bandera": "🇨🇮"},
        {"nombre": "Camerún", "bandera": "🇨🇲"},
    ],
    "K": [
        {"nombre": "Japón", "bandera": "🇯🇵"},
        {"nombre": "Corea del Sur", "bandera": "🇰🇷"},
        {"nombre": "Arabia Saudita", "bandera": "🇸🇦"},
    ],
    "L": [
        {"nombre": "Australia", "bandera": "🇦🇺"},
        {"nombre": "Irán", "bandera": "🇮🇷"},
        {"nombre": "Estados Unidos", "bandera": "🇺🇸"},
    ],
}


def seed_database(db: Session):
    """Inserta datos iniciales si la BD está vacía."""
    if db.query(Grupo).count() > 0:
        return  # Ya tiene datos

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

        # Crear los 3 partidos del grupo (round-robin: 0v1, 0v2, 1v2)
        equipo_ids = []
        for eq_data in equipos:
            equipo_ids.append(equipo_map[eq_data["nombre"]])

        partidos = [
            (equipo_ids[0], equipo_ids[1]),
            (equipo_ids[0], equipo_ids[2]),
            (equipo_ids[1], equipo_ids[2]),
        ]
        for e1, e2 in partidos:
            partido = Partido(
                id_equipo1=e1,
                id_equipo2=e2,
                fase="grupos",
                id_grupo=grupo.id
            )
            db.add(partido)

    db.commit()
    print("[OK] Base de datos inicializada con equipos y partidos del Mundial 2026")
