import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Send, UserPlus, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { createGroupConversation, sendMessage } from "@/services/messagingService";
import { useAuth } from "@/lib/AuthContext";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_name: string;
  created_at: string;
}

interface Member {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
}

interface OrganizationGroupChatProps {
  organizationId: string;
  organizationName: string;
}

export function OrganizationGroupChat({ organizationId, organizationName }: OrganizationGroupChatProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);

  useEffect(() => {
    if (organizationId) {
      loadOrganizationGroupChat();
    }
  }, [organizationId]);

  // Setup real-time subscription for new messages
  useEffect(() => {
    if (!conversationId) return;

    const subscription = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        payload => {
          handleNewMessage(payload.new);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [conversationId]);

  const loadOrganizationGroupChat = async () => {
    try {
      setLoading(true);

      // First load organization members
      await loadOrganizationMembers();

      // Then look for an existing group conversation for this organization
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('id, title')
        .eq('organization_id', organizationId)
        .eq('type', 'group')
        .order('created_at', { ascending: false })
        .limit(1);

      if (convError) {
        throw convError;
      }

      // If a conversation exists, use it
      if (conversations && conversations.length > 0) {
        const existingConversationId = conversations[0].id;
        setConversationId(existingConversationId);
        loadMessages(existingConversationId);
      } else {
        // Otherwise, create a new group conversation if we are a member
        createOrganizationGroupChat();
      }
    } catch (error) {
      console.error("Error loading organization group chat:", error);
      toast({
        title: "Error",
        description: "Failed to load organization chat",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizationMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          id,
          farmer_profiles:farmer_id (
            id,
            user_id,
            full_name,
            email
          )
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'active');

      if (error) throw error;

      const formattedMembers = data
        .filter(member => member.farmer_profiles) // Filter out any null profiles
        .map(member => ({
          id: member.id,
          user_id: member.farmer_profiles.user_id,
          full_name: member.farmer_profiles.full_name || "Unknown Member",
          email: member.farmer_profiles.email || ""
        }));

      setMembers(formattedMembers);
    } catch (error) {
      console.error("Error loading organization members:", error);
    }
  };

  const createOrganizationGroupChat = async () => {
    if (!user) return;

    try {
      // Get all member user IDs
      const memberUserIds = members.map(member => member.user_id);
      
      // Make sure the current user is included
      if (!memberUserIds.includes(user.id)) {
        memberUserIds.push(user.id);
      }

      // Create group conversation
      const newConversationId = await createGroupConversation(
        `${organizationName} Group Chat`,
        user.id,
        memberUserIds,
        organizationId
      );

      if (newConversationId) {
        setConversationId(newConversationId);
        toast({
          title: "Group chat created",
          description: "A new group chat has been created for this organization"
        });
      }
    } catch (error) {
      console.error("Error creating organization group chat:", error);
      toast({
        title: "Error",
        description: "Failed to create organization chat",
        variant: "destructive",
      });
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id, content, created_at, sender_id,
          users:sender_id (first_name, last_name)
        `)
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedMessages = data.map(msg => ({
        id: msg.id,
        content: msg.content,
        sender_id: msg.sender_id,
        sender_name: msg.users ? `${msg.users.first_name || ''} ${msg.users.last_name || ''}`.trim() : 'Unknown',
        created_at: msg.created_at
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error("Error loading messages:", error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    }
  };

  const handleNewMessage = (message: any) => {
    // If the message is already in our list, don't add it again
    if (messages.some(msg => msg.id === message.id)) return;

    // Fetch the sender name
    supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', message.sender_id)
      .single()
      .then(({ data }) => {
        const senderName = data 
          ? `${data.first_name || ''} ${data.last_name || ''}`.trim() 
          : 'Unknown';

        setMessages(prev => [
          ...prev,
          {
            id: message.id,
            content: message.content,
            sender_id: message.sender_id,
            sender_name: senderName,
            created_at: message.created_at
          }
        ]);
      });
  };

  const handleSendMessage = async () => {
    if (!user || !conversationId || !newMessage.trim()) return;

    try {
      setSendingMessage(true);
      await sendMessage(conversationId, user.id, newMessage);
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Organization Chat</CardTitle>
          <CardDescription>
            Communicate with all members of this organization
          </CardDescription>
        </div>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => setShowMembersDialog(true)}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          <span>Members ({members.length})</span>
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !conversationId ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <MessageSquare className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <h3 className="text-lg font-medium">Start a Group Chat</h3>
              <p className="text-sm text-muted-foreground">
                Create a group chat for this organization
              </p>
            </div>
            <Button onClick={createOrganizationGroupChat}>
              Create Group Chat
            </Button>
          </div>
        ) : (
          <div className="flex flex-col h-[500px]">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4 pb-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map(message => (
                    <div
                      key={message.id}
                      className={`flex items-start gap-3 ${
                        message.sender_id === user?.id ? 'justify-end' : ''
                      }`}
                    >
                      {message.sender_id !== user?.id && (
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {getInitials(message.sender_name)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`flex flex-col max-w-[80%] ${
                          message.sender_id === user?.id ? 'items-end' : 'items-start'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {message.sender_id !== user?.id && (
                            <span className="text-sm font-medium">
                              {message.sender_name}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatTime(message.created_at)}
                          </span>
                        </div>
                        <div
                          className={`rounded-lg p-3 ${
                            message.sender_id === user?.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          {message.content}
                        </div>
                      </div>
                      {message.sender_id === user?.id && (
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {getInitials(user?.email || 'User')}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            <Separator className="my-4" />
            <div className="flex gap-2">
              <Input
                placeholder="Type your message..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={sendingMessage}
              />
              <Button onClick={handleSendMessage} disabled={sendingMessage || !newMessage.trim()}>
                {sendingMessage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span className="sr-only">Send</span>
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Members Dialog */}
      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Organization Members</DialogTitle>
            <DialogDescription>
              Members who have access to this organization chat
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {members.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No members found
              </div>
            ) : (
              <div className="space-y-2">
                {members.map(member => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2 border rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {getInitials(member.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{member.full_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {member.email}
                        </div>
                      </div>
                    </div>
                    {member.user_id === user?.id && (
                      <Badge variant="outline" className="bg-primary/10">
                        You
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowMembersDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default OrganizationGroupChat; 