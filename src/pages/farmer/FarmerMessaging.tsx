import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { ConversationList } from '@/components/messaging/ConversationList';
import { Conversation } from '@/components/messaging/Conversation';
import { useMessaging } from '@/hooks/useMessaging';
import { Separator } from '@/components/ui/separator';
import { MessageCircle, UserPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { NewConversationModal } from '@/components/messaging/NewConversationModal';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

interface OrganizationAdmin {
  id: string;
  user_id: string;
  users: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface ContactPerson {
  id: string;
  name: string;
  email: string;
  phone?: string;
  farmName?: string;
  type: 'admin' | 'member';
}

export default function FarmerMessaging() {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const { conversations, isLoadingConversations, startDirectConversation } = useMessaging();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuth();
  const [organizationMembers, setOrganizationMembers] = useState<ContactPerson[]>([]);
  const [orgAdmins, setOrgAdmins] = useState<ContactPerson[]>([]);
  const [loadingStartConversation, setLoadingStartConversation] = useState<string | null>(null);
  const [membershipError, setMembershipError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('members');
  const { toast } = useToast();

  useEffect(() => {
    if (user?.id) {
      loadOrganizationMembers();
    }
  }, [user]);

  const loadOrganizationMembers = async () => {
    try {
      setIsLoading(true);
      // First get the farmer profile to get organization_id
      const { data: farmerProfile, error: farmerError } = await supabase
        .from('farmer_profiles')
        .select('id, organization_id')
        .eq('user_id', user?.id)
        .single();

      if (farmerError) {
        console.error('Error fetching farmer profile:', farmerError);
        toast({
          title: "Error",
          description: "Failed to load your profile information",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      // Check if user has an organization
      if (!farmerProfile?.organization_id) {
        console.log('Farmer has no organization assigned in farmer_profiles');
        setMembershipError('No organization assigned in your profile');
        
        // Try checking organization_members table directly as fallback
        const { data: memberData, error: memberError } = await supabase
          .from('organization_members')
          .select('organization_id, status')
          .eq('farmer_id', farmerProfile?.id)
          .eq('status', 'active')
          .single();
          
        if (memberError || !memberData?.organization_id) {
          console.log('Farmer is not in organization_members either');
          setMembershipError('You are not a member of any organization');
          setIsLoading(false);
          return;
        }
        
        // Use the organization_id from the membership record
        const orgId = memberData.organization_id;
        setMembershipError(null);
        loadMembersForOrganization(orgId, farmerProfile.id);
      } else {
        // Use the organization_id from the farmer profile
        setMembershipError(null);
        loadMembersForOrganization(farmerProfile.organization_id, farmerProfile.id);
      }
    } catch (error) {
      console.error('Error in loadOrganizationMembers:', error);
      toast({
        title: "Error",
        description: "Failed to load organization members",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  // Helper function to load members for a specific organization
  const loadMembersForOrganization = async (orgId: string, currentFarmerId: string) => {
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
        .eq('status', 'active')
        .neq('farmer_id', currentFarmerId); // Exclude current user

      if (membersError) {
        console.error('Error fetching organization members:', membersError);
        throw membersError;
      }

      // Transform the data
      const formattedMembers = (members || [])
        .filter((m: any) => m.farmer_profiles && m.farmer_profiles.user_id)
        .map((member: any) => ({
          id: member.farmer_profiles.user_id,
          name: member.farmer_profiles.full_name || 'Unknown',
          email: member.farmer_profiles.email || '',
          phone: member.farmer_profiles.phone || '',
          farmName: member.farmer_profiles.farm_name || 'Unknown Farm',
          type: 'member' as const
        }));

      setOrganizationMembers(formattedMembers);

      // Get organization admins
      const { data: organization, error: orgError } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          org_admins:organization_admins (
            id,
            user_id,
            users:user_id (
              id,
              first_name,
              last_name,
              email
            )
          )
        `)
        .eq('id', orgId)
        .single();

      if (orgError) {
        console.error('Error fetching organization details:', orgError);
        throw orgError;
      }

      // Format admin data
      const admins = (organization.org_admins || []).map((admin: any) => ({
        id: admin.users.id,
        name: `${admin.users.first_name} ${admin.users.last_name}`,
        email: admin.users.email || '',
        type: 'admin' as const
      }));

      setOrgAdmins(admins);
      
      console.log(`Successfully loaded ${formattedMembers.length} members and ${admins.length} admins`);
    } catch (error) {
      console.error('Error loading organization data:', error);
      toast({
        title: "Error",
        description: "Failed to load organization members",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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

  return (
    <DashboardLayout userRole="farmer">
      <div className="p-4 md:p-8 w-full max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <MessageCircle className="h-6 w-6 mr-2" />
            <h1 className="text-2xl font-bold">Messaging Center</h1>
          </div>
          {!membershipError && (
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
        ) : membershipError ? (
          <div className="bg-destructive/15 p-4 rounded-md text-center mb-4">
            <p className="text-destructive font-medium">{membershipError}</p>
            <p className="text-sm mt-2">You need to be a member of an organization to use messaging.</p>
          </div>
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

        {!membershipError && !isLoading && (
          <div className="mt-8 border rounded-lg bg-card shadow-sm overflow-hidden">
            <div className="p-4 bg-card shadow-sm border-b">
              <h2 className="font-medium">Organization Contacts</h2>
            </div>
            
            <Tabs defaultValue="members" value={activeTab} onValueChange={setActiveTab} className="p-4">
              <TabsList className="mb-4">
                <TabsTrigger value="members">Other Members</TabsTrigger>
                <TabsTrigger value="admins">Organization Admins</TabsTrigger>
              </TabsList>
              
              <TabsContent value="members">
                {organizationMembers.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No other members found in your organization
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {organizationMembers.map((member) => (
                      <div key={member.id} className="border rounded-lg p-4 flex flex-col">
                        <div className="font-semibold mb-1">{member.name}</div>
                        <div className="text-sm text-muted-foreground mb-1">{member.email}</div>
                        {member.farmName && (
                          <div className="text-xs mb-3">{member.farmName}</div>
                        )}
                        <Button 
                          onClick={() => startConversationWithContact(member.id)}
                          size="sm"
                          className="mt-auto"
                          disabled={loadingStartConversation === member.id}
                        >
                          {loadingStartConversation === member.id ? (
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
                {orgAdmins.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No admins found for your organization
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {orgAdmins.map((admin) => (
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
                {[...organizationMembers, ...orgAdmins].map(contact => (
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