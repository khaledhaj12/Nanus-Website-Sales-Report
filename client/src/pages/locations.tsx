import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Header from "@/components/layout/header";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Edit, Plus, Trash2, MapPin, Building2, Users } from "lucide-react";

interface LocationsProps {
  onMenuClick: () => void;
}

export default function Locations({ onMenuClick }: LocationsProps) {
  const [selectedLocations, setSelectedLocations] = useState<number[]>([]);
  const [editingLocation, setEditingLocation] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["/api/locations"],
  });

  const deleteLocationsMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await apiRequest("DELETE", "/api/locations", { ids });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Locations deleted successfully",
      });
      setSelectedLocations([]);
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
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

  const locationCards = [
    {
      title: "Total Locations",
      value: (locations as any[]).length.toString(),
      icon: Building2,
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: "Active Locations",
      value: (locations as any[]).filter((loc: any) => loc.isActive).length.toString(),
      icon: MapPin,
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      title: "Inactive Locations",
      value: (locations as any[]).filter((loc: any) => !loc.isActive).length.toString(),
      icon: Users,
      bgColor: "bg-gray-50",
      iconColor: "text-gray-600",
    },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Locations" onMenuClick={onMenuClick} />
      
      <main className="flex-1 overflow-auto p-4 md:p-6 bg-slate-50">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {locationCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <Card key={index} className="border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{card.title}</p>
                      <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                    </div>
                    <div className={`p-3 ${card.bgColor} rounded-full`}>
                      <Icon className={`${card.iconColor} h-6 w-6`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Location Management</CardTitle>
              <div className="flex items-center space-x-2">
                {selectedLocations.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteLocationsMutation.mutate(selectedLocations)}
                    disabled={deleteLocationsMutation.isPending}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete {selectedLocations.length} location{selectedLocations.length > 1 ? 's' : ''}
                  </Button>
                )}
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Location
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {(locations as any[]).length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                <p className="text-gray-500">No locations found. Locations will be created automatically when you upload sales data.</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={(locations as any[]).length > 0 && selectedLocations.length === (locations as any[]).length}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedLocations((locations as any[]).map((location: any) => location.id));
                            } else {
                              setSelectedLocations([]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Location Name</TableHead>
                      <TableHead>Created Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(locations as any[]).map((location: any) => (
                      <TableRow key={location.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedLocations.includes(location.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedLocations([...selectedLocations, location.id]);
                              } else {
                                setSelectedLocations(selectedLocations.filter(id => id !== location.id));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <MapPin className="mr-2 h-4 w-4 text-gray-400" />
                            <span className="font-medium">{location.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(location.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={location.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                            {location.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setEditingLocation(location)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
