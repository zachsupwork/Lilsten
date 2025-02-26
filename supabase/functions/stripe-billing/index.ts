
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.1.1?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const { action, email, userId, customerId, setupFeeCents, monthlyFeeCents, callCostMultiplier } = await req.json();

    switch (action) {
      case 'createCustomer':
        console.log('Creating Stripe customer:', { email, userId });
        if (!email || !userId) {
          throw new Error('Email and userId are required');
        }

        const customer = await stripe.customers.create({
          email,
          metadata: { userId },
        });

        console.log('Customer created successfully:', customer.id);
        return new Response(
          JSON.stringify({ customerId: customer.id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'setupIntent':
        console.log('Creating setup intent for customer:', customerId);
        const setupIntent = await stripe.setupIntents.create({
          customer: customerId,
          payment_method_types: ['card'],
        });

        return new Response(
          JSON.stringify({ clientSecret: setupIntent.client_secret }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'createSubscription':
        console.log('Creating subscription:', { customerId, setupFeeCents, monthlyFeeCents });
        if (!customerId) {
          throw new Error('Customer ID is required');
        }

        // First, retrieve the customer to ensure they exist
        await stripe.customers.retrieve(customerId);

        // Create the subscription with metered usage
        const subscription = await stripe.subscriptions.create({
          customer: customerId,
          items: [{
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'AI Call Usage',
                metadata: {
                  call_cost_multiplier: callCostMultiplier || 3.0,
                },
              },
              recurring: {
                interval: 'month',
                usage_type: 'metered',
              },
              unit_amount_decimal: '0.01', // 1 cent per unit
            },
          }],
          payment_settings: {
            payment_method_types: ['card'],
            save_default_payment_method: 'on_subscription',
          },
          metadata: {
            userId,
            setupFeeCents: setupFeeCents?.toString(),
            monthlyFeeCents: monthlyFeeCents?.toString(),
          },
        });

        console.log('Subscription created successfully:', subscription.id);

        return new Response(
          JSON.stringify({ subscriptionId: subscription.id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      default:
        throw new Error('Unknown action');
    }
  } catch (error: any) {
    console.error('Stripe billing error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
