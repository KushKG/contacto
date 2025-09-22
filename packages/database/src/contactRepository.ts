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
        imageUri TEXT,
        tags TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);
    
    // Add missing columns if they don't exist (for existing databases)
    try {
      this.db.execSync(`ALTER TABLE contacts ADD COLUMN imageUri TEXT;`);
    } catch (error) {
      // Column already exists, ignore error
    }
    
    try {
      this.db.execSync(`ALTER TABLE contacts ADD COLUMN tags TEXT;`);
    } catch (error) {
      // Column already exists, ignore error
    }
  }

  async createContact(data: ContactCreateData): Promise<Contact> {
    const id = `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const tagsJson = data.tags ? JSON.stringify(data.tags) : null;
    
    this.db.runSync(
      `INSERT INTO contacts (id, name, phone, email, notes, imageUri, tags, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.name, data.phone || null, data.email || null, data.notes || null, data.imageUri || null, tagsJson, now, now]
    );

    const contact: Contact = {
      id,
      name: data.name,
      phone: data.phone,
      email: data.email,
      notes: data.notes,
      imageUri: data.imageUri,
      tags: data.tags,
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
      imageUri: result.imageUri,
      tags: result.tags ? JSON.parse(result.tags) : [],
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
      imageUri: row.imageUri,
      tags: row.tags ? JSON.parse(row.tags) : [],
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    }));
  }

  async updateContact(id: string, data: ContactUpdateData): Promise<Contact | null> {
    const now = new Date().toISOString();
    const tagsJson = data.tags ? JSON.stringify(data.tags) : null;
    
    const result = this.db.runSync(
      `UPDATE contacts 
       SET name = COALESCE(?, name),
           phone = COALESCE(?, phone),
           email = COALESCE(?, email),
           notes = COALESCE(?, notes),
           imageUri = COALESCE(?, imageUri),
           tags = COALESCE(?, tags),
           updatedAt = ?
       WHERE id = ?`,
      [data.name || null, data.phone || null, data.email || null, data.notes || null, data.imageUri || null, tagsJson, now, id]
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
    
    // Stage 1: Enhanced keyword search across all fields including tags
    const results = this.db.getAllSync(
      `SELECT * FROM contacts 
       WHERE name LIKE ? 
          OR phone LIKE ? 
          OR email LIKE ? 
          OR notes LIKE ?
          OR tags LIKE ?
       ORDER BY 
         CASE 
           WHEN name LIKE ? THEN 1
           WHEN phone LIKE ? THEN 2
           WHEN email LIKE ? THEN 3
           WHEN tags LIKE ? THEN 4
           WHEN notes LIKE ? THEN 5
           ELSE 6
         END,
         name ASC
       LIMIT ? OFFSET ?`,
      [
        `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, // WHERE clause
        `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, // ORDER BY clause
        limit, offset
      ]
    );

    return results.map((row: any) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      notes: row.notes,
      imageUri: row.imageUri,
      tags: row.tags ? JSON.parse(row.tags) : [],
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    }));
  }

  async searchContactsByTag(tag: string): Promise<Contact[]> {
    const results = this.db.getAllSync(
      `SELECT * FROM contacts 
       WHERE tags LIKE ?
       ORDER BY name ASC`,
      [`%"${tag}"%`]
    );

    return results.map((row: any) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      notes: row.notes,
      imageUri: row.imageUri,
      tags: row.tags ? JSON.parse(row.tags) : [],
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    }));
  }

  async getContactsWithTags(): Promise<Contact[]> {
    const results = this.db.getAllSync(
      `SELECT * FROM contacts 
       WHERE tags IS NOT NULL AND tags != '[]'
       ORDER BY name ASC`
    );

    return results.map((row: any) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      notes: row.notes,
      imageUri: row.imageUri,
      tags: row.tags ? JSON.parse(row.tags) : [],
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    }));
  }

  async clearAllTags(): Promise<void> {
    const now = new Date().toISOString();
    this.db.runSync(
      `UPDATE contacts SET tags = NULL, updatedAt = ?`,
      [now]
    );
  }
}
