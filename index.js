require('dotenv').config();

const apiServer = require('./src/api/server');
const bot = require('./src/bot/index');

console.log('QuickWally_Bot initialized successfully');
console.log('Bot: Running');
console.log('API Server: Running on port', process.env.PORT || 3000);
