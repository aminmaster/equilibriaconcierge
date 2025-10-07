import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simple decryption function (in production, use a proper encryption library)
function decryptApiKey(encryptedKey: string, secretKey: string): string {
  try {
    // Decode from base64
    const decoded = atob(encryptedKey);
    
    // Decrypt using XOR
    let decrypted = '';
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ secretKey.charCodeAt(i % secretKey.length);
      decrypted += String.fromCharCode(charCode);
    }
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt API key');
  }
}

// Input validation functions
function validateUUID(value: any): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return typeof value === 'string' && uuidRegex.test(value)
}

function validateString(value: any, maxLength: number = 1000): boolean {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength
}

// Rate limiting using in-memory store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; timestamp: number }>()

function isRateLimited(identifier: string, maxRequests: number = 5, windowMs: number = 60000): boolean {
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
  console.log("Ingest function called with method:", req.method)
  console.log("Request headers:", [...req.headers.entries()])
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    // Rate limiting check
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown'
    if (isRateLimited(`ingest:${clientIP}`)) {
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
    
    const body = await req.json()
    console.log("Request body:", body)
    
    const { sourceId } = body
    
    // Input validation
    if (!validateUUID(sourceId)) {
      throw new Error("Invalid sourceId: must be a valid UUID")
    }
    
    if (!sourceId) {
      console.log("No sourceId provided in request body")
      throw new Error("sourceId is required")
    }
    
    // Get the knowledge source
    const { data: source, error: sourceError } = await supabaseClient
      .from('knowledge_sources')
      .select('*')
      .eq('id', sourceId)
      .single()
    
    console.log("Source data:", source)
    console.log("Source error:", sourceError)
    
    if (sourceError) {
      throw new Error(`Failed to fetch source: ${sourceError.message}`)
    }
    
    // Update status to processing
    console.log("Updating source status to processing")
    const { error: updateError } = await supabaseClient
      .from('knowledge_sources')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', sourceId)
    
    if (updateError) {
      console.error('Failed to update status to processing:', updateError)
    }
    
    // Process the document based on its type
    if (source.type === 'url') {
      console.log("Processing URL source:", source.url)
      // For URL sources, fetch the content
      const response = await fetch(source.url)
      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.statusText}`)
      }
      
      const content = await response.text()
      console.log("URL content fetched, length:", content.length)
      await processDocumentContent(supabaseClient, sourceId, content, source.name)
    } else if (source.type === 'file') {
      console.log("Processing file source")
      // For file sources, we would need to retrieve the file from storage
      // This is a simplified example - in a real implementation, you would
      // retrieve the file from Supabase Storage or another storage service
      console.log('File processing would happen here')
      // Simulate file processing
      await processDocumentContent(supabaseClient, sourceId, 'Sample document content for testing', source.name)
    }
    
    // Update status to completed
    console.log("Updating source status to completed")
    await supabaseClient
      .from('knowledge_sources')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', sourceId)
    
    const data = {
      message: `Successfully processed knowledge source: ${source.name}`,
      sourceId: source.id
    }
    
    console.log("Ingest function completed successfully:", data)
    
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
  console.log("Processing document content for source:", sourceId)
  
  // In a real implementation, you would:
  // 1. Split the document into chunks
  // 2. Generate embeddings for each chunk using OpenAI
  // 3. Store the chunks and embeddings in the documents table
  
  // For demonstration, we'll create a simple chunk
  const chunks = splitIntoChunks(content, 1000) // Split into ~1000 character chunks
  console.log("Split content into", chunks.length, "chunks")
  
  // Get the embedding model configuration
  const { data: modelConfig, error: modelError } = await supabaseClient
    .from('model_configurations')
    .select('*')
    .eq('type', 'embedding')
    .single()
  
  const embeddingModel = modelConfig?.model || 'text-embedding-3-large'
  const embeddingDimensions = modelConfig?.dimensions || 3072
  
  console.log("Using embedding model:", embeddingModel, "with dimensions:", embeddingDimensions)
  
  // Get API key for OpenAI
  const { data: apiKeyData, error: apiKeyError } = await supabaseClient
    .from('api_keys')
    .select('api_key')
    .eq('provider', 'openai')
    .single()
  
  if (apiKeyError || !apiKeyData) {
    throw new Error('OpenAI API key not configured for embeddings')
  }
  
  // Decrypt the API key
  const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY') || 'your-secret-encryption-key-32-chars'
  const decryptedApiKey = decryptApiKey(apiKeyData.api_key, ENCRYPTION_KEY)
  
  // Validate API key format
  if (!decryptedApiKey || decryptedApiKey.length < 20) {
    throw new Error("Invalid API key format")
  }
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    console.log("Processing chunk", i, "length:", chunk.length)
    
    try {
      // Generate embedding using OpenAI
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${decryptedApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: chunk,
          model: embeddingModel
        })
      })
      
      if (!embeddingResponse.ok) {
        const errorText = await embeddingResponse.text()
        throw new Error(`Failed to generate embedding: ${embeddingResponse.statusText} - ${errorText}`)
      }
      
      const embeddingData = await embeddingResponse.json()
      const embedding = embeddingData.data[0].embedding
      
      // Store the document chunk with its embedding
      const { error: docError } = await supabaseClient
        .from('documents')
        .insert({
          source_id: sourceId,
          content: chunk,
          embedding: embedding,
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
    } catch (error) {
      console.error(`Error processing chunk ${i}:`, error)
      throw error
    }
  }
  
  console.log("Document processing completed for source:", sourceId)
}

// Simple function to split text into chunks
function splitIntoChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize))
  }
  return chunks
}