# QuickWally Bot

An AI-powered Telegram bot that helps users manage wallets, buy airtime/data, pay bills, and share value with friends through natural language chat.

## Features

- **Secure User Onboarding**: Web app registration with name, email, and PIN
- **Wallet Management**: Fund wallet via Paystack, check balance, transaction history
- **VTU Services**: Buy airtime and data for all Nigerian networks
- **Airtime Sharing**: Send airtime to friends and save beneficiaries
- **Bill Payments**: Pay for cable TV and electricity
- **Smart Analytics**: Track spending with weekly/monthly summaries
- **AI Chat Support**: Natural language processing powered by Gemini API
- **Reminders**: Low balance alerts and milestone notifications
- **PIN Security**: Secure web app modals for transaction verification

## Tech Stack

- **Bot Framework**: node-telegram-bot-api
- **Database**: Supabase (PostgreSQL)
- **Payment Gateway**: Paystack
- **VTU Provider**: TranzitPay
- **AI**: Google Gemini API
- **Backend**: Express.js, Node.js
- **Security**: bcrypt for PIN hashing, JWT verification for web apps

## Prerequisites

1. Node.js (v14 or higher)
2. Supabase account and project
3. Telegram Bot Token (from @BotFather)
4. Paystack account and API keys
5. TranzitPay API key
6. Google Gemini API key

## Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

3. Configure your environment variables:

```
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
PAYSTACK_SECRET_KEY=your_paystack_secret_key
TRANZITPAY_API_KEY=your_tranzitpay_api_key
GEMINI_API_KEY=your_gemini_api_key
WEBAPP_URL=your_webapp_url
PORT=3000
```

4. Database migrations have been applied automatically to your Supabase instance.

## Running the Bot

Start both the bot and API server:

```bash
npm start
```

For development:

```bash
npm run dev
```

## Architecture

### Database Schema

- **users**: User profiles with hashed PINs
- **wallets**: User wallet balances
- **transactions**: Complete transaction history
- **beneficiaries**: Saved contacts for quick transfers
- **reminders**: Low balance and milestone alerts
- **payment_links**: Paystack payment tracking

### Security Features

- PIN hashing with bcrypt (10 salt rounds)
- Telegram Web App data verification
- Row Level Security (RLS) on all tables
- HTTPS-only web app communications
- Webhook signature verification

### API Endpoints

- `POST /api/register` - User registration
- `POST /api/verify-pin` - PIN verification and transaction execution
- `POST /api/webhook/paystack` - Paystack webhook for payment confirmation

### Bot Commands

- `/start` - Initialize bot and register/login

### Natural Language Examples

- "Buy 500 naira MTN airtime"
- "Share 200 naira with Praise"
- "Check my balance"
- "Show my spending this week"
- "Buy 2GB data for Airtel"

## Deployment

### Bot Deployment

Deploy to any Node.js hosting platform (Heroku, Railway, DigitalOcean, etc.)

### Web App Deployment

Deploy the `webapp/` folder to a static hosting service with HTTPS support:
- Vercel
- Netlify
- GitHub Pages with custom domain

Update `WEBAPP_URL` in your `.env` to point to your deployed web app.

### Webhook Configuration

Configure Paystack webhook URL in your Paystack dashboard:
```
https://your-api-domain.com/api/webhook/paystack
```

## Bot Personality

QuickWally is friendly, professional, trustworthy, and has a Nigerian GenZ vibe. Responses are:
- Short and conversational
- Clear and helpful
- Professional but friendly
- Uses selective emojis

## Support

For issues or questions, contact the development team.

## License

Private - All rights reserved
