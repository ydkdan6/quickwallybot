const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const handleStart = require('./handlers/startHandler');
const handleMessage = require('./handlers/messageHandler');
const handleCallbackQuery = require('./handlers/callbackHandler');
const ReminderService = require('../services/reminderService');

const reminderServices = new ReminderService();

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => handleStart(bot, msg));

bot.on('message', (msg) => {
  if (msg.text && !msg.text.startsWith('/')) {
    handleMessage(bot, msg);
  }
});

bot.on('callback_query', (query) => handleCallbackQuery(bot, query));

bot.on('web_app_data', async (msg) => {
  const chatId = msg.chat.id;
  const data = JSON.parse(msg.web_app_data.data);

  if (data.action === 'registration_complete') {
    await bot.sendMessage(chatId,
      `Welcome, ${data.full_name}! Your wallet is ready.\n\n` +
      `Fund your wallet to start transacting.`,
      {
        reply_markup: {
          keyboard: [
            ['💰 Fund Wallet', '📱 Buy Airtime'],
            ['📊 Check Balance', '📝 History'],
            ['💸 Share Airtime', '👥 Beneficiaries']
          ],
          resize_keyboard: true
        }
      }
    );
  }

  if (data.action === 'pin_verified') {
    await bot.sendMessage(chatId, data.message || 'Transaction completed successfully!');
  }
});

bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

reminderServices.startReminderScheduler(bot);

console.log('QuickWally Bot is running...');

module.exports = bot;
