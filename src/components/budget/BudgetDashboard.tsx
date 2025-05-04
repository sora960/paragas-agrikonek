import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { reportingService } from "@/services/reportingService";
import { BudgetReport, OrganizationReport } from "@/services/reportingService";
import BudgetOverviewWidget from "@/components/budget/widgets/BudgetOverviewWidget";
import BudgetAllocationWidget from "@/components/budget/widgets/BudgetAllocationWidget";
import BudgetUtilizationWidget from "@/components/budget/widgets/BudgetUtilizationWidget";
import ApprovalQueueWidget from "@/components/budget/widgets/ApprovalQueueWidget";

interface BudgetDashboardProps {
  regionId?: string;
  organizationId?: string;
  userRole: 'regional_admin' | 'organization_admin' | 'super_admin';
}

export default function BudgetDashboard({ regionId, organizationId, userRole }: BudgetDashboardProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [budgetData, setBudgetData] = useState<BudgetReport | OrganizationReport | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    loadBudgetData();
  }, [regionId, organizationId]);

  const loadBudgetData = async () => {
    try {
      setLoading(true);
      const fiscalYear = new Date().getFullYear();

      if (regionId) {
        const data = await reportingService.generateRegionalReport(regionId, fiscalYear);
        setBudgetData(data);
      } else if (organizationId) {
        const data = await reportingService.generateOrganizationReport(organizationId, fiscalYear);
        setBudgetData(data);
      }
    } catch (error) {
      console.error('Error loading budget data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading budget dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Budget Management Dashboard</h1>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="allocations">Allocations</TabsTrigger>
          <TabsTrigger value="utilization">Utilization</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <BudgetOverviewWidget data={budgetData} userRole={userRole} />
        </TabsContent>

        <TabsContent value="allocations" className="space-y-4">
          <BudgetAllocationWidget 
            data={budgetData} 
            userRole={userRole}
            regionId={regionId}
            organizationId={organizationId}
          />
        </TabsContent>

        <TabsContent value="utilization" className="space-y-4">
          <BudgetUtilizationWidget 
            data={budgetData}
            userRole={userRole}
          />
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4">
          <ApprovalQueueWidget 
            userRole={userRole}
            regionId={regionId}
            organizationId={organizationId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
} 