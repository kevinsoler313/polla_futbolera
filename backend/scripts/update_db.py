import sys
from sqlalchemy import text
from app.core.database import engine

def main():
    try:
        with engine.connect() as conn:
            # Check if columns exist before adding
            print("Checking and updating 'usuario' table...")
            
            try:
                conn.execute(text("ALTER TABLE usuario ADD COLUMN es_admin BOOLEAN DEFAULT FALSE;"))
                print("[OK] Added 'es_admin' column.")
            except Exception as e:
                print(f"[SKIP] 'es_admin' column might already exist. ({str(e).splitlines()[0]})")

            try:
                conn.execute(text("ALTER TABLE usuario ADD COLUMN aciertos_exactos INTEGER DEFAULT 0;"))
                print("[OK] Added 'aciertos_exactos' column.")
            except Exception as e:
                print(f"[SKIP] 'aciertos_exactos' column might already exist. ({str(e).splitlines()[0]})")

            try:
                conn.execute(text("ALTER TABLE prediccion_grupo ADD COLUMN puntaje INTEGER DEFAULT 0;"))
                print("[OK] Added 'puntaje' column to 'prediccion_grupo'.")
            except Exception as e:
                print(f"[SKIP] 'puntaje' column in 'prediccion_grupo' might already exist. ({str(e).splitlines()[0]})")

            try:
                conn.execute(text("ALTER TABLE prediccion_terceros ADD COLUMN puntaje INTEGER DEFAULT 0;"))
                print("[OK] Added 'puntaje' column to 'prediccion_terceros'.")
            except Exception as e:
                print(f"[SKIP] 'puntaje' column in 'prediccion_terceros' might already exist. ({str(e).splitlines()[0]})")

            # Crear tabla terceros_clasificados si no existe
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS terceros_clasificados (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    id_equipo INT NOT NULL,
                    posicion INT,
                    FOREIGN KEY (id_equipo) REFERENCES equipo(id)
                );
            """))
            print("[OK] Table 'terceros_clasificados' ensured.")
                
            conn.commit()
            print("Database update complete.")
    except Exception as e:
        print(f"Error connecting to database: {e}")

if __name__ == "__main__":
    main()
