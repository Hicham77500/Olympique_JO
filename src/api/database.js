const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const IS_DEMO_MODE = String(process.env.DEMO_MODE || '').toLowerCase() === 'true';

// Configuration de la base de données
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

// Création du pool de connexions
let pool = null;

if (!IS_DEMO_MODE) {
  pool = mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
} else {
  console.log('[DEMO_MODE] Connexion MySQL désactivée: utilisation des fixtures locales.');
}

// Test de connexion
async function testConnection() {
  if (IS_DEMO_MODE) {
    console.log('[DEMO_MODE] Vérification de la base ignorée (lecture via fichiers locaux).');
    return true;
  }

  try {
    const connection = await pool.getConnection();
    console.log('✅ Connexion à la base de données MySQL Azure établie');
    console.log(`📊 Base de données: ${process.env.DB_NAME}`);
    console.log(`🌐 Serveur: ${process.env.DB_HOST}`);
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion à la base de données:', error);
    console.error('Configuration:', {
      ...dbConfig,
      password: '***'
    });
    return false;
  }
}

// Fonction pour exécuter une requête
async function executeQuery(query, params = []) {
  if (IS_DEMO_MODE) {
    const error = new Error('Database access is disabled while DEMO_MODE is active.');
    error.code = 'DEMO_MODE_DISABLED';
    throw error;
  }

  try {
    console.log('Executing query with params:', params);
    const [rows] = await pool.execute(query, params);
    console.log(`Query returned ${rows.length} rows`);
    return rows;
  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution de la requête:', error);
    console.error('Query:', query);
    console.error('Params:', params);
    throw error;
  }
}

// Fonction pour obtenir les statistiques générales
async function getStats() {
  if (IS_DEMO_MODE) {
    const error = new Error('Stats cannot be queried from MySQL when DEMO_MODE is active.');
    error.code = 'DEMO_MODE_DISABLED';
    throw error;
  }

  try {
    const queries = [
      'SELECT COUNT(*) as total_athletes FROM athletes',
      'SELECT COUNT(*) as total_results FROM results',
      'SELECT COUNT(*) as total_medals FROM medals',
      'SELECT COUNT(DISTINCT sport) as total_sports FROM medals'
    ];

    const results = await Promise.all(queries.map(query => executeQuery(query)));
    
    return {
      total_athletes: results[0][0].total_athletes,
      total_results: results[1][0].total_results,
      total_medals: results[2][0].total_medals,
      total_sports: results[3][0].total_sports
    };
  } catch (error) {
    console.error('❌ Erreur lors du calcul des statistiques:', error);
    throw error;
  }
}

module.exports = {
  pool,
  testConnection,
  executeQuery,
  getStats
};