"""
Liga Service - Lógica de negocio para Ligas Privadas
Responsabilidad única: generar códigos, validar reglas de negocio,
construir los datos de ranking con desempates.
NO accede directamente a la base de datos (usa el repository).
"""
import random
import string
from sqlalchemy.orm import Session

from app.models.models import Usuario
from app.repositories.liga_repository import LigaRepository
from app.schemas.liga_schema import RankingEntry, LigaResponse


CODE_PREFIX = "SKJ26-"
CODE_CHARS = string.ascii_uppercase + string.digits
CODE_SUFFIX_LENGTH = 5


def generar_codigo_unico(db: Session) -> str:
    """
    Genera un código de invitación único con formato SKJ26-XXXXX.
    Garantiza que no exista ya en la base de datos.
    """
    repo = LigaRepository(db)
    max_intentos = 20
    for _ in range(max_intentos):
        sufijo = "".join(random.choices(CODE_CHARS, k=CODE_SUFFIX_LENGTH))
        codigo = f"{CODE_PREFIX}{sufijo}"
        if not repo.get_by_codigo(codigo):
            return codigo
    raise RuntimeError("No se pudo generar un código único. Intenta de nuevo.")


def crear_liga(db: Session, nombre: str, id_usuario: int) -> dict:
    """
    Crea una nueva liga privada y agrega al creador como primer miembro.
    Retorna la liga creada con su código.
    """
    repo = LigaRepository(db)
    codigo = generar_codigo_unico(db)

    liga = repo.create({
        "nombre": nombre,
        "codigo": codigo,
        "id_admin": id_usuario,
    })

    # El creador se une automáticamente a su propia liga
    repo.agregar_miembro(liga.id, id_usuario)

    return {
        "id": liga.id,
        "nombre": liga.nombre,
        "codigo": liga.codigo,
        "total_miembros": 1,
    }


def unirse_a_liga(db: Session, codigo: str, id_usuario: int) -> dict:
    """
    Une a un usuario a una liga usando su código de invitación.
    Valida: que la liga exista y que el usuario no sea ya miembro.
    """
    repo = LigaRepository(db)
    liga = repo.get_by_codigo(codigo)

    if not liga:
        raise ValueError("El código de invitación no existe o es incorrecto.")

    if repo.usuario_ya_es_miembro(liga.id, id_usuario):
        raise ValueError("Ya eres miembro de esta liga.")

    repo.agregar_miembro(liga.id, id_usuario)

    return {
        "id": liga.id,
        "nombre": liga.nombre,
        "codigo": liga.codigo,
        "total_miembros": repo.contar_miembros(liga.id),
    }


def _construir_ranking(usuarios: list[Usuario], id_usuario_actual: int) -> list[RankingEntry]:
    """
    Convierte una lista de usuarios (ya ordenada por el repository) en entradas
    de ranking con posición y desempate ya aplicados.
    """
    resultado = []
    posicion = 1
    for i, u in enumerate(usuarios):
        # Si tiene los mismos puntos Y mismos aciertos que el anterior, comparten posición
        if i > 0:
            prev = usuarios[i - 1]
            if u.puntaje == prev.puntaje and u.aciertos_exactos == prev.aciertos_exactos:
                posicion = resultado[i - 1].posicion  # misma posición
            else:
                posicion = i + 1

        resultado.append(RankingEntry(
            posicion=posicion,
            id=u.id,
            nombre_usuario=u.nombre_usuario,
            puntaje=u.puntaje,
            aciertos_exactos=u.aciertos_exactos,
            es_yo=(u.id == id_usuario_actual),
        ))
    return resultado


def get_ranking_global(db: Session, id_usuario_actual: int) -> list[RankingEntry]:
    """Retorna el ranking global de todos los usuarios (sin admins)."""
    repo = LigaRepository(db)
    usuarios = repo.get_ranking_global()
    return _construir_ranking(usuarios, id_usuario_actual)


def get_mis_ligas(db: Session, id_usuario: int) -> list[LigaResponse]:
    """Retorna todas las ligas a las que pertenece el usuario."""
    repo = LigaRepository(db)
    ligas = repo.get_ligas_de_usuario(id_usuario)
    return [
        LigaResponse(
            id=l.id,
            nombre=l.nombre,
            codigo=l.codigo,
            total_miembros=repo.contar_miembros(l.id),
        )
        for l in ligas
    ]


def get_ranking_liga(db: Session, id_liga: int, id_usuario_actual: int) -> list[RankingEntry]:
    """
    Retorna el ranking de los miembros de una liga específica.
    Valida que el usuario que consulta pertenezca a esa liga.
    """
    repo = LigaRepository(db)

    if not repo.usuario_ya_es_miembro(id_liga, id_usuario_actual):
        raise PermissionError("No perteneces a esta liga.")

    usuarios = repo.get_ranking_liga(id_liga)
    return _construir_ranking(usuarios, id_usuario_actual)
