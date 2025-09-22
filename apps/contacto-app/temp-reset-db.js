
const SQLite = require('expo-sqlite');

async function resetDatabase() {
  try {
    console.log('🗄️  Opening database...');
    const db = SQLite.openDatabaseSync('contacto.db');
    
    console.log('🧹 Clearing all existing data...');
    // Clear all conversations
    db.execSync('DELETE FROM conversations');
    
    // Clear all contacts
    db.execSync('DELETE FROM contacts');
    
    console.log('📝 Adding initial mock contacts...');
    
    // Insert mock contacts without tags
    const mockContacts = [
      {
        id: 'contact_1',
        name: 'John Doe',
        phone: '(555) 123-4567',
        email: 'john.doe@example.com',
        notes: 'Software engineer at Tech Corp. Met at React conference.',
        createdAt: new Date('2024-01-15').toISOString(),
        updatedAt: new Date('2024-01-15').toISOString()
      },
      {
        id: 'contact_2',
        name: 'Jane Smith',
        phone: '(555) 987-6543',
        email: 'jane.smith@startup.io',
        notes: 'Product manager. Interested in AI and machine learning.',
        createdAt: new Date('2024-01-20').toISOString(),
        updatedAt: new Date('2024-01-20').toISOString()
      },
      {
        id: 'contact_3',
        name: 'Mike Johnson',
        phone: '(555) 456-7890',
        email: 'mike.j@designstudio.com',
        notes: 'UI/UX designer. Great for design feedback.',
        createdAt: new Date('2024-02-01').toISOString(),
        updatedAt: new Date('2024-02-01').toISOString()
      },
      {
        id: 'contact_4',
        name: 'Sarah Wilson',
        phone: '(555) 321-0987',
        email: 'sarah.wilson@consulting.com',
        notes: 'Business consultant. Specializes in scaling startups.',
        createdAt: new Date('2024-02-10').toISOString(),
        updatedAt: new Date('2024-02-10').toISOString()
      },
      {
        id: 'contact_5',
        name: 'Alex Chen',
        phone: '(555) 654-3210',
        email: 'alex.chen@venture.com',
        notes: 'Venture capitalist. Looking for AI investments.',
        createdAt: new Date('2024-02-15').toISOString(),
        updatedAt: new Date('2024-02-15').toISOString()
      }
    ];
    
    // Insert each mock contact
    for (const contact of mockContacts) {
      db.execSync(
        'INSERT INTO contacts (id, name, phone, email, notes, imageUri, tags, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          contact.id,
          contact.name,
          contact.phone,
          contact.email,
          contact.notes,
          null, // no imageUri
          null, // no tags
          contact.createdAt,
          contact.updatedAt
        ]
      );
    }
    
    console.log('✅ Database reset successfully with', mockContacts.length, 'initial contacts');
    console.log('📱 No tags or conversations included');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  }
}

resetDatabase();
