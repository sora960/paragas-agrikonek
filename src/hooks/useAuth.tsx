
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { getCurrentUser, login, logout } from '@/services/authService';

interface CustomUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  status?: string;
}

export function useAuth() {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    // Check for user in localStorage on mount
    const checkUser = () => {
      const currentUser = getCurrentUser();
      setUser(currentUser);
      setUserRole(currentUser?.role || null);
      setLoading(false);
    };

    checkUser();
    
    // Also check Supabase session for compatibility
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !user) {
        // If we have a Supabase session but no custom user,
        // we might want to sync them in the future
        console.log("Supabase session exists but no custom user");
      }
    });

    // Listen for auth changes from Supabase for compatibility
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && user) {
        // If Supabase session is gone but we have a user, log out
        logout();
        setUser(null);
        setUserRole(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const result = await login(email, password);
      if (result.success && result.user) {
        setUser({
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.first_name,
          lastName: result.user.last_name,
          role: result.user.role,
          status: result.user.status
        });
        setUserRole(result.user.role);
        return { success: true };
      } else {
        throw new Error("Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      logout();
      setUser(null);
      setUserRole(null);
      // Also sign out from Supabase for compatibility
      await supabase.auth.signOut();
      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, role: string, firstName?: string, lastName?: string) => {
    try {
      // This is a stub that should be implemented in userService
      throw new Error("Sign up not implemented yet");
    } catch (error) {
      console.error("Sign up error:", error);
      throw error;
    }
  };

  return {
    user,
    loading,
    userRole,
    signIn,
    signOut,
    signUp
  };
}
