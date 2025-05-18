import { ReactNode, useState } from "react";
import DashboardSidebar from "./DashboardSidebar";
import { SimpleThemeToggle } from "./SimpleThemeToggle";
import { ChevronDown, LogOut, User } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { NotificationBell } from "../ui/notifications/NotificationBell";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

interface DashboardLayoutProps {
  children: ReactNode;
  userRole: "superadmin" | "regional" | "organization" | "farmer";
  userName?: string;
}

export default function DashboardLayout({ 
  children, 
  userRole,
  userName = "User"
}: DashboardLayoutProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  
  // Get user name based on role for display
  const getUserDisplayName = () => {
    switch (userRole) {
      case "superadmin": return "Super Admin";
      case "regional": return "Regional Manager";
      case "organization": return "Organization Admin";
      case "farmer": return "Farmer";
      default: return "User";
    }
  };
  
  // Get profile path based on role
  const getProfilePath = () => {
    switch (userRole) {
      case "farmer": return "/farmer/profile";
      case "organization": return "/organization/profile";
      case "regional": return "/regional/profile";
      case "superadmin": return "/superadmin/settings";
      default: return "/profile";
    }
  };
  
  // Get dashboard path based on role
  const getDashboardPath = () => {
    switch (userRole) {
      case "farmer": return "/farmer";
      case "organization": return "/organization-admin";
      case "regional": return "/regional";
      case "superadmin": return "/superadmin";
      default: return "/";
    }
  };
  
  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (error) {
      console.error("Logout error", error);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar role={userRole} />
      <div className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur flex justify-between items-center p-4">
          <Link to={getDashboardPath()} className="text-2xl font-bold text-primary">
            DAgriKonek
          </Link>
          <div className="flex items-center gap-4">
            <SimpleThemeToggle />
            
            {/* Notification Bell */}
            <NotificationBell />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <div className="rounded-full bg-primary/10 p-2 text-primary">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="hidden md:flex flex-col items-start">
                    <span className="text-sm font-medium">{userName}</span>
                    <span className="text-xs text-muted-foreground">{getUserDisplayName()}</span>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {userRole !== "superadmin" && (
                  <DropdownMenuItem asChild>
                    <Link to={getProfilePath()}>Profile</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/settings/notifications">Notification Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="p-4 md:p-8">
          {children}
        </main>
        <footer className="text-center text-muted-foreground text-sm p-4 border-t border-border">
          <p>© 2024 DAgriKonek. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
