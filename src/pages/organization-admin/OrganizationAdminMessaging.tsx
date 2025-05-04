import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { ConversationList } from '@/components/messaging/ConversationList';
import { Conversation } from '@/components/messaging/Conversation';
import { useMessaging } from '@/hooks/useMessaging';
import { MessageCircle, UserPlus, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { adminService } from '@/services/adminService';

// Define interfaces
interface FarmerProfileData {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  farm_name: string;
}

interface OrganizationMember {
  id: string;
  farmer_id: string;
  farmer_profiles: FarmerProfileData;
}

interface UserData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

interface ContactPerson {
  id: string;
  name: string;
  email: string;
  phone?: string;
  farmName?: string;
  type: 'admin' | 'member' | 'farmer';
}

export default function OrganizationAdminMessaging() {
  const [searchParams] = useSearchParams();
  const urlOrganizationId = searchParams.get("org");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const { conversations, isLoadingConversations, startDirectConversation } = useMessaging();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuth();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string>('');
  const [adminOrganizations, setAdminOrganizations] = useState<any[]>([]);
  const [organizationMembers, setOrganizationMembers] = useState<ContactPerson[]>([]);
  const [adminUsers, setAdminUsers] = useState<ContactPerson[]>([]);
  const [farmers, setFarmers] = useState<ContactPerson[]>([]);
  const [loadingStartConversation, setLoadingStartConversation] = useState<string | null>(null);
  const [organizationError, setOrganizationError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('farmers');

  useEffect(() => {
    if (user?.id) {
      if (urlOrganizationId) {
        setOrganizationId(urlOrganizationId);
        loadOrganizationDataById(urlOrganizationId);
      } else {
        loadAdminOrganizations();
      }
    }
  }, [user, urlOrganizationId]);
  
  // Load admin's organizations if no organization ID is provided
  const loadAdminOrganizations = async () => {
    try {
      setIsLoading(true);
      // Get the current user's ID from local storage
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        toast({
          title: "Error",
          description: "User information not found",
          variant: "destructive",
        });
        return;
      }
      
      const userData = JSON.parse(userStr);
      const orgs = await adminService.getUserAdminOrganizations(userData.id);
      
      setAdminOrganizations(orgs);
      
      // If there's only one organization, automatically select it
      if (orgs.length === 1) {
        // Use the history API to update the URL without causing a navigation
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set("org", orgs[0].id);
        window.history.replaceState({}, "", newUrl.toString());
        
        // Set organization and load its data
        setOrganizationId(orgs[0].id);
        setOrganizationName(orgs[0].name || 'Your Organization');
        loadOrganizationDataById(orgs[0].id);
      } else if (orgs.length === 0) {
        setOrganizationError('No organizations found for your account');
      }
    } catch (error) {
      console.error("Error loading admin organizations:", error);
      toast({
        title: "Error",
        description: "Failed to load your organizations",
        variant: "destructive",
      });
      setOrganizationError('Failed to load your organizations');
    } finally {
      setIsLoading(false);
    }
  };

  const loadOrganizationDataById = async (orgId: string) => {
    try {
      setIsLoading(true);
      setOrganizationError(null);
      
      // Get organization details
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('id', orgId)
        .single();

      if (orgError) {
        console.error('Error fetching organization:', orgError);
        setOrganizationError('Organization not found');
        return;
      }
      
      setOrganizationName(org.name || 'Your Organization');
      
      // Load organization farmers
      await loadFarmers(orgId);
      
      // Load other organization admins
      await loadOtherAdmins(orgId);
      
    } catch (error) {
      console.error('Error in loadOrganizationData:', error);
      toast({
        title: "Error",
        description: "Failed to load organization data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadFarmers = async (orgId: string) => {
    try {
      // Get members
      const { data: members, error: membersError } = await supabase
        .from('organization_members')
        .select(`
          id,
          farmer_id,
          farmer_profiles:farmer_id (
            id,
            user_id,
            full_name,
            email,
            phone,
            farm_name
          )
        `)
        .eq('organization_id', orgId)
        .eq('status', 'active');

      if (membersError) {
        console.error('Error fetching organization members:', membersError);
        throw membersError;
      }

      // Transform the data - ensure we're properly handling the types
      const formattedFarmers = (members || [])
        .filter((m: any) => m.farmer_profiles && m.farmer_profiles.user_id)
        .map((member: any) => ({
          id: member.farmer_profiles.user_id,
          name: member.farmer_profiles.full_name || 'Unknown',
          email: member.farmer_profiles.email || '',
          phone: member.farmer_profiles.phone || '',
          farmName: member.farmer_profiles.farm_name || 'Unknown Farm',
          type: 'farmer' as const
        }));

      setFarmers(formattedFarmers);
      console.log(`Loaded ${formattedFarmers.length} farmers`);
    } catch (error) {
      console.error('Error loading farmers:', error);
      toast({
        title: "Error",
        description: "Failed to load organization farmers",
        variant: "destructive",
      });
    }
  };

  const loadOtherAdmins = async (orgId: string) => {
    try {
      // Get organization admins
      const { data: admins, error: adminsError } = await supabase
        .from('organization_admins')
        .select(`
          id,
          user_id,
          users:user_id (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('organization_id', orgId)
        .neq('user_id', user?.id); // Exclude current user

      if (adminsError) {
        console.error('Error fetching organization admins:', adminsError);
        throw adminsError;
      }

      // Format admin data
      const formattedAdmins = (admins || []).map((admin: any) => ({
        id: admin.users.id,
        name: `${admin.users.first_name} ${admin.users.last_name}`,
        email: admin.users.email || '',
        type: 'admin' as const
      }));

      setAdminUsers(formattedAdmins);
      console.log(`Loaded ${formattedAdmins.length} other admins`);
    } catch (error) {
      console.error('Error loading other admins:', error);
      toast({
        title: "Error",
        description: "Failed to load other organization admins",
        variant: "destructive",
      });
    }
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
  };

  const startNewConversation = () => {
    setIsModalOpen(true);
  };

  const startConversationWithContact = async (contactId: string) => {
    if (!user) return;
    
    try {
      console.log(`Starting conversation with contact: ${contactId}`);
      console.log(`Current user ID: ${user.id}`);
      
      setLoadingStartConversation(contactId);
      const conversationId = await startDirectConversation(contactId);
      setActiveConversationId(conversationId);
      setLoadingStartConversation(null);
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast({
        title: "Error",
        description: "Failed to start conversation",
        variant: "destructive",
      });
      setLoadingStartConversation(null);
    }
  };

  // Render organization selection if no organization is selected
  const renderOrganizationSelection = () => {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-full">
        <div className="bg-muted/50 p-6 rounded-full mb-4">
          <Users className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-medium mb-4">Select an Organization</h3>
        {adminOrganizations.length === 0 ? (
          <p className="text-muted-foreground mb-2">
            You don't have access to any organizations.
          </p>
        ) : (
          <>
            <p className="text-muted-foreground mb-4">
              Select an organization to view its messages
            </p>
            <div className="grid grid-cols-1 gap-2 w-full max-w-md">
              {adminOrganizations.map(org => (
                <Button 
                  key={org.id} 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    const newUrl = new URL(window.location.href);
                    newUrl.searchParams.set("org", org.id);
                    window.history.pushState({}, "", newUrl.toString());
                    setOrganizationId(org.id);
                    loadOrganizationDataById(org.id);
                  }}
                >
                  {org.name || 'Unnamed Organization'}
                </Button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout userRole="organization">
      <div className="p-4 md:p-8 w-full max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <MessageCircle className="h-6 w-6 mr-2" />
            <h1 className="text-2xl font-bold">Messaging Center</h1>
            {organizationName && <span className="ml-2 text-muted-foreground">({organizationName})</span>}
          </div>
          {organizationId && !organizationError && (
            <Button onClick={startNewConversation}>
              <UserPlus className="h-4 w-4 mr-2" />
              New Conversation
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-[calc(100vh-15rem)]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : organizationError ? (
          <div className="bg-destructive/15 p-4 rounded-md text-center mb-4">
            <p className="text-destructive font-medium">{organizationError}</p>
            <p className="text-sm mt-2">You need to be associated with an organization to use messaging.</p>
          </div>
        ) : !organizationId ? (
          renderOrganizationSelection()
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-15rem)]">
            <div className="md:col-span-1 border rounded-lg bg-card shadow-sm overflow-hidden">
              <div className="p-4 bg-card shadow-sm border-b">
                <h2 className="font-medium">Your Conversations</h2>
              </div>
              <div className="h-[calc(100%-3.5rem)] overflow-auto">
                <ConversationList 
                  onSelectConversation={handleSelectConversation}
                />
              </div>
            </div>

            <div className="md:col-span-2 border rounded-lg bg-card shadow-sm overflow-hidden flex flex-col">
              {activeConversationId ? (
                <Conversation conversationId={activeConversationId} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <div className="bg-muted/50 p-6 rounded-full mb-4">
                    <MessageCircle className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-medium mb-2">No conversation selected</h3>
                  <p className="text-muted-foreground mb-6">
                    Select a conversation from the list or start a new conversation
                  </p>
                  <Button onClick={startNewConversation} variant="outline">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Start a new conversation
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {organizationId && !organizationError && (
          <div className="mt-8 border rounded-lg bg-card shadow-sm overflow-hidden">
            <div className="p-4 bg-card shadow-sm border-b">
              <h2 className="font-medium">Organization Contacts</h2>
            </div>
            
            <Tabs defaultValue="farmers" value={activeTab} onValueChange={setActiveTab} className="p-4">
              <TabsList className="mb-4">
                <TabsTrigger value="farmers">Farmers</TabsTrigger>
                <TabsTrigger value="admins">Other Admins</TabsTrigger>
              </TabsList>
              
              <TabsContent value="farmers">
                {farmers.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No farmers found in your organization
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {farmers.map((farmer) => (
                      <div key={farmer.id} className="border rounded-lg p-4 flex flex-col">
                        <div className="font-semibold mb-1">{farmer.name}</div>
                        <div className="text-sm text-muted-foreground mb-1">{farmer.email}</div>
                        {farmer.farmName && (
                          <div className="text-xs mb-3">{farmer.farmName}</div>
                        )}
                        <Button 
                          onClick={() => startConversationWithContact(farmer.id)}
                          size="sm"
                          className="mt-auto"
                          disabled={loadingStartConversation === farmer.id}
                        >
                          {loadingStartConversation === farmer.id ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            <>
                              <MessageCircle className="h-3 w-3 mr-2" />
                              Message
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="admins">
                {adminUsers.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No other admins found in your organization
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {adminUsers.map((admin) => (
                      <div key={admin.id} className="border rounded-lg p-4 flex flex-col">
                        <div className="font-semibold mb-1">{admin.name}</div>
                        <div className="text-sm text-muted-foreground mb-3">{admin.email}</div>
                        <div className="text-xs mb-2 px-2 py-1 bg-primary/10 text-primary rounded-full w-fit">
                          Admin
                        </div>
                        <Button 
                          onClick={() => startConversationWithContact(admin.id)}
                          size="sm"
                          className="mt-auto"
                          disabled={loadingStartConversation === admin.id}
                        >
                          {loadingStartConversation === admin.id ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            <>
                              <MessageCircle className="h-3 w-3 mr-2" />
                              Message
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      {isModalOpen && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Conversation</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <p className="mb-4">Choose contacts to start a conversation:</p>
              <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto">
                {[...farmers, ...adminUsers].map(contact => (
                  <Button
                    key={contact.id}
                    variant="outline"
                    className="justify-start"
                    onClick={() => {
                      startConversationWithContact(contact.id);
                      setIsModalOpen(false);
                    }}
                  >
                    <span>{contact.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{contact.email}</span>
                  </Button>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
} 