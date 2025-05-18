import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { Link, useNavigate } from "react-router-dom";

// Define the expected data structure
interface OrganizationData {
  name: string;
}

interface MembershipData {
  organization_id: string;
  organizations: OrganizationData;
}

export default function FarmerBudgetRequest() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [farmerId, setFarmerId] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string>("");
  const [currentBudget, setCurrentBudget] = useState<{
    remaining_balance: number;
    total_allocation: number;
  }>({
    remaining_balance: 0,
    total_allocation: 0
  });

  const [requestData, setRequestData] = useState({
    amount: "",
    purpose: "",
    details: ""
  });

  useEffect(() => {
    if (user?.id) {
      loadFarmerProfile();
    }
  }, [user?.id]);

  useEffect(() => {
    if (farmerId && organizationId) {
      loadBudget();
    }
  }, [farmerId, organizationId]);

  const loadFarmerProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // First get the farmer profile for the current user
      const { data: farmerProfile, error: farmerError } = await supabase
        .from("farmer_profiles")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (farmerError) {
        console.error("Error loading farmer profile:", farmerError);
        setError("Failed to load your farmer profile. Please make sure your profile is complete.");
        return;
      }

      setFarmerId(farmerProfile.id);

      // Get the farmer's organization
      const { data: membership, error: membershipError } = await supabase
        .from("organization_members")
        .select("organization_id, organizations:organization_id(name)")
        .eq("farmer_id", farmerProfile.id)
        .eq("status", "active")
        .single();

      if (membershipError) {
        console.error("Error loading organization:", membershipError);
        setError("Failed to load your organization details. You might not be a member of any organization.");
        return;
      }

      if (membership && membership.organization_id) {
        setOrganizationId(membership.organization_id);
        // Type assertion to handle the nested organizations object
        const orgData = membership as unknown as MembershipData;
        setOrganizationName(orgData.organizations?.name || "Your Organization");
      } else {
        setError("You are not a member of any organization.");
      }
    } catch (error: any) {
      console.error("Error in loadFarmerProfile:", error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadBudget = async () => {
    try {
      if (!farmerId || !organizationId) return;

      const { data: budgetData, error: budgetError } = await supabase
        .from("farmer_budgets")
        .select("total_allocation, remaining_balance")
        .eq("farmer_id", farmerId)
        .eq("organization_id", organizationId)
        .single();

      if (budgetError) {
        // If no budget exists, set zeros and don't show error
        if (budgetError.code === "PGRST116") { // "no rows returned"
          setCurrentBudget({
            total_allocation: 0,
            remaining_balance: 0
          });
          return;
        }
        throw budgetError;
      }

      if (budgetData) {
        setCurrentBudget({
          total_allocation: budgetData.total_allocation || 0,
          remaining_balance: budgetData.remaining_balance || 0
        });
      }
    } catch (error: any) {
      console.error("Error loading budget data:", error);
      toast({
        title: "Error",
        description: "Failed to load budget information",
        variant: "destructive"
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRequestData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      setError(null);
      
      if (!farmerId || !organizationId) {
        throw new Error("Missing farmer or organization information");
      }
      
      // Validate inputs
      const amount = parseFloat(requestData.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Please enter a valid amount greater than zero");
      }
      
      if (!requestData.purpose.trim()) {
        throw new Error("Please enter a purpose for this budget request");
      }
      
      // Insert the budget request into the database
      const { data, error } = await supabase
        .from("farmer_budget_requests")
        .insert({
          farmer_id: farmerId,
          organization_id: organizationId,
          amount,
          purpose: requestData.purpose,
          details: requestData.details,
          status: "pending",
          request_date: new Date().toISOString()
        })
        .select()
        .single();
        
      if (error) {
        console.error("Error submitting budget request:", error);
        
        // Check if the table doesn't exist
        if (error.code === "42P01") { // undefined_table
          throw new Error("The budget request system is currently being set up. Please try again later or contact support.");
        }
        
        throw error;
      }
      
      // Success
      toast({
        title: "Budget Request Submitted",
        description: "Your budget request has been submitted successfully and is awaiting approval.",
      });
      
      // Clear form
      setRequestData({
        amount: "",
        purpose: "",
        details: ""
      });
      
      // Navigate back to wallet page
      navigate("/farmer/wallet");
      
    } catch (err: any) {
      console.error("Budget request submission error:", err);
      setError(err.message || "Failed to submit budget request. Please try again.");
      toast({
        title: "Error",
        description: err.message || "Failed to submit budget request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout userRole="farmer">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Budget Request</h1>
            <p className="text-muted-foreground">
              Request additional budget from your organization
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/farmer/wallet")} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Wallet
          </Button>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : loading ? (
          <div className="flex justify-center items-center h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Current Budget Status</CardTitle>
                <CardDescription>
                  Your current budget allocation from {organizationName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Total Allocation</p>
                    <p className="text-2xl font-bold">₱{currentBudget.total_allocation.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Remaining Balance</p>
                    <p className="text-2xl font-bold text-green-600">₱{currentBudget.remaining_balance.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <form onSubmit={handleSubmit}>
                <CardHeader>
                  <CardTitle>Request Additional Budget</CardTitle>
                  <CardDescription>
                    Fill out this form to request additional funds for your farming operations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (₱)</Label>
                    <Input
                      id="amount"
                      name="amount"
                      type="number"
                      placeholder="Enter amount in PHP"
                      value={requestData.amount}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="purpose">Purpose</Label>
                    <Input
                      id="purpose"
                      name="purpose"
                      placeholder="Brief purpose (e.g., 'Seeds for planting season')"
                      value={requestData.purpose}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="details">Details (Optional)</Label>
                    <Textarea
                      id="details"
                      name="details"
                      placeholder="Provide more details about why you need these funds and how they will be used"
                      value={requestData.details}
                      onChange={handleInputChange}
                      rows={4}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between border-t px-6 py-4">
                  <Button variant="outline" type="button" onClick={() => navigate("/farmer/wallet")}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Request"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
} 