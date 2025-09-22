import { getDatabase } from '@contacto/database';
import { getAIService } from './aiService';
import { KeywordSearchService } from './keywordSearchService';

// Local types moved here to avoid shared package issues
export interface SearchResult {
  contactId: string;
  name: string;
  score: number;
  matchedField?: string;
  snippet?: string;
}

export interface SemanticSearchResult {
  contactId: string;
  score: number; // cosine similarity 0..1
  matchedField?: string;
  snippet?: string;
}

export interface KeywordSearchResult {
  contactId: string;
  score: number; // 0..1 from simple scoring
  matchedField: 'name' | 'email' | 'phone' | 'tags' | 'notes' | 'any';
  snippet?: string;
}

export interface SearchConfig {
  semanticWeight: number;
  keywordWeight: number;
  maxResults: number;
}

export const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  semanticWeight: 0.7,
  keywordWeight: 0.6,
  maxResults: 25,
};

// Simple in-memory vector store
export interface VectorDocument {
  id: string;
  embedding: number[];
}

class VectorStore {
  private documents: VectorDocument[] = [];
  private dimension: number | null = null;

  async initialize(): Promise<void> {
    this.documents = [];
    this.dimension = 1536; // OpenAI text-embedding-3-small
  }

  async clear(): Promise<void> {
    this.documents = [];
  }

  private normalizeVector(vector: number[]): number[] {
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    return norm === 0 ? vector : vector.map(v => v / norm);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
    return sum;
  }

  async addDocument(document: VectorDocument): Promise<void> {
    if (this.dimension === null) {
      this.dimension = document.embedding.length;
    }
    if (document.embedding.length !== this.dimension) {
      throw new Error(`Embedding dimension mismatch: expected ${this.dimension}, got ${document.embedding.length}`);
    }
    this.documents.push(document);
  }

  async addDocuments(documents: VectorDocument[]): Promise<void> {
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
    this.documents.push(...validDocs);
  }

  async search(queryEmbedding: number[], k: number = 10): Promise<SemanticSearchResult[]> {
    if (this.documents.length === 0) {
      return [];
    }

    if (queryEmbedding.length !== this.dimension) {
      throw new Error(`Query embedding dimension mismatch: expected ${this.dimension}, got ${queryEmbedding.length}`);
    }

    const normalizedQuery = this.normalizeVector(queryEmbedding);
    
    const similarities = this.documents.map((document, index) => {
      if (!document.embedding) {
        return { index, similarity: 0 };
      }
      const similarity = this.cosineSimilarity(normalizedQuery, document.embedding);
      return { index, similarity };
    });
    
    similarities.sort((a, b) => b.similarity - a.similarity);

    const top = similarities.slice(0, k).map(({ index, similarity }) => {
      return {
        contactId: this.documents[index].id,
        score: similarity,
      } as SemanticSearchResult;
    });

    return top;
  }
}

export class HybridSearchService {
  private db = getDatabase();
  private aiService = getAIService();
  private vectorStore: VectorStore | null = null;
  private keywordSearchService: KeywordSearchService;
  private config: SearchConfig;
  private lastDebug: Array<{ contactId: string; semantic: number; keyword: number; final: number; matchedField?: string; snippet?: string } > = [];

  constructor(config: Partial<SearchConfig> = {}) {
    this.config = { ...DEFAULT_SEARCH_CONFIG, ...config };
    this.keywordSearchService = new KeywordSearchService((this.db as any).db);
  }

  /** Initialize services */
  async initialize(): Promise<void> {
    await this.keywordSearchService.initialize();
    this.vectorStore = new VectorStore();
    await this.vectorStore.initialize();
    await this.buildVectorIndex();
  }

  /** Standard hybrid search (semantic + keyword). Used by combined paths. */
  async search(query: string): Promise<SearchResult[]> {
    if (!query.trim()) {
      this.lastDebug = [];
      return [];
    }

    try {
      const [semanticResults, keywordResults] = await Promise.all([
        this.performSemanticSearch(query),
        this.performKeywordSearch(query)
      ]);

      const semMap = new Map<string, SemanticSearchResult>();
      for (const s of semanticResults) semMap.set(s.contactId, s);
      const keyMap = new Map<string, KeywordSearchResult>();
      for (const k of keywordResults) keyMap.set(k.contactId, k);

      const mergedResults = this.mergeAndRankResults(semanticResults, keywordResults);
      const enrichedResults = await this.enrichResults(mergedResults);
      
      this.lastDebug = enrichedResults.map(r => {
        const sem = semMap.get(r.contactId)?.score ?? 0;
        const key = keyMap.get(r.contactId)?.score ?? 0;
        const mf = keyMap.get(r.contactId)?.matchedField || semMap.get(r.contactId)?.matchedField;
        const sn = keyMap.get(r.contactId)?.snippet || semMap.get(r.contactId)?.snippet;
        return { contactId: r.contactId, semantic: sem, keyword: key, final: r.score, matchedField: mf, snippet: sn };
      }).sort((a, b) => b.final - a.final);

      return enrichedResults.sort((a, b) => b.score - a.score).slice(0, this.config.maxResults);

    } catch (error) {
      console.error('Error in hybrid search:', error);
      this.lastDebug = [];
      try {
        const keywordResults = await this.performKeywordSearch(query);
        const contactIds = keywordResults.map(r => r.contactId);
        const contacts = await Promise.all(contactIds.map(id => this.db.contacts.getContact(id)));
        const valid = contacts.filter((c): c is any => c !== null);
        return valid.map(c => ({ contactId: c.id, name: c.name || '', score: 0.5 }));
      } catch {
        return [];
      }
    }
  }

  /** Semantic-only search over tags */
  async searchTagsOnly(query: string): Promise<SearchResult[]> {
    if (!query.trim()) {
      this.lastDebug = [];
      return [];
    }
    const semanticResults = await this.performSemanticSearch(query);
    const contacts = await Promise.all(semanticResults.map(r => this.db.contacts.getContact(r.contactId)));
    const enriched: SearchResult[] = semanticResults.map((r, i) => ({
      contactId: r.contactId,
      name: contacts[i]?.name || '',
      score: r.score * this.config.semanticWeight,
    }));
    // Build debug with keyword=0
    this.lastDebug = enriched.map(r => ({ contactId: r.contactId, semantic: r.score / this.config.semanticWeight, keyword: 0, final: r.score, })).sort((a, b) => b.final - a.final);
    return enriched.sort((a, b) => b.score - a.score).slice(0, this.config.maxResults);
  }

  getLastDebug() {
    return this.lastDebug;
  }

  private mergeAndRankResults(
    semanticResults: SemanticSearchResult[],
    keywordResults: KeywordSearchResult[]
  ): SearchResult[] {
    const contactMap = new Map<string, SearchResult>();

    for (const result of semanticResults) {
      contactMap.set(result.contactId, {
        contactId: result.contactId,
        name: '',
        score: result.score * this.config.semanticWeight,
        matchedField: result.matchedField,
        snippet: result.snippet,
      });
    }

    for (const result of keywordResults) {
      const existing = contactMap.get(result.contactId);
      let keywordScore = result.score * this.config.keywordWeight;
      if (result.matchedField === 'name' && result.score > 0.8) {
        keywordScore *= 3;
      }
      if (existing) {
        if (result.matchedField === 'name' && result.score > 0.8) {
          existing.score = keywordScore;
        } else {
          existing.score = Math.max(existing.score, keywordScore);
        }
        if (['name', 'email', 'phone'].includes(result.matchedField)) {
          existing.snippet = result.snippet;
        }
      } else {
        contactMap.set(result.contactId, {
          contactId: result.contactId,
          name: '',
          score: keywordScore,
          matchedField: result.matchedField,
          snippet: result.snippet,
        });
      }
    }

    return Array.from(contactMap.values());
  }

  private async enrichResults(results: SearchResult[]): Promise<SearchResult[]> {
    const contacts = await Promise.all(results.map(r => this.db.contacts.getContact(r.contactId)));
    return results.map((r, i) => ({ ...r, name: contacts[i]?.name || '' }));
  }

  /** Build vector index from tags only */
  async buildVectorIndex(): Promise<void> {
    try {
      if (!this.vectorStore) return;
      await this.vectorStore.clear();
      const allContacts = await this.db.contacts.getAllContacts();
      const documents: VectorDocument[] = [];
      for (const c of allContacts) {
        const tagText = (c.tags || []).join(' ').trim();
        if (!tagText) continue;
        const embedding = await this.aiService.generateEmbeddingCached(`tags: ${tagText}`);
        documents.push({ id: c.id, embedding });
      }
      await this.vectorStore.addDocuments(documents);
    } catch (error) {
      console.warn('Failed to build vector index:', error);
    }
  }

  /** Public rebuild hook for tags-only index */
  async rebuildTagIndex(): Promise<void> {
    await this.buildVectorIndex();
  }

  private async performSemanticSearch(query: string): Promise<SemanticSearchResult[]> {
    try {
      if (!this.vectorStore) return [];
      const qEmbed = await this.aiService.generateEmbeddingCached(query);
      return await this.vectorStore.search(qEmbed, this.config.maxResults);
    } catch (error) {
      console.warn('Semantic search failed:', error);
      return [];
    }
  }

  private async performKeywordSearch(query: string): Promise<KeywordSearchResult[]> {
    try {
      return await this.keywordSearchService.search(query, this.config.maxResults);
    } catch (error) {
      console.warn('Keyword search failed:', error);
      return [];
    }
  }

  async updateContact(contactId: string, updates: any): Promise<void> {
    try {
      await this.keywordSearchService.updateContact(contactId, updates);
    } catch (error) {
      console.warn('Failed to update keyword search index:', error);
    }
    if (updates.tags !== undefined) {
      try {
        await this.rebuildTagIndex();
      } catch (error) {
        console.warn('Failed to update vector store:', error);
      }
    }
  }
}

let hybridSearchServiceInstance: HybridSearchService | null = null;
export const getHybridSearchService = (config?: Partial<SearchConfig>): HybridSearchService => {
  if (!hybridSearchServiceInstance) {
    hybridSearchServiceInstance = new HybridSearchService(config);
  }
  return hybridSearchServiceInstance;
};
