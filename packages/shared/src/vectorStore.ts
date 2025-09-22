import { VectorDocument, SemanticSearchResult } from './searchTypes';

export class VectorStore {
  private documents: VectorDocument[] = [];
  private dimension: number = 1536; // OpenAI text-embedding-3-small dimension

  constructor(dimension: number = 1536) {
    this.dimension = dimension;
  }

  /**
   * Initialize the vector store
   */
  async initialize(): Promise<void> {
    // No initialization needed for simple vector store
    return;
  }

  /**
   * Add a single document with its embedding
   */
  async addDocument(document: VectorDocument): Promise<void> {
    if (!document.embedding) {
      throw new Error('Document must have an embedding to be added to vector store');
    }

    // Ensure embedding is the correct dimension
    if (document.embedding.length !== this.dimension) {
      throw new Error(`Embedding dimension mismatch: expected ${this.dimension}, got ${document.embedding.length}`);
    }

    // Store document metadata
    this.documents.push(document);
  }

  /**
   * Add multiple documents with their embeddings
   */
  async addDocuments(documents: VectorDocument[]): Promise<void> {
    // Validate all documents have embeddings
    const validDocs = documents.filter(doc => {
      if (!doc.embedding) {
        console.warn(`Document ${doc.id} missing embedding, skipping`);
        return false;
      }
      if (doc.embedding.length !== this.dimension) {
        console.warn(`Document ${doc.id} has wrong embedding dimension, skipping`);
        return false;
      }
      return true;
    });

    if (validDocs.length === 0) {
      return;
    }

    // Store document metadata
    this.documents.push(...validDocs);
  }

  /**
   * Search for similar documents using cosine similarity
   */
  async search(
    queryEmbedding: number[], 
    k: number = 10
  ): Promise<SemanticSearchResult[]> {
    if (this.documents.length === 0) {
      return [];
    }

    if (queryEmbedding.length !== this.dimension) {
      throw new Error(`Query embedding dimension mismatch: expected ${this.dimension}, got ${queryEmbedding.length}`);
    }

    // Normalize query embedding for cosine similarity
    const normalizedQuery = this.normalizeVector(queryEmbedding);
    
    // Calculate cosine similarity for all documents
    const similarities = this.documents.map((document, index) => {
      if (!document.embedding) {
        return { index, similarity: 0 };
      }
      
      const similarity = this.cosineSimilarity(normalizedQuery, document.embedding);
      return { index, similarity };
    });
    
    // Sort by similarity and take top k
    similarities.sort((a, b) => b.similarity - a.similarity);
    const topResults = similarities.slice(0, k);
    
    // Convert to search results
    const results: SemanticSearchResult[] = [];
    
    for (const { index, similarity } of topResults) {
      const document = this.documents[index];
      
      results.push({
        contactId: document.contactId,
        score: similarity,
        matchedField: document.type === 'tag' ? 'tag' : 'conversation',
        snippet: this.createSnippet(document.content),
        source: document.type === 'tag' ? 'tags' : 'conversations'
      });
    }

    return results;
  }

  /**
   * Remove a document by ID
   */
  async removeDocument(documentId: string): Promise<boolean> {
    const docIndex = this.documents.findIndex(doc => doc.id === documentId);
    if (docIndex === -1) {
      return false;
    }

    // Remove from documents array
    this.documents.splice(docIndex, 1);
    return true;
  }

  /**
   * Clear all documents and reset the index
   */
  async clear(): Promise<void> {
    this.documents = [];
  }

  /**
   * Get the number of documents in the store
   */
  getDocumentCount(): number {
    return this.documents.length;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Normalize a vector to unit length for cosine similarity
   */
  private normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) {
      return vector;
    }
    return vector.map(val => val / magnitude);
  }

  /**
   * Create a snippet from document content
   */
  private createSnippet(content: string, maxLength: number = 150): string {
    if (content.length <= maxLength) {
      return content;
    }
    
    // Find a good break point (end of word)
    const truncated = content.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace) + '...';
    }
    
    return truncated + '...';
  }
}

// Singleton instance
let vectorStoreInstance: VectorStore | null = null;

export const getVectorStore = (): VectorStore => {
  if (!vectorStoreInstance) {
    vectorStoreInstance = new VectorStore();
  }
  return vectorStoreInstance;
};
