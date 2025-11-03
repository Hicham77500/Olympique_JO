-- /sql/olympics.sql
-- Script de création de la base de données olympique
-- Compatible avec MySQL sur Azure

-- Création de la base de données
CREATE DATABASE IF NOT EXISTS olympics;
USE olympics;

-- Suppression des tables existantes (dans l'ordre inverse des dépendances)
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

-- Affichage des tables créées
SHOW TABLES;

-- Affichage de la structure des tables
DESCRIBE hosts;
DESCRIBE athletes;
DESCRIBE medals;
DESCRIBE results;