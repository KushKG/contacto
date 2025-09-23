import { Contact } from '@contacto/shared';
import { getContactService } from './contactService';

export interface ConnectionSuggestion {
  contact1: Contact;
  contact2: Contact;
  commonTags: string[];
  connectionStrength: number; // 0-1, based on tag overlap
  reason: string;
}

export class ConnectionService {
  private contactService = getContactService();

  async getConnectionSuggestions(): Promise<ConnectionSuggestion[]> {
    try {
      const allContacts = await this.contactService.getAllContacts();
      const contactsWithTags = allContacts.filter(contact => 
        contact.tags && contact.tags.length > 0
      );

      if (contactsWithTags.length < 2) {
        return [];
      }

      const suggestions: ConnectionSuggestion[] = [];

      // Compare each pair of contacts
      for (let i = 0; i < contactsWithTags.length; i++) {
        for (let j = i + 1; j < contactsWithTags.length; j++) {
          const contact1 = contactsWithTags[i];
          const contact2 = contactsWithTags[j];

          const suggestion = this.analyzeConnection(contact1, contact2);
          if (suggestion) {
            suggestions.push(suggestion);
          }
        }
      }

      // Sort by connection strength (highest first)
      return suggestions.sort((a, b) => b.connectionStrength - a.connectionStrength);
    } catch (error) {
      console.error('Error getting connection suggestions:', error);
      return [];
    }
  }

  private analyzeConnection(contact1: Contact, contact2: Contact): ConnectionSuggestion | null {
    if (!contact1.tags || !contact2.tags) {
      return null;
    }

    const tags1 = new Set(contact1.tags.map(tag => tag.toLowerCase()));
    const tags2 = new Set(contact2.tags.map(tag => tag.toLowerCase()));

    // Find common tags
    const commonTags = contact1.tags.filter(tag => 
      tags2.has(tag.toLowerCase())
    );

    if (commonTags.length === 0) {
      return null;
    }

    // Calculate connection strength
    const totalTags = new Set([...contact1.tags, ...contact2.tags]).size;
    const connectionStrength = commonTags.length / totalTags;

    // Only suggest connections with meaningful overlap (at least 20% strength)
    if (connectionStrength < 0.2) {
      return null;
    }

    // Generate reason based on common tags
    const reason = this.generateConnectionReason(commonTags, contact1.name, contact2.name);

    return {
      contact1,
      contact2,
      commonTags,
      connectionStrength,
      reason,
    };
  }

  private generateConnectionReason(commonTags: string[], name1: string, name2: string): string {
    if (commonTags.length === 1) {
      return `Both ${name1} and ${name2} are interested in ${commonTags[0]}`;
    } else if (commonTags.length === 2) {
      return `Both ${name1} and ${name2} share interests in ${commonTags[0]} and ${commonTags[1]}`;
    } else if (commonTags.length === 3) {
      return `Both ${name1} and ${name2} share interests in ${commonTags[0]}, ${commonTags[1]}, and ${commonTags[2]}`;
    } else {
      const firstThree = commonTags.slice(0, 3).join(', ');
      return `Both ${name1} and ${name2} share multiple interests including ${firstThree} and ${commonTags.length - 3} more`;
    }
  }

  async getSuggestionsForContact(contactId: string): Promise<ConnectionSuggestion[]> {
    try {
      const allSuggestions = await this.getConnectionSuggestions();
      return allSuggestions.filter(suggestion => 
        suggestion.contact1.id === contactId || suggestion.contact2.id === contactId
      );
    } catch (error) {
      console.error('Error getting suggestions for contact:', error);
      return [];
    }
  }

  async getTopSuggestions(limit: number = 10): Promise<ConnectionSuggestion[]> {
    try {
      const allSuggestions = await this.getConnectionSuggestions();
      return allSuggestions.slice(0, limit);
    } catch (error) {
      console.error('Error getting top suggestions:', error);
      return [];
    }
  }
}

let connectionServiceInstance: ConnectionService | null = null;
export const getConnectionService = (): ConnectionService => {
  if (!connectionServiceInstance) {
    connectionServiceInstance = new ConnectionService();
  }
  return connectionServiceInstance;
};
