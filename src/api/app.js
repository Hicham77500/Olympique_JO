const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { testConnection, executeQuery, getStats } = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json());

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Route de test de l'API
app.get('/api', (req, res) => {
  res.json({
    message: '🏅 API Olympic Data Analytics',
    version: '1.0.0',
    status: 'active',
    endpoints: [
      'GET /api/athletes - Liste des athlètes',
      'GET /api/hosts - Pays organisateurs',
      'GET /api/medals - Données des médailles',
      'GET /api/results - Résultats avec filtres',
      'GET /api/stats - Statistiques générales'
    ]
  });
});

// Route pour obtenir les statistiques générales
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (error) {
    console.error('❌ Erreur /api/stats:', error);
    res.status(500).json({ error: 'Erreur lors du calcul des statistiques' });
  }
});

// Route pour obtenir tous les athlètes
app.get('/api/athletes', async (req, res) => {
  try {
    // Convertir explicitement en nombres et valider
    const limitValue = Math.min(Math.max(parseInt(req.query.limit, 10) || 1000, 1), 10000);
    const offsetValue = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    
    console.log('📊 /api/athletes appelé avec limit:', limitValue, 'offset:', offsetValue);
    
    // Utiliser des nombres littéraux dans la requête au lieu de paramètres pour LIMIT/OFFSET
    const query = `
      SELECT id, name, sex as gender, age, nationality 
      FROM athletes 
      ORDER BY name 
      LIMIT ${limitValue} OFFSET ${offsetValue}
    `;
    
    console.log('SQL Query:', query);
    
    const athletes = await executeQuery(query, []);
    console.log(`✅ Retour de ${athletes.length} athlètes`);
    res.json(athletes);
  } catch (error) {
    console.error('❌ Erreur /api/athletes:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Erreur lors de la récupération des athlètes', details: error.message });
  }
});

// Route pour obtenir les pays organisateurs
app.get('/api/hosts', async (req, res) => {
  try {
    const query = `
      SELECT year, season, city, country 
      FROM hosts 
      ORDER BY year DESC, season
    `;
    
    const hosts = await executeQuery(query);
    res.json(hosts);
  } catch (error) {
    console.error('❌ Erreur /api/hosts:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des pays organisateurs' });
  }
});

// Route pour obtenir les données des médailles
app.get('/api/medals', async (req, res) => {
  try {
    const query = `
      SELECT year, city, medal, COUNT(*) as count
      FROM medals 
      WHERE medal IS NOT NULL 
      GROUP BY year, city, medal 
      ORDER BY year DESC, medal
    `;
    
    const medals = await executeQuery(query);
    res.json(medals);
  } catch (error) {
    console.error('❌ Erreur /api/medals:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des médailles' });
  }
});

// Route pour obtenir les résultats avec filtres optionnels
app.get('/api/results', async (req, res) => {
  try {
    const {
      sport,
      year,
      gender,
      medal,
      country,
      limit = DEFAULT_LIMIT,
      offset = 0
    } = req.query;

    const parsedLimit = parseInt(limit, 10);
    if (Number.isNaN(parsedLimit)) {
      return res.status(400).json({
        error: 'INVALID_LIMIT',
        message: 'Le paramètre "limit" doit être un nombre entier.'
      });
    }

    const parsedOffset = parseInt(offset, 10);
    if (Number.isNaN(parsedOffset)) {
      return res.status(400).json({
        error: 'INVALID_OFFSET',
        message: 'Le paramètre "offset" doit être un nombre entier.'
      });
    }

    if (parsedLimit < 1 || parsedLimit > MAX_LIMIT) {
      return res.status(400).json({
        error: 'LIMIT_OUT_OF_RANGE',
        message: `La limite doit être comprise entre 1 et ${MAX_LIMIT}.`
      });
    }

    const limitValue = parsedLimit || DEFAULT_LIMIT;
    const offsetValue = Math.max(parsedOffset, 0);

    const countryFilters = Array.isArray(country)
      ? country
      : typeof country === 'string'
        ? country.split(',').map(item => item.trim()).filter(Boolean)
        : [];

    const uniqueCountries = [...new Set(countryFilters)].filter(Boolean);

    console.log('📊 /api/results called with:', {
      sport,
      year,
      gender,
      medal,
      countries: uniqueCountries,
      limit: limitValue,
      offset: offsetValue
    });

    let query = `
      SELECT
        m.id,
        m.athlete_id,
        a.name,
        a.sex AS gender,
        a.age,
        COALESCE(a.nationality, h.country) AS nationality,
        m.year,
        h.season,
        COALESCE(m.city, h.city) AS city,
        m.sport,
        m.event,
        m.medal
      FROM medals m
      JOIN athletes a ON m.athlete_id = a.id
      LEFT JOIN hosts h ON m.year = h.year
      WHERE 1 = 1
    `;

    const params = [];

    if (sport) {
      query += ' AND m.sport = ?';
      params.push(sport);
    }

    if (year) {
      const parsedYear = parseInt(year, 10);
      if (!Number.isNaN(parsedYear)) {
        query += ' AND m.year = ?';
        params.push(parsedYear);
      }
    }

    if (gender) {
      query += ' AND a.sex = ?';
      params.push(gender);
    }

    if (medal) {
      query += ' AND m.medal = ?';
      params.push(medal);
    }

    if (uniqueCountries.length > 0) {
      const placeholders = uniqueCountries.map(() => '?').join(', ');
      query += ` AND (a.nationality IN (${placeholders}) OR h.country IN (${placeholders}))`;
      params.push(...uniqueCountries, ...uniqueCountries);
    }

    query += ` ORDER BY m.year DESC, m.sport, a.name LIMIT ${limitValue} OFFSET ${offsetValue}`;

    console.log('SQL Query:', query);
    console.log('SQL Params:', params);

  const results = await executeQuery(query, params);
    console.log(`✅ Returned ${results.length} rows`);
    res.json(results);
  } catch (error) {
    console.error('❌ Error /api/results:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      error: 'Erreur lors de la récupération des résultats',
      details: error.message
    });
  }
});

// Route pour récupérer les prédictions de médailles
app.get('/api/predicted_medals', async (req, res) => {
  try {
    const {
      country,
      slug_game: slugGame,
      target,
      model,
      limit = DEFAULT_LIMIT,
      offset = 0,
      includeActual = 'false',
      yearMin,
      yearMax
    } = req.query;

    const parsedLimit = parseInt(limit, 10);
    if (Number.isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > MAX_LIMIT) {
      return res.status(400).json({
        error: 'INVALID_LIMIT',
        message: `Le paramètre "limit" doit être un entier entre 1 et ${MAX_LIMIT}.`
      });
    }

    const parsedOffset = parseInt(offset, 10);
    if (Number.isNaN(parsedOffset) || parsedOffset < 0) {
      return res.status(400).json({
        error: 'INVALID_OFFSET',
        message: 'Le paramètre "offset" doit être un entier positif.'
      });
    }

    const includeActualData = String(includeActual).toLowerCase() === 'true';

    let query = `
      SELECT
        mp.country_name AS country,
        mp.slug_game,
        mp.model_name,
        mp.target,
        mp.predicted_value,
        mp.created_at
        ${includeActualData ? ', cys.medals_total AS actual_medals' : ''}
      FROM medal_predictions mp
      ${includeActualData ? 'LEFT JOIN country_year_summary cys ON cys.country_name = mp.country_name AND cys.slug_game = mp.slug_game' : ''}
      WHERE 1 = 1
    `;

    const params = [];

    const countries = Array.isArray(country)
      ? country
      : typeof country === 'string'
        ? country.split(',').map(item => item.trim()).filter(Boolean)
        : [];

    if (countries.length > 0) {
      const placeholders = countries.map(() => '?').join(', ');
      query += ` AND mp.country_name IN (${placeholders})`;
      params.push(...countries);
    }

    if (slugGame) {
      query += ' AND mp.slug_game = ?';
      params.push(slugGame);
    }

    if (target) {
      query += ' AND mp.target = ?';
      params.push(target);
    }

    if (model) {
      query += ' AND mp.model_name = ?';
      params.push(model);
    }

    const parsedYearMin = parseInt(yearMin, 10);
    if (!Number.isNaN(parsedYearMin)) {
      query += ' AND CAST(RIGHT(mp.slug_game, 4) AS UNSIGNED) >= ?';
      params.push(parsedYearMin);
    }

    const parsedYearMax = parseInt(yearMax, 10);
    if (!Number.isNaN(parsedYearMax)) {
      query += ' AND CAST(RIGHT(mp.slug_game, 4) AS UNSIGNED) <= ?';
      params.push(parsedYearMax);
    }

    query += ' ORDER BY mp.created_at DESC, mp.country_name LIMIT ? OFFSET ?';
    params.push(parsedLimit, parsedOffset);

    const predictions = await executeQuery(query, params);
    res.json(predictions);
  } catch (error) {
    console.error('❌ Erreur /api/predicted_medals:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des prédictions' });
  }
});

// Route pour obtenir les sports disponibles
app.get('/api/sports', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT sport 
      FROM medals 
      WHERE sport IS NOT NULL 
      ORDER BY sport
    `;
    
    const sports = await executeQuery(query);
    res.json(sports.map(row => row.sport));
  } catch (error) {
    console.error('❌ Erreur /api/sports:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des sports' });
  }
});

app.get('/api/sports/top', async (req, res) => {
  try {
    const query = `
      SELECT sport, COUNT(*) AS participants
      FROM medals
      WHERE sport IS NOT NULL
      GROUP BY sport
      ORDER BY participants DESC
      LIMIT 10
    `;

    const sports = await executeQuery(query);
    res.json(sports);
  } catch (error) {
    console.error('❌ Erreur /api/sports/top:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des sports les plus populaires' });
  }
});

// Route pour obtenir les années disponibles
app.get('/api/years', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT year 
      FROM medals 
      WHERE year IS NOT NULL 
      ORDER BY year DESC
    `;
    
    const years = await executeQuery(query);
    res.json(years.map(row => row.year));
  } catch (error) {
    console.error('❌ Erreur /api/years:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des années' });
  }
});

// Route pour obtenir les pays disponibles
app.get('/api/countries', async (req, res) => {
  try {
    console.log('🌍 /api/countries - Requête reçue');
    
    const query = `
      SELECT DISTINCT nationality as country 
      FROM athletes 
      WHERE nationality IS NOT NULL 
      ORDER BY nationality
    `;
    
    console.log('📝 Exécution de la requête SQL:', query);
    const countries = await executeQuery(query);
    console.log(`✅ Nombre de pays trouvés dans la DB: ${countries.length}`);
    
    if (countries.length > 0) {
      console.log('📋 Premiers pays:', countries.slice(0, 10).map(row => row.country));
    } else {
      console.warn('⚠️  ATTENTION: Aucun pays trouvé dans la table athletes!');
    }
    
    const countryList = countries.map(row => row.country);
    console.log(`📤 Envoi de ${countryList.length} pays au frontend`);
    
    res.json(countryList);
  } catch (error) {
    console.error('❌ Erreur /api/countries:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Erreur lors de la récupération des pays', details: error.message });
  }
});

// Route pour obtenir les options de filtres
app.get('/api/filters', async (req, res) => {
  try {
    console.log('🎛️ /api/filters - Requête reçue');
    
    const [yearsRes, seasonsRes, countriesRes, sportsRes] = await Promise.all([
      executeQuery('SELECT DISTINCT year FROM medals WHERE year IS NOT NULL ORDER BY year'),
      executeQuery('SELECT DISTINCT season FROM hosts WHERE season IS NOT NULL ORDER BY season'),
      executeQuery('SELECT DISTINCT nationality as country FROM athletes WHERE nationality IS NOT NULL ORDER BY nationality'),
      executeQuery('SELECT DISTINCT sport FROM medals WHERE sport IS NOT NULL ORDER BY sport')
    ]);
    
    const filterOptions = {
      years: yearsRes.map(row => row.year),
      seasons: seasonsRes.map(row => row.season),
      countries: countriesRes.map(row => row.country),
      sports: sportsRes.map(row => row.sport),
      medalTypes: ['GOLD', 'SILVER', 'BRONZE']
    };
    
    console.log('✅ Options de filtres:', {
      years: filterOptions.years.length,
      seasons: filterOptions.seasons.length,
      countries: filterOptions.countries.length,
      sports: filterOptions.sports.length
    });
    
    res.json(filterOptions);
  } catch (error) {
    console.error('❌ Erreur /api/filters:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des options de filtres' });
  }
});

// Route pour obtenir les statistiques rapides avec filtres
app.get('/api/stats/quick', async (req, res) => {
  try {
    const filters = req.query;
    console.log('📊 /api/stats/quick - Filtres reçus:', filters);
    
    let whereConditions = ['1=1'];
    const params = [];
    
    // Appliquer les filtres
    if (filters.yearMin && filters.yearMax) {
      whereConditions.push('m.year BETWEEN ? AND ?');
      params.push(parseInt(filters.yearMin), parseInt(filters.yearMax));
    }
    
    if (filters.seasons) {
      const seasons = Array.isArray(filters.seasons) ? filters.seasons : filters.seasons.split(',');
      whereConditions.push(`h.season IN (${seasons.map(() => '?').join(', ')})`);
      params.push(...seasons);
    }
    
    if (filters.countries) {
      const countries = Array.isArray(filters.countries) ? filters.countries : filters.countries.split(',');
      whereConditions.push(`COALESCE(a.nationality, h.country) IN (${countries.map(() => '?').join(', ')})`);
      params.push(...countries);
    }
    
    if (filters.medalTypes) {
      const medalTypes = Array.isArray(filters.medalTypes) ? filters.medalTypes : filters.medalTypes.split(',');
      whereConditions.push(`m.medal IN (${medalTypes.map(() => '?').join(', ')})`);
      params.push(...medalTypes);
    }
    
    if (filters.sports) {
      const sports = Array.isArray(filters.sports) ? filters.sports : filters.sports.split(',');
      whereConditions.push(`m.sport IN (${sports.map(() => '?').join(', ')})`);
      params.push(...sports);
    }
    
    if (filters.gender) {
      whereConditions.push('a.sex = ?');
      params.push(filters.gender);
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    const query = `
      SELECT 
        COUNT(DISTINCT m.athlete_id) as totalAthletes,
        COUNT(*) as totalMedals,
        COUNT(DISTINCT COALESCE(a.nationality, h.country)) as totalCountries,
        COUNT(DISTINCT m.sport) as totalSports,
        SUM(CASE WHEN m.medal = 'GOLD' THEN 1 ELSE 0 END) as gold,
        SUM(CASE WHEN m.medal = 'SILVER' THEN 1 ELSE 0 END) as silver,
        SUM(CASE WHEN m.medal = 'BRONZE' THEN 1 ELSE 0 END) as bronze
      FROM medals m
      JOIN athletes a ON m.athlete_id = a.id
      LEFT JOIN hosts h ON m.year = h.year
      WHERE ${whereClause}
    `;
    
    console.log('📝 Requête SQL stats:', query);
    console.log('📝 Paramètres:', params);
    
    const [result] = await executeQuery(query, params);
    
    const stats = {
      totalAthletes: result.totalAthletes || 0,
      totalMedals: result.totalMedals || 0,
      totalCountries: result.totalCountries || 0,
      totalSports: result.totalSports || 0,
      medalDistribution: {
        Gold: result.gold || 0,
        Silver: result.silver || 0,
        Bronze: result.bronze || 0
      }
    };
    
    console.log('✅ Stats calculées:', stats);
    res.json(stats);
  } catch (error) {
    console.error('❌ Erreur /api/stats/quick:', error);
    res.status(500).json({ error: 'Erreur lors du calcul des statistiques rapides' });
  }
});

// Route pour obtenir les données filtrées avec agrégations
app.post('/api/data/filtered', async (req, res) => {
  try {
    const { filters = {}, aggregations = [], pagination = { limit: 50, offset: 0 } } = req.body;
    console.log('🔍 /api/data/filtered - Filtres reçus:', filters);
    console.log('📊 Agrégations demandées:', aggregations);
    
    let whereConditions = ['1=1'];
    const params = [];
    
    // Construire les conditions WHERE
    if (filters.yearMin && filters.yearMax) {
      whereConditions.push('m.year BETWEEN ? AND ?');
      params.push(filters.yearMin, filters.yearMax);
    }
    
    if (filters.seasons && filters.seasons.length > 0) {
      whereConditions.push(`h.season IN (${filters.seasons.map(() => '?').join(', ')})`);
      params.push(...filters.seasons);
    }
    
    if (filters.countries && filters.countries.length > 0) {
      whereConditions.push(`COALESCE(a.nationality, h.country) IN (${filters.countries.map(() => '?').join(', ')})`);
      params.push(...filters.countries);
    }
    
    if (filters.medalTypes && filters.medalTypes.length > 0) {
      whereConditions.push(`m.medal IN (${filters.medalTypes.map(() => '?').join(', ')})`);
      params.push(...filters.medalTypes);
    }
    
    if (filters.sports && filters.sports.length > 0) {
      whereConditions.push(`m.sport IN (${filters.sports.map(() => '?').join(', ')})`);
      params.push(...filters.sports);
    }
    
    if (filters.gender) {
      whereConditions.push('a.sex = ?');
      params.push(filters.gender);
    }
    
    if (filters.search) {
      whereConditions.push('(a.name LIKE ? OR m.sport LIKE ? OR COALESCE(a.nationality, h.country) LIKE ? OR m.city LIKE ?)');
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    // Requête principale pour les résultats
    const resultsQuery = `
      SELECT
        m.id,
        m.athlete_id,
        a.name,
        a.sex AS gender,
        a.age,
        COALESCE(a.nationality, h.country) AS nationality,
        m.year,
        h.season,
        COALESCE(m.city, h.city) AS city,
        m.sport,
        m.event,
        m.medal
      FROM medals m
      JOIN athletes a ON m.athlete_id = a.id
      LEFT JOIN hosts h ON m.year = h.year
      WHERE ${whereClause}
      ORDER BY m.year DESC, m.sport, a.name
      LIMIT ${pagination.limit} OFFSET ${pagination.offset}
    `;
    
    console.log('📝 Requête résultats:', resultsQuery);
    const results = await executeQuery(resultsQuery, params);
    
    // Calculer les agrégations demandées
    const aggregationsData = {};
    
    if (aggregations.includes('byCountry')) {
      const countryQuery = `
        SELECT 
          COALESCE(a.nationality, h.country) as country,
          COUNT(*) as total,
          SUM(CASE WHEN m.medal = 'GOLD' THEN 1 ELSE 0 END) as gold,
          SUM(CASE WHEN m.medal = 'SILVER' THEN 1 ELSE 0 END) as silver,
          SUM(CASE WHEN m.medal = 'BRONZE' THEN 1 ELSE 0 END) as bronze
        FROM medals m
        JOIN athletes a ON m.athlete_id = a.id
        LEFT JOIN hosts h ON m.year = h.year
        WHERE ${whereClause}
        GROUP BY COALESCE(a.nationality, h.country)
        ORDER BY total DESC
        LIMIT 20
      `;
      aggregationsData.byCountry = await executeQuery(countryQuery, params);
    }
    
    if (aggregations.includes('byYear')) {
      const yearQuery = `
        SELECT 
          m.year,
          COUNT(*) as medals
        FROM medals m
        JOIN athletes a ON m.athlete_id = a.id
        LEFT JOIN hosts h ON m.year = h.year
        WHERE ${whereClause}
        GROUP BY m.year
        ORDER BY m.year
      `;
      aggregationsData.byYear = await executeQuery(yearQuery, params);
    }
    
    if (aggregations.includes('byMedal')) {
      const medalQuery = `
        SELECT 
          m.medal,
          COUNT(*) as count
        FROM medals m
        JOIN athletes a ON m.athlete_id = a.id
        LEFT JOIN hosts h ON m.year = h.year
        WHERE ${whereClause}
        GROUP BY m.medal
        ORDER BY m.medal
      `;
      aggregationsData.byMedal = await executeQuery(medalQuery, params);
    }
    
    if (aggregations.includes('bySport')) {
      const sportQuery = `
        SELECT 
          m.sport,
          COUNT(*) as participants
        FROM medals m
        JOIN athletes a ON m.athlete_id = a.id
        LEFT JOIN hosts h ON m.year = h.year
        WHERE ${whereClause}
        GROUP BY m.sport
        ORDER BY participants DESC
        LIMIT 15
      `;
      aggregationsData.bySport = await executeQuery(sportQuery, params);
    }
    
    // Statistiques rapides
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT m.athlete_id) as totalAthletes,
        COUNT(*) as totalMedals,
        COUNT(DISTINCT COALESCE(a.nationality, h.country)) as totalCountries,
        COUNT(DISTINCT m.sport) as totalSports
      FROM medals m
      JOIN athletes a ON m.athlete_id = a.id
      LEFT JOIN hosts h ON m.year = h.year
      WHERE ${whereClause}
    `;
    
    const [stats] = await executeQuery(statsQuery, params);
    
    const response = {
      stats: {
        totalAthletes: stats.totalAthletes || 0,
        totalMedals: stats.totalMedals || 0,
        totalCountries: stats.totalCountries || 0,
        totalSports: stats.totalSports || 0
      },
      results,
      aggregations: aggregationsData,
      pagination: {
        ...pagination,
        total: results.length
      }
    };
    
    console.log(`✅ Réponse: ${results.length} résultats, ${Object.keys(aggregationsData).length} agrégations`);
    res.json(response);
  } catch (error) {
    console.error('❌ Erreur /api/data/filtered:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des données filtrées' });
  }
});

// Middleware de gestion des erreurs 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    availableRoutes: [
      'GET /api',
      'GET /api/stats',
      'GET /api/athletes',
      'GET /api/hosts',
      'GET /api/medals',
      'GET /api/results',
      'GET /api/sports',
      'GET /api/years',
      'GET /api/countries'
    ]
  });
});

// Middleware de gestion des erreurs globales
app.use((error, req, res, next) => {
  console.error('❌ Erreur serveur:', error);
  res.status(500).json({
    error: 'Erreur interne du serveur',
    message: error.message
  });
});

// Démarrage du serveur
async function startServer() {
  console.log('🚀 Démarrage du serveur API...');
  
  // Test de la connexion à la base de données
  const dbConnected = await testConnection();
  
  if (!dbConnected) {
    console.error('❌ Impossible de se connecter à la base de données. Arrêt du serveur.');
    process.exit(1);
  }
  
  // Démarrage du serveur HTTP
  app.listen(PORT, () => {
    console.log(`\n🎯 Serveur API démarré avec succès !`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🔗 API: http://localhost:${PORT}/api`);
    console.log(`📊 Test: http://localhost:${PORT}/api/athletes`);
    console.log(`\n📋 Routes disponibles:`);
    console.log(`   GET /api/stats - Statistiques générales`);
    console.log(`   GET /api/athletes - Liste des athlètes`);
    console.log(`   GET /api/hosts - Pays organisateurs`);
    console.log(`   GET /api/medals - Données des médailles`);
    console.log(`   GET /api/results - Résultats (avec filtres)`);
    console.log(`   GET /api/sports - Liste des sports`);
    console.log(`   GET /api/years - Liste des années`);
    console.log(`   GET /api/countries - Liste des pays`);
    console.log(`   GET /api/filters - Options de filtres`);
    console.log(`   GET /api/stats/quick - Statistiques rapides`);
    console.log(`   POST /api/data/filtered - Données filtrées avec agrégations`);
    console.log(`\n✅ Prêt à recevoir les requêtes du frontend React !`);
  });
}

// Gestion de l'arrêt propre du serveur
process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt du serveur API...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Arrêt du serveur API...');
  process.exit(0);
});

// Démarrage de l'application
if (require.main === module) {
  startServer().catch(error => {
    console.error('❌ Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  });
}

module.exports = app;
module.exports.startServer = startServer;