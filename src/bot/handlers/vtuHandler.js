import userService from '../../services/userService';
import walletService from '../../services/walletService';
import tranzitpayService from '../../services/tranzitpayService';

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
      `Airtime purchased successfully!\n\n` +
      `Network: ${network}\n` +
      `Phone: ${phoneNumber}\n` +
      `Amount: ₦${parseFloat(amount).toFixed(2)}\n` +
      `New Balance: ₦${parseFloat(updatedWallet.balance).toFixed(2)}`
    );
  } catch (error) {
    console.error('Error processing airtime purchase:', error);
    await bot.sendMessage(chatId, 'Airtime purchase failed. Please try again.');
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
    const plans = await tranzitpayServices.getDataPlans(network);

    let message = `📶 ${network} Data Plans\n\n`;

    const buttons = plans.slice(0, 10).map(plan => [{
      text: `${plan.name} - ₦${plan.price}`,
      callback_data: `buy_data_${network}_${plan.code}_${plan.price}`
    }]);

    await bot.sendMessage(chatId, message, {
      reply_markup: {
        inline_keyboard: buttons
      }
    });
  } catch (error) {
    console.error('Error showing data plans:', error);

    const samplePlans = [
      { name: '1GB', code: '1GB', price: 300 },
      { name: '2GB', code: '2GB', price: 550 },
      { name: '5GB', code: '5GB', price: 1300 },
      { name: '10GB', code: '10GB', price: 2500 }
    ];

    const buttons = samplePlans.map(plan => [{
      text: `${plan.name} - ₦${plan.price}`,
      callback_data: `buy_data_${network}_${plan.code}_${plan.price}`
    }]);

    await bot.sendMessage(chatId, `📶 ${network} Data Plans\n\nSelect a plan:`, {
      reply_markup: {
        inline_keyboard: buttons
      }
    });
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
      `Data purchased successfully!\n\n` +
      `Network: ${network}\n` +
      `Plan: ${planCode}\n` +
      `Phone: ${phoneNumber}\n` +
      `Amount: ₦${parseFloat(price).toFixed(2)}\n` +
      `New Balance: ₦${parseFloat(updatedWallet.balance).toFixed(2)}`
    );
  } catch (error) {
    console.error('Error processing data purchase:', error);
    await bot.sendMessage(chatId, 'Data purchase failed. Please try again.');
  }
}

module.exports = {
  handleBuyAirtime,
  handleBuyData,
  processAirtimePurchase,
  processDataPurchase,
  showDataPlans
};
