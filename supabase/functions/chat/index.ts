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
function validateString(value: any, maxLength: number = 10000): boolean {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength
}

function validateUUID(value: any): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return typeof value === 'string' && uuidRegex.test(value)
}

// Simple input sanitization function
function sanitizeInput(input: string): string {
  // Remove potentially dangerous characters
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .trim();
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

// TODO: Migrate to Redis for distributed rate limiting in production scaling

serve(async (req) => {
  console.log("Chat function called with method:", req.method)
  console.log("Request headers:", [...req.headers.entries()])
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    // Rate limiting check
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown'
    if (isRateLimited(`chat:${clientIP}`)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please tryintre again later.' }),
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
    
    // We still try to get the user, but don't require authentication
    let userId = null
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      console.log("Token extracted from header")
      
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
      
      if (!userError && user) {
        console.log("User verified:", user.id)
        userId = user.id
      } else {
        console.log("Failed to verify user, continuing as anonymous")
      }
    } else {
      console.log("No auth header, continuing as anonymous")
    }
    
    const requestBody = await req.json()
    const { 
      message, 
      conversationId, 
      generationProvider,
      generationModel
    } = requestBody
    
    console.log("Request body:", requestBody)
    console.log("Parsed parameters:", { message, conversationId, generationProvider, generationModel })
    
    // Input validation
    if (!validateString(message, 5000)) {
      throw new Error("Invalid message: must be a string between 1 and 5000 characters")
    }
    
    if (!validateUUID(conversationId)) {
      throw new Error("Invalid conversation ID: must be a valid UUID")
    }
    
    if (!validateString(generationProvider, 50)) {
      throw new Error("Invalid generation provider: must be a string between 1 and 50 characters")
    }
    
    if (!validateString(generationModel, 100)) {
      throw new Error("Invalid generation model: must be a string between 1 and 100 characters")
    }
    
    // Sanitize inputs
    const sanitizedMessage = sanitizeInput(message)
    console.log("Sanitized message:", sanitizedMessage)
    
    // Validate conversation ID
    if (!conversationId || typeof conversationId !== 'string') {
      throw new Error("Invalid conversation ID")
    }
    
    // Get conversation history
    const { data: messages, error: messagesError } = await supabaseClient
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    
    console.log("Messages fetched:", messages?.length || 0)
    console.log("Messages error:", messagesError)
    
    if (messagesError) {
      throw new Error(`Failed to fetch messages: ${messagesError.message}`)
    }
    
    // Get embedding model configuration for knowledge base search
    const { data: embeddingConfig, error: embeddingConfigError } = await supabaseClient
      .from('model_configurations')
      .select('provider, model')
      .eq('type', 'embedding')
      .single()
    
    let effectiveEmbeddingProvider = 'openai'
    let effectiveEmbeddingModel = 'text-embedding-3-large'
    
    if (!embeddingConfigError && embeddingConfig) {
      effectiveEmbeddingProvider = embeddingConfig.provider
      effectiveEmbeddingModel = embeddingConfig.model
    }
    
    console.log("Effective embedding models:", { 
      embeddingProvider: effectiveEmbeddingProvider, 
      embeddingModel: effectiveEmbeddingModel 
    })
    
    // Get API key for embedding provider
    const { data: embeddingKeyData, error: embeddingKeyError } = await supabaseClient
      .from('api_keys')
      .select('api_key')
      .eq('provider', effectiveEmbeddingProvider)
      .limit(1)
      .single()
    
    console.log("Embedding key data:", !!embeddingKeyData)
    console.log("Embedding key error:", embeddingKeyError)
    
    if (embeddingKeyError || !embeddingKeyData) {
      console.warn('Embedding API key not configured, proceeding without knowledge base')
      // Continue without knowledge base if no API key
    }
    
    let context = "No relevant documents found in the knowledge base."
    
    // Only try to search knowledge base if we have an API key
    if (embeddingKeyData) {
      try {
        // Decrypt the API key
        const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY') || 'your-secret-encryption-key-32-chars'
        const decryptedApiKey = decryptApiKey(embeddingKeyData.api_key, ENCRYPTION_KEY)
        
        // Create embedding for the query
        let embeddingResponse
        if (effectiveEmbeddingProvider === 'openai') {
          embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${decryptedApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              input: sanitizedMessage,
              model: effectiveEmbeddingModel
            })
          })
        } else {
          // Default to OpenAI for embeddings as it's the most common
          embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${decryptedApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              input: sanitizedMessage,
              model: effectiveEmbeddingModel
            })
          })
        }
        
        console.log("Embeddings response status:", embeddingResponse.status)
        
        if (!embeddingResponse.ok) {
          const errorText = await embeddingResponse.text()
          console.error("Embedding API error:", errorText)
          throw new Error(`Embedding API error: ${embeddingResponse.statusText} - ${errorText}`)
        }
        
        const embeddingData = await embeddingResponse.json()
        const queryEmbedding = embeddingData.data[0].embedding
        console.log("Query embedding generated, dimension:", queryEmbedding.length)
        
        // Search for relevant documents using the correct RPC function
        console.log("Searching for documents with embedding")
        const { data: documents, error: documentsError } = await supabaseClient
          .rpc('match_documents', {
            query_embedding: queryEmbedding,
            match_threshold: 0.5, // Lower threshold for better matching
            match_count: 5
          })
        
        console.log("Documents found:", documents?.length || 0)
        console.log("Documents error:", documentsError)
        console.log("Documents data:", JSON.stringify(documents, null, 2))
        
        if (documentsError) {
          console.error("Document search error:", documentsError)
          // Don't throw error, just continue without context
        }
        
        // Construct context from retrieved documents
        if (documents && documents.length > 0) {
          context = documents.map((doc: any) => doc.content).join('\n\n')
          console.log("Context constructed from documents, length:", context.length)
        } else {
          console.log("No relevant documents found")
        }
      } catch (embeddingError) {
        console.error("Error during embedding/document search:", embeddingError)
        // Continue without context if embedding fails
      }
    }
    
    // Prepare messages for the LLM
    const systemMessage = {
      role: 'system',
      content: `You are a helpful AI assistant. Use the following context to answer the user's question. If the context doesn't contain relevant information, use your general knowledge:\n\n${context}`
    }
    
    const conversationMessages = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content
    }))
    
    const userMessage = {
      role: 'user',
      content: sanitizedMessage
    }
    
    const allMessages = [systemMessage, ...conversationMessages, userMessage]
    
    console.log("Messages sent to LLM:", JSON.stringify(allMessages, null, 2))
    
    // Get the referer from the request or use a default
    const referer = req.headers.get('Referer') || 'http://localhost:3000'
    const siteUrl = new URL(referer).origin
    
    // Get API key for generation provider
    const { data: generationKeyData, error: generationKeyError } = await supabaseClient
      .from('api_keys')
      .select('api_key')
      .eq('provider', generationProvider)
      .limit(1)
      .single()
    
    console.log("Generation key data:", !!generationKeyData)
    console.log("Generation key error:", generationKeyError)
    
    if (generationKeyError || !generationKeyData) {
      throw new Error(`${generationProvider} API key not configured`)
    }
    
    // Decrypt the generation API key
    const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY') || 'your-secret-encryption-key-32-chars'
    const decryptedGenerationKey = decryptApiKey(generationKeyData.api_key, ENCRYPTION_KEY)
    
    // Validate API key format
    if (!decryptedGenerationKey || decryptedGenerationKey.length < 20) {
      throw new Error("Invalid API key format")
    }
    
    // Call the appropriate API based on the provider
    let apiResponse
    if (generationProvider === 'openrouter') {
      apiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${decryptedGenerationKey}`,
          'HTTP-Referer': siteUrl,
          'X-Title': 'Conversational AI Platform',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: generationModel,
          messages: allMessages,
          stream: true
        })
      })
    } else if (generationProvider === 'openai') {
      apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${decryptedGenerationKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: generationModel,
          messages: allMessages,
          stream: true
        })
      })
    } else if (generationProvider === 'xai') {
      // Handle xAI specifically - use the correct endpoint and model name
      const xaiModel = generationModel.includes('grok') ? 'grok-beta' : generationModel
      
      apiResponse = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${decryptedGenerationKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: xaiModel,
          messages: allMessages,
          stream: true
        })
      })
    } else if (generationProvider === 'anthropic') {
      // Native Anthropic support: different endpoint, header, and body format
      apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': decryptedGenerationKey,  // Anthropic uses x-api-key header
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: generationModel,  // Dynamic model from config
          max_tokens: 1024,  // Fixed for streaming; can be made dynamic from config
          messages: allMessages,  // Same message format as OpenAI
          stream: true
        })
      })
    } else if (generationProvider === 'cohere') {
      // Native Cohere support: uses 'message' for the last message, different body format
      const cohereMessage = allMessages[allMessages.length - 1].content;  // Last message (user input)
      apiResponse = await fetch('https://api.cohere.ai/v1/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${decryptedGenerationKey}`,  // Cohere uses Bearer
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: generationModel,  // Dynamic model from config
          message: cohereMessage,  // Cohere uses 'message' (last input) instead of full history
          conversation_id: conversationId,  // For context if supported
          stream: true
        })
      })
    } else if (generationProvider === 'google') {
      // Native Google Gemini support: uses 'contents' array, different body format
      apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${generationModel}:generateContent`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${decryptedGenerationKey}`,  // Google uses Bearer
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: allMessages[allMessages.length - 1].content }]  // Last message for simplicity
          }],
          generationConfig: {
            maxOutputTokens: 1024,  // Fixed; can be dynamic
            temperature: 0.7  // From config if needed
          },
          stream: true
        })
      })
    } else {
      // Default to OpenRouter for other providers
      apiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${decryptedGenerationKey}`,
          'HTTP-Referer': siteUrl,
          'X-Title': 'Conversational AI Platform',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: generationModel,
          messages: allMessages,
          stream: true
        })
      })
    }
    
    console.log("Generation API response status:", apiResponse?.status)
    console.log("Using provider:", generationProvider, "with model:", generationModel)
    
    if (!apiResponse?.ok) {
      const errorText = await apiResponse?.text()
      throw new Error(`API error: ${apiResponse?.statusText} - ${errorText}`)
    }
    
    // Stream the response back to the client
    return new Response(apiResponse.body, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })
    
  } catch (error) {
    console.error('Chat function error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})