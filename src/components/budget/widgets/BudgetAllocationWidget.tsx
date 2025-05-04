import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { BudgetReport, OrganizationReport } from "@/services/reportingService";
import { approvalService } from "@/services/approvalService";

const getRemainingAmount = (data: BudgetReport | OrganizationReport | null): number => {
  if (!data) return 0;
  
  if ('remaining_amount' in data) {
    return data.remaining_amount;
  }
  
  return data.total_budget - data.total_allocated;
};

interface BudgetAllocationWidgetProps {
  data: BudgetReport | OrganizationReport | null;
  userRole: 'regional_admin' | 'organization_admin' | 'super_admin';
  regionId?: string;
  organizationId?: string;
}

export default function BudgetAllocationWidget({ 
  data, 
  userRole, 
  regionId, 
  organizationId 
}: BudgetAllocationWidgetProps) {
  const { toast } = useToast();
  const [showAllocationDialog, setShowAllocationDialog] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<{ id: string; name: string; } | null>(null);
  const [allocationAmount, setAllocationAmount] = useState("");

  const isRegionalReport = 'allocation_by_region' in data;
  const allocations = isRegionalReport ? 
    Object.entries(data?.allocation_by_region || {}).map(([name, amount]) => ({
      name,
      amount,
      utilized: data?.utilization_by_category?.[name] || 0
    })) :
    [];

  const handleAllocation = async () => {
    if (!selectedEntity) return;

    try {
      const amount = parseFloat(allocationAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Invalid amount");
      }

      // Create approval workflow for the allocation
      const workflow = await approvalService.createApprovalWorkflow(
        'budget_increase',
        amount,
        selectedEntity.id
      );

      setShowAllocationDialog(false);
      setAllocationAmount("");
      setSelectedEntity(null);

      toast({
        title: "Allocation Request Created",
        description: "The budget allocation request has been submitted for approval.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create allocation request",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Budget Allocations</CardTitle>
          <CardDescription>
            {isRegionalReport ? 'Organization-wise budget distribution' : 'Department-wise allocation'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Allocated Amount</TableHead>
                <TableHead>Utilization</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allocations.map((allocation) => (
                <TableRow key={allocation.name}>
                  <TableCell>{allocation.name}</TableCell>
                  <TableCell>₱{allocation.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={(allocation.utilized / allocation.amount) * 100}
                        className="w-[60px]"
                      />
                      <span className="text-sm">
                        {((allocation.utilized / allocation.amount) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedEntity({ id: allocation.name, name: allocation.name });
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
              Allocate budget to {selectedEntity?.name}
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
                Available: ₱{getRemainingAmount(data).toLocaleString()}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAllocationDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAllocation}>
              Submit for Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 