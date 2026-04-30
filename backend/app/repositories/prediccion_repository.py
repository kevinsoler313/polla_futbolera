from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.models import PrediccionPartido, PrediccionGrupo, PrediccionTerceros, PrediccionLlaves
from app.repositories.base_repository import BaseRepository

class PrediccionPartidoRepository(BaseRepository[PrediccionPartido]):
    def __init__(self, db: Session):
        super().__init__(PrediccionPartido, db)

    def get_prediccion(self, usuario_id: int, partido_id: int) -> Optional[PrediccionPartido]:
        return self.db.query(self.model).filter(
            self.model.id_usuario == usuario_id,
            self.model.id_partido == partido_id
        ).first()

    def get_mis_predicciones(self, usuario_id: int) -> List[PrediccionPartido]:
        return self.db.query(self.model).filter(self.model.id_usuario == usuario_id).all()

    def get_mis_predicciones_fase(self, usuario_id: int, fase: str) -> List[PrediccionPartido]:
        return self.db.query(self.model).filter(
            self.model.id_usuario == usuario_id,
            self.model.fase == fase
        ).all()


class PrediccionGrupoRepository(BaseRepository[PrediccionGrupo]):
    def __init__(self, db: Session):
        super().__init__(PrediccionGrupo, db)

    def get_prediccion(self, usuario_id: int, equipo_id: int) -> Optional[PrediccionGrupo]:
        return self.db.query(self.model).filter(
            self.model.id_usuario == usuario_id,
            self.model.id_equipo == equipo_id
        ).first()

    def get_mis_predicciones(self, usuario_id: int) -> List[PrediccionGrupo]:
        return self.db.query(self.model).filter(self.model.id_usuario == usuario_id).all()

class PrediccionTercerosRepository(BaseRepository[PrediccionTerceros]):
    def __init__(self, db: Session):
        super().__init__(PrediccionTerceros, db)

    def delete_by_usuario(self, usuario_id: int):
        self.db.query(self.model).filter(self.model.id_usuario == usuario_id).delete()
        self.db.commit()

    def get_all_by_usuario(self, usuario_id: int) -> List[PrediccionTerceros]:
        return self.db.query(self.model).filter(self.model.id_usuario == usuario_id).order_by(self.model.posicion).all()

class PrediccionLlavesRepository(BaseRepository[PrediccionLlaves]):
    def __init__(self, db: Session):
        super().__init__(PrediccionLlaves, db)

    def delete_by_usuario(self, usuario_id: int):
        self.db.query(self.model).filter(self.model.id_usuario == usuario_id).delete()
        self.db.commit()

    def get_all_by_usuario(self, usuario_id: int) -> List[PrediccionLlaves]:
        return self.db.query(self.model).filter(self.model.id_usuario == usuario_id).all()
