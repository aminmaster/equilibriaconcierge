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