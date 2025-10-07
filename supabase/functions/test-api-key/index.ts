import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limiting using in-memory store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; timestamp: number }>()

function isRateLimited(identifier: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now()
  const windowStart = now - windowMs
  const record = rateLimitStore.get(identifier)

  if (!record || record.timestamp < windowStart) {
    // Reset the count for this identifier
    rateLimitStore.set(identifier, { count: 1, timestamp: now })
    return false
  }

  if (record.count >= maxRequests) {
    // Rate limit exceeded
    return true
  }

  // Increment the count
  rateLimitStore.set(identifier, { count: record.count + 1, timestamp: now })
  return false
}

serve(async (req) => {
  console.log("Test API Key function called with method:", req.method)
  console.log("Request headers:", [...req.headers.entries()])
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    // Rate limiting check
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown'
    if (isRateLimited(`test-api-key:${clientIP}`)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429
        }
      )
    }
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    const authHeader = req.headers.get('Authorization')
    console.log("Auth header present:", !!authHeader)
    
    if (!authHeader) {
      console.log("No authorization header found")
      return new Response('Unauthorized', { 
        status: 401, 
        headers: corsHeaders 
      })
    }
    
    // Validate the user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) {
      console.log("Invalid or expired token")
      return new Response('Unauthorized', { 
        status: 401, 
        headers: corsHeaders 
      })
    }
    
    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (profileError || profile?.role !== 'admin') {
      console.log("User is not authorized to perform this action")
      return new Response('Forbidden', { 
        status: 403, 
        headers: corsHeaders 
      })
    }
    
    const { provider } = await req.json()
    console.log("Request body:", { provider })
    
    // Input validation
    if (typeof provider !== 'string' || provider.length === 0 || provider.length > 50) {
      throw new Error("Invalid provider: must be a string between 1 and 50 characters")
    }
    
    // Get API key for the provider
    const { data: apiKeyData, error: apiKeyError } = await supabaseClient
      .from('api_keys')
      .select('api_key')
      .eq('provider', provider)
      .single()
    
    if (apiKeyError || !apiKeyData) {
      throw new Error(`${provider} API key not configured`)
    }
    
    // Validate API key format
    if (!apiKeyData.api_key || apiKeyData.api_key.length < 20) {
      throw new Error("Invalid API key format")
    }
    
    // Test the API key based on the provider
    let isValid = false
    let testResult = ""
    
    try {
      if (provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${apiKeyData.api_key}`,
            'Content-Type': 'application/json'
          }
        })
        
        isValid = response.ok
        testResult = response.ok ? "API key is valid" : `API key test failed with status ${response.status}`
      } else if (provider === 'openrouter') {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
          headers: {
            'Authorization': `Bearer ${apiKeyData.api_key}`,
            'Content-Type': 'application/json'
          }
        })
        
        isValid = response.ok
        testResult = response.ok ? "API key is valid" : `API key test failed with status ${response.status}`
      } else if (provider === 'anthropic') {
        // For Anthropic, we test with a simple request
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKeyData.api_key,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            model: "claude-3-haiku-20240307",
            max_tokens: 10,
            messages: [{
              role: "user",
              content: "Hello"
            }]
          })
        })
        
        // For Anthropic, a 400 error might still mean the key is valid (just bad request)
        // So we check for authentication errors specifically
        isValid = response.status !== 401 && response.status !== 403
        testResult = isValid ? "API key is valid" : `API key test failed with status ${response.status}`
      } else if (provider === 'xai') {
        // For xAI, test with a simple request
        const response = await fetch('https://api.x.ai/v1/models', {
          headers: {
            'Authorization': `Bearer ${apiKeyData.api_key}`,
            'Content-Type': 'application/json'
          }
        })
        
        isValid = response.ok
        testResult = response.ok ? "API key is valid" : `API key test failed with status ${response.status}`
      } else {
        // Default test for other providers
        testResult = "Provider test not implemented"
        isValid = true // Assume valid if we don't have a specific test
      }
    } catch (testError) {
      console.error(`Error testing ${provider} API key:`, testError)
      isValid = false
      testResult = `Error testing API key: ${testError.message}`
    }
    
    const data = {
      provider,
      isValid,
      testResult,
      testedAt: new Date().toISOString()
    }
    
    console.log("API key test completed:", data)
    
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      },
    )
  } catch (error) {
    console.error('Test API Key function error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})