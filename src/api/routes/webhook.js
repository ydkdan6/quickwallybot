const crypto = require('crypto');
import  PaystackService from '../../services/paystackService';
import WalletService from  '../../services/walletService';

module.exports = async (req, res) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Create new instances per request (stateless)
  const paystackService = new PaystackService();
  const walletService = new WalletService();

  try {
    // Verify Paystack signature
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;
    console.log('Webhook event received:', event.event);

    if (event.event === 'charge.success') {
      const reference = event.data.reference;
      const amount = event.data.amount / 100; // Convert from kobo to naira
      const customerEmail = event.data.customer.email;

      console.log(`Processing payment: ${reference}, Amount: ₦${amount}`);

      const paymentLink = await paystackService.getPaymentLink(reference);

      if (!paymentLink) {
        console.error('Payment link not found:', reference);
        return res.status(404).json({ error: 'Payment link not found' });
      }

      if (paymentLink.status === 'completed') {
        console.log('Payment already processed:', reference);
        return res.status(200).json({ message: 'Payment already processed' });
      }

      // Credit wallet
      await walletService.creditWallet(
        paymentLink.user_id,
        amount,
        'Wallet funding via Paystack',
        { 
          reference: reference, 
          payment_method: 'paystack',
          customer_email: customerEmail 
        }
      );

      // Update payment status
      await paystackService.updatePaymentStatus(reference, 'completed');

      console.log(`✅ Wallet credited: User ${paymentLink.user_id}, Amount: ₦${amount}`);
    }

    // Always return 200 to Paystack
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    // Return 200 even on error to prevent Paystack retries
    res.status(200).json({ error: 'Webhook processing failed' });
  }
};