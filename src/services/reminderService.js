import { createClient } from "@supabase/supabase-js";

class ReminderService {
  constructor() {
    // Create fresh Supabase client per instance
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }

  async checkLowBalanceReminders(bot) {
    try {
      const { data: reminders, error } = await this.supabase
        .from('reminders')
        .select(`
          *,
          users!inner(id, telegram_id, full_name),
          wallets!inner(balance)
        `)
        .eq('type', 'low_balance')
        .eq('is_active', true);

      if (error) throw error;

      for (const reminder of reminders) {
        const balance = parseFloat(reminder.wallets.balance);
        const threshold = parseFloat(reminder.threshold);

        if (balance < threshold) {
          const lastSent = reminder.last_sent ? new Date(reminder.last_sent) : null;
          const now = new Date();
          const hoursSinceLastSent = lastSent
            ? (now - lastSent) / (1000 * 60 * 60)
            : 25;

          if (hoursSinceLastSent >= 24) {
            await bot.sendMessage(
              reminder.users.telegram_id,
              `Hey ${reminder.users.full_name}! Your wallet balance is running low.\n\n` +
              `Current balance: ₦${balance.toFixed(2)}\n\n` +
              `Consider topping up to keep enjoying seamless transactions.`,
              {
                reply_markup: {
                  inline_keyboard: [[
                    { text: '💰 Fund Wallet', callback_data: 'fund_wallet' }
                  ]]
                }
              }
            );

            await this.supabase
              .from('reminders')
              .update({ last_sent: now.toISOString() })
              .eq('id', reminder.id);
          }
        }
      }
    } catch (error) {
      console.error('Error checking low balance reminders:', error);
    }
  }

  async checkMilestoneReminders(bot) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: users, error } = await this.supabase
        .from('users')
        .select(`
          id,
          telegram_id,
          full_name,
          created_at
        `)
        .eq('is_active', true);

      if (error) throw error;

      for (const user of users) {
        const { data: transactions, error: txError } = await this.supabase
          .from('transactions')
          .select('amount, created_at')
          .eq('user_id', user.id)
          .eq('type', 'debit')
          .eq('status', 'success')
          .gte('created_at', thirtyDaysAgo.toISOString());

        if (txError) continue;

        const totalSpent = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
        const txCount = transactions.length;

        if (txCount >= 10 && txCount % 10 === 0) {
          await bot.sendMessage(
            user.telegram_id,
            `🎉 Congratulations, ${user.full_name}! You've completed ${txCount} transactions.\n\n` +
            `Total value: ₦${totalSpent.toFixed(2)}\n\n` +
            `Thank you for using QuickWally! Keep enjoying seamless transactions.`
          );
        }

        if (totalSpent >= 10000 && totalSpent % 10000 < 100) {
          await bot.sendMessage(
            user.telegram_id,
            `🌟 Amazing milestone, ${user.full_name}! You've transacted over ₦${totalSpent.toFixed(2)} in the last 30 days.\n\n` +
            `We appreciate your continued trust in QuickWally!`
          );
        }
      }
    } catch (error) {
      console.error('Error checking milestone reminders:', error);
    }
  }

  async updateReminderSettings(userId, type, threshold, isActive) {
    const { data, error } = await this.supabase
      .from('reminders')
      .update({
        threshold: threshold,
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('type', type)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  // NOTE: This won't work in serverless - see note below
  startReminderScheduler(bot) {
    setInterval(() => {
      this.checkLowBalanceReminders(bot);
    }, 60 * 60 * 1000);

    setInterval(() => {
      this.checkMilestoneReminders(bot);
    }, 24 * 60 * 60 * 1000);

    console.log('⚠️  WARNING: Reminder scheduler started but will not persist in serverless');
  }
}

// Export class, not instance
module.exports = ReminderService;