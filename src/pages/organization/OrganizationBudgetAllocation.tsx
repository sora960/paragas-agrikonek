import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Loader2, 
  Plus, 
  WalletIcon, 
  Search 
} from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

// Define types
interface Farmer {
  id: string;
  full_name: string;
  farm_name: string;
  budget?: {
    total_allocation: number;
    remaining_balance: number;
  };
}

interface OrganizationData {
  id: string;
  name: string;
  budget: {
    total_allocation: number;
    remaining_balance: number;
  };
}

// Define the form schema
const allocationFormSchema = z.object({
  farmerId: z.string({
    required_error: "Please select a farmer",
  }),
  amount: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    },
    {
      message: "Amount must be a positive number",
    }
  ),
  description: z.string().min(5, {
    message: "Description must be at least 5 characters",
  }),
});

type AllocationFormValues = z.infer<typeof allocationFormSchema>;

export default function OrganizationBudgetAllocation() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organizationData, setOrganizationData] = useState<OrganizationData | null>(null);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [transactions, setTransactions] = useState<any[]>([]);
  
  // Set up the form
  const form = useForm<AllocationFormValues>({
    resolver: zodResolver(allocationFormSchema),
    defaultValues: {
      farmerId: "",
      amount: "",
      description: "Budget allocation",
    },
  });
  
  useEffect(() => {
    if (user?.id) {
      loadOrganizationData();
    }
  }, [user?.id]);
  
  // Reset form and selected farmer when dialog closes
  useEffect(() => {
    if (!dialogOpen) {
      form.reset();
      setSelectedFarmer(null);
    }
  }, [dialogOpen, form]);
  
  // Update selected farmer when farmerId changes
  useEffect(() => {
    const farmerId = form.watch("farmerId");
    if (farmerId) {
      const farmer = farmers.find(f => f.id === farmerId);
      setSelectedFarmer(farmer || null);
    } else {
      setSelectedFarmer(null);
    }
  }, [form.watch("farmerId"), farmers]);
  
  const loadOrganizationData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First get the organization for the current user
      const { data: orgData, error: orgError } = await supabase
        .from("organization_admins_view")
        .select("organization_id, organization_name")
        .eq("user_id", user?.id)
        .single();
      
      if (orgError) {
        console.error("Error loading organization:", orgError);
        throw new Error("Failed to load organization details. Make sure you are an organization admin.");
      }
      
      if (!orgData?.organization_id) {
        throw new Error("You are not associated with any organization as an admin.");
      }
      
      // Get the organization budget
      const { data: budgetData, error: budgetError } = await supabase
        .from("organization_budgets")
        .select("total_allocation, remaining_balance")
        .eq("organization_id", orgData.organization_id)
        .single();
      
      if (budgetError && budgetError.code !== "PGRST116") {
        console.error("Error loading budget:", budgetError);
      }
      
      // Set organization data
      setOrganizationData({
        id: orgData.organization_id,
        name: orgData.organization_name,
        budget: {
          total_allocation: budgetData?.total_allocation || 0,
          remaining_balance: budgetData?.remaining_balance || 0,
        },
      });
      
      // Load organization members (farmers)
      await loadFarmers(orgData.organization_id);
      
      // Load recent allocation transactions
      await loadRecentTransactions(orgData.organization_id);
      
    } catch (error: any) {
      console.error("Error loading organization data:", error);
      setError(error.message || "Failed to load organization details");
    } finally {
      setLoading(false);
    }
  };
  
  const loadFarmers = async (organizationId: string) => {
    try {
      // Get all farmers from this organization with their budget info
      const { data: farmerMembers, error: membersError } = await supabase
        .from("organization_members")
        .select(`
          farmer_id,
          farmer_profiles:farmer_id (
            id, 
            full_name, 
            farm_name
          )
        `)
        .eq("organization_id", organizationId)
        .eq("status", "active");
      
      if (membersError) {
        console.error("Error loading members:", membersError);
        throw new Error("Failed to load organization members");
      }
      
      if (!farmerMembers || farmerMembers.length === 0) {
        setFarmers([]);
        return;
      }
      
      // Extract farmer IDs
      const farmerIds = farmerMembers.map(m => m.farmer_id);
      
      // Get budget data for all farmers
      const { data: budgetsData, error: budgetsError } = await supabase
        .from("farmer_budgets")
        .select("farmer_id, total_allocation, remaining_balance")
        .eq("organization_id", organizationId)
        .in("farmer_id", farmerIds);
      
      if (budgetsError && budgetsError.code !== "PGRST116") {
        console.error("Error loading budgets:", budgetsError);
      }
      
      // Create a map of farmer_id to budget data
      const budgetMap = new Map();
      if (budgetsData) {
        budgetsData.forEach(budget => {
          budgetMap.set(budget.farmer_id, {
            total_allocation: budget.total_allocation || 0,
            remaining_balance: budget.remaining_balance || 0,
          });
        });
      }
      
      // Combine farmer and budget data
      const farmersWithBudget: Farmer[] = [];
      
      for (const member of farmerMembers) {
        // The farmer_profiles might be an array due to the join type
        const farmerProfile = Array.isArray(member.farmer_profiles) 
          ? member.farmer_profiles[0] 
          : member.farmer_profiles;
        
        if (!farmerProfile) continue;
        
        farmersWithBudget.push({
          id: farmerProfile.id,
          full_name: farmerProfile.full_name || "Unnamed Farmer",
          farm_name: farmerProfile.farm_name || "Unnamed Farm",
          budget: budgetMap.get(farmerProfile.id) || {
            total_allocation: 0,
            remaining_balance: 0,
          },
        });
      }
      
      setFarmers(farmersWithBudget);
      
    } catch (error: any) {
      console.error("Error loading farmers:", error);
      toast({
        title: "Error",
        description: "Failed to load farmers list",
        variant: "destructive",
      });
    }
  };
  
  const loadRecentTransactions = async (organizationId: string) => {
    try {
      // Check if the farmer_transactions table exists
      const { error: tableCheckError } = await supabase
        .from("farmer_transactions")
        .select("id", { count: "exact", head: true });
      
      if (tableCheckError) {
        // Table doesn't exist yet, use empty array
        console.warn("farmer_transactions table doesn't exist yet:", tableCheckError);
        setTransactions([]);
        return;
      }
      
      // Get recent transactions for this organization
      const { data: txData, error: txError } = await supabase
        .from("farmer_transactions")
        .select(`
          id,
          transaction_date,
          transaction_type,
          amount,
          description,
          status,
          farmer_id,
          farmer_profiles:farmer_id (full_name, farm_name)
        `)
        .eq("organization_id", organizationId)
        .eq("transaction_type", "allocation")
        .order("transaction_date", { ascending: false })
        .limit(10);
      
      if (txError) {
        console.error("Error loading transactions:", txError);
        return;
      }
      
      setTransactions(txData || []);
      
    } catch (error: any) {
      console.error("Error loading transactions:", error);
    }
  };
  
  const handleAllocateBudget = async (values: AllocationFormValues) => {
    try {
      setAllocating(true);
      setError(null);
      
      if (!organizationData?.id) {
        throw new Error("Organization data is missing");
      }
      
      const amount = parseFloat(values.amount);
      
      // First check if the organization has enough budget
      if (organizationData.budget.remaining_balance < amount) {
        throw new Error(`Insufficient organization budget. Available: ₱${organizationData.budget.remaining_balance.toLocaleString()}`);
      }
      
      // Call the RPC function to allocate budget
      const { data, error } = await supabase.rpc(
        "allocate_farmer_budget",
        {
          p_farmer_id: values.farmerId,
          p_organization_id: organizationData.id,
          p_amount: amount,
          p_description: values.description,
        }
      );
      
      if (error) {
        console.error("Error allocating budget:", error);
        
        // If the function doesn't exist yet, we'll need to do a direct DB operation
        if (error.code === "42883") { // undefined_function
          // First update farmer_budgets
          const { error: budgetError } = await supabase
            .from("farmer_budgets")
            .upsert(
              {
                farmer_id: values.farmerId,
                organization_id: organizationData.id,
                total_allocation: amount, // This will be added to existing value
                remaining_balance: amount, // This will be added to existing value
              },
              {
                onConflict: "farmer_id,organization_id",
                ignoreDuplicates: false,
              }
            );
          
          if (budgetError) {
            console.error("Error updating farmer budget:", budgetError);
            throw new Error("Failed to update farmer budget");
          }
          
          // Then insert a transaction record
          const { error: txError } = await supabase
            .from("farmer_transactions")
            .insert({
              farmer_id: values.farmerId,
              organization_id: organizationData.id,
              transaction_type: "allocation",
              amount,
              description: values.description,
              status: "completed",
              transaction_date: new Date().toISOString(),
            });
          
          if (txError) {
            console.error("Error recording transaction:", txError);
            throw new Error("Failed to record transaction");
          }
        } else {
          throw new Error(`Failed to allocate budget: ${error.message}`);
        }
      }
      
      // Success!
      toast({
        title: "Budget Allocated",
        description: `Successfully allocated ₱${amount.toLocaleString()} to the farmer`,
      });
      
      // Refresh data
      await loadOrganizationData();
      
      // Close the dialog
      setDialogOpen(false);
      
    } catch (error: any) {
      console.error("Error in budget allocation:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to allocate budget",
        variant: "destructive",
      });
    } finally {
      setAllocating(false);
    }
  };
  
  // Filter farmers based on search query
  const filteredFarmers = farmers.filter(farmer => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      (farmer.full_name && farmer.full_name.toLowerCase().includes(query)) ||
      (farmer.farm_name && farmer.farm_name.toLowerCase().includes(query))
    );
  });
  
  return (
    <DashboardLayout userRole="organization">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Budget Allocation</h1>
            <p className="text-muted-foreground">
              Allocate budget to farmers in your organization
            </p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                disabled={loading || !organizationData} 
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Allocate Budget
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Allocate Budget to Farmer</DialogTitle>
                <DialogDescription>
                  Add funds to a farmer's wallet for their agricultural activities
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleAllocateBudget)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="farmerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Farmer</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a farmer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {farmers.map((farmer) => (
                              <SelectItem key={farmer.id} value={farmer.id}>
                                {farmer.full_name || farmer.farm_name || "Unnamed Farmer"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select the farmer who will receive these funds
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {selectedFarmer && (
                    <div className="rounded-md bg-muted p-3">
                      <div className="text-sm font-medium">Current Budget</div>
                      <div className="mt-1 grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-xs text-muted-foreground">Total</div>
                          <div className="font-medium">₱{selectedFarmer.budget?.total_allocation.toLocaleString() || "0"}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Remaining</div>
                          <div className="font-medium text-green-600">₱{selectedFarmer.budget?.remaining_balance.toLocaleString() || "0"}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (₱)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Enter amount"
                            step="0.01"
                            min="0"
                            {...field}
                          />
                        </FormControl>
                        {organizationData && (
                          <FormDescription>
                            Organization available budget: ₱{organizationData.budget.remaining_balance.toLocaleString()}
                          </FormDescription>
                        )}
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
                            placeholder="Purpose of this budget allocation"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button 
                      type="submit" 
                      disabled={allocating || !organizationData}
                    >
                      {allocating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Allocating...
                        </>
                      ) : (
                        "Allocate Budget"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
        
        {error ? (
          <Card className="bg-destructive/10">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        ) : loading ? (
          <div className="flex justify-center items-center h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Organization Budget</CardTitle>
                <CardDescription>
                  Available funds for allocation to farmers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Total Budget</Label>
                    <div className="text-2xl font-bold">
                      ₱{organizationData?.budget.total_allocation.toLocaleString() || "0"}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Available for Allocation</Label>
                    <div className="text-2xl font-bold text-green-600">
                      ₱{organizationData?.budget.remaining_balance.toLocaleString() || "0"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Registered Farmers</CardTitle>
                  <CardDescription>
                    Farmers in your organization and their budget allocation
                  </CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search farmers..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Farmer Name</TableHead>
                      <TableHead>Farm Name</TableHead>
                      <TableHead>Total Allocated</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFarmers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                          {searchQuery 
                            ? "No farmers match your search" 
                            : "No farmers in your organization"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredFarmers.map((farmer) => (
                        <TableRow key={farmer.id}>
                          <TableCell className="font-medium">
                            {farmer.full_name || "Unnamed"}
                          </TableCell>
                          <TableCell>{farmer.farm_name}</TableCell>
                          <TableCell>₱{farmer.budget?.total_allocation.toLocaleString() || "0"}</TableCell>
                          <TableCell>
                            <Badge variant={
                              !farmer.budget?.remaining_balance ? "outline" :
                              farmer.budget.remaining_balance > 0 ? "default" : "secondary"
                            }>
                              ₱{farmer.budget?.remaining_balance.toLocaleString() || "0"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                form.setValue("farmerId", farmer.id);
                                setDialogOpen(true);
                              }}
                            >
                              <WalletIcon className="mr-2 h-4 w-4" />
                              Add Funds
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Allocations</CardTitle>
                <CardDescription>
                  Recent budget allocations to farmers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Farmer</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                          No recent allocations
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell>
                            {new Date(tx.transaction_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium">
                            {tx.farmer_profiles?.full_name || tx.farmer_profiles?.farm_name || "Unnamed Farmer"}
                          </TableCell>
                          <TableCell>{tx.description}</TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            ₱{tx.amount.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
} 