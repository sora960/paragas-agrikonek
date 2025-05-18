// Update the import paths in App.tsx to use the correct AuthProvider import
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom";
import { AuthProvider } from "@/lib/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Unauthorized from "./pages/Unauthorized";
import SupabaseConnectionTest from "./components/SupabaseConnectionTest";
import { ThemeProvider } from "./lib/ThemeProvider";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import SuperAdminRegions from "./pages/SuperAdminRegions";
import RegionsManager from "./pages/RegionsManager";
import SuperAdminOrganizations from "./pages/SuperAdminOrganizations";
import OrganizationsPage from "./pages/OrganizationsPage";
import SuperAdminUsers from "./pages/SuperAdminUsers";
import SuperAdminReports from "./pages/SuperAdminReports";
import SuperAdminSettings from "./pages/SuperAdminSettings";
import UserManagement from "./pages/admin/UserManagement";
import RegionalDashboard from "./pages/RegionalDashboard";
import OrganizationDashboard from "./pages/OrganizationDashboard";
import FarmerDashboard from "./pages/FarmerDashboard";
import FarmerCrops from "./pages/farmer/Crops";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import TestConnection from "./pages/TestConnection";
import Plots from "./pages/farmer/Plots";
import Profile from "./pages/farmer/Profile";
import OrganizationProfile from "./pages/organization/OrganizationProfile";
import OrganizationMembers from "./pages/organization/OrganizationMembers";
import OrganizationBudgetDistribution from "./pages/organization/OrganizationBudget";
import OrganizationExpenses from "./pages/organization/OrganizationExpenses";
import OrganizationDetails from "./pages/organization/OrganizationDetails";
import OrganizationBudgetCenter from "./pages/organization/OrganizationBudgetCenter";
import ExpenseEntry from "./pages/organization/ExpenseEntry";
import MessagingPage from "./pages/MessagingPage";
import NotificationSettings from "./pages/NotificationSettings";
import OrganizationAdminDashboard from "./pages/organization-admin/OrganizationAdminDashboard";
import OrganizationAdminMembers from "./pages/organization-admin/OrganizationAdminMembers";
import OrganizationApplications from "./pages/organization-admin/OrganizationApplications";
import OrganizationAdminMessaging from "./pages/organization-admin/OrganizationAdminMessaging";
import OrganizationAnnouncements from "./pages/organization-admin/OrganizationAnnouncements";
import FarmerOrganizationAnnouncements from "./pages/farmer/OrganizationAnnouncements";
import { useEffect } from "react";
import { testSupabaseConnection } from "./lib/supabase";
import Organization from "./pages/farmer/Organization";
import Apply from "./pages/farmer/Apply";
import FarmerMessaging from "./pages/farmer/FarmerMessaging";
import FarmerWallet from "./pages/farmer/FarmerWallet";
import FarmerBudgetRequest from "./pages/farmer/FarmerBudgetRequest";
import TestAuthFunctions from "./lib/TestAuthFunctions";
import BudgetManagement from "./pages/BudgetManagement";
import RegionalBudgetManagement from "./pages/RegionalBudgetManagement";
import RegionView from "./pages/RegionView";
import RequestBudget from "./pages/regional/RequestBudget";
import SuperAdminBudgetRequests from "./pages/SuperAdminBudgetRequests";
import Organizations from "./pages/regional/Organizations";
import RegionAssignment from "./pages/organization/RegionAssignment";
import BudgetCenter from "./pages/regional/budget-center";
import FarmerCalendar from "./pages/farmer/Calendar";
import Resources from "./pages/farmer/Resources";
import Weather from "./pages/farmer/Weather";
import RegionalSettings from "./pages/regional/Settings";
import RegionalOrganizationMessaging from "./pages/regional/RegionalOrganizationMessaging";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Test Supabase connection on app initialization
    const testConnection = async () => {
      await testSupabaseConnection();
    };
    
    testConnection();
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <AuthProvider>
              <NotificationProvider>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/unauthorized" element={<Unauthorized />} />
                  <Route path="/test" element={<TestConnection />} />
                  
                  {/* Messaging routes - one route for each user role */}
                  
                  {/* General messaging route for regional admins and superadmins */}
                  <Route 
                    path="/messages" 
                    element={
                      <ProtectedRoute allowedRoles={["regional_admin", "superadmin"]}>
                        <MessagingPage />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Redirect organization admins visiting /messages to their specific route */}
                  <Route 
                    path="/messages-redirect-org-admin" 
                    element={
                      <ProtectedRoute allowedRoles={["org_admin", "organization_admin"]}>
                        <Navigate to="/organization-admin/messages" replace />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Super Admin routes */}
                  <Route 
                    path="/superadmin" 
                    element={
                      <ProtectedRoute allowedRoles={["superadmin"]}>
                        <SuperAdminDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/superadmin/regions" 
                    element={
                      <ProtectedRoute allowedRoles={["superadmin"]}>
                        <SuperAdminRegions />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/superadmin/organizations" 
                    element={
                      <ProtectedRoute allowedRoles={["superadmin"]}>
                        <OrganizationsPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/superadmin/organizations/:id" 
                    element={
                      <ProtectedRoute allowedRoles={["superadmin"]}>
                        <OrganizationDetails />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/superadmin/users" 
                    element={
                      <ProtectedRoute allowedRoles={["superadmin"]}>
                        <SuperAdminUsers />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/user-management" 
                    element={
                      <ProtectedRoute allowedRoles={["superadmin"]}>
                        <UserManagement />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/superadmin/user-management" 
                    element={
                      <ProtectedRoute allowedRoles={["superadmin"]}>
                        <UserManagement />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/superadmin/reports" 
                    element={
                      <ProtectedRoute allowedRoles={["superadmin"]}>
                        <SuperAdminReports />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/superadmin/settings" 
                    element={
                      <ProtectedRoute allowedRoles={["superadmin"]}>
                        <SuperAdminSettings />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/superadmin/budget-management" 
                    element={
                      <ProtectedRoute allowedRoles={["superadmin"]}>
                        <BudgetManagement />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/superadmin/region-search" 
                    element={
                      <ProtectedRoute allowedRoles={["superadmin"]}>
                        <RegionsManager />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/superadmin/budget-requests" 
                    element={
                      <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
                        <SuperAdminBudgetRequests />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Regional Admin routes */}
                  <Route 
                    path="/regional/request-budget" 
                    element={
                      <ProtectedRoute allowedRoles={["regional_admin"]}>
                        <RequestBudget />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/regional/organizations" 
                    element={
                      <ProtectedRoute allowedRoles={["regional_admin"]}>
                        <Organizations />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/regional/budget-center" 
                    element={
                      <ProtectedRoute allowedRoles={["regional_admin"]}>
                        <BudgetCenter />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/regional/budget-management" 
                    element={
                      <ProtectedRoute allowedRoles={["regional_admin"]}>
                        <RegionalBudgetManagement />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/regional/org-messages" 
                    element={
                      <ProtectedRoute allowedRoles={["regional_admin"]}>
                        <RegionalOrganizationMessaging />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/regional/settings" 
                    element={
                      <ProtectedRoute allowedRoles={["regional_admin"]}>
                        <RegionalSettings />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/regional/*" 
                    element={
                      <ProtectedRoute allowedRoles={["regional_admin"]}>
                        <RegionalDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Organization Admin routes */}
                  <Route 
                    path="/organization-admin" 
                    element={
                      <ProtectedRoute allowedRoles={["org_admin", "organization_admin"]}>
                        <OrganizationAdminDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/organization-admin/members" 
                    element={
                      <ProtectedRoute allowedRoles={["org_admin", "organization_admin"]}>
                        <OrganizationAdminMembers />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/organization-admin/applications" 
                    element={
                      <ProtectedRoute allowedRoles={["org_admin", "organization_admin"]}>
                        <OrganizationApplications />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/organization-admin/announcements" 
                    element={
                      <ProtectedRoute allowedRoles={["org_admin", "organization_admin"]}>
                        <OrganizationAnnouncements />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/organization-admin/messages" 
                    element={
                      <ProtectedRoute allowedRoles={["org_admin", "organization_admin"]}>
                        <OrganizationAdminMessaging />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Organization routes */}
                  <Route 
                    path="/organization" 
                    element={
                      <ProtectedRoute allowedRoles={["org_admin", "organization_admin", "farmer"]}>
                        <OrganizationDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/organization/profile" 
                    element={
                      <ProtectedRoute allowedRoles={["org_admin", "organization_admin", "farmer"]}>
                        <OrganizationProfile />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/organization/members" 
                    element={
                      <ProtectedRoute allowedRoles={["org_admin", "organization_admin", "farmer"]}>
                        <OrganizationMembers />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/organization/budget-management" 
                    element={
                      <ProtectedRoute allowedRoles={["org_admin"]}>
                        <OrganizationBudgetCenter />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/organization/budget-distribution" 
                    element={
                      <ProtectedRoute allowedRoles={["org_admin"]}>
                        <OrganizationBudgetDistribution />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/organization/expenses" 
                    element={
                      <ProtectedRoute allowedRoles={["org_admin"]}>
                        <OrganizationExpenses />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/organization/settings/region" 
                    element={
                      <ProtectedRoute allowedRoles={["org_admin", "organization_admin"]}>
                        <RegionAssignment />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/organization/budget-center" 
                    element={
                      <ProtectedRoute allowedRoles={["org_admin", "organization_admin"]}>
                        <OrganizationBudgetCenter />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/organization/expense-entry" 
                    element={
                      <ProtectedRoute allowedRoles={["org_admin"]}>
                        <ExpenseEntry />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Farmer routes */}
                  <Route 
                    path="/farmer" 
                    element={
                      <ProtectedRoute allowedRoles={["farmer"]}>
                        <FarmerDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/farmer/profile" 
                    element={
                      <ProtectedRoute allowedRoles={["farmer"]}>
                        <Profile />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/farmer/organization" 
                    element={
                      <ProtectedRoute allowedRoles={["farmer"]}>
                        <Organization />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/farmer/announcements" 
                    element={
                      <ProtectedRoute allowedRoles={["farmer"]}>
                        <FarmerOrganizationAnnouncements />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/farmer/apply" 
                    element={
                      <ProtectedRoute allowedRoles={["farmer"]}>
                        <Apply />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/farmer/wallet" 
                    element={
                      <ProtectedRoute allowedRoles={["farmer"]}>
                        <FarmerWallet />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/farmer/budget-request" 
                    element={
                      <ProtectedRoute allowedRoles={["farmer"]}>
                        <FarmerBudgetRequest />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/farmer/plots" 
                    element={
                      <ProtectedRoute allowedRoles={["farmer"]}>
                        <Plots />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/farmer/crops" 
                    element={
                      <ProtectedRoute allowedRoles={["farmer"]}>
                        <FarmerCrops />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/farmer/messages" 
                    element={
                      <ProtectedRoute allowedRoles={["farmer"]}>
                        <FarmerMessaging />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/farmer/calendar" 
                    element={
                      <ProtectedRoute allowedRoles={["farmer"]}>
                        <FarmerCalendar />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/farmer/resources" 
                    element={
                      <ProtectedRoute allowedRoles={["farmer"]}>
                        <Resources />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/farmer/weather" 
                    element={
                      <ProtectedRoute allowedRoles={["farmer"]}>
                        <Weather />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Add notification settings route */}
                  <Route 
                    path="/settings/notifications" 
                    element={
                      <ProtectedRoute allowedRoles={["farmer", "org_admin", "regional_admin", "superadmin"]}>
                        <NotificationSettings />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/test-auth" 
                    element={<TestAuthFunctions />} 
                  />
                  
                  <Route 
                    path="/superadmin/regions/budget/:regionId" 
                    element={
                      <ProtectedRoute allowedRoles={["superadmin"]}>
                        <RegionalBudgetManagement />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/superadmin/regions/:regionId" 
                    element={
                      <ProtectedRoute allowedRoles={["superadmin"]}>
                        <RegionView />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </NotificationProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
