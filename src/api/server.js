// CommonJS syntax
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const registerRoute = require('./routes/register');
const verifyPinRoute = require('./routes/verifyPin');
const webhookRoute = require('./routes/webhook');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../webapp')));

// Routes
app.use('/api/register', registerRoute);
app.use('/api/verify-pin', verifyPinRoute);
app.use('/api/webhook', webhookRoute);

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../../webapp/index.html'));
});

app.get('/verify-pin', (req, res) => {
  res.sendFile(path.join(__dirname, '../../webapp/verify-pin.html'));
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});

module.exports = app;
