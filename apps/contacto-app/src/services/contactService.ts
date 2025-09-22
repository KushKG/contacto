import * as Contacts from 'expo-contacts';
import { getDatabase } from '@contacto/database';
import { Contact, ContactCreateData, ContactUpdateData } from '@contacto/shared';

export class ContactService {
  private db = getDatabase();

  async importContactsFromDevice(): Promise<Contact[]> {
    try {
      // Request permission to access contacts
      const { status } = await Contacts.requestPermissionsAsync();
      
      if (status !== 'granted') {
        throw new Error('Permission to access contacts was denied');
      }

      // Get contacts from device
      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Emails,
        ],
      });

      const importedContacts: Contact[] = [];

      for (const deviceContact of data) {
        // Skip contacts without names
        if (!deviceContact.name) continue;

        const contactData: ContactCreateData = {
          name: deviceContact.name,
          phone: deviceContact.phoneNumbers?.[0]?.number || undefined,
          email: deviceContact.emails?.[0]?.email || undefined,
        };

        try {
          const contact = await this.db.contacts.createContact(contactData);
          importedContacts.push(contact);
        } catch (error) {
          console.warn(`Failed to import contact ${deviceContact.name}:`, error);
        }
      }

      return importedContacts;
    } catch (error) {
      console.error('Error importing contacts:', error);
      throw error;
    }
  }

  async getAllContacts(): Promise<Contact[]> {
    return this.db.contacts.getAllContacts();
  }

  async getContact(id: string): Promise<Contact | null> {
    return this.db.contacts.getContact(id);
  }

  async createContact(data: ContactCreateData): Promise<Contact> {
    return this.db.contacts.createContact(data);
  }

  async updateContact(id: string, data: ContactUpdateData): Promise<Contact | null> {
    return this.db.contacts.updateContact(id, data);
  }

  async deleteContact(id: string): Promise<boolean> {
    return this.db.contacts.deleteContact(id);
  }

  async searchContacts(query: string): Promise<Contact[]> {
    if (!query.trim()) {
      return this.getAllContacts();
    }
    return this.db.contacts.searchContacts({ query });
  }

  async clearAllTags(): Promise<void> {
    return this.db.contacts.clearAllTags();
  }
}

// Singleton instance
let contactServiceInstance: ContactService | null = null;

export const getContactService = (): ContactService => {
  if (!contactServiceInstance) {
    contactServiceInstance = new ContactService();
  }
  return contactServiceInstance;
};
