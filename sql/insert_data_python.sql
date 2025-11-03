-- /sql/insert_data_python.sql
-- Script SQL à utiliser avec Python pour l'insertion des données
-- Plus pratique que LOAD DATA INFILE

USE olympics;

-- Procédures stockées pour l'insertion des données

-- 1. Insertion des hôtes
DELIMITER //
CREATE PROCEDURE InsertHost(
    IN p_year INT,
    IN p_city VARCHAR(255),
    IN p_country VARCHAR(255),
    IN p_season VARCHAR(20)
)
BEGIN
    INSERT IGNORE INTO hosts (year, city, country, season)
    VALUES (p_year, p_city, p_country, p_season);
END//
DELIMITER ;

-- 2. Insertion des athlètes
DELIMITER //
CREATE PROCEDURE InsertAthlete(
    IN p_name VARCHAR(255),
    IN p_sex VARCHAR(1),
    IN p_age INT,
    IN p_nationality VARCHAR(50)
)
BEGIN
    INSERT IGNORE INTO athletes (name, sex, age, nationality)
    VALUES (p_name, p_sex, p_age, p_nationality);
END//
DELIMITER ;

-- 3. Insertion des médailles
DELIMITER //
CREATE PROCEDURE InsertMedal(
    IN p_athlete_name VARCHAR(255),
    IN p_year INT,
    IN p_city VARCHAR(255),
    IN p_sport VARCHAR(255),
    IN p_event VARCHAR(255),
    IN p_medal VARCHAR(10)
)
BEGIN
    DECLARE athlete_id_var INT;
    
    -- Trouve l'ID de l'athlète
    SELECT id INTO athlete_id_var FROM athletes WHERE name = p_athlete_name LIMIT 1;
    
    IF athlete_id_var IS NOT NULL THEN
        INSERT IGNORE INTO medals (athlete_id, year, city, sport, event, medal)
        VALUES (athlete_id_var, p_year, p_city, p_sport, p_event, p_medal);
    END IF;
END//
DELIMITER ;

-- 4. Insertion des résultats
DELIMITER //
CREATE PROCEDURE InsertResult(
    IN p_athlete_name VARCHAR(255),
    IN p_year INT,
    IN p_event VARCHAR(255),
    IN p_rank INT,
    IN p_score FLOAT
)
BEGIN
    DECLARE athlete_id_var INT;
    
    -- Trouve l'ID de l'athlète
    SELECT id INTO athlete_id_var FROM athletes WHERE name = p_athlete_name LIMIT 1;
    
    IF athlete_id_var IS NOT NULL THEN
        INSERT IGNORE INTO results (athlete_id, year, event, rank, score)
        VALUES (athlete_id_var, p_year, p_event, p_rank, p_score);
    END IF;
END//
DELIMITER ;

-- Procédure pour nettoyer les tables
DELIMITER //
CREATE PROCEDURE CleanTables()
BEGIN
    SET FOREIGN_KEY_CHECKS = 0;
    TRUNCATE TABLE results;
    TRUNCATE TABLE medals;
    TRUNCATE TABLE athletes;
    TRUNCATE TABLE hosts;
    SET FOREIGN_KEY_CHECKS = 1;
END//
DELIMITER ;

-- Procédure pour afficher les statistiques
DELIMITER //
CREATE PROCEDURE ShowStats()
BEGIN
    SELECT 'Statistiques de la base de données:' AS info;
    SELECT COUNT(*) AS nombre_hotes FROM hosts;
    SELECT COUNT(*) AS nombre_athletes FROM athletes;
    SELECT COUNT(*) AS nombre_medailles FROM medals;
    SELECT COUNT(*) AS nombre_resultats FROM results;
    
    SELECT 'Exemples de données:' AS info;
    SELECT * FROM hosts LIMIT 5;
    SELECT * FROM athletes LIMIT 5;
    SELECT * FROM medals LIMIT 5;
    SELECT * FROM results LIMIT 5;
END//
DELIMITER ;