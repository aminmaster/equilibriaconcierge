# Conversational AI Platform - Documentation

Welcome to the documentation for the Conversational AI Platform. This guide will help you understand, deploy, and maintain the platform.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Getting Started](#getting-started)
3. [Deployment Guide](#deployment-guide)
4. [API Documentation](#api-documentation)
5. [Edge Functions](#edge-functions)
6. [Database Schema](#database-schema)
7. [Security](#security)
8. [Performance Optimization](#performance-optimization)
9. [Troubleshooting](#troubleshooting)
10. [Contributing](#contributing)

## Architecture Overview

The Conversational AI Platform is built with a modern, scalable architecture:

- **Frontend**: React 18 with TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (Auth, Database, Edge Functions)
- **AI Services**: OpenAI API (embeddings), OpenRouter API (generation)
- **Deployment**: Vercel with automatic CI/CD

### Key Components

1. **User Interface**: Responsive web application with conversation and knowledge graph views
2. **Authentication**: Supabase Auth with social login support
3. **Conversation Management**: Real-time conversation handling with message streaming
4. **Knowledge Base**: Document ingestion and semantic search capabilities
5. **Admin Panel**: Configuration management for models, API keys, and knowledge sources
6. **Edge Functions**: Serverless functions for chat, ingestion, and admin operations

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- API keys for AI providers (OpenAI, OpenRouter, etc.)

### Installation

```bash
# Clone the repository
git clone <repository-url>

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Supabase configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI Provider API Keys (for local development)
OPENAI_API_KEY=your_openai_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
```

## Deployment Guide

The application is configured for deployment on Vercel. To deploy:

1. Connect your repository to Vercel
2. Set environment variables in Vercel project settings
3. Configure Supabase project with required tables and functions
4. Deploy edge functions separately via Supabase CLI

### Supabase Setup

Run the following SQL to set up the database schema:

```sql
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  role TEXT DEFAULT 'user',
  PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "profiles_select_policy" ON public.profiles 
FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "profiles_insert_policy" ON public.profiles 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_policy" ON public.profiles 
FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "profiles_delete_policy" ON public.profiles 
FOR DELETE TO authenticated USING (auth.uid() = id);

-- Create other required tables (conversations, messages, knowledge_sources, documents, api_keys, model_configurations)
-- See database schema section for complete setup
```

## API Documentation

### REST API Endpoints

The application primarily uses Supabase client for data operations, but also exposes several edge functions:

#### Chat Function
- **Endpoint**: `POST /functions/v1/chat`
- **Description**: Handles conversation streaming with AI models
- **Authentication**: Bearer token required
- **Parameters**:
  - `message` (string): User's message
  - `conversationId` (UUID): Conversation identifier
  - `generationProvider` (string): AI provider (openrouter, openai, etc.)
  - `generationModel` (string): Specific model to use

#### Ingest Function
- **Endpoint**: `POST /functions/v1/ingest`
- **Description**: Processes documents for knowledge base
- **Authentication**: Admin user required
- **Parameters**:
  - `sourceId` (UUID): Knowledge source identifier

#### Test API Key Function
- **Endpoint**: `POST /functions/v1/test-api-key`
- **Description**: Validates API key configuration
- **Authentication**: Admin user required
- **Parameters**:
  - `provider` (string): API provider to test

## Edge Functions

The platform uses Supabase Edge Functions for serverless operations:

1. **chat**: Main conversation handler with streaming
2. **hello**: Simple test function
3. **ingest**: Document processing and embedding
4. **test-api-key**: API key validation

### Deployment

Deploy edge functions using the Supabase CLI:

```bash
# Install Supabase CLI
npm install -g supabase

# Deploy functions
supabase functions deploy
```

## Database Schema

### Key Tables

1. **profiles**: User profile information
2. **conversations**: Conversation metadata
3. **messages**: Individual conversation messages
4. **knowledge_sources**: Document sources for knowledge base
5. **documents**: Processed document chunks with embeddings
6. **api_keys**: Encrypted API keys for AI providers
7. **model_configurations**: AI model configuration settings

### Security

All tables have Row Level Security (RLS) enabled with appropriate policies.

## Security

The platform implements several security measures:

1. **Authentication**: Supabase Auth with email/password and social login
2. **Authorization**: Role-based access control (user/admin)
3. **Data Encryption**: API keys encrypted at rest
4. **Rate Limiting**: Per-function rate limiting
5. **Input Validation**: Server-side validation and sanitization
6. **CORS**: Proper CORS configuration for edge functions

## Performance Optimization

The platform includes several performance optimizations:

1. **Caching**: In-memory caching with TTL for API responses
2. **Pagination**: Efficient data loading with pagination
3. **Virtualization**: Message list virtualization for large conversations
4. **Bundle Optimization**: Code splitting and tree shaking
5. **Database Indexing**: Proper indexing for common queries

## Troubleshooting

### Common Issues

1. **Chat not working**: Check API key configuration in admin panel
2. **Knowledge base empty**: Ensure documents are properly ingested
3. **Authentication errors**: Verify Supabase configuration
4. **Performance issues**: Check caching and database query performance

### Logs and Monitoring

Edge functions log to Supabase function logs. Enable detailed logging for debugging:

```javascript
console.log("Debug information");
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests if applicable
5. Submit a pull request

### Code Style

- Follow TypeScript best practices
- Use Prettier for code formatting
- Write clear, concise commit messages
- Document new features and changes