import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

class WalletService {
  constructor() {
    // Create fresh Supabase client per instance (stateless)
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }

  async getWallet(userId) {
    const { data, error } = await this.supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  async creditWallet(userId, amount, description, metadata = {}) {
    const wallet = await this.getWallet(userId);
    const newBalance = parseFloat(wallet.balance) + parseFloat(amount);
    const reference = `CR-${nanoid(12)}`;

    const { data: txData, error: txError } = await this.supabase
      .from('transactions')
      .insert({
        user_id: userId,
        wallet_id: wallet.id,
        type: 'credit',
        category: 'funding',
        amount: amount,
        balance_before: wallet.balance,
        balance_after: newBalance,
        description: description,
        reference: reference,
        status: 'success',
        metadata: metadata
      })
      .select()
      .single();

    if (txError) throw txError;

    const { data: walletData, error: walletError } = await this.supabase
      .from('wallets')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', wallet.id)
      .select()
      .single();

    if (walletError) throw walletError;

    return { transaction: txData, wallet: walletData };
  }

  async debitWallet(userId, amount, category, description, metadata = {}) {
    const wallet = await this.getWallet(userId);

    if (parseFloat(wallet.balance) < parseFloat(amount)) {
      throw new Error('Insufficient balance');
    }

    const newBalance = parseFloat(wallet.balance) - parseFloat(amount);
    const reference = `DB-${nanoid(12)}`;

    const { data: txData, error: txError } = await this.supabase
      .from('transactions')
      .insert({
        user_id: userId,
        wallet_id: wallet.id,
        type: 'debit',
        category: category,
        amount: amount,
        balance_before: wallet.balance,
        balance_after: newBalance,
        description: description,
        reference: reference,
        status: 'success',
        metadata: metadata
      })
      .select()
      .single();

    if (txError) throw txError;

    const { data: walletData, error: walletError } = await this.supabase
      .from('wallets')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', wallet.id)
      .select()
      .single();

    if (walletError) throw walletError;

    return { transaction: txData, wallet: walletData };
  }

  async getTransactionHistory(userId, limit = 10) {
    const { data, error } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  async getTransactionByReference(reference) {
    const { data, error } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('reference', reference)
      .maybeSingle();

    if (error) throw error;
    return data;
  }
}

module.exports = WalletService;