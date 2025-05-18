import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Loader2, 
  Search, 
  Plus, 
  Send, 
  RefreshCw, 
  Trash2, 
  Check, 
  AlertCircle, 
  ChevronDown,
  MessageCircle
} from "lucide-react";

export default function MessagingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("compose");
  const [sending, setSending] = useState(false);
  const [userRegion, setUserRegion] = useState<any>(null);

  useEffect(() => {
    fetchUserRegion();
  }, [user]);

  useEffect(() => {
    if (userRegion) {
      fetchMessages();
      fetchOrganizations();
    }
  }, [userRegion]);

  const fetchUserRegion = async () => {
    if (!user) return;
    
    try {
      const { data: regionData, error: regionError } = await supabase
        .from("user_regions")
        .select("region_id, regions(id, name)")
        .eq("user_id", user.id)
        .single();
        
      if (regionError) throw regionError;
      
      if (regionData) {
        setUserRegion(regionData.regions);
      } else {
        toast({
          title: "No Region Assigned",
          description: "You don't have any assigned region.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("Error fetching user region:", err);
      toast({
        title: "Error",
        description: "Failed to fetch region information. " + err.message,
        variant: "destructive",
      });
    }
  };

  const fetchMessages = async () => {
    if (!userRegion) return;
    
    setLoading(true);
    try {
      // Check if the messages table exists
      const { error: tableCheckError } = await supabase
        .from("messages")
        .select("count")
        .limit(1);
        
      // If table doesn't exist, just set empty array and don't show error
      if (tableCheckError && tableCheckError.message.includes("does not exist")) {
        console.log("Messages table does not exist yet");
        setMessages([]);
        setLoading(false);
        return;
      }
      
      // Fetch messages where the user is either the sender or recipient
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          sender:sender_id(id, email, display_name),
          recipient:recipient_id(id, email, display_name),
          organization:organization_id(id, name)
        `)
        .or(`sender_id.eq.${user!.id},recipient_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      
      setMessages(data || []);
    } catch (err: any) {
      console.error("Error fetching messages:", err);
      // Don't show error if it's just that the table doesn't exist
      if (!err.message.includes("does not exist")) {
        toast({
          title: "Error",
          description: "Failed to fetch messages. " + err.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    if (!userRegion) return;
    
    try {
      // Fetch organizations in the user's region
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, status")
        .eq("region_id", userRegion.id)
        .eq("status", "active");
        
      if (error) throw error;
      
      setOrganizations(data || []);
    } catch (err: any) {
      console.error("Error fetching organizations:", err);
      toast({
        title: "Error",
        description: "Failed to fetch organizations. " + err.message,
        variant: "destructive",
      });
    }
  };

  const sendMessage = async () => {
    if (!subject || !message || !selectedOrg) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    
    setSending(true);
    try {
      // Try to create messages table if it doesn't exist
      try {
        await supabase.rpc('create_messages_table_if_not_exists');
      } catch (err) {
        console.error("Failed to create messages table:", err);
        // Continue anyway, the table might already exist
      }
      
      // Send a message to the organization
      const { data, error } = await supabase
        .from("messages")
        .insert([
          {
            sender_id: user!.id,
            sender_type: "regional_admin",
            organization_id: selectedOrg,
            subject,
            content: message,
            is_read: false,
          },
        ]);
        
      if (error) throw error;
      
      toast({
        title: "Message sent",
        description: "Your message has been sent to the organization",
      });
      
      // Reset form
      setSelectedOrg(null);
      setSubject("");
      setMessage("");
      
      // Refresh messages
      fetchMessages();
    } catch (err: any) {
      console.error("Error sending message:", err);
      
      // If the messages table doesn't exist yet, suggest creating it
      if (err.message.includes("does not exist")) {
        toast({
          title: "Messages table missing",
          description: "The messages table does not exist in the database. Please run the database setup script.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to send message. " + err.message,
          variant: "destructive",
        });
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout userRole="regional">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Messaging</h1>
            <p className="text-muted-foreground">
              Communicate with organizations in your region
            </p>
      </div>
          <Button 
            onClick={fetchMessages}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        <Tabs 
          defaultValue="compose" 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList>
            <TabsTrigger value="sent">Sent</TabsTrigger>
            <TabsTrigger value="compose">Compose</TabsTrigger>
          </TabsList>

          <TabsContent value="sent" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Sent Messages</CardTitle>
                <CardDescription>
                  Messages you've sent to organizations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : messages.filter(m => m.sender_id === user?.id).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>You haven't sent any messages yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {messages
                      .filter(m => m.sender_id === user?.id)
                      .map((msg) => (
                        <Card key={msg.id} className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium">{msg.subject}</h3>
                              <p className="text-sm text-muted-foreground">
                                To: {msg.organization?.name || "Unknown Organization"}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {new Date(msg.created_at).toLocaleString()}
              </p>
            </div>
                          <p className="mt-2 text-sm">{msg.content}</p>
                          <div className="mt-2 text-xs text-right text-muted-foreground">
                            {msg.is_read ? (
                              <span className="flex items-center justify-end gap-1">
                                <Check className="h-3 w-3" /> Read
                              </span>
                            ) : (
                              <span className="flex items-center justify-end gap-1">
                                <AlertCircle className="h-3 w-3" /> Not read yet
                              </span>
          )}
        </div>
                        </Card>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compose" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Compose New Message</CardTitle>
                <CardDescription>
                  Send a message to an organization in your region
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" htmlFor="organization">
                      Organization
                    </label>
                    <Select value={selectedOrg || ""} onValueChange={setSelectedOrg}>
                      <SelectTrigger id="organization">
                        <SelectValue placeholder="Select an organization" />
                      </SelectTrigger>
                      <SelectContent>
                        {organizations.length === 0 ? (
                          <SelectItem value="none" disabled>
                            No organizations available
                          </SelectItem>
                        ) : (
                          organizations.map((org) => (
                            <SelectItem key={org.id} value={org.id}>
                              {org.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1" htmlFor="subject">
                      Subject
                    </label>
                    <Input
                      id="subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Message subject"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1" htmlFor="message">
                      Message
                    </label>
                    <Textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type your message here..."
                      rows={6}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-end">
                <Button
                  onClick={sendMessage}
                  disabled={sending || !selectedOrg || !subject || !message}
                  className="gap-2"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send Message
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 