/*
  # QuickWally Bot Database Schema
  
  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `telegram_id` (bigint, unique) - User's Telegram ID
      - `full_name` (text) - User's full name
      - `email` (text, unique) - User's email address
      - `pin_hash` (text) - Hashed + salted transaction PIN
      - `is_active` (boolean) - Account status
      - `created_at` (timestamptz) - Registration timestamp
      - `updated_at` (timestamptz) - Last update timestamp
    
    - `wallets`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key) - Links to users table
      - `balance` (decimal) - Current wallet balance
      - `currency` (text) - Currency type (NGN)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `transactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `wallet_id` (uuid, foreign key)
      - `type` (text) - Transaction type (credit, debit)
      - `category` (text) - Category (funding, airtime, data, transfer, etc.)
      - `amount` (decimal) - Transaction amount
      - `balance_before` (decimal) - Wallet balance before transaction
      - `balance_after` (decimal) - Wallet balance after transaction
      - `description` (text) - Transaction description
      - `reference` (text, unique) - Unique transaction reference
      - `status` (text) - Transaction status (pending, success, failed)
      - `metadata` (jsonb) - Additional transaction data
      - `created_at` (timestamptz)
    
    - `beneficiaries`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `name` (text) - Beneficiary name
      - `phone_number` (text) - Beneficiary phone number
      - `network` (text) - Network provider (MTN, Airtel, Glo, 9mobile)
      - `created_at` (timestamptz)
    
    - `reminders`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `type` (text) - Reminder type (low_balance, milestone)
      - `threshold` (decimal) - Balance threshold for low_balance reminders
      - `is_active` (boolean) - Whether reminder is active
      - `last_sent` (timestamptz) - Last time reminder was sent
      - `created_at` (timestamptz)
    
    - `payment_links`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `amount` (decimal) - Payment amount
      - `reference` (text, unique) - Paystack reference
      - `authorization_url` (text) - Paystack payment URL
      - `status` (text) - Payment status (pending, completed, failed)
      - `expires_at` (timestamptz) - Link expiration time
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access only their own data
    - Service role bypasses RLS for bot operations
  
  3. Important Notes
    - All monetary amounts use decimal(12,2) for precision
    - Transaction references are unique and indexed for fast lookups
    - Metadata field stores additional info (recipient details, provider response, etc.)
    - PIN is hashed with bcrypt before storage, never stored in plain text
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id bigint UNIQUE NOT NULL,
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  pin_hash text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance decimal(12,2) DEFAULT 0.00,
  currency text DEFAULT 'NGN',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id uuid NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('credit', 'debit')),
  category text NOT NULL,
  amount decimal(12,2) NOT NULL CHECK (amount > 0),
  balance_before decimal(12,2) NOT NULL,
  balance_after decimal(12,2) NOT NULL,
  description text NOT NULL,
  reference text UNIQUE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create beneficiaries table
CREATE TABLE IF NOT EXISTS beneficiaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone_number text NOT NULL,
  network text NOT NULL CHECK (network IN ('MTN', 'Airtel', 'Glo', '9mobile')),
  created_at timestamptz DEFAULT now()
);

-- Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('low_balance', 'milestone')),
  threshold decimal(12,2) DEFAULT 500.00,
  is_active boolean DEFAULT true,
  last_sent timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create payment_links table
CREATE TABLE IF NOT EXISTS payment_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount decimal(12,2) NOT NULL CHECK (amount > 0),
  reference text UNIQUE NOT NULL,
  authorization_url text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_user_id ON beneficiaries(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_reference ON payment_links(reference);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for wallets table
CREATE POLICY "Users can view own wallet"
  ON wallets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own wallet"
  ON wallets FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for transactions table
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for beneficiaries table
CREATE POLICY "Users can view own beneficiaries"
  ON beneficiaries FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own beneficiaries"
  ON beneficiaries FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own beneficiaries"
  ON beneficiaries FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own beneficiaries"
  ON beneficiaries FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for reminders table
CREATE POLICY "Users can view own reminders"
  ON reminders FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own reminders"
  ON reminders FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own reminders"
  ON reminders FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for payment_links table
CREATE POLICY "Users can view own payment links"
  ON payment_links FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own payment links"
  ON payment_links FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());