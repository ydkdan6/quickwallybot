const UserService = require('../../services/userService');
const AnalyticsService = require('../../services/analyticsService');

async function handleAnalytics(bot, msg) {
  const userServices = new UserService();

  const chatId = msg.chat.id;
  const telegramId = msg.from.id;

  try {
    const user = await userServices.getUserByTelegramId(telegramId);

    if (!user) {
      await bot.sendMessage(chatId, 'Please register first using /start');
      return;
    }

    await bot.sendMessage(chatId, 'Select period for analytics:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📅 Weekly Summary', callback_data: 'analytics_weekly' }],
          [{ text: '📊 Monthly Summary', callback_data: 'analytics_monthly' }]
        ]
      }
    });
  } catch (error) {
    console.error('Error in analytics handler:', error);
    await bot.sendMessage(chatId, 'Something went wrong. Please try again.');
  }
}

async function showAnalyticsSummary(bot, chatId, userId, period) {
  const analyticsServices = new AnalyticsService();
  
  try {
    const summary = await analyticsServices.getSpendingSummary(userId, period);

    if (summary.transaction_count === 0) {
      await bot.sendMessage(chatId,
        `No spending data for the ${period} period.\n\n` +
        `Start making transactions to see your analytics!`
      );
      return;
    }

    const message = await analyticsServices.formatSpendingSummary(summary);

    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error showing analytics:', error);
    await bot.sendMessage(chatId, 'Failed to fetch analytics. Please try again.');
  }
}

module.exports = {
  handleAnalytics,
  showAnalyticsSummary
};