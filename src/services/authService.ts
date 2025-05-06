import { supabase } from '@/lib/supabase';

/**
 * Log in a user using password
 */
export async function login(email: string, password: string) {
  try {
    console.log("Attempting login for user:", email);
    
    // Find user by email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (userError) {
      console.error("Error finding user:", userError);
      
      // Enhanced error reporting for debugging
      if (userError.code === '406') {
        console.error("This may be due to incorrect email format or API restrictions");
      } else if (userError.code === '404') {
        console.error("User not found");
      }
      
      return { success: false, error: { message: 'User not found', code: userError.code } };
    }
    
    if (!userData) {
      console.log("No user found with email:", email);
      return { success: false, error: { message: 'User not found' } };
    }

    console.log("Found user with ID:", userData.id);
    
    // Check password
    const { data: credData, error: credError } = await supabase
      .from('user_credentials')
      .select('*')
      .eq('user_id', userData.id)
      .maybeSingle();
      
    if (credError) {
      console.error("Error checking credentials:", credError);
      
      // Enhanced error reporting for debugging
      if (credError.code === '406') {
        console.error("This may be due to API restrictions on the user_credentials table");
      }
      
      return { success: false, error: { message: 'Error checking credentials', code: credError.code } };
    }
    
    if (!credData) {
      console.error("No credentials found for user ID:", userData.id);
      
      // Automatically create credentials for the user with the provided password
      try {
        const { error: insertError } = await supabase
          .from('user_credentials')
          .insert({
            user_id: userData.id,
            password_hash: password
          });
          
        if (insertError) {
          console.error("Failed to create missing credentials:", insertError);
          return { success: false, error: { message: 'Failed to create missing credentials' } };
        }
        
        console.log("Created missing credentials for user");
        
        // User can now log in with the provided password
        // Save user info to localStorage
        localStorage.setItem('user', JSON.stringify({
          id: userData.id,
          email: userData.email,
          firstName: userData.first_name,
          lastName: userData.last_name,
          role: userData.role,
          status: userData.status
        }));
        
        return { success: true, user: userData };
      } catch (credCreateError) {
        console.error("Error creating credentials:", credCreateError);
        return { success: false, error: { message: 'Error creating credentials' } };
      }
    }

    console.log("Found credentials, comparing passwords");
    
    // Compare password (direct comparison for simplicity)
    // In a real app, this would use a secure password hashing function
    if (credData.password_hash !== password) {
      console.log("Password mismatch for user:", email);
      return { success: false, error: { message: 'Invalid password' } };
    }
    
    console.log("Login successful for user:", email);
    
    // Save user info to localStorage
    localStorage.setItem('user', JSON.stringify({
      id: userData.id,
      email: userData.email,
      firstName: userData.first_name,
      lastName: userData.last_name,
      role: userData.role,
      status: userData.status
    }));
    
    return { success: true, user: userData };
  } catch (error) {
    console.error("Error logging in:", error);
    return { success: false, error };
  }
}

/**
 * Log out the current user
 */
export function logout() {
  localStorage.removeItem('user');
  return { success: true };
}

/**
 * Get the current user from localStorage
 */
export function getCurrentUser() {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch (error) {
    console.error("Error parsing user from localStorage:", error);
    return null;
  }
}
