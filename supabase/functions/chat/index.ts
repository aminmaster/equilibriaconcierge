import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log("Chat function called with method:", req.method);
  console.log("Request headers:", [...req.headers.entries()]);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    const authHeader = req.headers.get('Authorization')
    console.log("Auth header present:", !!authHeader);
    
    // We still try to get the user, but don't require authentication
    let userId = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      console.log("Token extracted from header");
      
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
      
      if (!userError && user) {
        console.log("User verified:", user.id);
        userId = user.id;
      } else {
        console.log("Failed to verify user, continuing as anonymous");
      }
    } else {
      console.log("No auth header, continuing as anonymous");
    }
    
    const { 
      message, 
      conversationId, 
      embeddingModel = 'text-embedding-3-large',
      generationProvider = 'openrouter',
      generationModel = 'openai/gpt-4o'
    } = await req.json()
    
    console.log("Request body:", { message, conversationId, embeddingModel, generationProvider, generationModel });
    
    // Get conversation history
    const { data: messages, error: messagesError } = await supabaseClient
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    
    console.log("Messages fetched:", messages?.length || 0);
    console.log("Messages error:", messagesError);
    
    if (messagesError) {
      throw new Error(`Failed to fetch messages: ${messagesError.message}`)
    }
    
    // Get API key for embedding provider
    const { data: embeddingKeyData, error: embeddingKeyError } = await supabaseClient
      .from('api_keys')
      .select('api_key')
      .eq('provider', 'openai') // Currently only OpenAI supports embeddings
      .limit(1)
      .single()
    
    console.log("Embedding key data:", !!embeddingKeyData);
    console.log("Embedding key error:", embeddingKeyError);
    
    if (embeddingKeyError || !embeddingKeyData) {
      throw new Error('OpenAI API key not configured for embeddings')
    }
    
    // Create embedding for the query
    const openaiResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${embeddingKeyData.api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: message,
        model: embeddingModel
      })
    })
    
    console.log("OpenAI embeddings response status:", openaiResponse.status);
    
    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${openaiResponse.statusText} - ${errorText}`)
    }
    
    const embeddingData = await openaiResponse.json()
    const queryEmbedding = embeddingData.data[0].embedding
    
    // Search for relevant documents using the correct RPC function
    console.log("Searching for documents with embedding");
    const { data: documents, error: documentsError } = await supabaseClient
      .rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: 0.78,
        match_count: 5
      })
    
    console.log("Documents found:", documents?.length || 0);
    console.log("Documents error:", documentsError);
    
    if (documentsError) {
      console.error("Document search error:", documentsError);
      throw new Error(`Failed to search documents: ${documentsError.message}`)
    }
    
    // Construct context from retrieved documents
    let context = "";
    if (documents && documents.length > 0) {
      context = documents.map((doc: any) => doc.content).join('\n\n')
      console.log("Context constructed from documents, length:", context.length);
    } else {
      console.log("No relevant documents found");
      context = "No relevant documents found in the knowledge base.";
    }
    
    // Prepare messages for the LLM
    const systemMessage = {
      role: 'system',
      content: `You are a helpful AI assistant. Use the following context to answer the user's question. If the context doesn't contain relevant information, say so:\n\n${context}`
    }
    
    const conversationMessages = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content
    }))
    
    const userMessage = {
      role: 'user',
      content: message
    }
    
    const allMessages = [systemMessage, ...conversationMessages, userMessage]
    
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
    
    console.log("Generation key data:", !!generationKeyData);
    console.log("Generation key error:", generationKeyError);
    
    if (generationKeyError || !generationKeyData) {
      throw new Error(`${generationProvider} API key not configured`)
    }
    
    // Call the appropriate API based on the provider
    let apiResponse;
    if (generationProvider === 'openrouter') {
      apiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${generationKeyData.api_key}`,
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
          'Authorization': `Bearer ${generationKeyData.api_key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: generationModel,
          messages: allMessages,
          stream: true
        })
      })
    } else {
      // Default to OpenRouter for other providers
      apiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${generationKeyData.api_key}`,
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
    
    console.log("Generation API response status:", apiResponse?.status);
    
    if (!apiResponse?.ok) {
      const errorText = await apiResponse?.text();
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