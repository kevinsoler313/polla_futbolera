from sqlalchemy.orm import Session
from typing import Optional, List
from app.models.models import Usuario
from app.repositories.base_repository import BaseRepository

class UsuarioRepository(BaseRepository[Usuario]):
    def __init__(self, db: Session):
        super().__init__(Usuario, db)

    def get_by_username(self, username: str) -> Optional[Usuario]:
        return self.db.query(self.model).filter(self.model.nombre_usuario == username).first()

    def get_by_email(self, email: str) -> Optional[Usuario]:
        return self.db.query(self.model).filter(self.model.correo == email).first()

    def get_ranking(self) -> List[Usuario]:
        return self.db.query(self.model).order_by(self.model.puntaje.desc()).all()
