from __future__ import annotations
"""
Liga Repository - Acceso a datos para Ligas Privadas
Responsabilidad única: operaciones de base de datos sobre liga y liga_usuario.
"""
from sqlalchemy.orm import Session
from app.models.models import Liga, LigaUsuario, Usuario
from app.repositories.base_repository import BaseRepository


class LigaRepository(BaseRepository[Liga]):
    def __init__(self, db: Session):
        super().__init__(Liga, db)

    def get_by_codigo(self, codigo: str) -> Liga | None:
        """Busca una liga por su código de invitación."""
        return self.db.query(Liga).filter(Liga.codigo == codigo).first()

    def get_ligas_de_usuario(self, id_usuario: int) -> list[Liga]:
        """Retorna todas las ligas a las que pertenece un usuario."""
        return (
            self.db.query(Liga)
            .join(LigaUsuario, LigaUsuario.id_liga == Liga.id)
            .filter(LigaUsuario.id_usuario == id_usuario)
            .all()
        )

    def usuario_ya_es_miembro(self, id_liga: int, id_usuario: int) -> bool:
        """Verifica si un usuario ya pertenece a una liga."""
        return (
            self.db.query(LigaUsuario)
            .filter(
                LigaUsuario.id_liga == id_liga,
                LigaUsuario.id_usuario == id_usuario,
            )
            .first()
            is not None
        )

    def agregar_miembro(self, id_liga: int, id_usuario: int) -> LigaUsuario:
        """Agrega un usuario a una liga."""
        miembro = LigaUsuario(id_liga=id_liga, id_usuario=id_usuario)
        self.db.add(miembro)
        self.db.commit()
        self.db.refresh(miembro)
        return miembro

    def get_ranking_liga(self, id_liga: int) -> list[Usuario]:
        """
        Retorna los usuarios de una liga ordenados por:
        1. Puntaje total (desc)
        2. Aciertos exactos (desc) — primer desempate
        3. Fecha de confirmación (asc) — quien confirmó antes gana el desempate.
           Los que no confirmaron quedan al final del desempate.
        """
        from sqlalchemy import nulls_last
        return (
            self.db.query(Usuario)
            .join(LigaUsuario, LigaUsuario.id_usuario == Usuario.id)
            .filter(LigaUsuario.id_liga == id_liga)
            .order_by(
                Usuario.puntaje.desc(),
                Usuario.aciertos_exactos.desc(),
                nulls_last(Usuario.fecha_confirmacion.asc()),
            )
            .all()
        )

    def get_ranking_global(self) -> list[Usuario]:
        """
        Retorna todos los usuarios ordenados por:
        1. Puntaje total (desc)
        2. Aciertos exactos (desc) — primer desempate
        3. Fecha de confirmación (asc) — quien confirmó antes gana el desempate.
        """
        from sqlalchemy import nulls_last
        return (
            self.db.query(Usuario)
            .filter(Usuario.es_admin == False)
            .order_by(
                Usuario.puntaje.desc(),
                Usuario.aciertos_exactos.desc(),
                nulls_last(Usuario.fecha_confirmacion.asc()),
            )
            .all()
        )

    def contar_miembros(self, id_liga: int) -> int:
        """Cuenta los miembros de una liga."""
        return (
            self.db.query(LigaUsuario)
            .filter(LigaUsuario.id_liga == id_liga)
            .count()
        )
