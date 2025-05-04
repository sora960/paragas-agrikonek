import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, X } from "lucide-react";
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
import { supabase } from "@/lib/supabase";

interface User {
  id: string;
  email: string;
  full_name?: string;
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

  useEffect(() => {
    loadAdmins();
  }, [organizationId]);

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

  const searchUsers = async (query: string) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);
      const { data, error } = await supabase
        .from("users")
        .select("id, email, raw_user_meta_data")
        .or(`email.ilike.%${query}%, raw_user_meta_data->>'full_name'.ilike.%${query}%`)
        .limit(5);

      if (error) throw error;

      // Transform data to match User interface
      const users = data.map((user) => ({
        id: user.id,
        email: user.email,
        full_name: user.raw_user_meta_data?.full_name || "",
      }));

      // Filter out users who are already admins
      const filteredUsers = users.filter(
        (user) => !admins.some((admin) => admin.id === user.id)
      );

      setSearchResults(filteredUsers);
    } catch (error) {
      console.error("Error searching users:", error);
      toast({
        title: "Error",
        description: "Failed to search users",
        variant: "destructive",
      });
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
            <div className="text-center py-6 text-muted-foreground">
              No administrators assigned to this organization
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
            <div className="space-y-2">
              <Label htmlFor="search">Search Users</Label>
              <Input
                id="search"
                placeholder="Search by email or name"
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