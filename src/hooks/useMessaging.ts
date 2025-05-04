import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as messagingService from '@/services/messagingService';
import { useCallback } from 'react';

export const useMessaging = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  // Query for user conversations
  const { 
    data: conversations, 
    isLoading: isLoadingConversations,
    error: conversationsError,
    refetch: refetchConversations
  } = useQuery({
    queryKey: ['conversations', userId],
    queryFn: () => userId ? messagingService.getUserConversations(userId) : Promise.resolve([]),
    enabled: !!userId,
  });

  // Query for total unread messages
  const {
    data: unreadCount = 0,
    isLoading: isLoadingUnreadCount,
    refetch: refetchUnreadCount
  } = useQuery({
    queryKey: ['unreadMessages', userId],
    queryFn: () => userId ? messagingService.getTotalUnreadMessages(userId) : Promise.resolve(0),
    enabled: !!userId,
  });

  // Get messages for a specific conversation
  const useConversationMessages = (conversationId?: string) => {
    return useQuery({
      queryKey: ['messages', conversationId],
      queryFn: () => conversationId 
        ? messagingService.getConversationMessages(conversationId) 
        : Promise.resolve([]),
      enabled: !!conversationId,
    });
  };

  // Get conversation participants
  const useConversationParticipants = (conversationId?: string) => {
    return useQuery({
      queryKey: ['participants', conversationId],
      queryFn: () => conversationId 
        ? messagingService.getConversationParticipants(conversationId) 
        : Promise.resolve([]),
      enabled: !!conversationId,
    });
  };

  // Get a specific conversation
  const useConversation = (conversationId?: string) => {
    return useQuery({
      queryKey: ['conversation', conversationId],
      queryFn: () => conversationId 
        ? messagingService.getConversationById(conversationId) 
        : Promise.resolve(null),
      enabled: !!conversationId,
    });
  };

  // Create direct conversation mutation
  const createDirectConversationMutation = useMutation({
    mutationFn: async (otherUserId: string): Promise<string | null> => {
      if (!userId) throw new Error('User is not authenticated');
      return messagingService.createDirectConversation(userId, otherUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });

  // Create group conversation mutation
  const createGroupConversationMutation = useMutation({
    mutationFn: async ({ 
      title, 
      participantIds, 
      organizationId 
    }: { 
      title: string; 
      participantIds: string[]; 
      organizationId?: string; 
    }): Promise<string | null> => {
      if (!userId) throw new Error('User is not authenticated');
      return messagingService.createGroupConversation(title, userId, participantIds, organizationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });

  // Create announcement conversation mutation
  const createAnnouncementConversationMutation = useMutation({
    mutationFn: async ({ 
      title, 
      organizationId, 
      participantIds 
    }: { 
      title: string; 
      organizationId: string; 
      participantIds: string[]; 
    }): Promise<string | null> => {
      if (!userId) throw new Error('User is not authenticated');
      return messagingService.createAnnouncementConversation(
        title, 
        userId, 
        organizationId, 
        participantIds
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ 
      conversationId, 
      content, 
      contentType, 
      attachmentUrl, 
      attachmentType 
    }: { 
      conversationId: string; 
      content: string; 
      contentType?: 'text' | 'image' | 'file' | 'system'; 
      attachmentUrl?: string; 
      attachmentType?: string; 
    }) => {
      if (!userId) throw new Error('User is not authenticated');
      return messagingService.sendMessage(
        conversationId, 
        userId, 
        content, 
        contentType || 'text', 
        attachmentUrl, 
        attachmentType
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });

  // Mark conversation as read mutation
  const markConversationAsReadMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      if (!userId) throw new Error('User is not authenticated');
      return messagingService.markConversationAsRead(conversationId, userId);
    },
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['unreadMessages'] });
    }
  });

  // Edit message mutation
  const editMessageMutation = useMutation({
    mutationFn: async ({ 
      messageId, 
      newContent, 
      conversationId 
    }: { 
      messageId: string; 
      newContent: string; 
      conversationId: string;
    }) => {
      return messagingService.editMessage(messageId, newContent);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.conversationId] });
    }
  });

  // Add participant mutation
  const addParticipantMutation = useMutation({
    mutationFn: async ({ 
      conversationId, 
      participantId, 
      role 
    }: { 
      conversationId: string; 
      participantId: string; 
      role?: 'admin' | 'member';
    }) => {
      return messagingService.addConversationParticipant(
        conversationId, 
        participantId, 
        role || 'member'
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['participants', variables.conversationId] });
    }
  });

  // Remove participant mutation
  const removeParticipantMutation = useMutation({
    mutationFn: async ({ 
      conversationId, 
      participantId 
    }: { 
      conversationId: string; 
      participantId: string;
    }) => {
      return messagingService.removeConversationParticipant(conversationId, participantId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['participants', variables.conversationId] });
    }
  });

  // Helper to start a direct conversation and return the ID
  const startDirectConversation = useCallback(async (otherUserId: string) => {
    if (!userId) return null;
    
    const result = await createDirectConversationMutation.mutateAsync(otherUserId);
    return result;
  }, [userId, createDirectConversationMutation]);

  // Helper function to send a message and return the message object
  const sendMessage = useCallback(async (
    conversationId: string, 
    content: string, 
    contentType?: 'text' | 'image' | 'file' | 'system',
    attachmentUrl?: string,
    attachmentType?: string
  ) => {
    if (!userId) return null;
    
    return sendMessageMutation.mutateAsync({
      conversationId,
      content,
      contentType,
      attachmentUrl,
      attachmentType
    });
  }, [userId, sendMessageMutation]);

  return {
    // Queries
    conversations,
    isLoadingConversations,
    conversationsError,
    unreadCount,
    isLoadingUnreadCount,
    useConversationMessages,
    useConversationParticipants,
    useConversation,
    
    // Mutations
    createDirectConversation: createDirectConversationMutation.mutate,
    createGroupConversation: createGroupConversationMutation.mutate,
    createAnnouncementConversation: createAnnouncementConversationMutation.mutate,
    sendMessage: sendMessageMutation.mutate,
    markConversationAsRead: markConversationAsReadMutation.mutate,
    editMessage: editMessageMutation.mutate,
    addParticipant: addParticipantMutation.mutate,
    removeParticipant: removeParticipantMutation.mutate,
    
    // Add mutateAsync properties
    createDirectConversationMutation,
    createGroupConversationMutation,
    createAnnouncementConversationMutation,
    
    // Mutation states
    isCreatingDirectConversation: createDirectConversationMutation.isPending,
    isCreatingGroupConversation: createGroupConversationMutation.isPending,
    isCreatingAnnouncementConversation: createAnnouncementConversationMutation.isPending,
    isSendingMessage: sendMessageMutation.isPending,
    isMarkingAsRead: markConversationAsReadMutation.isPending,
    isEditingMessage: editMessageMutation.isPending,
    isAddingParticipant: addParticipantMutation.isPending,
    isRemovingParticipant: removeParticipantMutation.isPending,
    
    // Helper functions
    startDirectConversation,
    sendMessageToConversation: sendMessage,
    refetchConversations,
    refetchUnreadCount
  };
}; 