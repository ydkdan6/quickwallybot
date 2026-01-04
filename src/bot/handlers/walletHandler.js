import userService from '../../services/userService';
import walletService from '../../services/walletService';
import paystackService from '../../services/paystackService';

const userServices = new userService();
const walletServices = new walletService();
const paystackServices = new paystackService();

async function handleFundWallet(bot, msg) {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;

  try {
    const user = await userServices.getUserByTelegramId(telegramId);

    if (!user) {
      await bot.sendMessage(chatId, 'Please register first using /start');
      return;
    }

    await bot.sendMessage(chatId, 'How much do you want to add to your wallet? (Enter amount in Naira)');

    bot.once('message', async (amountMsg) => {
      const amount = parseFloat(amountMsg.text);

      if (isNaN(amount) || amount < 100) {
        await bot.sendMessage(chatId, 'Please enter a valid amount (minimum ₦100)');
        return;
      }

      try {
        const payment = await paystackServices.initializePayment(user.id, user.email, amount);

        await bot.sendMessage(chatId,
          `Click the link below to complete your payment of ₦${amount.toFixed(2)}:`,
          {
            reply_markup: {
              inline_keyboard: [[
                { text: '💳 Pay Now', url: payment.authorization_url }
              ]]
            }
          }
        );

        await bot.sendMessage(chatId,
          `Once payment is confirmed, your wallet will be credited automatically.\n\n` +
          `Reference: ${payment.reference}`
        );
      } catch (error) {
        console.error('Payment initialization error:', error);
        await bot.sendMessage(chatId, 'Failed to initialize payment. Please try again.');
      }
    });
  } catch (error) {
    console.error('Error in fund wallet handler:', error);
    await bot.sendMessage(chatId, 'Something went wrong. Please try again.');
  }
}

async function handleCheckBalance(bot, msg) {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;

  try {
    const user = await userServices.getUserByTelegramId(telegramId);

    if (!user) {
      await bot.sendMessage(chatId, 'Please register first using /start');
      return;
    }

    const wallet = await walletServices.getWallet(user.id);

    await bot.sendMessage(chatId,
      `💰 Your Wallet Balance\n\n` +
      `Balance: ₦${parseFloat(wallet.balance).toFixed(2)}\n` +
      `Currency: ${wallet.currency}\n\n` +
      `Need to top up? Use the Fund Wallet button.`,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: '💰 Fund Wallet', callback_data: 'fund_wallet' }
          ]]
        }
      }
    );
  } catch (error) {
    console.error('Error in check balance handler:', error);
    await bot.sendMessage(chatId, 'Failed to fetch wallet balance. Please try again.');
  }
}

async function handleTransactionHistory(bot, msg) {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;

  try {
    const user = await userServices.getUserByTelegramId(telegramId);

    if (!user) {
      await bot.sendMessage(chatId, 'Please register first using /start');
      return;
    }

    const transactions = await walletServices.getTransactionHistory(user.id, 10);

    if (transactions.length === 0) {
      await bot.sendMessage(chatId, 'No transactions yet. Start by funding your wallet!');
      return;
    }

    let message = '📝 Recent Transactions\n\n';

    transactions.forEach((tx, index) => {
      const type = tx.type === 'credit' ? '✅' : '❌';
      const date = new Date(tx.created_at).toLocaleString('en-NG', {
        dateStyle: 'short',
        timeStyle: 'short'
      });

      message += `${type} ${tx.description}\n`;
      message += `   Amount: ₦${parseFloat(tx.amount).toFixed(2)}\n`;
      message += `   ${date}\n`;
      message += `   Balance: ₦${parseFloat(tx.balance_after).toFixed(2)}\n\n`;
    });

    await bot.sendMessage(chatId, message);
  } catch (error) {
    console.error('Error in transaction history handler:', error);
    await bot.sendMessage(chatId, 'Failed to fetch transaction history. Please try again.');
  }
}

module.exports = {
  handleFundWallet,
  handleCheckBalance,
  handleTransactionHistory
};
