
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useMessaging } from '@/hooks/useMessaging';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, Edit2, Info, Loader2, Send, User, Users } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MessageWithStatus, UserConversationInfo } from '@/services/messagingService';

export const Conversation = ({ conversationId }: { conversationId: string }) => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [editingMessageId, setEditingMessageId] = useState('');
  const [editContent, setEditContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    useConversation,
    useConversationMessages,
    useConversationParticipants,
    sendMessage,
    markConversationAsRead,
    editMessage,
    isSendingMessage,
    isEditingMessage,
  } = useMessaging();

  const { data: conversation, isLoading: isLoadingConversation } = useConversation(conversationId);
  const { data: messages = [], isLoading: isLoadingMessages } = useConversationMessages(conversationId);
  const { data: participants = [], isLoading: isLoadingParticipants } = useConversationParticipants(conversationId);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Mark conversation as read when opened
  useEffect(() => {
    if (conversationId && user?.id) {
      markConversationAsRead(conversationId);
    }
  }, [conversationId, user?.id, markConversationAsRead]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user?.id) return;

    sendMessage({
      conversationId,
      content: message.trim(),
      contentType: 'text',
    });
    setMessage('');
  };

  const handleStartEditing = (messageContent: string, messageId: string) => {
    setEditingMessageId(messageId);
    setEditContent(messageContent);
  };

  const handleEditMessage = () => {
    if (!editContent.trim() || !editingMessageId) return;

    editMessage({
      messageId: editingMessageId,
      newContent: editContent.trim(),
      conversationId,
    });

    setEditingMessageId('');
    setEditContent('');
  };

  const cancelEdit = () => {
    setEditingMessageId('');
    setEditContent('');
  };

  // Format time for messages
  const formatMessageTime = (dateString: string) => {
    return format(new Date(dateString), 'h:mm a');
  };

  // Get participant details by ID
  const getParticipantInfo = (userId: string): UserConversationInfo | undefined => {
    return participants.find(p => p.userId === userId);
  };

  if (isLoadingConversation || isLoadingMessages || isLoadingParticipants) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b p-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-20 mt-2" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-start space-x-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div>
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-16 w-72 rounded-md" />
              </div>
            </div>
          ))}
        </div>
        <div className="border-t p-4">
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  // Sort messages by creation time (newest last)
  const sortedMessages = [...messages].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="flex flex-col h-full">
      {/* Conversation header */}
      <div className="border-b p-4">
        <div className="flex items-center">
          {conversation?.type === 'direct' ? (
            <User className="w-5 h-5 mr-2" />
          ) : conversation?.type === 'group' ? (
            <Users className="w-5 h-5 mr-2" />
          ) : (
            <Info className="w-5 h-5 mr-2" />
          )}
          <h2 className="text-lg font-semibold">
            {conversation?.title || 
              (conversation?.type === 'direct' && participants.length > 0
                ? participants.find(p => p.userId !== user?.id)?.userName
                : 'Conversation')}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {participants.length} participant{participants.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Message area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {sortedMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-10">
              <p className="text-muted-foreground text-center">
                No messages yet. Start the conversation!
              </p>
            </div>
          ) : (
            sortedMessages.map(message => (
              <div
                key={message.id}
                className={`flex items-start ${
                  message.sender_id === user?.id ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.sender_id !== user?.id && (
                  <Avatar className="h-8 w-8 mr-2">
                    <AvatarImage src={message.sender_avatar || undefined} />
                    <AvatarFallback>
                      {message.sender_name?.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[70%] ${
                    message.sender_id === user?.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  } p-3 rounded-lg`}
                >
                  {message.sender_id !== user?.id && (
                    <p className="text-xs font-medium mb-1">{message.sender_name}</p>
                  )}
                  
                  {editingMessageId === message.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        className="min-h-[80px] bg-background"
                      />
                      <div className="flex justify-end space-x-2">
                        <Button size="sm" variant="ghost" onClick={cancelEdit}>
                          Cancel
                        </Button>
                        <Button 
                          size="sm"
                          onClick={handleEditMessage}
                          disabled={isEditingMessage}
                        >
                          {isEditingMessage ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <Check className="h-4 w-4 mr-1" />
                          )}
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p>{message.content}</p>
                      <div className="flex items-center justify-end mt-1 space-x-1">
                        <span className="text-xs opacity-70">
                          {formatMessageTime(message.created_at)}
                        </span>
                        {message.is_edited && (
                          <span className="text-xs opacity-70">(edited)</span>
                        )}
                        {message.sender_id === user?.id && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={() => handleStartEditing(message.content, message.id)}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit message</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </>
                  )}
                </div>
                {message.sender_id === user?.id && (
                  <Avatar className="h-8 w-8 ml-2">
                    <AvatarImage src={user.firstName ? undefined : undefined} />
                    <AvatarFallback>
                      {user.firstName?.[0] || ''}
                      {user.lastName?.[0] || ''}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message input */}
      <div className="border-t p-4">
        <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
          <Textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="min-h-[80px] flex-1 resize-none"
          />
          <Button 
            type="submit" 
            size="icon" 
            className="h-10 w-10"
            disabled={!message.trim() || isSendingMessage}
          >
            {isSendingMessage ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}; 
