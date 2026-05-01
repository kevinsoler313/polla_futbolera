"""
Deadline Service - Lógica de cierre de apuestas y confirmación definitiva.
Responsabilidad única: validar si las apuestas están abiertas y gestionar
el estado de confirmación del usuario.
"""
from datetime import datetime
from sqlalchemy.orm import Session

from app.config import settings
from app.models.models import Usuario


def get_fecha_cierre() -> datetime:
    """
    Retorna la fecha/hora de cierre de apuestas (inicio del Mundial).
    Se parsea desde la configuración para permitir modificarla vía .env.
    """
    return datetime.fromisoformat(settings.FECHA_INICIO_MUNDIAL)


def apuestas_abiertas() -> bool:
    """
    Retorna True si aún se pueden hacer/editar apuestas.
    Las apuestas cierran automáticamente cuando arranca el Mundial.
    """
    return datetime.utcnow() < get_fecha_cierre()


def get_estado_apuestas() -> dict:
    """
    Retorna un dict con el estado del cierre de apuestas para el frontend.
    """
    ahora = datetime.utcnow()
    cierre = get_fecha_cierre()
    abiertas = ahora < cierre
    segundos_restantes = max(0, int((cierre - ahora).total_seconds()))

    return {
        "abiertas": abiertas,
        "fecha_cierre": cierre.isoformat(),
        "segundos_restantes": segundos_restantes,
    }


def confirmar_apuestas(db: Session, usuario: Usuario) -> Usuario:
    """
    Confirma las apuestas definitivas del usuario.
    - Solo se puede confirmar si las apuestas aún están abiertas.
    - Si ya confirmó, retorna el usuario sin error (idempotente).
    """
    if not apuestas_abiertas():
        raise ValueError(
            "Las apuestas están cerradas. El Mundial ya comenzó."
        )

    if not usuario.apuestas_confirmadas:
        usuario.apuestas_confirmadas = True
        usuario.fecha_confirmacion = datetime.utcnow()
        db.add(usuario)
        db.commit()
        db.refresh(usuario)

    return usuario
