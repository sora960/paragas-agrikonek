import { ReactNode, useState } from "react";
import DashboardSidebar from "./DashboardSidebar";
import { SimpleThemeToggle } from "./SimpleThemeToggle";
import { ChevronDown, User } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { NotificationBell } from "../ui/notifications/NotificationBell";
import { Link } from "react-router-dom";

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

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar role={userRole} />
      <div className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur flex justify-between items-center p-4">
          <h2 className="text-2xl font-bold text-primary">AgriConnect</h2>
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
                <DropdownMenuItem asChild>
                  <Link to="/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings/notifications">Notification Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="p-4 md:p-8">
          {children}
        </main>
        <footer className="text-center text-muted-foreground text-sm p-4 border-t border-border">
          <p>© 2024 AgriConnect. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
