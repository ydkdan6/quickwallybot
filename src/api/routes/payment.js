// routes/payment.js - Add this to your Express routes

const express = require('express');
const router = express.Router();
const PaystackService = require('../services/paystackService');
const WalletService = require('../services/walletService');

const paystackService = new PaystackService();
const walletService = new WalletService();

/**
 * GET /api/payment/verify
 * Verify payment from callback page
 */
router.get('/verify', async (req, res) => {
  const { reference } = req.query;

  if (!reference) {
    return res.status(400).json({
      success: false,
      message: 'Payment reference is required'
    });
  }

  try {
    // Get payment details from database
    const paymentLink = await paystackService.getPaymentLink(reference);

    if (!paymentLink) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check if already processed
    if (paymentLink.status === 'completed') {
      return res.json({
        success: true,
        amount: paymentLink.amount,
        message: 'Payment already processed'
      });
    }

    // Verify with Paystack
    const verification = await paystackService.verifyPayment(reference);

    if (verification.success) {
      // Update payment status
      await paystackService.updatePaymentStatus(
        reference, 
        'completed', 
        verification.transaction_id
      );

      // Credit user wallet
      await walletService.creditWallet(
        paymentLink.user_id,
        verification.amount,
        'deposit',
        `Wallet funding - ${reference}`,
        { 
          payment_method: 'paystack',
          transaction_id: verification.transaction_id,
          reference: reference
        }
      );

      return res.json({
        success: true,
        amount: verification.amount,
        message: 'Payment verified and wallet credited'
      });
    } else {
      // Update payment status to failed
      await paystackService.updatePaymentStatus(reference, 'failed');

      return res.json({
        success: false,
        message: verification.message || 'Payment verification failed'
      });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to verify payment. Please contact support.'
    });
  }
});

/**
 * POST /api/payment/webhook
 * Handle Paystack webhook events
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['x-paystack-signature'];

  try {
    const payload = JSON.parse(req.body.toString());
    const result = await paystackService.handleWebhook(payload, signature);

    if (result.success) {
      // Credit wallet
      const paymentLink = await paystackService.getPaymentLink(result.reference);
      
      if (paymentLink && paymentLink.status !== 'completed') {
        await walletService.creditWallet(
          paymentLink.user_id,
          result.amount,
          'deposit',
          `Wallet funding - ${result.reference}`,
          { 
            payment_method: 'paystack',
            reference: result.reference
          }
        );
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send('Webhook processing failed');
  }
});

module.exports = router;