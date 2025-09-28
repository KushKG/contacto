import { getDatabase } from '@contacto/database';
import { 
  Conversation, 
  ConversationCreateData, 
  AudioRecording, 
  EmbeddingSearchResult,
  Contact 
} from '@contacto/shared';
import { getAIService } from './aiService';
import { getAudioService } from './audioService';
import { getHybridSearchService } from './hybridSearchService';

export class ConversationService {
  private db = getDatabase();
  private audioService = getAudioService();

  private normalizeTag(raw: string): string {
    if (!raw) return '';
    let t = String(raw).trim();
    // Remove common prefixes like "professional interests:", "industry/company:", etc.
    t = t.replace(/^professional\s*interests\s*:\s*/i, '')
         .replace(/^industry\s*\/\s*company\s*:\s*/i, '')
         .replace(/^industry\s*:\s*/i, '')
         .replace(/^company\s*:\s*/i, '')
         .replace(/^topic\s*:\s*/i, '')
         .replace(/^interest\s*:\s*/i, '')
         .replace(/^category\s*:\s*/i, '')
         .replace(/^tags?\s*:\s*/i, '');
    // Strip surrounding quotes
    t = t.replace(/^"|"$/g, '').replace(/^'|'$/g, '').trim();
    // Title case words
    t = t.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return t;
  }

  async startRecording(): Promise<void> {
    try {
      await this.audioService.startRecording();
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  async stopRecording(): Promise<AudioRecording> {
    try {
      return await this.audioService.stopRecording();
    } catch (error) {
      console.error('Error stopping recording:', error);
      throw error;
    }
  }

  async processConversation(
    contactId: string, 
    audioRecording: AudioRecording
  ): Promise<Conversation> {
    try {
      const aiService = getAIService();
      
      // Transcribe audio from URI
      const transcription = await aiService.transcribeAudioFromUri(audioRecording.uri);
      
      // Generate summary
      const summary = await aiService.generateConversationSummary(transcription.text);
      
      // Extract tags
      const contact = await this.db.contacts.getContact(contactId);
      const contactName = contact?.name || 'Unknown Contact';
      const tagsRaw = await aiService.extractContactTags(transcription.text, contactName);
      const tags = Array.from(new Set(tagsRaw.map(t => this.normalizeTag(t)).filter(Boolean)));
      
      // Create conversation record
      const conversationData: ConversationCreateData = {
        contactId,
        transcription: transcription.text,
        summary: summary.summary,
        tags,
        audioFilePath: audioRecording.uri,
        duration: audioRecording.duration,
      };

      const conversation = await this.db.conversations.createConversation(conversationData);

      // Persist extracted tags onto the contact (union)
      const existingTags = (contact?.tags || []).map(t => this.normalizeTag(t)).filter(Boolean);
      const tagSet = new Set<string>([...existingTags, ...tags]);
      const mergedTags = Array.from(tagSet);
      const updatedContact = await this.db.contacts.updateContact(contactId, { tags: mergedTags });

      // Rebuild tags-only semantic index so AI search immediately reflects changes
      try {
        const hybrid = getHybridSearchService();
        await hybrid.updateContact(contactId, { tags: mergedTags });
        await hybrid.rebuildTagIndex();
      } catch (idxErr) {
        console.warn('Warning: failed to rebuild tag index after conversation:', idxErr);
      }
      
      return conversation;
    } catch (error) {
      console.error('Error processing conversation:', error);
      throw error;
    }
  }

  async getConversationsByContact(contactId: string): Promise<Conversation[]> {
    return this.db.conversations.getConversationsByContact(contactId);
  }

  async getAllConversations(): Promise<Conversation[]> {
    return this.db.conversations.getAllConversations();
  }

  async getConversation(id: string): Promise<Conversation | null> {
    return this.db.conversations.getConversation(id);
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | null> {
    return this.db.conversations.updateConversation(id, updates);
  }

  async deleteConversation(id: string): Promise<boolean> {
    const conversation = await this.getConversation(id);
    if (!conversation) {
      return false;
    }

    // Delete audio file if present
    if (conversation.audioFilePath) {
      await this.audioService.deleteAudioFile(conversation.audioFilePath);
    }

    // Delete the conversation row
    const deleted = await this.db.conversations.deleteConversation(id);

    // Recompute contact tags from remaining conversations (tags-only semantic index)
    try {
      const remaining = await this.getConversationsByContact(conversation.contactId);
      const unionTags = Array.from(
        new Set(
          remaining.flatMap(c => c.tags || [])
        )
      );
      await this.db.contacts.updateContact(conversation.contactId, { tags: unionTags });

      // Update hybrid index
      const hybrid = getHybridSearchService();
      await hybrid.updateContact(conversation.contactId, { tags: unionTags });
      await hybrid.rebuildTagIndex();
    } catch (recalcErr) {
      console.warn('Warning: failed to recompute tags after deletion:', recalcErr);
    }

    return deleted;
  }

  async searchConversations(query: string): Promise<Conversation[]> {
    return this.db.conversations.searchConversations(query);
  }

  async semanticSearch(
    query: string
  ): Promise<EmbeddingSearchResult[]> {
    try {
      const aiService = getAIService();
      const conversations = await this.getAllConversations();
      
      const conversationData = conversations.map(conv => ({
        id: conv.id,
        contactId: conv.contactId,
        transcription: conv.transcription,
        summary: conv.summary,
      }));

      return await aiService.semanticSearch(query, conversationData);
    } catch (error) {
      console.error('Error in semantic search:', error);
      return [];
    }
  }

  async getContactSuggestionsForQuery(
    query: string
  ): Promise<Contact[]> {
    try {
      const searchResults = await this.semanticSearch(query);
      const contactIds = [...new Set(searchResults.map(result => result.contactId))];
      
      const contacts = await Promise.all(
        contactIds.map(id => this.db.contacts.getContact(id))
      );

      return contacts.filter((contact): contact is Contact => contact !== null);
    } catch (error) {
      console.error('Error getting contact suggestions:', error);
      return [];
    }
  }

  // Stage 2: Enhanced semantic search with contact embeddings
  async hybridSearch(query: string): Promise<Contact[]> {
    try {
      const aiService = getAIService();
      
      // Get all contacts with their conversation data for embedding
      const contacts = await this.db.contacts.getAllContacts();
      const conversations = await this.getAllConversations();
      
      // Build enriched contact data for semantic search
      const enrichedContacts = await Promise.all(
        contacts.map(async (contact) => {
          const contactConversations = conversations.filter(conv => conv.contactId === contact.id);
          
          // Concatenate contact info + tags + conversation summaries for embedding
          const contactText = [
            contact.name,
            ...(contact.tags || []),
            contact.notes || '',
            ...contactConversations.map(conv => conv.summary),
            ...contactConversations.slice(0, 3).map(conv => conv.transcription.substring(0, 500)) // Recent transcripts (truncated)
          ].filter(Boolean).join(' ');
          
          return {
            contact,
            searchText: contactText,
            conversationCount: contactConversations.length,
            lastConversation: contactConversations.length > 0 
              ? Math.max(...contactConversations.map(c => c.createdAt.getTime()))
              : 0
          };
        })
      );

      // Perform semantic search on enriched contact data
      const searchResults = await aiService.semanticSearchContacts(query, enrichedContacts);
      
      // Sort by relevance score and recency
      return searchResults
        .sort((a, b) => {
          // Primary sort by similarity score
          if (Math.abs(a.similarity - b.similarity) > 0.1) {
            return b.similarity - a.similarity;
          }
          // Secondary sort by conversation activity
          return b.conversationCount - a.conversationCount;
        })
        .slice(0, 20) // Limit results
        .map(result => result.contact);
        
    } catch (error) {
      console.error('Error in hybrid search:', error);
      return [];
    }
  }

  // Stage 3: Combined keyword + semantic search
  async combinedSearch(query: string): Promise<Contact[]> {
    try {
      // Run both searches in parallel
      const [keywordResults, semanticResults] = await Promise.all([
        this.db.contacts.searchContacts({ query }),
        this.hybridSearch(query)
      ]);

      // Merge results, prioritizing exact matches
      const keywordIds = new Set(keywordResults.map(contact => contact.id));
      const semanticUnique = semanticResults.filter(contact => !keywordIds.has(contact.id));
      
      // Combine: keyword matches first (exact), then semantic matches (similar)
      const combinedResults = [...keywordResults, ...semanticUnique];
      
      // Limit total results
      return combinedResults.slice(0, 50);
      
    } catch (error) {
      console.error('Error in combined search:', error);
      // Fallback to keyword search only
      return this.db.contacts.searchContacts({ query });
    }
  }

  async playConversationAudio(conversationId: string): Promise<void> {
    const conversation = await this.getConversation(conversationId);
    if (conversation?.audioFilePath) {
      await this.audioService.playAudio(conversation.audioFilePath);
    } else {
      throw new Error('No audio file found for this conversation');
    }
  }

  // No longer needed: converting uri to File. We pass the uri directly to AI service.

  async getConversationStats(): Promise<{
    totalConversations: number;
    totalDuration: number;
    averageDuration: number;
    mostActiveContact: string | null;
  }> {
    try {
      const conversations = await this.getAllConversations();
      
      const totalConversations = conversations.length;
      const totalDuration = conversations.reduce((sum, conv) => sum + (conv.duration || 0), 0);
      const averageDuration = totalConversations > 0 ? totalDuration / totalConversations : 0;
      
      // Find most active contact
      const contactCounts: { [key: string]: number } = {};
      conversations.forEach(conv => {
        contactCounts[conv.contactId] = (contactCounts[conv.contactId] || 0) + 1;
      });
      
      const mostActiveContactId = Object.keys(contactCounts).reduce((a, b) => 
        contactCounts[a] > contactCounts[b] ? a : b, ''
      );
      
      const mostActiveContact = mostActiveContactId ? 
        (await this.db.contacts.getContact(mostActiveContactId))?.name || null : null;

      return {
        totalConversations,
        totalDuration,
        averageDuration,
        mostActiveContact,
      };
    } catch (error) {
      console.error('Error getting conversation stats:', error);
      return {
        totalConversations: 0,
        totalDuration: 0,
        averageDuration: 0,
        mostActiveContact: null,
      };
    }
  }

  async clearAllTags(): Promise<void> {
    return this.db.conversations.clearAllTags();
  }
}

// Singleton instance
let conversationServiceInstance: ConversationService | null = null;

export const getConversationService = (): ConversationService => {
  if (!conversationServiceInstance) {
    conversationServiceInstance = new ConversationService();
  }
  return conversationServiceInstance;
};
