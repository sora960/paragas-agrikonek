
// Re-export from new modules for backward compatibility
import { checkRequiredTables, createRequiredTables } from './databaseCore';
import { 
  createUsersTable,
  createUserCredentialsTable,
  createUserRegionsTable,
  createRegionsTable
} from './databaseTableCreation';
import { ensureProperTableSchema, createSQLExecutionFunction } from './databaseSchemaUtils';

// Export everything to maintain backward compatibility
export {
  checkRequiredTables,
  createRequiredTables,
  createUsersTable,
  createUserCredentialsTable,
  createUserRegionsTable,
  createRegionsTable,
  ensureProperTableSchema,
  createSQLExecutionFunction
};
