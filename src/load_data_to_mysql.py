"""
Script Python pour insérer les données CSV dans la base MySQL olympique
Utilise les procédures stockées créées dans insert_data_python.sql
"""

import pandas as pd
import mysql.connector
import sys
import re
from datetime import datetime
from pathlib import Path

class OlympicDBLoader:
    def __init__(self, host, user, password, database='olympics'):
        """Initialise la connexion à la base de données"""
        try:
            self.conn = mysql.connector.connect(
                host=host,
                user=user,
                password=password,
                database=database,
                autocommit=True
            )
            self.cursor = self.conn.cursor()
            self.initialize_schema()
            print(f"✅ Connexion réussie à la base {database}")
        except Exception as e:
            print(f"❌ Erreur de connexion: {e}")
            sys.exit(1)

    def initialize_schema(self, sql_path: Path | str | None = None):
        """Exécute le script SQL d'initialisation si fourni."""
        if sql_path is None:
            sql_path = Path(__file__).resolve().parents[1] / 'sql' / 'init_db.sql'
        else:
            sql_path = Path(sql_path)

        if not sql_path.exists():
            print(f"⚠️ Script d'initialisation introuvable: {sql_path}")
            return

        print(f"🛠️  Initialisation du schéma via {sql_path}")
        raw_sql = sql_path.read_text(encoding='utf-8')
        usable_lines = []
        for line in raw_sql.splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith('--'):
                continue
            usable_lines.append(line)

        statements = [stmt.strip() for stmt in '\n'.join(usable_lines).split(';') if stmt.strip()]
        for statement in statements:
            self.cursor.execute(statement)
        self.conn.commit()
        print("✅ Schéma principal vérifié")
    
    def load_hosts(self, csv_path='csv/olympic_hosts.csv'):
        """Charge les données des hôtes olympiques"""
        try:
            df = pd.read_csv(csv_path)
            count = 0
            
            for _, row in df.iterrows():
                year = int(row['game_year'])
                city = row['game_name'].split()[-1]  # Extrait la ville du nom
                country = row['game_location']
                season = row['game_season']
                
                self.cursor.callproc('InsertHost', [year, city, country, season])
                count += 1
            
            print(f"✅ {count} hôtes insérés depuis {csv_path}")
            
        except Exception as e:
            print(f"❌ Erreur lors du chargement des hôtes: {e}")
    
    def load_athletes(self, csv_path='csv/olympic_athletes.csv'):
        """Charge les données des athlètes"""
        try:
            df = pd.read_csv(csv_path)
            count = 0
            
            for _, row in df.iterrows():
                name = row['athlete_full_name']
                sex = None  # Pas disponible dans les données
                
                # Calcul de l'âge approximatif
                birth_year = row['athlete_year_birth']
                age = None
                if pd.notna(birth_year):
                    age = int(2024 - birth_year)
                
                nationality = None  # Pas directement disponible
                
                self.cursor.callproc('InsertAthlete', [name, sex, age, nationality])
                count += 1
                
                if count % 1000 == 0:
                    print(f"   📊 {count} athlètes traités...")
            
            print(f"✅ {count} athlètes insérés depuis {csv_path}")
            
        except Exception as e:
            print(f"❌ Erreur lors du chargement des athlètes: {e}")
    
    def load_medals(self, csv_path='csv/olympic_medals.csv'):
        """Charge les données des médailles"""
        try:
            df = pd.read_csv(csv_path)
            count = 0
            
            for _, row in df.iterrows():
                athlete_name = row['athlete_full_name']
                
                # Extraction de l'année depuis slug_game (ex: "beijing-2022" -> 2022)
                slug_game = row['slug_game']
                year_match = re.search(r'(\d{4})', slug_game)
                year = int(year_match.group(1)) if year_match else None
                
                city = row['participant_title']
                sport = row['discipline_title']
                event = row['event_title']
                medal = row['medal_type']
                
                if year and athlete_name and pd.notna(athlete_name):
                    self.cursor.callproc('InsertMedal', 
                                       [athlete_name, year, city, sport, event, medal])
                    count += 1
                
                if count % 1000 == 0:
                    print(f"   📊 {count} médailles traitées...")
            
            print(f"✅ {count} médailles insérées depuis {csv_path}")
            
        except Exception as e:
            print(f"❌ Erreur lors du chargement des médailles: {e}")
    
    def load_results(self, csv_path='csv/olympic_results.csv'):
        """Charge les données des résultats"""
        try:
            df = pd.read_csv(csv_path)
            count = 0
            
            for _, row in df.iterrows():
                athlete_name = row['athlete_full_name']
                
                # Extraction de l'année depuis slug_game
                slug_game = row['slug_game']
                year_match = re.search(r'(\d{4})', slug_game)
                year = int(year_match.group(1)) if year_match else None
                
                event = row['event_title']
                rank = row['rank_position']
                score = None  # Pas de score numérique disponible
                
                if (year and athlete_name and pd.notna(athlete_name) 
                    and pd.notna(rank) and rank != ''):
                    self.cursor.callproc('InsertResult', 
                                       [athlete_name, year, event, int(rank), score])
                    count += 1
                
                if count % 1000 == 0:
                    print(f"   📊 {count} résultats traités...")
            
            print(f"✅ {count} résultats insérés depuis {csv_path}")
            
        except Exception as e:
            print(f"❌ Erreur lors du chargement des résultats: {e}")
    
    def show_stats(self):
        """Affiche les statistiques de la base de données"""
        try:
            print("\n" + "="*50)
            print("📊 STATISTIQUES DE LA BASE DE DONNÉES")
            print("="*50)
            
            self.cursor.callproc('ShowStats')
            
            # Récupère tous les résultats des procédures
            for result in self.cursor.stored_results():
                rows = result.fetchall()
                for row in rows:
                    print(row)
                    
        except Exception as e:
            print(f"❌ Erreur lors de l'affichage des statistiques: {e}")
    
    def clean_database(self):
        """Nettoie toutes les tables"""
        try:
            self.cursor.callproc('CleanTables')
            print("✅ Base de données nettoyée")
        except Exception as e:
            print(f"❌ Erreur lors du nettoyage: {e}")
    
    def close(self):
        """Ferme la connexion"""
        self.cursor.close()
        self.conn.close()
        print("🔒 Connexion fermée")

def main():
    """Fonction principale"""
    print("🏆 CHARGEMENT DES DONNÉES OLYMPIQUES")
    print("="*50)
    print(f"📅 Début: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Configuration de connexion (à adapter selon votre configuration Azure)
    host = "your-server.mysql.database.azure.com"
    user = "your_username@your_server"
    password = "your_password"
    
    # Pour test local, décommentez :
    # host = "localhost"
    # user = "root"
    # password = "your_local_password"
    
    try:
        # Initialisation de la connexion
        loader = OlympicDBLoader(host, user, password)
        
        # Option pour nettoyer avant insertion (décommentez si nécessaire)
        # loader.clean_database()
        
        # Chargement des données dans l'ordre des dépendances
        print("\n1. Chargement des hôtes...")
        loader.load_hosts()
        
        print("\n2. Chargement des athlètes...")
        loader.load_athletes()
        
        print("\n3. Chargement des médailles...")
        loader.load_medals()
        
        print("\n4. Chargement des résultats...")
        loader.load_results()
        
        # Affichage des statistiques finales
        loader.show_stats()
        
        # Fermeture de la connexion
        loader.close()
        
        print(f"\n📅 Fin: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("🏆 Chargement terminé avec succès!")
        
    except Exception as e:
        print(f"❌ Erreur générale: {e}")

if __name__ == "__main__":
    main()