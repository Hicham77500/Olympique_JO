-- Script de diagnostic pour vérifier les données des pays

-- 1. Vérifier le nombre total d'athlètes
SELECT COUNT(*) as total_athletes FROM athletes;

-- 2. Vérifier les athlètes avec nationalité NULL
SELECT COUNT(*) as athletes_with_null_nationality 
FROM athletes 
WHERE nationality IS NULL;

-- 3. Vérifier les athlètes avec nationalité non NULL
SELECT COUNT(*) as athletes_with_nationality 
FROM athletes 
WHERE nationality IS NOT NULL;

-- 4. Compter le nombre de pays distincts
SELECT COUNT(DISTINCT nationality) as distinct_countries 
FROM athletes 
WHERE nationality IS NOT NULL;

-- 5. Lister les 20 premiers pays par ordre alphabétique
SELECT DISTINCT nationality as country 
FROM athletes 
WHERE nationality IS NOT NULL 
ORDER BY nationality
LIMIT 20;

-- 6. Compter les athlètes par pays (top 10)
SELECT nationality as country, COUNT(*) as athlete_count 
FROM athletes 
WHERE nationality IS NOT NULL 
GROUP BY nationality 
ORDER BY athlete_count DESC 
LIMIT 10;

-- 7. Vérifier la structure de la table athletes
DESCRIBE athletes;

-- 8. Afficher quelques exemples d'athlètes avec leur nationalité
SELECT id, name, nationality, sex, age 
FROM athletes 
WHERE nationality IS NOT NULL 
LIMIT 10;
