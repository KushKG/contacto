# 🔍 Hybrid Search Engine for Contact Intelligence App

## Overview

This hybrid search engine combines **semantic search** (using OpenAI embeddings) with **keyword search** (using SQLite FTS5) to provide intelligent contact discovery across multiple data sources.

## Architecture

### 🧠 Semantic Search (Vector Store)
- **Technology**: Custom vector store with cosine similarity
- **Data Sources**: Contact tags, conversation transcripts, conversation summaries
- **Embeddings**: OpenAI `text-embedding-3-small` (1536 dimensions)
- **Algorithm**: Cosine similarity with normalized vectors

### 🔤 Keyword Search (FTS5)
- **Technology**: SQLite FTS5 full-text search
- **Data Sources**: Contact names, emails, phone numbers, tags
- **Features**: Ranking, snippet generation, multi-field matching

### 🎯 Hybrid Ranking Strategy
```typescript
final_score = max(semantic_score * 0.7, keyword_score * 0.3)
```

## Search Flow

1. **Query Processing**: User enters free-text query (e.g., "AI founder in Austin")
2. **Parallel Search**: 
   - Generate embedding → Search vector store
   - Tokenize query → Search FTS5 index
3. **Result Merging**: Combine results, remove duplicates, apply ranking
4. **Enrichment**: Fetch full contact details for display
5. **Sorting**: Return top 10 results by combined relevance score

## Data Sources

### Vector Store Documents
- **Tags**: Individual contact tags as separate documents
- **Conversations**: Full conversation transcripts
- **Summaries**: AI-generated conversation summaries

### Keyword Index
- **Names**: Contact names with exact/partial matching
- **Emails**: Email addresses with domain/username matching
- **Phones**: Phone numbers with formatting flexibility
- **Tags**: Tag names for keyword matching

## Configuration

```typescript
const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  embeddingModel: 'text-embedding-3-small',
  maxResults: 10,
  semanticThreshold: 0.6,      // Minimum similarity for semantic results
  keywordThreshold: 0.3,        // Minimum score for keyword results
  semanticWeight: 0.7,          // Weight for semantic search
  keywordWeight: 0.3,           // Weight for keyword search
  maxSnippetLength: 150,        // Maximum snippet length
};
```

## Usage Examples

### Basic Search
```typescript
const hybridSearchService = getHybridSearchService();
const results = await hybridSearchService.search("AI engineer");
```

### Advanced Configuration
```typescript
const customConfig = {
  maxResults: 20,
  semanticThreshold: 0.7,
  semanticWeight: 0.8
};
const hybridSearchService = getHybridSearchService(customConfig);
```

## Performance Characteristics

- **Semantic Search**: O(n) where n = number of documents with embeddings
- **Keyword Search**: O(log n) using FTS5 B-tree indexes
- **Memory Usage**: ~1536 * 4 bytes per document embedding
- **Initialization**: Builds vector index from existing data on startup

## Integration Points

### Contact Management
- Automatically indexes new contacts and tags
- Updates vector store when tags change
- Removes documents when contacts are deleted

### Conversation Processing
- Indexes new conversations and summaries
- Generates embeddings for semantic search
- Maintains keyword searchability

### Search UI
- Integrated into main search bar
- Shows hybrid results with relevance scores
- Provides fallback to keyword-only search

## Error Handling

- **API Failures**: Falls back to keyword search only
- **Embedding Errors**: Skips problematic documents with warnings
- **Index Corruption**: Rebuilds vector index on initialization
- **Memory Limits**: Caches embeddings with size limits

## Future Enhancements

1. **Caching**: Redis-based embedding cache for performance
2. **Batch Processing**: Bulk embedding generation for efficiency
3. **Advanced Ranking**: Machine learning-based relevance scoring
4. **Real-time Updates**: WebSocket-based index synchronization
5. **Analytics**: Search query analytics and optimization

## Testing

The search engine can be tested with various query types:

- **Exact Matches**: "John Doe" → Direct name/email matches
- **Semantic Queries**: "AI founder" → Tag/conversation similarity
- **Hybrid Queries**: "engineer in Austin" → Combines both approaches
- **Complex Queries**: "startup founder interested in machine learning" → Multi-dimensional matching

## Monitoring

```typescript
const stats = await hybridSearchService.getStats();
console.log(`Vector store: ${stats.vectorStoreSize} documents`);
console.log(`Keyword index: ${stats.keywordIndexSize} documents`);
```

This hybrid approach provides the best of both worlds: the precision of keyword search for exact matches and the intelligence of semantic search for conceptual understanding.
