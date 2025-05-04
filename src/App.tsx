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
import SuperAdminUsers from "./pages/SuperAdminUsers";
import SuperAdminReports from "./pages/SuperAdminReports";
import SuperAdminSettings from "./pages/SuperAdminSettings";
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
import OrganizationBudget from "./pages/organization/OrganizationBudget";
import OrganizationExpenses from "./pages/organization/OrganizationExpenses";
import OrganizationDetails from "./pages/organization/OrganizationDetails";
import MessagingPage from "./pages/MessagingPage";
import NotificationSettings from "./pages/NotificationSettings";
import OrganizationAdminDashboard from "./pages/organization-admin/OrganizationAdminDashboard";
import OrganizationAdminMembers from "./pages/organization-admin/OrganizationAdminMembers";
import OrganizationApplications from "./pages/organization-admin/OrganizationApplications";
import OrganizationAdminMessaging from "./pages/organization-admin/OrganizationAdminMessaging";
import { useEffect } from "react";
import { testSupabaseConnection } from "./lib/supabase";
import Organization from "./pages/farmer/Organization";
import Apply from "./pages/farmer/Apply";
import FarmerMessaging from "./pages/farmer/FarmerMessaging";

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
                        <RegionsManager />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/superadmin/organizations" 
                    element={
                      <ProtectedRoute allowedRoles={["superadmin"]}>
                        <SuperAdminOrganizations />
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
                  
                  {/* Regional Admin routes */}
                  <Route 
                    path="/regional" 
                    element={
                      <ProtectedRoute allowedRoles={["regional_admin"]}>
                        <RegionalDashboard />
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
                      <ProtectedRoute allowedRoles={["org_admin", "organization_admin"]}>
                        <OrganizationDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/organization/profile" 
                    element={
                      <ProtectedRoute allowedRoles={["org_admin"]}>
                        <OrganizationProfile />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/organization/members" 
                    element={
                      <ProtectedRoute allowedRoles={["org_admin"]}>
                        <OrganizationMembers />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/organization/budget" 
                    element={
                      <ProtectedRoute allowedRoles={["org_admin"]}>
                        <OrganizationBudget />
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
                    path="/farmer/apply" 
                    element={
                      <ProtectedRoute allowedRoles={["farmer"]}>
                        <Apply />
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
                  
                  {/* Add notification settings route */}
                  <Route 
                    path="/settings/notifications" 
                    element={
                      <ProtectedRoute allowedRoles={["farmer", "org_admin", "regional_admin", "superadmin"]}>
                        <NotificationSettings />
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
