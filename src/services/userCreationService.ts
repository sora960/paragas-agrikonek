
import { supabase } from '@/lib/supabase';

interface UserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'farmer' | 'org_admin' | 'regional_admin' | 'superadmin';
  regionId?: string;
}

/**
 * Create a new user bypassing Supabase Auth completely
 * This uses a simpler approach with direct database inserts
 */
export async function createUser(userData: UserData) {
  try {
    console.log("Creating user with role:", userData.role);
    
    // Check if user with this email already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('email')
      .eq('email', userData.email)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking existing user:", checkError);
      return { success: false, error: checkError };
    }

    if (existingUser) {
      return { success: false, error: { message: "User with this email already exists" } };
    }

    // Generate a UUID for the user
    const userId = crypto.randomUUID();
    
    // Insert directly into the users table
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        first_name: userData.firstName,
        last_name: userData.lastName,
        email: userData.email,
        role: userData.role,
        status: 'active'
      });
      
    if (userError) {
      console.error("Error creating user:", userError);
      return { success: false, error: userError };
    }
    
    // If it's a regional admin, create the user-region relationship
    if (userData.role === 'regional_admin' && userData.regionId) {
      const { error: regionError } = await supabase
        .from('user_regions')
        .insert({
          user_id: userId,
          region_id: userData.regionId
        });
        
      if (regionError) {
        console.error("Error associating user with region:", regionError);
        return { success: false, error: regionError };
      }
    }
    
    // Store password (in a real app, you would hash this)
    const { error: passwordError } = await supabase
      .from('user_credentials')
      .insert({
        user_id: userId,
        password_hash: userData.password // In production, hash this!
      });
      
    if (passwordError) {
      console.error("Error storing credentials:", passwordError);
      return { success: false, error: passwordError };
    }
    
    return { success: true, userId };
  } catch (error) {
    console.error("Error creating user:", error);
    return { success: false, error };
  }
}
