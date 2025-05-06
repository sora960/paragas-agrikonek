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
import { Pencil, Trash2, MoreVertical, UserPlus, RefreshCw, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

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

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const data = await adminService.getAllOrganizationAdmins("");
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
    const searchMatch = 
      searchTerm === "" ||
      admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    return searchMatch;
  });

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "occupied":
        return "bg-orange-100 text-orange-800";
      case "available":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  return (
    <Card>
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
                    Loading administrators...
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
                      <Badge className={getStatusBadgeColor(admin.status)}>
                        {admin.status.charAt(0).toUpperCase() + admin.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {admin.organizations && admin.organizations.length > 0 
                        ? `${admin.organizations.length} organization(s)` 
                        : "None"}
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
                  <Badge className={getStatusBadgeColor(adminDetails.status)}>
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