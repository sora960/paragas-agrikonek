import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
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
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "@radix-ui/react-icons";

interface ApprovedBy {
  first_name: string;
  last_name: string;
}

interface Expense {
  id: string;
  organization_id: string;
  budget_allocation_id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: ApprovedBy;
  approved_at?: string;
}

interface BudgetAllocation {
  id: string;
  category: string;
  allocated_amount: number;
  utilized_amount: number;
  remaining_amount: number;
}

export default function OrganizationExpenses() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [allocations, setAllocations] = useState<BudgetAllocation[]>([]);
  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    date: new Date(),
    category: "",
    description: "",
    amount: ""
  });

  useEffect(() => {
    loadExpenseData();
  }, []);

  const loadExpenseData = async () => {
    try {
      setLoading(true);
      
      // First get the organization ID for the current user
      const { data: orgMember, error: orgError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('farmer_id', user?.id)
        .single();

      if (orgError) throw orgError;

      // Get budget allocations
      const { data: allocationsData, error: allocError } = await supabase
        .from('budget_allocations')
        .select('id, category, allocated_amount, utilized_amount, remaining_amount')
        .order('category');

      if (allocError) throw allocError;
      setAllocations(allocationsData || []);

      // Get expenses
      const { data: expensesData, error: expenseError } = await supabase
        .from('organization_expenses')
        .select(`
          *,
          approved_by (
            first_name,
            last_name
          )
        `)
        .eq('organization_id', orgMember.organization_id)
        .order('date', { ascending: false });

      if (expenseError) throw expenseError;
      setExpenses(expensesData || []);

    } catch (error) {
      console.error('Error loading expense data:', error);
      toast({
        title: "Error",
        description: "Failed to load expense information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createExpense = async () => {
    if (!newExpense.category || !newExpense.description || !newExpense.amount) return;

    try {
      const amount = parseFloat(newExpense.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Invalid amount");
      }

      // Get the allocation for this category
      const allocation = allocations.find(a => a.id === newExpense.category);
      if (!allocation) {
        throw new Error("Invalid budget allocation");
      }

      // Check if expense exceeds remaining budget
      if (amount > allocation.remaining_amount) {
        throw new Error("Expense amount exceeds remaining budget for this category");
      }

      // Get organization ID
      const { data: orgMember, error: orgError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('farmer_id', user?.id)
        .single();

      if (orgError) throw orgError;

      // Create the expense
      const { error: expenseError } = await supabase
        .from('organization_expenses')
        .insert({
          organization_id: orgMember.organization_id,
          budget_allocation_id: newExpense.category,
          date: format(newExpense.date, 'yyyy-MM-dd'),
          description: newExpense.description,
          amount: amount,
          status: 'pending'
        });

      if (expenseError) throw expenseError;

      setIsNewExpenseOpen(false);
      setNewExpense({
        date: new Date(),
        category: "",
        description: "",
        amount: ""
      });
      loadExpenseData();

      toast({
        title: "Expense Created",
        description: "New expense has been recorded and is pending approval.",
      });
    } catch (error: any) {
      console.error('Error creating expense:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create expense. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout userRole="organization">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Expense Management</h1>
          <Dialog open={isNewExpenseOpen} onOpenChange={setIsNewExpenseOpen}>
            <DialogTrigger asChild>
              <Button>Record Expense</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record New Expense</DialogTitle>
                <DialogDescription>
                  Record a new expense against a budget allocation.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newExpense.date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newExpense.date ? format(newExpense.date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={newExpense.date}
                        onSelect={(date) => setNewExpense(prev => ({ ...prev, date: date || new Date() }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Budget Category</Label>
                  <Select
                    value={newExpense.category}
                    onValueChange={(value) => setNewExpense(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {allocations.map((allocation) => (
                        <SelectItem key={allocation.id} value={allocation.id}>
                          {allocation.category} (₱{allocation.remaining_amount.toLocaleString()} remaining)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Label>Amount (₱)</Label>
                  <Input
                    type="number"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="Enter amount"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsNewExpenseOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createExpense}>Record Expense</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Expenses</CardTitle>
            <CardDescription>Track and manage organization expenses.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approved By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      Loading expenses...
                    </TableCell>
                  </TableRow>
                ) : expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      No expenses recorded
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{format(new Date(expense.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        {allocations.find(a => a.id === expense.budget_allocation_id)?.category}
                      </TableCell>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell>₱{expense.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            expense.status === 'approved' ? 'default' :
                            expense.status === 'rejected' ? 'destructive' : 'secondary'
                          }
                        >
                          {expense.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {expense.approved_by ? 
                          `${expense.approved_by.first_name} ${expense.approved_by.last_name}` : 
                          '-'
                        }
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
} 