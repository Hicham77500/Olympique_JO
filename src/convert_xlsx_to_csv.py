"""
Script de conversion XLSX vers CSV
Convertit olympic_medals.xlsx en olympic_medals.csv
"""

import pandas as pd
import os

def convert_xlsx_to_csv():
    """Convertit le fichier XLSX des médailles olympiques en CSV"""
    try:
        # Lecture du fichier XLSX
        df = pd.read_excel('data/olympic_medals.xlsx')
        
        # Sauvegarde en CSV
        df.to_csv('csv/olympic_medals.csv', index=False)
        
        print(f"✅ Conversion réussie: olympic_medals.xlsx → olympic_medals.csv")
        print(f"📊 Nombre de lignes: {len(df)}")
        print(f"📊 Nombre de colonnes: {len(df.columns)}")
        print(f"📊 Colonnes: {list(df.columns)}")
        
    except Exception as e:
        print(f"❌ Erreur lors de la conversion XLSX: {e}")

if __name__ == "__main__":
    convert_xlsx_to_csv()