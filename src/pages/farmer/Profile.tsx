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
import { Loader2, Save } from "lucide-react";
import { FarmerProfile } from "@/types/farmer";

export default function Profile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("farmer_profiles")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setProfile(data);
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

      const profileData = {
        ...profile,
        user_id: user.id,
        updated_at: new Date().toISOString()
      };
      
      // If this is a new profile
      if (!profile.id) {
        const { data, error } = await supabase
          .from("farmer_profiles")
          .insert({
            ...profileData,
            created_at: new Date().toISOString()
          })
          .select()
          .single();
          
        if (error) throw error;
        setProfile(data);
        toast.success("Profile created successfully");
      } else {
        // Update existing profile
        const { data, error } = await supabase
          .from("farmer_profiles")
          .update(profileData)
          .eq("id", profile.id)
          .select()
          .single();
          
        if (error) throw error;
        setProfile(data);
        toast.success("Profile updated successfully");
      }
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout userRole="farmer">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Farmer Profile</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
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
                    value={profile.email || user?.email || ""}
                    onChange={handleInputChange}
                    placeholder="Your email address"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Farm Information</CardTitle>
                <CardDescription>
                  Set up your farm details to enable organization membership and better support
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
                      placeholder="Your farm's name"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="farm_size">Farm Size (hectares)</Label>
                    <Input
                      id="farm_size"
                      name="farm_size"
                      type="number"
                      step="0.01"
                      min="0"
                      value={profile.farm_size || ""}
                      onChange={handleNumberInputChange}
                      placeholder="Size in hectares"
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
                    <Label htmlFor="years_of_experience">Years of Experience</Label>
                    <Input
                      id="years_of_experience"
                      name="years_of_experience"
                      type="number"
                      min="0"
                      value={profile.years_of_experience || ""}
                      onChange={handleNumberInputChange}
                      placeholder="Years of farming experience"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="farm_type">Farm Type</Label>
                    <Select 
                      value={profile.farm_type || "small"}
                      onValueChange={(value) => handleSelectChange("farm_type", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select farm type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Main Crops</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {profile.main_crops?.map((crop, index) => (
                      <div key={index} className="bg-primary/10 text-primary rounded-full px-3 py-1 text-sm flex items-center">
                        {crop}
                        <button
                          type="button"
                          className="ml-2 text-primary/70 hover:text-primary"
                          onClick={() => removeCrop(crop)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newCrop}
                      onChange={(e) => setNewCrop(e.target.value)}
                      placeholder="Add a crop"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCrop();
                        }
                      }}
                    />
                    <Button type="button" onClick={addCrop} variant="outline">
                      Add
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="province_id">Province</Label>
                    <Select 
                      value={profile.province_id || "none"}
                      onValueChange={(value) => handleSelectChange("province_id", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select province" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- None --</SelectItem>
                        {provinces.map((province) => (
                          <SelectItem key={province.id} value={province.id}>
                            {province.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="certification_status">Certification Status</Label>
                    <Select 
                      value={profile.certification_status || "none"}
                      onValueChange={(value) => handleSelectChange("certification_status", value)}
                    >
                      <SelectTrigger>
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
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={saving} className="w-full md:w-auto">
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
        )}
      </div>
    </DashboardLayout>
  );
} 