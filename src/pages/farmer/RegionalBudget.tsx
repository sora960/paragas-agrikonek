import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

interface Organization {
  id: string;
  name: string;
  total_allocation: number;
  utilized_amount: number;
  remaining_amount: number;
  member_count: number;
}

interface RegionBudget {
  id: string;
  region_id: string;
  fiscal_year: number;
  amount: number;
  allocated: boolean;
  utilized_amount: number;
  remaining_amount: number;
}

export default function RegionalBudget() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [regionBudget, setRegionBudget] = useState<RegionBudget | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [showAllocationDialog, setShowAllocationDialog] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [allocationAmount, setAllocationAmount] = useState("");

  useEffect(() => {
    loadBudgetData();
  }, [user]);

  const loadBudgetData = async () => {
    try {
      setLoading(true);

      // Get the regional admin's region
      const { data: adminData, error: adminError } = await supabase
        .from('regional_admins')
        .select('region_id')
        .eq('user_id', user?.id)
        .single();

      if (adminError) throw adminError;

      // Get region budget
      const { data: budgetData, error: budgetError } = await supabase
        .from('region_budgets')
        .select('*')
        .eq('region_id', adminData.region_id)
        .eq('fiscal_year', new Date().getFullYear())
        .single();

      if (budgetError) throw budgetError;
      setRegionBudget(budgetData);

      // Get organizations in the region
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          organization_budgets (
            total_allocation,
            utilized_amount,
            remaining_amount
          ),
          member_count
        `)
        .eq('region_id', adminData.region_id);

      if (orgsError) throw orgsError;
      setOrganizations(orgsData.map(org => ({
        id: org.id,
        name: org.name,
        total_allocation: org.organization_budgets?.[0]?.total_allocation || 0,
        utilized_amount: org.organization_budgets?.[0]?.utilized_amount || 0,
        remaining_amount: org.organization_budgets?.[0]?.remaining_amount || 0,
        member_count: org.member_count
      })));

    } catch (error) {
      console.error('Error loading budget data:', error);
      toast({
        title: "Error",
        description: "Failed to load budget information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAllocation = async () => {
    if (!selectedOrg || !regionBudget) return;

    try {
      const amount = parseFloat(allocationAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Invalid amount");
      }

      if (amount > regionBudget.remaining_amount) {
        throw new Error("Amount exceeds remaining budget");
      }

      // Start a Supabase transaction
      const { data: updatedBudget, error: budgetError } = await supabase
        .rpc('allocate_organization_budget', {
          p_organization_id: selectedOrg.id,
          p_amount: amount,
          p_fiscal_year: new Date().getFullYear()
        });

      if (budgetError) throw budgetError;

      setShowAllocationDialog(false);
      setAllocationAmount("");
      setSelectedOrg(null);
      loadBudgetData();

      toast({
        title: "Success",
        description: "Budget allocated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to allocate budget",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout userRole="regional">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading budget data...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="regional">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Regional Budget Management</h1>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Total Budget</CardTitle>
              <CardDescription>Fiscal Year {regionBudget?.fiscal_year}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₱{regionBudget?.amount.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Utilized Budget</CardTitle>
              <CardDescription>Current spending</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₱{regionBudget?.utilized_amount.toLocaleString()}</div>
              <Progress 
                value={(regionBudget?.utilized_amount || 0) / (regionBudget?.amount || 1) * 100} 
                className="mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Remaining Budget</CardTitle>
              <CardDescription>Available for allocation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₱{regionBudget?.remaining_amount.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Organization Allocations</CardTitle>
            <CardDescription>Manage budget allocations for organizations</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Total Allocation</TableHead>
                  <TableHead>Utilized</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>{org.name}</TableCell>
                    <TableCell>{org.member_count}</TableCell>
                    <TableCell>₱{org.total_allocation.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={(org.utilized_amount / org.total_allocation) * 100}
                          className="w-[60px]"
                        />
                        <span className="text-sm">
                          {((org.utilized_amount / org.total_allocation) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>₱{org.remaining_amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedOrg(org);
                          setShowAllocationDialog(true);
                        }}
                      >
                        Allocate Budget
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={showAllocationDialog} onOpenChange={setShowAllocationDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Allocate Budget</DialogTitle>
              <DialogDescription>
                Allocate budget to {selectedOrg?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={allocationAmount}
                  onChange={(e) => setAllocationAmount(e.target.value)}
                  placeholder="Enter amount"
                />
                <p className="text-sm text-muted-foreground">
                  Available: ₱{regionBudget?.remaining_amount.toLocaleString()}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAllocationDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAllocation}>
                Allocate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
} 