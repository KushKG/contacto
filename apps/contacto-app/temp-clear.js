
const SQLite = require('expo-sqlite');

async function clearDatabase() {
  try {
    console.log('🗄️  Opening database...');
    const db = SQLite.openDatabaseSync('contacto.db');
    
    console.log('🧹 Clearing contact tags...');
    db.execSync('UPDATE contacts SET tags = NULL');
    
    console.log('🧹 Clearing conversation tags...');
    db.execSync('UPDATE conversations SET tags = "[]"');
    
    console.log('🧹 Clearing all conversations...');
    db.execSync('DELETE FROM conversations');
    
    console.log('✅ Database cleared successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    process.exit(1);
  }
}

clearDatabase();
