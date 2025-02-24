
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...data } = await req.json();

    switch (action) {
      case 'createCustomer':
        const customer = await stripe.customers.create({
          email: data.email,
          metadata: {
            user_id: data.userId,
          },
        });
        
        console.log('Created Stripe customer:', customer.id);
        return new Response(JSON.stringify({ customerId: customer.id }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'setupIntent':
        const setupIntent = await stripe.setupIntents.create({
          customer: data.customerId,
          payment_method_types: ['card'],
          usage: 'off_session',
        });
        
        console.log('Created setup intent:', setupIntent.client_secret);
        return new Response(JSON.stringify({ clientSecret: setupIntent.client_secret }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'createSubscription':
        // Create usage-based price for call charges (3x the current cost)
        const meteredPrice = await stripe.prices.create({
          unit_amount_decimal: (data.currentCallCost * 3 * 100).toString(), // Convert to cents
          currency: 'usd',
          recurring: {
            interval: 'month',
            usage_type: 'metered',
          },
          product_data: {
            name: 'Call Usage',
          },
          metadata: {
            type: 'call_usage',
          },
        });

        // Create fixed price for monthly subscription
        const subscriptionPrice = await stripe.prices.create({
          unit_amount: data.monthlyFee * 100, // Convert to cents
          currency: 'usd',
          recurring: {
            interval: 'month',
          },
          product_data: {
            name: 'Monthly Subscription',
          },
          metadata: {
            type: 'subscription',
          },
        });

        // Create the subscription with both prices
        const subscription = await stripe.subscriptions.create({
          customer: data.customerId,
          items: [
            {
              price: subscriptionPrice.id,
            },
            {
              price: meteredPrice.id,
            },
          ],
          payment_settings: {
            payment_method_types: ['card'],
            save_default_payment_method: 'on_subscription',
          },
          metadata: {
            user_id: data.userId,
          },
        });

        // Charge setup fee immediately
        const setupCharge = await stripe.charges.create({
          amount: data.setupFee * 100, // Convert to cents
          currency: 'usd',
          customer: data.customerId,
          description: 'Setup fee',
        });

        console.log('Created subscription:', subscription.id);
        return new Response(JSON.stringify({
          subscriptionId: subscription.id,
          setupChargeId: setupCharge.id,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'reportUsage':
        // Only report usage if credit balance is below zero
        if (data.creditBalance < 0) {
          const subscription = await stripe.subscriptions.retrieve(data.subscriptionId);
          const usageItem = subscription.items.data.find(
            item => item.price.metadata.type === 'call_usage'
          );

          if (usageItem) {
            await stripe.subscriptionItems.createUsageRecord(
              usageItem.id,
              {
                quantity: data.units,
                timestamp: Math.floor(Date.now() / 1000),
                action: 'increment',
              }
            );
            console.log('Reported usage:', data.units);
          }
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Error in stripe-billing function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
