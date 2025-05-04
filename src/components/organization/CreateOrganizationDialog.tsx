import { useState, useEffect } from "react";
import { organizationService } from "@/services/organizationService";
import { adminService } from "@/services/adminService";
import { supabase } from "@/lib/supabase";
import { regionService, Region, Province, IslandGroup } from "@/services/regionService";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, Check, User } from "lucide-react";

interface User {
  id: string;
  email: string;
  full_name?: string;
}

interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrganizationCreated?: () => void;
}

export default function CreateOrganizationDialog({
  open,
  onOpenChange,
  onOrganizationCreated,
}: CreateOrganizationDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    island_group_id: "",
    region_id: "",
    province_id: "",
    registration_number: "",
    address: "",
    contact_person: "",
    contact_email: "",
    contact_phone: "",
    description: "",
    status: "pending" as "pending" | "active" | "inactive",
  });

  // Admin assignment state
  const [selectedAdmin, setSelectedAdmin] = useState<User | null>(null);
  const [assignAdmin, setAssignAdmin] = useState(true);
  const [showCreateAdminForm, setShowCreateAdminForm] = useState(false);
  const [newAdminData, setNewAdminData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    password: "",
  });
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  const [islandGroups, setIslandGroups] = useState<IslandGroup[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingProvinces, setLoadingProvinces] = useState(false);

  useEffect(() => {
    fetchIslandGroups();
  }, []);

  // Watch for changes to contact_email to pre-populate admin form
  useEffect(() => {
    if (formData.contact_email && !selectedAdmin) {
      // Use contact information for the admin form
      if (formData.contact_email.length >= 3) {
        showCreateAdminFormWithContactInfo();
      }
    }
  }, [formData.contact_email]);

  const fetchIslandGroups = async () => {
    try {
      const islandGroupsData = await regionService.getIslandGroups();
      setIslandGroups(islandGroupsData);
    } catch (error) {
      console.error("Error fetching island groups:", error);
      toast({
        title: "Error",
        description: "Failed to load island groups",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (formData.island_group_id) {
      loadRegions(formData.island_group_id);
    }
  }, [formData.island_group_id]);

  useEffect(() => {
    if (formData.region_id) {
      loadProvinces(formData.region_id);
    }
  }, [formData.region_id]);

  const loadRegions = async (islandGroupId: string) => {
    setLoadingRegions(true);
    try {
      const regionsData = await regionService.getRegionsByIslandGroup(islandGroupId);
      setRegions(regionsData);
    } catch (error) {
      console.error("Error loading regions:", error);
      toast({
        title: "Error",
        description: "Failed to load regions for this island group",
        variant: "destructive",
      });
      setRegions([]);
    } finally {
      setLoadingRegions(false);
    }
  };

  const loadProvinces = async (regionId: string) => {
    setLoadingProvinces(true);
    try {
      const provincesData = await regionService.getProvinces(regionId);
      setProvinces(provincesData);
    } catch (error) {
      console.error("Error loading provinces:", error);
      toast({
        title: "Error",
        description: "Failed to load provinces for this region",
        variant: "destructive",
      });
      setProvinces([]);
    } finally {
      setLoadingProvinces(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Reset admin selection
  const resetAdminSelection = () => {
    setSelectedAdmin(null);
    setShowCreateAdminForm(false);
  };

  // Display the create admin form with contact info pre-populated
  const showCreateAdminFormWithContactInfo = () => {
    setShowCreateAdminForm(true);
    
    // Split contact person name into first and last name
    const nameParts = formData.contact_person.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    setNewAdminData({
      email: formData.contact_email,
      first_name: firstName,
      last_name: lastName,
      password: "", // Password still needs to be entered manually
    });
  };

  // Function to create a new admin user
  const createNewAdmin = async () => {
    if (!newAdminData.email || !newAdminData.password || !newAdminData.first_name) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }
    
    // Validate email format
    if (!newAdminData.email.includes('@') || !newAdminData.email.includes('.')) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }
    
    // Validate password strength
    if (newAdminData.password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreatingAdmin(true);
      
      // Construct full name for display
      const fullName = `${newAdminData.first_name} ${newAdminData.last_name}`.trim();
      
      console.log("Creating new admin user:", {
        email: newAdminData.email,
        first_name: newAdminData.first_name,
        last_name: newAdminData.last_name,
        password: "******" // Not logging actual password
      });
      
      // Use adminService to create the admin user
      const newUser = await adminService.createAdminUser({
        email: newAdminData.email,
        password: newAdminData.password,
        first_name: newAdminData.first_name,
        last_name: newAdminData.last_name,
      });
      
      if (newUser) {
        console.log("Admin user created successfully:", newUser.id);
        
        // Select the newly created user as admin
        setSelectedAdmin(newUser);
        setShowCreateAdminForm(false);
        
        toast({
          title: "Success",
          description: "New admin user created successfully",
        });
        
        // Reset form
        setNewAdminData({
          email: "",
          first_name: "",
          last_name: "",
          password: "",
        });
      }
    } catch (error: any) {
      console.error("Error creating admin user:", error);
      
      // Handle different error types
      let errorMessage = "Failed to create admin user";
      
      if (error?.message) {
        if (error.message.includes("duplicate") || error.message.includes("already exists")) {
          errorMessage = "A user with this email already exists";
        } else if (error.message.includes("password")) {
          errorMessage = "Password requirements not met";
        } else if (error.message.includes("raw_user_meta_data")) {
          errorMessage = "Database schema issue. Please contact your administrator.";
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      } else if (error?.code) {
        errorMessage = `Error code: ${error.code}`;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setCreatingAdmin(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Log organization data for debugging
      console.log("Creating organization with data:", {
        ...formData,
        region_id: formData.region_id,
        province_id: formData.province_id
      });
      
      // Create the organization with the selected region ID and province ID
      const createdOrg = await organizationService.createOrganization({
        ...formData,
        region_id: formData.region_id,
        province_id: formData.province_id
      });
      
      console.log("Organization created successfully:", createdOrg);

      // If organization creation was successful and admin assignment is checked
      if (createdOrg && assignAdmin && selectedAdmin) {
        try {
          console.log("Assigning admin", selectedAdmin.id, "to organization", createdOrg.id);
          
          // Assign the selected user as an organization admin
          await adminService.promoteToOrganizationAdmin(selectedAdmin.id, createdOrg.id);
          
          console.log("Admin assignment successful");
          
          toast({
            title: "Success",
            description: `Organization created successfully and ${selectedAdmin.email} assigned as admin`,
          });
        } catch (adminError: any) {
          console.error("Error assigning admin:", adminError);
          
          let errorMessage = "Organization created, but failed to assign administrator";
          if (adminError?.message) {
            errorMessage += `: ${adminError.message}`;
          }
          
          toast({
            title: "Partial Success",
            description: errorMessage,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Success",
          description: "Organization created successfully",
        });
      }
      
      // Reset form and close dialog
      setFormData({
        name: "",
        island_group_id: "",
        region_id: "",
        province_id: "",
        registration_number: "",
        address: "",
        contact_person: "",
        contact_email: "",
        contact_phone: "",
        description: "",
        status: "pending" as "pending" | "active" | "inactive",
      });
      
      // Reset admin selection state
      setSelectedAdmin(null);
      setShowCreateAdminForm(false);
      
      onOpenChange(false);
      if (onOrganizationCreated) {
        onOrganizationCreated();
      }
    } catch (error: any) {
      console.error("Error creating organization:", error);
      
      let errorMessage = "Failed to create organization";
      if (error?.message) {
        errorMessage += `: ${error.message}`;
      } else if (error?.code) {
        errorMessage += ` (code: ${error.code})`;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Register New Organization</DialogTitle>
          <DialogDescription>
            Fill in the details to register a new farmer organization.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registration_number">Registration Number *</Label>
                <Input
                  id="registration_number"
                  name="registration_number"
                  value={formData.registration_number}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            {/* Location Information */}
            <div>
              <Label>Location Information</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="island_group_id">Island Group *</Label>
                  <Select
                    value={formData.island_group_id}
                    onValueChange={(value) => handleSelectChange("island_group_id", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Island Group" />
                    </SelectTrigger>
                    <SelectContent>
                      {islandGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="region_id">Region *</Label>
                  <Select
                    value={formData.region_id}
                    onValueChange={(value) => handleSelectChange("region_id", value)}
                    disabled={!formData.island_group_id || loadingRegions}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        loadingRegions ? "Loading regions..." : 
                        !formData.island_group_id ? "Select Island Group first" : 
                        "Select Region"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingRegions ? (
                        <div className="flex items-center justify-center py-2">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span>Loading regions...</span>
                        </div>
                      ) : regions.length === 0 ? (
                        <div className="px-2 py-2 text-center text-sm text-muted-foreground">
                          No regions found
                        </div>
                      ) : (
                        regions.map((region) => (
                          <SelectItem key={region.id} value={region.id}>
                            {region.code ? `${region.code} - ${region.name}` : region.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="province_id">Province</Label>
                  <Select
                    value={formData.province_id}
                    onValueChange={(value) => handleSelectChange("province_id", value)}
                    disabled={!formData.region_id || loadingProvinces}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        loadingProvinces ? "Loading provinces..." : 
                        !formData.region_id ? "Select Region first" : 
                        "Select Province (optional)"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingProvinces ? (
                        <div className="flex items-center justify-center py-2">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span>Loading provinces...</span>
                        </div>
                      ) : provinces.length === 0 ? (
                        <div className="px-2 py-2 text-center text-sm text-muted-foreground">
                          No provinces found
                        </div>
                      ) : (
                        provinces.map((province) => (
                          <SelectItem key={province.id} value={province.id}>
                            {province.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={2}
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_person">Contact Person *</Label>
                <Input
                  id="contact_person"
                  name="contact_person"
                  value={formData.contact_person}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">Email *</Label>
                <Input
                  id="contact_email"
                  name="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Phone *</Label>
                <Input
                  id="contact_phone"
                  name="contact_phone"
                  value={formData.contact_phone}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
              />
            </div>

            {/* Administrator Assignment Section */}
            <div className="border p-4 rounded-md mt-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-medium">Organization Administrator</h3>
                  <p className="text-xs text-muted-foreground">Create an administrator for this organization</p>
                </div>
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="assignAdmin" 
                    checked={assignAdmin} 
                    onChange={(e) => setAssignAdmin(e.target.checked)}
                    className="mr-2"
                  />
                  <Label htmlFor="assignAdmin" className="text-sm cursor-pointer">Create Admin</Label>
                </div>
              </div>
              
              {assignAdmin && (
                <div className="space-y-4">
                  {!selectedAdmin ? (
                    <>
                      {/* Create Admin Form */}
                      {!showCreateAdminForm ? (
                        <Button 
                          type="button" 
                          variant="secondary" 
                          size="sm"
                          className="w-full"
                          onClick={showCreateAdminFormWithContactInfo}
                        >
                          Create New Admin User
                        </Button>
                      ) : (
                        <div className="border p-3 rounded-md bg-muted/20 space-y-3">
                          <h3 className="text-sm font-medium">Create New Admin User</h3>
                          
                          <div className="space-y-2">
                            <Label htmlFor="new-admin-email" className="text-xs">Email *</Label>
                            <Input
                              id="new-admin-email"
                              value={newAdminData.email}
                              onChange={(e) => setNewAdminData(prev => ({ ...prev, email: e.target.value }))}
                              placeholder="admin@example.com"
                              type="email"
                              required
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2">
                              <Label htmlFor="new-admin-first-name" className="text-xs">First Name *</Label>
                              <Input
                                id="new-admin-first-name"
                                value={newAdminData.first_name}
                                onChange={(e) => setNewAdminData(prev => ({ ...prev, first_name: e.target.value }))}
                                placeholder="John"
                                required
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="new-admin-last-name" className="text-xs">Last Name *</Label>
                              <Input
                                id="new-admin-last-name"
                                value={newAdminData.last_name}
                                onChange={(e) => setNewAdminData(prev => ({ ...prev, last_name: e.target.value }))}
                                placeholder="Doe"
                                required
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="new-admin-password" className="text-xs">Password *</Label>
                            <Input
                              id="new-admin-password"
                              value={newAdminData.password}
                              onChange={(e) => setNewAdminData(prev => ({ ...prev, password: e.target.value }))}
                              type="password"
                              placeholder="••••••••"
                              required
                            />
                          </div>
                          
                          <div className="flex justify-between pt-2">
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setShowCreateAdminForm(false);
                                setNewAdminData({
                                  email: "",
                                  first_name: "",
                                  last_name: "",
                                  password: "",
                                });
                              }}
                            >
                              Cancel
                            </Button>
                            <Button 
                              type="button" 
                              size="sm"
                              onClick={createNewAdmin}
                              disabled={creatingAdmin || !newAdminData.email || !newAdminData.password || !newAdminData.first_name}
                            >
                              {creatingAdmin ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                              Create User
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-between p-2 border rounded-md bg-muted/20">
                      <div className="flex items-center">
                        <User className="mr-2 h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{selectedAdmin.full_name || "Unnamed User"}</p>
                          <p className="text-xs text-muted-foreground">{selectedAdmin.email}</p>
                        </div>
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={resetAdminSelection}
                      >
                        Change
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || (assignAdmin && !selectedAdmin && !showCreateAdminForm)}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Register Organization
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 