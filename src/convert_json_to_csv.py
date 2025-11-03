"""
Script de conversion JSON vers CSV
Convertit olympic_athletes.json en olympic_athletes.csv
"""

import pandas as pd
import os

def convert_json_to_csv():
    """Convertit le fichier JSON des athlètes olympiques en CSV"""
    try:
        # Lecture du fichier JSON
        df = pd.read_json('data/olympic_athletes.json')
        
        # Sauvegarde en CSV
        df.to_csv('csv/olympic_athletes.csv', index=False)
        
        print(f"✅ Conversion réussie: olympic_athletes.json → olympic_athletes.csv")
        print(f"📊 Nombre de lignes: {len(df)}")
        print(f"📊 Nombre de colonnes: {len(df.columns)}")
        print(f"📊 Colonnes: {list(df.columns)}")
        
    except Exception as e:
        print(f"❌ Erreur lors de la conversion JSON: {e}")

if __name__ == "__main__":
    convert_json_to_csv()