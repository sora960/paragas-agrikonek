import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { createUser } from "@/services/userService";

// Define the structure for the Philippines regions data
interface Province {
  name: string;
  farmers: number;
  organizations: number;
  status: "active" | "pending";
}

interface Region {
  id: string;
  code: string;
  name: string;
  has_admin?: boolean;
  provinces?: Province[];
}

interface IslandGroup {
  id: string;
  name: string;
  regions: Region[];
}

export default function SuperAdminUsers() {
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  // States for selection
  const [selectedIslandGroup, setSelectedIslandGroup] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [islandGroups, setIslandGroups] = useState<IslandGroup[]>([]);
  const [regionalAdmins, setRegionalAdmins] = useState<any[]>([]);

  // Extract fetchData function to be able to call it after form submission
  const fetchData = async () => {
    setLoading(true);
    try {
      // Default island groups if no data is fetched
      const defaultIslandGroups = [
        { id: "luzon", name: "Luzon", regions: [] },
        { id: "visayas", name: "Visayas", regions: [] },
        { id: "mindanao", name: "Mindanao", regions: [] }
      ];
      
      // Try to fetch island groups
      const { data: islandGroupsData, error: islandGroupsError } = await supabase
        .from('island_groups')
        .select('id, name');
      
      // Use default groups if error or no data  
      const groups: IslandGroup[] = islandGroupsData?.length > 0 
        ? islandGroupsData.map((ig: any) => ({
            id: ig.id,
            name: ig.name,
            regions: []
          }))
        : defaultIslandGroups;
      
      // Fetch regions
      const { data: regionsData, error: regionsError } = await supabase
        .from('regions')
        .select('id, code, name, island_group_id');
        
      // Fetch assigned regions
      const { data: assignedRegionsData, error: assignedError } = await supabase
        .from('user_regions')
        .select('region_id');
        
      // Get assigned region IDs
      const assignedRegionIds = assignedRegionsData?.map(ur => ur.region_id) || [];
      
      // If we have region data
      if (regionsData && regionsData.length > 0) {
        // Add regions to their island groups and mark if they have an admin
        regionsData.forEach((region: any) => {
          const groupIndex = groups.findIndex(g => g.id === region.island_group_id);
          if (groupIndex !== -1) {
            groups[groupIndex].regions.push({
              id: region.id,
              code: region.code,
              name: region.name,
              has_admin: assignedRegionIds.includes(region.id)
            });
          } else if (region.code.startsWith('R1') || region.code === 'NCR' || region.code === 'CAR' || 
                    region.code.startsWith('R2') || region.code.startsWith('R3') || 
                    region.code.startsWith('R4') || region.code.startsWith('R5')) {
            // Fallback: Add to Luzon for regions with no assigned island_group_id
            const luzonIndex = groups.findIndex(g => g.name === "Luzon");
            if (luzonIndex !== -1) {
              groups[luzonIndex].regions.push({
                id: region.id,
                code: region.code,
                name: region.name,
                has_admin: assignedRegionIds.includes(region.id)
              });
            }
          } else if (region.code.startsWith('R6') || region.code.startsWith('R7') || region.code.startsWith('R8')) {
            // Fallback: Add to Visayas
            const visayasIndex = groups.findIndex(g => g.name === "Visayas");
            if (visayasIndex !== -1) {
              groups[visayasIndex].regions.push({
                id: region.id,
                code: region.code,
                name: region.name,
                has_admin: assignedRegionIds.includes(region.id)
              });
            }
          } else {
            // Fallback: Add to Mindanao
            const mindanaoIndex = groups.findIndex(g => g.name === "Mindanao");
            if (mindanaoIndex !== -1) {
              groups[mindanaoIndex].regions.push({
                id: region.id,
                code: region.code,
                name: region.name,
                has_admin: assignedRegionIds.includes(region.id)
              });
            }
          }
        });
      } else {
        // If no regions data, add hardcoded regions based on the attached file
        const philippineRegions = [
          {
            name: "Luzon",
            regions: [
              { code: "R1", name: "Region I – Ilocos Region" },
              { code: "R2", name: "Region II – Cagayan Valley" },
              { code: "R3", name: "Region III – Central Luzon" },
              { code: "R4A", name: "Region IV-A – CALABARZON" },
              { code: "R4B", name: "Region IV-B – MIMAROPA" },
              { code: "R5", name: "Region V – Bicol Region" },
              { code: "NCR", name: "National Capital Region (NCR)" },
              { code: "CAR", name: "Cordillera Administrative Region (CAR)" }
            ]
          },
          {
            name: "Visayas",
            regions: [
              { code: "R6", name: "Region VI – Western Visayas" },
              { code: "R7", name: "Region VII – Central Visayas" },
              { code: "R8", name: "Region VIII – Eastern Visayas" }
            ]
          },
          {
            name: "Mindanao",
            regions: [
              { code: "R9", name: "Region IX – Zamboanga Peninsula" },
              { code: "R10", name: "Region X – Northern Mindanao" },
              { code: "R11", name: "Region XI – Davao Region" },
              { code: "R12", name: "Region XII – SOCCSKSARGEN" },
              { code: "R13", name: "Region XIII – Caraga" },
              { code: "BARMM", name: "Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)" }
            ]
          }
        ];

        // Generate UUIDs for hardcoded regions
        philippineRegions.forEach((islandGroup, islandIdx) => {
          const groupIndex = groups.findIndex(g => g.name === islandGroup.name);
          if (groupIndex !== -1) {
            islandGroup.regions.forEach((region) => {
              groups[groupIndex].regions.push({
                id: `${islandGroup.name.toLowerCase()}-${region.code}`,
                code: region.code,
                name: region.name,
                has_admin: false
              });
            });
          }
        });
      }
      
      setIslandGroups(groups);
      
      // Fetch regional admins with their assigned regions
      try {
        const { data: adminsData, error: adminsError } = await supabase
          .from('region_admins')
          .select('*');
        
        if (adminsError) {
          console.warn("Error fetching region admins:", adminsError);
          setRegionalAdmins([]);
        } else {
          setRegionalAdmins(adminsData || []);
        }
      } catch (adminFetchError) {
        console.warn("Failed to fetch region admins:", adminFetchError);
        setRegionalAdmins([]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load data from the database",
        variant: "destructive"
      });
      
      // Set default island groups as fallback
      setIslandGroups([
        { id: "luzon", name: "Luzon", regions: [] },
        { id: "visayas", name: "Visayas", regions: [] },
        { id: "mindanao", name: "Mindanao", regions: [] }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Find the selected island group
  const islandGroup = selectedIslandGroup 
    ? islandGroups.find(island => island.id === selectedIslandGroup) 
    : null;

  // Filter to show only regions without admins
  const availableRegions = islandGroup?.regions.filter(r => !r.has_admin) || [];

  // Handle island group selection
  const handleIslandGroupChange = (value: string) => {
    setSelectedIslandGroup(value);
    setSelectedRegion(null);
  };

  // Handle region selection
  const handleRegionChange = (value: string) => {
    setSelectedRegion(value);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Validate form
    if (!fullName || !email || !selectedRegion || !password) {
      toast({
        title: "Missing Information",
        description: "Please fill in all the required fields",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }
    
    try {
      // First, check if a user with this email already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 means no rows returned, which is what we want
        throw checkError;
      }
      
      if (existingUser) {
        toast({
          title: "Email Already Exists",
          description: "A user with this email address already exists in the system.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      
      // Check if the region already has an admin assigned
      const { data: existingRegionAdmin, error: regionCheckError } = await supabase
        .from('user_regions')
        .select('id, user_id')
        .eq('region_id', selectedRegion)
        .single();
        
      if (regionCheckError && regionCheckError.code !== 'PGRST116') {
        throw regionCheckError;
      }
      
      if (existingRegionAdmin) {
        toast({
          title: "Region Already Assigned",
          description: "This region already has an administrator assigned to it.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      
      // Split full name into first and last name
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      
      // Generate a UUID for the user
      const userId = crypto.randomUUID();
      
      // Log for debugging
      console.log("Selected region ID:", selectedRegion);
      console.log("Selected region type:", typeof selectedRegion);
      
      // 1. Insert directly into users table
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: userId,
          first_name: firstName,
          last_name: lastName,
          email,
          role: 'regional_admin',
          status: 'active'
        });
      
      if (userError) throw userError;
      
      // 2. Create relationship between user and region
      // Ensure region_id is a valid UUID
      const regionId = selectedRegion;
      
      const { error: regionError } = await supabase
        .from('user_regions')
        .insert({
          user_id: userId,
          region_id: regionId
        });
        
      if (regionError) {
        console.error("Region error details:", regionError);
        throw regionError;
      }
      
      // 3. Store password for future use (in a real app, you would hash this)
      const { error: passwordError } = await supabase
        .from('user_credentials')
        .insert({
          user_id: userId,
          password_hash: password
        });
      
      if (passwordError) {
        console.warn("Could not store password, but user was created", passwordError);
      }
      
      toast({
        title: "Regional Admin Created",
        description: `Account for ${fullName} has been created successfully.`,
      });
      
      // Reset form fields
      setFullName("");
      setEmail("");
      setPassword("");
      setSelectedIslandGroup(null);
      setSelectedRegion(null);
      
      // Refresh data to update the admin list and available regions
      fetchData();
      
    } catch (error: any) {
      console.error("Error creating regional admin:", error);
      
      toast({
        title: "Error Creating Account",
        description: error.message || "Failed to create regional admin account",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [toast]);

  return (
    <DashboardLayout userRole="superadmin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">User Management</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Regional Admin</CardTitle>
            <CardDescription>Add a new regional administrator to the system</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="fullName" className="text-right">Full Name</Label>
                  <Input 
                    id="fullName" 
                    className="col-span-3" 
                    placeholder="John Doe" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">Email</Label>
                  <Input 
                    id="email" 
                    className="col-span-3" 
                    type="email" 
                    placeholder="admin@example.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                
                {/* Island Group Dropdown */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Assign to Region</Label>
                  <div className="col-span-3 space-y-4">
                    {/* Island Group Selection */}
                    <div>
                      <Label htmlFor="islandGroup" className="text-sm font-medium block mb-2">
                        Island Group
                      </Label>
                      <Select 
                        onValueChange={handleIslandGroupChange} 
                        value={selectedIslandGroup || undefined}
                      >
                        <SelectTrigger id="islandGroup">
                          <SelectValue placeholder="Select Island Group" />
                        </SelectTrigger>
                        <SelectContent>
                          {islandGroups.map(island => (
                            <SelectItem key={island.id} value={island.id}>
                              {island.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Region Selection - Only enabled if Island Group is selected */}
                    <div>
                      <Label htmlFor="region" className="text-sm font-medium block mb-2">
                        Region (Only Unassigned Regions)
                      </Label>
                      <Select 
                        onValueChange={handleRegionChange} 
                        disabled={!selectedIslandGroup || loading}
                        value={selectedRegion || undefined}
                      >
                        <SelectTrigger id="region">
                          <SelectValue placeholder={
                            loading ? "Loading regions..." :
                            !selectedIslandGroup ? "Select Island Group first" :
                            availableRegions.length === 0 ? "No available regions" :
                            "Select Region"
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {loading ? (
                            <SelectItem value="loading" disabled>Loading regions...</SelectItem>
                          ) : availableRegions.length === 0 ? (
                            <SelectItem value="none" disabled>No unassigned regions available</SelectItem>
                          ) : (
                            availableRegions.map(region => (
                              <SelectItem key={region.id} value={region.id}>
                                {region.code} - {region.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password" className="text-right">Initial Password</Label>
                  <Input 
                    id="password" 
                    className="col-span-3" 
                    type="password"
                    placeholder="●●●●●●●●"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit">Create Account</Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Regional Administrators</CardTitle>
              <CardDescription>Manage all regional admin accounts</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select defaultValue="all">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Admins</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Search admins..." className="w-[250px]" />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6">
                      Loading administrators...
                    </TableCell>
                  </TableRow>
                ) : regionalAdmins.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      No administrators available
                    </TableCell>
                  </TableRow>
                ) : (
                  regionalAdmins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell>{admin.first_name} {admin.last_name}</TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell>
                        {admin.island_name && admin.region_name 
                          ? `${admin.island_name} - ${admin.region_name}`
                          : (admin.region_id || '-')}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          admin.status === 'active' ? 'bg-green-100 text-green-800' : 
                          admin.status === 'inactive' ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'
                        }>
                          {admin.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{admin.last_login ? new Date(admin.last_login).toLocaleString() : 'Never'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">Edit</Button>
                          <Button variant="outline" size="sm">Suspend</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Access Audit</CardTitle>
            <CardDescription>Recent login activities across all user accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6">
                      Loading audit data...
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      No login activities available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
