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
    const { error: updateError } = await supabaseClient
      .from('knowledge_sources')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', sourceId)
    
    if (updateError) {
      console.error('Failed to update status to processing:', updateError)
    }
    
    // Process the document based on its type
    if (source.type === 'url') {
      // For URL sources, fetch the content
      const response = await fetch(source.url)
      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.statusText}`)
      }
      
      const content = await response.text()
      await processDocumentContent(supabaseClient, sourceId, content, source.name)
    } else if (source.type === 'file') {
      // For file sources, we would need to retrieve the file from storage
      // This is a simplified example - in a real implementation, you would
      // retrieve the file from Supabase Storage or another storage service
      console.log('File processing would happen here')
      // Simulate file processing
      await processDocumentContent(supabaseClient, sourceId, 'Sample document content for testing', source.name)
    }
    
    // Update status to completed
    await supabaseClient
      .from('knowledge_sources')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
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
    
    // Update status to failed if we have a sourceId
    try {
      const body = await req.json()
      if (body.sourceId) {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )
        
        await supabaseClient
          .from('knowledge_sources')
          .update({ 
            status: 'failed', 
            updated_at: new Date().toISOString() 
          })
          .eq('id', body.sourceId)
      }
    } catch (updateError) {
      console.error('Failed to update status to failed:', updateError)
    }
    
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

// Helper function to process document content
async function processDocumentContent(supabaseClient: any, sourceId: string, content: string, sourceName: string) {
  // In a real implementation, you would:
  // 1. Split the document into chunks
  // 2. Generate embeddings for each chunk using OpenAI
  // 3. Store the chunks and embeddings in the documents table
  
  // For demonstration, we'll create a simple chunk
  const chunks = splitIntoChunks(content, 1000) // Split into ~1000 character chunks
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    
    // Generate embedding (this is a placeholder - in reality you'd call OpenAI API)
    // For demo purposes, we'll create a mock embedding
    const mockEmbedding = new Array(1536).fill(0).map(() => Math.random())
    
    // Store the document chunk with its embedding
    const { error: docError } = await supabaseClient
      .from('documents')
      .insert({
        source_id: sourceId,
        content: chunk,
        embedding: mockEmbedding,
        metadata: {
          source_name: sourceName,
          chunk_index: i,
          total_chunks: chunks.length
        }
      })
    
    if (docError) {
      console.error(`Failed to insert document chunk ${i}:`, docError)
      throw new Error(`Failed to insert document chunk: ${docError.message}`)
    }
  }
}

// Simple function to split text into chunks
function splitIntoChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize))
  }
  return chunks
}