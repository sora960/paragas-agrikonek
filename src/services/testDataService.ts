
import { supabase } from '@/lib/supabase';
import { checkTableExists } from "./userDatabaseUtils";
import { createUser } from "./userCreationService";

/**
 * Create test users for different roles
 */
export async function createTestUsers() {
  try {
    console.log("Creating test users...");
    
    // Check if the users table exists
    const usersExists = await checkTableExists('users');
    const credentialsExists = await checkTableExists('user_credentials');
    const regionsExists = await checkTableExists('user_regions');
    
    if (!usersExists || !credentialsExists || !regionsExists) {
      console.error("Required tables don't exist");
      return { success: false, error: { message: "Database tables not ready" } };
    }
    
    // Check if test users already exist
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('email')
      .in('email', [
        'farmer@test.com',
        'regional@test.com',
        'organization@test.com',
        'superadmin@test.com'
      ]);
    
    if (checkError) {
      console.error("Error checking existing users:", checkError);
      return { success: false, error: checkError };
    }
      
    if (existingUsers && existingUsers.length >= 4) {
      console.log("Test users already exist");
      return { success: true, message: 'Test users already exist' };
    }

    // Create test users for each role
    const testUsers = [
      {
        email: 'farmer@test.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'Farmer',
        role: 'farmer' as const
      },
      {
        email: 'regional@test.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'Regional Admin',
        role: 'regional_admin' as const,
        regionId: 'luzon-R1'
      },
      {
        email: 'organization@test.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'Organization',
        role: 'org_admin' as const
      },
      {
        email: 'superadmin@test.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'SuperAdmin',
        role: 'superadmin' as const
      }
    ];

    const results = [];
    
    // Create each test user
    for (const user of testUsers) {
      console.log(`Creating test user: ${user.email}`);
      const result = await createUser(user);
      results.push({ email: user.email, result });
      
      if (!result.success) {
        console.error(`Failed to create test user ${user.email}:`, result.error);
      }
    }

    const allSucceeded = results.every(r => r.result.success);
    
    return { 
      success: allSucceeded, 
      message: allSucceeded ? 'All test users created' : 'Some test users could not be created',
      results
    };
  } catch (error) {
    console.error("Error creating test users:", error);
    return { success: false, error };
  }
}
