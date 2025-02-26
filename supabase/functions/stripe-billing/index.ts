
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

    // Get auth token from request header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Verify the user session
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Invalid session')
    }

    const { action, userId, amount } = await req.json()
    console.log(`Processing ${action} for user ${userId} with amount ${amount}`)

    if (action === 'createPaymentSession') {
      // Verify that the requesting user matches the intended userId
      if (user.id !== userId) {
        throw new Error('Unauthorized: User ID mismatch')
      }

      const { data: billingSettings, error: billingError } = await supabaseClient
        .from('billing_settings')
        .select('*')
        .single()

      if (billingError) throw billingError

      let priceId
      const totalAmount = billingSettings.setup_fee_cents + billingSettings.monthly_fee_cents
      
      if (totalAmount <= 15000) { // $150
        priceId = 'price_1QwZ0uByONQ6hwN8cghyKMTr'
      } else if (totalAmount <= 25000) { // $250
        priceId = 'price_1QwZ1OByONQ6hwN8cHVNJgJP'
      } else {
        priceId = 'price_1QwZ2MByONQ6hwN81gRUV81O'
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
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
