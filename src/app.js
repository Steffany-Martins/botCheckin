const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const config = require('./config/env');
const { webhookHandler } = require('./controllers/webhook.controller');
const { initDatabase } = require('./services/database.service');
const { initRealtimeListener, initUsersRealtimeListener } = require('./services/realtime.service');

const app = express();

// Initialize database (Supabase tables should already exist)
initDatabase().catch(error => {
  console.error('Failed to initialize database:', error);
});

// Initialize Supabase realtime listeners
try {
  initRealtimeListener();
  initUsersRealtimeListener();
  console.log('📡 Supabase realtime listeners initialized');
} catch (error) {
  console.error('❌ Failed to initialize realtime listeners:', error);
}

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Serve PDF files from temp directory
app.use('/pdf', express.static(path.join(__dirname, '../temp')));

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
