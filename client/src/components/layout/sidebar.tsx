import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  MapPin,
  Users,
  PieChart,
  LogOut,
  Menu,
  X,
  ShoppingBag,
  Globe,
  Shield,
  Code,
  Image,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const navigationItems = [
  { id: "dashboard", label: "Dashboard", icon: PieChart },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "locations", label: "Locations", icon: MapPin },
  { id: "profile", label: "Profile", icon: User },
  { id: "users", label: "User Access", icon: Users, adminOnly: true },
  { id: "api-connections", label: "API Connections", icon: Globe, adminOnly: true },
  { id: "recaptcha", label: "reCAPTCHA", icon: Shield, adminOnly: true },
  { id: "footer", label: "Footer", icon: Code, adminOnly: true },
  { id: "logo", label: "Logo", icon: Image, adminOnly: true },
];

export default function Sidebar({ activeSection, onSectionChange, isOpen, onToggle }: SidebarProps) {
  const { user, isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch logo settings
  const { data: logoSettings } = useQuery({
    queryKey: ["/api/logo-settings"],
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/login");
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    },
  });

  const handleSectionChange = (section: string) => {
    onSectionChange(section);
    if (window.innerWidth < 768) {
      onToggle(); // Close sidebar on mobile after selection
    }
  };

  const filteredItems = navigationItems.filter(item => 
    !item.adminOnly || isAdmin
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 w-64 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out fixed md:relative z-50 h-full",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* Header */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center space-y-2 w-full">
              {logoSettings?.logoPath ? (
                <div className="w-48 h-48 rounded-xl overflow-hidden">
                  <img 
                    src={logoSettings.logoPath} 
                    alt="Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
              )}
              <div className="text-center">
                <h1 className="text-sm font-bold text-white">Website Sales</h1>
                <p className="text-xs text-slate-300">
                  {user?.role === 'admin' ? 'Administrator' : 'User Dashboard'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden text-slate-300 hover:text-white hover:bg-slate-700"
              onClick={onToggle}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleSectionChange(item.id)}
                className={cn(
                  "w-full flex items-center px-4 py-3 rounded-xl text-left transition-all duration-200 group",
                  isActive
                    ? "text-white bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg transform scale-105"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/50 hover:transform hover:scale-102"
                )}
              >
                <Icon className={cn(
                  "mr-3 h-5 w-5 transition-colors",
                  isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                )} />
                <span className="font-medium">{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>
        
        {/* User Info */}
        <div className="p-4 border-t border-slate-700">
          <div className="mb-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="text-xs text-slate-400 mb-1">Logged in as</div>
            <div className="text-sm font-medium text-white truncate">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="text-xs text-slate-400 truncate">
              {user?.email}
            </div>
          </div>
          
          <Button
            variant="ghost"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-700/50"
          >
            <LogOut className="mr-3 h-5 w-5" />
            {logoutMutation.isPending ? "Signing Out..." : "Sign Out"}
          </Button>
        </div>
      </div>
    </>
  );
}
