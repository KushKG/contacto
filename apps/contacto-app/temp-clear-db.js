
const { getDatabase } = require('./src/services/database');
const { getContactService } = require('./src/services/contactService');
const { getConversationService } = require('./src/services/conversationService');

async function clearDatabase() {
  try {
    console.log('🗄️  Initializing database...');
    const db = getDatabase();
    await db.initialize();
    
    console.log('🧹 Clearing contact tags...');
    const contactService = getContactService();
    await contactService.clearAllTags();
    
    console.log('🧹 Clearing conversation tags...');
    const conversationService = getConversationService();
    await conversationService.clearAllTags();
    
    console.log('✅ Database cleared successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    process.exit(1);
  }
}

clearDatabase();
