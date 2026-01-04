const userService = require('../../services/userService');
const walletService = require('../../services/walletService');

const userServices = new userService();
const walletServices = new walletService();

async function handleStart(bot, msg) {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;
  const firstName = msg.from.first_name;

  try {
    const user = await userServices.getUserByTelegramId(telegramId);

    if (user) {
      const wallet = await walletServices.getWallet(user.id);

      const welcomeBack = `Hey ${user.full_name}! Welcome back to QuickWally.\n\n` +
        `Your wallet balance: ₦${parseFloat(wallet.balance).toFixed(2)}\n\n` +
        `What would you like to do today?\n\n` +
        `💰 Fund Wallet\n` +
        `📱 Buy Airtime/Data\n` +
        `💸 Share Airtime\n` +
        `📊 View Analytics\n` +
        `📝 Transaction History\n\n` +
        `Just chat naturally and I'll help you out!`;

      await bot.sendMessage(chatId, welcomeBack, {
        reply_markup: {
          keyboard: [
            ['💰 Fund Wallet', '📱 Buy Airtime'],
            ['📊 Check Balance', '📝 History'],
            ['💸 Share Airtime', '👥 Beneficiaries']
          ],
          resize_keyboard: true
        }
      });
    } else {
      const welcomeNew = `Hey ${firstName}! Welcome to QuickWally Bot.\n\n` +
        `I help you fund your wallet, buy airtime & data, pay bills, and share value with friends - all through simple chat.\n\n` +
        `To get started, you need to register. Click the button below to set up your account securely.`;

      await bot.sendMessage(chatId, welcomeNew, {
        reply_markup: {
          inline_keyboard: [[
            {
              text: 'Register Now',
              web_app: { url: `https://quickwallybotty.vercel.app/index.html?telegram_id=${telegramId}` }
            }
          ]]
        }
      });
    }
  } catch (error) {
    console.error('Error in start handler:', error);
    await bot.sendMessage(chatId, 'Something went wrong. Please try again later.');
  }
}

module.exports = handleStart;
