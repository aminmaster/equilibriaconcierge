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
    
    const { message, conversationId, embeddingModel = 'text-embedding-3-large' } = await req.json()
    
    // Get conversation history
    const { data: messages, error: messagesError } = await supabaseClient
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    
    if (messagesError) {
      throw new Error(`Failed to fetch messages: ${messagesError.message}`)
    }
    
    // Create embedding for the query
    const openaiResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: message,
        model: embeddingModel
      })
    })
    
    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`)
    }
    
    const embeddingData = await openaiResponse.json()
    const queryEmbedding = embeddingData.data[0].embedding
    
    // Search for relevant documents
    const { data: documents, error: documentsError } = await supabaseClient
      .rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: 0.78,
        match_count: 5
      })
    
    if (documentsError) {
      throw new Error(`Failed to search documents: ${documentsError.message}`)
    }
    
    // Construct context from retrieved documents
    const context = documents.map((doc: any) => doc.content).join('\n\n')
    
    // Prepare messages for the LLM
    const systemMessage = {
      role: 'system',
      content: `You are a helpful AI assistant. Use the following context to answer the user's question:\n\n${context}`
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
    
    // Call OpenRouter API for response generation with streaming
    const openrouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
        'HTTP-Referer': siteUrl,
        'X-Title': 'Conversational AI Platform',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o',
        messages: allMessages,
        stream: true
      })
    })
    
    if (!openrouterResponse.ok) {
      throw new Error(`OpenRouter API error: ${openrouterResponse.statusText}`)
    }
    
    // Stream the response back to the client
    return new Response(openrouterResponse.body, {
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