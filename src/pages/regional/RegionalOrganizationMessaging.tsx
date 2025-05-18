import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { ConversationList } from '@/components/messaging/ConversationList';
import { Conversation } from '@/components/messaging/Conversation';
import { useMessaging } from '@/hooks/useMessaging';
import { MessageCircle, UserPlus, Loader2, Users, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

// Define interfaces
interface OrganizationData {
  id: string;
  name: string;
  status: string;
  region_id: string;
  created_at: string;
}

interface ContactOrganization {
  id: string;
  name: string;
  status: string;
  type: 'organization';
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

export default function RegionalOrganizationMessaging() {
  const [searchParams] = useSearchParams();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const { conversations, isLoadingConversations, createGroupConversationMutation } = useMessaging();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuth();
  const [regionId, setRegionId] = useState<string | null>(null);
  const [regionName, setRegionName] = useState<string>('');
  const [organizations, setOrganizations] = useState<ContactOrganization[]>([]);
  const [organizationAdmins, setOrganizationAdmins] = useState<Map<string, any[]>>(new Map());
  const [selectedOrganization, setSelectedOrganization] = useState<ContactOrganization | null>(null);
  const [loadingStartConversation, setLoadingStartConversation] = useState<string | null>(null);
  const [loadingRegion, setLoadingRegion] = useState(true);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('organizations');

  useEffect(() => {
    if (user?.id) {
      loadUserRegion();
    }
  }, [user]);

  // Load the regional admin's assigned region
  const loadUserRegion = async () => {
    try {
      setLoadingRegion(true);
      
      // Get the user's assigned region
      const { data: userRegion, error: regionError } = await supabase
        .from('user_regions')
        .select('region_id')
        .eq('user_id', user!.id)
        .single();
        
      if (regionError) {
        console.error('Error fetching user region:', regionError);
        toast({
          title: "Error",
          description: "Failed to load your region information.",
          variant: "destructive",
        });
        return;
      }
      
      if (!userRegion?.region_id) {
        toast({
          title: "No Region Assigned",
          description: "You don't have any assigned region.",
          variant: "destructive",
        });
        return;
      }

      // Get region details in a separate query
      const { data: regionData, error: regionDetailsError } = await supabase
        .from('regions')
        .select('id, name')
        .eq('id', userRegion.region_id)
        .single();
        
      if (regionDetailsError) {
        console.error('Error fetching region details:', regionDetailsError);
        toast({
          title: "Error",
          description: "Failed to load region details.",
          variant: "destructive",
        });
      }
      
      // Set region information
      setRegionId(userRegion.region_id);
      setRegionName(regionData?.name || 'Your Region');
      
      // Load organizations in this region
      await loadRegionOrganizations(userRegion.region_id);
      
    } catch (error) {
      console.error('Error loading user region:', error);
      toast({
        title: "Error",
        description: "Failed to load region data.",
        variant: "destructive",
      });
    } finally {
      setLoadingRegion(false);
    }
  };

  // Load organizations in the region
  const loadRegionOrganizations = async (regionId: string) => {
    try {
      // Get organizations in this region
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name, status, region_id, created_at')
        .eq('region_id', regionId)
        .eq('status', 'active');
        
      if (orgsError) {
        console.error('Error fetching organizations:', orgsError);
        throw orgsError;
      }
      
      // Format organization data
      const formattedOrgs = (orgs || []).map(org => ({
        id: org.id,
        name: org.name,
        status: org.status,
        type: 'organization' as const
      }));
      
      setOrganizations(formattedOrgs);
      
      // For each organization, load its admins
      await Promise.all(formattedOrgs.map(org => loadOrganizationAdmins(org.id)));
      
    } catch (error) {
      console.error('Error loading region organizations:', error);
      toast({
        title: "Error",
        description: "Failed to load organizations in your region.",
        variant: "destructive",
      });
    }
  };

  // Load admins for a specific organization
  const loadOrganizationAdmins = async (organizationId: string) => {
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
        .eq('organization_id', organizationId);
        
      if (adminsError) {
        console.error('Error fetching organization admins:', adminsError);
        throw adminsError;
      }
      
      // Store admins in the map
      setOrganizationAdmins(prev => {
        const newMap = new Map(prev);
        newMap.set(organizationId, admins || []);
        return newMap;
      });
      
    } catch (error) {
      console.error(`Error loading admins for organization ${organizationId}:`, error);
    }
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
  };

  const startNewConversation = () => {
    setIsModalOpen(true);
  };

  const startConversationWithOrganization = async (organization: ContactOrganization) => {
    setSelectedOrganization(organization);
    
    // Get organization admins
    const admins = organizationAdmins.get(organization.id) || [];
    
    if (admins.length === 0) {
      toast({
        title: "No Admins Found",
        description: "This organization doesn't have any administrators to message.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setLoadingStartConversation(organization.id);
      
      // Create a group conversation with all admins of this organization
      const participantIds = admins.map(admin => admin.user_id);
      
      // Create group conversation with the organization name
      const conversationId = await createGroupConversation(
        `${organization.name} Communication`,
        participantIds,
        organization.id
      );
      
      if (conversationId) {
        setActiveConversationId(conversationId);
      }
      
    } catch (error) {
      console.error('Error starting conversation with organization:', error);
      toast({
        title: "Error",
        description: "Failed to start conversation with organization.",
        variant: "destructive",
      });
    } finally {
      setLoadingStartConversation(null);
    }
  };

  // Create a group conversation
  const createGroupConversation = async (
    title: string,
    participantIds: string[],
    organizationId: string
  ) => {
    if (!user) return null;
    
    try {
      // Check if a conversation with this organization already exists
      const existingConversation = conversations?.find(conv => 
        conv.title === title && conv.type === 'group'
      );
      
      if (existingConversation) {
        return existingConversation.id;
      }
      
      // Create new conversation
      const conversationId = await createGroupConversationMutation.mutateAsync({
        title,
        participantIds: [...participantIds, user.id],
        organizationId
      });
      
      return conversationId;
    } catch (error) {
      console.error('Error creating group conversation:', error);
      throw error;
    }
  };

  if (loadingRegion) {
    return (
      <DashboardLayout userRole="regional">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading region data...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="regional">
      <div className="container mx-auto py-6">
        <div className="flex items-center mb-6">
          <Building className="mr-2 h-6 w-6" />
          <h1 className="text-2xl font-bold">Organization Communications</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Organizations list */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Organizations</CardTitle>
                <CardDescription>
                  Organizations in {regionName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[70vh]">
                  <div className="space-y-2">
                    {organizations.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No organizations found in your region</p>
                      </div>
                    ) : (
                      organizations.map(org => (
                        <div
                          key={org.id}
                          className={`flex items-center justify-between p-3 rounded-md cursor-pointer hover:bg-muted ${
                            selectedOrganization?.id === org.id ? 'bg-muted' : ''
                          }`}
                          onClick={() => startConversationWithOrganization(org)}
                        >
                          <div className="flex items-center">
                            <Building className="h-4 w-4 mr-2" />
                            <span>{org.name}</span>
                          </div>
                          <Badge variant="outline">
                            {organizationAdmins.get(org.id)?.length || 0} admin{organizationAdmins.get(org.id)?.length !== 1 ? 's' : ''}
                          </Badge>
                          {loadingStartConversation === org.id && (
                            <Loader2 className="h-4 w-4 animate-spin ml-2" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Messaging area */}
          <div className="md:col-span-3">
            <Card className="h-[80vh]">
              {activeConversationId ? (
                <Conversation conversationId={activeConversationId} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                  <MessageCircle className="h-12 w-12 mb-4 text-muted-foreground" />
                  <h2 className="text-xl font-semibold mb-2">No conversation selected</h2>
                  <p className="text-muted-foreground max-w-md">
                    Select an organization from the list to start messaging its administrators
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 