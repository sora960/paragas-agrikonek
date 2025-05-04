import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Map,
  Users,
  Settings,
  Calendar,
  Cloud,
  Package,
  LogOut,
  Building2,
  Wheat,
  BarChart3,
  DollarSign,
  Receipt,
  MessageCircle,
  User,
  UserPlus,
  Building,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMessaging } from "@/hooks/useMessaging";
import { useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";

interface DashboardSidebarProps {
  role: "superadmin" | "regional" | "regional_admin" | "organization" | "organization_admin" | "farmer";
}

export default function DashboardSidebar({ role }: DashboardSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useMessaging();
  const { user } = useAuth();
  
  // Redirect if on incorrect messaging route
  useEffect(() => {
    // If user is org admin and they're at /messages, redirect them
    if (location.pathname === "/messages" && 
        (role === "organization" || role === "organization_admin" || 
         user?.role === "org_admin" || user?.role === "organization_admin")) {
      navigate("/organization-admin/messages", { replace: true });
    }
    
    // If user is farmer and they're at /messages, redirect them
    if (location.pathname === "/messages" && 
        (role === "farmer" || user?.role === "farmer")) {
      navigate("/farmer/messages", { replace: true });
    }
  }, [location.pathname, role, user?.role, navigate]);
  
  // Normalize role to handle both "organization" and "organization_admin"
  const normalizedRole = role === "organization_admin" ? "organization" : 
                        role === "regional_admin" ? "regional" : role;
  
  // Define menu items based on role with icons
  const menuItems = {
    superadmin: [
      { label: "Dashboard", path: "/superadmin", icon: LayoutDashboard },
      { label: "Regions", path: "/superadmin/regions", icon: Map },
      { label: "Organizations", path: "/superadmin/organizations", icon: Building2 },
      { label: "Users", path: "/superadmin/users", icon: Users },
      { label: "Reports", path: "/superadmin/reports", icon: BarChart3 },
      { label: "Settings", path: "/superadmin/settings", icon: Settings },
    ],
    regional: [
      { label: "Dashboard", path: "/regional", icon: LayoutDashboard },
      { label: "Organizations", path: "/regional/organizations", icon: Building2 },
      { label: "Farmers", path: "/regional/farmers", icon: Users },
      { label: "Crops", path: "/regional/crops", icon: Wheat },
      { label: "Reports", path: "/regional/reports", icon: BarChart3 },
    ],
    organization: [
      { label: "Dashboard", path: "/organization-admin", icon: LayoutDashboard },
      { label: "Members", path: "/organization-admin/members", icon: Users },
      { label: "Applications", path: "/organization-admin/applications", icon: UserPlus },
      { label: "Messages", path: "/organization-admin/messages", icon: MessageCircle },
      { label: "Budget", path: "/organization/budget", icon: DollarSign },
      { label: "Expenses", path: "/organization/expenses", icon: Receipt },
      { label: "Reports", path: "/organization/reports", icon: BarChart3 },
    ],
    farmer: [
      { label: "Dashboard", path: "/farmer", icon: LayoutDashboard },
      { label: "Profile", path: "/farmer/profile", icon: User },
      { label: "Organization", path: "/farmer/organization", icon: Building },
      { label: "Apply", path: "/farmer/apply", icon: UserPlus },
      { label: "Messages", path: "/farmer/messages", icon: MessageCircle },
      { label: "Plots", path: "/farmer/plots", icon: Map },
      { label: "Crops", path: "/farmer/crops", icon: Wheat },
      { label: "Calendar", path: "/farmer/calendar", icon: Calendar },
      { label: "Resources", path: "/farmer/resources", icon: Package },
      { label: "Weather", path: "/farmer/weather", icon: Cloud },
    ],
  };

  const currentMenuItems = menuItems[normalizedRole];

  return (
    <aside className="w-64 bg-card border-r border-border min-h-screen p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-8 p-2">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold">
            AC
          </div>
          <h1 className="text-xl font-bold">AgriConnect</h1>
        </Link>
      </div>
      
      <nav className="space-y-1">
        {currentMenuItems && currentMenuItems.map((item) => {
          // Check if pathname starts with the menu item path (for nested routes)
          const isActive = location.pathname === item.path || 
                          (item.path !== "/" && location.pathname.startsWith(item.path));
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                isActive 
                  ? "bg-primary/10 text-primary font-medium" 
                  : "hover:bg-primary/10 text-foreground hover:text-primary"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
              {item.label === "Messages" && unreadCount > 0 && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {unreadCount}
                </Badge>
              )}
            </Link>
          );
        })}

        {/* Messaging link for superadmin and regional roles - uses the generic /messages path */}
        {normalizedRole !== "farmer" && normalizedRole !== "organization" && (
          <Link
            to="/messages"
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
              location.pathname === "/messages" 
                ? "bg-primary/10 text-primary font-medium" 
                : "hover:bg-primary/10 text-foreground hover:text-primary"
            }`}
          >
            <MessageCircle className="h-4 w-4" />
            <span>Messages</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-auto text-xs">
                {unreadCount}
              </Badge>
            )}
          </Link>
        )}
      </nav>
      
      <div className="mt-auto pt-4">
        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-destructive/10 text-foreground hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </Link>
      </div>
    </aside>
  );
} 