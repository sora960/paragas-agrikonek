import { useAuth } from "@/lib/AuthContext";
import { Navigate, useLocation } from "react-router-dom";

export function ProtectedRoute({ 
  children, 
  allowedRoles = [] 
}: { 
  children: React.ReactNode;
  allowedRoles?: string[];
}) {
  const { user, loading, userRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#4F772D]">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check user role if roles are specified
  const role = user.role || userRole;
  
  if (allowedRoles.length > 0 && role) {
    // Map roles for compatibility
    const normalizedRole = role === "regional_admin" ? "regional" : 
                          role === "organization_admin" ? "org_admin" : role;
    
    // Check if the user's role (or its normalized version) is allowed
    const hasPermission = allowedRoles.includes(role) || 
                         allowedRoles.includes(normalizedRole);
    
    if (!hasPermission) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
}
