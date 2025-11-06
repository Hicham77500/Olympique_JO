const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../app');
const { pool, testConnection } = require('../database');

const hasDbConfig = Boolean(
  process.env.DB_HOST &&
  process.env.DB_USER &&
  process.env.DB_PASSWORD &&
  process.env.DB_NAME
);

before(async () => {
  if (!hasDbConfig) {
    return;
  }
  const connected = await testConnection();
  if (!connected) {
    throw new Error('Connexion à la base de test impossible pour /api/predicted_medals');
  }
});

after(async () => {
  if (!hasDbConfig) {
    return;
  }
  await pool.end();
});

test('GET /api/predicted_medals retourne des données paginées', { skip: !hasDbConfig }, async () => {
  const response = await request(app)
    .get('/api/predicted_medals')
    .expect('Content-Type', /json/)
    .expect(200);

  assert.ok(response.body && typeof response.body === 'object', 'La réponse doit être un objet JSON');
  assert.ok(Array.isArray(response.body.predictions), 'La réponse doit contenir un tableau "predictions"');
  assert.ok(typeof response.body.total === 'number', 'La réponse doit indiquer le nombre total d\'éléments');
  assert.ok(typeof response.body.page === 'number', 'La réponse doit indiquer la page courante');
  assert.ok(typeof response.body.pageSize === 'number', 'La taille de page doit être définie');
  assert.ok(typeof response.body.totalPages === 'number', 'Le nombre total de pages doit être défini');

  if (response.body.predictions.length > 0) {
    const row = response.body.predictions[0];
    assert.ok(Object.prototype.hasOwnProperty.call(row, 'country'));
    assert.ok(Object.prototype.hasOwnProperty.call(row, 'predicted_value'));
    assert.ok(Object.prototype.hasOwnProperty.call(row, 'target'));
  }
});
