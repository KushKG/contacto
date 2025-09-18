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
