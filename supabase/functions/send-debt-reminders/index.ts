import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface Debt {
  id: string;
  user_id: string;
  debtor_name: string;
  debtor_phone: string;
  amount: number;
  due_date: string;
  status: string;
  reminded: boolean;
}

interface Profile {
  id: string;
  full_name: string | null;
  notifications_enabled: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const termiiApiKey = Deno.env.get('VITE_TERMII_API_KEY');
    const termiiSenderId = Deno.env.get('VITE_TERMII_SENDER_ID') || 'OweMe';

    if (!termiiApiKey) {
      console.error('Termii API key not configured');
      return new Response(
        JSON.stringify({ error: 'Termii API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const { data: debts, error: debtsError } = await supabase
      .from('debts')
      .select('*')
      .eq('status', 'pending')
      .eq('reminded', false)
      .eq('due_date', todayStr);

    if (debtsError) {
      throw debtsError;
    }

    if (!debts || debts.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No debts to remind today', count: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const results = {
      total: debts.length,
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const debt of debts as Debt[]) {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', debt.user_id)
          .single();

        if (profileError || !profile) {
          console.error('Profile not found for user:', debt.user_id);
          results.skipped++;
          continue;
        }

        const userProfile = profile as Profile;

        if (!userProfile.notifications_enabled) {
          console.log('Notifications disabled for user:', debt.user_id);
          results.skipped++;
          continue;
        }

        const userName = userProfile.full_name || 'your lender';
        const message = `Hello 👋 This is a gentle reminder that ₦${debt.amount.toLocaleString()} borrowed from ${userName} is due today. Please let me know if you need more time. Thanks 🙏`;

        const smsPayload = {
          api_key: termiiApiKey,
          to: debt.debtor_phone,
          from: termiiSenderId,
          sms: message,
          type: 'plain',
          channel: 'dnd',
        };

        const termiiResponse = await fetch('https://v3.api.termii.com/api/sms/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(smsPayload),
        });

        const termiiResult = await termiiResponse.json();

        if (termiiResult.code === 'ok' || termiiResult.message === 'Successfully Sent') {
          const { error: updateError } = await supabase
            .from('debts')
            .update({ reminded: true })
            .eq('id', debt.id);

          if (updateError) {
            console.error('Error updating debt:', updateError);
            results.errors.push(`Failed to update debt ${debt.id}`);
          } else {
            results.sent++;
          }
        } else {
          console.error('Termii API error:', termiiResult);
          results.failed++;
          results.errors.push(`Failed to send SMS to ${debt.debtor_phone}: ${JSON.stringify(termiiResult)}`);

          await new Promise((resolve) => setTimeout(resolve, 1000));

          const retryResponse = await fetch('https://api.ng.termii.com/api/sms/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(smsPayload),
          });

          const retryResult = await retryResponse.json();

          if (retryResult.code === 'ok' || retryResult.message === 'Successfully Sent') {
            const { error: updateError } = await supabase
              .from('debts')
              .update({ reminded: true })
              .eq('id', debt.id);

            if (!updateError) {
              results.sent++;
              results.failed--;
            }
          }
        }
      } catch (error) {
        console.error('Error processing debt:', error);
        results.failed++;
        results.errors.push(`Error processing debt ${debt.id}: ${error}`);
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Reminder processing complete',
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in send-debt-reminders function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});