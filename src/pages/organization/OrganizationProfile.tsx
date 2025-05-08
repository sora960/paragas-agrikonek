import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useToast } from "@/components/ui/use-toast";
import { organizationService } from "@/services/organizationService";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

const organizationSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
  registrationNumber: z.string().min(1, "Registration number is required"),
  address: z.string().min(1, "Address is required"),
  contactPerson: z.string().min(1, "Contact person is required"),
  contactEmail: z.string().email("Invalid email address"),
  contactPhone: z.string().min(1, "Contact phone is required"),
  description: z.string().optional(),
});

type OrganizationFormValues = z.infer<typeof organizationSchema>;

// Extended organization interface to match what we get from the database
interface OrganizationDetails {
  id: string;
  name: string;
  registration_number?: string;
  address?: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  description?: string;
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  updated_at: string;
}

export default function OrganizationProfile() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: "",
      registrationNumber: "",
      address: "",
      contactPerson: "",
      contactEmail: "",
      contactPhone: "",
      description: "",
    },
  });

  useEffect(() => {
    if (user) {
      loadOrganizationData();
    }
  }, [user]);

  const loadOrganizationData = async () => {
    try {
      setIsLoadingData(true);
      
      // Get the organization that the current user is an admin of
      const userOrgs = await organizationService.getOrganizationByAdmin(user?.id || "");
      
      if (userOrgs && userOrgs.length > 0) {
        const orgId = userOrgs[0].id;
        setOrganizationId(orgId);
        
        // Get full organization details directly from the database
        const { data: organizationData, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', orgId)
          .single<OrganizationDetails>();
        
        if (error) throw error;
        
        if (organizationData) {
          // Set form values
          form.reset({
            name: organizationData.name || "",
            registrationNumber: organizationData.registration_number || "",
            address: organizationData.address || "",
            contactPerson: organizationData.contact_person || "",
            contactEmail: organizationData.contact_email || "",
            contactPhone: organizationData.contact_phone || "",
            description: organizationData.description || "",
          });
        }
      }
    } catch (error) {
      console.error("Error loading organization:", error);
      toast({
        title: "Error",
        description: "Failed to load organization data",
        variant: "destructive",
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  const onSubmit = async (data: OrganizationFormValues) => {
    if (!organizationId) {
      toast({
        title: "Error",
        description: "No organization found to update",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      const success = await organizationService.updateOrganization(organizationId, {
        name: data.name,
        address: data.address,
        contact_person: data.contactPerson,
        contact_email: data.contactEmail,
        contact_phone: data.contactPhone,
        description: data.description,
      });
      
      if (success) {
        toast({
          title: "Profile Updated",
          description: "Your organization profile has been updated successfully.",
        });
      } else {
        throw new Error("Failed to update organization profile");
      }
    } catch (error) {
      console.error("Error updating organization:", error);
      toast({
        title: "Error",
        description: "Failed to update organization profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingData) {
    return (
      <DashboardLayout userRole="organization">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading organization data...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="organization">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Organization Profile</h1>
          <Button variant="outline" disabled={isLoading}>
            View Public Profile
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Manage your organization's profile information and contact details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter organization name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="registrationNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registration Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter registration number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactPerson"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Person</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter contact person name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Enter contact email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter contact phone" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter organization address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter organization description" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Provide a brief description of your organization and its activities.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
} 