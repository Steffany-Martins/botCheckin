const express = require('express');
const bodyParser = require('body-parser');
const config = require('./config/env');
const { webhookHandler } = require('./controllers/webhook.controller');
const { initDatabase } = require('./services/database.service');

const app = express();

// Initialize database (Supabase tables should already exist)
initDatabase().catch(error => {
  console.error('Failed to initialize database:', error);
});

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Routes
app.post('/webhook', webhookHandler);

app.get('/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
