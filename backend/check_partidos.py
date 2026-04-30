import json
from app.database import engine
import pandas as pd

df = pd.read_sql("SELECT id, fase, id_equipo1, id_equipo2 FROM partido WHERE fase != 'grupos' ORDER BY id ASC", engine)
print(df.to_json(orient="records"))
