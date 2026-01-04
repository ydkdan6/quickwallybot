// import userService = require('../../services/userService');
import UserService from '../../services/userService';
const { handleFundWallet } = require('./walletHandler');
const { processAirtimePurchase, processDataPurchase, showDataPlans } = require('./vtuHandler');
const { processAirtimeSharing, saveBeneficiary } = require('./sharingHandler');
const { showAnalyticsSummary } = require('./analyticsHandler');

async function handleCallbackQuery(bot, query) {
  const userServices = new UserService();

  const chatId = query.message.chat.id;
  const data = query.data;
  const telegramId = query.from.id;

  try {
    const user = await userServices.getUserByTelegramId(telegramId);

    if (!user) {
      await bot.answerCallbackQuery(query.id, { text: 'Please register first!' });
      return;
    }

    if (data === 'fund_wallet') {
      await bot.answerCallbackQuery(query.id);
      await handleFundWallet(bot, query.message);
      return;
    }

    if (data.startsWith('airtime_')) {
      const network = data.split('_')[1];
      await bot.answerCallbackQuery(query.id);

      await bot.sendMessage(chatId, `Enter phone number for ${network} airtime:`);

      bot.once('message', async (phoneMsg) => {
        const phone = phoneMsg.text.trim();

        if (!/^0?[789]\d{9}$/.test(phone)) {
          await bot.sendMessage(chatId, 'Invalid phone number. Please try again.');
          return;
        }

        await bot.sendMessage(chatId, 'Enter amount (e.g., 100):');

        bot.once('message', async (amountMsg) => {
          const amount = parseFloat(amountMsg.text);

          if (isNaN(amount) || amount < 50) {
            await bot.sendMessage(chatId, 'Invalid amount. Minimum is ₦50.');
            return;
          }

          await bot.sendMessage(chatId,
            `Confirm purchase:\n\n` +
            `Network: ${network}\n` +
            `Phone: ${phone}\n` +
            `Amount: ₦${amount.toFixed(2)}\n\n` +
            `This will open a secure PIN entry form.`,
            {
              reply_markup: {
                inline_keyboard: [[
                  {
                    text: '✅ Confirm & Enter PIN',
                    web_app: {
                      url: `${process.env.WEBAPP_URL}/verify-pin?action=airtime&network=${network}&phone=${phone}&amount=${amount}&user_id=${user.id}`
                    }
                  }
                ]]
              }
            }
          );
        });
      });

      return;
    }

    if (data.startsWith('data_')) {
      const network = data.split('_')[1];
      await bot.answerCallbackQuery(query.id);
      await showDataPlans(bot, chatId, network);
      return;
    }

    if (data.startsWith('buy_data_')) {
      const parts = data.split('_');
      const network = parts[2];
      const planCode = parts[3];
      const price = parts[4];

      await bot.answerCallbackQuery(query.id);

      await bot.sendMessage(chatId, `Enter phone number for ${network} ${planCode} data:`);

      bot.once('message', async (phoneMsg) => {
        const phone = phoneMsg.text.trim();

        if (!/^0?[789]\d{9}$/.test(phone)) {
          await bot.sendMessage(chatId, 'Invalid phone number. Please try again.');
          return;
        }

        await bot.sendMessage(chatId,
          `Confirm purchase:\n\n` +
          `Network: ${network}\n` +
          `Plan: ${planCode}\n` +
          `Phone: ${phone}\n` +
          `Amount: ₦${price}\n\n` +
          `This will open a secure PIN entry form.`,
          {
            reply_markup: {
              inline_keyboard: [[
                {
                  text: '✅ Confirm & Enter PIN',
                  web_app: {
                    url: `${process.env.WEBAPP_URL}/verify-pin?action=data&network=${network}&phone=${phone}&plan=${planCode}&price=${price}&user_id=${user.id}`
                  }
                }
              ]]
            }
          }
        );
      });

      return;
    }

    if (data.startsWith('share_')) {
      if (data === 'share_new') {
        await bot.answerCallbackQuery(query.id);

        await bot.sendMessage(chatId, 'Enter recipient phone number:');

        bot.once('message', async (phoneMsg) => {
          const phone = phoneMsg.text.trim();

          if (!/^0?[789]\d{9}$/.test(phone)) {
            await bot.sendMessage(chatId, 'Invalid phone number. Please try again.');
            return;
          }

          await bot.sendMessage(chatId, 'Select network:', {
            reply_markup: {
              inline_keyboard: [
                [{ text: 'MTN', callback_data: `share_confirm_${phone}_MTN` }],
                [{ text: 'Airtel', callback_data: `share_confirm_${phone}_Airtel` }],
                [{ text: 'Glo', callback_data: `share_confirm_${phone}_Glo` }],
                [{ text: '9mobile', callback_data: `share_confirm_${phone}_9mobile` }]
              ]
            }
          });
        });

        return;
      }

      if (data.startsWith('share_confirm_')) {
        const parts = data.split('_');
        const phone = parts[2];
        const network = parts[3];

        await bot.answerCallbackQuery(query.id);

        await bot.sendMessage(chatId, 'Enter amount to send:');

        bot.once('message', async (amountMsg) => {
          const amount = parseFloat(amountMsg.text);

          if (isNaN(amount) || amount < 50) {
            await bot.sendMessage(chatId, 'Invalid amount. Minimum is ₦50.');
            return;
          }

          await bot.sendMessage(chatId,
            `Confirm airtime sharing:\n\n` +
            `Recipient: ${phone}\n` +
            `Network: ${network}\n` +
            `Amount: ₦${amount.toFixed(2)}\n\n` +
            `This will open a secure PIN entry form.`,
            {
              reply_markup: {
                inline_keyboard: [[
                  {
                    text: '✅ Confirm & Enter PIN',
                    web_app: {
                      url: `${process.env.WEBAPP_URL}/verify-pin?action=share&network=${network}&phone=${phone}&amount=${amount}&user_id=${user.id}`
                    }
                  }
                ]]
              }
            }
          );
        });

        return;
      }

      const parts = data.split('_');
      const beneficiaryId = parts[1];
      const phone = parts[2];
      const network = parts[3];

      await bot.answerCallbackQuery(query.id);

      await bot.sendMessage(chatId, 'Enter amount to send:');

      bot.once('message', async (amountMsg) => {
        const amount = parseFloat(amountMsg.text);

        if (isNaN(amount) || amount < 50) {
          await bot.sendMessage(chatId, 'Invalid amount. Minimum is ₦50.');
          return;
        }

        await bot.sendMessage(chatId,
          `Confirm airtime sharing:\n\n` +
          `Recipient: ${phone}\n` +
          `Network: ${network}\n` +
          `Amount: ₦${amount.toFixed(2)}\n\n` +
          `This will open a secure PIN entry form.`,
          {
            reply_markup: {
              inline_keyboard: [[
                {
                  text: '✅ Confirm & Enter PIN',
                  web_app: {
                    url: `${process.env.WEBAPP_URL}/verify-pin?action=share&network=${network}&phone=${phone}&amount=${amount}&user_id=${user.id}`
                  }
                }
              ]]
            }
          }
        );
      });

      return;
    }

    if (data.startsWith('save_beneficiary_')) {
      const parts = data.split('_');
      const phone = parts[2];
      const network = parts[3];

      await bot.answerCallbackQuery(query.id);

      await bot.sendMessage(chatId, 'Enter a name for this beneficiary:');

      bot.once('message', async (nameMsg) => {
        const name = nameMsg.text.trim();

        if (name.length < 2) {
          await bot.sendMessage(chatId, 'Please enter a valid name.');
          return;
        }

        await saveBeneficiary(bot, chatId, user.id, phone, network, name);
      });

      return;
    }

    if (data.startsWith('analytics_')) {
      const period = data.split('_')[1];
      await bot.answerCallbackQuery(query.id);
      await showAnalyticsSummary(bot, chatId, user.id, period);
      return;
    }

    await bot.answerCallbackQuery(query.id);
  } catch (error) {
    console.error('Error in callback handler:', error);
    await bot.answerCallbackQuery(query.id, { text: 'Something went wrong!' });
  }
}

module.exports = handleCallbackQuery;
