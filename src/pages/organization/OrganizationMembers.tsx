import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";

interface Member {
  id: string;
  organization_id: string;
  farmer_id: string;
  role: 'member' | 'admin' | 'manager';
  status: 'active' | 'inactive' | 'suspended';
  join_date: string;
  // Farmer profile data
  farm_name: string;
  farm_size: number;
  farm_address: string;
  // User data
  first_name: string;
  last_name: string;
  email: string;
}

export default function OrganizationMembers() {
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          *,
          farmer_profiles!inner (
            farm_name,
            farm_size,
            farm_address,
            users!inner (
              first_name,
              last_name,
              email
            )
          )
        `);

      if (error) throw error;

      const formattedMembers = data.map(member => ({
        id: member.id,
        organization_id: member.organization_id,
        farmer_id: member.farmer_id,
        role: member.role,
        status: member.status,
        join_date: member.join_date,
        farm_name: member.farmer_profiles.farm_name,
        farm_size: member.farmer_profiles.farm_size,
        farm_address: member.farmer_profiles.farm_address,
        first_name: member.farmer_profiles.users.first_name,
        last_name: member.farmer_profiles.users.last_name,
        email: member.farmer_profiles.users.email
      }));

      setMembers(formattedMembers);
    } catch (error) {
      console.error('Error loading members:', error);
      toast({
        title: "Error",
        description: "Failed to load organization members",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (memberId: string, newStatus: 'active' | 'inactive' | 'suspended') => {
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ status: newStatus })
        .eq('id', memberId);

      if (error) throw error;

      setMembers(members.map(member =>
        member.id === memberId ? { ...member, status: newStatus } : member
      ));
      
      toast({
        title: "Status Updated",
        description: "Member status has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating member status:', error);
      toast({
        title: "Error",
        description: "Failed to update member status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRoleChange = async (memberId: string, newRole: 'member' | 'admin' | 'manager') => {
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      setMembers(members.map(member =>
        member.id === memberId ? { ...member, role: newRole } : member
      ));
      
      toast({
        title: "Role Updated",
        description: "Member role has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating member role:', error);
      toast({
        title: "Error",
        description: "Failed to update member role. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredMembers = members.filter(member => {
    const matchesStatus = statusFilter === "all" || member.status === statusFilter;
    const searchTerm = searchQuery.toLowerCase();
    const matchesSearch = 
      member.farm_name.toLowerCase().includes(searchTerm) ||
      member.first_name.toLowerCase().includes(searchTerm) ||
      member.last_name.toLowerCase().includes(searchTerm) ||
      member.email.toLowerCase().includes(searchTerm);
    return matchesStatus && matchesSearch;
  });

  return (
    <DashboardLayout userRole="organization">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Member Management</h1>
          <Button>Add New Member</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>Manage your organization's members and their roles.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Farm</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">
                      Loading members...
                    </TableCell>
                  </TableRow>
                ) : filteredMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">
                      No members found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        {member.first_name} {member.last_name}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{member.farm_name}</p>
                          <p className="text-sm text-muted-foreground">{member.farm_size} hectares</p>
                        </div>
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        <Select
                          value={member.role}
                          onValueChange={(value: 'member' | 'admin' | 'manager') => 
                            handleRoleChange(member.id, value)
                          }
                        >
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          member.status === 'active' ? 'default' :
                          member.status === 'suspended' ? 'destructive' : 'secondary'
                        }>
                          {member.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(member.join_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Select
                          value={member.status}
                          onValueChange={(value: 'active' | 'inactive' | 'suspended') => 
                            handleStatusChange(member.id, value)
                          }
                        >
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
} 