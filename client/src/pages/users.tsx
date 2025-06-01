import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/layout/header";
import UserModal from "@/components/modals/user-modal";
import { Edit, Plus, MapPin, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface UserLocationAccessProps {
  userId: number;
  locations: any[];
}

function UserLocationAccess({ userId, locations }: UserLocationAccessProps) {
  const { data: userAccess = [] } = useQuery({
    queryKey: ["/api/users", userId, "locations"],
  });

  const accessibleLocations = locations.filter((loc: any) => 
    (userAccess as number[]).includes(loc.id)
  );

  return (
    <div className="mt-2">
      <p className="text-xs text-gray-500 mb-1">Location Access:</p>
      {accessibleLocations.length === 0 ? (
        <span className="text-xs text-gray-400">No locations assigned</span>
      ) : (
        <div className="flex flex-wrap gap-1">
          {accessibleLocations.map((location: any) => (
            <Badge key={location.id} variant="outline" className="text-xs">
              <MapPin className="mr-1 h-3 w-3" />
              {location.name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

interface UsersProps {
  onMenuClick: () => void;
}

export default function Users({ onMenuClick }: UsersProps) {
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["/api/users"],
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["/api/locations"],
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="User Access" onMenuClick={onMenuClick} />
        <main className="flex-1 overflow-auto p-4 md:p-6 bg-slate-50">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const getRoleBadgeStyle = (role: string) => {
    return role === 'admin' 
      ? "bg-red-100 text-red-800" 
      : "bg-blue-100 text-blue-800";
  };

  const getRoleLabel = (role: string) => {
    return role === 'admin' ? 'Administrator' : 'View Only';
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="User Access Management" onMenuClick={onMenuClick} />
      
      <main className="flex-1 overflow-auto p-4 md:p-6 bg-slate-50">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>User Access Management</CardTitle>
              <Button onClick={() => setIsUserModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {users.map((user: any) => (
                <div key={user.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {user.firstName && user.lastName 
                          ? `${user.firstName} ${user.lastName}`
                          : user.username}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {user.email || `${user.username}@company.com`} • {getRoleLabel(user.role)}
                      </p>
                      {user.role !== 'admin' && (
                        <UserLocationAccess userId={user.id} locations={locations as any[]} />
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getRoleBadgeStyle(user.role)}>
                        {getRoleLabel(user.role)}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setEditingUser(user);
                          setIsUserModalOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>

      <UserModal 
        isOpen={isUserModalOpen}
        onClose={() => {
          setIsUserModalOpen(false);
          setEditingUser(null);
        }}
        editingUser={editingUser}
      />
    </div>
  );
}
