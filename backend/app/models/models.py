"""
Modelos de base de datos - Polla Mundial 2026
Basado en el diagrama de relaciones proporcionado.
"""
from sqlalchemy import (
    Column, Integer, String, Boolean, ForeignKey, Float
)
from sqlalchemy.orm import relationship
from app.database import Base


# ─────────────────────────────────────────────
# USUARIO
# ─────────────────────────────────────────────
class Usuario(Base):
    __tablename__ = "usuario"

    id = Column(Integer, primary_key=True, index=True)
    nombre_usuario = Column(String(50), unique=True, index=True, nullable=False)
    contrasena = Column(String(255), nullable=False)          # hash bcrypt
    correo = Column(String(100), unique=True, nullable=False)
    puntaje = Column(Integer, default=0)

    # Relaciones
    predicciones_partido = relationship("PrediccionPartido", back_populates="usuario")
    predicciones_grupo = relationship("PrediccionGrupo", back_populates="usuario")
    predicciones_terceros = relationship("PrediccionTerceros", back_populates="usuario")


# ─────────────────────────────────────────────
# GRUPO  (A, B, C … L  en un mundial de 48 equipos)
# ─────────────────────────────────────────────
class Grupo(Base):
    __tablename__ = "grupo"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(10), nullable=False)       # "A", "B", etc.

    # Relaciones
    equipos = relationship("Equipo", back_populates="grupo")
    partidos = relationship("Partido", back_populates="grupo")
    posiciones = relationship("GrupoPosiciones", back_populates="grupo")


# ─────────────────────────────────────────────
# EQUIPO
# ─────────────────────────────────────────────
class Equipo(Base):
    __tablename__ = "equipo"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    bandera = Column(String(10), nullable=True)    # código emoji o URL
    grupo_id = Column(Integer, ForeignKey("grupo.id"), nullable=True)

    # Relaciones
    grupo = relationship("Grupo", back_populates="equipos")
    posiciones_grupo = relationship("GrupoPosiciones", back_populates="equipo")


# ─────────────────────────────────────────────
# POSICIONES DEL GRUPO (clasificados reales)
# ─────────────────────────────────────────────
class GrupoPosiciones(Base):
    __tablename__ = "grupo_posiciones"

    id = Column(Integer, primary_key=True, index=True)
    id_equipo = Column(Integer, ForeignKey("equipo.id"), nullable=False)
    posicion = Column(Integer, nullable=False)      # 1 o 2
    id_grupo = Column(Integer, ForeignKey("grupo.id"), nullable=False)

    equipo = relationship("Equipo", back_populates="posiciones_grupo")
    grupo = relationship("Grupo", back_populates="posiciones")


# ─────────────────────────────────────────────
# PARTIDO
# ─────────────────────────────────────────────
class Partido(Base):
    __tablename__ = "partido"

    id = Column(Integer, primary_key=True, index=True)
    id_equipo1 = Column(Integer, ForeignKey("equipo.id"), nullable=True)
    id_equipo2 = Column(Integer, ForeignKey("equipo.id"), nullable=True)
    goles_equipo1 = Column(Integer, nullable=True)    # None = no jugado
    goles_equipo2 = Column(Integer, nullable=True)
    fase = Column(String(30), nullable=False)          # "grupos", "1/16", "octavos", etc.
    id_grupo = Column(Integer, ForeignKey("grupo.id"), nullable=True)

    equipo1 = relationship("Equipo", foreign_keys=[id_equipo1])
    equipo2 = relationship("Equipo", foreign_keys=[id_equipo2])
    grupo = relationship("Grupo", back_populates="partidos")
    predicciones = relationship("PrediccionPartido", back_populates="partido")


# ─────────────────────────────────────────────
# PREDICCIÓN DE PARTIDO (apuesta de resultado)
# ─────────────────────────────────────────────
class PrediccionPartido(Base):
    __tablename__ = "prediccion_partido"

    id = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuario.id"), nullable=False)
    id_partido = Column(Integer, ForeignKey("partido.id"), nullable=False)
    goles_equipo1 = Column(Integer, nullable=False)
    goles_equipo2 = Column(Integer, nullable=False)
    puntaje = Column(Integer, default=0)
    acerto = Column(Boolean, default=False)
    fase = Column(String(30), nullable=False)
    id_equipo1 = Column(Integer, ForeignKey("equipo.id"), nullable=True)
    id_equipo2 = Column(Integer, ForeignKey("equipo.id"), nullable=True)

    usuario = relationship("Usuario", back_populates="predicciones_partido")
    partido = relationship("Partido", back_populates="predicciones")
    predicciones_llaves = relationship("PrediccionLlaves", back_populates="prediccion_partido")


# ─────────────────────────────────────────────
# PREDICCIÓN DE LLAVES (quién avanza en eliminatorias)
# ─────────────────────────────────────────────
class PrediccionLlaves(Base):
    __tablename__ = "prediccion_llaves"

    id = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuario.id"), nullable=False)
    id_prediccion_partido = Column(Integer, ForeignKey("prediccion_partido.id"), nullable=False)

    prediccion_partido = relationship("PrediccionPartido", back_populates="predicciones_llaves")


# ─────────────────────────────────────────────
# PREDICCIÓN DE POSICIÓN EN GRUPO
# ─────────────────────────────────────────────
class PrediccionGrupo(Base):
    __tablename__ = "prediccion_grupo"

    id = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuario.id"), nullable=False)
    id_equipo = Column(Integer, ForeignKey("equipo.id"), nullable=False)
    posicion = Column(Integer, nullable=False)      # 1 o 2

    usuario = relationship("Usuario", back_populates="predicciones_grupo")
    equipo = relationship("Equipo")


# ─────────────────────────────────────────────
# PREDICCIÓN DE TERCER PUESTO
# ─────────────────────────────────────────────
class PrediccionTerceros(Base):
    __tablename__ = "prediccion_terceros"

    id = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuario.id"), nullable=False)
    id_equipo = Column(Integer, ForeignKey("equipo.id"), nullable=False)
    clasificado_tercero = Column(Boolean, default=False)
    posicion = Column(Integer, nullable=True)

    usuario = relationship("Usuario", back_populates="predicciones_terceros")
    equipo = relationship("Equipo")
