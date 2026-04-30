import pandas as pd
from app.database import engine

try:
    df = pd.read_sql("SELECT * FROM prediccion_partido WHERE fase != 'grupos'", engine)
    print(df.to_string())
except Exception as e:
    print(e)
