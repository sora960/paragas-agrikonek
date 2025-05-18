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
  status: string;
  organizations?: any[];
  has_organization?: boolean;
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
      
      // Check if user has appropriate role
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', userId)
        .single();
        
      if (userError) {
        console.error("Error checking user role:", userError);
        throw userError;
      }
      
      // If user doesn't have org_admin role, update it
      if (userData.role !== 'org_admin' && userData.role !== 'organization_admin' && userData.role !== 'superadmin') {
        console.log(`User has role ${userData.role}, updating to org_admin`);
        
        const { error: updateError } = await supabase
          .from('users')
          .update({ role: 'org_admin' })
          .eq('id', userId);
          
        if (updateError) {
          console.error("Error updating user role:", updateError);
          throw updateError;
        }
      }
      
      // Insert into the organization_admins table
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
            first_name,
            last_name,
            role,
            status
          )
        `)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('Error getting organization admins:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Extract user data from nested structure with type assertion
      return data.map(item => ({
        id: (item as any).users.id,
        email: (item as any).users.email,
        full_name: `${(item as any).users.first_name || ''} ${(item as any).users.last_name || ''}`.trim(),
        role: (item as any).users.role,
        status: (item as any).users.status || 'active'
      }));
    } catch (error) {
      console.error('Error getting organization admins:', error);
      return [];
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
        .select('id, email, first_name, last_name, role, status')
        .eq('email', userData.email)
        .maybeSingle();

      if (checkError) {
        console.error("Error checking existing user:", checkError);
        throw checkError;
      }

      // If user already exists, check if they can be used as an organization admin
      if (existingUser) {
        console.log("User with this email already exists, checking if they can be used as an org admin");
        
        // If the user already exists and has a compatible role, we can just return them
        if (existingUser.role === 'org_admin' || existingUser.role === 'organization_admin' || existingUser.role === 'superadmin') {
          return {
            id: existingUser.id,
            email: existingUser.email,
            full_name: `${existingUser.first_name || ''} ${existingUser.last_name || ''}`.trim(),
            role: existingUser.role,
            status: existingUser.status || 'active'
          };
        }
        
        // If user exists but has an incompatible role, throw a more specific error
        throw new Error(`User with email ${userData.email} exists but has role "${existingUser.role}" which cannot be used as an organization admin`);
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
        // Handle the specific case of duplicate key violation again as a safeguard
        if (userError.code === '23505' && userError.message.includes('users_email_key')) {
          throw new Error(`User with email ${userData.email} already exists`);
        }
        
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
        status: "active"
      };
    } catch (error: any) {
      console.error('Error creating admin user:', error);
      throw error;
    }
  },

  /**
   * Get all users with org_admin role
   */
  async getAllOrganizationAdmins(searchTerm: string = ''): Promise<User[]> {
    try {
      console.log("Fetching all organization admins");
      
      // Get all users with org_admin role
      let query = supabase
        .from('users')
        .select('id, email, first_name, last_name, role, status')
        .or('role.eq.org_admin,role.eq.organization_admin')
        .order('email');
        
      // Add search filter if provided
      if (searchTerm && searchTerm.length > 0) {
        query = query.or(`email.ilike.%${searchTerm}%, first_name.ilike.%${searchTerm}%, last_name.ilike.%${searchTerm}%`);
      }
      
      const { data: users, error: userError } = await query;
      
      if (userError) {
        console.error("Error fetching organization admins:", userError);
        return [];
      }
      
      console.log(`Found ${users?.length || 0} organization admin users`);
      
      if (!users || users.length === 0) {
        return [];
      }
      
      // Get all organization_admins entries to check which admins have organizations
      const userIds = users.map(user => user.id);
      
      console.log("Fetching organization assignments for user IDs:", userIds);
      
      const { data: orgAdmins, error: orgError } = await supabase
        .from('organization_admins')
        .select('user_id, organization_id, organizations:organization_id(id, name)')
        .in('user_id', userIds);
        
      if (orgError) {
        console.error("Error fetching admin organization assignments:", orgError);
      }
      
      console.log(`Found ${orgAdmins?.length || 0} organization admin assignments`);
      
      // Create a map of user_id to organizations
      const userOrganizationsMap = new Map();
      
      if (orgAdmins) {
        orgAdmins.forEach(item => {
          if (!userOrganizationsMap.has(item.user_id)) {
            userOrganizationsMap.set(item.user_id, []);
          }
          
          // Ensure we're capturing both id and name from the organizations object
          const orgDetails = {
            id: item.organization_id,
            name: (item.organizations as any)?.name || 'Unknown Organization'
          };
          
          userOrganizationsMap.get(item.user_id).push(orgDetails);
        });
      }
      
      console.log("Users with organizations:", Array.from(userOrganizationsMap.keys()).length);
      
      // Map users with their organization info and set status to "occupied" or "available"
      return users.map(user => {
        const hasOrganizations = userOrganizationsMap.has(user.id) && userOrganizationsMap.get(user.id).length > 0;
        const userOrgs = userOrganizationsMap.get(user.id) || [];
        
        return {
          id: user.id,
          email: user.email,
          full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          role: user.role,
          // Keep original status if it's not 'active', otherwise determine based on assignments
          status: user.status !== 'active' ? user.status : hasOrganizations ? 'occupied' : 'available',
          organizations: userOrgs,
          has_organization: hasOrganizations
        };
      });
      
    } catch (error) {
      console.error('Error getting all organization admins:', error);
      return [];
    }
  },
}; 