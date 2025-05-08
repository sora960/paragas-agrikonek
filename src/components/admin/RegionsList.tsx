import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, LayoutDashboard, DollarSign, Search, Users, Award } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Region {
  id: string;
  name: string;
  code?: string;
  status?: string;
  priority?: string;
  island_group_id?: string;
  organization_count?: number;
  farmer_count?: number;
  budget_allocation?: number;
}

interface RegionalAdmin {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
}

interface RegionWithAdmins extends Region {
  admins?: RegionalAdmin[];
}

interface RegionsListProps {
  regions: Region[];
  loading: boolean;
}

export default function RegionsList({ regions, loading }: RegionsListProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [regionsWithAdmins, setRegionsWithAdmins] = useState<Record<string, RegionalAdmin[]>>({});
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  // Fetch regional admins for these regions
  useEffect(() => {
    const fetchRegionalAdmins = async () => {
      if (regions.length === 0) return;
      
      setLoadingAdmins(true);
      try {
        const { data, error } = await supabase
          .from('user_regions')
          .select(`
            id,
            region_id,
            users:user_id (
              id, 
              first_name, 
              last_name, 
              email,
              status
            )
          `)
          .in('region_id', regions.map(r => r.id));
          
        if (error) {
          console.error("Error fetching regional admins:", error);
          return;
        }
        
        // Group admins by region
        const adminsByRegion: Record<string, RegionalAdmin[]> = {};
        
        data?.forEach((item: any) => {
          const admin: RegionalAdmin = {
            id: item.id,
            user_id: item.users.id,
            first_name: item.users.first_name,
            last_name: item.users.last_name,
            email: item.users.email,
            status: item.users.status
          };
          
          if (!adminsByRegion[item.region_id]) {
            adminsByRegion[item.region_id] = [];
          }
          
          adminsByRegion[item.region_id].push(admin);
        });
        
        setRegionsWithAdmins(adminsByRegion);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoadingAdmins(false);
      }
    };
    
    fetchRegionalAdmins();
  }, [regions]);

  // Filter out island groups (Luzon, Visayas, Mindanao) and apply search filter
  const filteredRegions = useMemo(() => {
    // These are not real regions but island groups
    const islandGroupNames = ["Luzon", "Visayas", "Mindanao"];
    
    return regions
      .filter(region => 
        // Filter out island groups by name
        !islandGroupNames.includes(region.name) &&
        // Apply search filter if present
        (searchTerm === "" || 
         region.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         (region.code && region.code.toLowerCase().includes(searchTerm.toLowerCase())))
      )
      // Don't sort here, respect the sorting from the parent component
      // Add admin information to each region
      .map(region => ({
        ...region,
        admins: regionsWithAdmins[region.id] || []
      }));
  }, [regions, searchTerm, regionsWithAdmins]);

  // Navigate to a specific region dashboard
  const handleViewRegion = (regionId: string) => {
    navigate(`/superadmin/regions/${regionId}`);
  };

  // Navigate to the budget management page for a specific region
  const handleManageBudget = (regionId: string) => {
    navigate(`/superadmin/regions/budget/${regionId}`);
  };

  // Get the initials from a name
  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "??";
    return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Philippine Regions</CardTitle>
            <CardDescription>All administrative regions with their current status</CardDescription>
          </div>
          <div className="w-64">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search regions..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-[200px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Region Name</TableHead>
                <TableHead>Administrators</TableHead>
                <TableHead>Organizations</TableHead>
                <TableHead>Budget Allocation</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRegions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? "No regions match your search criteria." : "No regions found. Please create regions first."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRegions.map((region) => (
                  <TableRow key={region.id}>
                    <TableCell className="font-medium">{region.code || "N/A"}</TableCell>
                    <TableCell>{region.name}</TableCell>
                    <TableCell>
                      {loadingAdmins ? (
                        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                      ) : region.admins && region.admins.length > 0 ? (
                        <div className="flex -space-x-2">
                          <TooltipProvider>
                            {region.admins.slice(0, 3).map((admin, index) => (
                              <Tooltip key={admin.id}>
                                <TooltipTrigger asChild>
                                  <Avatar className={`h-8 w-8 border-2 border-background ${admin.status !== 'active' ? 'opacity-50' : ''}`}>
                                    <AvatarFallback className="bg-primary text-xs">
                                      {getInitials(admin.first_name, admin.last_name)}
                                    </AvatarFallback>
                                  </Avatar>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                  <p>{admin.first_name} {admin.last_name}</p>
                                  <p className="text-xs text-muted-foreground">{admin.email}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Status: {admin.status === 'active' ? 'Active' : 'Inactive'}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            ))}
                            
                            {region.admins.length > 3 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Avatar className="h-8 w-8 border-2 border-background">
                                    <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                                      +{region.admins.length - 3}
                                    </AvatarFallback>
                                  </Avatar>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                  <p>{region.admins.length - 3} more administrators</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </TooltipProvider>
                        </div>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                          No admins assigned
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{region.organization_count || 0}</TableCell>
                    <TableCell>
                      {region.budget_allocation 
                        ? `₱ ${region.budget_allocation.toLocaleString()}`
                        : "Not allocated"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewRegion(region.id)}
                        >
                          <LayoutDashboard className="h-4 w-4 mr-1" />
                          Dashboard
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleManageBudget(region.id)}
                        >
                          <DollarSign className="h-4 w-4 mr-1" />
                          Budget
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/superadmin/user-management?tab=regional-admins&region=${region.id}`)}
                        >
                          <Users className="h-4 w-4 mr-1" />
                          Admins
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
} 