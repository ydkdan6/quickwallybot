import Groq from "groq-sdk";

class groqService {
  constructor() {
    this.client = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
    this.model = 'openai/gpt-oss-120b' || 'llama-3.3-70b-versatile';
  }

  async parseIntent(message, userName) {
    const prompt = `You are QuickWally Bot, a friendly Nigerian fintech assistant. Parse this user message and extract the intent and parameters.

User: ${userName}
Message: "${message}"

Identify the intent from these options:
- buy_airtime: User wants to buy airtime
- buy_data: User wants to buy data
- share_airtime: User wants to send airtime to someone
- fund_wallet: User wants to add money to wallet
- check_balance: User wants to see wallet balance
- transaction_history: User wants to see past transactions
- add_beneficiary: User wants to save a contact
- pay_bills: User wants to pay cable/electricity bills
- analytics: User wants spending summary
- general_chat: Just conversation/greeting

Extract these parameters if mentioned:
- amount: Any monetary value (numbers only)
- network: MTN, Airtel, Glo, or 9mobile
- phone_number: Phone number if mentioned
- recipient_name: Name of person to send to
- period: weekly or monthly (for analytics)

Respond ONLY with valid JSON in this exact format:
{
  "intent": "intent_name",
  "parameters": {
    "amount": "value or null",
    "network": "value or null",
    "phone_number": "value or null",
    "recipient_name": "value or null",
    "period": "value or null"
  },
  "confidence": 0.0-1.0
}`;

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a JSON-only response assistant. Always respond with valid JSON and nothing else.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      });

      const text = completion.choices[0].message.content;
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Try parsing directly if no match
      try {
        return JSON.parse(text);
      } catch {
        return {
          intent: 'general_chat',
          parameters: {},
          confidence: 0.5
        };
      }
    } catch (error) {
      console.error('Groq API error:', error.message);
      return {
        intent: 'general_chat',
        parameters: {},
        confidence: 0.3
      };
    }
  }

  async generateResponse(context, userName) {
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are QuickWally Bot, a friendly Nigerian fintech assistant with a GenZ vibe. Keep responses short, clear, and conversational. Be professional but friendly. Use Nigerian English expressions where appropriate. Keep responses under 2-3 sentences.'
          },
          {
            role: 'user',
            content: `User: ${userName}\nContext: ${context}\n\nGenerate a natural, helpful response.`
          }
        ],
        temperature: 0.7,
        max_tokens: 200
      });

      return completion.choices[0].message.content.trim();
    } catch (error) {
      console.error('Groq API error:', error.message);
      return "I'm having trouble processing that right now. Try again in a bit!";
    }
  }
}

// Export class, not instance
module.exports = groqService;