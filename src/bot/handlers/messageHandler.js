import userService from '../../services/userService';
import groqService from '../../services/groqService';
const { handleFundWallet, handleCheckBalance, handleTransactionHistory } = require('./walletHandler');
const { handleBuyAirtime, handleBuyData } = require('./vtuHandler');
const { handleShareAirtime, handleBeneficiaries } = require('./sharingHandler');
const { handleAnalytics } = require('./analyticsHandler');

const userServices = new userService();
const groqServices = new groqService();

async function handleMessage(bot, msg) {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;
  const text = msg.text;

  if (text.startsWith('/')) {
    return;
  }

  const quickResponses = {
    '💰 Fund Wallet': () => handleFundWallet(bot, msg),
    '📱 Buy Airtime': () => handleBuyAirtime(bot, msg),
    '📊 Check Balance': () => handleCheckBalance(bot, msg),
    '📝 History': () => handleTransactionHistory(bot, msg),
    '💸 Share Airtime': () => handleShareAirtime(bot, msg),
    '👥 Beneficiaries': () => handleBeneficiaries(bot, msg)
  };

  if (quickResponses[text]) {
    await quickResponses[text]();
    return;
  }

  try {
    const user = await userServices.getUserByTelegramId(telegramId);

    if (!user) {
      await bot.sendMessage(chatId,
        'Hey! You need to register first to use QuickWally.\n\n' +
        'Use /start to get started!'
      );
      return;
    }

    const intent = await groqServices.parseIntent(text, user.full_name);

    if (intent.confidence < 0.5) {
      const response = await groqServices.generateResponse(
        `User said: "${text}". They are a registered QuickWally user.`,
        user.full_name
      );
      await bot.sendMessage(chatId, response);
      return;
    }

    switch (intent.intent) {
      case 'buy_airtime':
        await handleBuyAirtime(bot, msg);
        break;

      case 'buy_data':
        await handleBuyData(bot, msg);
        break;

      case 'share_airtime':
        await handleShareAirtime(bot, msg);
        break;

      case 'fund_wallet':
        await handleFundWallet(bot, msg);
        break;

      case 'check_balance':
        await handleCheckBalance(bot, msg);
        break;

      case 'transaction_history':
        await handleTransactionHistory(bot, msg);
        break;

      case 'add_beneficiary':
        await handleBeneficiaries(bot, msg);
        break;

      case 'analytics':
        await handleAnalytics(bot, msg);
        break;

      case 'general_chat':
      default:
        const response = await groqServices.generateResponse(
          `User said: "${text}". They are a registered QuickWally user named ${user.full_name}.`,
          user.full_name
        );
        await bot.sendMessage(chatId, response);
        break;
    }
  } catch (error) {
    console.error('Error in message handler:', error);
    await bot.sendMessage(chatId,
      'I had trouble understanding that. Try being more specific or use the menu buttons!'
    );
  }
}

module.exports = handleMessage;
