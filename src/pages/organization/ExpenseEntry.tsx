import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, ShieldAlert } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function ExpenseEntry() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [organizationId, setOrganizationId] = useState<string | null>(searchParams.get("org"));
  const [organizationName, setOrganizationName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingDirectSql, setUsingDirectSql] = useState(false);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);

  const [expense, setExpense] = useState({
    amount: "",
    description: "",
    category: "",
    expense_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (!organizationId) {
      fetchOrganization();
    } else {
      fetchOrganizationName();
    }
    fetchCategories();
  }, [user, organizationId]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("budget_categories")
        .select("id, name")
        .order("name");
      
      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  const fetchOrganization = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      console.log("Fetching organization for user:", user.id);
      
      // Try direct SQL approach first
      try {
        const { data: directData, error: directError } = await supabase.rpc(
          'admin_execute_sql',
          {
            sql_query: `
              SELECT om.organization_id, o.name
              FROM organization_members om
              JOIN farmer_profiles fp ON om.farmer_id = fp.id
              JOIN organizations o ON om.organization_id = o.id
              WHERE fp.user_id = '${user.id}'
              AND om.role = 'org_admin'
              LIMIT 1
            `
          }
        );
        
        if (directError) {
          console.error("Direct SQL error:", directError);
          throw directError;
        }
        
        if (directData && directData.length > 0) {
          console.log("Found organization via direct SQL:", directData[0]);
          setUsingDirectSql(true);
          setOrganizationId(directData[0].organization_id);
          setOrganizationName(directData[0].name || "");
        } else {
          console.log("No organization found via direct SQL");
          setError("You are not an admin of any organization.");
        }
      } catch (err: any) {
        console.error("Error in direct SQL approach:", err);
        setError("Failed to fetch organization information: " + (err.message || "Unknown error"));
      }
    } catch (err: any) {
      console.error("Overall fetch error:", err);
      setError(err.message || "Failed to fetch organization information");
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizationName = async () => {
    if (!organizationId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", organizationId)
        .single();
        
      if (!error && data) {
        setOrganizationName(data.name);
      } else {
        // Try direct SQL
        const { data: directData, error: directError } = await supabase.rpc(
          'admin_execute_sql',
          {
            sql_query: `
              SELECT name FROM organizations
              WHERE id = '${organizationId}'
              LIMIT 1
            `
          }
        );
        
        if (directError) throw directError;
        if (directData && directData.length > 0) {
          setUsingDirectSql(true);
          setOrganizationName(directData[0].name || "");
        }
      }
    } catch (err: any) {
      console.error("Error fetching organization name:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setExpense(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setExpense(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) {
      toast({
        title: "Error",
        description: "No organization selected",
        variant: "destructive"
      });
      return;
    }

    if (!expense.amount || isNaN(parseFloat(expense.amount)) || parseFloat(expense.amount) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }

    if (!expense.description) {
      toast({
        title: "Error",
        description: "Please enter a description",
        variant: "destructive"
      });
      return;
    }

    if (!expense.expense_date) {
      toast({
        title: "Error",
        description: "Please select a date",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      // Try direct SQL insert for better performance
      const { data: result, error: insertError } = await supabase.rpc(
        'admin_execute_sql',
        {
          sql_query: `
            INSERT INTO organization_expenses (
              organization_id,
              amount,
              description,
              category,
              expense_date,
              created_by
            ) VALUES (
              '${organizationId}',
              ${parseFloat(expense.amount)},
              '${expense.description.replace(/'/g, "''")}',
              '${expense.category.replace(/'/g, "''")}',
              '${expense.expense_date}',
              '${user?.id}'
            )
            RETURNING id
          `
        }
      );

      if (insertError) throw insertError;
      
      toast({
        title: "Success",
        description: "Expense recorded successfully!"
      });
      
      // Reset form or navigate back
      navigate("/organization/budget-center");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save expense",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout userRole="organization">
        <div className="flex justify-center items-center h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="organization">
      <div className="max-w-3xl mx-auto mt-10 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Record Expense</h1>
          {usingDirectSql && (
            <div className="bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 text-sm px-3 py-1 rounded-md flex items-center">
              <ShieldAlert className="h-4 w-4 mr-2" />
              Using elevated permissions
            </div>
          )}
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-md">
            {error}
          </div>
        )}

        {organizationId ? (
          <Card>
            <CardHeader>
              <CardTitle>New Expense</CardTitle>
              <CardDescription>Record a new expense for {organizationName}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₱)</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    placeholder="Enter amount"
                    value={expense.amount}
                    onChange={handleChange}
                    required
                    min="0.01"
                    step="0.01"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Enter expense description"
                    value={expense.description}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={expense.category} 
                    onValueChange={(value) => handleSelectChange("category", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="expense_date">Date</Label>
                  <Input
                    id="expense_date"
                    name="expense_date"
                    type="date"
                    value={expense.expense_date}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="flex justify-end space-x-4 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => navigate("/organization/budget-center")}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Expense"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No Organization</CardTitle>
              <CardDescription>
                You don't have permission to record expenses for any organization.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                Please contact your administrator if you believe this is an error.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
} 