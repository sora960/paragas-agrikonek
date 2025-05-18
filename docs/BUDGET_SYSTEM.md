# AgriConnect Budget System Documentation

## Overview

The AgriConnect budget system manages the allocation and tracking of funds from superadmins to regions, and from regions to organizations. This document explains the key concepts, database structure, and conventions used throughout the system.

## Fiscal Year Convention

The fiscal year in AgriConnect is defined as the **next calendar year**. For example, in 2024, the active fiscal year is 2025.

```typescript
// This utility function is available in src/utils/formatters.ts
export const getCurrentFiscalYear = (): number => {
  return new Date().getFullYear() + 1;
};
```

This convention is used consistently across all budget-related components and services.

## Database Structure

The budget system involves several key tables:

1. **region_budgets**:
   - Tracks the total budget allocated to each region
   - Key fields: `region_id`, `fiscal_year`, `amount`, `allocated`

2. **organization_budgets**:
   - Tracks the budget allocated to each organization
   - Key fields: `organization_id`, `fiscal_year`, `total_allocation`, `remaining_balance`

3. **budget_requests**:
   - Stores requests for additional budget from regional admins to superadmins
   - Key fields: `region_id`, `user_id`, `requested_amount`, `reason`, `status` (pending/approved/rejected)

Note: The `organization_budgets` table does not contain a `region_id` field. The relationship between organizations and regions is established through the `region_id` field in the `organizations` table.

## Budget Flow

1. **Budget Allocation (Superadmin → Region)**:
   - Superadmins allocate budget amounts to regions
   - This creates/updates records in the `region_budgets` table

2. **Budget Request (Regional Admin → Superadmin)**:
   - Regional admins request additional budget
   - Superadmins approve/reject these requests
   - Approved requests increase the region's budget

3. **Budget Distribution (Regional Admin → Organizations)**:
   - Regional admins allocate portions of their budget to organizations in their region
   - This creates/updates records in the `organization_budgets` table

## Permission System

The system implements Row Level Security (RLS) in Supabase, which sometimes requires using the `admin_execute_sql` function to bypass permissions for certain operations.

## Currency Format

All monetary values are stored as numbers in the database and formatted as Philippine Peso (₱) in the UI.

```typescript
// This utility function is available in src/utils/formatters.ts
export const formatCurrency = (amount: number | string | null | undefined): string => {
  // Implementation details...
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
};
```

## Key Components

1. **RequestBudget** (`/regional/request-budget`):
   - Allows regional admins to request additional budget from superadmins
   - Shows history of previous requests

2. **BudgetCenter** (`/regional/budget-center`):
   - Displays the region's current budget and transaction history
   - Shows both inflows (approved requests) and outflows (allocations to organizations)

3. **BudgetManagement** (`/regional/budget-management`):
   - Enables regional admins to allocate their budget to various organizations
   - Provides visualization of allocated vs. remaining budget

## Important Considerations

- Always use the `getCurrentFiscalYear()` function when referencing the fiscal year
- Use the `formatCurrency()` function for consistent currency display
- Remember that the relationship between organizations and budgets is established through the organization's region assignment

## Troubleshooting

If you encounter permission issues when accessing budget data:
1. Check if the RLS policies are correctly set up in Supabase
2. Consider using the direct SQL execution approach with `admin_execute_sql` for operations that require elevated privileges 