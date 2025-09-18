import { Contact } from '@contacto/shared';

export const mockContacts: Contact[] = [
  {
    id: 'mock_1',
    name: 'John Doe',
    phone: '(555) 123-4567',
    email: 'john.doe@example.com',
    notes: 'Software engineer at Tech Corp. Met at React conference.',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'mock_2',
    name: 'Jane Smith',
    phone: '(555) 987-6543',
    email: 'jane.smith@startup.io',
    notes: 'Product manager. Interested in AI and machine learning.',
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    id: 'mock_3',
    name: 'Mike Johnson',
    phone: '(555) 456-7890',
    email: 'mike.j@designstudio.com',
    notes: 'UI/UX designer. Great for design feedback.',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  },
  {
    id: 'mock_4',
    name: 'Sarah Wilson',
    phone: '(555) 321-0987',
    email: 'sarah.wilson@consulting.com',
    notes: 'Business consultant. Specializes in scaling startups.',
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-10'),
  },
  {
    id: 'mock_5',
    name: 'Alex Chen',
    phone: '(555) 654-3210',
    email: 'alex.chen@venture.com',
    notes: 'Venture capitalist. Looking for AI investments.',
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-02-15'),
  },
];

export const mockContactCreateData = {
  name: 'Test Contact',
  phone: '(555) 000-0000',
  email: 'test@example.com',
  notes: 'This is a test contact for development purposes.',
};

export const mockContactUpdateData = {
  name: 'Updated Test Contact',
  phone: '(555) 111-1111',
  email: 'updated@example.com',
  notes: 'This contact has been updated.',
};
