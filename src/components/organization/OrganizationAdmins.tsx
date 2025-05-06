import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, X, RefreshCw } from "lucide-react";
import { adminService } from "@/services/adminService";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

interface User {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
  status?: string;
  has_organization?: boolean;
}

interface OrganizationAdminsProps {
  organizationId: string;
  organizationName: string;
}

export default function OrganizationAdmins({ organizationId, organizationName }: OrganizationAdminsProps) {
  const { toast } = useToast();
  const [admins, setAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [availableAdmins, setAvailableAdmins] = useState<User[]>([]);
  const [loadingAvailableAdmins, setLoadingAvailableAdmins] = useState(false);

  useEffect(() => {
    loadAdmins();
  }, [organizationId]);

  useEffect(() => {
    // Auto-load available admins when dialog opens
    if (isAddDialogOpen) {
      loadAvailableAdmins();
    }
  }, [isAddDialogOpen]);

  const loadAdmins = async () => {
    try {
      setLoading(true);
      const adminsData = await adminService.getOrganizationAdmins(organizationId);
      setAdmins(adminsData);
    } catch (error) {
      console.error("Error loading admins:", error);
      toast({
        title: "Error",
        description: "Failed to load organization administrators",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableAdmins = async () => {
    try {
      setLoadingAvailableAdmins(true);
      setAvailableAdmins([]);
      
      // Get all organization admins
      const adminsData = await adminService.getAllOrganizationAdmins();
      
      // Filter to only show available admins
      const available = adminsData.filter(admin => 
        !admin.has_organization && admin.status === "available"
      );
      
      setAvailableAdmins(available);
    } catch (error) {
      console.error("Error loading available admins:", error);
      toast({
        title: "Error",
        description: "Failed to load available administrators",
        variant: "destructive",
      });
    } finally {
      setLoadingAvailableAdmins(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query || query.length < 3) {
      return;
    }

    try {
      setSearchLoading(true);
      
      // Get all organization admins and filter by search term
      const allAdmins = await adminService.getAllOrganizationAdmins();
      
      // Filter by search term (case insensitive)
      const searchLower = query.toLowerCase();
      const filteredResults = allAdmins.filter(admin => {
        const fullName = admin.full_name?.toLowerCase() || '';
        const email = admin.email.toLowerCase();
        
        return fullName.includes(searchLower) || email.includes(searchLower);
      });
      
      // Filter out users who are already admins for this organization
      const filteredUsers = filteredResults.filter(
        (user) => !admins.some((admin) => admin.id === user.id)
      );

      setSearchResults(filteredUsers);
      
      if (filteredUsers.length === 0 && filteredResults.length > 0) {
        // We found users but they're all already admins
        toast({
          title: "No Available Admins",
          description: "All matching users are already administrators for this organization",
          variant: "default",
        });
      }
    } catch (error: any) {
      console.error("Error searching users:", error);
      toast({
        title: "Error",
        description: "Failed to search users: " + (error.message || "Unknown error"),
        variant: "destructive",
      });
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    searchUsers(value);
  };

  const addAdmin = async (userId: string) => {
    try {
      setProcessingUserId(userId);
      await adminService.promoteToOrganizationAdmin(userId, organizationId);
      toast({
        title: "Success",
        description: "User has been added as an administrator",
      });
      setIsAddDialogOpen(false);
      setSearchTerm("");
      setSearchResults([]);
      loadAdmins();
    } catch (error) {
      console.error("Error adding admin:", error);
      toast({
        title: "Error",
        description: "Failed to add administrator",
        variant: "destructive",
      });
    } finally {
      setProcessingUserId(null);
    }
  };

  const removeAdmin = async (userId: string) => {
    try {
      setProcessingUserId(userId);
      await adminService.removeOrganizationAdmin(userId, organizationId);
      toast({
        title: "Success",
        description: "Administrator has been removed",
      });
      loadAdmins();
    } catch (error) {
      console.error("Error removing admin:", error);
      toast({
        title: "Error",
        description: "Failed to remove administrator",
        variant: "destructive",
      });
    } finally {
      setProcessingUserId(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Organization Administrators</CardTitle>
            <CardDescription>
              Users who can manage this organization
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => setIsAddDialogOpen(true)}
            disabled={loading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Admin
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : admins.length === 0 ? (
            <div className="space-y-4">
              <div className="text-center py-4 text-muted-foreground">
                No administrators assigned to this organization
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                <h4 className="text-sm font-medium text-amber-800 mb-2">Organization Access Information</h4>
                <p className="text-sm text-amber-700">
                  This organization has no dedicated administrators. All super administrators have full access
                  to manage this organization. Members can still communicate and access shared resources.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {admins.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between p-3 border rounded-md"
                >
                  <div>
                    <p className="font-medium">{admin.full_name || "Unnamed User"}</p>
                    <p className="text-sm text-muted-foreground">{admin.email}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeAdmin(admin.id)}
                    disabled={processingUserId === admin.id}
                  >
                    {processingUserId === admin.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Organization Administrator</DialogTitle>
            <DialogDescription>
              Search and select users to add as administrators for {organizationName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Available Admins Section */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Available Administrators</Label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={loadAvailableAdmins}
                  disabled={loadingAvailableAdmins}
                >
                  <RefreshCw className={`h-4 w-4 ${loadingAvailableAdmins ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              
              {loadingAvailableAdmins ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : availableAdmins.length === 0 ? (
                <div className="text-center py-2 text-muted-foreground border rounded-md p-4">
                  No available administrators found
                </div>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-md p-2">
                  {availableAdmins.map((admin) => (
                    <div
                      key={admin.id}
                      className="flex items-center justify-between p-2 border rounded-md"
                    >
                      <div>
                        <p className="font-medium">{admin.full_name || "Unnamed User"}</p>
                        <p className="text-sm text-muted-foreground">{admin.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-green-50">
                          Available
                        </Badge>
                        <Button
                          size="sm"
                          onClick={() => addAdmin(admin.id)}
                          disabled={processingUserId === admin.id}
                        >
                          {processingUserId === admin.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Search Section */}
            <div className="space-y-2 mt-4">
              <Label htmlFor="search">Search All Users</Label>
              <Input
                id="search"
                placeholder="Search by email or name (min 3 characters)"
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>
            {searchLoading && (
              <div className="flex justify-center py-2">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!searchLoading && searchResults.length === 0 && searchTerm.length >= 3 && (
              <div className="text-center py-2 text-muted-foreground">
                No users found
              </div>
            )}
            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 border rounded-md"
                  >
                    <div>
                      <p className="font-medium">{user.full_name || "Unnamed User"}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={user.has_organization ? "bg-yellow-50" : "bg-green-50"}>
                        {user.has_organization ? "Occupied" : "Available"}
                      </Badge>
                      <Button
                        size="sm"
                        onClick={() => addAdmin(user.id)}
                        disabled={processingUserId === user.id}
                      >
                        {processingUserId === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 