-- sql/init_db.sql
-- Schéma principal de la base de données olympique.
-- À exécuter lors de l'initialisation d'un nouvel environnement.

CREATE DATABASE IF NOT EXISTS olympics
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE olympics;

-- Table des athlètes
CREATE TABLE IF NOT EXISTS athletes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  sex VARCHAR(1),
  age INT,
  nationality VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_athlete_name_nationality (name, nationality),
  INDEX idx_athlete_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table des hôtes
CREATE TABLE IF NOT EXISTS hosts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  year INT NOT NULL,
  city VARCHAR(255) NOT NULL,
  country VARCHAR(255) NOT NULL,
  season VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_host_year_season (year, season),
  INDEX idx_host_country (country)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table des médailles
CREATE TABLE IF NOT EXISTS medals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  athlete_id INT NOT NULL,
  year INT NOT NULL,
  city VARCHAR(255),
  sport VARCHAR(255),
  event VARCHAR(255),
  medal VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE,
  INDEX idx_medals_year (year),
  INDEX idx_medals_sport (sport),
  INDEX idx_medals_medal (medal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table des résultats
CREATE TABLE IF NOT EXISTS results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  athlete_id INT NOT NULL,
  year INT NOT NULL,
  event VARCHAR(255) NOT NULL,
  rank INT,
  score FLOAT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE,
  INDEX idx_results_year (year),
  INDEX idx_results_event (event),
  INDEX idx_results_rank (rank)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table de synthèse pays/édition
CREATE TABLE IF NOT EXISTS country_year_summary (
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
  INDEX idx_cys_country (country_name),
  INDEX idx_cys_slug (slug_game)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table des prédictions IA
CREATE TABLE IF NOT EXISTS medal_predictions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  country_name VARCHAR(255) NOT NULL,
  slug_game VARCHAR(255) NOT NULL,
  model_name VARCHAR(100) NOT NULL,
  target VARCHAR(50) NOT NULL,
  predicted_value FLOAT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mp_country_slug (country_name, slug_game),
  INDEX idx_mp_model_target (model_name, target),
  UNIQUE KEY uniq_mp_country_slug_model_target (country_name, slug_game, model_name, target)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
