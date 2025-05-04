
// Re-export all user-related functions from their specialized services
import { createUser } from './userCreationService';
import { login, logout, getCurrentUser } from './authService';
import { createTestUsers } from './testDataService';
import { checkTableExists } from './userDatabaseUtils';

// Export everything for backward compatibility
export {
  createUser,
  login,
  logout,
  getCurrentUser,
  createTestUsers,
  checkTableExists
};
