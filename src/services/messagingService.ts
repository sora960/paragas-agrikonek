import { supabase } from '@/lib/supabase';
import { createNotification } from './notificationService';
import { v4 as uuid } from 'uuid';

/**
 * Interface for user conversation information
 */
export interface UserConversationInfo {
  userId: string;
  userName: string;
  userAvatar?: string;
  role: string;
  joinedAt: string;
}

/**
 * Interface for conversation
 */
export interface Conversation {
  id: string;
  title: string | null;
  type: 'direct' | 'group' | 'announcement';
  created_by: string | null;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
  last_message_content: string | null;
  last_message_time: string | null;
  last_sender_name: string | null;
  unread_count: number;
  participant_count: number;
}

/**
 * Interface for message with status
 */
export interface MessageWithStatus {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  sender_name: string | null;
  sender_avatar: string | null;
  content: string;
  content_type: 'text' | 'image' | 'file' | 'system';
  attachment_url: string | null;
  attachment_type: string | null;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  is_read: boolean;
  is_delivered: boolean;
  status_id: string | null;
}

/**
 * Get all conversations for a user
 */
export async function getUserConversations(userId: string): Promise<Conversation[]> {
  try {
    // First get all conversation IDs this user participates in
    const { data: participations, error: participationError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId)
      .eq('is_active', true);
    
    if (participationError) {
      console.error("Error getting user conversations:", participationError);
      throw participationError;
    }
    
    // If no participations, return empty array
    if (!participations || participations.length === 0) {
      return [];
    }
    
    // Extract conversation IDs
    const conversationIds = participations.map(p => p.conversation_id);
    
    // Get conversation previews - this includes the last message, participant count, etc.
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversation_previews')
      .select('*')
      .in('conversation_id', conversationIds)
      .order('last_message_time', { ascending: false, nullsFirst: false });
    
    if (conversationsError) {
      console.error("Error getting conversation previews:", conversationsError);
      throw conversationsError;
    }
    
    // Get unread counts for each conversation
    const { data: unreadCounts, error: unreadError } = await supabase
      .from('unread_message_counts')
      .select('conversation_id, unread_count')
      .eq('user_id', userId);
    
    if (unreadError) {
      console.error("Error getting unread counts:", unreadError);
      // Continue anyway, just won't have unread counts
    }
    
    // Create a map of conversation ID to unread count
    const unreadCountMap = new Map<string, number>();
    if (unreadCounts) {
      unreadCounts.forEach(item => {
        unreadCountMap.set(item.conversation_id, item.unread_count);
      });
    }
    
    // Map and combine the data
    return conversations?.map(conv => ({
      id: conv.conversation_id,
      title: conv.title,
      type: conv.type,
      created_by: null, // We don't have this in the preview
      organization_id: null, // We don't have this in the preview
      created_at: '', // We don't have this in the preview
      updated_at: conv.last_message_time || '',
      last_message_content: conv.last_message_content,
      last_message_time: conv.last_message_time,
      last_sender_name: conv.last_sender_name,
      unread_count: unreadCountMap.get(conv.conversation_id) || 0,
      participant_count: conv.participant_count
    })) || [];
  } catch (error) {
    console.error("Error getting user conversations:", error);
    throw error;
  }
}

/**
 * Get a specific conversation by ID
 */
export async function getConversationById(conversationId: string): Promise<Conversation | null> {
  try {
    // Get conversation from preview view
    const { data: conv, error: convError } = await supabase
      .from('conversation_previews')
      .select('*')
      .eq('conversation_id', conversationId)
      .single();
    
    if (convError) {
      if (convError.code === 'PGRST116') {
        // No data found
        return null;
      }
      console.error("Error getting conversation:", convError);
      throw convError;
    }
    
    if (!conv) {
      return null;
    }
    
    // Get the original conversation record for additional fields not in the preview
    const { data: fullConv, error: fullError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();
    
    if (fullError) {
      console.error("Error getting full conversation:", fullError);
      throw fullError;
    }
    
    // Combine the data
    return {
      id: conv.conversation_id,
      title: conv.title,
      type: conv.type,
      created_by: fullConv?.created_by || null,
      organization_id: fullConv?.organization_id || null,
      created_at: fullConv?.created_at || '',
      updated_at: fullConv?.updated_at || '',
      last_message_content: conv.last_message_content,
      last_message_time: conv.last_message_time,
      last_sender_name: conv.last_sender_name,
      unread_count: 0, // We don't have this in the preview directly
      participant_count: conv.participant_count
    };
  } catch (error) {
    console.error("Error getting conversation by ID:", error);
    throw error;
  }
}

/**
 * Get participants in a conversation
 */
export async function getConversationParticipants(conversationId: string): Promise<UserConversationInfo[]> {
  try {
    // Get participants with user info
    const { data, error } = await supabase
      .from('conversation_participants')
      .select(`
        id, role, joined_at, user_id,
        users:user_id (first_name, last_name)
      `)
      .eq('conversation_id', conversationId)
      .eq('is_active', true);
    
    if (error) {
      console.error("Error getting conversation participants:", error);
      throw error;
    }
    
    return data.map(item => ({
      userId: item.user_id,
      // Fix here: access the user object's first_name and last_name properties correctly
      userName: `${item.users?.first_name || ''} ${item.users?.last_name || ''}`.trim(),
      userAvatar: null, // Avatar URL not available yet
      role: item.role,
      joinedAt: item.joined_at
    }));
  } catch (error) {
    console.error("Error getting conversation participants:", error);
    throw error;
  }
}

/**
 * Get all messages in a conversation
 */
export async function getConversationMessages(conversationId: string): Promise<MessageWithStatus[]> {
  try {
    // Get messages with sender info and status
    const { data, error } = await supabase
      .from('messages')
      .select(`
        id, conversation_id, sender_id, content, content_type, 
        attachment_url, attachment_type, is_edited, created_at, updated_at,
        users:sender_id (first_name, last_name)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error("Error getting conversation messages:", error);
      throw error;
    }
    
    return data.map(message => ({
      id: message.id,
      conversation_id: message.conversation_id,
      sender_id: message.sender_id,
      // Fix here: access the user object's first_name and last_name properties correctly
      sender_name: message.users ? `${message.users?.first_name || ''} ${message.users?.last_name || ''}`.trim() : null,
      sender_avatar: null, // Avatar URL not available yet
      content: message.content,
      content_type: message.content_type,
      attachment_url: message.attachment_url,
      attachment_type: message.attachment_type,
      is_edited: message.is_edited,
      created_at: message.created_at,
      updated_at: message.updated_at,
      is_read: false, // Will be updated later if needed
      is_delivered: false, // Will be updated later if needed
      status_id: null // Will be updated later if needed
    }));
  } catch (error) {
    console.error("Error getting conversation messages:", error);
    throw error;
  }
}

/**
 * Create a direct conversation between two users
 */
export async function createDirectConversation(userId: string, otherUserId: string): Promise<string | null> {
  try {
    console.log(`Starting direct conversation: ${userId} -> ${otherUserId}`);
    
    // Validate parameters
    if (!userId || !otherUserId) {
      console.error("Invalid user IDs:", { userId, otherUserId });
      throw new Error("Both user IDs are required");
    }
    
    if (userId === otherUserId) {
      console.error("Cannot create conversation with self");
      throw new Error("Cannot create a conversation with yourself");
    }
    
    // First check if a direct conversation already exists between these users
    const { data: participants1, error: error1 } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);
    
    if (error1) {
      console.error("Error checking existing conversations for user 1:", error1);
      throw error1;
    }
    
    console.log(`Found ${participants1?.length || 0} conversations for user 1`);
    
    const { data: participants2, error: error2 } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', otherUserId);
    
    if (error2) {
      console.error("Error checking existing conversations for user 2:", error2);
      throw error2;
    }
    
    console.log(`Found ${participants2?.length || 0} conversations for user 2`);
    
    // Find conversation IDs that both users are part of
    const user1ConvIds = participants1.map(p => p.conversation_id);
    const user2ConvIds = participants2.map(p => p.conversation_id);
    const commonConvIds = user1ConvIds.filter(id => user2ConvIds.includes(id));
    
    console.log(`Found ${commonConvIds.length} common conversations`);
    
    // Check if any of these common conversations are direct conversations
    if (commonConvIds.length > 0) {
      const { data: directConvs, error: directError } = await supabase
        .from('conversations')
        .select('id')
        .in('id', commonConvIds)
        .eq('type', 'direct');
      
      if (directError) {
        console.error("Error checking direct conversations:", directError);
        throw directError;
      }
      
      if (directConvs && directConvs.length > 0) {
        // Direct conversation already exists
        console.log(`Returning existing conversation: ${directConvs[0].id}`);
        return directConvs[0].id;
      }
    }
    
    console.log("No existing conversation found, creating new one");
    
    // No existing direct conversation, create a new one
    const conversationId = uuid();
    
    // Get other user's name for the conversation title
    const { data: otherUser, error: userError } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', otherUserId)
      .single();
    
    if (userError) {
      console.error("Error getting other user:", userError);
      if (userError.code === 'PGRST116') {
        // No row found
        throw new Error(`User with ID ${otherUserId} not found`);
      }
      throw userError;
    }
    
    if (!otherUser) {
      console.error("Other user not found:", otherUserId);
      throw new Error(`User with ID ${otherUserId} not found`);
    }
    
    const otherUserName = `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.trim();
    console.log(`Other user name: ${otherUserName}`);
    
    // Insert the conversation
    const { error: convError } = await supabase
      .from('conversations')
      .insert({
        id: conversationId,
        title: otherUserName || 'Direct Message', // Use the other user's name as the title
        type: 'direct',
        created_by: userId
      });
    
    if (convError) {
      console.error("Error creating conversation:", convError);
      throw convError;
    }
    
    console.log(`Conversation created: ${conversationId}`);
    
    // Add both users as participants
    const participantsToAdd = [
      {
        conversation_id: conversationId,
        user_id: userId,
        role: 'admin'
      },
      {
        conversation_id: conversationId,
        user_id: otherUserId,
        role: 'member'
      }
    ];
    
    const { error: partError } = await supabase
      .from('conversation_participants')
      .insert(participantsToAdd);
    
    if (partError) {
      console.error("Error adding participants:", partError);
      // Try to clean up the conversation if adding participants fails
      try {
        await supabase
          .from('conversations')
          .delete()
          .eq('id', conversationId);
      } catch (cleanupError) {
        console.error("Error cleaning up conversation after failure:", cleanupError);
      }
      throw partError;
    }
    
    console.log(`Participants added successfully to conversation: ${conversationId}`);
    return conversationId;
  } catch (error) {
    console.error("Error creating direct conversation:", error);
    throw error;
  }
}

/**
 * Create a group conversation
 */
export async function createGroupConversation(
  title: string, 
  creatorId: string, 
  participantIds: string[],
  organizationId?: string
): Promise<string | null> {
  try {
    const conversationId = uuid();
    
    // Insert the conversation
    const { error: convError } = await supabase
      .from('conversations')
      .insert({
        id: conversationId,
        title,
        type: 'group',
        created_by: creatorId,
        organization_id: organizationId
      });
    
    if (convError) {
      console.error("Error creating group conversation:", convError);
      throw convError;
    }
    
    // Make sure all participant IDs are unique and include the creator
    const uniqueParticipantIds = Array.from(new Set([creatorId, ...participantIds]));
    
    // Add participants
    const participants = uniqueParticipantIds.map(userId => ({
      conversation_id: conversationId,
      user_id: userId,
      role: userId === creatorId ? 'admin' : 'member'
    }));
    
    const { error: partError } = await supabase
      .from('conversation_participants')
      .insert(participants);
    
    if (partError) {
      console.error("Error adding participants:", partError);
      throw partError;
    }
    
    return conversationId;
  } catch (error) {
    console.error("Error creating group conversation:", error);
    throw error;
  }
}

/**
 * Create an announcement conversation
 */
export async function createAnnouncementConversation(
  title: string, 
  creatorId: string, 
  organizationId: string,
  participantIds: string[]
): Promise<string | null> {
  try {
    const conversationId = uuid();
    
    // Insert the conversation
    const { error: convError } = await supabase
      .from('conversations')
      .insert({
        id: conversationId,
        title,
        type: 'announcement',
        created_by: creatorId,
        organization_id: organizationId
      });
    
    if (convError) {
      console.error("Error creating announcement conversation:", convError);
      throw convError;
    }
    
    // Make sure creator is included in participants
    const uniqueParticipantIds = Array.from(new Set([creatorId, ...participantIds]));
    
    // Add participants
    const participants = uniqueParticipantIds.map(userId => ({
      conversation_id: conversationId,
      user_id: userId,
      role: userId === creatorId ? 'admin' : 'member'
    }));
    
    const { error: partError } = await supabase
      .from('conversation_participants')
      .insert(participants);
    
    if (partError) {
      console.error("Error adding participants:", partError);
      throw partError;
    }
    
    return conversationId;
  } catch (error) {
    console.error("Error creating announcement conversation:", error);
    throw error;
  }
}

/**
 * Send a message
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  contentType: 'text' | 'image' | 'file' | 'system' = 'text',
  attachmentUrl?: string,
  attachmentType?: string
): Promise<{ id: string } | null> {
  try {
    const messageId = uuid();
    
    // Insert the message
    const { data, error } = await supabase
      .from('messages')
      .insert({
        id: messageId,
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        content_type: contentType,
        attachment_url: attachmentUrl,
        attachment_type: attachmentType
      })
      .select('id')
      .single();
    
    if (error) {
      console.error("Error sending message:", error);
      throw error;
    }
    
    // Get conversation details to create proper notifications
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id, title, type, organization_id')
      .eq('id', conversationId)
      .single();
    
    // Get conversation participants to notify them
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', senderId); // Exclude sender
    
    // Get sender profile to show their name in the notification
    try {
      const { data: senderUser } = await supabase
        .from('users')
        .select('email')
        .eq('id', senderId)
        .single();
        
      const senderName = senderUser?.email?.split('@')[0] || 'User'; 
      
      // Create a cleaned/shortened version of the message for the notification
      const messagePreview = content.length > 50 
        ? `${content.substring(0, 47)}...` 
        : content;
        
      // For image or file content, use a different preview
      const notificationContent = contentType === 'text' 
        ? messagePreview 
        : contentType === 'image' 
          ? 'Sent you an image' 
          : 'Sent you a file';
      
      // Get conversation title or create one if it doesn't exist
      const conversationTitle = conversation?.title || 'a conversation';
      
      // Create notifications for all participants except sender
      if (participants && participants.length > 0) {
        for (const participant of participants) {
          await createNotification(
            participant.user_id,
            `New message from ${senderName}`,
            notificationContent,
            'message',
            `/farmer/messaging`, // Link to messaging page - can be updated based on user role
            { 
              conversationId,
              senderId,
              senderName,
              organizationId: conversation?.organization_id
            },
            'medium'
          );
        }
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      // Continue with the function even if notification fails
    }
    
    return data;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
}

/**
 * Mark a conversation as read by a user
 */
export async function markConversationAsRead(conversationId: string, userId: string): Promise<boolean> {
  try {
    // Update the last_read_at timestamp for the participant
    const { error: updateError } = await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);
    
    if (updateError) {
      console.error("Error marking conversation as read:", updateError);
      throw updateError;
    }
    
    // Mark all messages as read
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId);
    
    if (messagesError) {
      console.error("Error getting messages to mark as read:", messagesError);
      throw messagesError;
    }
    
    if (messages && messages.length > 0) {
      const messageIds = messages.map(m => m.id);
      
      const { error: statusError } = await supabase
        .from('message_status')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .in('message_id', messageIds)
        .eq('user_id', userId);
      
      if (statusError) {
        console.error("Error updating message status:", statusError);
        throw statusError;
      }
    }
    
    return true;
  } catch (error) {
    console.error("Error marking conversation as read:", error);
    throw error;
  }
}

/**
 * Edit a message
 */
export async function editMessage(messageId: string, newContent: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ 
        content: newContent, 
        is_edited: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', messageId);
    
    if (error) {
      console.error("Error editing message:", error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error("Error editing message:", error);
    throw error;
  }
}

/**
 * Add a participant to a conversation
 */
export async function addConversationParticipant(
  conversationId: string, 
  userId: string, 
  role: 'admin' | 'member' = 'member'
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('conversation_participants')
      .upsert({
        conversation_id: conversationId,
        user_id: userId,
        role,
        is_active: true,
        last_read_at: new Date().toISOString(),
        joined_at: new Date().toISOString()
      });
    
    if (error) {
      console.error("Error adding participant:", error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error("Error adding participant:", error);
    throw error;
  }
}

/**
 * Remove a participant from a conversation
 */
export async function removeConversationParticipant(conversationId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('conversation_participants')
      .update({ is_active: false })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);
    
    if (error) {
      console.error("Error removing participant:", error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error("Error removing participant:", error);
    throw error;
  }
}

/**
 * Get total unread messages across all conversations for a user
 */
export async function getTotalUnreadMessages(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('unread_message_counts')
      .select('unread_count')
      .eq('user_id', userId);
    
    if (error) {
      console.error("Error getting unread message count:", error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      return 0;
    }
    
    return data.reduce((total, item) => total + item.unread_count, 0);
  } catch (error) {
    console.error("Error getting unread message count:", error);
    throw error;
  }
}
