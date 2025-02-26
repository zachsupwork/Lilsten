
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...data } = await req.json();
    console.log(`Received request for action: ${action}`, data);

    switch (action) {
      case 'createCustomer': {
        const { email, userId } = data;
        if (!email || !userId) {
          throw new Error('Missing required fields for customer creation');
        }

        console.log(`Creating customer for email: ${email}`);
        const customer = await stripe.customers.create({
          email,
          metadata: {
            userId,
          },
        });
        console.log('Customer created:', customer.id);

        return new Response(
          JSON.stringify({ customerId: customer.id }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        );
      }

      case 'createSubscription': {
        const { customerId, userId, setupFeeCents, monthlyFeeCents, callCostMultiplier } = data;
        if (!customerId || !userId) {
          throw new Error('Missing required fields for subscription creation');
        }

        console.log(`Creating subscription for customer: ${customerId}`);

        // Create the subscription with both the base plan and metered usage
        const subscription = await stripe.subscriptions.create({
          customer: customerId,
          items: [
            {
              price: 'price_1Qm5idByONQ6hwN80JEFyi9u', // Base plan price ID
            },
            {
              price: 'price_1QmJTdByONQ6hwN8r7WICskN', // Metered usage price ID
            },
          ],
          payment_behavior: 'default_incomplete',
          collection_method: 'charge_automatically',
          metadata: {
            userId,
            setupFeeCents,
            monthlyFeeCents,
            callCostMultiplier,
          },
        });

        console.log('Subscription created:', subscription.id);

        return new Response(
          JSON.stringify({ subscriptionId: subscription.id }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        );
      }

      case 'reportUsage': {
        const { subscriptionItemId, quantity } = data;
        if (!subscriptionItemId || quantity === undefined) {
          throw new Error('Missing required fields for usage reporting');
        }

        console.log(`Reporting usage for subscription item: ${subscriptionItemId}, quantity: ${quantity}`);
        
        const usageRecord = await stripe.subscriptionItems.createUsageRecord(
          subscriptionItemId,
          {
            quantity,
            timestamp: 'now',
            action: 'increment',
          }
        );

        console.log('Usage record created:', usageRecord.id);

        return new Response(
          JSON.stringify({ usageRecordId: usageRecord.id }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Error processing request:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        details: error.type || error.code || 'unknown'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});
