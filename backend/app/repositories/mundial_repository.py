from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from app.models.models import Grupo, Equipo, Partido
from app.repositories.base_repository import BaseRepository

class GrupoRepository(BaseRepository[Grupo]):
    def __init__(self, db: Session):
        super().__init__(Grupo, db)

    def get_all_with_equipos(self) -> List[Grupo]:
        return self.db.query(self.model).options(joinedload(self.model.equipos)).order_by(self.model.nombre).all()


class EquipoRepository(BaseRepository[Equipo]):
    def __init__(self, db: Session):
        super().__init__(Equipo, db)

    def get_all_ordered(self) -> List[Equipo]:
        return self.db.query(self.model).order_by(self.model.nombre).all()


class PartidoRepository(BaseRepository[Partido]):
    def __init__(self, db: Session):
        super().__init__(Partido, db)

    def get_partidos(self, fase: Optional[str] = None, id_grupo: Optional[int] = None) -> List[Partido]:
        query = self.db.query(self.model)
        if fase:
            query = query.filter(self.model.fase == fase)
        if id_grupo:
            query = query.filter(self.model.id_grupo == id_grupo)
        return query.all()

    def get_partidos_eliminatoria(self) -> List[Partido]:
        return self.db.query(self.model).filter(self.model.fase != "grupos").all()
