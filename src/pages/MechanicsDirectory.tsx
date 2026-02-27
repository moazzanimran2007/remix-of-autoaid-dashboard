import { useQuery } from "@tanstack/react-query";
import { api, Mechanic } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, MapPin } from "lucide-react";

export default function MechanicsDirectory() {
  const { data: mechanics = [], isLoading } = useQuery({
    queryKey: ['mechanics'],
    queryFn: api.getMechanics,
  });

  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Mechanics Directory</h1>
        <p className="text-muted-foreground">View and manage your network of mechanics</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : mechanics.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">No mechanics found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mechanics.map((mechanic: Mechanic) => (
            <Card key={mechanic.id} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg text-foreground mb-1">
                    {mechanic.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">{mechanic.phone}</p>
                </div>
                <Badge
                  className={
                    mechanic.status === 'available'
                      ? 'bg-status-resolved text-white'
                      : 'bg-muted text-foreground'
                  }
                >
                  {mechanic.status}
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <MapPin className="h-4 w-4" />
                <span>{mechanic.distance} km away</span>
              </div>

              <Button
                onClick={() => handleCall(mechanic.phone)}
                variant="outline"
                className="w-full"
              >
                <Phone className="h-4 w-4 mr-2" />
                Call Mechanic
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
