# Documentation des Scripts SQL - Projet Olympique

## Vue d'ensemble

Ce dossier contient tous les scripts SQL nécessaires pour créer et gérer la base de données olympique sur MySQL Azure.

## Structure de la base de données

```sql
olympics/
├── hosts (pays/villes hôtes)
├── athletes (athlètes olympiques) 
├── medals (médailles olympiques)
└── results (résultats des compétitions)
```

## Scripts disponibles

### 1. `olympics.sql` - Script principal de création
**Description :** Crée la base de données et toutes les tables avec leurs relations.

**Utilisation :**
```bash
mysql -u username -p -h your-azure-server.mysql.database.azure.com < sql/olympics.sql
```

**Contenu :**
- Création de la base `olympics`
- Tables : `hosts`, `athletes`, `medals`, `results`
- Index pour optimiser les performances
- Clés étrangères avec contraintes

### 2. `insert_data.sql` - Insertion via LOAD DATA
**Description :** Script d'insertion utilisant LOAD DATA INFILE (pour MySQL local).

**Prérequis :**
- Fichiers CSV dans le répertoire accessible par MySQL
- Privilèges FILE sur MySQL

**Utilisation :**
```bash
mysql -u username -p olympics < sql/insert_data.sql
```

### 3. `insert_data_python.sql` - Procédures stockées
**Description :** Crée des procédures stockées pour l'insertion via Python.

**Utilisation :**
```bash
mysql -u username -p olympics < sql/insert_data_python.sql
```

**Procédures créées :**
- `InsertHost(year, city, country, season)`
- `InsertAthlete(name, sex, age, nationality)`
- `InsertMedal(athlete_name, year, city, sport, event, medal)`
- `InsertResult(athlete_name, year, event, rank, score)`
- `CleanTables()` - Vide toutes les tables
- `ShowStats()` - Affiche les statistiques

### 4. `validate_database.sql` - Validation et vérification
**Description :** Script complet de validation de la base de données.

**Utilisation :**
```bash
mysql -u username -p olympics < sql/validate_database.sql
```

**Vérifications effectuées :**
- Structure des tables
- Intégrité référentielle
- Statistiques de données
- Performance des index
- Analyse des données nulles
- Distribution des médailles
- Top pays par médailles

## Schéma des tables

### Table `hosts`
```sql
CREATE TABLE hosts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  year INT NOT NULL,           -- Année des JO
  city VARCHAR(255) NOT NULL,  -- Ville hôte
  country VARCHAR(255) NOT NULL, -- Pays hôte
  season VARCHAR(20)           -- Saison (Summer/Winter)
);
```

### Table `athletes`
```sql
CREATE TABLE athletes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),           -- Nom complet
  sex VARCHAR(1),             -- Sexe (M/F)
  age INT,                    -- Âge
  nationality VARCHAR(50)     -- Nationalité
);
```

### Table `medals`
```sql
CREATE TABLE medals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  athlete_id INT,             -- Référence athlète
  year INT,                   -- Année des JO
  city VARCHAR(255),          -- Ville des JO
  sport VARCHAR(255),         -- Sport
  event VARCHAR(255),         -- Épreuve
  medal VARCHAR(10),          -- Type médaille (GOLD/SILVER/BRONZE)
  FOREIGN KEY (athlete_id) REFERENCES athletes(id)
);
```

### Table `results`
```sql
CREATE TABLE results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  athlete_id INT,             -- Référence athlète
  year INT,                   -- Année des JO
  event VARCHAR(255),         -- Épreuve
  rank INT,                   -- Classement
  score FLOAT,                -- Score (si applicable)
  FOREIGN KEY (athlete_id) REFERENCES athletes(id)
);
```

## Configuration Azure MySQL

### Connexion
```bash
mysql -u your_username@server_name -p -h your-server.mysql.database.azure.com
```

### Variables importantes
```sql
-- Taille max des paquets (pour gros imports)
SET GLOBAL max_allowed_packet = 1073741824;

-- Désactiver temporairement les clés étrangères
SET FOREIGN_KEY_CHECKS = 0;
-- ... insertions ...
SET FOREIGN_KEY_CHECKS = 1;
```

## Ordre d'exécution recommandé

1. **Création de la base :**
   ```bash
   mysql -u username -p < sql/olympics.sql
   ```

2. **Création des procédures (optionnel) :**
   ```bash
   mysql -u username -p olympics < sql/insert_data_python.sql
   ```

3. **Insertion des données :**
   - Via script Python (recommandé)
   - Via LOAD DATA (si supporté)

4. **Validation :**
   ```bash
   mysql -u username -p olympics < sql/validate_database.sql
   ```

## Exemple d'utilisation des procédures

```sql
-- Insérer un hôte
CALL InsertHost(2024, 'Paris', 'France', 'Summer');

-- Insérer un athlète
CALL InsertAthlete('John DOE', 'M', 25, 'USA');

-- Insérer une médaille
CALL InsertMedal('John DOE', 2024, 'Paris', 'Swimming', '100m Freestyle', 'GOLD');

-- Afficher les statistiques
CALL ShowStats();
```

## Maintenance

### Nettoyage complet
```sql
CALL CleanTables(); -- Vide toutes les tables
```

### Optimisation
```sql
OPTIMIZE TABLE hosts, athletes, medals, results;
```

### Backup
```bash
mysqldump -u username -p olympics > backup_olympics.sql
```

## Dépannage

### Problèmes courants

1. **Erreur de clé étrangère :**
   ```sql
   SET FOREIGN_KEY_CHECKS = 0;
   -- Votre requête
   SET FOREIGN_KEY_CHECKS = 1;
   ```

2. **Timeout d'import :**
   ```sql
   SET SESSION wait_timeout = 28800;
   SET SESSION interactive_timeout = 28800;
   ```

3. **Mémoire insuffisante :**
   ```sql
   SET GLOBAL innodb_buffer_pool_size = 2G;
   ```

## Support

Pour toute question ou problème avec les scripts SQL, vérifiez :
1. Les logs d'erreur MySQL
2. Les privilèges utilisateur
3. La configuration Azure MySQL
4. La compatibilité des versions