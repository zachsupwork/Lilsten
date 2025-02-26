
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.1.1?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Stripe with the secret key
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  httpClient: Stripe.createFetchHttpClient(),
});

const SUBSCRIPTION_PRICE_ID = 'price_1Qm5idByONQ6hwN80JEFyi9u';
const METERED_USAGE_PRICE_ID = 'price_1QmJTdByONQ6hwN8r7WICskN';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, email, userId, customerId, setupFeeCents, monthlyFeeCents, callCostMultiplier } = await req.json();

    switch (action) {
      case 'createCustomer':
        console.log('Creating Stripe customer:', { email, userId });
        if (!email || !userId) {
          throw new Error('Email and userId are required');
        }

        const customer = await stripe.customers.create({
          email,
          metadata: {
            userId
          }
        });

        console.log('Customer created successfully:', customer.id);
        return new Response(JSON.stringify({ customerId: customer.id }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'setupIntent':
        const setupIntent = await stripe.setupIntents.create({
          customer: customerId,
          payment_method_types: ['card'],
        });
        return new Response(JSON.stringify({ clientSecret: setupIntent.client_secret }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'createSubscription':
        // Create a subscription with both the fixed monthly price and metered usage
        const subscription = await stripe.subscriptions.create({
          customer: customerId,
          items: [
            {
              price: SUBSCRIPTION_PRICE_ID, // Monthly subscription price
            },
            {
              price: METERED_USAGE_PRICE_ID, // Metered usage price
            }
          ],
          payment_behavior: 'default_incomplete',
          payment_settings: {
            save_default_payment_method: 'on_subscription',
          },
          expand: ['latest_invoice.payment_intent'],
          metadata: {
            userId,
          },
        });

        // If there's a setup fee, create a one-time invoice item
        if (setupFeeCents > 0) {
          await stripe.invoiceItems.create({
            customer: customerId,
            amount: setupFeeCents,
            currency: 'usd',
            description: 'One-time setup fee',
          });
        }

        return new Response(JSON.stringify({
          subscriptionId: subscription.id,
          clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'reportUsage':
        const { subscriptionItemId, quantity } = await req.json();
        
        const usageRecord = await stripe.subscriptionItems.createUsageRecord(
          subscriptionItemId,
          {
            quantity,
            timestamp: 'now',
            action: 'increment',
          }
        );

        return new Response(JSON.stringify({ usageRecord }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        throw new Error('Unknown action');
    }
  } catch (error) {
    console.error('Stripe billing error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
