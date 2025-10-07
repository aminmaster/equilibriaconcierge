import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.46/deno-dom-wasm.ts'

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

// Fetch and extract content from URL
async function fetchUrlContent(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('text/html')) {
      // Parse HTML and extract text content
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      // Extract main content, removing scripts/styles
      const mainContent = doc.querySelector('main') || doc.querySelector('article') || doc.body;
      if (mainContent) {
        // Remove unwanted elements
        mainContent.querySelectorAll('script, style, nav, footer, header').forEach(el => el.remove());
        return mainContent.textContent?.trim() || '';
      }
      return html; // Fallback to raw HTML text
    } else if (contentType.includes('application/pdf')) {
      // For PDFs, we'd need a PDF parser; fallback to error for now
      throw new Error('PDF processing not supported in this implementation. Use file upload for PDFs.');
    } else {
      // For other text types, return raw content
      return await response.text();
    }
  } catch (error) {
    console.error('Error fetching URL content:', error);
    throw new Error(`Failed to fetch content from ${url}: ${error.message}`);
  }
}

// Semantic chunking with overlap
function splitIntoSemanticChunks(text: string, maxChunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/); // Split on sentence boundaries

  let currentChunk = '';
  let i = 0;

  while (i < sentences.length) {
    // Try to add the next sentence
    const nextChunk = currentChunk + (currentChunk ? ' ' : '') + sentences[i];
    
    if (nextChunk.length > maxChunkSize) {
      // If current chunk is empty, force-add the sentence (even if oversized)
      if (currentChunk.length === 0) {
        chunks.push(sentences[i]);
        i++;
        continue;
      }
      
      // Otherwise, save current chunk and start new one
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentences[i]; // Start new chunk with current sentence
    } else {
      currentChunk = nextChunk;
      i++;
    }
  }

  // Add the final chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim());
  }

  // Apply overlap if chunks > 1
  if (chunks.length > 1) {
    const overlappedChunks = [chunks[0]]; // First chunk unchanged
    for (let j = 1; j < chunks.length; j++) {
      const overlapText = chunks[j - 1].slice(-overlap);
      const newChunk = overlapText + ' ' + chunks[j];
      overlappedChunks.push(newChunk);
    }
    return overlappedChunks;
  }

  return chunks;
}

// Batch embedding generation
async function generateBatchEmbeddings(
  supabaseClient: any, 
  chunks: string[], 
  provider: string, 
  model: string, 
  apiKey: string,
  sourceId: string
): Promise<number[][]> {
  const BATCH_SIZE = 5; // Process in batches to avoid rate limits
  const embeddings: number[][] = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    
    let response;
    if (provider === 'openai' || provider === 'openrouter') {
      response = await fetch(provider === 'openai' ? 'https://api.openai.com/v1/embeddings' : 'https://openrouter.ai/api/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          ...(provider === 'openrouter' && {
            'HTTP-Referer': Deno.env.get('SUPABASE_URL') || 'https://your-app.com',
            'X-Title': 'Conversational AI Platform'
          })
        },
        body: JSON.stringify({
          input: batch,
          model: model
        })
      });
    } else if (provider === 'cohere') {
      // Cohere expects 'texts' array
      response = await fetch('https://api.cohere.ai/v1/embed', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          texts: batch,
          model: model,
          input_type: 'search_document'
        })
      });
    } else {
      throw new Error(`Unsupported embedding provider: ${provider}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Embedding API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    let batchEmbeddings;

    if (provider === 'cohere') {
      batchEmbeddings = data.embeddings; // Array of arrays
    } else {
      batchEmbeddings = data.data.map((item: any) => item.embedding); // OpenAI/OpenRouter format
    }

    embeddings.push(...batchEmbeddings);
    
    // Progress update (every batch)
    const progress = Math.round(((i + BATCH_SIZE) / chunks.length) * 100);
    await supabaseClient
      .from('knowledge_sources')
      .update({ 
        status: 'processing', 
        updated_at: new Date().toISOString(),
        metadata: { progress } // Store progress in metadata if needed
      })
      .eq('id', sourceId);
  }

  return embeddings;
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
    
    let content = '';
    
    // Process the document based on its type
    if (source.type === 'url') {
      console.log("Processing URL source:", source.url)
      content = await fetchUrlContent(source.url!);
    } else if (source.type === 'file') {
      // For file uploads, assume content is pre-processed or stored; 
      // in a full implementation, fetch from Supabase Storage
      console.log("Processing file source - content extraction placeholder");
      // Placeholder: content would be extracted here (e.g., from storage)
      content = 'Sample file content for demonstration purposes.'; // Replace with actual extraction
    } else {
      throw new Error(`Unsupported source type: ${source.type}`);
    }
    
    if (!content || content.trim().length === 0) {
      throw new Error('No content extracted from the source');
    }
    
    console.log("Extracted content length:", content.length);
    
    // Get embedding configuration
    const { data: embeddingConfig, error: embeddingConfigError } = await supabaseClient
      .from('model_configurations')
      .select('*')
      .eq('type', 'embedding')
      .single();
    
    const embeddingProvider = embeddingConfig?.provider || 'openai';
    const embeddingModel = embeddingConfig?.model || 'text-embedding-3-large';
    
    // Get API key for embedding
    const { data: apiKeyData, error: apiKeyError } = await supabaseClient
      .from('api_keys')
      .select('api_key')
      .eq('provider', embeddingProvider)
      .single();
    
    if (apiKeyError || !apiKeyData) {
      throw new Error(`${embeddingProvider} API key not configured for embeddings`);
    }
    
    const decryptedApiKey = decryptApiKey(apiKeyData.api_key, Deno.env.get('ENCRYPTION_KEY') || 'your-secret-encryption-key-32-chars');
    
    // Chunk the content semantically
    const chunks = splitIntoSemanticChunks(content, 1000, 200); // 1000 chars max, 200 overlap
    console.log(`Split into ${chunks.length} semantic chunks`);
    
    // Clear existing documents for this source (idempotent)
    await supabaseClient
      .from('documents')
      .delete()
      .eq('source_id', sourceId);
    
    // Generate embeddings in batches and insert
    const embeddings = await generateBatchEmbeddings(supabaseClient, chunks, embeddingProvider, embeddingModel, decryptedApiKey, sourceId);
    
    // Insert chunks with embeddings (batch insert for efficiency)
    const documentInserts = chunks.map((chunk, i) => ({
      source_id: sourceId,
      content: chunk,
      embedding: embeddings[i],
      metadata: {
        source_name: source.name,
        chunk_index: i,
        total_chunks: chunks.length,
        processed_at: new Date().toISOString()
      }
    }));
    
    const { error: insertError } = await supabaseClient
      .from('documents')
      .insert(documentInserts);
    
    if (insertError) {
      throw new Error(`Failed to insert documents: ${insertError.message}`);
    }
    
    // Update source to completed
    await supabaseClient
      .from('knowledge_sources')
      .update({ 
        status: 'completed', 
        updated_at: new Date().toISOString(),
        metadata: { total_chunks: chunks.length }
      })
      .eq('id', sourceId);
    
    const data = {
      message: `Successfully ingested ${chunks.length} chunks from ${source.name}`,
      sourceId: source.id,
      chunkCount: chunks.length
    };
    
    console.log("Ingest function completed successfully:", data);
    
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Ingest function error:', error);
    
    // Update status to failed
    try {
      await supabaseClient
        .from('knowledge_sources')
        .update({ 
          status: 'failed', 
          updated_at: new Date().toISOString(),
          metadata: { error: error.message }
        })
        .eq('id', body.sourceId);
    } catch (updateError) {
      console.error('Failed to update status to failed:', updateError);
    }
    
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});