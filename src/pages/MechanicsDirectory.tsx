import { useQuery } from "@tanstack/react-query";
import { api, Mechanic } from "@/lib/api";
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
    <div className="px-4 pt-4">
      <h1 className="text-xl font-bold text-foreground mb-1">Mechanics</h1>
      <p className="text-sm text-muted-foreground mb-4">Your network</p>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-secondary animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : mechanics.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No mechanics found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {mechanics.map((mechanic: Mechanic) => (
            <div key={mechanic.id} className="card-social p-4">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="h-11 w-11 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-foreground shrink-0">
                  {mechanic.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm">{mechanic.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <MapPin className="h-3 w-3" />
                    <span className="font-numbers">{mechanic.distance} km</span>
                  </div>
                </div>
                <span
                  className={`chip-pill text-[10px] border-transparent ${
                    mechanic.status === 'available'
                      ? 'bg-status-resolved text-accent-foreground'
                      : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {mechanic.status === 'available' ? 'Available' : 'Busy'}
                </span>
                <Button
                  onClick={() => handleCall(mechanic.phone)}
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-foreground/15 h-8 w-8 p-0"
                >
                  <Phone className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
