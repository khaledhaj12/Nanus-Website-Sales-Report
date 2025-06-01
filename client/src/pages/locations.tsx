import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/layout/header";
import { Edit, Plus } from "lucide-react";

interface LocationsProps {
  onMenuClick: () => void;
}

export default function Locations({ onMenuClick }: LocationsProps) {
  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["/api/locations"],
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Locations" onMenuClick={onMenuClick} />
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Locations" onMenuClick={onMenuClick} />
      
      <main className="flex-1 overflow-auto p-4 md:p-6 bg-slate-50">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Locations</CardTitle>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Location
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {locations.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No locations found. Locations will be created automatically when you upload sales data.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {locations.map((location: any) => (
                  <div key={location.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{location.name}</h4>
                        <p className="text-sm text-gray-600">
                          Created from data upload on {new Date(location.createdAt).toLocaleDateString()}
                        </p>
                        {location.code && (
                          <p className="text-sm text-gray-500">Code: {location.code}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={location.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                          {location.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
