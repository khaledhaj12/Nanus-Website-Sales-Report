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
import WooOrders from "@/pages/woo-orders";
import Locations from "@/pages/locations";
import Users from "@/pages/users";
import Upload from "@/pages/upload";
import Notes from "@/pages/notes";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

// Layout
import Sidebar from "@/components/layout/sidebar";

function AppRouter() {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
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

    switch (activeSection) {
      case "dashboard":
        return <Dashboard {...commonProps} />;
      case "reports":
        return <Reports {...commonProps} />;
      case "woo-orders":
        return <WooOrders {...commonProps} />;
      case "locations":
        return <Locations {...commonProps} />;
      case "users":
        return isAdmin ? <Users {...commonProps} /> : <Dashboard {...commonProps} />;
      case "upload":
        return isAdmin ? <Upload {...commonProps} /> : <Dashboard {...commonProps} />;
      case "notes":
        return isAdmin ? <Notes {...commonProps} /> : <Dashboard {...commonProps} />;
      case "settings":
        return isAdmin ? <Settings {...commonProps} /> : <Dashboard {...commonProps} />;
      default:
        return <Dashboard {...commonProps} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
      />
      {renderPage()}
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
