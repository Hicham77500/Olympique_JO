-- /sql/olympics.sql
-- Script de création de la base de données olympique
-- Compatible avec MySQL sur Azure

-- Création de la base de données
CREATE DATABASE IF NOT EXISTS olympics;
USE olympics;

-- Suppression des tables existantes (dans l'ordre inverse des dépendances)
DROP TABLE IF EXISTS medal_predictions;
DROP TABLE IF EXISTS country_year_summary;
DROP TABLE IF EXISTS results;
DROP TABLE IF EXISTS medals;
DROP TABLE IF EXISTS athletes;
DROP TABLE IF EXISTS hosts;

-- Table des pays/villes hôtes des Jeux Olympiques
CREATE TABLE hosts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  year INT NOT NULL,
  city VARCHAR(255) NOT NULL,
  country VARCHAR(255) NOT NULL,
  season VARCHAR(20),
  INDEX idx_year (year),
  INDEX idx_city (city),
  INDEX idx_country (country)
);

-- Table des athlètes olympiques
CREATE TABLE athletes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  sex VARCHAR(1),
  age INT,
  nationality VARCHAR(50),
  INDEX idx_name (name),
  INDEX idx_nationality (nationality)
);

-- Table des médailles olympiques
CREATE TABLE medals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  athlete_id INT,
  year INT,
  city VARCHAR(255),
  sport VARCHAR(255),
  event VARCHAR(255),
  medal VARCHAR(10),
  FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE,
  INDEX idx_athlete_id (athlete_id),
  INDEX idx_year (year),
  INDEX idx_sport (sport),
  INDEX idx_medal (medal)
);

-- Table des résultats olympiques
CREATE TABLE results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  athlete_id INT,
  year INT,
  event VARCHAR(255),
  rank INT,
  score FLOAT,
  FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE,
  INDEX idx_athlete_id (athlete_id),
  INDEX idx_year (year),
  INDEX idx_event (event),
  INDEX idx_rank (rank)
);

-- Table résumant les agrégations par pays et édition
CREATE TABLE country_year_summary (
  id INT AUTO_INCREMENT PRIMARY KEY,
  country_name VARCHAR(255) NOT NULL,
  slug_game VARCHAR(255) NOT NULL,
  medals_total INT,
  athletes_unique INT,
  avg_rank FLOAT,
  medal_share FLOAT,
  medals_total_lag_1 INT,
  athletes_unique_lag_1 INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_country (country_name),
  INDEX idx_slug_game (slug_game)
);

-- Table stockant les prédictions de médailles par pays/édition
CREATE TABLE medal_predictions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  country_name VARCHAR(255) NOT NULL,
  slug_game VARCHAR(255) NOT NULL,
  model_name VARCHAR(100) NOT NULL,
  target VARCHAR(50) NOT NULL,
  predicted_value FLOAT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_country_slug (country_name, slug_game),
  INDEX idx_model_target (model_name, target)
);

-- Affichage des tables créées
SHOW TABLES;

-- Affichage de la structure des tables
DESCRIBE hosts;
DESCRIBE athletes;
DESCRIBE medals;
DESCRIBE results;