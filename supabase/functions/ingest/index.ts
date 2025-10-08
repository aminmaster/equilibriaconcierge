import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.46/deno-dom-wasm.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ===== MODULE: CONFIGURATION =====
const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY') || 'your-secret-encryption-key-32-chars'
const BATCH_SIZE = 5 // Process in batches to avoid rate limits
const MAX_CHUNK_SIZE = 1000
const OVERLAP_SIZE = 200

// ===== MODULE: UTILITY FUNCTIONS =====

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

// ===== MODULE: VALIDATION =====
function validateUUID(value: any): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return typeof value === 'string' && uuidRegex.test(value)
}

function validateString(value: any, maxLength: number = 1000): boolean {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength
}

// ===== MODULE: RATE LIMITING =====
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

// ===== MODULE: CONTENT FETCHING =====
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
      
      // Enhanced extraction: prioritize main content areas
      let mainContent = doc.querySelector('main') || 
                       doc.querySelector('article') || 
                       doc.querySelector('[role="main"]') || 
                       doc.body;
      
      if (mainContent) {
        // Remove unwanted elements more thoroughly
        mainContent.querySelectorAll('script, style, nav, footer, header, aside, [class*="ad-"], [id*="ad-"]').forEach(el => el.remove());
        
        // Extract text with better whitespace handling
        const textContent = mainContent.textContent || '';
        return textContent
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
      }
      
      // Fallback: extract all body text
      return doc.body?.textContent?.replace(/\s+/g, ' ').trim() || html;
    } else if (contentType.includes('application/pdf')) {
      // Basic PDF text extraction (limited in Deno; in production, use pdf.js or similar)
      const arrayBuffer = await response.arrayBuffer();
      // Placeholder: For real PDF support, integrate a PDF parser like pdf-parse
      // For now, return a message indicating PDF processing
      throw new Error('PDF processing requires additional libraries. Use file upload for PDFs or convert to text/HTML.');
    } else if (contentType.includes('text/plain') || contentType.includes('application/json')) {
      // For plain text or JSON, return raw content
      const text = await response.text();
      return text.replace(/\s+/g, ' ').trim();
    } else {
      // Unsupported type
      throw new Error(`Unsupported content type: ${contentType}. Please use text/HTML or upload files.`);
    }
  } catch (error) {
    console.error('Error fetching URL content:', error);
    throw new Error(`Failed to fetch content from ${url}: ${error.message}`);
  }
}

// ===== MODULE: CHUNKING =====
function splitIntoSemanticChunks(text: string, maxChunkSize: number = MAX_CHUNK_SIZE, overlap: number = OVERLAP_SIZE): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/); // Split on sentence boundaries, preserving punctuation

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
      
      // Otherwise, save current chunk and start new one with overlap
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
      }
      
      // Start new chunk with overlap from previous (if available)
      if (chunks.length > 0) {
        const prevChunk = chunks[chunks.length - 1];
        const overlapText = prevChunk.slice(-overlap);
        currentChunk = overlapText + ' ' + sentences[i];
      } else {
        currentChunk = sentences[i];
      }
    } else {
      currentChunk = nextChunk;
      i++;
    }
  }

  // Add the final chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim());
  }

  // Ensure minimum chunk size (merge small chunks if needed)
  if (chunks.length > 1) {
    const mergedChunks: string[] = [];
    let tempChunk = '';
    
    for (const chunk of chunks) {
      if (tempChunk.length + chunk.length + 1 <= maxChunkSize && tempChunk.length > 0) {
        tempChunk += ' ' + chunk;
      } else {
        if (tempChunk.length > 0) {
          mergedChunks.push(tempChunk.trim());
        }
        tempChunk = chunk;
      }
    }
    
    if (tempChunk.length > 0) {
      mergedChunks.push(tempChunk.trim());
    }
    
    return mergedChunks;
  }

  return chunks;
}

// ===== MODULE: EMBEDDING =====
async function generateBatchEmbeddings(
  supabaseClient: any, 
  chunks: string[], 
  provider: string, 
  model: string, 
  apiKey: string,
  sourceId: string
): Promise<number[][]> {
  const embeddings: number[][] = [];
  const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    let response;
    
    try {
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
      
      console.log(`Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${totalBatches}, progress: ${progress}%`);
      
    } catch (batchError) {
      console.error(`Error processing batch ${Math.floor(i / BATCH_SIZE) + 1}:`, batchError);
      // Retry logic: simple exponential backoff for transient errors
      if (batchError.message.includes('rate limit') || batchError.message.includes('timeout')) {
        const delay = Math.pow(2, Math.floor(i / BATCH_SIZE)); // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * 1000));
        i -= BATCH_SIZE; // Retry this batch
        continue;
      } else {
        throw batchError; // Re-throw non-recoverable errors
      }
    }
  }

  return embeddings;
}

// ===== MODULE: DATABASE OPERATIONS =====
async function updateSourceStatus(supabaseClient: any, sourceId: string, status: string, metadata?: any) {
  const updateData = { 
    status, 
    updated_at: new Date().toISOString()
  };
  
  if (metadata) {
    updateData.metadata = metadata;
  }
  
  const { error } = await supabaseClient
    .from('knowledge_sources')
    .update(updateData)
    .eq('id', sourceId);
    
  if (error) {
    console.error('Failed to update source status:', error);
  }
}

async function clearExistingDocuments(supabaseClient: any, sourceId: string) {
  const { error } = await supabaseClient
    .from('documents')
    .delete()
    .eq('source_id', sourceId);
    
  if (error) {
    console.error('Failed to clear existing documents:', error);
  }
}

async function insertDocumentChunks(supabaseClient: any, chunks: string[], embeddings: number[][], sourceId: string, sourceName: string) {
  const documentInserts = chunks.map((chunk, i) => ({
    source_id: sourceId,
    content: chunk,
    embedding: embeddings[i],
    metadata: {
      source_name: sourceName,
      chunk_index: i,
      total_chunks: chunks.length,
      processed_at: new Date().toISOString()
    }
  }));
  
  const { error } = await supabaseClient
    .from('documents')
    .insert(documentInserts);
    
  if (error) {
    console.error('Failed to insert document chunks:', error);
    throw new Error(`Failed to insert documents: ${error.message}`);
  }
}

// ===== MODULE: REALTIME BROADCASTING =====
async function broadcastProgress(supabaseClient: any, sourceId: string, progress: number, status: string, message: string) {
  try {
    // Broadcast to the 'knowledge_ingestion' channel with sourceId for targeted updates
    await supabaseClient
      .channel('knowledge_ingestion')
      .send({
        type: 'broadcast',
        event: 'progress_update',
        payload: {
          sourceId,
          progress,
          status,
          message,
          timestamp: new Date().toISOString()
        }
      });
    
    console.log(`Broadcasted progress update: ${progress}% for source ${sourceId}`);
  } catch (broadcastError) {
    console.error('Failed to broadcast progress:', broadcastError);
    // Don't throw; continue processing
  }
}

// ===== MODULE: AUTHENTICATION =====
async function validateUserAndAdmin(supabaseClient: any, token: string) {
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
  
  if (userError || !user) {
    throw new Error('Unauthorized: Invalid or expired token');
  }
  
  // Check if user is admin
  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
    
  if (profileError || profile?.role !== 'admin') {
    throw new Error('Forbidden: Admin access required');
  }
  
  return user.id;
}

// ===== MODULE: MAIN INGESTION LOGIC =====
async function processSourceContent(supabaseClient: any, source: any): Promise<string> {
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
  
  return content;
}

async function generateAndStoreEmbeddings(supabaseClient: any, content: string, sourceId: string, sourceName: string) {
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
  
  const decryptedApiKey = decryptApiKey(apiKeyData.api_key, ENCRYPTION_KEY);
  
  // Chunk the content semantically
  const chunks = splitIntoSemanticChunks(content, MAX_CHUNK_SIZE, OVERLAP_SIZE);
  console.log(`Split into ${chunks.length} semantic chunks`);
  
  // Clear existing documents for this source (idempotent)
  await clearExistingDocuments(supabaseClient, sourceId);
  
  // Generate embeddings in batches and insert
  const embeddings = await generateBatchEmbeddings(supabaseClient, chunks, embeddingProvider, embeddingModel, decryptedApiKey, sourceId);
  
  // Insert chunks with embeddings (batch insert for efficiency)
  await insertDocumentChunks(supabaseClient, chunks, embeddings, sourceId, sourceName);
}

// ===== MODULE: MAIN HANDLER =====
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
    await validateUserAndAdmin(supabaseClient, token);
    
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
    await updateSourceStatus(supabaseClient, sourceId, 'processing');
    
    // Broadcast initial progress
    await broadcastProgress(supabaseClient, sourceId, 0, 'processing', 'Starting ingestion process...');
    
    // Process source content
    const content = await processSourceContent(supabaseClient, source);
    
    // Broadcast content extraction complete
    await broadcastProgress(supabaseClient, sourceId, 10, 'processing', 'Content extracted successfully.');
    
    // Generate embeddings and store
    await generateAndStoreEmbeddings(supabaseClient, content, sourceId, source.name);
    
    // Update source to completed
    await updateSourceStatus(supabaseClient, sourceId, 'completed', { total_chunks: splitIntoSemanticChunks(content).length });
    
    // Final broadcast
    await broadcastProgress(supabaseClient, sourceId, 100, 'completed', `Successfully ingested ${splitIntoSemanticChunks(content).length} chunks from ${source.name}`);
    
    const data = {
      message: `Successfully ingested ${splitIntoSemanticChunks(content).length} chunks from ${source.name}`,
      sourceId: source.id,
      chunkCount: splitIntoSemanticChunks(content).length
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
      await updateSourceStatus(supabaseClient, body.sourceId, 'failed', { error: error.message });
      await broadcastProgress(supabaseClient, body.sourceId, 0, 'failed', `Ingestion failed: ${error.message}`);
    } catch (updateError) {
      console.error('Failed to update status to failed:', updateError);
    }
    
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})