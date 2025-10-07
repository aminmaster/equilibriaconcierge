export interface GenerationConfig {
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface EmbeddingConfig {
  provider: string;
  model: string;
  dimensions: number;
}

export interface ModelConfigurations {
  generation: GenerationConfig;
  embedding: EmbeddingConfig;
}

// Define supported providers and their models
export const SUPPORTED_PROVIDERS = {
  generation: [
    'openrouter',
    'openai',
    'anthropic',
    'xai',
    'cohere',
    'google'
  ],
  embedding: [
    'openai',
    'openrouter',
    'cohere'
  ]
};

// Default models for each provider
export const DEFAULT_MODELS = {
  generation: {
    openrouter: 'openai/gpt-4o',
    openai: 'gpt-4o',
    anthropic: 'claude-3-5-sonnet-20240620',
    xai: 'grok-beta',
    cohere: 'command-r-plus',
    google: 'gemini-1.5-pro'
  },
  embedding: {
    openai: 'text-embedding-3-large',
    openrouter: 'openai/text-embedding-3-large',
    cohere: 'embed-english-v3.0'
  }
};

// Model dimensions for embeddings
export const EMBEDDING_DIMENSIONS = {
  'text-embedding-3-large': 3072,
  'text-embedding-3-small': 1536,
  'text-embedding-ada-002': 1536,
  'openai/text-embedding-3-large': 3072,
  'openai/text-embedding-3-small': 1536,
  'embed-english-v3.0': 1024,
  'embed-multilingual-v3.0': 1024
};