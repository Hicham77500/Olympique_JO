-- /sql/insert_data.sql
-- Scripts d'insertion des données olympiques depuis les fichiers CSV
-- À exécuter après olympics.sql

USE olympics;

-- Désactiver les vérifications de clés étrangères temporairement
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Insertion des données des hôtes (depuis olympic_hosts.csv)
-- Structure: game_year, game_location, game_name, game_season
LOAD DATA INFILE 'olympic_hosts.csv'
INTO TABLE hosts
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(@dummy, @dummy2, @dummy3, @dummy4, @game_location, @game_name, @game_season, @game_year)
SET 
    year = @game_year,
    city = SUBSTRING_INDEX(@game_name, ' ', -1), -- Extrait l'année de game_name
    country = @game_location,
    season = @game_season;

-- 2. Insertion des athlètes (depuis olympic_athletes.csv)
-- Structure: athlete_url, athlete_full_name, games_participations, first_game, athlete_year_birth, athlete_medals, bio
LOAD DATA INFILE 'olympic_athletes.csv'
INTO TABLE athletes
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(@athlete_url, @athlete_full_name, @games_participations, @first_game, @athlete_year_birth, @athlete_medals, @bio)
SET 
    name = @athlete_full_name,
    sex = NULL, -- Pas disponible dans les données
    age = IF(@athlete_year_birth IS NOT NULL AND @athlete_year_birth != '', 2024 - @athlete_year_birth, NULL),
    nationality = NULL; -- Pas directement disponible

-- 3. Insertion des médailles (depuis olympic_medals.csv)
-- Structure complexe avec athlete_url, athlete_full_name, event_title, medal_type, etc.
LOAD DATA INFILE 'olympic_medals.csv'
INTO TABLE medals
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(@unnamed, @discipline_title, @slug_game, @event_title, @event_gender, @medal_type, @participant_type, @participant_title, @athlete_url, @athlete_full_name, @country_name, @country_code, @country_3_letter_code)
SET 
    athlete_id = (SELECT id FROM athletes WHERE name = @athlete_full_name LIMIT 1),
    year = (SELECT year FROM hosts WHERE LOWER(city) LIKE CONCAT('%', SUBSTRING_INDEX(@slug_game, '-', -1), '%') LIMIT 1),
    city = @participant_title,
    sport = @discipline_title,
    event = @event_title,
    medal = @medal_type;

-- 4. Insertion des résultats (depuis olympic_results.csv)
-- Structure: discipline_title, event_title, rank_position, athlete_full_name, etc.
LOAD DATA INFILE 'olympic_results.csv'
INTO TABLE results
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(@unnamed, @discipline_title, @event_title, @slug_game, @participant_type, @medal_type, @athletes, @rank_equal, @rank_position, @country_name, @country_code, @country_3_letter_code, @athlete_url, @athlete_full_name, @value_unit, @value_type)
SET 
    athlete_id = (SELECT id FROM athletes WHERE name = @athlete_full_name LIMIT 1),
    year = (SELECT year FROM hosts WHERE LOWER(city) LIKE CONCAT('%', SUBSTRING_INDEX(@slug_game, '-', -1), '%') LIMIT 1),
    event = @event_title,
    rank = IF(@rank_position IS NOT NULL AND @rank_position != '', @rank_position, NULL),
    score = NULL; -- Pas de score numérique dans les données

-- Réactiver les vérifications de clés étrangères
SET FOREIGN_KEY_CHECKS = 1;

-- Affichage des statistiques d'insertion
SELECT 'Statistiques d\'insertion:' AS info;
SELECT COUNT(*) AS nombre_hotes FROM hosts;
SELECT COUNT(*) AS nombre_athletes FROM athletes;
SELECT COUNT(*) AS nombre_medailles FROM medals;
SELECT COUNT(*) AS nombre_resultats FROM results;