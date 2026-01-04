import { createClient } from "@supabase/supabase-js";

class AnalyticsService {
  constructor() {
    // Create fresh Supabase client per instance
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }

  async getSpendingSummary(userId, period = 'weekly') {
    const now = new Date();
    let startDate;

    if (period === 'weekly') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'monthly') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const { data, error } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'debit')
      .eq('status', 'success')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    const summary = {
      period: period,
      total_spent: 0,
      categories: {},
      transaction_count: data.length
    };

    data.forEach(tx => {
      summary.total_spent += parseFloat(tx.amount);

      if (!summary.categories[tx.category]) {
        summary.categories[tx.category] = {
          amount: 0,
          count: 0
        };
      }

      summary.categories[tx.category].amount += parseFloat(tx.amount);
      summary.categories[tx.category].count += 1;
    });

    return summary;
  }

  async getCategoryBreakdown(userId, category, limit = 10) {
    const { data, error } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('category', category)
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  async getTopSpendingCategories(userId, period = 'monthly') {
    const summary = await this.getSpendingSummary(userId, period);

    const sorted = Object.entries(summary.categories)
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count
      }))
      .sort((a, b) => b.amount - a.amount);

    return sorted.slice(0, 5);
  }

  async formatSpendingSummary(summary) {
    let message = `📊 Spending Summary (${summary.period})\n\n`;
    message += `💰 Total Spent: ₦${summary.total_spent.toFixed(2)}\n`;
    message += `📝 Transactions: ${summary.transaction_count}\n\n`;
    message += `📈 Breakdown by Category:\n`;

    const sortedCategories = Object.entries(summary.categories)
      .sort(([, a], [, b]) => b.amount - a.amount);

    sortedCategories.forEach(([category, data]) => {
      message += `• ${category}: ₦${data.amount.toFixed(2)} (${data.count} transactions)\n`;
    });

    return message;
  }
}

// Export class, not instance
module.exports = AnalyticsService;