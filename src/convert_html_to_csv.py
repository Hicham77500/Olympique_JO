"""
Script de conversion HTML vers CSV
Convertit olympic_results.html en olympic_results.csv
"""

import pandas as pd
import os

def convert_html_to_csv():
    """Convertit le fichier HTML des résultats olympiques en CSV"""
    try:
        # Lecture du fichier HTML (prend la première table par défaut)
        tables = pd.read_html('data/olympic_results.html')
        
        if len(tables) == 0:
            raise ValueError("Aucune table trouvée dans le fichier HTML")
        
        # Utilise la première table (index 0)
        df = tables[0]
        
        # Sauvegarde en CSV
        df.to_csv('csv/olympic_results.csv', index=False)
        
        print(f"✅ Conversion réussie: olympic_results.html → olympic_results.csv")
        print(f"📊 Nombre de tables trouvées: {len(tables)}")
        print(f"📊 Nombre de lignes: {len(df)}")
        print(f"📊 Nombre de colonnes: {len(df.columns)}")
        print(f"📊 Colonnes: {list(df.columns)}")
        
        if len(tables) > 1:
            print(f"⚠️  Attention: {len(tables)} tables trouvées, seule la première a été convertie")
        
    except Exception as e:
        print(f"❌ Erreur lors de la conversion HTML: {e}")

if __name__ == "__main__":
    convert_html_to_csv()