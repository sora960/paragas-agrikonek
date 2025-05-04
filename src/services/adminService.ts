import { supabase } from '@/lib/supabase';

interface OrganizationAdmin {
  id: string;
  user_id: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

interface User {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
  created_at?: string;
}

export const adminService = {
  /**
   * Promote a user to be an organization admin
   */
  async promoteToOrganizationAdmin(userId: string, organizationId: string): Promise<boolean> {
    try {
      console.log(`Promoting user ${userId} to admin for organization ${organizationId}`);
      
      // First check if this admin association already exists
      const { data: existingAdmin, error: checkError } = await supabase
        .from('organization_admins')
        .select('id')
        .match({ user_id: userId, organization_id: organizationId })
        .maybeSingle();
        
      if (checkError) {
        console.error("Error checking existing admin relationship:", checkError);
        throw checkError;
      }
      
      // If it already exists, we don't need to do anything
      if (existingAdmin) {
        console.log("User is already an admin for this organization");
        return true;
      }
      
      // Direct insertion into the organization_admins table
      const { error } = await supabase
        .from('organization_admins')
        .insert({
          user_id: userId,
          organization_id: organizationId,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error("Error inserting into organization_admins:", error);
        throw error;
      }
      
      console.log("Successfully promoted user to organization admin");
      return true;
    } catch (error) {
      console.error('Error promoting user to organization admin:', error);
      throw error;
    }
  },

  /**
   * Get all organization admins for a specific organization
   */
  async getOrganizationAdmins(organizationId: string): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('organization_admins')
        .select(`
          user_id,
          users:user_id (
            id,
            email,
            full_name:raw_user_meta_data->>'full_name'
          )
        `)
        .eq('organization_id', organizationId);

      if (error) throw error;

      // Extract user data from nested structure with type assertion
      return data?.map(item => ({
        id: (item as any).users.id,
        email: (item as any).users.email,
        full_name: (item as any).users.full_name
      })) || [];
    } catch (error) {
      console.error('Error getting organization admins:', error);
      throw error;
    }
  },

  /**
   * Remove a user from being an organization admin
   */
  async removeOrganizationAdmin(userId: string, organizationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('organization_admins')
        .delete()
        .match({ user_id: userId, organization_id: organizationId });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error removing organization admin:', error);
      throw error;
    }
  },

  /**
   * Check if a user is an admin for an organization
   */
  async isOrganizationAdmin(userId: string, organizationId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('organization_admins')
        .select('id')
        .match({ user_id: userId, organization_id: organizationId })
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    } catch (error) {
      console.error('Error checking if user is organization admin:', error);
      throw error;
    }
  },

  /**
   * Get all organizations a user is an admin for
   */
  async getUserAdminOrganizations(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('organization_admins')
        .select(`
          organization_id,
          organizations:organization_id (
            id,
            name,
            region_id,
            regions:region_id (name)
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;

      // Extract organization data from nested structure with type assertion
      return data?.map(item => ({
        id: (item as any).organizations.id,
        name: (item as any).organizations.name,
        region_id: (item as any).organizations.region_id,
        region_name: (item as any).organizations.regions?.name
      })) || [];
    } catch (error) {
      console.error('Error getting user admin organizations:', error);
      throw error;
    }
  },

  /**
   * Create a new user with organization admin role
   */
  async createAdminUser(userData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
  }): Promise<User | null> {
    try {
      // Check if user with this email already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('email')
        .eq('email', userData.email)
        .maybeSingle();

      if (checkError) {
        console.error("Error checking existing user:", checkError);
        throw checkError;
      }

      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      // Generate a UUID for the user
      const userId = crypto.randomUUID();
      
      console.log("Creating admin user with ID:", userId);
      
      // Insert directly into the users table
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: userId,
          first_name: userData.first_name,
          last_name: userData.last_name,
          email: userData.email,
          role: 'org_admin',
          status: 'active'
        });
        
      if (userError) {
        console.error("Error creating user:", userError);
        throw userError;
      }
      
      // Store password directly (in a simple scenario)
      // In production, this should be properly hashed
      const { error: passwordError } = await supabase
        .from('user_credentials')
        .insert({
          user_id: userId,
          password_hash: userData.password // In real production, this would be hashed
        });
        
      if (passwordError) {
        console.error("Error storing credentials:", passwordError);
        // Try to clean up the user if credentials fail
        await supabase.from('users').delete().eq('id', userId);
        throw passwordError;
      }
      
      console.log("Successfully created admin user in database");
      
      // Return user data with combined full_name for backward compatibility
      return {
        id: userId,
        email: userData.email,
        full_name: `${userData.first_name} ${userData.last_name}`.trim(),
        role: "org_admin",
      };
    } catch (error) {
      console.error('Error creating admin user:', error);
      throw error;
    }
  },
}; 