import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, ArrowRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function OrganizationAccess() {
  const [organization, setOrganization] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Simulate loading organization data
    const loadOrganization = async () => {
      try {
        setLoading(true);
        // Simulating API call with timeout
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // For demo purposes, we'll set a dummy organization
        setOrganization({ id: "org-123", name: "Demo Farm Collective" });
      } catch (error) {
        console.error('Error loading organization:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOrganization();
  }, []);

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
            <Link to="/farmer/apply">Apply to Join an Organization</Link>
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
              Click the button to access your organization dashboard
            </p>
          </div>
          <Button asChild>
            <Link to="/organization">
              <span>Access</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 