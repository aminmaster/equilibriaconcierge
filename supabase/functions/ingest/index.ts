import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Unauthorized', { 
        status: 401, 
        headers: corsHeaders 
      })
    }
    
    const { sourceId } = await req.json()
    
    // Get the knowledge source
    const { data: source, error: sourceError } = await supabaseClient
      .from('knowledge_sources')
      .select('*')
      .eq('id', sourceId)
      .single()
    
    if (sourceError) {
      throw new Error(`Failed to fetch source: ${sourceError.message}`)
    }
    
    // Update status to processing
    await supabaseClient
      .from('knowledge_sources')
      .update({ status: 'processing' })
      .eq('id', sourceId)
    
    // In a real implementation, we would:
    // 1. Fetch the document content (from URL or file storage)
    // 2. Split the document into chunks
    // 3. Generate embeddings for each chunk using OpenAI
    // 4. Store the chunks and embeddings in the documents table
    
    // For now, we'll simulate the process
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Update status to completed
    await supabaseClient
      .from('knowledge_sources')
      .update({ status: 'completed' })
      .eq('id', sourceId)
    
    const data = {
      message: `Successfully processed knowledge source: ${source.name}`,
      sourceId: source.id
    }
    
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      },
    )
  } catch (error) {
    console.error('Ingest function error:', error)
    // Update status to failed
    // In a real implementation, we would also store the error message
    if (req.json && (await req.json()).sourceId) {
      const { sourceId } = await req.json()
      await supabaseClient
        .from('knowledge_sources')
        .update({ status: 'failed' })
        .eq('id', sourceId)
    }
    
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})