import { useState } from 'react';
import { ConversationList } from '@/components/messaging/ConversationList';
import { Conversation } from '@/components/messaging/Conversation';
import { useMessaging } from '@/hooks/useMessaging';
import { Separator } from '@/components/ui/separator';
import { MessageCircle } from 'lucide-react';

export default function MessagingPage() {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const { conversations, isLoadingConversations } = useMessaging();

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
  };

  return (
    <div className="container mx-auto py-6 h-[calc(100vh-4rem)]">
      <div className="flex items-center mb-6">
        <MessageCircle className="mr-2 h-6 w-6" />
        <h1 className="text-2xl font-bold">Messages</h1>
      </div>

      <div className="flex h-[calc(100%-4rem)] border rounded-md overflow-hidden">
        <div className="w-1/3 border-r">
          <ConversationList onSelectConversation={handleSelectConversation} />
        </div>
        <Separator orientation="vertical" />
        <div className="flex-1">
          {activeConversationId ? (
            <Conversation conversationId={activeConversationId} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              <MessageCircle className="h-12 w-12 mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">No conversation selected</h2>
              <p className="text-muted-foreground max-w-md">
                {isLoadingConversations
                  ? 'Loading conversations...'
                  : conversations && conversations.length > 0
                  ? 'Select a conversation from the list to start messaging'
                  : 'Start a new conversation by clicking the + button'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 