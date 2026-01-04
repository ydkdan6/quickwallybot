const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { nanoid } = require('nanoid');

class PaystackService {
  constructor() {
    this.apiKey = process.env.PAYSTACK_SECRET_KEY;
    this.baseUrl = 'https://api.paystack.co';
    // Create fresh Supabase client per instance
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }

  async initializePayment(userId, email, amount) {
    const reference = `PAY-${nanoid(16)}`;
    const amountInKobo = parseFloat(amount) * 100;

    try {
      const response = await axios.post(
        `${this.baseUrl}/transaction/initialize`,
        {
          email: email,
          amount: amountInKobo,
          reference: reference,
          callback_url: `${process.env.WEBAPP_URL}/payment/callback`
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      const { data, error } = await this.supabase
        .from('payment_links')
        .insert({
          user_id: userId,
          amount: amount,
          reference: reference,
          authorization_url: response.data.data.authorization_url,
          status: 'pending',
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return {
        authorization_url: response.data.data.authorization_url,
        reference: reference
      };
    } catch (error) {
      throw new Error(`Payment initialization failed: ${error.message}`);
    }
  }

  async verifyPayment(reference) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`
          }
        }
      );

      return response.data.data;
    } catch (error) {
      throw new Error(`Payment verification failed: ${error.message}`);
    }
  }

  async updatePaymentStatus(reference, status) {
    const { data, error } = await this.supabase
      .from('payment_links')
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('reference', reference)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getPaymentLink(reference) {
    const { data, error } = await this.supabase
      .from('payment_links')
      .select('*')
      .eq('reference', reference)
      .maybeSingle();

    if (error) throw error;
    return data;
  }
}

module.exports = PaystackService;