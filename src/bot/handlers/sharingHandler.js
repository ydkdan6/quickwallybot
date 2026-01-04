import userService from '../../services/userService';
import walletService from '../../services/walletService';
import beneficiaryService from '../../services/beneficiaryService';
import tranzitpayService from '../../services/tranzitpayService';

const userServices = new userService();
const walletServices = new walletService();
const beneficiaryServices = new beneficiaryService();
const tranzitpayServices = new tranzitpayService();

async function handleShareAirtime(bot, msg) {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;

  try {
    const user = await userServices.getUserByTelegramId(telegramId);

    if (!user) {
      await bot.sendMessage(chatId, 'Please register first using /start');
      return;
    }

    const beneficiaries = await beneficiaryServices.getBeneficiaries(user.id);

    const buttons = beneficiaries.slice(0, 5).map(b => [{
      text: `${b.name} - ${b.phone_number}`,
      callback_data: `share_${b.id}_${b.phone_number}_${b.network}`
    }]);

    buttons.push([{ text: '➕ Send to New Number', callback_data: 'share_new' }]);

    await bot.sendMessage(chatId, 'Who do you want to send airtime to?', {
      reply_markup: {
        inline_keyboard: buttons
      }
    });
  } catch (error) {
    console.error('Error in share airtime handler:', error);
    await bot.sendMessage(chatId, 'Something went wrong. Please try again.');
  }
}

async function processAirtimeSharing(bot, chatId, userId, recipientPhone, network, amount, recipientName = null) {
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

    const processingMsg = recipientName
      ? `Sending ₦${amount} airtime to ${recipientName}...`
      : `Sending ₦${amount} airtime to ${recipientPhone}...`;

    await bot.sendMessage(chatId, processingMsg);

    const result = await tranzitpayServices.buyAirtime(recipientPhone, network, amount);

    const description = recipientName
      ? `Airtime shared with ${recipientName} (${recipientPhone})`
      : `Airtime shared to ${recipientPhone}`;

    await walletServices.debitWallet(
      userId,
      amount,
      'airtime_sharing',
      description,
      {
        provider: network,
        phone: recipientPhone,
        recipient_name: recipientName,
        transaction_id: result.transaction_id
      }
    );

    const updatedWallet = await walletServices.getWallet(userId);

    const successMsg = recipientName
      ? `Airtime sent successfully to ${recipientName}!\n\n`
      : `Airtime sent successfully!\n\n`;

    await bot.sendMessage(chatId,
      successMsg +
      `Recipient: ${recipientPhone}\n` +
      `Network: ${network}\n` +
      `Amount: ₦${parseFloat(amount).toFixed(2)}\n` +
      `New Balance: ₦${parseFloat(updatedWallet.balance).toFixed(2)}`,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: '💾 Save as Beneficiary', callback_data: `save_beneficiary_${recipientPhone}_${network}` }
          ]]
        }
      }
    );
  } catch (error) {
    console.error('Error processing airtime sharing:', error);
    await bot.sendMessage(chatId, 'Failed to send airtime. Please try again.');
  }
}

async function handleBeneficiaries(bot, msg) {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;

  try {
    const user = await userServices.getUserByTelegramId(telegramId);

    if (!user) {
      await bot.sendMessage(chatId, 'Please register first using /start');
      return;
    }

    const beneficiaries = await beneficiaryServices.getBeneficiaries(user.id);

    if (beneficiaries.length === 0) {
      await bot.sendMessage(chatId,
        'You have no saved beneficiaries yet.\n\n' +
        'Send airtime to someone and save them as a beneficiary for quick access next time!',
        {
          reply_markup: {
            inline_keyboard: [[
              { text: '💸 Share Airtime', callback_data: 'share_airtime' }
            ]]
          }
        }
      );
      return;
    }

    let message = '👥 Your Beneficiaries\n\n';

    beneficiaries.forEach((b, index) => {
      message += `${index + 1}. ${b.name}\n`;
      message += `   ${b.phone_number} (${b.network})\n\n`;
    });

    const buttons = [
      [{ text: '➕ Add Beneficiary', callback_data: 'add_beneficiary' }],
      [{ text: '🗑️ Remove Beneficiary', callback_data: 'remove_beneficiary' }]
    ];

    await bot.sendMessage(chatId, message, {
      reply_markup: {
        inline_keyboard: buttons
      }
    });
  } catch (error) {
    console.error('Error in beneficiaries handler:', error);
    await bot.sendMessage(chatId, 'Failed to fetch beneficiaries. Please try again.');
  }
}

async function saveBeneficiary(bot, chatId, userId, phoneNumber, network, name) {
  try {
    await beneficiaryServices.addBeneficiary(userId, name, phoneNumber, network);

    await bot.sendMessage(chatId,
      `${name} has been saved as a beneficiary!\n\n` +
      `You can now quickly send airtime to them anytime.`
    );
  } catch (error) {
    if (error.message === 'Beneficiary already exists') {
      await bot.sendMessage(chatId, 'This contact is already saved as a beneficiary.');
    } else {
      console.error('Error saving beneficiary:', error);
      await bot.sendMessage(chatId, 'Failed to save beneficiary. Please try again.');
    }
  }
}

module.exports = {
  handleShareAirtime,
  handleBeneficiaries,
  processAirtimeSharing,
  saveBeneficiary
};
