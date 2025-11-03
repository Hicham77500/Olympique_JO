-- /sql/validate_database.sql
-- Script de validation et vérification de la base de données olympique

USE olympics;

-- 1. Vérification de l'existence des tables
SELECT 'Vérification des tables:' AS check_type;
SHOW TABLES;

-- 2. Vérification de la structure des tables
SELECT 'Structure de la table hosts:' AS table_info;
DESCRIBE hosts;

SELECT 'Structure de la table athletes:' AS table_info;
DESCRIBE athletes;

SELECT 'Structure de la table medals:' AS table_info;
DESCRIBE medals;

SELECT 'Structure de la table results:' AS table_info;
DESCRIBE results;

-- 3. Statistiques générales
SELECT 'Statistiques générales:' AS stats_type;
SELECT 
    'hosts' AS table_name,
    COUNT(*) AS row_count,
    COUNT(DISTINCT year) AS distinct_years,
    COUNT(DISTINCT country) AS distinct_countries
FROM hosts

UNION ALL

SELECT 
    'athletes' AS table_name,
    COUNT(*) AS row_count,
    COUNT(DISTINCT name) AS distinct_names,
    COUNT(DISTINCT nationality) AS distinct_nationalities
FROM athletes

UNION ALL

SELECT 
    'medals' AS table_name,
    COUNT(*) AS row_count,
    COUNT(DISTINCT sport) AS distinct_sports,
    COUNT(DISTINCT medal) AS distinct_medal_types
FROM medals

UNION ALL

SELECT 
    'results' AS table_name,
    COUNT(*) AS row_count,
    COUNT(DISTINCT event) AS distinct_events,
    AVG(rank) AS average_rank
FROM results;

-- 4. Vérification de l'intégrité référentielle
SELECT 'Vérification intégrité référentielle:' AS integrity_check;

-- Médailles sans athlète correspondant
SELECT COUNT(*) AS medals_without_athlete
FROM medals m
LEFT JOIN athletes a ON m.athlete_id = a.id
WHERE a.id IS NULL;

-- Résultats sans athlète correspondant
SELECT COUNT(*) AS results_without_athlete
FROM results r
LEFT JOIN athletes a ON r.athlete_id = a.id
WHERE a.id IS NULL;

-- 5. Analyse des médailles par type
SELECT 'Distribution des médailles:' AS medal_analysis;
SELECT 
    medal,
    COUNT(*) AS count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM medals), 2) AS percentage
FROM medals
WHERE medal IS NOT NULL
GROUP BY medal
ORDER BY count DESC;

-- 6. Top 10 des pays par nombre de médailles
SELECT 'Top 10 pays par médailles:' AS top_countries;
SELECT 
    h.country,
    COUNT(m.id) AS total_medals,
    SUM(CASE WHEN m.medal = 'GOLD' THEN 1 ELSE 0 END) AS gold,
    SUM(CASE WHEN m.medal = 'SILVER' THEN 1 ELSE 0 END) AS silver,
    SUM(CASE WHEN m.medal = 'BRONZE' THEN 1 ELSE 0 END) AS bronze
FROM hosts h
JOIN medals m ON h.year = m.year
WHERE m.medal IN ('GOLD', 'SILVER', 'BRONZE')
GROUP BY h.country
ORDER BY total_medals DESC
LIMIT 10;

-- 7. Distribution des Jeux par saison
SELECT 'Distribution par saison:' AS season_analysis;
SELECT 
    season,
    COUNT(*) AS number_of_games,
    MIN(year) AS first_year,
    MAX(year) AS last_year
FROM hosts
GROUP BY season;

-- 8. Vérification des données nulles
SELECT 'Analyse des données nulles:' AS null_analysis;
SELECT 
    'athletes' AS table_name,
    'name' AS column_name,
    COUNT(*) AS total_rows,
    SUM(CASE WHEN name IS NULL THEN 1 ELSE 0 END) AS null_count,
    ROUND(SUM(CASE WHEN name IS NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS null_percentage
FROM athletes

UNION ALL

SELECT 
    'athletes' AS table_name,
    'age' AS column_name,
    COUNT(*) AS total_rows,
    SUM(CASE WHEN age IS NULL THEN 1 ELSE 0 END) AS null_count,
    ROUND(SUM(CASE WHEN age IS NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS null_percentage
FROM athletes

UNION ALL

SELECT 
    'medals' AS table_name,
    'athlete_id' AS column_name,
    COUNT(*) AS total_rows,
    SUM(CASE WHEN athlete_id IS NULL THEN 1 ELSE 0 END) AS null_count,
    ROUND(SUM(CASE WHEN athlete_id IS NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS null_percentage
FROM medals;

-- 9. Test de performance sur les index
SELECT 'Test de performance des index:' AS performance_test;
EXPLAIN SELECT * FROM athletes WHERE name = 'Michael PHELPS';
EXPLAIN SELECT * FROM medals WHERE year = 2020;
EXPLAIN SELECT * FROM hosts WHERE country = 'United States';

-- 10. Résumé final de la validation
SELECT 'Résumé de la validation:' AS final_summary;
SELECT 
    'Base de données olympique' AS database_name,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'olympics') AS total_tables,
    (SELECT SUM(table_rows) FROM information_schema.tables WHERE table_schema = 'olympics') AS estimated_total_rows,
    NOW() AS validation_timestamp;