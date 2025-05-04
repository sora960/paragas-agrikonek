import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { organizationService } from "@/services/organizationService";
import type { Budget, BudgetAllocation, RegionBudget, BudgetAllocationSummary, BudgetExpense, CategoryDistribution } from "@/types/organization";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

const BUDGET_CATEGORIES = [
  "Farm Equipment",
  "Seeds and Fertilizers",
  "Labor and Wages",
  "Infrastructure",
  "Training and Development",
  "Marketing",
  "Transportation",
  "Storage Facilities",
  "Technology and Software",
  "Other"
] as const;

export default function OrganizationBudget() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [allocations, setAllocations] = useState<BudgetAllocation[]>([]);
  const [regionBudget, setRegionBudget] = useState<RegionBudget | null>(null);
  const [regionSummary, setRegionSummary] = useState<BudgetAllocationSummary | null>(null);
  const [selectedAllocation, setSelectedAllocation] = useState<BudgetAllocation | null>(null);
  const [expenses, setExpenses] = useState<BudgetExpense[]>([]);
  const [categoryDistribution, setCategoryDistribution] = useState<CategoryDistribution[]>([]);
  const [isNewAllocationOpen, setIsNewAllocationOpen] = useState(false);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [newAllocation, setNewAllocation] = useState({
    category: "",
    amount: ""
  });
  const [newExpense, setNewExpense] = useState({
    amount: "",
    description: "",
    expenseDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadBudgetData();
  }, []);

  const loadBudgetData = async () => {
    try {
      setLoading(true);
      
      // First get the organization for the current user
      const organization = await organizationService.getOrganizationByMember(user?.id || '');
      if (!organization) throw new Error('Organization not found');

      // Get the current fiscal year budget
      const budgetData = await organizationService.getCurrentBudget(organization.id);
      
      if (budgetData) {
        setBudget(budgetData);

        // Get budget allocations
        const allocationsData = await organizationService.getBudgetAllocations(budgetData.id);
        setAllocations(allocationsData);

        // Get regional budget information
        const region = await organizationService.getOrganizationRegion(organization.id);
        if (region) {
          const [regionBudgetData, regionSummaryData] = await Promise.all([
            organizationService.getRegionBudget(region.id),
            organizationService.getRegionBudgetSummary(region.id)
          ]);
          setRegionBudget(regionBudgetData);
          setRegionSummary(regionSummaryData);
        }

        // Load category distribution
        const distributionData = await organizationService.getCategoryDistribution(budgetData.id);
        setCategoryDistribution(distributionData);
      }

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

  const loadAllocationDetails = async (allocation: BudgetAllocation) => {
    try {
      setSelectedAllocation(allocation);
      const expensesData = await organizationService.getBudgetExpenses(allocation.id);
      setExpenses(expensesData);
    } catch (error) {
      console.error('Error loading allocation details:', error);
      toast({
        title: "Error",
        description: "Failed to load allocation details",
        variant: "destructive"
      });
    }
  };

  const handleExpenseSubmit = async () => {
    if (!selectedAllocation) return;

    try {
      const amount = parseFloat(newExpense.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Invalid amount");
      }

      if (!newExpense.description) {
        throw new Error("Description is required");
      }

      const result = await organizationService.recordExpense(
        selectedAllocation.id,
        amount,
        newExpense.description,
        newExpense.expenseDate
      );

      // Update the allocation in the list
      setAllocations(prev => prev.map(a => 
        a.id === result.updatedAllocation.id ? result.updatedAllocation : a
      ));

      // Add the new expense to the list
      setExpenses(prev => [result.expense, ...prev]);

      setIsExpenseDialogOpen(false);
      setNewExpense({
        amount: "",
        description: "",
        expenseDate: new Date().toISOString().split('T')[0]
      });

      toast({
        title: "Success",
        description: "Expense recorded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to record expense",
        variant: "destructive"
      });
    }
  };

  const handleAllocationUpdate = async (allocationId: string, amount: number) => {
    try {
      await organizationService.updateBudgetAllocation(allocationId, {
        allocated_amount: amount,
        remaining_amount: amount // Reset remaining amount when allocation changes
      });
      
      // Refresh the data
      loadBudgetData();
      
      toast({
        title: "Allocation Updated",
        description: "Budget allocation has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating allocation:', error);
      toast({
        title: "Error",
        description: "Failed to update budget allocation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const requestBudgetIncrease = async () => {
    if (!budget) return;

    try {
      await organizationService.requestBudgetIncrease(
        budget.organization_id,
        budget.total_allocation,
        budget.total_allocation * 1.2, // Request 20% increase by default
        'Additional funds needed for operations'
      );

      toast({
        title: "Request Submitted",
        description: "Your budget increase request has been submitted for review.",
      });
    } catch (error) {
      console.error('Error requesting budget increase:', error);
      toast({
        title: "Error",
        description: "Failed to submit budget increase request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const createAllocation = async () => {
    if (!budget || !newAllocation.category || !newAllocation.amount) return;

    try {
      const amount = parseFloat(newAllocation.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Invalid amount");
      }

      // Check if allocation for this category already exists
      const existingAllocation = allocations.find(a => a.category === newAllocation.category);
      if (existingAllocation) {
        throw new Error("Allocation for this category already exists");
      }

      // Check if total allocations would exceed budget
      const currentTotal = allocations.reduce((sum, a) => sum + a.allocated_amount, 0);
      if (currentTotal + amount > budget.total_allocation) {
        throw new Error("Total allocations would exceed budget");
      }

      await organizationService.createBudgetAllocation({
        budget_id: budget.id,
        category: newAllocation.category,
        allocated_amount: amount,
        utilized_amount: 0,
        remaining_amount: amount,
        status: 'active'
      });

      setIsNewAllocationOpen(false);
      setNewAllocation({ category: "", amount: "" });
      loadBudgetData();

      toast({
        title: "Allocation Created",
        description: "New budget allocation has been created successfully.",
      });
    } catch (error: any) {
      console.error('Error creating allocation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create budget allocation. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout userRole="organization">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Budget Management</h1>
          <div className="space-x-4">
            <Button onClick={requestBudgetIncrease}>Request Budget Increase</Button>
            <Dialog open={isNewAllocationOpen} onOpenChange={setIsNewAllocationOpen}>
              <DialogTrigger asChild>
                <Button>New Allocation</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Budget Allocation</DialogTitle>
                  <DialogDescription>
                    Allocate budget for a specific category. The total allocations cannot exceed the total budget.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={newAllocation.category}
                      onValueChange={(value) => setNewAllocation(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {BUDGET_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (₱)</Label>
                    <Input
                      type="number"
                      value={newAllocation.amount}
                      onChange={(e) => setNewAllocation(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="Enter amount"
                    />
                  </div>
                  {budget && (
                    <div className="text-sm text-muted-foreground">
                      Available Budget: ₱{(budget.total_allocation - allocations.reduce((sum, a) => sum + a.allocated_amount, 0)).toLocaleString()}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsNewAllocationOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createAllocation}>Create Allocation</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {regionBudget && regionSummary && (
          <Card>
            <CardHeader>
              <CardTitle>Regional Budget Overview</CardTitle>
              <CardDescription>Budget allocation from your region</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm font-medium">Total Regional Budget</p>
                  <p className="text-2xl font-bold">₱{regionBudget.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Allocated to Organizations</p>
                  <p className="text-2xl font-bold">₱{regionSummary.allocated_budget.toLocaleString()}</p>
                  <Progress 
                    value={(regionSummary.allocated_budget / regionBudget.amount) * 100} 
                    className="mt-2"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium">Organizations in Region</p>
                  <p className="text-2xl font-bold">{regionSummary.organization_count}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₱{budget?.total_allocation.toLocaleString() ?? 0}</div>
              <p className="text-xs text-muted-foreground">Fiscal Year {new Date().getFullYear()}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Utilized Budget</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₱{budget?.utilized_amount.toLocaleString() ?? 0}</div>
              <Progress 
                value={budget ? (budget.utilized_amount / budget.total_allocation) * 100 : 0} 
                className="mt-2" 
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Remaining Budget</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₱{budget?.remaining_amount.toLocaleString() ?? 0}</div>
              <p className="text-xs text-muted-foreground">
                {budget ? ((budget.remaining_amount / budget.total_allocation) * 100).toFixed(1) : 0}% remaining
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Budget Distribution by Category</CardTitle>
            <CardDescription>Overview of budget allocation and utilization across categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryDistribution.map((cat) => (
                <div key={cat.category} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{cat.category}</span>
                    <span>₱{cat.total_utilized.toLocaleString()} / ₱{cat.total_allocated.toLocaleString()}</span>
                  </div>
                  <Progress value={(cat.total_utilized / cat.total_allocated) * 100} />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{cat.expense_count} expenses</span>
                    {cat.last_expense_date && (
                      <span>Last expense: {format(new Date(cat.last_expense_date), 'MMM d, yyyy')}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Budget Allocations</CardTitle>
              <CardDescription>Manage and track budget allocations by category.</CardDescription>
            </div>
            {budget && allocations.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Allocated: ₱{allocations.reduce((sum, a) => sum + a.allocated_amount, 0).toLocaleString()} / 
                ₱{budget.total_allocation.toLocaleString()}
              </div>
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Allocated</TableHead>
                  <TableHead>Utilized</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">
                      Loading budget data...
                    </TableCell>
                  </TableRow>
                ) : allocations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">
                      No budget allocations found
                    </TableCell>
                  </TableRow>
                ) : (
                  allocations.map((allocation) => (
                    <TableRow key={allocation.id}>
                      <TableCell>{allocation.category}</TableCell>
                      <TableCell>₱{allocation.allocated_amount.toLocaleString()}</TableCell>
                      <TableCell>₱{allocation.utilized_amount.toLocaleString()}</TableCell>
                      <TableCell>₱{allocation.remaining_amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            allocation.status === 'active' ? 'default' :
                            allocation.status === 'depleted' ? 'destructive' : 'secondary'
                          }
                        >
                          {allocation.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Progress 
                          value={(allocation.utilized_amount / allocation.allocated_amount) * 100} 
                          className="w-[100px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          onClick={() => {
                            loadAllocationDetails(allocation);
                            setIsExpenseDialogOpen(true);
                          }}
                        >
                          Record Expense
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {selectedAllocation && (
          <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Expense</DialogTitle>
                <DialogDescription>
                  Record an expense for {selectedAllocation.category}. 
                  Available: ₱{selectedAllocation.remaining_amount.toLocaleString()}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Amount (₱)</Label>
                  <Input
                    type="number"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="Enter amount"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newExpense.description}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter expense description"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={newExpense.expenseDate}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, expenseDate: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsExpenseDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleExpenseSubmit}>Record Expense</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {selectedAllocation && expenses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Expenses - {selectedAllocation.category}</CardTitle>
              <CardDescription>List of recent expenses for this budget allocation</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{format(new Date(expense.expense_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell>₱{expense.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={
                          expense.status === 'approved' ? 'default' :
                          expense.status === 'rejected' ? 'destructive' : 'secondary'
                        }>
                          {expense.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

      </div>
    </DashboardLayout>
  );
} 