import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Loader2, Trash2, Plus, Pin, FileEdit, PinOff } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Announcement, createAnnouncement, deleteAnnouncement, getOrganizationAnnouncements, toggleAnnouncementPinned, updateAnnouncement } from "@/services/announcementService";
import { adminService } from "@/services/adminService";
import { organizationService } from "@/services/organizationService";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

export default function OrganizationAnnouncementsDirectFix() {
  const [searchParams] = useSearchParams();
  const organizationId = searchParams.get("org");
  const { toast } = useToast();
  
  const [organization, setOrganization] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [adminOrganizations, setAdminOrganizations] = useState<any[]>([]);
  const [debugInfo, setDebugInfo] = useState<string>("");
  
  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);
  const [hasExpiry, setHasExpiry] = useState(false);
  const [currentAnnouncementId, setCurrentAnnouncementId] = useState<string | null>(null);

  useEffect(() => {
    // Load admin's organizations if no org ID is provided in URL
    if (!organizationId) {
      loadAdminOrganizations();
    } else {
      loadOrganizationData();
      loadAnnouncements();
    }
  }, [organizationId]);

  const loadAdminOrganizations = async () => {
    try {
      setLoading(true);
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
      
      const user = JSON.parse(userStr);
      console.log("Current user:", user);
      
      const orgs = await adminService.getUserAdminOrganizations(user.id);
      console.log("Admin organizations:", orgs);
      
      setAdminOrganizations(orgs);
      
      // If there's only one organization, automatically select it
      if (orgs.length === 1) {
        // Use the history API to update the URL without causing a navigation
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set("org", orgs[0].id);
        window.history.replaceState({}, "", newUrl.toString());
        
        // Set organization and load its data
        setOrganization(orgs[0]);
        loadOrganizationData(orgs[0].id);
        loadAnnouncements(orgs[0].id);
      }
    } catch (error) {
      console.error("Error loading admin organizations:", error);
      setDebugInfo(`Error loading admin organizations: ${error instanceof Error ? error.message : String(error)}`);
      toast({
        title: "Error",
        description: "Failed to load your organizations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizationData = async (orgId = organizationId) => {
    if (!orgId) return;
    
    try {
      const org = await organizationService.getOrganization(orgId);
      setOrganization(org);
    } catch (error) {
      console.error("Error loading organization:", error);
      setDebugInfo(`Error loading organization: ${error instanceof Error ? error.message : String(error)}`);
      toast({
        title: "Error",
        description: "Failed to load organization data",
        variant: "destructive",
      });
    }
  };

  const loadAnnouncements = async (orgId = organizationId) => {
    if (!orgId) return;
    
    try {
      setLoading(true);
      console.log("Loading announcements for org:", orgId);
      const data = await getOrganizationAnnouncements(orgId, true);
      console.log("Loaded announcements:", data);
      setAnnouncements(data);
    } catch (error) {
      console.error("Error loading announcements:", error);
      setDebugInfo(`Error loading announcements: ${error instanceof Error ? error.message : String(error)}`);
      toast({
        title: "Error",
        description: "Failed to load announcements",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Direct API version - bypassing the service layer for testing
  const directCreateAnnouncement = async () => {
    if (!organizationId) {
      console.error("No organization ID");
      setDebugInfo("No organization ID provided");
      return;
    }
    
    try {
      setProcessing(true);
      setDebugInfo("Starting direct announcement creation");
      
      if (!title.trim() || !content.trim()) {
        setDebugInfo("Title or content is empty");
        toast({
          title: "Missing Content",
          description: "Please provide both title and content",
          variant: "destructive",
        });
        return;
      }

      // Get the current user's ID from local storage
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        setDebugInfo("User information not found");
        toast({
          title: "Error",
          description: "User information not found",
          variant: "destructive",
        });
        return;
      }
      
      const user = JSON.parse(userStr);
      console.log("Current user for announcement:", user);
      setDebugInfo(`Creating announcement as user: ${user.id}`);
      
      const expiresAt = hasExpiry && expiryDate ? expiryDate.toISOString() : null;
      
      // Try direct DB insertion
      const { data, error } = await supabase
        .from('organization_announcements')
        .insert({
          id: crypto.randomUUID(),
          organization_id: organizationId,
          title: title,
          content: content,
          created_by: user.id,
          is_pinned: isPinned,
          expires_at: expiresAt,
          status: 'active',
          created_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (error) {
        console.error("Direct insertion error:", error);
        setDebugInfo(`Direct insertion error: ${error.message}`);
        throw error;
      }
      
      console.log("Announcement created successfully:", data);
      setDebugInfo("Announcement created successfully via direct insertion");
      
      toast({
        title: "Announcement Created",
        description: "The announcement has been published successfully"
      });
      
      // Reset form and close dialog
      resetForm();
      setFormOpen(false);
      
      // Reload announcements
      loadAnnouncements();
    } catch (error) {
      console.error("Error in direct announcement creation:", error);
      setDebugInfo(`Error in direct announcement creation: ${error instanceof Error ? error.message : String(error)}`);
      toast({
        title: "Error",
        description: `Failed to save the announcement: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!organizationId) return;
    
    try {
      setProcessing(true);
      setDebugInfo("Starting announcement creation");
      
      if (!title.trim()) {
        setDebugInfo("Title is empty");
        toast({
          title: "Missing Title",
          description: "Please provide a title for the announcement",
          variant: "destructive",
        });
        return;
      }
      
      if (!content.trim()) {
        setDebugInfo("Content is empty");
        toast({
          title: "Missing Content",
          description: "Please provide content for the announcement",
          variant: "destructive",
        });
        return;
      }

      // Get the current user's ID from local storage
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        setDebugInfo("User information not found");
        toast({
          title: "Error",
          description: "User information not found",
          variant: "destructive",
        });
        return;
      }
      
      const user = JSON.parse(userStr);
      console.log("Current user for announcement:", user);
      setDebugInfo(`Creating announcement as user: ${user.id}`);
      
      const expiresAt = hasExpiry && expiryDate ? expiryDate.toISOString() : null;
      
      if (editMode && currentAnnouncementId) {
        // Update existing announcement
        setDebugInfo("Updating existing announcement");
        await updateAnnouncement(currentAnnouncementId, {
          title,
          content,
          is_pinned: isPinned,
          expires_at: expiresAt
        });
        
        setDebugInfo("Announcement updated successfully");
        toast({
          title: "Announcement Updated",
          description: "The announcement has been updated successfully"
        });
      } else {
        // Create new announcement
        setDebugInfo("Creating new announcement");
        await createAnnouncement(
          organizationId,
          user.id,
          title,
          content,
          isPinned,
          expiresAt
        );
        
        setDebugInfo("Announcement created successfully");
        toast({
          title: "Announcement Created",
          description: "The announcement has been published successfully"
        });
      }
      
      // Reset form and close dialog
      resetForm();
      setFormOpen(false);
      
      // Reload announcements
      loadAnnouncements();
    } catch (error) {
      console.error("Error creating/updating announcement:", error);
      setDebugInfo(`Error creating/updating announcement: ${error instanceof Error ? error.message : String(error)}`);
      toast({
        title: "Error",
        description: `Failed to save the announcement: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      setProcessing(true);
      await deleteAnnouncement(id);
      
      toast({
        title: "Announcement Deleted",
        description: "The announcement has been deleted successfully"
      });
      
      // Reload announcements
      loadAnnouncements();
      
      // Close confirmation dialog
      setConfirmDeleteId(null);
    } catch (error) {
      console.error("Error deleting announcement:", error);
      toast({
        title: "Error",
        description: "Failed to delete the announcement",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleTogglePin = async (announcement: Announcement) => {
    try {
      setProcessing(true);
      await toggleAnnouncementPinned(announcement.id, !announcement.is_pinned);
      
      toast({
        title: announcement.is_pinned ? "Announcement Unpinned" : "Announcement Pinned",
        description: announcement.is_pinned
          ? "The announcement has been unpinned successfully"
          : "The announcement has been pinned successfully"
      });
      
      // Reload announcements
      loadAnnouncements();
    } catch (error) {
      console.error("Error toggling pin status:", error);
      toast({
        title: "Error",
        description: "Failed to update the announcement",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const editAnnouncement = (announcement: Announcement) => {
    setTitle(announcement.title);
    setContent(announcement.content);
    setIsPinned(announcement.is_pinned);
    
    if (announcement.expires_at) {
      setExpiryDate(new Date(announcement.expires_at));
      setHasExpiry(true);
    } else {
      setExpiryDate(undefined);
      setHasExpiry(false);
    }
    
    setCurrentAnnouncementId(announcement.id);
    setEditMode(true);
    setFormOpen(true);
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setIsPinned(false);
    setExpiryDate(undefined);
    setHasExpiry(false);
    setCurrentAnnouncementId(null);
    setEditMode(false);
    setDebugInfo("");
  };

  // Function to check if an announcement is expired
  const isExpired = (announcement: Announcement) => {
    if (!announcement.expires_at) return false;
    return new Date(announcement.expires_at) < new Date();
  };

  // If no organization is selected and we have multiple admin organizations, show org selection
  if (!organizationId && adminOrganizations.length > 1) {
    return (
      <DashboardLayout userRole="organization">
        <div className="p-6 space-y-6">
          <h1 className="text-3xl font-bold">Select an Organization</h1>
          <Card>
            <CardHeader>
              <CardTitle>Your Organizations</CardTitle>
              <CardDescription>
                Select an organization to manage announcements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {adminOrganizations.map(org => (
                  <Card 
                    key={org.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      const newUrl = new URL(window.location.href);
                      newUrl.searchParams.set("org", org.id);
                      window.location.href = newUrl.toString();
                    }}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{org.name}</CardTitle>
                      {org.region_name && (
                        <CardDescription>{org.region_name}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Click to manage announcements
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }
  
  // If no organization ID and no admin organizations
  if (!organizationId && adminOrganizations.length === 0 && !loading) {
    return (
      <DashboardLayout userRole="organization">
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>No Organizations</CardTitle>
              <CardDescription>
                You are not an administrator for any organizations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Please contact a system administrator to be assigned as an administrator to an organization.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="organization">
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">
            Announcements
            {organization && ` - ${organization.name}`}
          </h1>
          <Button onClick={() => {
            resetForm();
            setFormOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            New Announcement
          </Button>
        </div>

        {debugInfo && (
          <Alert>
            <AlertTitle>Debug Information</AlertTitle>
            <AlertDescription>
              <pre className="text-xs overflow-auto p-2">{debugInfo}</pre>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Organization Announcements</CardTitle>
            <CardDescription>
              Create and manage announcements for organization members
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No announcements have been created for this organization
              </div>
            ) : (
              <Tabs defaultValue="active" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="active">Active Announcements</TabsTrigger>
                  <TabsTrigger value="all">All Announcements</TabsTrigger>
                </TabsList>
                
                <TabsContent value="active" className="mt-4">
                  <div className="space-y-4">
                    {announcements
                      .filter(a => !isExpired(a))
                      .map(announcement => (
                        <AnnouncementCard
                          key={announcement.id}
                          announcement={announcement}
                          onDelete={() => setConfirmDeleteId(announcement.id)}
                          onEdit={() => editAnnouncement(announcement)}
                          onTogglePin={() => handleTogglePin(announcement)}
                        />
                      ))}
                    
                    {announcements.filter(a => !isExpired(a)).length === 0 && (
                      <div className="text-center py-4 text-muted-foreground">
                        No active announcements
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="all" className="mt-4">
                  <div className="space-y-4">
                    {announcements.map(announcement => (
                      <AnnouncementCard
                        key={announcement.id}
                        announcement={announcement}
                        onDelete={() => setConfirmDeleteId(announcement.id)}
                        onEdit={() => editAnnouncement(announcement)}
                        onTogglePin={() => handleTogglePin(announcement)}
                      />
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Announcement Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editMode ? "Edit Announcement" : "Create New Announcement"}</DialogTitle>
            <DialogDescription>
              {editMode 
                ? "Update the announcement details below" 
                : "This announcement will be visible to all organization members"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Announcement Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                placeholder="Announcement content..."
                className="min-h-[150px]"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPinned"
                checked={isPinned}
                onCheckedChange={(checked) => setIsPinned(!!checked)}
              />
              <Label htmlFor="isPinned" className="cursor-pointer">
                Pin this announcement (will appear at the top)
              </Label>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="hasExpiry"
                  checked={hasExpiry}
                  onCheckedChange={setHasExpiry}
                />
                <Label htmlFor="hasExpiry" className="cursor-pointer">
                  Set expiration date
                </Label>
              </div>
              
              {hasExpiry && (
                <div className="flex items-center space-x-2 mt-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-[240px] justify-start text-left"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {expiryDate ? format(expiryDate, "PPP") : "Select expiry date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={expiryDate}
                        onSelect={setExpiryDate}
                        initialFocus
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              resetForm();
              setFormOpen(false);
            }} disabled={processing}>
              Cancel
            </Button>
            
            <div className="space-x-2">
              <Button 
                onClick={() => directCreateAnnouncement()} 
                disabled={processing}
                variant="secondary"
              >
                {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Direct Publish
              </Button>
              
              <Button onClick={() => handleCreateAnnouncement()} disabled={processing}>
                {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editMode ? "Save Changes" : "Publish Announcement"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this announcement? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)} disabled={processing}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => confirmDeleteId && handleDeleteAnnouncement(confirmDeleteId)}
              disabled={processing}
            >
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

// Announcement Card Component
interface AnnouncementCardProps {
  announcement: Announcement;
  onDelete: () => void;
  onEdit: () => void;
  onTogglePin: () => void;
}

function AnnouncementCard({ announcement, onDelete, onEdit, onTogglePin }: AnnouncementCardProps) {
  const isExpired = announcement.expires_at && new Date(announcement.expires_at) < new Date();
  
  return (
    <Card className={`${announcement.is_pinned ? 'border-primary/50 bg-primary/5' : ''} 
                     ${isExpired ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-2 flex flex-row justify-between items-start space-y-0">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{announcement.title}</CardTitle>
            {announcement.is_pinned && (
              <Badge variant="outline" className="bg-primary/10 text-primary">
                Pinned
              </Badge>
            )}
            {isExpired && (
              <Badge variant="outline" className="bg-destructive/10 text-destructive">
                Expired
              </Badge>
            )}
          </div>
          <CardDescription className="flex items-center gap-1 mt-1">
            <span>
              Posted by {announcement.creator_name || 'Admin'} on {new Date(announcement.created_at).toLocaleDateString()}
            </span>
            
            {announcement.expires_at && !isExpired && (
              <span className="ml-2">
                · Expires on {new Date(announcement.expires_at).toLocaleDateString()}
              </span>
            )}
          </CardDescription>
        </div>
        
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="icon" onClick={onTogglePin} title={announcement.is_pinned ? "Unpin" : "Pin"}>
            {announcement.is_pinned ? 
              <PinOff className="h-4 w-4 text-muted-foreground" /> : 
              <Pin className="h-4 w-4 text-muted-foreground" />
            }
          </Button>
          <Button variant="ghost" size="icon" onClick={onEdit} title="Edit">
            <FileEdit className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} title="Delete">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm whitespace-pre-line">
          {announcement.content}
        </div>
      </CardContent>
    </Card>
  );
} 