import * as Contacts from 'expo-contacts';
import { getDatabase } from '@contacto/database';
import { Contact, ContactCreateData, ContactUpdateData } from '@contacto/shared';

export class ContactService {
  private db = getDatabase();

  private normalizePhone(phone?: string): string | undefined {
    if (!phone) return undefined;
    const digits = phone.replace(/\D+/g, '');
    return digits || undefined;
  }

  private normalizeEmail(email?: string): string | undefined {
    if (!email) return undefined;
    return email.trim().toLowerCase() || undefined;
  }

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

  /**
   * Sync device contacts into the local DB.
   * - Upserts by best-effort match on normalized phone/email, fallback to name.
   * - Updates phone/email if changed.
   * - Does not delete local contacts.
   * Returns summary counts.
   */
  async syncDeviceContacts(options?: { deleteMissing?: boolean }): Promise<{ created: number; updated: number; deleted: number; totalDevice: number } > {
    // Request permission
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permission to access contacts was denied');
    }

    // Fetch device contacts
    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
    });

    const allLocal = await this.db.contacts.getAllContacts();
    // Build lookup maps
    const byPhone = new Map<string, Contact[]>();
    const byEmail = new Map<string, Contact[]>();
    const byName = new Map<string, Contact[]>();
    for (const c of allLocal) {
      const p = this.normalizePhone(c.phone);
      const e = this.normalizeEmail(c.email);
      const n = (c.name || '').trim().toLowerCase();
      if (p) byPhone.set(p, [...(byPhone.get(p) || []), c]);
      if (e) byEmail.set(e, [...(byEmail.get(e) || []), c]);
      if (n) byName.set(n, [...(byName.get(n) || []), c]);
    }

    let created = 0;
    let updated = 0;
    let deleted = 0;

    for (const deviceContact of data) {
      if (!deviceContact?.name) continue;
      const name = deviceContact.name;
      const phone = this.normalizePhone(deviceContact.phoneNumbers?.[0]?.number);
      const email = this.normalizeEmail(deviceContact.emails?.[0]?.email);

      // Try to match existing local contact
      let match: Contact | undefined;
      if (phone && byPhone.get(phone)?.length) match = byPhone.get(phone)![0];
      else if (email && byEmail.get(email)?.length) match = byEmail.get(email)![0];
      else {
        const n = name.trim().toLowerCase();
        if (n && byName.get(n)?.length) match = byName.get(n)![0];
      }

      if (!match) {
        // Create new
        const createdContact = await this.db.contacts.createContact({ name, phone, email });
        created++;
        // Update indices minimally
        if (phone) byPhone.set(phone, [...(byPhone.get(phone) || []), createdContact]);
        if (email) byEmail.set(email, [...(byEmail.get(email) || []), createdContact]);
        const n = name.trim().toLowerCase();
        if (n) byName.set(n, [...(byName.get(n) || []), createdContact]);
      } else {
        // Update if fields differ
        const needsPhone = phone && this.normalizePhone(match.phone) !== phone;
        const needsEmail = email && this.normalizeEmail(match.email) !== email;
        const needsName = (match.name || '') !== name;
        if (needsPhone || needsEmail || needsName) {
          await this.db.contacts.updateContact(match.id, {
            name: needsName ? name : match.name,
            phone: needsPhone ? phone : match.phone,
            email: needsEmail ? email : match.email,
          });
          updated++;
        }
      }
    }

    // Optionally delete locals that no longer exist in device contacts
    if (options?.deleteMissing) {
      // Build device key sets for quick membership checks
      const devicePhones = new Set<string>();
      const deviceEmails = new Set<string>();
      const deviceNames = new Set<string>();
      for (const dc of data) {
        const p = this.normalizePhone(dc.phoneNumbers?.[0]?.number);
        const e = this.normalizeEmail(dc.emails?.[0]?.email);
        const n = (dc.name || '').trim().toLowerCase();
        if (p) devicePhones.add(p);
        if (e) deviceEmails.add(e);
        if (n) deviceNames.add(n);
      }

      for (const local of allLocal) {
        const p = this.normalizePhone(local.phone);
        const e = this.normalizeEmail(local.email);
        const n = (local.name || '').trim().toLowerCase();

        const appearsInDevice = (p && devicePhones.has(p)) || (e && deviceEmails.has(e)) || (n && deviceNames.has(n));
        if (!appearsInDevice) {
          // Conservative delete: only delete if clearly device-origin (no tags, no notes)
          const hasUserData = (local.tags && local.tags.length > 0) || (local.notes && local.notes.trim().length > 0);
          if (!hasUserData) {
            const ok = await this.db.contacts.deleteContact(local.id);
            if (ok) deleted++;
          }
        }
      }
    }

    return { created, updated, deleted, totalDevice: data.length };
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
