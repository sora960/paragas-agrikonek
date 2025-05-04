import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BudgetReport, OrganizationReport } from "@/services/reportingService";

interface BudgetOverviewWidgetProps {
  data: BudgetReport | OrganizationReport | null;
  userRole: 'regional_admin' | 'organization_admin' | 'super_admin';
}

export default function BudgetOverviewWidget({ data, userRole }: BudgetOverviewWidgetProps) {
  if (!data) return null;

  const isRegionalReport = 'allocation_by_region' in data;
  const totalBudget = isRegionalReport ? data.total_budget : data.total_allocation;
  const utilizedAmount = isRegionalReport ? data.total_utilized : data.utilized_amount;
  const remainingAmount = isRegionalReport ? 
    (data.total_budget - data.total_utilized) : 
    data.remaining_amount;
  
  const utilizationPercentage = (utilizedAmount / totalBudget) * 100;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle>Total Budget</CardTitle>
          <CardDescription>
            {isRegionalReport ? 'Regional Allocation' : 'Organization Budget'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₱{totalBudget.toLocaleString()}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Utilized Amount</CardTitle>
          <CardDescription>Current Spending</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₱{utilizedAmount.toLocaleString()}</div>
          <Progress 
            value={utilizationPercentage} 
            className="mt-2"
          />
          <p className="text-sm text-muted-foreground mt-1">
            {utilizationPercentage.toFixed(1)}% of total budget
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Remaining Budget</CardTitle>
          <CardDescription>Available for Allocation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₱{remainingAmount.toLocaleString()}</div>
          <Progress 
            value={(remainingAmount / totalBudget) * 100} 
            className="mt-2"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Budget Health</CardTitle>
          <CardDescription>Overall Status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${
            utilizationPercentage > 90 ? 'text-red-500' :
            utilizationPercentage > 75 ? 'text-yellow-500' :
            'text-green-500'
          }`}>
            {utilizationPercentage > 90 ? 'Critical' :
             utilizationPercentage > 75 ? 'Warning' :
             'Healthy'}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Based on current utilization rate
          </p>
        </CardContent>
      </Card>

      {isRegionalReport && (
        <Card className="md:col-span-2 lg:col-span-4">
          <CardHeader>
            <CardTitle>Monthly Spending Trend</CardTitle>
            <CardDescription>Last 6 months of expenditure</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] grid grid-cols-6 gap-2 items-end">
              {Object.entries(data.monthly_spending).slice(-6).map(([month, amount]) => {
                const height = (amount / Math.max(...Object.values(data.monthly_spending))) * 100;
                return (
                  <div key={month} className="flex flex-col items-center">
                    <div 
                      className="w-full bg-primary rounded-t"
                      style={{ height: `${height}%` }}
                    />
                    <p className="text-sm mt-2">{month.split('-')[1]}</p>
                    <p className="text-xs text-muted-foreground">
                      ₱{(amount / 1000).toFixed(0)}k
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 