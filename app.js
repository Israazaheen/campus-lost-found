'use strict';

/**
 * Campus Lost & Found Board — Main Server
 * Version source of truth is config/appConfig.js
 */

const express = require('express');
const path    = require('path');
const config  = require('./config/appConfig');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// ── In-memory store with seed data ───────────────────────────────────────────
let items = [
  {
    id:          1,
    name:        'Blue Water Bottle',
    description: 'Insulated blue water bottle with a sticker of a mountain on it.',
    status:      'Lost',
    date:        '2026-10-20',
  },
  {
    id:          2,
    name:        'Student ID Card',
    description: 'Found near the library entrance. Name: R. Sharma, CS Dept.',
    status:      'Found',
    date:        '2026-10-21',
  },
  {
    id:          3,
    name:        'Black Umbrella',
    description: 'Left behind in Lecture Hall B after Tuesday\'s 9 AM class.',
    status:      'Lost',
    date:        '2026-10-22',
  },
  {
    id:          4,
    name:        'Calculus Textbook',
    description: 'Found on a bench near the cafeteria. "Calculus: Early Transcendentals".',
    status:      'Found',
    date:        '2026-10-23',
  },
  {
    id:          5,
    name:        'Silver Earring (pair)',
    description: 'Small hoop earrings found in the women\'s restroom near Block C.',
    status:      'Found',
    date:        '2026-10-24',
  },
];

let nextId = items.length + 1;

// ── Health endpoint ───────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status:    'ok',
    uptime:    process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ── Version endpoint ──────────────────────────────────────────────────────────
app.get('/version', (req, res) => {
  res.status(200).json({
    version:           config.version,
    deploymentMessage: config.deploymentMessage,
    appName:           config.appName,
  });
});

// ── API: list items ───────────────────────────────────────────────────────────
app.get('/api/items', (req, res) => {
  res.status(200).json(items);
});

// ── API: create item ──────────────────────────────────────────────────────────
app.post('/api/items', (req, res) => {
  const { name, description, status } = req.body;

  // Server-side validation
  const errors = [];
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('Item name is required.');
  }
  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    errors.push('Item description is required.');
  }
  if (!status || !['Lost', 'Found'].includes(status)) {
    errors.push('Status must be either "Lost" or "Found".');
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(' ') });
  }

  const newItem = {
    id:          nextId++,
    name:        name.trim(),
    description: description.trim(),
    status:      status,
    date:        new Date().toISOString().slice(0, 10),
  };

  items.unshift(newItem); // newest first
  return res.status(201).json(newItem);
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Error handler ─────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[${config.appName}] v${config.version} — listening on port ${PORT}`);
  console.log(`[${config.appName}] ${config.deploymentMessage}`);
});

module.exports = app;
