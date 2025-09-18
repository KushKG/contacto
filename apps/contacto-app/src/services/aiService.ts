import OpenAI from 'openai';
import { TranscriptionResult, ConversationSummary, EmbeddingSearchResult } from '@contacto/shared';
import { APIKeyService } from './apiKeyService';
import * as FileSystem from 'expo-file-system/legacy';

export class AIService {
  private openai: OpenAI | null = null;

  constructor() {
    this.initializeOpenAI();
  }

  private async initializeOpenAI() {
    const apiKey = await APIKeyService.getAPIKey();
    if (apiKey) {
      this.openai = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true, // For React Native compatibility
      });
    }
  }

  private async ensureOpenAI(): Promise<OpenAI> {
    if (!this.openai) {
      await this.initializeOpenAI();
      if (!this.openai) {
        throw new Error('OpenAI API key not found. Please configure it in Settings.');
      }
    }
    return this.openai;
  }

  async transcribeAudioFromUri(fileUri: string): Promise<TranscriptionResult> {
    try {
      const apiKey = await APIKeyService.getAPIKey();
      if (!apiKey) throw new Error("Missing API key");
  
      // Ensure proper prefix
      const normalizedUri = fileUri.startsWith("file://") ? fileUri : `file://${fileUri}`;
      console.log("Uploading file with XHR:", normalizedUri);
  
      // Upload to our backend proxy instead of OpenAI directly
      const formData = new FormData();
      formData.append("file", {
        uri: normalizedUri,
        type: "audio/wav",
        name: "recording.wav",
      } as any);

      console.log("Uploading to backend proxy...");
      
      // Replace localhost with your machine's IP if testing on device
      const backendUrl = "http://localhost:3001/transcribe";
      
      const response = await fetch(backendUrl, {
        method: "POST",
        body: formData,
      });

      console.log("Backend response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Transcription failed: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
  
      console.log("Transcription response:", result);
  
      return {
        text: result.text,
        confidence: 0.95,
        language: result.language || "en",
      };
    } catch (error) {
      console.error("Error transcribing audio:", error);
      throw error;
    }
  }
  
  
  
  
  
  
  

  async generateConversationSummary(transcription: string): Promise<ConversationSummary> {
    try {
      const openai = await this.ensureOpenAI();
      
      const prompt = `Analyze the following conversation and provide:
1. A brief summary (2-3 sentences)
2. Key points discussed (bullet points)
3. Overall sentiment (positive/neutral/negative)
4. Main topics discussed

Conversation: "${transcription}"

Please respond in JSON format:
{
  "summary": "brief summary here",
  "keyPoints": ["point1", "point2", "point3"],
  "sentiment": "positive|neutral|negative",
  "topics": ["topic1", "topic2", "topic3"]
}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(content);
      
      return {
        summary: parsed.summary,
        keyPoints: parsed.keyPoints,
        sentiment: parsed.sentiment,
        topics: parsed.topics,
      };
    } catch (error) {
      console.error('Error generating summary:', error);
      throw error;
    }
  }

  async extractContactTags(transcription: string, contactName: string): Promise<string[]> {
    try {
      const openai = await this.ensureOpenAI();
      
      const prompt = `Analyze this conversation and extract relevant tags for ${contactName}. 
      Focus on:
      - Professional interests/skills
      - Personal interests/hobbies
      - Industry/company mentions
      - Location references
      - Relationship context (colleague, friend, client, etc.)

      Conversation: "${transcription}"

      Return only a JSON array of tags (max 10): ["tag1", "tag2", "tag3"]`;

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const tags = JSON.parse(content);
      return Array.isArray(tags) ? tags : [];
    } catch (error) {
      console.error('Error extracting tags:', error);
      return [];
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const openai = await this.ensureOpenAI();
      
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  async semanticSearch(
    query: string, 
    conversations: Array<{ id: string; contactId: string; transcription: string; summary: string }>
  ): Promise<EmbeddingSearchResult[]> {
    try {
      // Generate embedding for the search query
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Generate embeddings for all conversations
      const conversationEmbeddings = await Promise.all(
        conversations.map(async (conv) => ({
          ...conv,
          embedding: await this.generateEmbedding(`${conv.transcription} ${conv.summary}`),
        }))
      );

      // Calculate cosine similarity
      const results = conversationEmbeddings.map((conv) => {
        const similarity = this.cosineSimilarity(queryEmbedding, conv.embedding);
        return {
          contactId: conv.contactId,
          conversationId: conv.id,
          similarity,
          matchedText: conv.transcription.substring(0, 200) + '...',
        };
      });

      // Sort by similarity and return top results
      return results
        .sort((a, b) => b.similarity - a.similarity)
        .filter(result => result.similarity > 0.7) // Only return relevant results
        .slice(0, 10);
    } catch (error) {
      console.error('Error in semantic search:', error);
      return [];
    }
  }

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

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

// Singleton instance
let aiServiceInstance: AIService | null = null;

export const getAIService = (): AIService => {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService();
  }
  return aiServiceInstance;
};
