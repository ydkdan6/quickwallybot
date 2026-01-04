const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

module.exports = async (req, res) => {
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { telegram_id, full_name, email, pin } = req.body;

    // Validation
    if (!telegram_id || !full_name || !email || !pin) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!/^[0-9]{4,6}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must be 4-6 digits' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Initialize Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', telegram_id)
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({ error: 'User already registered' });
    }

    // Hash PIN
    const pinHash = await bcrypt.hash(pin, 10);

    // Split full name
    const nameParts = full_name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    // Create user
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        telegram_id: telegram_id,
        first_name: firstName,
        last_name: lastName,
        full_name: full_name,
        email: email,
        pin_hash: pinHash
      })
      .select()
      .single();

    if (userError) throw userError;

    // Create wallet
    const { data: walletData, error: walletError } = await supabase
      .from('wallets')
      .insert({
        user_id: userData.id,
        balance: 0.00,
        currency: 'NGN'
      })
      .select()
      .single();

    if (walletError) throw walletError;

    // Create reminder settings (optional)
    await supabase
      .from('reminders')
      .insert({
        user_id: userData.id,
        type: 'low_balance',
        threshold: 500.00,
        is_active: true
      });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: {
        id: userData.id,
        full_name: userData.full_name,
        email: userData.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};