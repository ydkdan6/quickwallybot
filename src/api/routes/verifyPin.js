const express =  require('express');
const router = express.Router();
const userService = require('../../services/userService');
const walletService = require('../../services/walletService');
const tranzitpayService = require('../../services/tranzitpayService');
const { validateTelegramWebAppData } = require('../utils/telegramAuth');

router.post('/', async (req, res) => {
  const userServices = new userService();
  const walletServices = new walletService();
  const tranzitpayServices = new tranzitpayService();

  try {
    const { user_id, pin, action, init_data } = req.body;

    if (!user_id || !pin || !action) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const isValidPin = await userServices.verifyPin(user_id, pin);

    if (!isValidPin) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    let result;

    if (action === 'airtime') {
      const { network, phone, amount } = req.body;

      const wallet = await walletServices.getWallet(user_id);

      if (parseFloat(wallet.balance) < parseFloat(amount)) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      const txResult = await tranzitpayServices.buyAirtime(phone, network, amount);

      await walletServices.debitWallet(
        user_id,
        amount,
        'airtime',
        `${network} airtime purchase - ${phone}`,
        { provider: network, phone: phone, transaction_id: txResult.transaction_id }
      );

      result = {
        success: true,
        message: `Airtime purchased successfully! ₦${parseFloat(amount).toFixed(2)} sent to ${phone}`
      };
    } else if (action === 'data') {
      const { network, phone, plan, price } = req.body;

      const wallet = await walletServices.getWallet(user_id);

      if (parseFloat(wallet.balance) < parseFloat(price)) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      const txResult = await tranzitpayServices.buyData(phone, network, plan);

      await walletServices.debitWallet(
        user_id,
        price,
        'data',
        `${network} ${plan} data - ${phone}`,
        { provider: network, phone: phone, plan: plan, transaction_id: txResult.transaction_id }
      );

      result = {
        success: true,
        message: `Data purchased successfully! ${plan} sent to ${phone}`
      };
    } else if (action === 'share') {
      const { network, phone, amount } = req.body;

      const wallet = await walletServices.getWallet(user_id);

      if (parseFloat(wallet.balance) < parseFloat(amount)) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      const txResult = await tranzitpayServices.buyAirtime(phone, network, amount);

      await walletServices.debitWallet(
        user_id,
        amount,
        'airtime_sharing',
        `Airtime shared to ${phone}`,
        { provider: network, phone: phone, transaction_id: txResult.transaction_id }
      );

      result = {
        success: true,
        message: `Airtime shared successfully! ₦${parseFloat(amount).toFixed(2)} sent to ${phone}`
      };
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    res.json(result);
  } catch (error) {
    console.error('PIN verification error:', error);
    res.status(500).json({ error: error.message || 'Transaction failed. Please try again.' });
  }
});

module.exports = router;
