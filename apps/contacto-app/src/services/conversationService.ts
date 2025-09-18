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

export class ConversationService {
  private db = getDatabase();
  private audioService = getAudioService();

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
      const tags = await aiService.extractContactTags(transcription.text, contactName);
      
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
    if (conversation?.audioFilePath) {
      await this.audioService.deleteAudioFile(conversation.audioFilePath);
    }
    return this.db.conversations.deleteConversation(id);
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
}

// Singleton instance
let conversationServiceInstance: ConversationService | null = null;

export const getConversationService = (): ConversationService => {
  if (!conversationServiceInstance) {
    conversationServiceInstance = new ConversationService();
  }
  return conversationServiceInstance;
};
