import * as SQLite from 'expo-sqlite';
import { Contact, ContactCreateData, ContactUpdateData, ContactSearchParams } from '@contacto/shared';

export class ContactRepository {
  private db: SQLite.SQLiteDatabase;

  constructor(database: SQLite.SQLiteDatabase) {
    this.db = database;
  }

  async initialize(): Promise<void> {
    this.db.execSync(`
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);
  }

  async createContact(data: ContactCreateData): Promise<Contact> {
    const id = `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    this.db.runSync(
      `INSERT INTO contacts (id, name, phone, email, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, data.name, data.phone || null, data.email || null, data.notes || null, now, now]
    );

    const contact: Contact = {
      id,
      name: data.name,
      phone: data.phone,
      email: data.email,
      notes: data.notes,
      createdAt: new Date(now),
      updatedAt: new Date(now)
    };
    
    return contact;
  }

  async getContact(id: string): Promise<Contact | null> {
    const result = this.db.getFirstSync('SELECT * FROM contacts WHERE id = ?', [id]) as any;
    
    if (!result) {
      return null;
    }

    return {
      id: result.id,
      name: result.name,
      phone: result.phone,
      email: result.email,
      notes: result.notes,
      createdAt: new Date(result.createdAt),
      updatedAt: new Date(result.updatedAt)
    };
  }

  async getAllContacts(): Promise<Contact[]> {
    const results = this.db.getAllSync('SELECT * FROM contacts ORDER BY name ASC');
    
    return results.map((row: any) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      notes: row.notes,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    }));
  }

  async updateContact(id: string, data: ContactUpdateData): Promise<Contact | null> {
    const now = new Date().toISOString();
    
    const result = this.db.runSync(
      `UPDATE contacts 
       SET name = COALESCE(?, name),
           phone = COALESCE(?, phone),
           email = COALESCE(?, email),
           notes = COALESCE(?, notes),
           updatedAt = ?
       WHERE id = ?`,
      [data.name || null, data.phone || null, data.email || null, data.notes || null, now, id]
    );

    if (result.changes > 0) {
      return this.getContact(id);
    } else {
      return null;
    }
  }

  async deleteContact(id: string): Promise<boolean> {
    const result = this.db.runSync('DELETE FROM contacts WHERE id = ?', [id]);
    return result.changes > 0;
  }

  async searchContacts(params: ContactSearchParams): Promise<Contact[]> {
    const { query, limit = 50, offset = 0 } = params;
    
    const results = this.db.getAllSync(
      `SELECT * FROM contacts 
       WHERE name LIKE ? OR phone LIKE ? OR email LIKE ? OR notes LIKE ?
       ORDER BY name ASC
       LIMIT ? OFFSET ?`,
      [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, limit, offset]
    );

    return results.map((row: any) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      notes: row.notes,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    }));
  }
}
