from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Polla Mundial 2026"
    DEBUG: bool = True

    # Database - Conexión a MySQL (XAMPP por defecto: usuario root, sin contraseña)
    DATABASE_URL: str = "mysql+pymysql://root:@localhost:3307/polla_mundial"

    # JWT
    SECRET_KEY: str = "supersecretkey-cambia-esto-en-produccion-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 horas

    # CORS
    FRONTEND_URL: str = "http://localhost:5174"

    # Fecha de inicio del Mundial (cierre de apuestas)
    # Formato ISO 8601: "2026-06-11T15:00:00" (hora Colombia UTC-5)
    # Cuando no está definida, las apuestas permanecen abiertas
    FECHA_INICIO_MUNDIAL: str = "2026-06-11T15:00:00"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
