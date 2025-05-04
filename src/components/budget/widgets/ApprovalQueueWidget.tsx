import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { approvalService } from "@/services/approvalService";
import { auditService } from "@/services/auditService";

interface ApprovalQueueWidgetProps {
  userRole: 'regional_admin' | 'organization_admin' | 'super_admin';
  regionId?: string;
  organizationId?: string;
}

interface PendingApproval {
  id: string;
  workflow_id: string;
  request_type: string;
  amount: number;
  organization_name: string;
  submitted_at: string;
  current_step: number;
  status: string;
}

export default function ApprovalQueueWidget({ 
  userRole, 
  regionId, 
  organizationId 
}: ApprovalQueueWidgetProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
  const [approvalNotes, setApprovalNotes] = useState("");

  useEffect(() => {
    loadPendingApprovals();
  }, [userRole, regionId, organizationId]);

  const loadPendingApprovals = async () => {
    try {
      setLoading(true);
      const approvals = await approvalService.getPendingApprovals(userRole);
      setPendingApprovals(approvals);
    } catch (error) {
      console.error('Error loading pending approvals:', error);
      toast({
        title: "Error",
        description: "Failed to load pending approvals",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalAction = async (decision: 'approve' | 'reject') => {
    if (!selectedApproval) return;

    try {
      await approvalService.processApprovalStep(
        selectedApproval.workflow_id,
        selectedApproval.id,
        decision,
        approvalNotes
      );

      // Log the approval action
      await auditService.logAction(
        'approval',
        'request',
        selectedApproval.id,
        {
          decision,
          notes: approvalNotes,
          amount: selectedApproval.amount
        }
      );

      setShowApprovalDialog(false);
      setSelectedApproval(null);
      setApprovalNotes("");
      loadPendingApprovals();

      toast({
        title: `Request ${decision === 'approve' ? 'Approved' : 'Rejected'}`,
        description: `The budget request has been ${decision === 'approve' ? 'approved' : 'rejected'}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process approval",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <div className="text-lg">Loading approvals...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
          <CardDescription>Budget requests requiring your attention</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingApprovals.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No pending approvals at this time
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Request Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingApprovals.map((approval) => (
                  <TableRow key={approval.id}>
                    <TableCell>{approval.organization_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {approval.request_type.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>₱{approval.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge>Step {approval.current_step}</Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(approval.submitted_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedApproval(approval);
                            setShowApprovalDialog(true);
                          }}
                        >
                          Review
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Budget Request</DialogTitle>
            <DialogDescription>
              {selectedApproval?.organization_name} - ₱{selectedApproval?.amount.toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Add your approval or rejection notes..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter className="space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowApprovalDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleApprovalAction('reject')}
            >
              Reject
            </Button>
            <Button
              onClick={() => handleApprovalAction('approve')}
            >
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 