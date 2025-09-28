import * as SQLite from 'expo-sqlite';
import { KeywordSearchResult, KeywordDocument } from '@contacto/shared';

export class KeywordSearchService {
  private db: SQLite.SQLiteDatabase;

  constructor(database: SQLite.SQLiteDatabase) {
    this.db = database;
  }

  /**
   * Initialize keyword search (FTS5 disabled due to column issues)
   */
  async initialize(): Promise<void> {
    try {
      
      // Temporarily disable FTS5 due to column structure issues
      // Use simple keyword search instead
      this.fts5Available = false;
      
      // Clean up any existing FTS5 artifacts
      try {
        this.db.execSync(`DROP TRIGGER IF EXISTS contacts_ai;`);
        this.db.execSync(`DROP TRIGGER IF EXISTS contacts_ad;`);
        this.db.execSync(`DROP TRIGGER IF EXISTS contacts_au;`);
        this.db.execSync(`DROP TABLE IF EXISTS contacts_fts;`);
      } catch (cleanupError) {
        console.warn('Warning during FTS5 cleanup:', cleanupError);
      }
      
    } catch (error) {
      console.error('❌ Error initializing keyword search:', error);
      this.fts5Available = false;
    }
  }

  /**
   * Search for contacts using simple keyword search
   */
  async search(query: string, limit: number = 10): Promise<KeywordSearchResult[]> {
    if (!query.trim()) {
      return [];
    }

    // Use simple search since FTS5 is disabled
    return await this.performSimpleSearch(query, limit);
  }

  /**
   * Perform FTS5 full-text search (currently disabled)
   */
  private async performFTS5Search(query: string, limit: number): Promise<KeywordSearchResult[]> {
    // Check if FTS5 table exists and has data
    try {
      const tableInfo = this.db.getAllSync("PRAGMA table_info(contacts_fts)") as any[];
      if (tableInfo.length === 0) {
        throw new Error('FTS5 table does not exist');
      }
      
      const count = this.db.getFirstSync("SELECT COUNT(*) as count FROM contacts_fts") as any;
      if (count.count === 0) {
        throw new Error('FTS5 table is empty');
      }
    } catch (error) {
      throw new Error('FTS5 not available: ' + error);
    }

    // Escape special FTS5 characters and create search terms
    const escapedQuery = this.escapeFTSQuery(query);
    const searchTerms = escapedQuery.split(/\s+/).filter(term => term.length > 0);
    
    if (searchTerms.length === 0) {
      return [];
    }

    // Build FTS5 query with ranking
    const ftsQuery = searchTerms.join(' AND ');
    
    const results = this.db.getAllSync(`
      SELECT 
        c.id as contact_id,
        c.name,
        c.email,
        c.phone,
        c.tags,
        contacts_fts.rank,
        CASE 
          WHEN c.name MATCH ? THEN 'name'
          WHEN c.email MATCH ? THEN 'email'
          WHEN c.phone MATCH ? THEN 'phone'
          WHEN c.tags MATCH ? THEN 'tags'
          ELSE 'name'
        END as matched_field
      FROM contacts_fts
      JOIN contacts c ON c.id = contacts_fts.contact_id
      WHERE contacts_fts MATCH ?
      ORDER BY contacts_fts.rank
      LIMIT ?
    `, [ftsQuery, ftsQuery, ftsQuery, ftsQuery, ftsQuery, limit]) as any[];

    // Convert to KeywordSearchResult format
    return results.map((row: any) => {
      const score = this.calculateKeywordScore(row, searchTerms);
      const snippet = this.createSnippet(row, searchTerms);

      return {
        contactId: row.contact_id,
        score,
        matchedField: row.matched_field as 'name' | 'email' | 'phone',
        snippet,
        matchCount: searchTerms.length
      };
    });
  }

  /**
   * Perform simple LIKE-based search as fallback
   */
  private async performSimpleSearch(query: string, limit: number): Promise<KeywordSearchResult[]> {
    const searchTerms = query.split(/\s+/).filter(term => term.length > 0);
    
    if (searchTerms.length === 0) {
      return [];
    }

    try {
      // Simplified search - just search for any term in any field
      const firstTerm = `%${searchTerms[0]}%`;
      
      const results = this.db.getAllSync(`
        SELECT 
          id as contact_id,
          name,
          email,
          phone,
          tags
        FROM contacts
        WHERE name LIKE ? 
           OR email LIKE ? 
           OR phone LIKE ? 
           OR tags LIKE ?
        ORDER BY 
          CASE 
            WHEN name LIKE ? THEN 1
            WHEN email LIKE ? THEN 2
            WHEN phone LIKE ? THEN 3
            WHEN tags LIKE ? THEN 4
            ELSE 5
          END,
          name ASC
        LIMIT ?
      `, [firstTerm, firstTerm, firstTerm, firstTerm, firstTerm, firstTerm, firstTerm, firstTerm, limit]) as any[];

      // Convert to KeywordSearchResult format
      return results.map((row: any) => {
        const score = this.calculateKeywordScore(row, searchTerms);
        const snippet = this.createSnippet(row, searchTerms);
        
        // Determine matched field
        let matchedField: 'name' | 'email' | 'phone' = 'name';
        if (row.email && row.email.toLowerCase().includes(searchTerms[0].toLowerCase())) {
          matchedField = 'email';
        } else if (row.phone && row.phone.includes(searchTerms[0])) {
          matchedField = 'phone';
        }

        return {
          contactId: row.contact_id,
          score,
          matchedField,
          snippet,
          matchCount: searchTerms.length
        };
      });
    } catch (error) {
      console.error('❌ Simple search also failed:', error);
      // Return empty results if even simple search fails
      return [];
    }
  }

  /**
   * Add a contact to the keyword search index (FTS5 disabled)
   */
  async addContact(contact: KeywordDocument): Promise<void> {
    // FTS5 is disabled, so no action needed
    // Simple search will find contacts directly from the contacts table
  }

  /**
   * Update a contact in the keyword search index (FTS5 disabled)
   */
  async updateContact(contactId: string, updates: Partial<KeywordDocument>): Promise<void> {
    // FTS5 is disabled, so no action needed
    // Simple search will find updated contacts directly from the contacts table
  }

  /**
   * Remove a contact from the keyword search index (FTS5 disabled)
   */
  async removeContact(contactId: string): Promise<void> {
    // FTS5 is disabled, so no action needed
    // Simple search will not find deleted contacts since they're removed from contacts table
  }

  /**
   * Rebuild the entire search index (FTS5 disabled)
   */
  async rebuildIndex(): Promise<void> {
    // FTS5 is disabled, so no rebuild needed
    // Simple search works directly with the contacts table
  }

  /**
   * Calculate keyword search score based on match quality
   */
  private calculateKeywordScore(row: any, searchTerms: string[]): number {
    const name = (row.name || '').toLowerCase();
    const email = (row.email || '').toLowerCase();
    const phone = (row.phone || '').toLowerCase();
    const tags = (row.tags || '').toLowerCase();

    let score = 0;
    let totalMatches = 0;

    // Check for exact name match first (highest priority)
    const fullQuery = searchTerms.join(' ').toLowerCase();
    if (name === fullQuery) {
      return 1.0; // Perfect exact name match
    }

    // Check for partial name matches
    const nameWords = name.split(/\s+/);
    const queryWords = searchTerms.map(t => t.toLowerCase());
    
    // Check if all query words are in the name
    const allWordsInName = queryWords.every(word => nameWords.some(nameWord => nameWord.includes(word)));
    if (allWordsInName && nameWords.length === queryWords.length) {
      return 0.95; // Very close name match
    }

    for (const term of searchTerms) {
      const lowerTerm = term.toLowerCase();
      
      // Name matches get highest scores
      if (name.includes(lowerTerm)) {
        score += name === lowerTerm ? 0.9 : 0.7; // Exact name match vs partial
        totalMatches++;
      }
      if (email.includes(lowerTerm)) {
        score += 0.4;
        totalMatches++;
      }
      if (phone.includes(lowerTerm)) {
        score += 0.5;
        totalMatches++;
      }
      if (tags.includes(lowerTerm)) {
        score += 0.3;
        totalMatches++;
      }
    }

    // Normalize score based on number of terms and matches
    if (totalMatches === 0) {
      return 0;
    }

    const normalizedScore = (score / (searchTerms.length * 2)); // Max possible score is 2 per term
    return Math.min(normalizedScore, 1.0);
  }

  /**
   * Create a snippet highlighting matched terms
   */
  private createSnippet(row: any, searchTerms: string[]): string {
    const content = `${row.name} ${row.email || ''} ${row.phone || ''} ${row.tags || ''}`;
    const maxLength = 100;

    if (content.length <= maxLength) {
      return content.trim();
    }

    // Find the best position to start the snippet
    let bestStart = 0;
    let maxMatches = 0;

    for (let i = 0; i <= content.length - maxLength; i++) {
      const snippet = content.substring(i, i + maxLength).toLowerCase();
      const matches = searchTerms.filter(term => snippet.includes(term.toLowerCase())).length;
      
      if (matches > maxMatches) {
        maxMatches = matches;
        bestStart = i;
      }
    }

    let snippet = content.substring(bestStart, bestStart + maxLength);
    
    // Add ellipsis if not at the beginning/end
    if (bestStart > 0) {
      snippet = '...' + snippet;
    }
    if (bestStart + maxLength < content.length) {
      snippet = snippet + '...';
    }

    return snippet.trim();
  }

  /**
   * Escape special characters for FTS5 queries
   */
  private escapeFTSQuery(query: string): string {
    // FTS5 special characters that need escaping
    const specialChars = ['"', "'", '(', ')', ':', '*', '+', '-', '.', '/', '<', '=', '>', '?', '[', '\\', ']', '^', '{', '|', '}'];
    
    let escaped = query;
    for (const char of specialChars) {
      escaped = escaped.replace(new RegExp(`\\${char}`, 'g'), `\\${char}`);
    }
    
    return escaped;
  }
}
