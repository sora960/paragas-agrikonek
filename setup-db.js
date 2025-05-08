// This is a temporary script to set up the database tables
require('ts-node/register');
const { setupDatabaseTables } = require('./src/lib/directSQLHelpers');

async function main() {
  console.log('Starting database setup...');
  const result = await setupDatabaseTables();
  console.log('Database setup completed with result:', result);
}

main().catch(error => {
  console.error('Error setting up database:', error);
  process.exit(1);
}); 