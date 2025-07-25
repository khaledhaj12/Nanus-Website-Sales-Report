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
      case "home":
        return <Dashboard {...commonProps} />;
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
