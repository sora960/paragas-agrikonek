import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { organizationService } from '@/services/organizationService';
import type { FinancialReport } from '@/types/organization';

interface FinancialReportingSectionProps {
  organizationId: string;
}

export function FinancialReportingSection({ organizationId }: FinancialReportingSectionProps) {
  const { toast } = useToast();
  const [reports, setReports] = useState<FinancialReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewReportOpen, setIsNewReportOpen] = useState(false);
  const [newReport, setNewReport] = useState({
    type: '',
    amount: '',
    description: ''
  });

  useEffect(() => {
    loadReports();
  }, [organizationId]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await organizationService.getFinancialReports(organizationId);
      setReports(data);
    } catch (error) {
      console.error('Error loading reports:', error);
      toast({
        title: "Error",
        description: "Failed to load financial reports",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReport = async () => {
    try {
      if (!newReport.type || !newReport.amount || !newReport.description) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return;
      }

      const report = {
        organization_id: organizationId,
        report_type: newReport.type as 'expense' | 'income' | 'budget_request',
        fiscal_year: new Date().getFullYear(),
        amount: parseFloat(newReport.amount),
        description: newReport.description,
        status: 'submitted' as const
      };

      await organizationService.createFinancialReport(report);
      
      setIsNewReportOpen(false);
      setNewReport({ type: '', amount: '', description: '' });
      loadReports();

      toast({
        title: "Success",
        description: "Financial report submitted successfully"
      });
    } catch (error) {
      console.error('Error submitting report:', error);
      toast({
        title: "Error",
        description: "Failed to submit financial report",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Financial Reports</span>
          <Dialog open={isNewReportOpen} onOpenChange={setIsNewReportOpen}>
            <DialogTrigger asChild>
              <Button>New Report</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Financial Report</DialogTitle>
                <DialogDescription>
                  Submit a new financial report for review
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Select
                    value={newReport.type}
                    onValueChange={(value) => setNewReport(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="budget_request">Budget Request</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={newReport.amount}
                    onChange={(e) => setNewReport(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Textarea
                    placeholder="Description"
                    value={newReport.description}
                    onChange={(e) => setNewReport(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsNewReportOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitReport}>Submit Report</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4">Loading reports...</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No reports found</div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="border rounded-lg p-4 flex justify-between items-center"
              >
                <div>
                  <h4 className="font-medium">
                    {report.report_type.charAt(0).toUpperCase() + report.report_type.slice(1)}
                  </h4>
                  <p className="text-sm text-gray-500">{report.description}</p>
                  <p className="text-sm font-medium">
                    Amount: ${report.amount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(report.status)}`}>
                    {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 