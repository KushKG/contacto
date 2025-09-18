import * as SQLite from 'expo-sqlite';
import { Conversation, ConversationCreateData } from '@contacto/shared';

export class ConversationRepository {
  private db: SQLite.SQLiteDatabase;

  constructor(database: SQLite.SQLiteDatabase) {
    this.db = database;
  }

  async initialize(): Promise<void> {
    this.db.execSync(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        contactId TEXT NOT NULL,
        transcription TEXT NOT NULL,
        summary TEXT NOT NULL,
        tags TEXT NOT NULL,
        audioFilePath TEXT,
        duration INTEGER,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (contactId) REFERENCES contacts (id) ON DELETE CASCADE
      );
    `);
  }

  async createConversation(data: ConversationCreateData): Promise<Conversation> {
    const id = `conversation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    this.db.runSync(
      `INSERT INTO conversations (id, contactId, transcription, summary, tags, audioFilePath, duration, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, 
        data.contactId, 
        data.transcription, 
        data.summary, 
        JSON.stringify(data.tags),
        data.audioFilePath || null,
        data.duration || null,
        now, 
        now
      ]
    );

    const conversation: Conversation = {
      id,
      contactId: data.contactId,
      transcription: data.transcription,
      summary: data.summary,
      tags: data.tags,
      audioFilePath: data.audioFilePath,
      duration: data.duration,
      createdAt: new Date(now),
      updatedAt: new Date(now)
    };
    
    return conversation;
  }

  async getConversationsByContact(contactId: string): Promise<Conversation[]> {
    const results = this.db.getAllSync(
      'SELECT * FROM conversations WHERE contactId = ? ORDER BY createdAt DESC',
      [contactId]
    );

    return results.map((row: any) => ({
      id: row.id,
      contactId: row.contactId,
      transcription: row.transcription,
      summary: row.summary,
      tags: JSON.parse(row.tags),
      audioFilePath: row.audioFilePath,
      duration: row.duration,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    }));
  }

  async getAllConversations(): Promise<Conversation[]> {
    const results = this.db.getAllSync('SELECT * FROM conversations ORDER BY createdAt DESC');

    return results.map((row: any) => ({
      id: row.id,
      contactId: row.contactId,
      transcription: row.transcription,
      summary: row.summary,
      tags: JSON.parse(row.tags),
      audioFilePath: row.audioFilePath,
      duration: row.duration,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    }));
  }

  async getConversation(id: string): Promise<Conversation | null> {
    const result = this.db.getFirstSync('SELECT * FROM conversations WHERE id = ?', [id]) as any;
    
    if (!result) {
      return null;
    }

    return {
      id: result.id,
      contactId: result.contactId,
      transcription: result.transcription,
      summary: result.summary,
      tags: JSON.parse(result.tags),
      audioFilePath: result.audioFilePath,
      duration: result.duration,
      createdAt: new Date(result.createdAt),
      updatedAt: new Date(result.updatedAt)
    };
  }

  async deleteConversation(id: string): Promise<boolean> {
    const result = this.db.runSync('DELETE FROM conversations WHERE id = ?', [id]);
    return result.changes > 0;
  }

  async searchConversations(query: string): Promise<Conversation[]> {
    const results = this.db.getAllSync(
      `SELECT * FROM conversations 
       WHERE transcription LIKE ? OR summary LIKE ? OR tags LIKE ?
       ORDER BY createdAt DESC`,
      [`%${query}%`, `%${query}%`, `%${query}%`]
    );

    return results.map((row: any) => ({
      id: row.id,
      contactId: row.contactId,
      transcription: row.transcription,
      summary: row.summary,
      tags: JSON.parse(row.tags),
      audioFilePath: row.audioFilePath,
      duration: row.duration,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    }));
  }
}
