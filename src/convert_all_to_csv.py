"""
Script principal de conversion de tous les fichiers olympiques vers CSV
Exécute toutes les conversions en une seule fois
"""

import pandas as pd
import os
import sys
from datetime import datetime

def convert_all_to_csv():
    """Convertit tous les fichiers de données olympiques en CSV"""
    
    print("🏆 Conversion des données olympiques vers CSV")
    print("=" * 50)
    print(f"📅 Début de la conversion: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    conversions = [
        {
            'name': 'olympic_athletes.json',
            'reader': lambda: pd.read_json('data/olympic_athletes.json'),
            'output': 'csv/olympic_athletes.csv'
        },
        {
            'name': 'olympic_hosts.xml',
            'reader': lambda: pd.read_xml('data/olympic_hosts.xml'),
            'output': 'csv/olympic_hosts.csv'
        },
        {
            'name': 'olympic_medals.xlsx',
            'reader': lambda: pd.read_excel('data/olympic_medals.xlsx'),
            'output': 'csv/olympic_medals.csv'
        },
        {
            'name': 'olympic_results.html',
            'reader': lambda: pd.read_html('data/olympic_results.html')[0],
            'output': 'csv/olympic_results.csv'
        }
    ]
    
    success_count = 0
    total_rows = 0
    
    for conversion in conversions:
        try:
            print(f"🔄 Conversion de {conversion['name']}...")
            
            # Lecture du fichier
            df = conversion['reader']()
            
            # Sauvegarde en CSV
            df.to_csv(conversion['output'], index=False)
            
            rows = len(df)
            cols = len(df.columns)
            total_rows += rows
            
            print(f"✅ {conversion['name']} → {conversion['output']}")
            print(f"   📊 {rows} lignes, {cols} colonnes")
            print()
            
            success_count += 1
            
        except Exception as e:
            print(f"❌ Erreur avec {conversion['name']}: {e}")
            print()
    
    print("=" * 50)
    print(f"🎯 Résumé de la conversion:")
    print(f"   ✅ Fichiers convertis: {success_count}/{len(conversions)}")
    print(f"   📊 Total lignes traitées: {total_rows}")
    print(f"   📅 Fin de la conversion: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    if success_count == len(conversions):
        print("🏆 Toutes les conversions ont réussi!")
    else:
        print(f"⚠️  {len(conversions) - success_count} conversion(s) ont échoué")

def check_dependencies():
    """Vérifie que toutes les dépendances sont installées"""
    required_packages = ['pandas', 'openpyxl', 'lxml', 'html5lib']
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print("❌ Packages manquants:")
        for package in missing_packages:
            print(f"   - {package}")
        print()
        print("💡 Pour installer les packages manquants:")
        print(f"   pip install {' '.join(missing_packages)}")
        return False
    
    return True

if __name__ == "__main__":
    # Vérifie les dépendances
    if not check_dependencies():
        sys.exit(1)
    
    # Vérifie que le dossier csv existe
    if not os.path.exists('csv'):
        print("❌ Le dossier 'csv' n'existe pas")
        sys.exit(1)
    
    # Lance les conversions
    convert_all_to_csv()