// CommonJS syntax
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const registerRoute = require('./routes/register');
const verifyPinRoute = require('./routes/verifyPin');
const webhookRoute = require('./routes/webhook');
const paymentRoute = require('./routes/payment');

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
app.use('/api/payment', paymentRoute);

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../../webapp/index.html'));
});

app.get('/api/register', (req, res) => {
  res.send('POST to this endpoint to register a user');
});


app.get('/verify-pin', (req, res) => {
  res.sendFile(path.join(__dirname, '../../webapp/verify-pin.html'));
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(cors({
  origin: ['https://quickwallybotty.vercel.app']  // frontend URL
}));


app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});

module.exports = app;
