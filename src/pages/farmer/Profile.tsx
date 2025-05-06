import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save, Edit, CheckCircle2 } from "lucide-react";
import { FarmerProfile } from "@/types/farmer";

export default function Profile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [profile, setProfile] = useState<Partial<FarmerProfile>>({
    farm_name: "",
    farm_size: 0,
    farm_address: "",
    years_of_experience: 0,
    main_crops: [],
    farm_type: "small",
    certification_status: "none"
  });
  const [newCrop, setNewCrop] = useState("");
  const [organizations, setOrganizations] = useState<{id: string, name: string}[]>([]);
  const [provinces, setProvinces] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    if (user?.id) {
      fetchProfile();
      fetchOrganizations();
      fetchProvinces();
    }
  }, [user]);

  // Auto-enable edit mode for new profiles
  useEffect(() => {
    if (!loading && !profile.id) {
      setEditMode(true);
    }
  }, [loading, profile.id]);

  // Debug authentication status
  useEffect(() => {
    if (user) {
      console.log("User is authenticated:", !!user);
      console.log("User ID:", user.id);
      console.log("User email:", user.email);
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      // Check auth before making request
      if (!user?.id) {
        console.error("No authenticated user found");
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from("farmer_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching farmer profile:", error);
        toast.error("Failed to load profile");
        setLoading(false);
        return;
      }
      
      if (data) {
        // If profile exists but email is different from user email, update it
        if (user?.email && data.email !== user.email) {
          try {
            // Quietly update the profile email to match user email
            await supabase
              .from("farmer_profiles")
              .update({ email: user.email })
              .eq("id", data.id);
            
            // Update local data
            data.email = user.email;
          } catch (emailUpdateErr) {
            console.error("Failed to update email:", emailUpdateErr);
          }
        }
        setProfile(data);
      } else {
        // Initialize a new profile with default values using auth data directly
        // No need to query the users table which causes permission errors
        setProfile({
          user_id: user?.id,
          full_name: user?.email?.split('@')[0] || "", // Use email username as fallback
          email: user?.email || "",
          phone: "",
          farm_name: "",
          farm_size: 0,
          farm_address: "",
          years_of_experience: 0,
          main_crops: [],
          farm_type: "small",
          certification_status: "none"
        });
      }
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name")
        .order("name");

      if (error) throw error;
      
      setOrganizations(data || []);
    } catch (error: any) {
      console.error("Error fetching organizations:", error);
    }
  };

  const fetchProvinces = async () => {
    try {
      const { data, error } = await supabase
        .from("provinces")
        .select("id, name")
        .order("name");

      if (error) throw error;
      
      setProvinces(data || []);
    } catch (error: any) {
      console.error("Error fetching provinces:", error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleNumberInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const handleSelectChange = (name: string, value: string) => {
    if (name === "province_id" && value === "none") {
      setProfile((prev) => ({ ...prev, [name]: null }));
    } else {
      setProfile((prev) => ({ ...prev, [name]: value }));
    }
  };

  const addCrop = () => {
    if (newCrop.trim() && !profile.main_crops?.includes(newCrop.trim())) {
      setProfile((prev) => ({
        ...prev,
        main_crops: [...(prev.main_crops || []), newCrop.trim()]
      }));
      setNewCrop("");
    }
  };

  const removeCrop = (crop: string) => {
    setProfile((prev) => ({
      ...prev,
      main_crops: (prev.main_crops || []).filter(c => c !== crop)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      toast.error("User information not found");
      return;
    }
    
    if (!profile.farm_name || !profile.farm_address) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    try {
      setSaving(true);
      setSaveSuccess(false);

      // Create a minimal data object with only the farmer_profiles fields
      const profileData = {
        user_id: user.id,
        full_name: profile.full_name || "",
        email: user.email,
        phone: profile.phone || "",
        farm_name: profile.farm_name || "",
        farm_size: profile.farm_size || 0,
        farm_address: profile.farm_address || "",
        farm_type: profile.farm_type || "small",
        certification_status: profile.certification_status || "none",
        years_of_experience: profile.years_of_experience || 0,
        main_crops: profile.main_crops || [],
        province_id: profile.province_id === "none" ? null : profile.province_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log("Preparing to save profile with email:", user.email);
      console.log("Preparing to save profile:", profileData);
      
      // If this is a new profile, create it
      if (!profile.id) {
        try {
          console.log("Creating new farmer profile via Supabase client");
          
          // Create the profile directly with Supabase
          const { data, error } = await supabase
            .from("farmer_profiles")
            .insert(profileData)
            .select()
            .single();
          
          if (error) {
            console.error("Error creating profile with Supabase client:", error);
            throw new Error(`Failed to create profile: ${error.message}`);
          }
          
          console.log("Profile created successfully:", data);
          setProfile(data);
          setSaveSuccess(true);
          setEditMode(false);
          toast.success("Profile created successfully! You can now join an organization.", {
            action: {
              label: "Find Organizations",
              onClick: () => window.location.href = "/farmer/apply"
            }
          });
        } catch (error: any) {
          console.error("Error creating profile:", error);
          toast.error(`Failed to create profile: ${error.message}`);
          setSaving(false);
          return;
        }
      } else {
        // Update existing profile - use standard Supabase method as update seems to work
        const { data, error } = await supabase
          .from("farmer_profiles")
          .update({
            ...profileData,
            updated_at: new Date().toISOString()
          })
          .eq("id", profile.id)
          .select()
          .single();
          
        if (error) {
          console.error("Error updating profile:", error);
          toast.error("Failed to update profile: " + error.message);
          setSaving(false);
          return;
        }
        
        setProfile(data);
        setSaveSuccess(true);
        setEditMode(false);
        toast.success("Profile updated successfully");
      }
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Helper to get province name by ID
  const getProvinceName = (id: string | null | undefined) => {
    if (!id) return "None";
    const province = provinces.find(p => p.id === id);
    return province ? province.name : "Unknown";
  };

  // Function to format farm type for display
  const formatFarmType = (type: string | undefined) => {
    if (!type) return "";
    const types: Record<string, string> = {
      small: "Small-scale",
      medium: "Medium-scale",
      large: "Large-scale",
      commercial: "Commercial"
    };
    return types[type] || type;
  };

  // Function to format certification status for display
  const formatCertificationStatus = (status: string | undefined) => {
    if (!status) return "None";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <DashboardLayout userRole="farmer">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Farmer Profile</h1>
          {profile.id && !editMode && (
            <Button onClick={() => setEditMode(true)} variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {saveSuccess && !editMode && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4 flex items-center">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                <p className="text-green-700">Profile saved successfully!</p>
              </div>
            )}
            
            {editMode ? (
              <form onSubmit={handleSubmit}>
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="full_name">Full Name <span className="text-red-500">*</span></Label>
                        <Input
                          id="full_name"
                          name="full_name"
                          value={profile.full_name || ""}
                          onChange={handleInputChange}
                          placeholder="Your full name"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number <span className="text-red-500">*</span></Label>
                        <Input
                          id="phone"
                          name="phone"
                          value={profile.phone || ""}
                          onChange={handleInputChange}
                          placeholder="Your contact number"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={user?.email || profile.email || ""}
                        readOnly
                        disabled
                        className="bg-gray-50"
                      />
                      <p className="text-xs text-muted-foreground">Email is connected to your account and cannot be changed here.</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Farm Information</CardTitle>
                    <CardDescription>
                      Provide details about your farming operation
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="farm_name">Farm Name <span className="text-red-500">*</span></Label>
                        <Input
                          id="farm_name"
                          name="farm_name"
                          value={profile.farm_name || ""}
                          onChange={handleInputChange}
                          placeholder="Name of your farm"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="farm_size">Farm Size (hectares) <span className="text-red-500">*</span></Label>
                        <Input
                          id="farm_size"
                          name="farm_size"
                          type="number"
                          min="0"
                          step="0.01"
                          value={profile.farm_size || ""}
                          onChange={handleNumberInputChange}
                          placeholder="Size in hectares"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="farm_address">Farm Address <span className="text-red-500">*</span></Label>
                      <Textarea
                        id="farm_address"
                        name="farm_address"
                        value={profile.farm_address || ""}
                        onChange={handleInputChange}
                        placeholder="Full address of your farm"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="province">Province</Label>
                        <Select 
                          value={profile.province_id || "none"} 
                          onValueChange={(value) => handleSelectChange("province_id", value)}
                        >
                          <SelectTrigger id="province">
                            <SelectValue placeholder="Select your province" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None selected</SelectItem>
                            {provinces.map((province) => (
                              <SelectItem key={province.id} value={province.id}>
                                {province.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="years_of_experience">Years of Experience</Label>
                        <Input
                          id="years_of_experience"
                          name="years_of_experience"
                          type="number"
                          min="0"
                          value={profile.years_of_experience || ""}
                          onChange={handleNumberInputChange}
                          placeholder="Number of years farming"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="farm_type">Farm Type</Label>
                        <Select 
                          value={profile.farm_type || "small"} 
                          onValueChange={(value) => handleSelectChange("farm_type", value)}
                        >
                          <SelectTrigger id="farm_type">
                            <SelectValue placeholder="Select farm type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="small">Small-scale</SelectItem>
                            <SelectItem value="medium">Medium-scale</SelectItem>
                            <SelectItem value="large">Large-scale</SelectItem>
                            <SelectItem value="commercial">Commercial</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="certification">Certification Status</Label>
                        <Select 
                          value={profile.certification_status || "none"} 
                          onValueChange={(value) => handleSelectChange("certification_status", value)}
                        >
                          <SelectTrigger id="certification">
                            <SelectValue placeholder="Select certification status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="certified">Certified</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Main Crops/Products</Label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {profile.main_crops && profile.main_crops.length > 0 ? (
                          profile.main_crops.map((crop, index) => (
                            <div 
                              key={index} 
                              className="px-3 py-1 bg-primary/10 rounded-full flex items-center gap-2"
                            >
                              <span>{crop}</span>
                              <button 
                                type="button" 
                                onClick={() => removeCrop(crop)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                ×
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="text-muted-foreground text-sm">
                            No crops added yet
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Input 
                          value={newCrop} 
                          onChange={(e) => setNewCrop(e.target.value)}
                          placeholder="Add a crop or product" 
                          className="flex-1"
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={addCrop}
                          disabled={!newCrop.trim()}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    {profile.id && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setEditMode(false)}
                      >
                        Cancel
                      </Button>
                    )}
                    <Button type="submit" disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Profile
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </form>
            ) : (
              // View-only mode
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="block text-sm font-medium text-muted-foreground mb-1">Full Name</Label>
                        <p className="text-lg">{profile.full_name || "Not provided"}</p>
                      </div>
                      
                      <div>
                        <Label className="block text-sm font-medium text-muted-foreground mb-1">Phone Number</Label>
                        <p className="text-lg">{profile.phone || "Not provided"}</p>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="block text-sm font-medium text-muted-foreground mb-1">Email</Label>
                      <p className="text-lg">{user?.email || profile.email || "Not provided"}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Farm Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="block text-sm font-medium text-muted-foreground mb-1">Farm Name</Label>
                        <p className="text-lg">{profile.farm_name || "Not provided"}</p>
                      </div>
                      
                      <div>
                        <Label className="block text-sm font-medium text-muted-foreground mb-1">Farm Size</Label>
                        <p className="text-lg">{profile.farm_size ? `${profile.farm_size} hectares` : "Not provided"}</p>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="block text-sm font-medium text-muted-foreground mb-1">Farm Address</Label>
                      <p className="text-lg">{profile.farm_address || "Not provided"}</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="block text-sm font-medium text-muted-foreground mb-1">Province</Label>
                        <p className="text-lg">{getProvinceName(profile.province_id)}</p>
                      </div>
                      
                      <div>
                        <Label className="block text-sm font-medium text-muted-foreground mb-1">Years of Experience</Label>
                        <p className="text-lg">{profile.years_of_experience || "0"} years</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="block text-sm font-medium text-muted-foreground mb-1">Farm Type</Label>
                        <p className="text-lg">{formatFarmType(profile.farm_type)}</p>
                      </div>
                      
                      <div>
                        <Label className="block text-sm font-medium text-muted-foreground mb-1">Certification Status</Label>
                        <p className="text-lg">{formatCertificationStatus(profile.certification_status)}</p>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="block text-sm font-medium text-muted-foreground mb-1">Main Crops/Products</Label>
                      {profile.main_crops && profile.main_crops.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {profile.main_crops.map((crop, index) => (
                            <div 
                              key={index} 
                              className="px-3 py-1 bg-primary/10 rounded-full"
                            >
                              {crop}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-lg text-muted-foreground">No crops added</p>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button 
                      type="button" 
                      onClick={() => setEditMode(true)}
                      variant="outline"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Profile
                    </Button>
                  </CardFooter>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
} 