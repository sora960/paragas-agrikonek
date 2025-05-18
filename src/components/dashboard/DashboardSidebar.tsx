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
  Receipt,
  MessageCircle,
  User,
  UserPlus,
  Building,
  Megaphone,
  Search,
  Wallet,
  BellRing,
  FileText,
  CircleDollarSign,
  CurrencyIcon,
  Banknote,
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
  const { user, signOut } = useAuth();
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (error) {
      console.error("Logout error", error);
    }
  };
  
  // Get dashboard path based on role
  const getDashboardPath = () => {
    switch (role) {
      case "farmer": return "/farmer";
      case "organization": 
      case "organization_admin": return "/organization-admin";
      case "regional":
      case "regional_admin": return "/regional";
      case "superadmin": return "/superadmin";
      default: return "/";
    }
  };
  
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
      { label: "Users", path: "/superadmin/users", icon: Users },
      { label: "User Management", path: "/superadmin/user-management", icon: UserPlus },
      { label: "Regions", path: "/superadmin/regions", icon: Map },
      { label: "Organizations", path: "/superadmin/organizations", icon: Building },
      { label: "Budget Management", path: "/superadmin/budget-management", icon: Banknote },
      { label: "Budget Requests", path: "/superadmin/budget-requests", icon: Receipt },
      { label: "Settings", path: "/superadmin/settings", icon: Settings },
    ],
    regional: [
      { label: "Dashboard", path: "/regional", icon: LayoutDashboard },
      { label: "Organizations", path: "/regional/organizations", icon: Building },
      { label: "Farmers", path: "/regional/farmers", icon: Users },
      { label: "Budget Center", path: "/regional/budget-center", icon: Wallet },
      { label: "Budget Management", path: "/regional/budget-management", icon: Banknote },
      { label: "Request Budget", path: "/regional/request-budget", icon: CircleDollarSign },
      { label: "Messages", path: "/regional/messages", icon: MessageCircle },
      { label: "Settings", path: "/regional/settings", icon: Settings },
    ],
    organization: [
      { label: "Dashboard", path: "/organization-admin", icon: LayoutDashboard },
      { label: "Members", path: "/organization-admin/members", icon: Users },
      { label: "Applications", path: "/organization-admin/applications", icon: UserPlus },
      { label: "Announcements", path: "/organization-admin/announcements", icon: Megaphone },
      { label: "Messages", path: "/organization-admin/messages", icon: MessageCircle },
      { label: "Budget Center", path: "/organization/budget-center", icon: Wallet },
      { label: "Budget Distribution", path: "/organization/budget-distribution", icon: Banknote },
      { label: "Region Assignment", path: "/organization/settings/region", icon: Map },
      { label: "Expenses", path: "/organization/expenses", icon: Receipt },
      { label: "Reports", path: "/organization/reports", icon: BarChart3 },
    ],
    farmer: [
      { label: "Dashboard", path: "/farmer", icon: LayoutDashboard },
      { label: "Profile", path: "/farmer/profile", icon: User },
      { label: "Organization", path: "/farmer/organization", icon: Building },
      { label: "Announcements", path: "/farmer/announcements", icon: Megaphone },
      { label: "Apply", path: "/farmer/apply", icon: UserPlus },
      { label: "Messages", path: "/farmer/messages", icon: MessageCircle },
      { label: "Wallet", path: "/farmer/wallet", icon: Wallet },
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
        <Link to={getDashboardPath()} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold">
            D
          </div>
          <h1 className="text-xl font-bold">DAgriKonek</h1>
        </Link>
      </div>
      
      <nav className="space-y-1">
        {currentMenuItems && currentMenuItems.map((item) => {
          let isActive = false;
          
          if (normalizedRole === "superadmin") {
            if (item.label === "Dashboard") {
              // Make Dashboard active only on the exact root superadmin path
              isActive = location.pathname === "/superadmin";
            } else if (item.label === "Regions") {
              // Check for exact match or paths starting with /superadmin/regions
              isActive = location.pathname.startsWith("/superadmin/regions");
            } else {
              // For other items, check if the path matches or starts with the item path
              isActive = location.pathname === item.path || 
                        (item.path !== "/" && 
                        location.pathname.startsWith(item.path));
            }
          } else if (normalizedRole === "regional") {
            if (item.label === "Dashboard") {
              isActive = location.pathname === "/regional";
            } else if (item.label === "Organizations") {
              isActive = location.pathname === "/regional/organizations";
            } else {
              isActive = location.pathname === item.path || 
                        (item.path !== "/" && 
                        location.pathname.startsWith(item.path));
            }
          } else if (normalizedRole === "organization") {
            if (item.label === "Dashboard") {
              // Only match the exact organization admin dashboard path
              isActive = location.pathname === "/organization-admin";
            } else if (item.label === "Members") {
              isActive = location.pathname.startsWith("/organization-admin/members");
            } else if (item.label === "Applications") {
              isActive = location.pathname.startsWith("/organization-admin/applications");
            } else if (item.label === "Messages") {
              isActive = location.pathname.startsWith("/organization-admin/messages");
            } else if (item.label === "Announcements") {
              isActive = location.pathname.startsWith("/organization-admin/announcements");
            } else {
              isActive = location.pathname === item.path || 
                        (item.path !== "/" && 
                        location.pathname.startsWith(item.path));
            }
          } else if (normalizedRole === "farmer") {
            if (item.label === "Dashboard") {
              // Only match the exact farmer dashboard path
              isActive = location.pathname === "/farmer";
            } else {
              isActive = location.pathname === item.path || 
                        (item.path !== "/" && 
                        location.pathname.startsWith(item.path));
            }
          } else {
            isActive = location.pathname === item.path || 
                      (item.path !== "/" && 
                      location.pathname.startsWith(item.path));
          }
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
        {normalizedRole === "regional" && (
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
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-destructive/10 text-foreground hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
} 