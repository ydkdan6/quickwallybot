const userService = require('../../services/userService');
const walletService = require('../../services/walletService');
const tranzitpayService = require('../../services/tranzitpayService');

const networks = ['MTN', 'Airtel', 'Glo', '9mobile'];
const userServices = new userService();
const walletServices = new walletService();
const tranzitpayServices = new tranzitpayService();

async function handleBuyAirtime(bot, msg) {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;

  try {
    const user = await userServices.getUserByTelegramId(telegramId);

    if (!user) {
      await bot.sendMessage(chatId, 'Please register first using /start');
      return;
    }

    await bot.sendMessage(chatId, 'Select network:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'MTN', callback_data: 'airtime_MTN' }],
          [{ text: 'Airtel', callback_data: 'airtime_Airtel' }],
          [{ text: 'Glo', callback_data: 'airtime_Glo' }],
          [{ text: '9mobile', callback_data: 'airtime_9mobile' }]
        ]
      }
    });
  } catch (error) {
    console.error('Error in buy airtime handler:', error);
    await bot.sendMessage(chatId, 'Something went wrong. Please try again.');
  }
}

async function processAirtimePurchase(bot, chatId, userId, network, phoneNumber, amount) {
  try {
    const wallet = await walletServices.getWallet(userId);

    if (parseFloat(wallet.balance) < parseFloat(amount)) {
      await bot.sendMessage(chatId,
        `Insufficient balance!\n\n` +
        `Required: ₦${parseFloat(amount).toFixed(2)}\n` +
        `Available: ₦${parseFloat(wallet.balance).toFixed(2)}\n\n` +
        `Please fund your wallet first.`,
        {
          reply_markup: {
            inline_keyboard: [[
              { text: '💰 Fund Wallet', callback_data: 'fund_wallet' }
            ]]
          }
        }
      );
      return;
    }

    await bot.sendMessage(chatId, `Processing your ₦${amount} ${network} airtime purchase...`);

    const result = await tranzitpayServices.buyAirtime(phoneNumber, network, amount);

    await walletServices.debitWallet(
      userId,
      amount,
      'airtime',
      `${network} airtime purchase - ${phoneNumber}`,
      { provider: network, phone: phoneNumber, transaction_id: result.transaction_id }
    );

    const updatedWallet = await walletServices.getWallet(userId);

    await bot.sendMessage(chatId,
      `✅ Airtime purchased successfully!\n\n` +
      `Network: ${network}\n` +
      `Phone: ${phoneNumber}\n` +
      `Amount: ₦${parseFloat(amount).toFixed(2)}\n` +
      `New Balance: ₦${parseFloat(updatedWallet.balance).toFixed(2)}`
    );
  } catch (error) {
    console.error('Error processing airtime purchase:', error);
    await bot.sendMessage(chatId, '❌ Airtime purchase failed. Please try again.');
  }
}

async function handleBuyData(bot, msg) {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;

  try {
    const user = await userServices.getUserByTelegramId(telegramId);

    if (!user) {
      await bot.sendMessage(chatId, 'Please register first using /start');
      return;
    }

    await bot.sendMessage(chatId, 'Select network:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'MTN', callback_data: 'data_MTN' }],
          [{ text: 'Airtel', callback_data: 'data_Airtel' }],
          [{ text: 'Glo', callback_data: 'data_Glo' }],
          [{ text: '9mobile', callback_data: 'data_9mobile' }]
        ]
      }
    });
  } catch (error) {
    console.error('Error in buy data handler:', error);
    await bot.sendMessage(chatId, 'Something went wrong. Please try again.');
  }
}

async function showDataPlans(bot, chatId, network) {
  try {
    await bot.sendMessage(chatId, `Fetching ${network} data plans...`);
    
    const plans = await tranzitpayServices.getDataPlans(network);

    if (!plans || plans.length === 0) {
      await bot.sendMessage(chatId, 
        `No data plans available for ${network} at the moment. Please try again later.`
      );
      return;
    }

    // Display real plans from API
    const buttons = plans.slice(0, 15).map(plan => [{
      text: `${plan.name} - ₦${parseFloat(plan.price).toFixed(2)}`,
      callback_data: `buy_data_${network}_${plan.planID}_${plan.price}`
    }]);

    await bot.sendMessage(chatId, message, {
      reply_markup: { inline_keyboard: buttons }
    });
  } catch (error) {
    // Show error, no fallback to mock data
    await bot.sendMessage(chatId, 
      `Unable to fetch ${network} data plans at the moment.\n\n` +
      `Error: ${error.message}\n\n` +
      `Please try again later or contact support.`
    );
  }
}

async function processDataPurchase(bot, chatId, userId, network, planCode, price, phoneNumber) {
  try {
    const wallet = await walletServices.getWallet(userId);

    if (parseFloat(wallet.balance) < parseFloat(price)) {
      await bot.sendMessage(chatId,
        `Insufficient balance!\n\n` +
        `Required: ₦${parseFloat(price).toFixed(2)}\n` +
        `Available: ₦${parseFloat(wallet.balance).toFixed(2)}\n\n` +
        `Please fund your wallet first.`,
        {
          reply_markup: {
            inline_keyboard: [[
              { text: '💰 Fund Wallet', callback_data: 'fund_wallet' }
            ]]
          }
        }
      );
      return;
    }

    await bot.sendMessage(chatId, `Processing your ${network} ${planCode} data purchase...`);

    const result = await tranzitpayServices.buyData(phoneNumber, network, planCode);

    await walletServices.debitWallet(
      userId,
      price,
      'data',
      `${network} ${planCode} data - ${phoneNumber}`,
      { provider: network, phone: phoneNumber, plan: planCode, transaction_id: result.transaction_id }
    );

    const updatedWallet = await walletServices.getWallet(userId);

    await bot.sendMessage(chatId,
      `✅ Data purchased successfully!\n\n` +
      `Network: ${network}\n` +
      `Plan: ${planCode}\n` +
      `Phone: ${phoneNumber}\n` +
      `Amount: ₦${parseFloat(price).toFixed(2)}\n` +
      `New Balance: ₦${parseFloat(updatedWallet.balance).toFixed(2)}`
    );
  } catch (error) {
    console.error('Error processing data purchase:', error);
    await bot.sendMessage(chatId, '❌ Data purchase failed. Please try again.');
  }
}

module.exports = {
  handleBuyAirtime,
  handleBuyData,
  processAirtimePurchase,
  processDataPurchase,
  showDataPlans
};