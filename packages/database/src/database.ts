import * as SQLite from 'expo-sqlite';
import { ContactRepository } from './contactRepository';
import { ConversationRepository } from './conversationRepository';

export class Database {
  private db: SQLite.SQLiteDatabase;
  public contacts: ContactRepository;
  public conversations: ConversationRepository;

  constructor() {
    this.db = SQLite.openDatabaseSync('contacto.db');
    this.contacts = new ContactRepository(this.db);
    this.conversations = new ConversationRepository(this.db);
  }

  async initialize(): Promise<void> {
    await this.contacts.initialize();
    await this.conversations.initialize();
    // No mock data; user will import on first run
  }

  async populateMockDataIfEmpty(): Promise<void> {
    try {
      // Deprecated in production; keeping for reference
      // await this.clearAllData();
      // ... add mock contacts here if needed for tests
    } catch (error) {
      console.error('❌ Error populating mock data:', error);
    }
  }

  async clearAllData(): Promise<void> {
    try {
      // Clear all conversations
      this.db.execSync('DELETE FROM conversations');
      
      // Clear all contacts
      this.db.execSync('DELETE FROM contacts');
      
      console.log('✅ All data cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing data:', error);
    }
  }

  async close(): Promise<void> {
    // SQLite database will be closed automatically when the app closes
    // This is here for future extensibility
  }
}

// Singleton instance
let databaseInstance: Database | null = null;

export const getDatabase = (): Database => {
  if (!databaseInstance) {
    databaseInstance = new Database();
  }
  return databaseInstance;
};
