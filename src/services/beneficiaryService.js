const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

class BeneficiaryService {
  constructor() {
    // Create Supabase client
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }

  async addBeneficiary(userId, name, phoneNumber, network) {
    const existing = await this.getBeneficiaryByPhone(userId, phoneNumber);
    if (existing) {
      throw new Error('Beneficiary already exists');
    }

    const { data, error } = await this.supabase
      .from('beneficiaries')
      .insert({
        user_id: userId,
        name: name,
        phone_number: phoneNumber,
        network: network
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getBeneficiaries(userId) {
    const { data, error } = await this.supabase
      .from('beneficiaries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getBeneficiaryByPhone(userId, phoneNumber) {
    const { data, error } = await this.supabase
      .from('beneficiaries')
      .select('*')
      .eq('user_id', userId)
      .eq('phone_number', phoneNumber)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async deleteBeneficiary(userId, beneficiaryId) {
    const { error } = await this.supabase
      .from('beneficiaries')
      .delete()
      .eq('id', beneficiaryId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  }

  async updateBeneficiary(userId, beneficiaryId, updates) {
    const { data, error } = await this.supabase
      .from('beneficiaries')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', beneficiaryId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

// Export singleton instance (recommended)
module.exports = BeneficiaryService;