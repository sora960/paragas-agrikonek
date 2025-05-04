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
import { Progress } from "@/components/ui/progress";
import CreateOrganizationDialog from "@/components/organization/CreateOrganizationDialog";

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
  address: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  registration_date: string;
  allocated_budget: number;
  utilized_budget: number;
}

export default function SuperAdminOrganizations() {
  const { toast } = useToast();
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
          *,
          regions:region_id (name),
          provinces:province_id (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = data?.map(org => ({
        id: org.id,
        name: org.name,
        region_id: org.region_id,
        region_name: org.regions?.name || 'Unknown Region',
        province_id: org.province_id,
        province_name: org.provinces?.name || 'Unknown Province',
        member_count: org.member_count || 0,
        status: org.status || 'pending',
        registration_number: org.registration_number || 'N/A',
        address: org.address || 'N/A',
        contact_person: org.contact_person || 'N/A',
        contact_email: org.contact_email || 'N/A',
        contact_phone: org.contact_phone || 'N/A',
        registration_date: org.created_at,
        allocated_budget: org.allocated_budget || 0,
        utilized_budget: org.utilized_budget || 0
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

  const handleStatusChange = async (organizationId: string, newStatus: 'active' | 'inactive') => {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ status: newStatus })
        .eq('id', organizationId);

      if (error) throw error;

      setOrganizations(orgs => 
        orgs.map(org => 
          org.id === organizationId ? { ...org, status: newStatus } : org
        )
      );

      toast({
        title: "Status Updated",
        description: "Organization status has been updated successfully"
      });
    } catch (error) {
      console.error('Error updating organization status:', error);
      toast({
        title: "Error",
        description: "Failed to update organization status",
        variant: "destructive"
      });
    }
  };

  const filteredOrganizations = organizations.filter(org => {
    const matchesStatus = statusFilter === "all" || org.status === statusFilter;
    const matchesSearch = org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         org.region_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const pendingCount = organizations.filter(org => org.status === 'pending').length;
  const totalBudgetUtilization = organizations.reduce((sum, org) => sum + (org.utilized_budget || 0), 0);
  const totalAllocatedBudget = organizations.reduce((sum, org) => sum + (org.allocated_budget || 0), 0);

  const calculateUtilization = (allocated: number, utilized: number) => {
    if (allocated <= 0) return 0;
    return Math.min(Math.round((utilized / allocated) * 100), 100);
  };

  return (
    <DashboardLayout userRole="superadmin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Organizations</h1>
          <Button onClick={() => setDialogOpen(true)}>Register New Organization</Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
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

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Budget Utilization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {((totalBudgetUtilization / totalAllocatedBudget) * 100).toFixed(1)}%
              </div>
              <Progress 
                value={(totalBudgetUtilization / totalAllocatedBudget) * 100} 
                className="mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount}</div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
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
                  <SelectItem value="pending">Pending Approval</SelectItem>
                </SelectContent>
              </Select>
              <Input 
                placeholder="Search organizations..." 
                className="w-[250px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6">
                      Loading organizations...
                    </TableCell>
                  </TableRow>
                ) : filteredOrganizations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
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
                        <div className="w-36">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Budget:</span>
                            <span>₱{org.allocated_budget.toLocaleString()}</span>
                          </div>
                          <Progress value={calculateUtilization(org.allocated_budget, org.utilized_budget)} className="h-2" />
                          <div className="text-xs text-muted-foreground mt-1">
                            {calculateUtilization(org.allocated_budget, org.utilized_budget)}% utilized
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={org.status === 'active' ? 'default' : 'secondary'}>
                          {org.status}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(org.registration_date).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(
                              org.id,
                              org.status === 'active' ? 'inactive' : 'active'
                            )}
                          >
                            {org.status === 'active' ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                          >
                            View Details
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>Organizations waiting for approval</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  Loading...
                </div>
              ) : pendingCount === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  No pending approvals
                </div>
              ) : (
                <div className="space-y-4">
                  {organizations
                    .filter(org => org.status === 'pending')
                    .map(org => (
                      <div key={org.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{org.name}</h4>
                          <p className="text-sm text-muted-foreground">{org.region_name}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange(org.id, 'active')}
                        >
                          Approve
                        </Button>
                      </div>
                    ))
                  }
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Regional Distribution</CardTitle>
              <CardDescription>Distribution of organizations by region</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-[200px]">
                  Loading...
                </div>
              ) : organizations.length === 0 ? (
                <div className="h-[200px] bg-primary/5 rounded-lg border border-dashed flex items-center justify-center">
                  <p className="text-muted-foreground">No data available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(
                    organizations.reduce((acc, org) => {
                      acc[org.region_name] = (acc[org.region_name] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([region, count]) => (
                    <div key={region} className="flex items-center gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{region}</p>
                        <Progress
                          value={(count / organizations.length) * 100}
                          className="mt-2"
                        />
                      </div>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      <CreateOrganizationDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        onOrganizationCreated={loadOrganizations}
      />
    </DashboardLayout>
  );
}
