import { Card } from "@/components/ui/card";
import { MapPin } from "lucide-react";

interface MapComponentProps {
  location?: {
    lat: number;
    lng: number;
  };
}

export function MapComponent({ location }: MapComponentProps) {
  if (!location) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <MapPin className="h-12 w-12 mb-2" />
          <p>No location available</p>
        </div>
      </Card>
    );
  }

  // Using OpenStreetMap as a simple map solution
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${location.lng - 0.01},${location.lat - 0.01},${location.lng + 0.01},${location.lat + 0.01}&layer=mapnik&marker=${location.lat},${location.lng}`;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg text-foreground">Customer Location</h3>
      </div>
      <div className="rounded-lg overflow-hidden border border-border">
        <iframe
          width="100%"
          height="300"
          frameBorder="0"
          scrolling="no"
          src={mapUrl}
          title="Customer location map"
        />
      </div>
      <p className="text-sm text-muted-foreground mt-2">
        Coordinates: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
      </p>
    </Card>
  );
}
