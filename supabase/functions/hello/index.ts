import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limiting using in-memory store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; timestamp: number }>()

function isRateLimited(identifier: string, maxRequests: number = 20, windowMs: number = 60000): boolean {
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
  console.log("Hello function called with method:", req.method)
  console.log("Request headers:", [...req.headers.entries()])
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    // Rate limiting check
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown'
    if (isRateLimited(`hello:${clientIP}`)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429
        }
      )
    }
    
    // Manual authentication handling (since verify_jwt is false)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Unauthorized', { 
        status: 401, 
        headers: corsHeaders 
      })
    }
    
    // Validate the user
    const token = authHeader.replace('Bearer ', '')
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) {
      return new Response('Unauthorized', { 
        status: 401, 
        headers: corsHeaders 
      })
    }
    
    const { name } = await req.json()
    
    // Input validation
    if (typeof name !== 'string' || name.length === 0 || name.length > 100) {
      throw new Error("Invalid name: must be a string between 1 and 100 characters")
    }
    
    const data = {
      message: `Hello ${name}!`,
      time: new Date().toISOString(),
      userId: user.id
    }
    
    console.log("Hello function completed successfully for user:", user.id)
    
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      },
    )
  } catch (error) {
    console.error('Hello function error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})