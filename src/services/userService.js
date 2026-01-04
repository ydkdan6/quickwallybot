const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

class UserService {
  constructor() {
    // Create fresh Supabase client per instance
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }

  async getUserByTelegramId(telegramId) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async createUser(telegramId, fullName, email, pin) {
    const pinHash = await bcrypt.hash(pin, 10);

    const { data: userData, error: userError } = await this.supabase
      .from('users')
      .insert({
        telegram_id: telegramId,
        full_name: fullName,
        email: email,
        pin_hash: pinHash
      })
      .select()
      .single();

    if (userError) throw userError;

    const { data: walletData, error: walletError } = await this.supabase
      .from('wallets')
      .insert({
        user_id: userData.id,
        balance: 0.00,
        currency: 'NGN'
      })
      .select()
      .single();

    if (walletError) throw walletError;

    const { error: reminderError } = await this.supabase
      .from('reminders')
      .insert({
        user_id: userData.id,
        type: 'low_balance',
        threshold: 500.00,
        is_active: true
      });

    if (reminderError) throw reminderError;

    return { user: userData, wallet: walletData };
  }

  async verifyPin(userId, pin) {
    const { data, error } = await this.supabase
      .from('users')
      .select('pin_hash')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return await bcrypt.compare(pin, data.pin_hash);
  }

  async updateUser(userId, updates) {
    const { data, error } = await this.supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

module.exports = UserService;