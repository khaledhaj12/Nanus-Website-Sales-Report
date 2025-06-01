import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/layout/header";
import UserModal from "@/components/modals/user-modal";
import { Edit, Plus } from "lucide-react";

interface UsersProps {
  onMenuClick: () => void;
}

export default function Users({ onMenuClick }: UsersProps) {
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["/api/users"],
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
                        <p className="text-sm text-gray-500">
                          Location access will be shown here
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getRoleBadgeStyle(user.role)}>
                        {getRoleLabel(user.role)}
                      </Badge>
                      <Button variant="ghost" size="sm">
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
        onClose={() => setIsUserModalOpen(false)}
      />
    </div>
  );
}
