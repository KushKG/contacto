import { Contact } from './types';

export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX for US numbers
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  return phone; // Return original if not standard format
};

export const formatEmail = (email: string): string => {
  return email.toLowerCase().trim();
};

export const searchContacts = (contacts: Contact[], query: string): Contact[] => {
  if (!query.trim()) return contacts;
  
  const lowercaseQuery = query.toLowerCase();
  
  return contacts.filter(contact => 
    contact.name.toLowerCase().includes(lowercaseQuery) ||
    contact.email?.toLowerCase().includes(lowercaseQuery) ||
    contact.phone?.includes(query) ||
    contact.notes?.toLowerCase().includes(lowercaseQuery)
  );
};

export const generateContactId = (): string => {
  return `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
