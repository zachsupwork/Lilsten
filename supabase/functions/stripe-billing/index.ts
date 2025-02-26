
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import Stripe from 'https://esm.sh/stripe@13.8.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Handle CORS preflight requests
const handleCors = (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
}

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
})

Deno.serve(async (req) => {
  try {
    // Handle CORS
    const corsResponse = handleCors(req)
    if (corsResponse) return corsResponse

    const { action, userId, amount } = await req.json()
    console.log(`Processing ${action} for user ${userId} with amount ${amount}`)

    if (action === 'createPaymentSession') {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product: 'prod_default', // Replace with your actual product ID
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${req.headers.get('origin')}/calls?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.get('origin')}/calls`,
        metadata: {
          userId: userId,
        },
      })

      return new Response(
        JSON.stringify({ sessionUrl: session.url }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    } 
    
    else if (action === 'handlePaymentSuccess') {
      const { sessionId } = await req.json()
      const session = await stripe.checkout.sessions.retrieve(sessionId)

      if (session.payment_status === 'paid') {
        const userId = session.metadata?.userId
        const amountPaid = session.amount_total // Amount in cents

        // Update user's credit balance
        const { error: updateError } = await supabaseClient
          .from('user_billing')
          .upsert({
            user_id: userId,
            credit_balance_cents: amountPaid,
          })

        if (updateError) {
          console.error('Error updating credit balance:', updateError)
          throw updateError
        }

        return new Response(
          JSON.stringify({ success: true, creditBalance: amountPaid }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
