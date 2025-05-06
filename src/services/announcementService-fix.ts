import { supabase } from '@/lib/supabase';
import { v4 as uuid } from 'uuid';
import { createNotification } from './notificationService';

export interface Announcement {
  id: string;
  organization_id: string;
  title: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string | null;
  is_pinned: boolean;
  expires_at: string | null;
  creator_name?: string;
  status: 'active' | 'archived' | 'deleted';
}

/**
 * Create a new announcement for an organization
 */
export const createAnnouncement = async (
  organizationId: string,
  creatorId: string,
  title: string,
  content: string,
  isPinned: boolean = false,
  expiresAt: string | null = null
): Promise<Announcement> => {
  try {
    console.log('Creating announcement for org:', organizationId);
    
    // Use the custom function to create the announcement
    const { data, error } = await supabase
      .rpc('create_announcement', {
        organization_id: organizationId,
        creator_id: creatorId,
        title: title,
        content: content,
        is_pinned: isPinned,
        expires_at: expiresAt
      })
      .single();
    
    if (error) {
      console.error('Error creating announcement:', error);
      console.error('Error details:', error.message, error.details, error.hint);
      throw error;
    }
    
    console.log('Announcement created successfully:', data);
    
    // Ensure data is properly typed as Announcement
    const announcementData = data as Announcement;
    
    // Get organization members to notify them about the announcement
    try {
      const { data: members, error: membersError } = await supabase
        .from('organization_members')
        .select('farmer_id')
        .eq('organization_id', organizationId)
        .eq('status', 'active');
      
      if (membersError) {
        console.error('Error fetching organization members:', membersError);
        // Continue with the function even if notification fails
      } else if (members && members.length > 0) {
        // Get organization name for the notification
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', organizationId)
          .single();
        
        const orgName = orgError ? 'your organization' : orgData.name;
        
        // Create notifications for all members
        for (const member of members) {
          if (member.farmer_id !== creatorId) { // Don't notify the creator
            try {
              await createNotification(
                member.farmer_id,
                `New Announcement from ${orgName}`,
                title,
                'system',
                `/farmer/organization?org=${organizationId}&tab=announcements`,
                { 
                  announcementId: announcementData.id,
                  organizationId,
                  type: 'announcement'
                },
                'medium'
              );
            } catch (notifyError) {
              console.error('Error creating notification:', notifyError);
              // Continue with other notifications
            }
          }
        }
      }
    } catch (memberError) {
      console.error('Error in notification process:', memberError);
      // Continue with the function even if notification fails
    }
    
    return announcementData;
  } catch (error) {
    console.error('Error in createAnnouncement:', error);
    throw error;
  }
};

/**
 * Get all announcements for an organization
 */
export const getOrganizationAnnouncements = async (
  organizationId: string,
  includeExpired: boolean = false,
  limit: number = 100
): Promise<Announcement[]> => {
  try {
    console.log('Fetching announcements for org:', organizationId, 'includeExpired:', includeExpired);
    
    // Use the database function to get organization announcements
    const { data, error } = await supabase
      .rpc('get_organization_announcements', {
        org_id: organizationId,
        include_expired: includeExpired
      })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching announcements:', error);
      console.error('Error details:', error.message, error.details, error.hint);
      throw error;
    }
    
    console.log('Announcements fetched successfully, count:', data?.length);
    
    // Ensure data is properly typed as Announcement[]
    return data as Announcement[];
  } catch (error) {
    console.error('Error in getOrganizationAnnouncements:', error);
    return [];
  }
};

/**
 * Update an announcement
 */
export const updateAnnouncement = async (
  announcementId: string,
  updates: Partial<Announcement>
): Promise<Announcement | null> => {
  try {
    // Remove fields that shouldn't be updated
    const { id, created_by, created_at, organization_id, creator_name, ...validUpdates } = updates;
    
    console.log('Updating announcement with ID:', announcementId);
    
    const { data, error } = await supabase
      .from('organization_announcements')
      .update({
        ...validUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', announcementId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating announcement:', error);
      console.error('Error details:', error.message, error.details, error.hint);
      throw error;
    }
    
    console.log('Announcement updated successfully');
    
    return data as Announcement;
  } catch (error) {
    console.error('Error in updateAnnouncement:', error);
    return null;
  }
};

/**
 * Delete an announcement (soft delete)
 */
export const deleteAnnouncement = async (announcementId: string): Promise<boolean> => {
  try {
    console.log('Deleting (soft) announcement with ID:', announcementId);
    
    const { error } = await supabase
      .from('organization_announcements')
      .update({ 
        status: 'deleted',
        updated_at: new Date().toISOString()
      })
      .eq('id', announcementId);
    
    if (error) {
      console.error('Error deleting announcement:', error);
      console.error('Error details:', error.message, error.details, error.hint);
      throw error;
    }
    
    console.log('Announcement deleted successfully');
    
    return true;
  } catch (error) {
    console.error('Error in deleteAnnouncement:', error);
    return false;
  }
};

/**
 * Toggle pinned status of an announcement
 */
export const toggleAnnouncementPinned = async (
  announcementId: string, 
  isPinned: boolean
): Promise<boolean> => {
  try {
    console.log('Toggling announcement pin status. ID:', announcementId, 'Pinned:', isPinned);
    
    const { error } = await supabase
      .from('organization_announcements')
      .update({ 
        is_pinned: isPinned,
        updated_at: new Date().toISOString()
      })
      .eq('id', announcementId);
    
    if (error) {
      console.error('Error toggling announcement pinned status:', error);
      console.error('Error details:', error.message, error.details, error.hint);
      throw error;
    }
    
    console.log('Announcement pin status toggled successfully');
    
    return true;
  } catch (error) {
    console.error('Error in toggleAnnouncementPinned:', error);
    return false;
  }
}; 