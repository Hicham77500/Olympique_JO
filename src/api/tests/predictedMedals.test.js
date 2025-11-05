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

test('GET /api/predicted_medals retourne un tableau JSON', { skip: !hasDbConfig }, async () => {
  const response = await request(app)
    .get('/api/predicted_medals')
    .expect('Content-Type', /json/)
    .expect(200);

  assert.ok(Array.isArray(response.body), 'La réponse doit être un tableau JSON');

  if (response.body.length > 0) {
    const row = response.body[0];
    assert.ok(Object.prototype.hasOwnProperty.call(row, 'country'));
    assert.ok(Object.prototype.hasOwnProperty.call(row, 'predicted_value'));
    assert.ok(Object.prototype.hasOwnProperty.call(row, 'target'));
  }
});
