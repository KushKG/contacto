export interface SearchResult {
  contactId: string;
  name: string;
  score: number;       // unified relevance score [0, 1]
  matchedField: 'tag' | 'conversation' | 'summary' | 'name' | 'email' | 'phone';
  snippet?: string;     // small text snippet if from conversations/summaries
  tags?: string[];      // contact tags for context
  phone?: string;
  email?: string;
}

export interface SemanticSearchResult {
  contactId: string;
  score: number;        // cosine similarity score
  matchedField: 'tag' | 'conversation' | 'summary';
  snippet?: string;
  source: 'tags' | 'conversations' | 'summaries';
}

export interface KeywordSearchResult {
  contactId: string;
  score: number;        // text match score
  matchedField: 'name' | 'email' | 'phone';
  snippet?: string;
  matchCount: number;   // number of matching terms
}

export interface SearchConfig {
  // Embedding model configuration
  embeddingModel: 'text-embedding-3-small' | 'text-embedding-3-large';
  
  // Search parameters
  maxResults: number;
  semanticThreshold: number;    // minimum similarity for semantic results
  keywordThreshold: number;     // minimum score for keyword results
  
  // Ranking weights
  semanticWeight: number;       // weight for semantic search (0.7)
  keywordWeight: number;        // weight for keyword search (0.3)
  
  // Snippet configuration
  maxSnippetLength: number;
}

export interface VectorDocument {
  id: string;
  contactId: string;
  content: string;
  type: 'tag' | 'conversation' | 'summary';
  embedding?: number[];
  metadata?: {
    tag?: string;
    conversationId?: string;
    createdAt?: string;
  };
}

export interface KeywordDocument {
  id: string;
  contactId: string;
  name: string;
  email?: string;
  phone?: string;
  tags?: string[];
}

export const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  embeddingModel: 'text-embedding-3-small',
  maxResults: 10,
  semanticThreshold: 0.6,
  keywordThreshold: 0.3,
  semanticWeight: 0.7,
  keywordWeight: 0.3,
  maxSnippetLength: 150,
};
