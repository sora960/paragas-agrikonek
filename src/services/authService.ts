
import { supabase } from '@/lib/supabase';

/**
 * Log in a user using password
 */
export async function login(email: string, password: string) {
  try {
    // Find user by email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (userError) {
      console.error("Error finding user:", userError);
      return { success: false, error: userError };
    }
    
    if (!userData) {
      return { success: false, error: { message: 'User not found' } };
    }
    
    // Check password
    const { data: credData, error: credError } = await supabase
      .from('user_credentials')
      .select('*')
      .eq('user_id', userData.id)
      .single();
      
    if (credError) {
      console.error("Error checking credentials:", credError);
      return { success: false, error: credError };
    }
    
    if (!credData || credData.password_hash !== password) {
      return { success: false, error: { message: 'Invalid password' } };
    }
    
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
