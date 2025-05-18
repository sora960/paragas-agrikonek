import { useState, useEffect } from "react";
import { adminService } from "@/services/adminService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Pencil, Trash2, MoreVertical, UserPlus, RefreshCw, Info, Loader2, AlertTriangle, Wrench } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { checkOrganizationAdminsRLS, fixOrganizationAdminsPermissions } from "@/utils/fixUserRegionsPermissions";

interface Admin {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  organizations: Array<{id: string, name: string}>;
  has_organization: boolean;
}

export default function OrganizationAdminsTable() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [adminDetails, setAdminDetails] = useState<Admin | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [rlsStatus, setRlsStatus] = useState<{ enabled: boolean, message: string } | null>(null);
  const [fixingPermissions, setFixingPermissions] = useState(false);

  useEffect(() => {
    fetchAdmins();
    checkRLSPermissions();
  }, []);

  const checkRLSPermissions = async () => {
    const status = await checkOrganizationAdminsRLS();
    setRlsStatus(status);
  };

  const handleFixPermissions = async () => {
    setFixingPermissions(true);
    try {
      const success = await fixOrganizationAdminsPermissions();
      if (success) {
        toast.success("Organization admins permissions fixed successfully");
        // Re-check the status
        checkRLSPermissions();
        // Refresh the admins list
        fetchAdmins();
      } else {
        toast.error("Failed to fix permissions. Try running the SQL script manually.");
      }
    } catch (error) {
      console.error("Error fixing permissions:", error);
      toast.error("An error occurred while fixing permissions.");
    } finally {
      setFixingPermissions(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const data = await adminService.getAllOrganizationAdmins("");
      console.log("Fetched organization admins:", data);
      setAdmins(data as Admin[]);
    } catch (error) {
      console.error("Error fetching admins:", error);
      toast.error("Failed to load organization admins");
    } finally {
      setLoading(false);
    }
  };

  const viewAdminDetails = (admin: Admin) => {
    setAdminDetails(admin);
    setIsDetailsDialogOpen(true);
  };

  const filteredAdmins = admins.filter((admin) => {
    return searchTerm === "" ||
      admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.full_name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "occupied":
        return "default";
      case "available":
        return "success";
      case "inactive":
        return "secondary";
      case "pending":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <Card>
      {rlsStatus?.enabled && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 flex items-center justify-between m-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
            <div>
              <h3 className="font-medium text-amber-800">Permissions Issue Detected</h3>
              <p className="text-amber-700 text-sm">{rlsStatus.message}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleFixPermissions}
            disabled={fixingPermissions}
            className="bg-amber-100 border-amber-300 hover:bg-amber-200"
          >
            {fixingPermissions ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Fixing...
              </>
            ) : (
              <>
                <Wrench className="h-4 w-4 mr-2" />
                Fix Permissions
              </>
            )}
          </Button>
        </div>
      )}
      
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Organization Administrators</CardTitle>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchAdmins}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                // First, get organization IDs to check if there are organizations
                const { data: organizations, error: orgError } = await supabase
                  .from('organizations')
                  .select('id, name')
                  .limit(1);
                
                if (orgError) throw orgError;
                
                if (!organizations || organizations.length === 0) {
                  toast.error("No organizations found. Create an organization first.");
                  return;
                }
                
                const testAdmin = {
                  email: "testadmin@example.com",
                  password: "password123",
                  first_name: "Test",
                  last_name: "Admin"
                };
                
                const newAdmin = await adminService.createAdminUser(testAdmin);
                
                if (newAdmin && newAdmin.id) {
                  const organizationId = organizations[0].id;
                  await adminService.promoteToOrganizationAdmin(newAdmin.id, organizationId);
                  toast.success(`Created and assigned test admin to ${organizations[0].name}`);
                  fetchAdmins();
                }
              } catch (error) {
                console.error("Error creating test admin:", error);
                toast.error("Failed to create test admin");
              }
            }}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Create Test Admin
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input
            placeholder="Search administrators..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Organizations</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex justify-center items-center">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      Loading administrators...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredAdmins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    No administrators found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAdmins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">
                      {admin.full_name || "Unnamed User"}
                    </TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(admin.status)}>
                        {admin.status.charAt(0).toUpperCase() + admin.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {admin.organizations && admin.organizations.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {admin.organizations.slice(0, 2).map(org => (
                            <Badge key={org.id} variant="outline" className="mr-1">
                              {org.name}
                            </Badge>
                          ))}
                          {admin.organizations.length > 2 && (
                            <Badge variant="outline">+{admin.organizations.length - 2} more</Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">None assigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => viewAdminDetails(admin)}
                      >
                        <Info className="h-4 w-4" />
                        <span className="sr-only">View details</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Admin Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Administrator Details</DialogTitle>
          </DialogHeader>
          {adminDetails && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">Name</Label>
                <p className="font-medium">{adminDetails.full_name || "Unnamed User"}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Email</Label>
                <p className="font-medium">{adminDetails.email}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Status</Label>
                <div>
                  <Badge variant={getStatusBadgeVariant(adminDetails.status)}>
                    {adminDetails.status.charAt(0).toUpperCase() + adminDetails.status.slice(1)}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Organizations</Label>
                {adminDetails.organizations && adminDetails.organizations.length > 0 ? (
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    {adminDetails.organizations.map(org => (
                      <li key={org.id} className="text-sm">
                        {org.name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Not assigned to any organization</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
} 