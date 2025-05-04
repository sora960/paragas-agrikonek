import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMessaging } from '@/hooks/useMessaging';
import { format, isToday, isYesterday } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CirclePlus,
  MessageCircle,
  Users,
  Megaphone,
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { NewConversationModal } from '@/components/messaging/NewConversationModal';

export const ConversationList = ({ onSelectConversation }: { onSelectConversation: (id: string) => void }) => {
  const { conversations, isLoadingConversations } = useMessaging();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  // Format the date of the last message
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM d');
    }
  };

  // Get conversation icon based on type
  const getConversationIcon = (type: string) => {
    switch (type) {
      case 'direct':
        return <MessageCircle className="w-4 h-4" />;
      case 'group':
        return <Users className="w-4 h-4" />;
      case 'announcement':
        return <Megaphone className="w-4 h-4" />;
      default:
        return <MessageCircle className="w-4 h-4" />;
    }
  };

  // Filter conversations by search query
  const filteredConversations = conversations?.filter(conversation => {
    const title = conversation.title || conversation.last_sender_name || '';
    const lastMessage = conversation.last_message_content || '';
    
    return (
      title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  if (isLoadingConversations) {
    return (
      <div className="w-full max-w-sm">
        <div className="flex items-center mb-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-10 ml-2" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-start space-x-4 mb-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <Skeleton className="h-4 w-8" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button size="icon" variant="ghost" className="ml-2">
              <CirclePlus className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Conversation</DialogTitle>
            </DialogHeader>
            <NewConversationModal onSuccess={(id) => {
              setIsModalOpen(false);
              onSelectConversation(id);
            }} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {filteredConversations && filteredConversations.length > 0 ? (
          filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              className="flex items-start p-3 rounded-md hover:bg-muted cursor-pointer"
              onClick={() => onSelectConversation(conversation.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-sm font-medium truncate">
                    {conversation.title || conversation.last_sender_name || 'Unnamed Conversation'}
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(conversation.last_message_time)}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="mr-1">
                    {getConversationIcon(conversation.type)}
                  </span>
                  <p className="text-xs text-muted-foreground truncate">
                    {conversation.last_message_content || 'No messages yet'}
                  </p>
                  {conversation.unread_count > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {conversation.unread_count}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10">
            <p className="text-muted-foreground text-sm">
              {searchQuery ? 'No conversations match your search' : 'No conversations yet'}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setIsModalOpen(true)}
            >
              Start a conversation
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}; 