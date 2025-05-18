import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, ArrowRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

export default function OrganizationAccess() {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrganization = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        
        // First get the farmer profile
        const { data: farmerProfile, error: profileError } = await supabase
          .from("farmer_profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();
          
        if (profileError || !farmerProfile) {
          console.error('Error fetching farmer profile:', profileError);
          setLoading(false);
          return;
        }
        
        // Get the organization membership
        const { data: membership, error: membershipError } = await supabase
          .from("organization_members")
          .select("organization_id")
          .eq("farmer_id", farmerProfile.id)
          .eq("status", "active")
          .single();
          
        if (membershipError || !membership) {
          console.log('No active organization membership found');
          setLoading(false);
          return;
        }
        
        // Get the organization details
        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .select("id, name")
          .eq("id", membership.organization_id)
          .single();
          
        if (orgError || !orgData) {
          console.error('Error fetching organization:', orgError);
          setLoading(false);
          return;
        }
        
        setOrganization({ id: orgData.id, name: orgData.name });
      } catch (error) {
        console.error('Error loading organization:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganization();
  }, [user]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>My Organization</CardTitle>
          <CardDescription>Access your organization portal</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!organization) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>My Organization</CardTitle>
          <CardDescription>You are not a member of any organization</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            You are not currently a member of any organization.
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild className="w-full">
            <Link to="/farmer/organization">Apply to Join an Organization</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>My Organization</CardTitle>
        <CardDescription>Access your organization's portal</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">{organization.name}</h3>
            <p className="text-sm text-muted-foreground">
              Click the button to access organization details
            </p>
          </div>
          <Button asChild>
            <Link to="/farmer/organization">
              <span>View Details</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 