import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";

export default function RegionAssignment() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [adminOrganizations, setAdminOrganizations] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const [regions, setRegions] = useState<any[]>([]);
  const [currentRegion, setCurrentRegion] = useState<any>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<any>(null);

  useEffect(() => {
    loadOrganizations();
    // eslint-disable-next-line
  }, [user]);

  useEffect(() => {
    if (selectedOrgId) {
      loadOrgData(selectedOrgId);
    }
    // eslint-disable-next-line
  }, [selectedOrgId]);

  const loadOrganizations = async () => {
    setLoading(true);
    try {
      // Get organizations for which the user is an admin
      const { data, error } = await supabase
        .from("organization_admins")
        .select(`organization_id, organizations:organization_id (id, name, region_id, regions (id, name, code))`)
        .eq("user_id", user?.id);
      if (error) throw error;
      const orgs = (data || []).map((item: any) => ({
        id: item.organizations.id,
        name: item.organizations.name,
        region_id: item.organizations.region_id,
        region: item.organizations.regions
      }));
      setAdminOrganizations(orgs);
      if (orgs.length > 0) {
        setSelectedOrgId(orgs[0].id);
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to load organizations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadOrgData = async (orgId: string) => {
    setLoading(true);
    try {
      const org = adminOrganizations.find(o => o.id === orgId);
      setSelectedOrg(org);
      setCurrentRegion(org?.region);

      // Get all regions
      const { data: regionsData, error: regionsError } = await supabase
        .from("regions")
        .select("id, name, code")
        .order("name");
      if (regionsError) throw regionsError;
      setRegions(regionsData);

      // Get any pending reassignment request
      const { data: requestData, error: requestError } = await supabase
        .from("region_reassignment_requests")
        .select("*, requested_region:requested_region_id (id, name, code), processed_by (id, first_name, last_name)")
        .eq("organization_id", orgId)
        .eq("status", "pending")
        .order("request_date", { ascending: false })
        .limit(1)
        .single();
      if (!requestError && requestData) {
        setPendingRequest(requestData);
      } else {
        setPendingRequest(null);
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to load data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedRegion || !selectedOrg) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("region_reassignment_requests")
        .insert({
          organization_id: selectedOrg.id,
          current_region_id: selectedOrg.region_id,
          requested_region_id: selectedRegion,
          user_id: user.id,
          reason,
          status: "pending"
        });
      if (error) throw error;
      toast({
        title: "Request Submitted",
        description: "Your reassignment request has been sent to the regional admin.",
      });
      setSelectedRegion("");
      setReason("");
      loadOrgData(selectedOrg.id);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to submit request",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout userRole="organization">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Region Assignment</h1>
        {adminOrganizations.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Select Organization</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose organization" />
                </SelectTrigger>
                <SelectContent>
                  {adminOrganizations.map(org => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Current Region</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-24">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : currentRegion ? (
              <div>
                <div className="text-lg font-semibold">{currentRegion.name} ({currentRegion.code})</div>
              </div>
            ) : (
              <div className="text-muted-foreground">No region assigned.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Request Region Reassignment</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingRequest ? (
              <div className="bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 p-3 rounded-md">
                <div className="font-medium mb-1">Pending Request</div>
                <div>Requested Region: <span className="font-semibold">{pendingRequest.requested_region?.name} ({pendingRequest.requested_region?.code})</span></div>
                <div>Reason: {pendingRequest.reason}</div>
                <div>Status: <span className="capitalize font-medium">{pendingRequest.status}</span></div>
                <div className="text-xs text-muted-foreground mt-1">You cannot submit another request until this one is processed.</div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block mb-1 font-medium">Select New Region</label>
                  <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a region" />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.filter(r => r.id !== selectedOrg?.region_id).map(region => (
                        <SelectItem key={region.id} value={region.id}>
                          {region.name} ({region.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block mb-1 font-medium">Reason for Reassignment (optional)</label>
                  <Textarea
                    placeholder="Enter reason for requesting reassignment"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                  />
                </div>
                <Button onClick={handleSubmit} disabled={!selectedRegion || submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Request Reassignment
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
} 