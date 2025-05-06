import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import CreateOrganizationDialog from "@/components/organization/CreateOrganizationDialog";
import { Eye, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Organization {
  id: string;
  name: string;
  region_id: string;
  region_name: string;
  province_id?: string;
  province_name?: string;
  member_count: number;
  status: 'pending' | 'active' | 'inactive';
  registration_number: string;
  contact_person: string;
  contact_email: string;
}

export default function OrganizationsPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          region_id,
          regions:region_id (name),
          province_id,
          provinces:province_id (name),
          member_count,
          status,
          registration_number,
          contact_person,
          contact_email
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = data?.map((org: any) => ({
        id: org.id,
        name: org.name,
        region_id: org.region_id,
        region_name: org.regions?.name || 'Unknown Region',
        province_id: org.province_id,
        province_name: org.provinces?.name || 'Unknown Province',
        member_count: org.member_count || 0,
        status: org.status || 'pending',
        registration_number: org.registration_number || 'N/A',
        contact_person: org.contact_person || 'N/A',
        contact_email: org.contact_email || 'N/A',
      })) || [];

      setOrganizations(formattedData);
    } catch (error) {
      console.error('Error loading organizations:', error);
      toast({
        title: "Error",
        description: "Failed to load organizations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredOrganizations = organizations.filter(org => {
    const matchesStatus = statusFilter === "all" || org.status === statusFilter;
    const matchesSearch = org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         org.region_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <DashboardLayout userRole="superadmin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Organizations</h1>
          <Button onClick={() => setDialogOpen(true)}>Register New Organization</Button>
        </div>

        <div className="grid gap-6 md:grid-cols-1">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{organizations.length}</div>
              <p className="text-xs text-muted-foreground">
                {organizations.filter(org => org.status === 'active').length} active
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Farmer Organizations</CardTitle>
              <CardDescription>Manage all registered organizations</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select 
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Organizations</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="min-w-[200px] md:min-w-[300px]"
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Province</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6">
                      <div className="flex justify-center items-center text-muted-foreground">
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Loading organizations...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredOrganizations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                      No organizations found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrganizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{org.name}</div>
                          <div className="text-sm text-muted-foreground">Reg# {org.registration_number}</div>
                        </div>
                      </TableCell>
                      <TableCell>{org.region_name}</TableCell>
                      <TableCell>{org.province_name || 'Not specified'}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{org.contact_person}</div>
                          <div className="text-sm text-muted-foreground">{org.contact_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{org.member_count}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            org.status === 'active' ? 'default' :
                            org.status === 'inactive' ? 'secondary' : 'outline'
                          }
                        >
                          {org.status.charAt(0).toUpperCase() + org.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/superadmin/organizations/${org.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Create Organization Dialog */}
      <CreateOrganizationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onOrganizationCreated={loadOrganizations}
        createdBySuper={true}
      />
    </DashboardLayout>
  );
} 