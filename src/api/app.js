const express = require('express');
const cors = require('cors');
const path = require('path');
const fsPromises = require('fs/promises');
const fs = require('fs');
require('dotenv').config();

const { testConnection, executeQuery, getStats } = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

// Dossiers projet
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const REPORTS_DIR = path.join(PROJECT_ROOT, 'reports');
const FIGURES_DIR = path.join(REPORTS_DIR, 'figures');
const SCORES_DIR = REPORTS_DIR;
const MODELS_METADATA_PATHS = [
  path.join(PROJECT_ROOT, 'reports', 'models_metadata.json'),
  path.join(PROJECT_ROOT, 'data', 'demo', 'models_metadata.json')
];
const PREDICTIONS_CSV_PATH = path.join(REPORTS_DIR, 'medal_predictions.csv');
const COUNTRY_SUMMARY_CSV_PATH = path.join(PROJECT_ROOT, 'data', 'processed', 'country_year_summary.csv');

// Mode démo : sert les réponses depuis data/demo lorsqu'on exporte DEMO_MODE=true
const IS_DEMO_MODE = String(process.env.DEMO_MODE || '').toLowerCase() === 'true';
const DEMO_DATA_DIR = path.join(PROJECT_ROOT, 'data', 'demo');

const loadDemoJson = (fileName, options = {}) => {
  const { expectArray = false, fallbackValue = [] } = options;
  const filePath = path.join(DEMO_DATA_DIR, fileName);

  try {
    const rawBuffer = fs.readFileSync(filePath);
    let raw = rawBuffer.toString('utf-8').replace(/^\uFEFF/, '').trim();

    if (!raw) {
      console.warn(`[DEMO_MODE] ${fileName} est vide.`);
      return Array.isArray(fallbackValue) ? [...fallbackValue] : fallbackValue;
    }

    let parsed = JSON.parse(raw);

    if (typeof parsed === 'string') {
      parsed = JSON.parse(parsed);
    }

    if (expectArray) {
      if (Array.isArray(parsed)) {
        return parsed;
      }

      if (parsed && Array.isArray(parsed.data)) {
        return parsed.data;
      }

      console.warn(`[DEMO_MODE] ${fileName} ne contient pas un tableau JSON valide.`);
      return Array.isArray(fallbackValue) ? [...fallbackValue] : fallbackValue;
    }

    return parsed ?? (Array.isArray(fallbackValue) ? [...fallbackValue] : fallbackValue);
  } catch (error) {
    console.error(`[DEMO_MODE] Impossible de charger ${fileName}:`, error.message);
    throw error;
  }
};

const parseArrayParam = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

const applyDemoFilters = (dataset, options = {}) => {
  const {
    yearMin,
    yearMax,
    seasons = [],
    countries = [],
    medalTypes = [],
    sports = [],
    gender,
    search,
    yearEquals,
    sportEquals,
    medalEquals
  } = options;

  const normalizedSearch = search ? String(search).toLowerCase() : null;
  const normalizedYearMin = (typeof yearMin === 'number' && !Number.isNaN(yearMin)) ? yearMin : undefined;
  const normalizedYearMax = (typeof yearMax === 'number' && !Number.isNaN(yearMax)) ? yearMax : undefined;
  const normalizedYearEquals = (typeof yearEquals === 'number' && !Number.isNaN(yearEquals)) ? yearEquals : undefined;

  return dataset.filter((row) => {
    if (typeof normalizedYearEquals === 'number' && row.year !== normalizedYearEquals) {
      return false;
    }
    if (typeof normalizedYearMin === 'number' && row.year < normalizedYearMin) {
      return false;
    }
    if (typeof normalizedYearMax === 'number' && row.year > normalizedYearMax) {
      return false;
    }
    if (seasons.length > 0 && !seasons.includes(row.season)) {
      return false;
    }
    if (countries.length > 0) {
      const countryCandidates = [row.country, row.nationality].filter(Boolean);
      const hasMatch = countryCandidates.some((value) => countries.includes(value));
      if (!hasMatch) {
        return false;
      }
    }
    if (medalTypes.length > 0 && !medalTypes.includes(row.medal)) {
      return false;
    }
    if (sports.length > 0 && !sports.includes(row.sport)) {
      return false;
    }
    if (sportEquals && row.sport !== sportEquals) {
      return false;
    }
    if (medalEquals && row.medal !== medalEquals) {
      return false;
    }
    if (gender && row.gender !== gender) {
      return false;
    }
    if (normalizedSearch) {
      const haystacks = [row.name, row.sport, row.nationality, row.country, row.city]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      const found = haystacks.some((value) => value.includes(normalizedSearch));
      if (!found) {
        return false;
      }
    }

    return true;
  });
};

const paginateArray = (items, limit, offset) => items.slice(offset, offset + limit);

const pathExists = async (targetPath) => {
  try {
    await fsPromises.access(targetPath, fs.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
};

const parseCsvContent = (content) => {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return [];
  }

  const [headerLine, ...dataLines] = lines;
  const headers = headerLine.split(',').map((column) => column.trim());

  return dataLines.map((line) => {
    const values = line.split(',');
    return headers.reduce((acc, header, index) => {
      const rawValue = values[index] !== undefined ? values[index].trim() : '';
      acc[header] = rawValue;
      return acc;
    }, {});
  });
};

const readCsvRows = async (filePath) => {
  const exists = await pathExists(filePath);
  if (!exists) {
    return [];
  }
  const content = await fsPromises.readFile(filePath, 'utf-8');
  return parseCsvContent(content);
};

const buildReportsStaticUrl = (relativePath) => `/reports/${relativePath.replace(/\\/g, '/')}`;

const enrichPredictionsWithActuals = (predictions, actualsMap) => (
  predictions.map((row) => {
    const key = `${row.country}|${row.slug_game}`;
    const actualValue = actualsMap.get(key);
    return {
      ...row,
      actual_medals: actualValue !== undefined ? actualValue : row.actual_medals
    };
  })
);

const loadPredictionsFallback = async (filters = {}, options = {}) => {
  const {
    includeActualData = false,
    limit = DEFAULT_LIMIT,
    offset = 0,
    page
  } = options;

  const normalizedLimit = Math.min(Math.max(parseInt(limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const requestedOffset = Math.max(parseInt(offset, 10) || 0, 0);
  const requestedPage = Number.isInteger(page) && page > 0 ? page : undefined;

  const csvRows = await readCsvRows(PREDICTIONS_CSV_PATH);

  if (csvRows.length === 0) {
    console.warn('⚠️ Aucun fichier de prédiction CSV trouvé pour le fallback.');
    return {
      predictions: [],
      total: 0,
      page: 0,
      pageSize: normalizedLimit,
      totalPages: 0,
      limit: normalizedLimit,
      offset: 0,
      hasNext: false,
      hasPrevious: false
    };
  }

  const countriesFilter = Array.isArray(filters.country)
    ? filters.country
    : typeof filters.country === 'string'
      ? filters.country.split(',').map((value) => value.trim()).filter(Boolean)
      : [];

  const normalizedFilter = {
    countries: countriesFilter,
    slugGame: filters.slug_game,
    target: filters.target,
    model: filters.model,
    yearMin: filters.yearMin ? parseInt(filters.yearMin, 10) : undefined,
    yearMax: filters.yearMax ? parseInt(filters.yearMax, 10) : undefined
  };

  let predictions = csvRows.map((row) => {
    const country = row.country_name || row.country;
    const slugGame = row.slug_game;
    const predictedValue = Number(row.predicted_value ?? row.predicted_medals ?? row.predicted_medals_total ?? row.prediction ?? 0);

    return {
      country,
      slug_game: slugGame,
      model_name: row.model_name || filters.model || 'csv_regression_model',
      target: row.target || 'medals_total',
      predicted_value: predictedValue,
      created_at: row.created_at || null
    };
  });

  if (normalizedFilter.countries.length > 0) {
    predictions = predictions.filter((item) => normalizedFilter.countries.includes(item.country));
  }

  if (normalizedFilter.slugGame) {
    predictions = predictions.filter((item) => item.slug_game === normalizedFilter.slugGame);
  }

  if (normalizedFilter.target) {
    predictions = predictions.filter((item) => item.target === normalizedFilter.target);
  }

  if (normalizedFilter.model) {
    predictions = predictions.filter((item) => item.model_name === normalizedFilter.model);
  }

  if (Number.isInteger(normalizedFilter.yearMin)) {
    predictions = predictions.filter((item) => {
      const editionYear = parseInt(String(item.slug_game).slice(-4), 10);
      return Number.isInteger(editionYear) ? editionYear >= normalizedFilter.yearMin : true;
    });
  }

  if (Number.isInteger(normalizedFilter.yearMax)) {
    predictions = predictions.filter((item) => {
      const editionYear = parseInt(String(item.slug_game).slice(-4), 10);
      return Number.isInteger(editionYear) ? editionYear <= normalizedFilter.yearMax : true;
    });
  }

  if (includeActualData) {
    const actualRows = await readCsvRows(COUNTRY_SUMMARY_CSV_PATH);
    const actualsMap = new Map();
    actualRows.forEach((row) => {
      const key = `${row.country_name || row.country}|${row.slug_game}`;
      const medalsTotal = row.medals_total !== undefined ? Number(row.medals_total) : undefined;
      if (!Number.isNaN(medalsTotal)) {
        actualsMap.set(key, medalsTotal);
      }
    });
    predictions = enrichPredictionsWithActuals(predictions, actualsMap);
  }

  predictions.sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    if (timeA !== timeB) {
      return timeB - timeA;
    }
    return String(a.country).localeCompare(String(b.country));
  });

  const total = predictions.length;
  const totalPages = normalizedLimit > 0 ? Math.ceil(total / normalizedLimit) : 0;
  const computedPage = requestedPage
    || (total === 0 ? 0 : Math.floor(requestedOffset / normalizedLimit) + 1);
  const currentPage = total === 0
    ? 0
    : Math.min(Math.max(computedPage, 1), Math.max(totalPages, 1));
  const effectiveOffset = total === 0
    ? 0
    : Math.min((currentPage - 1) * normalizedLimit, Math.max(total - normalizedLimit, 0));
  const slice = predictions.slice(effectiveOffset, effectiveOffset + normalizedLimit).map((item) => {
    if (!includeActualData) {
      const { actual_medals, ...rest } = item;
      return rest;
    }
    return {
      ...item,
      actual_medals: item.actual_medals !== undefined ? item.actual_medals : null
    };
  });

  return {
    predictions: slice,
    total,
    page: currentPage,
    pageSize: normalizedLimit,
    totalPages,
    limit: normalizedLimit,
    offset: effectiveOffset,
    hasNext: total > 0 && currentPage < totalPages,
    hasPrevious: total > 0 && currentPage > 1
  };
};

const listFigureAssets = async () => {
  if (!(await pathExists(FIGURES_DIR))) {
    console.warn('⚠️ Dossier figures introuvable:', FIGURES_DIR);
    return [];
  }

  const entries = await fsPromises.readdir(FIGURES_DIR, { withFileTypes: true });
  const pictures = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.png'));

  const assets = await Promise.all(pictures.map(async (entry) => {
    const absolutePath = path.join(FIGURES_DIR, entry.name);
    const stats = await fsPromises.stat(absolutePath);
    return {
      filename: entry.name,
      label: entry.name.replace(/[-_]/g, ' ').replace(/\.png$/i, ''),
      url: buildReportsStaticUrl(path.join('figures', entry.name)),
      size: stats.size,
      modifiedAt: stats.mtime
    };
  }));

  return assets.sort((a, b) => b.modifiedAt - a.modifiedAt);
};

const listScoreFiles = async () => {
  if (!(await pathExists(SCORES_DIR))) {
    return [];
  }

  const entries = await fsPromises.readdir(SCORES_DIR, { withFileTypes: true });
  const csvFiles = entries.filter((entry) => {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.csv')) {
      return false;
    }
    const lowerName = entry.name.toLowerCase();
    return lowerName.includes('score') || lowerName.includes('metric');
  });

  const datasets = await Promise.all(csvFiles.map(async (entry) => {
    const absolutePath = path.join(SCORES_DIR, entry.name);
    const stats = await fsPromises.stat(absolutePath);
    const rows = await readCsvRows(absolutePath);
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    return {
      filename: entry.name,
      url: buildReportsStaticUrl(entry.name),
      size: stats.size,
      modifiedAt: stats.mtime,
      headers,
      rows
    };
  }));

  return datasets.sort((a, b) => b.modifiedAt - a.modifiedAt);
};

const loadModelsMetadata = async () => {
  if (IS_DEMO_MODE) {
    try {
  return loadDemoJson('models_metadata.json', { expectArray: true });
    } catch (error) {
      console.warn('[DEMO_MODE] Impossible de charger models_metadata.json:', error.message);
      return [];
    }
  }

  for (const candidatePath of MODELS_METADATA_PATHS) {
    if (await pathExists(candidatePath)) {
      try {
        const raw = await fsPromises.readFile(candidatePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
        console.warn(`[loadModelsMetadata] Le fichier ${candidatePath} ne contient pas un tableau JSON valide.`);
      } catch (error) {
        console.error(`[loadModelsMetadata] Erreur de lecture ${candidatePath}:`, error.message);
      }
    }
  }

  return [];
};

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json());
app.use('/reports', express.static(path.join(PROJECT_ROOT, 'reports')));

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
  if (IS_DEMO_MODE) {
    try {
  const athletes = loadDemoJson('athletes.json', { expectArray: true });
  const results = loadDemoJson('results.json', { expectArray: true });
      const uniqueSports = new Set(results.map((row) => row.sport)).size;

      return res.json({
        total_athletes: athletes.length,
        total_results: results.length,
        total_medals: results.length,
        total_sports: uniqueSports
      });
    } catch (error) {
      console.error('[DEMO_MODE] Erreur /api/stats:', error);
      return res.status(500).json({ error: 'Erreur lors du chargement des statistiques en mode démo' });
    }
  }

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

    if (IS_DEMO_MODE) {
  const athletes = loadDemoJson('athletes.json', { expectArray: true });
      const slice = paginateArray(athletes, limitValue, offsetValue);
      console.log(`[DEMO_MODE] Retour de ${slice.length} athlètes depuis data/demo/athletes.json.`);
      return res.json(slice);
    }
    
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
    if (IS_DEMO_MODE) {
  const hosts = loadDemoJson('hosts.json', { expectArray: true });
      console.log(`[DEMO_MODE] Retour de ${hosts.length} entrées depuis data/demo/hosts.json.`);
      return res.json(hosts);
    }

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
    if (IS_DEMO_MODE) {
  const results = loadDemoJson('results.json', { expectArray: true });
      const summaryMap = new Map();
      const medalPriority = { GOLD: 0, SILVER: 1, BRONZE: 2 };

      results.forEach((row) => {
        if (!row.medal) {
          return;
        }
        const key = `${row.year}|${row.city}|${row.medal}`;
        const current = summaryMap.get(key) || { year: row.year, city: row.city, medal: row.medal, count: 0 };
        current.count += 1;
        summaryMap.set(key, current);
      });

      const medals = Array.from(summaryMap.values()).sort((a, b) => {
        if (a.year !== b.year) {
          return b.year - a.year;
        }
        if (a.city !== b.city) {
          return a.city.localeCompare(b.city);
        }
        const orderA = medalPriority[a.medal] ?? 99;
        const orderB = medalPriority[b.medal] ?? 99;
        return orderA - orderB;
      });

      console.log(`[DEMO_MODE] /api/medals renvoie ${medals.length} lignes agrégées.`);
      return res.json(medals);
    }

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
    if (Number.isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > MAX_LIMIT) {
      return res.status(400).json({
        error: 'INVALID_LIMIT',
        message: `Le paramètre "limit" doit être un entier compris entre 1 et ${MAX_LIMIT}.`
      });
    }

    const parsedOffset = parseInt(offset, 10);
    if (Number.isNaN(parsedOffset) || parsedOffset < 0) {
      return res.status(400).json({
        error: 'INVALID_OFFSET',
        message: 'Le paramètre "offset" doit être un entier positif.'
      });
    }

    const pageParam = req.query.page ? parseInt(req.query.page, 10) : undefined;
    const requestedPage = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : undefined;
    const requestedOffset = requestedPage ? (requestedPage - 1) * parsedLimit : parsedOffset;

    const countryFilters = Array.isArray(country)
      ? country
      : typeof country === 'string'
        ? country.split(',').map((item) => item.trim()).filter(Boolean)
        : [];

    const uniqueCountries = [...new Set(countryFilters)].filter(Boolean);
    const parsedYear = Number.parseInt(year, 10);
    const normalizedYear = Number.isNaN(parsedYear) ? undefined : parsedYear;

    console.log('📊 /api/results called with:', {
      sport,
      year: normalizedYear,
      gender,
      medal,
      countries: uniqueCountries,
      limit: parsedLimit,
      offset: requestedOffset,
      page: requestedPage
    });

    if (IS_DEMO_MODE) {
      const resultsData = loadDemoJson('results.json', { expectArray: true });
      const filtered = applyDemoFilters(resultsData, {
        sportEquals: sport || undefined,
        yearEquals: normalizedYear,
        gender: gender || undefined,
        medalEquals: medal || undefined,
        countries: uniqueCountries
      });

      const total = filtered.length;
      const totalPages = parsedLimit > 0 ? Math.ceil(total / parsedLimit) : 0;
      const computedPage = requestedPage || (total === 0 ? 0 : Math.floor(requestedOffset / parsedLimit) + 1);
      const currentPage = total === 0
        ? 0
        : Math.min(Math.max(computedPage, 1), Math.max(totalPages, 1));
      const effectiveOffset = total === 0
        ? 0
        : Math.min((currentPage - 1) * parsedLimit, Math.max(total - parsedLimit, 0));

      const paginated = filtered.slice(effectiveOffset, effectiveOffset + parsedLimit);
      console.log(`[DEMO_MODE] /api/results -> ${paginated.length} éléments renvoyés (total filtré: ${filtered.length}).`);
      return res.json({
        results: paginated,
        total,
        page: currentPage,
        pageSize: parsedLimit,
        totalPages,
        limit: parsedLimit,
        offset: effectiveOffset,
        hasNext: total > 0 && currentPage < totalPages,
        hasPrevious: total > 0 && currentPage > 1
      });
    }

    const conditions = ['1 = 1'];
    const params = [];

    if (sport) {
      conditions.push('m.sport = ?');
      params.push(sport);
    }

    if (typeof normalizedYear === 'number') {
      conditions.push('m.year = ?');
      params.push(normalizedYear);
    }

    if (gender) {
      conditions.push('a.sex = ?');
      params.push(gender);
    }

    if (medal) {
      conditions.push('m.medal = ?');
      params.push(medal);
    }

    if (uniqueCountries.length > 0) {
      const placeholders = uniqueCountries.map(() => '?').join(', ');
      conditions.push(`(a.nationality IN (${placeholders}) OR h.country IN (${placeholders}))`);
      params.push(...uniqueCountries, ...uniqueCountries);
    }

    const whereClause = conditions.join(' AND ');
    const fromClause = `
      FROM medals m
      JOIN athletes a ON m.athlete_id = a.id
      LEFT JOIN hosts h ON m.year = h.year
      WHERE ${whereClause}
    `;

    const countQuery = `SELECT COUNT(*) AS total ${fromClause}`;
    const countRows = await executeQuery(countQuery, [...params]);
    const total = countRows?.[0]?.total ? Number(countRows[0].total) : 0;

    const totalPages = parsedLimit > 0 ? Math.ceil(total / parsedLimit) : 0;
    const computedPage = requestedPage || (total === 0 ? 0 : Math.floor(requestedOffset / parsedLimit) + 1);
    const currentPage = total === 0
      ? 0
      : Math.min(Math.max(computedPage, 1), Math.max(totalPages, 1));
    const effectiveOffset = total === 0
      ? 0
      : Math.min((currentPage - 1) * parsedLimit, Math.max(total - parsedLimit, 0));

    const dataQuery = `
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
      ${fromClause}
      ORDER BY m.year DESC, m.sport, a.name
      LIMIT ${parsedLimit} OFFSET ${effectiveOffset}
    `;

    console.log('SQL Query:', dataQuery);
    console.log('SQL Params:', params);

    const results = await executeQuery(dataQuery, [...params]);
    console.log(`✅ /api/results -> ${results.length} lignes (page ${currentPage || 0}/${totalPages || 0})`);

    res.json({
      results,
      total,
      page: currentPage,
      pageSize: parsedLimit,
      totalPages,
      limit: parsedLimit,
      offset: effectiveOffset,
      hasNext: total > 0 && currentPage < totalPages,
      hasPrevious: total > 0 && currentPage > 1
    });
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
    const pageParam = req.query.page ? parseInt(req.query.page, 10) : undefined;
    const requestedPage = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : undefined;
    const requestedOffset = Number.isInteger(pageParam) && pageParam > 0
      ? (pageParam - 1) * parsedLimit
      : parsedOffset;

    const countries = parseArrayParam(country);
    const normalizedCountries = [...new Set(countries)].filter(Boolean);

    if (IS_DEMO_MODE) {
      const predictionsData = loadDemoJson('medal_predictions_demo.json', { expectArray: true });
      let filtered = predictionsData;

      if (normalizedCountries.length > 0) {
        filtered = filtered.filter((item) => normalizedCountries.includes(item.country));
      }

      if (slugGame) {
        filtered = filtered.filter((item) => item.slug_game === slugGame);
      }

      if (target) {
        filtered = filtered.filter((item) => item.target === target);
      }

      if (model) {
        filtered = filtered.filter((item) => item.model_name === model);
      }

  const parsedYearMin = Number.parseInt(yearMin, 10);
  const parsedYearMax = Number.parseInt(yearMax, 10);

      const getRecordYear = (record) => {
        if (record?.year !== undefined) {
          const directYear = parseInt(record.year, 10);
          if (!Number.isNaN(directYear)) {
            return directYear;
          }
        }

        const slugPart = String(record?.slug_game || '')
          .match(/(\d{4})/g);
        if (slugPart && slugPart.length > 0) {
          const candidate = parseInt(slugPart[slugPart.length - 1], 10);
          if (!Number.isNaN(candidate)) {
            return candidate;
          }
        }

        return undefined;
      };

      if (!Number.isNaN(parsedYearMin)) {
        filtered = filtered.filter((item) => {
          const yearValue = getRecordYear(item);
          return yearValue === undefined ? true : yearValue >= parsedYearMin;
        });
      }

      if (!Number.isNaN(parsedYearMax)) {
        filtered = filtered.filter((item) => {
          const yearValue = getRecordYear(item);
          return yearValue === undefined ? true : yearValue <= parsedYearMax;
        });
      }

      filtered.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (dateA !== dateB) {
          return dateB - dateA;
        }
        return String(a.country).localeCompare(String(b.country));
      });

      const total = filtered.length;
      const totalPages = parsedLimit > 0 ? Math.ceil(total / parsedLimit) : 0;
      const computedPage = requestedPage || (total === 0 ? 0 : Math.floor(requestedOffset / parsedLimit) + 1);
      const currentPage = total === 0
        ? 0
        : Math.min(Math.max(computedPage, 1), Math.max(totalPages, 1));
      const effectiveOffset = total === 0
        ? 0
        : Math.min((currentPage - 1) * parsedLimit, Math.max(total - parsedLimit, 0));

      const paginated = filtered.slice(effectiveOffset, effectiveOffset + parsedLimit)
        .map((item) => {
          const record = { ...item };
          if (!includeActualData) {
            delete record.actual_medals;
          } else if (record.actual_medals === undefined) {
            record.actual_medals = null;
          }
          return record;
        });

      console.log(`[DEMO_MODE] /api/predicted_medals -> ${paginated.length} entrées renvoyées.`);
      return res.json({
        predictions: paginated,
        total,
        page: currentPage,
        pageSize: parsedLimit,
        totalPages,
        limit: parsedLimit,
        offset: effectiveOffset,
        hasNext: total > 0 && currentPage < totalPages,
        hasPrevious: total > 0 && currentPage > 1
      });
    }

    const conditions = ['1 = 1'];
    const params = [];

    if (normalizedCountries.length > 0) {
      const placeholders = normalizedCountries.map(() => '?').join(', ');
      conditions.push(`mp.country_name IN (${placeholders})`);
      params.push(...normalizedCountries);
    }

    if (slugGame) {
      conditions.push('mp.slug_game = ?');
      params.push(slugGame);
    }

    if (target) {
      conditions.push('mp.target = ?');
      params.push(target);
    }

    if (model) {
      conditions.push('mp.model_name = ?');
      params.push(model);
    }

    const parsedYearMin = parseInt(yearMin, 10);
    if (!Number.isNaN(parsedYearMin)) {
      conditions.push('CAST(RIGHT(mp.slug_game, 4) AS UNSIGNED) >= ?');
      params.push(parsedYearMin);
    }

    const parsedYearMax = parseInt(yearMax, 10);
    if (!Number.isNaN(parsedYearMax)) {
      conditions.push('CAST(RIGHT(mp.slug_game, 4) AS UNSIGNED) <= ?');
      params.push(parsedYearMax);
    }

    const whereClause = conditions.join(' AND ');
    const joinClause = includeActualData
      ? 'LEFT JOIN country_year_summary cys ON cys.country_name = mp.country_name AND cys.slug_game = mp.slug_game'
      : '';

    const fromClause = `FROM medal_predictions mp ${joinClause} WHERE ${whereClause}`;

    let total = 0;
    try {
      const countQuery = `SELECT COUNT(*) AS total ${fromClause}`;
      const countRows = await executeQuery(countQuery, [...params]);
      total = countRows?.[0]?.total ? Number(countRows[0].total) : 0;
    } catch (countError) {
      if (countError?.code === 'ER_NO_SUCH_TABLE') {
        console.warn('⚠️ Table medal_predictions introuvable, bascule sur le fallback CSV.', countError.message);
        const fallback = await loadPredictionsFallback({
          country,
          slug_game: slugGame,
          target,
          model,
          yearMin,
          yearMax
        }, {
          includeActualData,
          limit: parsedLimit,
          offset: requestedOffset,
          page: requestedPage
        });
        return res.json(fallback);
      }
      throw countError;
    }

    const totalPages = parsedLimit > 0 ? Math.ceil(total / parsedLimit) : 0;
    const computedPage = requestedPage || (total === 0 ? 0 : Math.floor(requestedOffset / parsedLimit) + 1);
    const currentPage = total === 0
      ? 0
      : Math.min(Math.max(computedPage, 1), Math.max(totalPages, 1));
    const effectiveOffset = total === 0
      ? 0
      : Math.min((currentPage - 1) * parsedLimit, Math.max(total - parsedLimit, 0));

    const selectFields = `
      SELECT
        mp.country_name AS country,
        mp.slug_game,
        mp.model_name,
        mp.target,
        mp.predicted_value,
        mp.created_at
        ${includeActualData ? ', cys.medals_total AS actual_medals' : ''}
    `;

    const dataQuery = `
      ${selectFields}
      ${fromClause}
      ORDER BY mp.created_at DESC, mp.country_name
      LIMIT ${parsedLimit} OFFSET ${effectiveOffset}
    `;

    let rows;
    try {
      rows = await executeQuery(dataQuery, [...params]);
    } catch (dataError) {
      if (dataError?.code === 'ER_NO_SUCH_TABLE') {
        console.warn('⚠️ Table medal_predictions introuvable à la lecture, bascule sur le fallback CSV.', dataError.message);
        const fallback = await loadPredictionsFallback({
          country,
          slug_game: slugGame,
          target,
          model,
          yearMin,
          yearMax
        }, {
          includeActualData,
          limit: parsedLimit,
          offset: requestedOffset,
          page: requestedPage
        });
        return res.json(fallback);
      }
      throw dataError;
    }

    const predictions = rows.map((row) => {
      const record = { ...row };
      if (!includeActualData) {
        delete record.actual_medals;
      } else if (record.actual_medals === undefined || record.actual_medals === null) {
        record.actual_medals = null;
      } else {
        record.actual_medals = Number(record.actual_medals);
      }
      return record;
    });

    res.json({
      predictions,
      total,
      page: currentPage,
      pageSize: parsedLimit,
      totalPages,
      limit: parsedLimit,
      offset: effectiveOffset,
      hasNext: total > 0 && currentPage < totalPages,
      hasPrevious: total > 0 && currentPage > 1
    });
  } catch (error) {
    console.error('❌ Erreur /api/predicted_medals:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des prédictions',
      details: error?.message
    });
  }
});

app.get('/api/reports/figures', async (req, res) => {
  try {
    const figures = await listFigureAssets();
    res.json(figures);
  } catch (error) {
    console.error('❌ Erreur /api/reports/figures:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des figures',
      details: error?.message
    });
  }
});

app.get('/api/reports/scores', async (req, res) => {
  try {
    const scores = await listScoreFiles();
    res.json(scores);
  } catch (error) {
    console.error('❌ Erreur /api/reports/scores:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des scores',
      details: error?.message
    });
  }
});

app.get('/api/models', async (req, res) => {
  try {
    const [metadata, scoreFiles] = await Promise.all([
      loadModelsMetadata(),
      listScoreFiles()
    ]);

    const models = (metadata || []).map((model) => {
      if (!model || typeof model !== 'object') {
        return null;
      }

      const normalizedName = String(model.modelName || '').toLowerCase();
      const relatedScores = scoreFiles.filter((file) => {
        const filename = file.filename.toLowerCase();
        if (normalizedName && filename.includes(normalizedName)) {
          return true;
        }
        if (model.task && filename.includes(String(model.task).toLowerCase())) {
          return true;
        }
        return false;
      }).map((file) => ({
        filename: file.filename,
        url: file.url,
        headers: file.headers,
        rows: file.rows,
        size: file.size,
        modifiedAt: file.modifiedAt
      }));

      return {
        modelName: model.modelName || 'Modèle ML',
        task: model.task || 'n/a',
        metrics: model.metrics || {},
        bestParams: model.bestParams || {},
        description: model.description || '',
        image: model.image || null,
        scores: relatedScores
      };
    }).filter(Boolean);

    res.json({
      models,
      count: models.length,
      availableScores: scoreFiles.map((file) => ({
        filename: file.filename,
        url: file.url,
        headers: file.headers,
        rows: file.rows,
        size: file.size,
        modifiedAt: file.modifiedAt
      }))
    });
  } catch (error) {
    console.error('❌ Erreur /api/models:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des modèles',
      details: error?.message
    });
  }
});

// Route pour obtenir les sports disponibles
app.get('/api/sports', async (req, res) => {
  try {
    if (IS_DEMO_MODE) {
  const results = loadDemoJson('results.json', { expectArray: true });
      const sports = Array.from(new Set(results
        .map((row) => row.sport)
        .filter(Boolean)))
        .sort((a, b) => a.localeCompare(b));

      console.log(`[DEMO_MODE] /api/sports -> ${sports.length} sports distincts.`);
      return res.json(sports);
    }

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
    if (IS_DEMO_MODE) {
  const results = loadDemoJson('results.json', { expectArray: true });
      const tally = new Map();

      results.forEach((row) => {
        if (!row.sport) {
          return;
        }
        const current = tally.get(row.sport) || 0;
        tally.set(row.sport, current + 1);
      });

      const sports = Array.from(tally.entries())
        .map(([sport, participants]) => ({ sport, participants }))
        .sort((a, b) => b.participants - a.participants)
        .slice(0, 10);

      console.log(`[DEMO_MODE] /api/sports/top -> ${sports.length} entrées.`);
      return res.json(sports);
    }

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
    if (IS_DEMO_MODE) {
  const results = loadDemoJson('results.json', { expectArray: true });
      const years = Array.from(new Set(results
        .map((row) => row.year)
        .filter((value) => typeof value === 'number')))
        .sort((a, b) => b - a);

      console.log(`[DEMO_MODE] /api/years -> ${years.length} années.`);
      return res.json(years);
    }

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
    
    if (IS_DEMO_MODE) {
  const athletes = loadDemoJson('athletes.json', { expectArray: true });
      const countries = Array.from(new Set(athletes
        .map((row) => row.nationality)
        .filter(Boolean)))
        .sort((a, b) => a.localeCompare(b));

      console.log(`[DEMO_MODE] /api/countries -> ${countries.length} pays.`);
      res.json(countries);
      return;
    }

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
    
    if (IS_DEMO_MODE) {
  const results = loadDemoJson('results.json', { expectArray: true });
  const athletes = loadDemoJson('athletes.json', { expectArray: true });

      const years = Array.from(new Set(results
        .map((row) => row.year)
        .filter((value) => typeof value === 'number')))
        .sort((a, b) => a - b);

      const seasons = Array.from(new Set(results
        .map((row) => row.season)
        .filter(Boolean)))
        .sort((a, b) => a.localeCompare(b));

      const countries = Array.from(new Set(athletes
        .map((row) => row.nationality)
        .filter(Boolean)))
        .sort((a, b) => a.localeCompare(b));

      const sports = Array.from(new Set(results
        .map((row) => row.sport)
        .filter(Boolean)))
        .sort((a, b) => a.localeCompare(b));

      const filterOptions = {
        years,
        seasons,
        countries,
        sports,
        medalTypes: ['GOLD', 'SILVER', 'BRONZE']
      };

      console.log('[DEMO_MODE] Options de filtres:', {
        years: years.length,
        seasons: seasons.length,
        countries: countries.length,
        sports: sports.length
      });

      return res.json(filterOptions);
    }

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
    
    if (IS_DEMO_MODE) {
  const resultsData = loadDemoJson('results.json', { expectArray: true });
      const seasons = parseArrayParam(filters.seasons);
      const countries = parseArrayParam(filters.countries);
      const medalTypes = parseArrayParam(filters.medalTypes).map((value) => value.toUpperCase());
      const sports = parseArrayParam(filters.sports);

      const filtered = applyDemoFilters(resultsData, {
        yearMin: filters.yearMin ? parseInt(filters.yearMin, 10) : undefined,
        yearMax: filters.yearMax ? parseInt(filters.yearMax, 10) : undefined,
        seasons,
        countries,
        medalTypes,
        sports,
        gender: filters.gender || undefined
      });

      const totalAthletes = new Set(filtered.map((row) => row.athlete_id)).size;
      const totalMedals = filtered.length;
      const totalCountries = new Set(filtered.map((row) => row.nationality)).size;
      const totalSports = new Set(filtered.map((row) => row.sport)).size;

      const medalDistribution = { Gold: 0, Silver: 0, Bronze: 0 };
      filtered.forEach((row) => {
        if (row.medal === 'GOLD') {
          medalDistribution.Gold += 1;
        } else if (row.medal === 'SILVER') {
          medalDistribution.Silver += 1;
        } else if (row.medal === 'BRONZE') {
          medalDistribution.Bronze += 1;
        }
      });

      const stats = {
        totalAthletes,
        totalMedals,
        totalCountries,
        totalSports,
        medalDistribution
      };

      console.log('[DEMO_MODE] /api/stats/quick ->', stats);
      return res.json(stats);
    }

  const limitValue = Math.max(parseInt(pagination.limit, 10) || 50, 1);
  const offsetValue = Math.max(parseInt(pagination.offset, 10) || 0, 0);

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
    
    if (IS_DEMO_MODE) {
  const resultsData = loadDemoJson('results.json', { expectArray: true });
      const seasons = Array.isArray(filters.seasons) ? filters.seasons : parseArrayParam(filters.seasons);
      const countries = Array.isArray(filters.countries) ? filters.countries : parseArrayParam(filters.countries);
      const medalTypes = (Array.isArray(filters.medalTypes) ? filters.medalTypes : parseArrayParam(filters.medalTypes))
        .map((value) => value.toUpperCase());
      const sports = Array.isArray(filters.sports) ? filters.sports : parseArrayParam(filters.sports);

      const limitValue = Math.max(parseInt(pagination.limit, 10) || 50, 1);
      const offsetValue = Math.max(parseInt(pagination.offset, 10) || 0, 0);

      const filtered = applyDemoFilters(resultsData, {
        yearMin: filters.yearMin ? parseInt(filters.yearMin, 10) : undefined,
        yearMax: filters.yearMax ? parseInt(filters.yearMax, 10) : undefined,
        seasons,
        countries,
        medalTypes,
        sports,
        gender: filters.gender || undefined,
        search: filters.search || undefined
      });

      const paginatedResults = paginateArray(filtered, limitValue, offsetValue);

      const stats = {
        totalAthletes: new Set(filtered.map((row) => row.athlete_id)).size,
        totalMedals: filtered.length,
        totalCountries: new Set(filtered.map((row) => row.nationality)).size,
        totalSports: new Set(filtered.map((row) => row.sport)).size
      };

      const aggregationsData = {};

      if (aggregations.includes('byCountry')) {
        const countryMap = new Map();
        filtered.forEach((row) => {
          const key = row.nationality || 'Unknown';
          if (!key) {
            return;
          }
          const current = countryMap.get(key) || { country: key, total: 0, gold: 0, silver: 0, bronze: 0 };
          current.total += 1;
          if (row.medal === 'GOLD') {
            current.gold += 1;
          } else if (row.medal === 'SILVER') {
            current.silver += 1;
          } else if (row.medal === 'BRONZE') {
            current.bronze += 1;
          }
          countryMap.set(key, current);
        });
        aggregationsData.byCountry = Array.from(countryMap.values())
          .sort((a, b) => b.total - a.total)
          .slice(0, 20);
      }

      if (aggregations.includes('byYear')) {
        const yearMap = new Map();
        filtered.forEach((row) => {
          if (typeof row.year !== 'number') {
            return;
          }
          yearMap.set(row.year, (yearMap.get(row.year) || 0) + 1);
        });
        aggregationsData.byYear = Array.from(yearMap.entries())
          .map(([year, medals]) => ({ year, medals }))
          .sort((a, b) => a.year - b.year);
      }

      if (aggregations.includes('byMedal')) {
        const medalMap = new Map();
        filtered.forEach((row) => {
          if (!row.medal) {
            return;
          }
          medalMap.set(row.medal, (medalMap.get(row.medal) || 0) + 1);
        });
        aggregationsData.byMedal = Array.from(medalMap.entries())
          .map(([medal, count]) => ({ medal, count }))
          .sort((a, b) => a.medal.localeCompare(b.medal));
      }

      if (aggregations.includes('bySport')) {
        const sportMap = new Map();
        filtered.forEach((row) => {
          if (!row.sport) {
            return;
          }
          sportMap.set(row.sport, (sportMap.get(row.sport) || 0) + 1);
        });
        aggregationsData.bySport = Array.from(sportMap.entries())
          .map(([sport, participants]) => ({ sport, participants }))
          .sort((a, b) => b.participants - a.participants)
          .slice(0, 15);
      }

      const response = {
        stats,
        results: paginatedResults,
        aggregations: aggregationsData,
        pagination: {
          limit: limitValue,
          offset: offsetValue,
          total: filtered.length
        }
      };

      console.log('[DEMO_MODE] /api/data/filtered ->', {
        total: filtered.length,
        pageSize: paginatedResults.length,
        aggregations: Object.keys(aggregationsData)
      });

      return res.json(response);
    }

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
  LIMIT ${limitValue} OFFSET ${offsetValue}
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
    
    const [statsRow] = await executeQuery(statsQuery, params);

    const stats = {
      totalAthletes: statsRow?.totalAthletes || 0,
      totalMedals: statsRow?.totalMedals || 0,
      totalCountries: statsRow?.totalCountries || 0,
      totalSports: statsRow?.totalSports || 0
    };

    const response = {
      stats,
      results,
      aggregations: aggregationsData,
      pagination: {
        limit: limitValue,
        offset: offsetValue,
        total: stats.totalMedals
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
  
  let dbConnected = true;

  if (IS_DEMO_MODE) {
    console.log('🎭 MODE DÉMO ACTIVÉ - Données servies depuis les fichiers JSON');
    console.log('📂 Dossier demo:', DEMO_DATA_DIR);
  } else {
    dbConnected = await testConnection();

    if (!dbConnected) {
      console.error('❌ Impossible de se connecter à la base de données. Arrêt du serveur.');
      process.exit(1);
    }
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