
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RETELL_API_KEY = Deno.env.get('RETELL_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate RETELL_API_KEY
    if (!RETELL_API_KEY) {
      console.error('RETELL_API_KEY is not configured')
      return new Response(
        JSON.stringify({ error: 'API key configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { action, limit = 50, agent_id } = await req.json()
    console.log('Received action:', action, 'with agent_id:', agent_id)

    switch (action) {
      case 'getApiKey':
        return new Response(
          JSON.stringify({ RETELL_API_KEY }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'listCalls':
        console.log('Fetching calls with Retell API...')
        const response = await fetch("https://api.retellai.com/v2/list-calls", {
          method: 'POST',
          headers: {
            "Authorization": `Bearer ${RETELL_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            limit: limit,
            sort_order: "descending"
          })
        });

        if (!response.ok) {
          throw new Error(`Retell API returned ${response.status}: ${await response.text()}`)
        }

        const data = await response.json()
        console.log('Successfully fetched calls data')
        return new Response(
          JSON.stringify({ calls: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'listAgents':
        const agentsResponse = await fetch("https://api.retellai.com/list-agents", {
          method: 'GET',
          headers: {
            "Authorization": `Bearer ${RETELL_API_KEY}`,
            "Content-Type": "application/json"
          }
        });

        if (!agentsResponse.ok) {
          const errorText = await agentsResponse.text()
          console.error('Error fetching agents:', errorText)
          throw new Error(`Failed to fetch agents: ${agentsResponse.status} - ${errorText}`)
        }

        const agentsData = await agentsResponse.json()
        return new Response(
          JSON.stringify(agentsData),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'createWebCall':
        console.log('Creating web call with agent:', agent_id)
        
        // Validate agent_id
        if (!agent_id) {
          console.error('Missing agent_id in request')
          return new Response(
            JSON.stringify({ error: 'agent_id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        try {
          const webCallResponse = await fetch("https://api.retellai.com/v2/create-web-call", {
            method: 'POST',
            headers: {
              "Authorization": `Bearer ${RETELL_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ agent_id })
          });

          if (!webCallResponse.ok) {
            const errorText = await webCallResponse.text()
            console.error('Error creating web call:', errorText)
            throw new Error(`Failed to create web call: ${webCallResponse.status} - ${errorText}`)
          }

          const webCallData = await webCallResponse.json()
          console.log('Successfully created web call:', webCallData)
          return new Response(
            JSON.stringify(webCallData),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          console.error('Error in createWebCall:', error)
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

      default:
        return new Response(
          JSON.stringify({ error: `Unsupported action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Error in retell-calls function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

