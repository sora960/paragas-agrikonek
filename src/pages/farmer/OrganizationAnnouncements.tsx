import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Announcement, getOrganizationAnnouncements } from "@/services/announcementService";
import { organizationService } from "@/services/organizationService";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export default function FarmerOrganizationAnnouncements() {
  const [searchParams] = useSearchParams();
  const organizationId = searchParams.get("org");
  const { toast } = useToast();
  
  const [organization, setOrganization] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<string | null>(null);

  useEffect(() => {
    const checkMembershipAndLoad = async () => {
      try {
        setLoading(true);
        setError(null);
        setDebug(null);
        
        // Get the current user's ID from local storage
        const userStr = localStorage.getItem('user');
        if (!userStr) {
          const msg = "User information not found";
          setError(msg);
          toast({
            title: "Error",
            description: msg,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        
        const user = JSON.parse(userStr);
        setDebug(`User ID: ${user.id}`);
        
        // Try to get organization ID either from URL or from database
        let orgId = organizationId;
        
        // If no org ID in URL, try direct query for membership
        if (!orgId) {
          try {
            // Use the RPC function to get member's organization ID
            const { data: memberOrgId, error: memberOrgError } = await supabase
              .rpc('get_member_organization_id', { user_id: user.id });
              
            if (memberOrgError) {
              console.error("Error getting member organization ID:", memberOrgError);
              setDebug(`Membership query error: ${memberOrgError.message}`);
              setError(`Error checking membership: ${memberOrgError.message}`);
              setIsMember(false);
              setLoading(false);
              return;
            }
            
            setDebug(`Found organization ID: ${memberOrgId || 'none'}`);
            
            if (memberOrgId) {
              // Use the organization ID found
              orgId = memberOrgId;
              
              // Update URL to include org ID
              const newUrl = new URL(window.location.href);
              newUrl.searchParams.set("org", orgId);
              window.history.replaceState({}, "", newUrl.toString());
              
              // Set flag since we already know user is a member
              setIsMember(true);
            } else {
              setDebug("No memberships found for user");
              setIsMember(false);
              setLoading(false);
              return;
            }
          } catch (err) {
            console.error("Error checking membership:", err);
            setDebug(`Membership check error: ${err instanceof Error ? err.message : String(err)}`);
            setError(`Error checking membership: ${err instanceof Error ? err.message : String(err)}`);
            setIsMember(false);
            setLoading(false);
            return;
          }
        } else {
          // We have an organization ID from URL, check membership using RPC
          const { data: isMemberResult, error: memberCheckError } = await supabase
            .rpc('is_organization_member', { 
              user_id: user.id,
              org_id: orgId
            });
            
          if (memberCheckError) {
            console.error("Error checking membership:", memberCheckError);
            setDebug(`Membership check error: ${memberCheckError.message}`);
            setError(`Error checking membership: ${memberCheckError.message}`);
            setIsMember(false);
            setLoading(false);
            return;
          }
          
          setIsMember(isMemberResult === true);
          setDebug(`Membership check result: ${isMemberResult === true ? 'Member' : 'Not member'}`);
          
          if (!isMemberResult) {
            setLoading(false);
            return;
          }
        }
        
        // If we have an organization ID and user is a member, load data
        if (orgId && isMember) {
          // Load organization data if not already loaded
          if (!organization) {
            try {
              const orgData = await organizationService.getOrganization(orgId);
              setOrganization(orgData);
              setDebug(`Organization loaded: ${orgData.name}`);
            } catch (orgErr) {
              console.error("Error loading organization:", orgErr);
              setDebug(`Error loading organization: ${orgErr instanceof Error ? orgErr.message : String(orgErr)}`);
              // Don't set error here, just log it
            }
          }
          
          // Load announcements using the service function
          try {
            const announcements = await getOrganizationAnnouncements(orgId);
            setAnnouncements(announcements);
            setDebug(`Loaded ${announcements.length} announcements`);
          } catch (annErr) {
            console.error("Error loading announcements:", annErr);
            setDebug(`Error loading announcements: ${annErr instanceof Error ? annErr.message : String(annErr)}`);
            setError(`Error loading announcements: ${annErr instanceof Error ? annErr.message : String(annErr)}`);
          }
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setDebug(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
        setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    };
    
    checkMembershipAndLoad();
  }, [organizationId, toast]);

  // Function to check if an announcement is expired
  const isExpired = (announcement: Announcement) => {
    if (!announcement.expires_at) return false;
    return new Date(announcement.expires_at) < new Date();
  };

  // Filter announcements
  const activeAnnouncements = announcements.filter(a => !isExpired(a));
  const pinnedAnnouncements = activeAnnouncements.filter(a => a.is_pinned);
  const regularAnnouncements = activeAnnouncements.filter(a => !a.is_pinned);

  const reloadData = () => {
    setLoading(true);
    setError(null);
    // Reload the current page to refresh all data
    window.location.reload();
  };

  // If user is not a member of any organization
  if (!loading && !isMember) {
    return (
      <DashboardLayout userRole="farmer">
        <div className="p-6 space-y-6">
          <h1 className="text-3xl font-bold">Organization Announcements</h1>
          <Alert className="bg-muted">
            <AlertTitle>You are not a member of any organization</AlertTitle>
            <AlertDescription>
              Join an organization to see announcements. You can apply to join organizations from the Apply page.
            </AlertDescription>
          </Alert>
          
          {debug && (
            <Alert className="bg-muted/50 border-yellow-500">
              <AlertTitle>Debug Information</AlertTitle>
              <AlertDescription className="whitespace-pre-wrap">{debug}</AlertDescription>
            </Alert>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="farmer">
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">
            Organization Announcements
            {organization && ` - ${organization.name}`}
          </h1>
          <Button variant="outline" onClick={reloadData} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Refresh
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {debug && (
          <Alert className="bg-muted/50 border-yellow-500">
            <AlertTitle>Debug Information</AlertTitle>
            <AlertDescription className="whitespace-pre-wrap">{debug}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Announcements</CardTitle>
            <CardDescription>
              View important announcements from your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No announcements available from your organization
              </div>
            ) : (
              <div className="space-y-6">
                {/* Pinned announcements section */}
                {pinnedAnnouncements.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Badge variant="default">Pinned</Badge>
                      Important Announcements
                    </h3>
                    {pinnedAnnouncements.map(announcement => (
                      <AnnouncementCard
                        key={announcement.id}
                        announcement={announcement}
                      />
                    ))}
                  </div>
                )}
                
                {/* Regular announcements section */}
                {regularAnnouncements.length > 0 && (
                  <div className="space-y-4">
                    {pinnedAnnouncements.length > 0 && (
                      <h3 className="text-lg font-semibold">Other Announcements</h3>
                    )}
                    {regularAnnouncements.map(announcement => (
                      <AnnouncementCard
                        key={announcement.id}
                        announcement={announcement}
                      />
                    ))}
                  </div>
                )}
                
                {activeAnnouncements.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    No active announcements from your organization
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

// Announcement Card Component for member view
interface AnnouncementCardProps {
  announcement: Announcement;
}

function AnnouncementCard({ announcement }: AnnouncementCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{announcement.title}</CardTitle>
          {announcement.is_pinned && (
            <Badge variant="outline" className="bg-primary/10 text-primary">
              Pinned
            </Badge>
          )}
        </div>
        <CardDescription>
          Posted by {announcement.creator_name || 'Admin'} on {new Date(announcement.created_at).toLocaleDateString()}
          {announcement.expires_at && (
            <span className="ml-2">
              · Expires on {new Date(announcement.expires_at).toLocaleDateString()}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm whitespace-pre-line">
          {announcement.content}
        </div>
      </CardContent>
    </Card>
  );
} 