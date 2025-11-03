"""
Script de conversion XML vers CSV
Convertit olympic_hosts.xml en olympic_hosts.csv
"""

import pandas as pd
import os

def convert_xml_to_csv():
    """Convertit le fichier XML des pays hôtes olympiques en CSV"""
    try:
        # Lecture du fichier XML
        df = pd.read_xml('data/olympic_hosts.xml')
        
        # Sauvegarde en CSV
        df.to_csv('csv/olympic_hosts.csv', index=False)
        
        print(f"✅ Conversion réussie: olympic_hosts.xml → olympic_hosts.csv")
        print(f"📊 Nombre de lignes: {len(df)}")
        print(f"📊 Nombre de colonnes: {len(df.columns)}")
        print(f"📊 Colonnes: {list(df.columns)}")
        
    except Exception as e:
        print(f"❌ Erreur lors de la conversion XML: {e}")

if __name__ == "__main__":
    convert_xml_to_csv()