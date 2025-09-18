export interface Contact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactSearchParams {
  query: string;
  limit?: number;
  offset?: number;
}

export interface ContactCreateData {
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export interface ContactUpdateData {
  name?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

// Stage 2 types
export interface Conversation {
  id: string;
  contactId: string;
  transcription: string;
  summary: string;
  tags: string[];
  audioFilePath?: string;
  duration?: number; // in seconds
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationCreateData {
  contactId: string;
  transcription: string;
  summary: string;
  tags: string[];
  audioFilePath?: string;
  duration?: number;
}

export interface AudioRecording {
  uri: string;
  duration: number;
  size: number;
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  language: string;
}

export interface ConversationSummary {
  summary: string;
  keyPoints: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  topics: string[];
}

export interface EmbeddingSearchResult {
  contactId: string;
  conversationId: string;
  similarity: number;
  matchedText: string;
}

// Stage 3 types (for future use)
export interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  suggestedContacts: string[];
}

export interface ConnectionSuggestion {
  contact1Id: string;
  contact2Id: string;
  reason: string;
  confidence: number;
}
