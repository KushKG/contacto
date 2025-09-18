import { ContactService } from '../services/contactService';
import { mockContacts, mockContactCreateData } from '../data/mockData';

// Mock the database
jest.mock('@contacto/database', () => ({
  getDatabase: () => ({
    contacts: {
      createContact: jest.fn(),
      getContact: jest.fn(),
      getAllContacts: jest.fn(),
      updateContact: jest.fn(),
      deleteContact: jest.fn(),
      searchContacts: jest.fn(),
    },
  }),
}));

// Mock expo-contacts
jest.mock('expo-contacts', () => ({
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getContactsAsync: jest.fn(() => Promise.resolve({ data: [] })),
  Fields: {
    Name: 'name',
    PhoneNumbers: 'phoneNumbers',
    Emails: 'emails',
  },
}));

describe('ContactService', () => {
  let contactService: ContactService;

  beforeEach(() => {
    contactService = new ContactService();
  });

  describe('createContact', () => {
    it('should create a new contact', async () => {
      const mockContact = mockContacts[0];
      const mockDb = contactService['db'];
      
      (mockDb.contacts.createContact as jest.Mock).mockResolvedValue(mockContact);

      const result = await contactService.createContact(mockContactCreateData);

      expect(mockDb.contacts.createContact).toHaveBeenCalledWith(mockContactCreateData);
      expect(result).toEqual(mockContact);
    });
  });

  describe('getAllContacts', () => {
    it('should return all contacts', async () => {
      const mockDb = contactService['db'];
      (mockDb.contacts.getAllContacts as jest.Mock).mockResolvedValue(mockContacts);

      const result = await contactService.getAllContacts();

      expect(mockDb.contacts.getAllContacts).toHaveBeenCalled();
      expect(result).toEqual(mockContacts);
    });
  });

  describe('searchContacts', () => {
    it('should search contacts by query', async () => {
      const query = 'John';
      const mockDb = contactService['db'];
      const expectedResults = [mockContacts[0]];
      
      (mockDb.contacts.searchContacts as jest.Mock).mockResolvedValue(expectedResults);

      const result = await contactService.searchContacts(query);

      expect(mockDb.contacts.searchContacts).toHaveBeenCalledWith({ query });
      expect(result).toEqual(expectedResults);
    });

    it('should return all contacts when query is empty', async () => {
      const mockDb = contactService['db'];
      (mockDb.contacts.getAllContacts as jest.Mock).mockResolvedValue(mockContacts);

      const result = await contactService.searchContacts('');

      expect(mockDb.contacts.getAllContacts).toHaveBeenCalled();
      expect(result).toEqual(mockContacts);
    });
  });
});
