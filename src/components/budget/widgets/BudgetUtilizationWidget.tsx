import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BudgetReport, OrganizationReport } from "@/services/reportingService";

interface BudgetUtilizationWidgetProps {
  data: BudgetReport | OrganizationReport | null;
  userRole: 'regional_admin' | 'organization_admin' | 'super_admin';
}

export default function BudgetUtilizationWidget({ data, userRole }: BudgetUtilizationWidgetProps) {
  if (!data) return null;

  const isRegionalReport = 'allocation_by_region' in data;
  const categories = isRegionalReport ? 
    Object.entries(data.utilization_by_category || {}) :
    Object.entries(data.spending_by_category || {});

  const totalSpending = categories.reduce((sum, [_, amount]) => sum + amount, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Spending by Category</CardTitle>
          <CardDescription>Breakdown of budget utilization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categories.map(([category, amount]) => {
              const percentage = (amount / totalSpending) * 100;
              return (
                <div key={category} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{category}</span>
                    <span>₱{amount.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{percentage.toFixed(1)}% of total spending</span>
                    <span>{(amount / 1000).toFixed(0)}k PHP</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {isRegionalReport && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Trends</CardTitle>
            <CardDescription>Spending patterns over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-end space-x-2">
              {Object.entries(data.monthly_spending).map(([month, amount]) => {
                const maxAmount = Math.max(...Object.values(data.monthly_spending));
                const height = (amount / maxAmount) * 100;
                const isCurrentMonth = month === new Date().toISOString().slice(0, 7);

                return (
                  <div
                    key={month}
                    className="flex-1 flex flex-col items-center"
                  >
                    <div
                      className={`w-full rounded-t transition-all ${
                        isCurrentMonth ? 'bg-primary' : 'bg-primary/60'
                      }`}
                      style={{ height: `${height}%` }}
                    />
                    <div className="mt-2 text-center">
                      <div className="text-sm font-medium">
                        {new Date(month).toLocaleString('default', { month: 'short' })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ₱{(amount / 1000).toFixed(0)}k
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Utilization Metrics</CardTitle>
          <CardDescription>Key performance indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="text-sm font-medium">Burn Rate</div>
              <div className="text-2xl font-bold">
                {isRegionalReport ? 
                  ((data.total_utilized / data.total_budget) * 100).toFixed(1) :
                  ((data.utilized_amount / data.total_allocation) * 100).toFixed(1)
                }%
              </div>
              <div className="text-xs text-muted-foreground">
                Of total budget utilized
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-sm font-medium">Average Monthly Spend</div>
              <div className="text-2xl font-bold">
                ₱{(totalSpending / 12).toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                Based on current fiscal year
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-sm font-medium">Efficiency Score</div>
              <div className="text-2xl font-bold">
                {calculateEfficiencyScore(data)}%
              </div>
              <div className="text-xs text-muted-foreground">
                Based on spending patterns
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function calculateEfficiencyScore(data: BudgetReport | OrganizationReport): number {
  // Calculate efficiency score based on:
  // 1. Consistent spending patterns
  // 2. Balanced category distribution
  // 3. Appropriate burn rate
  
  const isRegionalReport = 'allocation_by_region' in data;
  const burnRate = isRegionalReport ?
    (data.total_utilized / data.total_budget) :
    (data.utilized_amount / data.total_allocation);

  // Ideal burn rate should be proportional to the time passed in the fiscal year
  const currentMonth = new Date().getMonth() + 1;
  const idealBurnRate = currentMonth / 12;
  
  // Calculate variance from ideal burn rate (lower is better)
  const burnRateScore = Math.max(0, 100 - Math.abs(burnRate - idealBurnRate) * 100);

  // For simplicity, return the burn rate score
  // In a real implementation, you would factor in more metrics
  return Math.round(burnRateScore);
} 