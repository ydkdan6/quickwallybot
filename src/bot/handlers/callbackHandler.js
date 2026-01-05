const UserService = require('../../services/userService');
const { handleFundWallet } = require('./walletHandler');
const { processAirtimePurchase, processDataPurchase, showDataPlans } = require('./vtuHandler');
const { processAirtimeSharing, saveBeneficiary } = require('./sharingHandler');
const { showAnalyticsSummary } = require('./analyticsHandler');

// Track active conversations to prevent duplicates
const activeConversations = new Map();

async function handleCallbackQuery(bot, query) {
  const userServices = new UserService();

  const chatId = query.message.chat.id;
  const data = query.data;
  const telegramId = query.from.id;

  // Check if this conversation is already being processed
  const conversationKey = `${chatId}-${data}`;
  if (activeConversations.has(conversationKey)) {
    await bot.answerCallbackQuery(query.id, { text: 'Please wait, processing...' });
    return;
  }

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

      // Mark conversation as active
      activeConversations.set(conversationKey, true);

      const phoneMsg = await bot.sendMessage(chatId, `Enter phone number for ${network} airtime:`);

      // Create a one-time listener with timeout
      const phonePromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          bot.removeListener('message', messageHandler);
          activeConversations.delete(conversationKey);
          reject(new Error('Timeout'));
        }, 120000); // 2 minute timeout

        const messageHandler = async (msg) => {
          if (msg.chat.id !== chatId || msg.message_id <= phoneMsg.message_id) return;
          
          clearTimeout(timeout);
          bot.removeListener('message', messageHandler);
          resolve(msg);
        };

        bot.on('message', messageHandler);
      });

      try {
        const phoneResponse = await phonePromise;
        const phone = phoneResponse.text.trim();

        if (!/^0?[789]\d{9}$/.test(phone)) {
          await bot.sendMessage(chatId, 'Invalid phone number. Please start over and try again.');
          activeConversations.delete(conversationKey);
          return;
        }

        const amountMsg = await bot.sendMessage(chatId, 'Enter amount (e.g., 100):');

        const amountPromise = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            bot.removeListener('message', messageHandler);
            activeConversations.delete(conversationKey);
            reject(new Error('Timeout'));
          }, 120000);

          const messageHandler = async (msg) => {
            if (msg.chat.id !== chatId || msg.message_id <= amountMsg.message_id) return;
            
            clearTimeout(timeout);
            bot.removeListener('message', messageHandler);
            resolve(msg);
          };

          bot.on('message', messageHandler);
        });

        const amountResponse = await amountPromise;
        const amount = parseFloat(amountResponse.text);

        if (isNaN(amount) || amount < 50) {
          await bot.sendMessage(chatId, 'Invalid amount. Minimum is ₦50. Please start over.');
          activeConversations.delete(conversationKey);
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
                    url: `${process.env.WEBAPP_URL}/verify-pin.html?action=airtime&network=${network}&phone=${phone}&amount=${amount}&user_id=${user.id}`
                  }
                }
              ]]
            }
          }
        );
      } catch (error) {
        if (error.message === 'Timeout') {
          await bot.sendMessage(chatId, 'Request timed out. Please try again.');
        }
      } finally {
        activeConversations.delete(conversationKey);
      }

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

      // Mark conversation as active
      activeConversations.set(conversationKey, true);

      const phoneMsg = await bot.sendMessage(chatId, `Enter phone number for ${network} ${planCode} data:`);

      const phonePromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          bot.removeListener('message', messageHandler);
          activeConversations.delete(conversationKey);
          reject(new Error('Timeout'));
        }, 120000);

        const messageHandler = async (msg) => {
          if (msg.chat.id !== chatId || msg.message_id <= phoneMsg.message_id) return;
          
          clearTimeout(timeout);
          bot.removeListener('message', messageHandler);
          resolve(msg);
        };

        bot.on('message', messageHandler);
      });

      try {
        const phoneResponse = await phonePromise;
        const phone = phoneResponse.text.trim();

        if (!/^0?[789]\d{9}$/.test(phone)) {
          await bot.sendMessage(chatId, 'Invalid phone number. Please start over and try again.');
          activeConversations.delete(conversationKey);
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
                    url: `${process.env.WEBAPP_URL}/verify-pin.html?action=data&network=${network}&phone=${phone}&plan=${planCode}&price=${price}&user_id=${user.id}`
                  }
                }
              ]]
            }
          }
        );
      } catch (error) {
        if (error.message === 'Timeout') {
          await bot.sendMessage(chatId, 'Request timed out. Please try again.');
        }
      } finally {
        activeConversations.delete(conversationKey);
      }

      return;
    }

    if (data.startsWith('share_')) {
      if (data === 'share_new') {
        await bot.answerCallbackQuery(query.id);

        // Mark conversation as active
        activeConversations.set(conversationKey, true);

        const phoneMsg = await bot.sendMessage(chatId, 'Enter recipient phone number:');

        const phonePromise = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            bot.removeListener('message', messageHandler);
            activeConversations.delete(conversationKey);
            reject(new Error('Timeout'));
          }, 120000);

          const messageHandler = async (msg) => {
            if (msg.chat.id !== chatId || msg.message_id <= phoneMsg.message_id) return;
            
            clearTimeout(timeout);
            bot.removeListener('message', messageHandler);
            resolve(msg);
          };

          bot.on('message', messageHandler);
        });

        try {
          const phoneResponse = await phonePromise;
          const phone = phoneResponse.text.trim();

          if (!/^0?[789]\d{9}$/.test(phone)) {
            await bot.sendMessage(chatId, 'Invalid phone number. Please start over and try again.');
            activeConversations.delete(conversationKey);
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
        } catch (error) {
          if (error.message === 'Timeout') {
            await bot.sendMessage(chatId, 'Request timed out. Please try again.');
          }
        } finally {
          activeConversations.delete(conversationKey);
        }

        return;
      }

      if (data.startsWith('share_confirm_')) {
        const parts = data.split('_');
        const phone = parts[2];
        const network = parts[3];

        await bot.answerCallbackQuery(query.id);

        // Mark conversation as active
        activeConversations.set(conversationKey, true);

        const amountMsg = await bot.sendMessage(chatId, 'Enter amount to send:');

        const amountPromise = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            bot.removeListener('message', messageHandler);
            activeConversations.delete(conversationKey);
            reject(new Error('Timeout'));
          }, 120000);

          const messageHandler = async (msg) => {
            if (msg.chat.id !== chatId || msg.message_id <= amountMsg.message_id) return;
            
            clearTimeout(timeout);
            bot.removeListener('message', messageHandler);
            resolve(msg);
          };

          bot.on('message', messageHandler);
        });

        try {
          const amountResponse = await amountPromise;
          const amount = parseFloat(amountResponse.text);

          if (isNaN(amount) || amount < 50) {
            await bot.sendMessage(chatId, 'Invalid amount. Minimum is ₦50. Please start over.');
            activeConversations.delete(conversationKey);
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
                      url: `${process.env.WEBAPP_URL}/verify-pin.html?action=share&network=${network}&phone=${phone}&amount=${amount}&user_id=${user.id}`
                    }
                  }
                ]]
              }
            }
          );
        } catch (error) {
          if (error.message === 'Timeout') {
            await bot.sendMessage(chatId, 'Request timed out. Please try again.');
          }
        } finally {
          activeConversations.delete(conversationKey);
        }

        return;
      }

      const parts = data.split('_');
      const beneficiaryId = parts[1];
      const phone = parts[2];
      const network = parts[3];

      await bot.answerCallbackQuery(query.id);

      // Mark conversation as active
      activeConversations.set(conversationKey, true);

      const amountMsg = await bot.sendMessage(chatId, 'Enter amount to send:');

      const amountPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          bot.removeListener('message', messageHandler);
          activeConversations.delete(conversationKey);
          reject(new Error('Timeout'));
        }, 120000);

        const messageHandler = async (msg) => {
          if (msg.chat.id !== chatId || msg.message_id <= amountMsg.message_id) return;
          
          clearTimeout(timeout);
          bot.removeListener('message', messageHandler);
          resolve(msg);
        };

        bot.on('message', messageHandler);
      });

      try {
        const amountResponse = await amountPromise;
        const amount = parseFloat(amountResponse.text);

        if (isNaN(amount) || amount < 50) {
          await bot.sendMessage(chatId, 'Invalid amount. Minimum is ₦50. Please start over.');
          activeConversations.delete(conversationKey);
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
                    url: `${process.env.WEBAPP_URL}/verify-pin.html?action=share&network=${network}&phone=${phone}&amount=${amount}&user_id=${user.id}`
                  }
                }
              ]]
            }
          }
        );
      } catch (error) {
        if (error.message === 'Timeout') {
          await bot.sendMessage(chatId, 'Request timed out. Please try again.');
        }
      } finally {
        activeConversations.delete(conversationKey);
      }

      return;
    }

    if (data.startsWith('save_beneficiary_')) {
      const parts = data.split('_');
      const phone = parts[2];
      const network = parts[3];

      await bot.answerCallbackQuery(query.id);

      // Mark conversation as active
      activeConversations.set(conversationKey, true);

      const nameMsg = await bot.sendMessage(chatId, 'Enter a name for this beneficiary:');

      const namePromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          bot.removeListener('message', messageHandler);
          activeConversations.delete(conversationKey);
          reject(new Error('Timeout'));
        }, 120000);

        const messageHandler = async (msg) => {
          if (msg.chat.id !== chatId || msg.message_id <= nameMsg.message_id) return;
          
          clearTimeout(timeout);
          bot.removeListener('message', messageHandler);
          resolve(msg);
        };

        bot.on('message', messageHandler);
      });

      try {
        const nameResponse = await namePromise;
        const name = nameResponse.text.trim();

        if (name.length < 2) {
          await bot.sendMessage(chatId, 'Please enter a valid name. Please start over.');
          activeConversations.delete(conversationKey);
          return;
        }

        await saveBeneficiary(bot, chatId, user.id, phone, network, name);
      } catch (error) {
        if (error.message === 'Timeout') {
          await bot.sendMessage(chatId, 'Request timed out. Please try again.');
        }
      } finally {
        activeConversations.delete(conversationKey);
      }

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
    activeConversations.delete(conversationKey);
  }
}

module.exports = handleCallbackQuery;