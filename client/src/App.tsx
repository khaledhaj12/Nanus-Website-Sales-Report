import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

// Pages
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Reports from "@/pages/reports";

import Locations from "@/pages/locations";
import Profile from "@/pages/profile";
import Users from "@/pages/users";

import ApiConnections from "@/pages/api-connections";
import Recaptcha from "@/pages/recaptcha";
import FooterSettings from "@/pages/footer-settings";
import LogoPage from "@/pages/logo";
import Help from "@/pages/help";
import NotFound from "@/pages/not-found";

// Layout
import Sidebar from "@/components/layout/sidebar";
import Footer from "@/components/layout/footer";

function AppRouter() {
  const { isAuthenticated, isLoading, isAdmin, permissions } = useAuth();
  const [, setLocation] = useLocation();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        setLocation("/login");
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route component={Login} />
      </Switch>
    );
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
  };

  const renderPage = () => {
    const commonProps = { onMenuClick: toggleSidebar };

    // Helper function to check if user has permission to view a page
    const hasPageAccess = (pageId: string) => {
      // Admin users have access to all admin pages
      if (isAdmin) return true;
      
      // Everyone has access to profile and home/dashboard
      if (pageId === 'profile' || pageId === 'home' || pageId === 'dashboard') return true;
      
      // Check specific permissions for other pages
      return permissions[pageId]?.canView === true;
    };

    // Get the first accessible page for this user
    const getDefaultPage = () => {
      if (isAdmin) return 'dashboard';
      
      // For non-admin users, find the first page they have access to
      const accessiblePages = ['dashboard', 'reports', 'locations'];
      for (const page of accessiblePages) {
        if (hasPageAccess(page)) return page;
      }
      return 'profile'; // Fallback to profile if no other access
    };

    // If user doesn't have access to the current section, redirect to default
    if (!hasPageAccess(activeSection)) {
      const defaultPage = getDefaultPage();
      if (activeSection !== defaultPage) {
        setActiveSection(defaultPage);
      }
      return renderPageComponent(defaultPage, commonProps);
    }

    return renderPageComponent(activeSection, commonProps);
  };

  const renderPageComponent = (section: string, commonProps: any) => {
    switch (section) {
      case "home":
      case "dashboard":
        return <Dashboard {...commonProps} />;
      case "reports":
        return <Reports {...commonProps} />;
      case "locations":
        return <Locations {...commonProps} />;
      case "profile":
        return <Profile {...commonProps} />;
      case "users":
        return isAdmin ? <Users {...commonProps} /> : <Dashboard {...commonProps} />;
      case "api-connections":
        return isAdmin ? <ApiConnections {...commonProps} /> : <Dashboard {...commonProps} />;
      case "recaptcha":
        return isAdmin ? <Recaptcha {...commonProps} /> : <Dashboard {...commonProps} />;
      case "footer":
        return isAdmin ? <FooterSettings {...commonProps} /> : <Dashboard {...commonProps} />;
      case "logo":
        return isAdmin ? <LogoPage {...commonProps} /> : <Dashboard {...commonProps} />;
      case "help":
        return isAdmin ? <Help {...commonProps} /> : <Dashboard {...commonProps} />;
      default:
        return <Dashboard {...commonProps} />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <div className="flex flex-1">
        <Sidebar
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          isOpen={sidebarOpen}
          onToggle={toggleSidebar}
        />
        {renderPage()}
      </div>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppRouter />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
